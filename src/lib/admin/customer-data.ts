import { createHash } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type {
  CustomerBookingHistory,
  CustomerOrderHistory,
  CustomerSource,
  CustomerStatistics,
  CustomerSummary,
} from "@/lib/admin/customer-types";

const PAGE_SIZE = 500;

type OrderRecord = CustomerOrderHistory & {
  customerPhone: string | null;
};

type BookingRecord = CustomerBookingHistory & {
  customerPhone: string | null;
};

type CustomerEntry = {
  customer: CustomerSummary;
  orders: CustomerOrderHistory[];
  bookings: CustomerBookingHistory[];
  names: Set<string>;
  phoneSearchValues: Set<string>;
};

export type CustomerDirectory = {
  entries: CustomerEntry[];
  statistics: CustomerStatistics;
};

export class CustomerDataError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "CustomerDataError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getCustomerName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name.length > 0 ? name : null;
}

function getPhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const phone = value.trim();
  return phone.length > 0 ? phone : null;
}

function getTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    return null;
  }
  return value;
}

function getNumericValue(value: unknown): number | null {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    value === ""
  ) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseOrder(value: unknown): OrderRecord | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;

  return {
    id: value.id,
    recordedName: getCustomerName(value.customer_name),
    customerPhone: getPhone(value.customer_phone),
    createdAt: getTimestamp(value.created_at),
    status: typeof value.status === "string" ? value.status : "Unknown",
    subtotal: getNumericValue(value.subtotal),
    deliveryFee: getNumericValue(value.delivery_fee),
    total: getNumericValue(value.total),
  };
}

function getDesignTitle(value: unknown): string | null {
  const relation = Array.isArray(value) ? value[0] : value;
  if (!isRecord(relation)) return null;
  return getCustomerName(relation.title);
}

function parseBooking(value: unknown): BookingRecord | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;

  return {
    id: value.id,
    recordedName: getCustomerName(value.customer_name),
    customerPhone: getPhone(value.customer_phone),
    createdAt: getTimestamp(value.created_at),
    status: typeof value.status === "string" ? value.status : "Unknown",
    selectedDesign: getDesignTitle(value.designs),
  };
}

function normalizeBangladeshPhone(value: string | null): string | null {
  if (!value) return null;

  if (!/^\+?[\d\s()-]+$/.test(value)) return null;
  const digits = value.replace(/\D/g, "");
  const localMatch = /^01[3-9]\d{8}$/.test(digits);
  const countryMatch = /^8801[3-9]\d{8}$/.test(digits);

  if (localMatch) return `+88${digits}`;
  if (countryMatch) return `+${digits}`;
  return null;
}

function createCustomerId(identity: string): string {
  return createHash("sha256").update(identity).digest("hex");
}

function phoneDigits(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

function getSource(
  orderCount: number,
  bookingCount: number
): CustomerSource {
  if (orderCount > 0 && bookingCount > 0) return "Both";
  return orderCount > 0 ? "Orders" : "Bookings";
}

function compareActivity(left: string | null, right: string | null) {
  if (left === null) return right === null ? 0 : -1;
  if (right === null) return 1;
  return Date.parse(left) - Date.parse(right);
}

async function loadOrders(
  client: SupabaseClient
): Promise<OrderRecord[]> {
  const records: OrderRecord[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await client
      .from("orders")
      .select(
        "id, customer_name, customer_phone, status, subtotal, delivery_fee, total, created_at"
      )
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? [])
      .map((row) => parseOrder(row))
      .filter((record): record is OrderRecord => record !== null);
    records.push(...page);

    if ((data ?? []).length < PAGE_SIZE) break;
  }

  return records;
}

async function loadBookings(
  client: SupabaseClient
): Promise<BookingRecord[]> {
  const records: BookingRecord[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await client
      .from("bookings")
      .select(
        "id, customer_name, customer_phone, status, created_at, designs(title)"
      )
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? [])
      .map((row) => parseBooking(row))
      .filter((record): record is BookingRecord => record !== null);
    records.push(...page);

    if ((data ?? []).length < PAGE_SIZE) break;
  }

  return records;
}

function updateActivity(
  customer: CustomerSummary,
  createdAt: string | null,
  name: string | null,
  phone: string | null
) {
  if (createdAt) {
    if (
      customer.firstActivity === null ||
      compareActivity(createdAt, customer.firstActivity) < 0
    ) {
      customer.firstActivity = createdAt;
    }

    if (
      customer.lastActivity === null ||
      compareActivity(createdAt, customer.lastActivity) > 0
    ) {
      customer.lastActivity = createdAt;
      if (name) customer.displayName = name;
      if (phone) customer.phone = phone;
    }
  } else {
    if (!customer.displayName && name) customer.displayName = name;
    if (!customer.phone && phone) customer.phone = phone;
  }
}

export async function createAuthorizedCustomerClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new CustomerDataError(
      "Customer management is not configured.",
      503
    );
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
    throw new CustomerDataError(
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
    throw new CustomerDataError(
      "Unable to verify administrator access.",
      500
    );
  }

  if (!admin || !["owner", "manager"].includes(admin.role)) {
    throw new CustomerDataError(
      "Only owner and manager accounts can view customer records.",
      403
    );
  }

  return client;
}

