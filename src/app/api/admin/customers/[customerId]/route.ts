import { connection, NextResponse } from "next/server";
import {
  createAuthorizedCustomerClient,
  CustomerDataError,
  loadCustomerDirectory,
} from "@/lib/admin/customer-data";

type RouteContext = {
  params: Promise<{ customerId: string }>;
};

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

export async function GET(
  _request: Request,
  context: RouteContext
) {
  await connection();

  try {
    const { customerId } = await context.params;
    if (!/^[a-f0-9]{64}$/.test(customerId)) {
      return responseError("Customer profile not found.", 404);
    }

    const client = await createAuthorizedCustomerClient();
    const directory = await loadCustomerDirectory(client);
    const entry = directory.entries.find(
      (candidate) => candidate.customer.id === customerId
    );

    if (!entry) {
      return responseError("Customer profile not found.", 404);
    }

    return NextResponse.json(
      {
        customer: entry.customer,
        orders: entry.orders,
        bookings: entry.bookings,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof CustomerDataError) {
      return responseError(error.message, error.status);
    }

    console.error("Admin customer profile query failed:", {
      code: getErrorCode(error),
      errorName: getErrorName(error),
    });
    return responseError(
      "Unable to load this customer profile. Check the admin RLS permissions.",
      500
    );
  }
}
