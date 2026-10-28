"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  CustomerBookingHistory,
  CustomerDirectoryResponse,
  CustomerOrderHistory,
  CustomerProfile,
  CustomerStatistics,
  CustomerSummary,
} from "@/lib/admin/customer-types";

type CustomerFilter = "all" | "orders" | "bookings" | "both";

function isCustomerFilter(value: string): value is CustomerFilter {
  return (
    value === "all" ||
    value === "orders" ||
    value === "bookings" ||
    value === "both"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isCustomerSummary(value: unknown): value is CustomerSummary {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.displayName === "string" &&
    (value.phone === null || typeof value.phone === "string") &&
    typeof value.orderCount === "number" &&
    typeof value.bookingCount === "number" &&
    (value.firstActivity === null ||
      typeof value.firstActivity === "string") &&
    (value.lastActivity === null ||
      typeof value.lastActivity === "string") &&
    (value.source === "Orders" ||
      value.source === "Bookings" ||
      value.source === "Both")
  );
}

function isCustomerStatistics(
  value: unknown
): value is CustomerStatistics {
  return (
    isRecord(value) &&
    typeof value.totalContacts === "number" &&
    typeof value.withOrders === "number" &&
    typeof value.withBookings === "number" &&
    typeof value.returning === "number"
  );
}

function isDirectoryResponse(
  value: unknown
): value is CustomerDirectoryResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.customers) &&
    value.customers.every(isCustomerSummary) &&
    isCustomerStatistics(value.statistics) &&
    typeof value.total === "number" &&
    typeof value.page === "number" &&
    typeof value.pageSize === "number" &&
    typeof value.totalPages === "number"
  );
}

function isOrderHistory(value: unknown): value is CustomerOrderHistory {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.recordedName === null ||
      typeof value.recordedName === "string") &&
    (value.createdAt === null || typeof value.createdAt === "string") &&
    typeof value.status === "string" &&
    (value.subtotal === null || typeof value.subtotal === "number") &&
    (value.deliveryFee === null ||
      typeof value.deliveryFee === "number") &&
    (value.total === null || typeof value.total === "number")
  );
}

function isBookingHistory(
  value: unknown
): value is CustomerBookingHistory {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.recordedName === null ||
      typeof value.recordedName === "string") &&
    (value.createdAt === null || typeof value.createdAt === "string") &&
    typeof value.status === "string" &&
    (value.selectedDesign === null ||
      typeof value.selectedDesign === "string")
  );
}

function isCustomerProfile(value: unknown): value is CustomerProfile {
  return (
    isRecord(value) &&
    isCustomerSummary(value.customer) &&
    Array.isArray(value.orders) &&
    value.orders.every(isOrderHistory) &&
    Array.isArray(value.bookings) &&
    value.bookings.every(isBookingHistory)
  );
}

