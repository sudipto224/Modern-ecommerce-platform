"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Statistics = {
  products: number;
  bookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  orders: number;
  pendingOrders: number;
};

const placeholders = [
  { title: "Total Revenue", value: "Coming Soon", icon: "💰" },
];

export default function DashboardStatistics() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [connected, setConnected] = useState(false);

  const loadStatistics = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data: auth, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;
      if (!auth.user) {
        router.replace("/admin-login");
        return;
      }

      const { data: admin, error: roleError } = await supabase
        .from("admin_users")
        .select("role")
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (roleError) throw roleError;
      if (!admin || !["owner", "manager"].includes(admin.role)) {
        router.replace("/admin-login");
        return;
      }

      const [
        products,
        bookings,
        pendingBookings,
        confirmedBookings,
        orders,
        pendingOrders,
      ] =
        await Promise.all([
          supabase.from("products").select("id", { count: "exact", head: true }),
          supabase.from("bookings").select("id", { count: "exact", head: true }),
          supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending"),
          supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .eq("status", "confirmed"),
          supabase.from("orders").select("id", { count: "exact", head: true }),
          supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending"),
        ]);

      const resultErrors = [
        products.error,
        bookings.error,
        pendingBookings.error,
        confirmedBookings.error,
        orders.error,
        pendingOrders.error,
      ];
      const queryError = resultErrors.find((result) => result !== null);
      if (queryError) throw queryError;

      setStatistics({
        products: products.count ?? 0,
        bookings: bookings.count ?? 0,
        pendingBookings: pendingBookings.count ?? 0,
        confirmedBookings: confirmedBookings.count ?? 0,
        orders: orders.count ?? 0,
        pendingOrders: pendingOrders.count ?? 0,
      });
    } catch (error) {
      setStatistics(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load dashboard statistics."
      );
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        if (!cancelled) void loadStatistics();
      }, 200);
    };

    async function start() {
      await loadStatistics();
      if (cancelled) return;

      const { data: auth, error: authError } =
        await supabase.auth.getUser();
      if (cancelled || authError || !auth.user) return;

      const { data: admin, error: roleError } = await supabase
        .from("admin_users")
        .select("role")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (
        cancelled ||
        roleError ||
        !admin ||
        !["owner", "manager"].includes(admin.role)
      ) {
        return;
      }

      channel = supabase
        .channel("admin-dashboard-booking-statistics")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "bookings" },
          scheduleRefresh
        )
        .subscribe((status) => {
          if (cancelled) return;

          if (status === "SUBSCRIBED") {
            setConnected(true);
            scheduleRefresh();
          } else if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            setConnected(false);
          }
        });
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void loadStatistics();
      }
    };

    const refreshAfterOrderUpdate = () => scheduleRefresh();

    void start();
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener(
      "admin-orders-updated",
      refreshAfterOrderUpdate
    );
    const refreshInterval = setInterval(refreshWhenVisible, 60_000);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener(
        "admin-orders-updated",
        refreshAfterOrderUpdate
      );
      clearInterval(refreshInterval);
      if (refreshTimeout) clearTimeout(refreshTimeout);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [loadStatistics, supabase]);

  const liveStatistics = [
    { title: "Total Products", value: statistics?.products, icon: "📦" },
    { title: "Total Bookings", value: statistics?.bookings, icon: "📋" },
    {
      title: "Pending Bookings",
      value: statistics?.pendingBookings,
      icon: "📅",
    },
    {
      title: "Confirmed Bookings",
      value: statistics?.confirmedBookings,
      icon: "✅",
    },
    { title: "Total Orders", value: statistics?.orders, icon: "🛍️" },
    { title: "Pending Orders", value: statistics?.pendingOrders, icon: "🕒" },
  ];

  return (
    <>
      {errorMessage && (
        <div
          role="alert"
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <span>Unable to load dashboard statistics: {errorMessage}</span>
          <button
            type="button"
            onClick={() => void loadStatistics()}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="mb-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ...liveStatistics.map((stat) => ({
            ...stat,
            value: stat.value === undefined
              ? loading
                ? "Loading…"
                : "Unavailable"
              : String(stat.value),
            label: connected ? "Live" : "Supabase",
          })),
          ...placeholders.map((stat) => ({
            ...stat,
            label: "Coming Soon",
          })),
        ].map((stat) => (
          <div
            key={stat.title}
            className="rounded-2xl border border-[#eaded5] bg-white p-6 shadow-sm"
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="text-3xl">{stat.icon}</span>
              <span className="text-xs text-[#a38b7d]">{stat.label}</span>
            </div>

            <p className="text-sm text-[#80685b]">{stat.title}</p>
            <p className="mt-3 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>
    </>
  );
}
