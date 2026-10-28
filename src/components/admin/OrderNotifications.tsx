"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

type RecentOrder = {
  id: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
};

type OrderActivity = {
  key: string;
  id: string;
  status: OrderStatus;
  event: "new" | "updated";
};

type Props = {
  onPendingCountChange: (count: number) => void;
  onNewActivity: () => void;
  onNavigate: () => void;
};

function isOrderStatus(value: string): value is OrderStatus {
  return [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ].some((status) => status === value);
}

function formatOrderDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function OrderNotifications({
  onPendingCountChange,
  onNewActivity,
  onNavigate,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [authorized, setAuthorized] = useState(false);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [activities, setActivities] = useState<OrderActivity[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const seenEvents = useRef(new Set<string>());

  const loadOrders = useCallback(async () => {
    setRefreshing(true);

    try {
      const [pendingResult, ordersResult] = await Promise.all([
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("orders")
          .select("id,status,created_at,updated_at")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (pendingResult.error) throw pendingResult.error;
      if (ordersResult.error) throw ordersResult.error;

      const rows: RecentOrder[] = [];
      for (const row of ordersResult.data ?? []) {
        if (
          typeof row.id === "string" &&
          isOrderStatus(row.status) &&
          typeof row.created_at === "string" &&
          typeof row.updated_at === "string"
        ) {
          rows.push({
            id: row.id,
            status: row.status,
            created_at: row.created_at,
            updated_at: row.updated_at,
          });
        }
      }

      const count = pendingResult.count ?? 0;
      setPendingCount(count);
      onPendingCountChange(count);
      setRecentOrders(rows);
      setErrorMessage("");
      window.dispatchEvent(new Event("admin-orders-updated"));
    } catch {
      setErrorMessage("Unable to refresh order notifications.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onPendingCountChange, supabase]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleOrderChange = (
      event: "new" | "updated",
      record: unknown
    ) => {
      if (
        cancelled ||
        typeof record !== "object" ||
        record === null ||
        !("id" in record) ||
        typeof record.id !== "string" ||
        !("status" in record) ||
        typeof record.status !== "string" ||
        !isOrderStatus(record.status)
      ) {
        return;
      }

      const id = record.id;
      const status = record.status;
      const changedAt =
        "updated_at" in record && typeof record.updated_at === "string"
          ? record.updated_at
          : status;
      const key = `${event}:${id}:${changedAt}`;

      if (!seenEvents.current.has(key)) {
        seenEvents.current.add(key);
        if (seenEvents.current.size > 100) {
          const oldest = seenEvents.current.values().next().value;
          if (oldest) seenEvents.current.delete(oldest);
        }

        setActivities((current) =>
          [
            {
              key,
              id,
              status,
              event,
            },
            ...current,
          ].slice(0, 5)
        );
        onNewActivity();
      }

      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        if (!cancelled) void loadOrders();
      }, 150);
    };

    async function start() {
      const { data: auth, error: authError } =
        await supabase.auth.getUser();
      if (cancelled) return;

      if (authError || !auth.user) {
        setLoading(false);
        return;
      }

      const { data: admin, error: roleError } = await supabase
        .from("admin_users")
        .select("role")
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (cancelled) return;
      if (
        roleError ||
        !admin ||
        !["owner", "manager"].includes(admin.role)
      ) {
        setLoading(false);
        return;
      }

      setAuthorized(true);
      await loadOrders();
      if (cancelled) return;

      channel = supabase
        .channel("admin-order-notifications")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "orders" },
          (payload) => handleOrderChange("new", payload.new)
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "orders" },
          (payload) => handleOrderChange("updated", payload.new)
        )
        .subscribe((status) => {
          if (cancelled) return;

          if (status === "SUBSCRIBED") {
            setConnected(true);
            void loadOrders();
          } else if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            setConnected(false);
            setErrorMessage(
              "Realtime disconnected. Use refresh to check for order updates."
            );
          }
        });
    }

    void start();

    return () => {
      cancelled = true;
      if (refreshTimeout) clearTimeout(refreshTimeout);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [loadOrders, onNewActivity, supabase]);

  if (!authorized) return null;

  return (
    <section
      aria-labelledby="order-notifications-heading"
      className="mt-5 border-t border-[#eaded5] pt-5"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4
            id="order-notifications-heading"
            className="font-serif text-lg font-semibold"
          >
            Order Notifications
          </h4>
          <p className="mt-1 text-xs text-[#80685b]">
            Pending Orders: {pendingCount}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadOrders()}
          disabled={refreshing}
          className="rounded-full border border-[#dbc7ba] px-3 py-2 text-xs font-medium hover:bg-[#fffaf6] disabled:opacity-50"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <p className="mt-2 text-xs text-[#80685b]" role="status">
        {connected
          ? "● Live order updates connected"
          : "● Realtime disconnected or connecting"}
      </p>

      {errorMessage && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800"
        >
          {errorMessage}
        </p>
      )}

      {activities.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#a38b7d]">
            Recent activity
          </p>
          {activities.map((activity) => (
            <Link
              key={activity.key}
              href={`/admin/orders?order=${encodeURIComponent(activity.id)}`}
              onClick={onNavigate}
              className="block rounded-lg bg-green-50 p-3 text-xs text-green-900 hover:bg-green-100"
            >
              {activity.event === "new" ? "New order" : "Order updated"}{" "}
              #{activity.id.slice(0, 8)} — {activity.status}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#a38b7d]">
          Recent orders
        </p>
        {loading ? (
          <p className="rounded-lg bg-[#fffaf6] p-3 text-sm text-[#80685b]">
            Loading order notifications…
          </p>
        ) : recentOrders.length === 0 ? (
          <p className="rounded-lg bg-[#fffaf6] p-3 text-sm text-[#80685b]">
            No orders to show.
          </p>
        ) : (
          <ul className="max-h-48 space-y-2 overflow-y-auto">
            {recentOrders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/admin/orders?order=${encodeURIComponent(order.id)}`}
                  onClick={onNavigate}
                  className="block rounded-lg border border-[#f0e7e1] p-3 hover:bg-[#fffaf6]"
                >
                  <span className="flex items-center justify-between gap-2 text-sm font-medium">
                    <span>Order #{order.id.slice(0, 8)}</span>
                    <span className="capitalize text-[#875441]">
                      {order.status}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-[#80685b]">
                    {formatOrderDate(order.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link
        href="/admin/orders"
        onClick={onNavigate}
        className="mt-4 block rounded-full bg-[#693f31] px-5 py-3 text-center text-sm font-medium text-white hover:bg-[#875441]"
      >
        View Orders →
      </Link>
    </section>
  );
}
