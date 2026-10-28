import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type {
  AdminReport,
  ReportFilter,
  ReportPreset,
  ReportProduct,
} from "@/lib/admin/report-types";

const PAGE_SIZE = 500;
const ITEM_ORDER_BATCH_SIZE = 25;
const LOW_STOCK_THRESHOLD = 5;
const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];
const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "rejected",
  "cancelled",
  "completed",
];

type OrderRecord = {
  id: string;
  status: string;
  createdAt: string;
  subtotal: number | null;
  deliveryFee: number | null;
  total: number | null;
};

type BookingRecord = {
  id: string;
  status: string;
  createdAt: string;
  designTitle: string | null;
};

type ProductRecord = {
  id: string;
  name: string;
  stock: number | null;
};

type OrderItemRecord = {
  orderId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  lineTotal: number | null;
};

export type AdminReportExport =
  | { dataset: "orders"; rows: OrderRecord[] }
  | { dataset: "products"; rows: ReportProduct[] }
  | { dataset: "bookings"; rows: BookingRecord[] };

export class ReportDataError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "ReportDataError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function numberValue(value: unknown): number | null {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    value === ""
  ) {
    return null;
  }
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function integerValue(value: unknown): number | null {
  const result = numberValue(value);
  return result !== null && Number.isSafeInteger(result)
    ? result
    : null;
}

function timestamp(value: unknown): string | null {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
    ? value
    : null;
}

function parseOrder(value: unknown): OrderRecord {
  if (!isRecord(value)) {
    throw new Error("An order report row was invalid.");
  }
  const id = text(value.id);
  const status = text(value.status);
  const createdAt = timestamp(value.created_at);
  const subtotal = numberValue(value.subtotal);
  const deliveryFee = numberValue(value.delivery_fee);
  const total = numberValue(value.total);
  if (!id || !status || !createdAt) {
    throw new Error("An order report row was missing required data.");
  }
  return { id, status, createdAt, subtotal, deliveryFee, total };
}

function getRelationTitle(value: unknown): string | null {
  const relation = Array.isArray(value) ? value[0] : value;
  return isRecord(relation) ? text(relation.title) : null;
}

function parseBooking(value: unknown): BookingRecord {
  if (!isRecord(value)) {
    throw new Error("A booking report row was invalid.");
  }
  const id = text(value.id);
  const status = text(value.status);
  const createdAt = timestamp(value.created_at);
  if (!id || !status || !createdAt) {
    throw new Error("A booking report row was missing required data.");
  }
  return {
    id,
    status,
    createdAt,
    designTitle: getRelationTitle(value.designs),
  };
}

function parseProduct(value: unknown): ProductRecord {
  if (!isRecord(value)) {
    throw new Error("A product report row was invalid.");
  }
  const id = text(value.id);
  const name = text(value.name);
  const stock = integerValue(value.stock);
  if (!id || !name) {
    throw new Error("A product report row was missing required data.");
  }
  return { id, name, stock };
}

function parseOrderItem(value: unknown): OrderItemRecord {
  if (!isRecord(value)) {
    throw new Error("An order item report row was invalid.");
  }
  const orderId = text(value.order_id);
  const productName = text(value.product_name);
  const quantity = integerValue(value.quantity);
  if (!orderId || !productName || quantity === null || quantity < 0) {
    throw new Error("An order item report row was missing required data.");
  }
  return {
    orderId,
    productId: text(value.product_id),
    productName,
    quantity,
    lineTotal: numberValue(value.line_total),
  };
}

function toCents(value: number): number {
  return Math.round(value * 100);
}

function fromCents(value: number): number {
  return value / 100;
}

function dhakaDateParts(date: Date): {
  year: number;
  month: number;
  day: number;
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const getPart = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
  };
}

