import { connection, NextResponse } from "next/server";
import {
  createAuthorizedCustomerClient,
  CustomerDataError,
  filterCustomerDirectory,
  loadCustomerDirectory,
} from "@/lib/admin/customer-data";

const PAGE_SIZE = 25;
const FILTERS = new Set(["all", "orders", "bookings", "both"]);

function responseError(message: string, status: number) {
  return NextResponse.json(
    { message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

function getErrorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return undefined;
}

function getErrorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

export async function GET(request: Request) {
  await connection();

  try {
    const url = new URL(request.url);
    const search = (url.searchParams.get("search") ?? "").slice(0, 100);
    const requestedFilter = url.searchParams.get("filter") ?? "all";
    const filter = FILTERS.has(requestedFilter)
      ? requestedFilter
      : "all";
    const requestedPage = Number(url.searchParams.get("page") ?? "1");
    const page =
      Number.isSafeInteger(requestedPage) && requestedPage > 0
        ? Math.min(requestedPage, 1_000_000)
        : 1;

    const client = await createAuthorizedCustomerClient();
    const directory = await loadCustomerDirectory(client);
    const matchingEntries = filterCustomerDirectory(
      directory.entries,
      search,
      filter
    );
    const total = matchingEntries.length;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const effectivePage =
      totalPages > 0 ? Math.min(page, totalPages) : 1;
    const start = (effectivePage - 1) * PAGE_SIZE;
    const customers = matchingEntries
      .slice(start, start + PAGE_SIZE)
      .map((entry) => entry.customer);

    return NextResponse.json(
      {
        customers,
        statistics: directory.statistics,
        total,
        page: effectivePage,
        pageSize: PAGE_SIZE,
        totalPages,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof CustomerDataError) {
      return responseError(error.message, error.status);
    }

    console.error("Admin customer list query failed:", {
      code: getErrorCode(error),
      errorName: getErrorName(error),
    });
    return responseError(
      "Unable to load customer records. Check the admin RLS permissions.",
      500
    );
  }
}