export async function loadCustomerDirectory(
  client: SupabaseClient
): Promise<CustomerDirectory> {
  const [orders, bookings] = await Promise.all([
    loadOrders(client),
    loadBookings(client),
  ]);
  const entries = new Map<string, CustomerEntry>();

  function getEntry(
    source: "order" | "booking",
    id: string,
    name: string | null,
    phone: string | null
  ) {
    const normalizedPhone = normalizeBangladeshPhone(phone);
    const identity = normalizedPhone
      ? `phone:${normalizedPhone}`
      : `${source}:${id}`;
    const customerId = createCustomerId(identity);
    const existing = entries.get(customerId);

    if (existing) return existing;

    const entry: CustomerEntry = {
      customer: {
        id: customerId,
        displayName: name ?? "Name unavailable",
        phone,
        orderCount: 0,
        bookingCount: 0,
        firstActivity: null,
        lastActivity: null,
        source: source === "order" ? "Orders" : "Bookings",
      },
      orders: [],
      bookings: [],
      names: new Set(),
      phoneSearchValues: new Set(),
    };

    entries.set(customerId, entry);
    return entry;
  }

  for (const order of orders) {
    const entry = getEntry(
      "order",
      order.id,
      order.recordedName,
      order.customerPhone
    );
    entry.orders.push({
      id: order.id,
      recordedName: order.recordedName,
      createdAt: order.createdAt,
      status: order.status,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      total: order.total,
    });
    entry.customer.orderCount += 1;
    if (order.recordedName) entry.names.add(order.recordedName);
    const phoneValue = phoneDigits(order.customerPhone);
    if (phoneValue) entry.phoneSearchValues.add(phoneValue);
    const normalizedPhone = normalizeBangladeshPhone(order.customerPhone);
    const normalizedPhoneDigits = phoneDigits(normalizedPhone);
    if (normalizedPhoneDigits) {
      entry.phoneSearchValues.add(normalizedPhoneDigits);
    }
    updateActivity(
      entry.customer,
      order.createdAt,
      order.recordedName,
      order.customerPhone
    );
  }

  for (const booking of bookings) {
    const entry = getEntry(
      "booking",
      booking.id,
      booking.recordedName,
      booking.customerPhone
    );
    entry.bookings.push({
      id: booking.id,
      recordedName: booking.recordedName,
      createdAt: booking.createdAt,
      status: booking.status,
      selectedDesign: booking.selectedDesign,
    });
    entry.customer.bookingCount += 1;
    if (booking.recordedName) entry.names.add(booking.recordedName);
    const phoneValue = phoneDigits(booking.customerPhone);
    if (phoneValue) entry.phoneSearchValues.add(phoneValue);
    const normalizedPhone = normalizeBangladeshPhone(booking.customerPhone);
    const normalizedPhoneDigits = phoneDigits(normalizedPhone);
    if (normalizedPhoneDigits) {
      entry.phoneSearchValues.add(normalizedPhoneDigits);
    }
    updateActivity(
      entry.customer,
      booking.createdAt,
      booking.recordedName,
      booking.customerPhone
    );
  }

  const result = Array.from(entries.values());
  for (const entry of result) {
    entry.customer.source = getSource(
      entry.customer.orderCount,
      entry.customer.bookingCount
    );
    entry.orders.sort(
      (left, right) =>
        compareActivity(right.createdAt, left.createdAt)
    );
    entry.bookings.sort(
      (left, right) =>
        compareActivity(right.createdAt, left.createdAt)
    );
  }

  return {
    entries: result,
    statistics: {
      totalContacts: result.length,
      withOrders: result.filter(
        (entry) => entry.customer.orderCount > 0
      ).length,
      withBookings: result.filter(
        (entry) => entry.customer.bookingCount > 0
      ).length,
      returning: result.filter(
        (entry) =>
          entry.customer.orderCount + entry.customer.bookingCount > 1
      ).length,
    },
  };
}

export function filterCustomerDirectory(
  entries: CustomerEntry[],
  search: string,
  filter: string
): CustomerEntry[] {
  const query = search.trim().toLocaleLowerCase();
  const queryDigits = search.replace(/\D/g, "");
  const normalizedQueryDigits = phoneDigits(
    normalizeBangladeshPhone(search)
  );

  return entries.filter((entry) => {
    const matchesSearch =
      query.length === 0 ||
      Array.from(entry.names).some((name) =>
        name.toLocaleLowerCase().includes(query)
      ) ||
      ((queryDigits.length > 0 || normalizedQueryDigits !== null) &&
        Array.from(entry.phoneSearchValues).some((phone) =>
          phone.includes(queryDigits) ||
          (normalizedQueryDigits !== null &&
            phone.includes(normalizedQueryDigits))
        ));

    const matchesFilter =
      filter === "all" ||
      (filter === "orders" && entry.customer.orderCount > 0) ||
      (filter === "bookings" && entry.customer.bookingCount > 0) ||
      (filter === "both" &&
        entry.customer.orderCount > 0 &&
        entry.customer.bookingCount > 0);

    return matchesSearch && matchesFilter;
  });
}