function dateString({ year, month, day }: {
  year: number;
  month: number;
  day: number;
}): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(
    2,
    "0"
  )}-${String(day).padStart(2, "0")}`;
}

function getTodayInDhaka(): string {
  return dateString(dhakaDateParts(new Date()));
}

function shiftDate(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return dateString({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  });
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() + 1 === month &&
    candidate.getUTCDate() === day
  );
}

function parsePreset(value: string | null): ReportPreset {
  const allowed: ReportPreset[] = [
    "today",
    "last7",
    "last30",
    "thisMonth",
    "custom",
    "all",
  ];
  if (!value) return "last30";
  const preset = allowed.find((item) => item === value);
  if (!preset) throw new ReportDataError("Invalid report date filter.", 400);
  return preset;
}

export function resolveReportFilter(
  parameters: URLSearchParams
): ReportFilter {
  const preset = parsePreset(parameters.get("preset"));
  const today = getTodayInDhaka();
  let startDate: string | null = null;
  let endDate: string | null = null;

  switch (preset) {
    case "today":
      startDate = today;
      endDate = today;
      break;
    case "last7":
      startDate = shiftDate(today, -6);
      endDate = today;
      break;
    case "last30":
      startDate = shiftDate(today, -29);
      endDate = today;
      break;
    case "thisMonth":
      startDate = `${today.slice(0, 7)}-01`;
      endDate = today;
      break;
    case "custom": {
      startDate = parameters.get("from");
      endDate = parameters.get("to");
      if (
        !startDate ||
        !endDate ||
        !validDate(startDate) ||
        !validDate(endDate) ||
        startDate > endDate ||
        endDate > today
      ) {
        throw new ReportDataError(
          "Choose a valid custom date range ending today or earlier.",
          400
        );
      }
      break;
    }
    case "all":
      break;
  }

  return {
    preset,
    startDate,
    endDate,
    timeZone: "Asia/Dhaka",
    orderDateField: "created_at",
    bookingDateField: "created_at",
  };
}

function boundaryUtc(date: string, nextDay = false): string {
  const value = nextDay ? shiftDate(date, 1) : date;
  return new Date(`${value}T00:00:00+06:00`).toISOString();
}

function applyDateRange<T extends {
  gte: (column: string, value: string) => T;
  lt: (column: string, value: string) => T;
}>(
  query: T,
  filter: ReportFilter
): T {
  if (!filter.startDate || !filter.endDate) return query;
  return query
    .gte("created_at", boundaryUtc(filter.startDate))
    .lt("created_at", boundaryUtc(filter.endDate, true));
}

async function loadOrders(
  client: SupabaseClient,
  filter: ReportFilter
): Promise<OrderRecord[]> {
  const records: OrderRecord[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = client
      .from("orders")
      .select("id, status, subtotal, delivery_fee, total, created_at")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    query = applyDateRange(query, filter);
    const { data, error } = await query.range(
      offset,
      offset + PAGE_SIZE - 1
    );
    if (error) throw error;

    const page = (data ?? []).map((row) => parseOrder(row));
    records.push(...page);
    if ((data ?? []).length < PAGE_SIZE) break;
  }
  return records;
}

async function loadBookings(
  client: SupabaseClient,
  filter: ReportFilter
): Promise<BookingRecord[]> {
  const records: BookingRecord[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = client
      .from("bookings")
      .select("id, status, created_at, designs(title)")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    query = applyDateRange(query, filter);
    const { data, error } = await query.range(
      offset,
      offset + PAGE_SIZE - 1
    );
    if (error) throw error;

    const page = (data ?? []).map((row) => parseBooking(row));
    records.push(...page);
    if ((data ?? []).length < PAGE_SIZE) break;
  }
  return records;
}

async function loadProducts(client: SupabaseClient): Promise<ProductRecord[]> {
  const records: ProductRecord[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await client
      .from("products")
      .select("id, name, stock")
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;

    const page = (data ?? []).map((row) => parseProduct(row));
    records.push(...page);
    if ((data ?? []).length < PAGE_SIZE) break;
  }
  return records;
}

async function loadOrderItems(
  client: SupabaseClient,
  orderIds: string[]
): Promise<OrderItemRecord[]> {
  async function loadBatch(batch: string[]) {
    const batchRecords: OrderItemRecord[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await client
        .from("order_items")
        .select(
          "order_id, product_id, product_name, quantity, line_total"
        )
        .in("order_id", batch)
        .order("order_id", { ascending: true })
        .order("product_id", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;

      const page = (data ?? []).map((row) => parseOrderItem(row));
      batchRecords.push(...page);
      if ((data ?? []).length < PAGE_SIZE) break;
    }
    return batchRecords;
  }

  const batches: string[][] = [];
  for (let start = 0; start < orderIds.length; start += ITEM_ORDER_BATCH_SIZE) {
    batches.push(orderIds.slice(start, start + ITEM_ORDER_BATCH_SIZE));
  }

  const records: OrderItemRecord[] = [];
  const concurrency = 4;
  for (let start = 0; start < batches.length; start += concurrency) {
    const loaded = await Promise.all(
      batches.slice(start, start + concurrency).map(loadBatch)
    );
    records.push(...loaded.flat());
  }
  return records;
}

function localDateKey(value: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
}

function daysBetween(start: string, end: string): number {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  return Math.floor(
    (Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) /
      (24 * 60 * 60 * 1000)
  );
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function formatTrendLabel(key: string, granularity: "day" | "month"): string {
  const date = new Date(
    granularity === "month" ? `${key}-01T00:00:00Z` : `${key}T00:00:00Z`
  );
  return new Intl.DateTimeFormat("en-BD", {
    timeZone: "UTC",
    ...(granularity === "month"
      ? { month: "short", year: "2-digit" }
      : { month: "short", day: "numeric" }),
  }).format(date);
}

function getTrendKeys(
  filter: ReportFilter,
  orders: OrderRecord[],
  bookings: BookingRecord[]
): { keys: string[]; granularity: "day" | "month" } {
  const activityDates = [
    ...orders.map((order) => localDateKey(order.createdAt)),
    ...bookings.map((booking) => localDateKey(booking.createdAt)),
  ];
  const startDate =
    filter.startDate ??
    (activityDates.length > 0 ? activityDates.sort()[0] : null);
  const endDate =
    filter.endDate ??
    (activityDates.length > 0
      ? activityDates.sort()[activityDates.length - 1]
      : null);
  if (!startDate || !endDate) {
    return { keys: [], granularity: "day" };
  }

  const granularity =
    daysBetween(startDate, endDate) > 90 ? "month" : "day";
  const keys: string[] = [];
  if (granularity === "day") {
    for (
      let current = startDate;
      current <= endDate;
      current = shiftDate(current, 1)
    ) {
      keys.push(current);
    }
  } else {
    let [year, month] = startDate.split("-").slice(0, 2).map(Number);
    const endMonth = monthKey(endDate);
    while (`${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}` <= endMonth) {
      keys.push(
        `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`
      );
      month += 1;
      if (month > 12) {
        year += 1;
        month = 1;
      }
    }
  }
  return { keys, granularity };
}

function countStatuses(
  records: Array<{ status: string }>,
  statuses: string[]
) {
  const counts = new Map(statuses.map((status) => [status, 0]));
  for (const record of records) {
    counts.set(record.status, (counts.get(record.status) ?? 0) + 1);
  }
  return Array.from(counts, ([label, count]) => ({ label, count }));
}

function addToCents(current: number, amount: number | null): number {
  return amount === null ? current : current + toCents(amount);
}

export async function createAuthorizedReportClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new ReportDataError("Reports are not configured.", 503);
  }

  const cookieStore = await cookies();
  const client = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError || !user) {
    throw new ReportDataError(
      "Please sign in with an authorized admin account.",
      401
    );
  }

  const { data: admin, error: roleError } = await client
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (roleError) {
    throw new ReportDataError(
      "Unable to verify administrator access.",
      500
    );
  }
  if (!admin || !["owner", "manager"].includes(admin.role)) {
    throw new ReportDataError(
      "Only owner and manager accounts can view reports.",
      403
    );
  }
  return client;
}

export async function loadAdminReport(
  client: SupabaseClient,
  filter: ReportFilter
): Promise<{ report: AdminReport; exports: {
  orders: OrderRecord[];
  products: ReportProduct[];
  bookings: BookingRecord[];
} }> {
  const [orders, bookings, currentProducts] = await Promise.all([
    loadOrders(client, filter),
    loadBookings(client, filter),
    loadProducts(client),
  ]);
  const orderItems = await loadOrderItems(
    client,
    orders.map((order) => order.id)
  );
  const orderById = new Map(orders.map((order) => [order.id, order]));

  const statusCounts = countStatuses(orders, ORDER_STATUSES);
  const bookingStatusCounts = countStatuses(bookings, BOOKING_STATUSES);
  const orderStatusMap = new Map(statusCounts.map(({ label, count }) => [label, count]));
  const bookingStatusMap = new Map(
    bookingStatusCounts.map(({ label, count }) => [label, count])
  );

  let activeOrderValueCents = 0;
  let cancelledOrderValueCents = 0;
  let productsSubtotalCents = 0;
  let activeOrderWithValueCount = 0;
  let pendingOrderValueCount = 0;

  for (const order of orders) {
    if (order.status === "cancelled") {
      if (order.total === null) pendingOrderValueCount += 1;
      else cancelledOrderValueCents = addToCents(
        cancelledOrderValueCents,
        order.total
      );
      continue;
    }

    if (order.total === null) pendingOrderValueCount += 1;
    else {
      activeOrderValueCents = addToCents(
        activeOrderValueCents,
        order.total
      );
      activeOrderWithValueCount += 1;
    }
    productsSubtotalCents = addToCents(
      productsSubtotalCents,
      order.subtotal
    );
  }

  const productsById = new Map<string, ProductRecord>();
  const productAggregates = new Map<
    string,
    {
      name: string;
      stock: number | null;
      quantity: number;
      valueCents: number;
      unpricedCount: number;
    }
  >();

  for (const product of currentProducts) {
    productsById.set(product.id, product);
    productAggregates.set(`id:${product.id}`, {
      name: product.name,
      stock: product.stock,
      quantity: 0,
      valueCents: 0,
      unpricedCount: 0,
    });
  }

  for (const item of orderItems) {
    const order = orderById.get(item.orderId);
    if (!order || order.status === "cancelled") continue;
    const product = item.productId
      ? productsById.get(item.productId)
      : undefined;
    const aggregateKey = product
      ? `id:${product.id}`
      : item.productId
        ? `id:${item.productId}`
        : `name:${item.productName}`;
    const aggregate = productAggregates.get(aggregateKey) ?? {
      name: product?.name ?? item.productName,
      stock: product?.stock ?? null,
      quantity: 0,
      valueCents: 0,
      unpricedCount: 0,
    };
    aggregate.quantity += item.quantity;
    if (item.lineTotal === null) aggregate.unpricedCount += 1;
    else aggregate.valueCents += toCents(item.lineTotal);
    productAggregates.set(aggregateKey, aggregate);
  }

  const productReports: ReportProduct[] = Array.from(
    productAggregates,
    ([id, aggregate]) => ({
      id,
      name: aggregate.name,
      currentStock: aggregate.stock,
      orderedQuantity: aggregate.quantity,
      recordedOrderValue:
        aggregate.unpricedCount > 0
          ? null
          : fromCents(aggregate.valueCents),
      unpricedItemCount: aggregate.unpricedCount,
    })
  ).sort(
    (left, right) =>
      right.orderedQuantity - left.orderedQuantity ||
      left.name.localeCompare(right.name)
  );

  const { keys: trendKeys, granularity } = getTrendKeys(
    filter,
    orders,
    bookings
  );
  const trendByKey = new Map(
    trendKeys.map((key) => [
      key,
      { orders: 0, valueCents: 0, bookings: 0 },
    ])
  );
  for (const order of orders) {
    const localDate = localDateKey(order.createdAt);
    const key = granularity === "month" ? monthKey(localDate) : localDate;
    const trend = trendByKey.get(key);
    if (!trend) continue;
    trend.orders += 1;
    if (order.status !== "cancelled" && order.total !== null) {
      trend.valueCents += toCents(order.total);
    }
  }
  for (const booking of bookings) {
    const localDate = localDateKey(booking.createdAt);
    const key = granularity === "month" ? monthKey(localDate) : localDate;
    const trend = trendByKey.get(key);
    if (trend) trend.bookings += 1;
  }

  const trends = Array.from(trendByKey, ([key, value]) => ({
    key,
    label: formatTrendLabel(key, granularity),
    orders: value.orders,
    recordedOrderValue: fromCents(value.valueCents),
    bookings: value.bookings,
  }));
  const designCounts = new Map<string, number>();
  for (const booking of bookings) {
    if (booking.designTitle) {
      designCounts.set(
        booking.designTitle,
        (designCounts.get(booking.designTitle) ?? 0) + 1
      );
    }
  }

  const orderExport = orders.map((order) => ({ ...order }));
  const bookingExport = bookings.map((booking) => ({ ...booking }));
  const productExports = productReports;

  return {
    report: {
      filter,
      overview: {
        totalOrders: orders.length,
        pendingOrders: orderStatusMap.get("pending") ?? 0,
        confirmedOrders: orderStatusMap.get("confirmed") ?? 0,
        deliveredOrders: orderStatusMap.get("delivered") ?? 0,
        cancelledOrders: orderStatusMap.get("cancelled") ?? 0,
        recordedOrderValue: fromCents(activeOrderValueCents),
        pendingOrderValueCount,
        cancelledOrderValue: fromCents(cancelledOrderValueCents),
        productsSubtotal: fromCents(productsSubtotalCents),
        totalBookings: bookings.length,
        pendingBookings: bookingStatusMap.get("pending") ?? 0,
        confirmedBookings: bookingStatusMap.get("confirmed") ?? 0,
        rejectedBookings: bookingStatusMap.get("rejected") ?? 0,
        cancelledBookings: bookingStatusMap.get("cancelled") ?? 0,
        completedBookings: bookingStatusMap.get("completed") ?? 0,
        totalProducts: currentProducts.length,
        averageRecordedOrderValue:
          activeOrderWithValueCount === 0
            ? null
            : fromCents(
                Math.round(activeOrderValueCents / activeOrderWithValueCount)
              ),
        averageValueOrderCount: activeOrderWithValueCount,
      },
      orderStatuses: statusCounts,
      bookingStatuses: bookingStatusCounts,
      trends,
      trendGranularity: granularity,
      products: productReports,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
      popularDesigns: Array.from(
        designCounts,
        ([title, bookingCount]) => ({ title, bookingCount })
      )
        .sort(
          (left, right) =>
            right.bookingCount - left.bookingCount ||
            left.title.localeCompare(right.title)
        )
        .slice(0, 10),
      paymentCollectionTracked: false,
    },
    exports: {
      orders: orderExport,
      products: productExports,
      bookings: bookingExport,
    },
  };
}

export function reportErrorCode(error: unknown): string | undefined {
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

export function reportErrorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}
