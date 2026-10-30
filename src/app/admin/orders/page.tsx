"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

type Order = {
  id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_area: string | null;
  notes: string | null;
  payment_method: string;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number | null;
  total: number | null;
  created_at: string;
};

type OrderItem = {
  order_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type OrderCounts = {
  total: number;
  pending: number;
  confirmed: number;
};

const orderStatuses: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const statusOptions: Array<OrderStatus | "all"> = [
  "all",
  ...orderStatuses,
];

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const DELIVERY_FEE_PATTERN = /^\d+(?:\.\d{1,2})?$/;
const ORDER_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isOrderStatus(value: string): value is OrderStatus {
  return orderStatuses.some((status) => status === value);
}

function formatPrice(value: number | null) {
  if (value === null) return "Pending";

  return `৳${Number(value).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StatusBadge({
  status,
}: {
  status: OrderStatus;
}) {
  const colors: Record<OrderStatus, string> = {
    pending: "bg-amber-100 text-amber-800",
    confirmed: "bg-blue-100 text-blue-800",
    processing: "bg-purple-100 text-purple-800",
    shipped: "bg-indigo-100 text-indigo-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${colors[status]}`}
    >
      {status}
    </span>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#fbf7f4] p-8 text-[#80685b]">
          Loading orders...
        </main>
      }
    >
      <AdminOrdersContent />
    </Suspense>
  );
}

function AdminOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkedOrderId = searchParams.get("order");

  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const [counts, setCounts] = useState<OrderCounts>({
    total: 0,
    pending: 0,
    confirmed: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deepLinkMessage, setDeepLinkMessage] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<OrderStatus | "all">("all");

  const [selectedOrderId, setSelectedOrderId] =
    useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const [deliveryFeeInput, setDeliveryFeeInput] =
    useState("");
  const [nextStatus, setNextStatus] =
    useState<OrderStatus>("pending");
  const [updatingOrder, setUpdatingOrder] = useState(false);
  const [updateFeedback, setUpdateFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  function openOrder(order: Order) {
    setSelectedOrderId(order.id);
    setDeliveryFeeInput(
      order.delivery_fee === null
        ? ""
        : String(order.delivery_fee)
    );
    setNextStatus(order.status);
    setUpdateFeedback(null);
  }

  async function saveOrderChanges() {
    if (!selectedOrder || updatingOrder) return;

    const feeText = deliveryFeeInput.trim();
    const feeChanged =
      nextStatus !== "cancelled" &&
      feeText !== "" &&
      Number(feeText) !== selectedOrder.delivery_fee;

    if (
      feeChanged &&
      (!DELIVERY_FEE_PATTERN.test(feeText) ||
        !Number.isFinite(Number(feeText)))
    ) {
      setUpdateFeedback({
        type: "error",
        message:
          "Enter a non-negative delivery fee with no more than two decimal places.",
      });
      return;
    }

    if (
      nextStatus === selectedOrder.status &&
      !feeChanged
    ) {
      return;
    }

    setUpdatingOrder(true);
    setUpdateFeedback(null);

    try {
      const response = await fetch(
        `/api/admin/orders/${selectedOrder.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: nextStatus,
            ...(feeChanged ? { deliveryFee: feeText } : {}),
          }),
        }
      );

      const result: unknown = await response.json();
      const message =
        typeof result === "object" &&
        result !== null &&
        "message" in result &&
        typeof result.message === "string"
          ? result.message
          : "Unable to update the order.";

      if (!response.ok) {
        setUpdateFeedback({ type: "error", message });
        return;
      }

      setUpdateFeedback({ type: "success", message });
      setRefreshKey((value) => value + 1);
    } catch {
      setUpdateFeedback({
        type: "error",
        message: "Unable to update the order. Please try again.",
      });
    } finally {
      setUpdatingOrder(false);
    }
  }

  // Load orders from Supabase.
  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setLoading(true);
      setError("");
      setAccessDenied(false);
      setDeepLinkMessage("");

      if (linkedOrderId && !ORDER_ID_REGEX.test(linkedOrderId)) {
        setDeepLinkMessage("This order link is invalid.");
      }

      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key =
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

        if (!url || !key) {
          throw new Error(
            "Supabase configuration is missing."
          );
        }

        const supabase = createBrowserClient(url, key);

        // Verify authenticated user.
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (authError || !user) {
          router.replace("/admin-login");
          return;
        }

        // Verify owner or manager.
        const { data: adminUser, error: adminError } =
          await supabase
            .from("admin_users")
            .select("role")
            .eq("user_id", user.id)
            .in("role", ["owner", "manager"])
            .maybeSingle();

        if (cancelled) return;

        if (adminError) {
          throw new Error(
            "Unable to verify administrator access."
          );
        }

        if (!adminUser) {
          setAccessDenied(true);
          return;
        }

        // Fetch recent orders and exact counts.
        const [
          ordersResult,
          totalResult,
          pendingResult,
          confirmedResult,
        ] = await Promise.all([
          supabase
            .from("orders")
            .select(
              "id, customer_name, customer_phone, delivery_address, delivery_area, notes, payment_method, status, subtotal, delivery_fee, total, created_at"
            )
            .order("created_at", {
              ascending: false,
            })
            .limit(100),

          supabase
            .from("orders")
            .select("id", {
              count: "exact",
              head: true,
            }),

          supabase
            .from("orders")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("status", "pending"),

          supabase
            .from("orders")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("status", "confirmed"),
        ]);

        if (cancelled) return;

        if (
          ordersResult.error ||
          totalResult.error ||
          pendingResult.error ||
          confirmedResult.error
        ) {
          throw new Error(
            "Unable to load orders. Check the admin RLS permissions."
          );
        }

        const loadedOrders =
          (ordersResult.data ?? []) as Order[];

        if (
          linkedOrderId &&
          ORDER_ID_REGEX.test(linkedOrderId) &&
          !loadedOrders.some((order) => order.id === linkedOrderId)
        ) {
          const { data: linkedOrder, error: linkedOrderError } =
            await supabase
              .from("orders")
              .select(
                "id, customer_name, customer_phone, delivery_address, delivery_area, notes, payment_method, status, subtotal, delivery_fee, total, created_at"
              )
              .eq("id", linkedOrderId)
              .maybeSingle();

          if (linkedOrderError) {
            throw new Error("Unable to load the linked order.");
          }

          if (linkedOrder) {
            loadedOrders.unshift(linkedOrder as Order);
          } else {
            setDeepLinkMessage(
              "This order is unavailable or you do not have permission to view it."
            );
          }
        }

        // Fetch items only for the loaded orders.
        let loadedItems: OrderItem[] = [];

        if (loadedOrders.length > 0) {
          const orderIds = loadedOrders.map(
            (order) => order.id
          );

          const { data, error: itemsError } =
            await supabase
              .from("order_items")
              .select(
                "order_id, product_name, quantity, unit_price, line_total"
              )
              .in("order_id", orderIds);

          if (itemsError) {
            throw new Error(
              "Unable to load order products."
            );
          }

          loadedItems = (data ?? []) as OrderItem[];
        }

        if (cancelled) return;

        setOrders(loadedOrders);
        setOrderItems(loadedItems);

        if (linkedOrderId && ORDER_ID_REGEX.test(linkedOrderId)) {
          const linkedOrder = loadedOrders.find(
            (order) => order.id === linkedOrderId
          );
          if (linkedOrder) {
            setSelectedOrderId(linkedOrder.id);
            setDeliveryFeeInput(
              linkedOrder.delivery_fee === null
                ? ""
                : String(linkedOrder.delivery_fee)
            );
            setNextStatus(linkedOrder.status);
            setStatusFilter("all");
          }
        }

        setCounts({
          total: totalResult.count ?? 0,
          pending: pendingResult.count ?? 0,
          confirmed: confirmedResult.count ?? 0,
        });
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load orders."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, [linkedOrderId, router, refreshKey]);

  // Search and filter loaded orders.
  const filteredOrders = orders.filter((order) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      order.id.toLowerCase().includes(query) ||
      order.customer_name.toLowerCase().includes(query) ||
      order.customer_phone.includes(query);

    const matchesStatus =
      statusFilter === "all" ||
      order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const selectedOrder = orders.find(
    (order) => order.id === selectedOrderId
  );

  const selectedItems = selectedOrder
    ? orderItems.filter(
        (item) => item.order_id === selectedOrder.id
      )
    : [];

  const menu = [
    {
      label: "Dashboard",
      href: "/admin",
      icon: "▦",
    },
    {
      label: "Products",
      href: "/admin/products",
      icon: "▣",
    },
    {
      label: "Mehndi Designs",
      href: "/admin/designs",
      icon: "✿",
    },
    {
      label: "Orders",
      href: "/admin/orders",
      icon: "▤",
    },
    {
      label: "Bookings",
      href: "/admin/bookings",
      icon: "▦",
    },
  ];

  return (
    <div className="min-h-screen bg-[#fbf7f4] text-[#44271f] lg:flex">
      {/* ADMIN SIDEBAR */}
      <aside className="w-full shrink-0 border-b border-[#eaded5] bg-white lg:min-h-screen lg:w-56 lg:border-b-0 lg:border-r">
        <div className="border-b border-[#eaded5] px-5 py-6">
          <Link
            href="/admin"
            className="text-lg font-bold tracking-wide"
          >
            Mehedi <span className="text-[#b77b5b]">By Meherin</span>
          </Link>

          <p className="mt-2 text-xs text-[#9b6d57]">
            Business Management
          </p>
        </div>

        <nav className="px-3 py-5">
          <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-[#b38a76]">
            Management
          </p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {menu.map((item) => {
              const active =
                item.href === "/admin/orders";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={
                    active ? "page" : undefined
                  }
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                    active
                      ? "bg-[#693f31] font-semibold text-white"
                      : "text-[#80685b] hover:bg-[#f5ebe5]"
                  }`}
                >
                  <span aria-hidden="true">
                    {item.icon}
                  </span>

                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="px-3 pb-6">
          <Link
            href="/"
            className="block rounded-xl border border-[#eaded5] px-4 py-3 text-center text-sm hover:bg-[#fffaf6]"
          >
            ← View Website
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="min-w-0 flex-1 px-5 py-8 md:px-9 md:py-12">
        <div className="mx-auto max-w-7xl">
          {/* HEADER */}
          <div className="mb-9 flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#b77b5b]">
                Business Management
              </p>

              <h1 className="font-serif text-4xl font-semibold">
                Orders Management
              </h1>

              <p className="mt-3 text-sm text-[#8b7669]">
                Review customer orders and delivery details.
              </p>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() =>
                setRefreshKey((value) => value + 1)
              }
              className="rounded-full border border-[#e7d8cd] bg-white px-6 py-3 text-sm font-semibold transition hover:bg-[#f5e9e1] disabled:opacity-50"
            >
              {loading ? "Loading..." : "↻ Refresh"}
            </button>
          </div>

          {/* LOADING */}
          {loading ? (
            <div className="rounded-2xl border border-[#eaded5] bg-white p-12 text-center text-[#80685b]">
              Loading orders...
            </div>
          ) : accessDenied ? (
            <div className="rounded-2xl border border-red-200 bg-white p-10 text-center">
              <h2 className="font-serif text-2xl font-semibold text-red-700">
                Access Denied
              </h2>

              <p className="mt-3 text-sm text-[#80685b]">
                Only authorized owners and managers
                can access customer orders.
              </p>
            </div>
          ) : error ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
            >
              {error}
            </div>
          ) : (
            <>
              {deepLinkMessage && (
                <p
                  role="status"
                  className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
                >
                  {deepLinkMessage}
                </p>
              )}
              {/* STATISTICS */}
              <div className="mb-8 grid gap-5 sm:grid-cols-3">
                {[
                  {
                    label: "Total Orders",
                    count: counts.total,
                    icon: "📦",
                  },
                  {
                    label: "Pending Orders",
                    count: counts.pending,
                    icon: "🕒",
                  },
                  {
                    label: "Confirmed Orders",
                    count: counts.confirmed,
                    icon: "✅",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-[#eaded5] bg-white p-6 shadow-sm"
                  >
                    <div className="mb-5 text-2xl">
                      {stat.icon}
                    </div>

                    <p className="text-sm text-[#80685b]">
                      {stat.label}
                    </p>

                    <p className="mt-2 text-3xl font-bold">
                      {stat.count}
                    </p>
                  </div>
                ))}
              </div>

              {/* ORDERS TABLE */}
              <section className="overflow-hidden rounded-2xl border border-[#eaded5] bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eaded5] p-6">
                  <div>
                    <h2 className="font-serif text-2xl font-semibold">
                      Recent Orders
                    </h2>

                    <p className="mt-1 text-xs text-[#8b7669]">
                      Showing the latest 100 orders
                      at most.
                    </p>
                  </div>

                  <div className="flex w-full flex-wrap gap-3 sm:w-auto">
                    <input
                      type="search"
                      value={search}
                      onChange={(event) =>
                        setSearch(event.target.value)
                      }
                      placeholder="Search orders..."
                      aria-label="Search orders"
                      className="min-w-0 flex-1 rounded-xl border border-[#e7d8cd] px-4 py-3 text-sm outline-none focus:border-[#b77b5b] sm:w-52"
                    />

                    <select
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(
                          event.target.value as
                            | OrderStatus
                            | "all"
                        )
                      }
                      aria-label="Filter by order status"
                      className="rounded-xl border border-[#e7d8cd] bg-white px-4 py-3 text-sm outline-none"
                    >
                      {statusOptions.map((status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status === "all"
                            ? "All Status"
                            : status.charAt(0).toUpperCase() +
                              status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="px-6 py-14 text-center">
                    <div className="mb-4 text-4xl">
                      📦
                    </div>

                    <h3 className="font-serif text-xl font-semibold">
                      No Orders Found
                    </h3>

                    <p className="mt-3 text-sm text-[#8b7669]">
                      No orders match the selected filters.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="bg-[#fffaf6] text-[#80685b]">
                        <tr>
                          <th className="px-5 py-4 font-medium">
                            Order
                          </th>
                          <th className="px-5 py-4 font-medium">
                            Customer
                          </th>
                          <th className="px-5 py-4 font-medium">
                            Date
                          </th>
                          <th className="px-5 py-4 font-medium">
                            Subtotal
                          </th>
                          <th className="px-5 py-4 font-medium">
                            Status
                          </th>
                          <th className="px-5 py-4 font-medium">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredOrders.map((order) => (
                          <tr
                            key={order.id}
                            className="border-t border-[#f0e7e1] hover:bg-[#fffaf6]"
                          >
                            <td className="px-5 py-4 font-mono text-xs">
                              #{order.id.slice(0, 8)}
                            </td>

                            <td className="px-5 py-4 font-medium">
                              {order.customer_name}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-xs text-[#80685b]">
                              {formatDate(order.created_at)}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 font-semibold">
                              {formatPrice(order.subtotal)}
                            </td>

                            <td className="px-5 py-4">
                              <StatusBadge
                                status={order.status}
                              />
                            </td>

                            <td className="px-5 py-4">
                              <button
                                type="button"
                                onClick={() => openOrder(order)}
                                className="rounded-full border border-[#dbc7ba] px-4 py-2 text-xs font-semibold hover:bg-[#f5e9e1]"
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
              </section>

              {/* SELECTED ORDER DETAILS */}
              {selectedOrder && (
                <section className="mt-7 rounded-2xl border border-[#eaded5] bg-white p-6 shadow-sm md:p-8">
                  <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-[#b77b5b]">
                        Order Information
                      </p>

                      <h2 className="mt-2 font-serif text-2xl font-semibold">
                        Order Details
                      </h2>

                      <p className="mt-2 break-all font-mono text-xs text-[#80685b]">
                        {selectedOrder.id}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedOrderId(null)
                      }
                      className="rounded-full border border-[#eaded5] px-4 py-2 text-sm hover:bg-[#fffaf6]"
                    >
                      Close ×
                    </button>
                  </div>

                  <div className="grid gap-8 md:grid-cols-2">
                    {/* CUSTOMER DETAILS */}
                    <div className="space-y-4">
                      <h3 className="font-serif text-lg font-semibold">
                        Customer Information
                      </h3>

                      <p className="text-sm">
                        <strong>Name:</strong>{" "}
                        {selectedOrder.customer_name}
                      </p>

                      <p className="text-sm">
                        <strong>Phone:</strong>{" "}
                        {selectedOrder.customer_phone}
                      </p>

                      <p className="text-sm">
                        <strong>Address:</strong>{" "}
                        {selectedOrder.delivery_address}
                      </p>

                      <p className="text-sm">
                        <strong>Area:</strong>{" "}
                        {selectedOrder.delivery_area ||
                          "Not provided"}
                      </p>

                      <p className="text-sm">
                        <strong>Notes:</strong>{" "}
                        {selectedOrder.notes ||
                          "No special instructions"}
                      </p>

                      <p className="text-sm">
                        <strong>Payment:</strong>{" "}
                        {selectedOrder.payment_method ===
                        "cod"
                          ? "Cash on Delivery"
                          : selectedOrder.payment_method}
                      </p>

                      <div className="flex items-center gap-3">
                        <strong className="text-sm">
                          Status:
                        </strong>

                        <StatusBadge
                          status={selectedOrder.status}
                        />
                      </div>
                    </div>

                    {/* ORDERED PRODUCTS */}
                    <div>
                      <h3 className="mb-5 font-serif text-lg font-semibold">
                        Ordered Products
                      </h3>

                      <div className="space-y-4">
                        {selectedItems.map((item, index) => (
                          <div
                            key={`${item.order_id}-${index}`}
                            className="flex justify-between gap-4 border-b border-[#f0e7e1] pb-4"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {item.product_name}
                              </p>

                              <p className="mt-1 text-xs text-[#80685b]">
                                {formatPrice(
                                  item.unit_price
                                )}{" "}
                                × {item.quantity}
                              </p>
                            </div>

                            <p className="text-sm font-semibold">
                              {formatPrice(item.line_total)}
                            </p>
                          </div>
                        ))}

                        {selectedItems.length === 0 && (
                          <p className="text-sm text-[#80685b]">
                            No order items available.
                          </p>
                        )}
                      </div>

                      <div className="mt-6 space-y-4">
                        <div className="flex justify-between text-sm">
                          <span>Products Subtotal</span>
                          <strong>
                            {formatPrice(
                              selectedOrder.subtotal
                            )}
                          </strong>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span>Delivery Fee</span>
                          <strong>
                            {formatPrice(
                              selectedOrder.delivery_fee
                            )}
                          </strong>
                        </div>

                        <div className="flex justify-between border-t border-[#eaded5] pt-4">
                          <span className="font-semibold">
                            Final Total
                          </span>

                          <strong>
                            {formatPrice(
                              selectedOrder.total
                            )}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 border-t border-[#eaded5] pt-6">
                    <h3 className="font-serif text-lg font-semibold">
                      Order Management
                    </h3>

                    {updateFeedback && (
                      <p
                        role={updateFeedback.type === "error" ? "alert" : "status"}
                        className={`mt-4 rounded-xl p-4 text-sm ${
                          updateFeedback.type === "error"
                            ? "border border-red-200 bg-red-50 text-red-700"
                            : "border border-green-200 bg-green-50 text-green-800"
                        }`}
                      >
                        {updateFeedback.message}
                      </p>
                    )}

                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                      <div>
                        <label
                          htmlFor="delivery-fee"
                          className="block text-sm font-medium"
                        >
                          Delivery Fee
                        </label>
                        <input
                          id="delivery-fee"
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={deliveryFeeInput}
                          onChange={(event) => {
                            setDeliveryFeeInput(event.target.value);
                            setUpdateFeedback(null);
                          }}
                          disabled={
                            updatingOrder ||
                            !["pending", "confirmed"].includes(
                              selectedOrder.status
                            )
                          }
                          placeholder="e.g. 80.00"
                          className="mt-2 w-full rounded-xl border border-[#e7d8cd] bg-white px-4 py-3 text-sm outline-none focus:border-[#b77b5b] disabled:bg-[#f5efea] disabled:text-[#9d8375]"
                        />
                        <p className="mt-2 text-xs text-[#80685b]">
                          Final total preview:{" "}
                          <strong>
                            {DELIVERY_FEE_PATTERN.test(
                              deliveryFeeInput.trim()
                            ) &&
                            Number.isFinite(
                              Number(deliveryFeeInput)
                            )
                              ? formatPrice(
                                  Number(selectedOrder.subtotal) +
                                    Number(deliveryFeeInput)
                                )
                              : formatPrice(selectedOrder.total)}
                          </strong>
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor="order-status"
                          className="block text-sm font-medium"
                        >
                          Update Status
                        </label>
                        <select
                          id="order-status"
                          value={nextStatus}
                          onChange={(event) => {
                            const value = event.target.value;
                            if (isOrderStatus(value)) {
                              setNextStatus(value);
                              setUpdateFeedback(null);
                            }
                          }}
                          disabled={updatingOrder}
                          className="mt-2 w-full rounded-xl border border-[#e7d8cd] bg-white px-4 py-3 text-sm outline-none focus:border-[#b77b5b] disabled:bg-[#f5efea]"
                        >
                          {[selectedOrder.status, ...allowedTransitions[selectedOrder.status]].map(
                            (status) => (
                              <option key={status} value={status}>
                                {status.charAt(0).toUpperCase() +
                                  status.slice(1)}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void saveOrderChanges()}
                      disabled={
                        updatingOrder ||
                        (nextStatus === selectedOrder.status &&
                          (deliveryFeeInput.trim() === "" ||
                            Number(deliveryFeeInput) ===
                              selectedOrder.delivery_fee))
                      }
                      className="mt-5 rounded-full bg-[#693f31] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#4f2c22] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {updatingOrder ? "Saving..." : "Save Order Changes"}
                    </button>

                    <p className="mt-4 rounded-xl bg-[#fffaf6] p-4 text-xs text-[#80685b]">
                      Confirmed orders require a delivery fee. Cancelling an
                      eligible order restores its reserved stock once.
                    </p>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