async function getResponseMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      isRecord(body) &&
      typeof body.message === "string" &&
      body.message.length > 0
    ) {
      return body.message;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

function formatDate(value: string | null) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return date.toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatOrderValue(value: number | null) {
  if (value === null) return "Not available";
  return `৳${value.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function SourceBadge({ source }: { source: CustomerSummary["source"] }) {
  return (
    <span className="inline-flex rounded-full bg-[#f1e2d8] px-3 py-1 text-xs font-semibold text-[#693f31]">
      {source}
    </span>
  );
}

export default function AdminCustomersPage() {
  const router = useRouter();
  const detailsRef = useRef<HTMLElement>(null);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [statistics, setStatistics] =
    useState<CustomerStatistics | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CustomerFilter>("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] =
    useState<string | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCustomers() {
      setLoading(true);
      setErrorMessage("");
      setAccessDenied(false);

      const params = new URLSearchParams({
        page: String(page),
        search,
        filter,
      });

      try {
        const response = await fetch(
          `/api/admin/customers?${params.toString()}`,
          { signal: controller.signal, cache: "no-store" }
        );

        if (response.status === 401) {
          router.replace("/admin-login");
          return;
        }

        if (!response.ok) {
          const message = await getResponseMessage(
            response,
            "Unable to load customer records."
          );
          if (response.status === 403) setAccessDenied(true);
          throw new Error(message);
        }

        const result: unknown = await response.json();
        if (!isDirectoryResponse(result)) {
          throw new Error("The customer list response was invalid.");
        }

        setCustomers(result.customers);
        setStatistics(result.statistics);
        setTotal(result.total);
        setPage(result.page);
        setPageSize(result.pageSize);
        setTotalPages(result.totalPages);
      } catch (error) {
        if (controller.signal.aborted) return;
        setCustomers([]);
        setStatistics(null);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load customer records."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadCustomers();
    return () => controller.abort();
  }, [filter, page, refreshKey, router, search]);

  useEffect(() => {
    if (!selectedCustomerId) {
      return;
    }

    const customerId = selectedCustomerId;
    const controller = new AbortController();

    async function loadProfile() {
      setProfile(null);
      setProfileError("");
      setProfileLoading(true);

      try {
        const response = await fetch(
          `/api/admin/customers/${encodeURIComponent(customerId)}`,
          { signal: controller.signal, cache: "no-store" }
        );

        if (response.status === 401) {
          router.replace("/admin-login");
          return;
        }

        if (!response.ok) {
          throw new Error(
            await getResponseMessage(
              response,
              "Unable to load this customer profile."
            )
          );
        }

        const result: unknown = await response.json();
        if (!isCustomerProfile(result)) {
          throw new Error("The customer profile response was invalid.");
        }

        setProfile(result);
      } catch (error) {
        if (controller.signal.aborted) return;
        setProfileError(
          error instanceof Error
            ? error.message
            : "Unable to load this customer profile."
        );
      } finally {
        if (!controller.signal.aborted) setProfileLoading(false);
      }
    }

    void loadProfile();
    return () => controller.abort();
  }, [router, selectedCustomerId]);

  useEffect(() => {
    if (selectedCustomerId) {
      detailsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [selectedCustomerId]);

  const firstResult = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastResult = Math.min(page * pageSize, total);

  return (
    <main className="min-h-screen bg-[#faf6f3] px-5 py-10 text-[#44271f] md:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-widest text-[#b77b5b]">
              Business Management
            </p>
            <h1 className="font-serif text-4xl">Customer Management</h1>
            <p className="mt-3 text-sm text-[#80685b]">
              Customer contacts are derived from recorded orders and bookings.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => setRefreshKey((value) => value + 1)}
              className="rounded-full border border-[#d9c3b5] bg-white px-6 py-3 text-sm transition hover:bg-[#f5ebe5] disabled:opacity-50"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <Link
              href="/admin"
              className="rounded-full bg-[#693f31] px-6 py-3 text-sm font-medium text-white hover:bg-[#875441]"
            >
              ← Dashboard
            </Link>
          </div>
        </header>

        {errorMessage && (
          <div
            role="alert"
            className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <span>{errorMessage}</span>
            {!accessDenied && (
              <button
                type="button"
                onClick={() => setRefreshKey((value) => value + 1)}
                className="font-semibold underline"
              >
                Try again
              </button>
            )}
          </div>
        )}

        {!errorMessage && (
          <>
            <section
              aria-label="Customer statistics"
              className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              {[
                {
                  label: "Total Unique Customer Contacts",
                  value: statistics?.totalContacts,
                  description: "Safely grouped recorded contacts",
                },
                {
                  label: "Customers with Orders",
                  value: statistics?.withOrders,
                  description: "At least one recorded order",
                },
                {
                  label: "Customers with Bookings",
                  value: statistics?.withBookings,
                  description: "At least one recorded booking",
                },
                {
                  label: "Returning Customers",
                  value: statistics?.returning,
                  description: "More than one recorded interaction",
                },
              ].map((statistic) => (
                <article
                  key={statistic.label}
                  className="rounded-2xl border border-[#eaded5] bg-white p-6 shadow-sm"
                >
                  <p className="text-sm text-[#80685b]">
                    {statistic.label}
                  </p>
                  <p className="mt-3 text-3xl font-bold">
                    {statistic.value === undefined
                      ? loading
                        ? "Loading…"
                        : "Unavailable"
                      : statistic.value}
                  </p>
                  <p className="mt-2 text-xs text-[#a38b7d]">
                    {statistic.description}
                  </p>
                </article>
              ))}
            </section>

            <section className="mb-6 rounded-2xl border border-[#eaded5] bg-white p-5 shadow-sm">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#80685b]">
                    Search by customer name or phone
                  </span>
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(event) =>
                      setSearchInput(event.target.value)
                    }
                    placeholder="Enter a name or phone number"
                    className="w-full rounded-xl border border-[#e6d6cc] bg-white px-4 py-3 text-sm outline-none focus:border-[#b77b5b] focus:ring-2 focus:ring-[#b77b5b]/20"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#80685b]">
                    Filter customers
                  </span>
                  <select
                    value={filter}
                    onChange={(event) => {
                      if (isCustomerFilter(event.target.value)) {
                        setFilter(event.target.value);
                        setPage(1);
                      }
                    }}
                    className="w-full rounded-xl border border-[#e6d6cc] bg-white px-4 py-3 text-sm md:min-w-56"
                  >
                    <option value="all">All Customers</option>
                    <option value="orders">Customers with Orders</option>
                    <option value="bookings">Customers with Bookings</option>
                    <option value="both">Customers with Both</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#eaded5] bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eaded5] px-5 py-4">
                <h2 className="font-serif text-2xl">Customer Contacts</h2>
                <p className="text-sm text-[#80685b]" aria-live="polite">
                  {loading
                    ? "Loading customer contacts…"
                    : `Showing ${firstResult}–${lastResult} of ${total}`}
                </p>
              </div>

              {loading && customers.length === 0 ? (
                <p className="p-8 text-center text-sm text-[#80685b]">
                  Loading customer contacts…
                </p>
              ) : customers.length === 0 ? (
                <div className="p-10 text-center text-[#80685b]">
                  {total === 0 && search.length === 0 && filter === "all"
                    ? "No customer contacts have been recorded yet."
                    : "No customers match your search or filter."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead className="bg-[#fbf7f4] text-xs uppercase tracking-wide text-[#80685b]">
                      <tr>
                        <th className="px-5 py-4 font-semibold">Customer</th>
                        <th className="px-5 py-4 font-semibold">Phone</th>
                        <th className="px-5 py-4 font-semibold">Orders</th>
                        <th className="px-5 py-4 font-semibold">Bookings</th>
                        <th className="px-5 py-4 font-semibold">
                          Last Activity
                        </th>
                        <th className="px-5 py-4 font-semibold">Source</th>
                        <th className="px-5 py-4 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0e7e1]">
                      {customers.map((customer) => (
                        <tr key={customer.id} className="align-middle">
                          <td className="px-5 py-4 font-medium">
                            {customer.displayName}
                          </td>
                          <td className="px-5 py-4 text-[#80685b]">
                            {customer.phone ?? "Not provided"}
                          </td>
                          <td className="px-5 py-4">
                            {customer.orderCount}
                          </td>
                          <td className="px-5 py-4">
                            {customer.bookingCount}
                          </td>
                          <td className="px-5 py-4 text-[#80685b]">
                            {formatDate(customer.lastActivity)}
                          </td>
                          <td className="px-5 py-4">
                            <SourceBadge source={customer.source} />
                          </td>
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedCustomerId(customer.id)
                              }
                              className="rounded-full border border-[#d9c3b5] px-4 py-2 text-xs font-semibold text-[#693f31] transition hover:bg-[#f5ebe5]"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eaded5] px-5 py-4">
                  <span className="text-sm text-[#80685b]">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={loading || page <= 1}
                      onClick={() => setPage((value) => value - 1)}
                      className="rounded-full border border-[#d9c3b5] px-4 py-2 text-sm disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={loading || page >= totalPages}
                      onClick={() => setPage((value) => value + 1)}
                      className="rounded-full border border-[#d9c3b5] px-4 py-2 text-sm disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {selectedCustomerId && (
          <section
            ref={detailsRef}
            className="mt-8 scroll-mt-6 rounded-2xl border border-[#eaded5] bg-white p-5 shadow-sm md:p-8"
          >
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="mb-2 text-xs uppercase tracking-widest text-[#b77b5b]">
                  Customer Profile
                </p>
                <h2 className="font-serif text-3xl">
                  {profile?.customer.displayName ?? "Customer Details"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomerId(null);
                  setProfile(null);
                  setProfileError("");
                  setProfileLoading(false);
                }}
                className="rounded-full border border-[#d9c3b5] px-5 py-2 text-sm hover:bg-[#f5ebe5]"
              >
                Close Details
              </button>
            </div>

            {profileLoading ? (
              <p className="py-6 text-sm text-[#80685b]">
                Loading customer history…
              </p>
            ) : profileError ? (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              >
                {profileError}
              </div>
            ) : profile ? (
              <>
                <dl className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    ["Display name", profile.customer.displayName],
                    ["Contact phone", profile.customer.phone ?? "Not provided"],
                    ["First activity", formatDate(profile.customer.firstActivity)],
                    ["Last activity", formatDate(profile.customer.lastActivity)],
                    ["Number of orders", String(profile.customer.orderCount)],
                    [
                      "Number of bookings",
                      String(profile.customer.bookingCount),
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl bg-[#fbf7f4] p-4"
                    >
                      <dt className="text-xs uppercase tracking-wide text-[#80685b]">
                        {label}
                      </dt>
                      <dd className="mt-2 break-words text-sm font-semibold">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <section className="mb-8">
                  <h3 className="mb-4 font-serif text-2xl">Order History</h3>
                  {profile.orders.length === 0 ? (
                    <p className="rounded-xl bg-[#fbf7f4] p-5 text-sm text-[#80685b]">
                      No orders recorded for this contact.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-[#eaded5]">
                      <table className="w-full min-w-[950px] text-left text-sm">
                        <thead className="bg-[#fbf7f4] text-xs uppercase tracking-wide text-[#80685b]">
                          <tr>
                            <th className="px-4 py-3">Order ID</th>
                            <th className="px-4 py-3">Recorded Name</th>
                            <th className="px-4 py-3">Order Date</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Product Subtotal</th>
                            <th className="px-4 py-3">Delivery Charge</th>
                            <th className="px-4 py-3">Final Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f0e7e1]">
                          {profile.orders.map((order) => (
                            <tr key={order.id}>
                              <td className="px-4 py-3 font-mono text-xs">
                                <Link
                                  href={`/admin/orders?order=${encodeURIComponent(
                                    order.id
                                  )}`}
                                  className="text-[#875441] underline underline-offset-2"
                                >
                                  {order.id}
                                </Link>
                              </td>
                              <td className="px-4 py-3">
                                {order.recordedName ?? "Name unavailable"}
                              </td>
                              <td className="px-4 py-3 text-[#80685b]">
                                {formatDate(order.createdAt)}
                              </td>
                              <td className="px-4 py-3 capitalize">
                                {order.status}
                              </td>
                              <td className="px-4 py-3">
                                {formatOrderValue(order.subtotal)}
                              </td>
                              <td className="px-4 py-3">
                                {formatOrderValue(order.deliveryFee)}
                              </td>
                              <td className="px-4 py-3">
                                {formatOrderValue(order.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="mt-3 text-xs text-[#a38b7d]">
                    Order values are recorded order amounts, not paid revenue.
                  </p>
                </section>

                <section>
                  <h3 className="mb-4 font-serif text-2xl">Booking History</h3>
                  {profile.bookings.length === 0 ? (
                    <p className="rounded-xl bg-[#fbf7f4] p-5 text-sm text-[#80685b]">
                      No bookings recorded for this contact.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-[#eaded5]">
                      <table className="w-full min-w-[750px] text-left text-sm">
                        <thead className="bg-[#fbf7f4] text-xs uppercase tracking-wide text-[#80685b]">
                          <tr>
                            <th className="px-4 py-3">Booking ID</th>
                            <th className="px-4 py-3">Recorded Name</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Selected Design</th>
                            <th className="px-4 py-3">Admin Page</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f0e7e1]">
                          {profile.bookings.map((booking) => (
                            <tr key={booking.id}>
                              <td className="px-4 py-3 font-mono text-xs">
                                {booking.id}
                              </td>
                              <td className="px-4 py-3">
                                {booking.recordedName ?? "Name unavailable"}
                              </td>
                              <td className="px-4 py-3 text-[#80685b]">
                                {formatDate(booking.createdAt)}
                              </td>
                              <td className="px-4 py-3 capitalize">
                                {booking.status}
                              </td>
                              <td className="px-4 py-3">
                                {booking.selectedDesign ?? "Unavailable"}
                              </td>
                              <td className="px-4 py-3">
                                <Link
                                  href="/admin/bookings"
                                  className="text-[#875441] underline underline-offset-2"
                                >
                                  View bookings
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            ) : null}
          </section>
        )}
      </div>
    </main>
  );
}
