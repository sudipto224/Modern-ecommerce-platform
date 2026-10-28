import { connection, NextResponse } from "next/server";
import {
  createAuthorizedReportClient,
  loadAdminReport,
  ReportDataError,
  reportErrorCode,
  reportErrorName,
  resolveReportFilter,
} from "@/lib/admin/report-data";

type ExportDataset = "orders" | "products" | "bookings";

function csvCell(value: string | number | null): string {
  let text = value === null ? "Pending" : String(value);
  if (/^[\u0000-\u0020]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replaceAll('"', '""')}"`;
}

function createCsv(rows: Array<Array<string | number | null>>): string {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

function formatDhakaDate(value: string | null): string {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-BD", {
    timeZone: "Asia/Dhaka",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function createExportRows(
  dataset: ExportDataset,
  rows: Awaited<ReturnType<typeof loadAdminReport>>["exports"]
): Array<Array<string | number | null>> {
  if (dataset === "orders") {
    return [
      [
        "Order ID",
        "Order Date (Asia/Dhaka)",
        "Status",
        "Products Subtotal",
        "Delivery Charge",
        "Recorded Order Total",
      ],
      ...rows.orders.map((order) => [
        order.id,
        formatDhakaDate(order.createdAt),
        order.status,
        order.subtotal,
        order.deliveryFee,
        order.total,
      ]),
    ];
  }

  if (dataset === "products") {
    return [
      [
        "Product",
        "Current Stock",
        "Net Ordered Quantity (Cancelled Excluded)",
        "Recorded Product Order Value",
      ],
      ...rows.products.map((product) => [
        product.name,
        product.currentStock,
        product.orderedQuantity,
        product.recordedOrderValue,
      ]),
    ];
  }

  return [
    [
      "Booking ID",
      "Booking Created At (Asia/Dhaka)",
      "Status",
      "Selected Design",
    ],
    ...rows.bookings.map((booking) => [
      booking.id,
      formatDhakaDate(booking.createdAt),
      booking.status,
      booking.designTitle ?? "Unavailable",
    ]),
  ];
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function GET(request: Request) {
  await connection();

  try {
    const url = new URL(request.url);
    const filter = resolveReportFilter(url.searchParams);
    const datasetValue = url.searchParams.get("export");
    const dataset: ExportDataset | null =
      datasetValue === "orders" ||
      datasetValue === "products" ||
      datasetValue === "bookings"
        ? datasetValue
        : null;
    if (datasetValue !== null && dataset === null) {
      return errorResponse("Invalid report export type.", 400);
    }

    const client = await createAuthorizedReportClient();
    const { report, exports } = await loadAdminReport(client, filter);

    if (dataset) {
      const csv = createCsv(createExportRows(dataset, exports));
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="henna-${dataset}-report.csv"`,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    return NextResponse.json(report, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ReportDataError) {
      return errorResponse(error.message, error.status);
    }

    console.error("Admin reports query failed:", {
      code: reportErrorCode(error),
      errorName: reportErrorName(error),
    });
    return errorResponse(
      "Unable to load reports. Check the admin RLS permissions.",
      500
    );
  }
}
