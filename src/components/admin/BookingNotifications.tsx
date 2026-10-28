"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import OrderNotifications from "@/components/admin/OrderNotifications";

export default function BookingNotifications() {
  const supabase = useMemo(() => createClient(), []);

  const [authorized, setAuthorized] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [newBooking, setNewBooking] = useState(false);
  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState(false);

  const updatePendingOrderCount = useCallback(
    (count: number) => setPendingOrderCount(count),
    []
  );
  const showNewOrderActivity = useCallback(
    () => setOpen(true),
    []
  );
  const closePanel = useCallback(() => setOpen(false), []);

  const loadCount = useCallback(async () => {
    const { count, error } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    if (error) {
      console.error("Booking count error:", error.message);
      return;
    }

    setPendingCount(count ?? 0);
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null =
      null;

    async function startNotifications() {
      const { data: auth, error: authError } =
        await supabase.auth.getUser();

      if (cancelled || authError || !auth.user) return;

      const { data: admin, error: roleError } =
        await supabase
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

      setAuthorized(true);

      channel = supabase
        .channel("admin-booking-notifications")

        // New booking received
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "bookings",
          },
          () => {
            if (cancelled) return;

            setNewBooking(true);
            setOpen(true);
            void loadCount();
          }
        )

        // Booking status changed
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "bookings",
          },
          () => {
            if (cancelled) return;
            void loadCount();
          }
        )

        .subscribe((status) => {
          if (cancelled) return;

          if (status === "SUBSCRIBED") {
            setConnected(true);
            void loadCount();
          }

          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            setConnected(false);
          }
        });
    }

    void startNotifications();

    return () => {
      cancelled = true;

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [supabase, loadCount]);

  if (!authorized) return null;

  const totalPendingCount =
    pendingCount + pendingOrderCount;

  return (
    <div className="relative">
      {/* NOTIFICATION BELL */}
      <button
        type="button"
        onClick={() => {
          setOpen((previous) => !previous);
        }}
        aria-label={`Notifications, ${pendingCount} pending bookings and ${pendingOrderCount} pending orders`}
        aria-expanded={open}
        className="relative flex h-12 w-12 items-center justify-center rounded-full border border-[#eaded5] bg-white text-2xl transition hover:bg-[#f4e4dc]"
      >
        <span aria-hidden="true">🔔</span>

        {totalPendingCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
            {totalPendingCount > 99 ? "99+" : totalPendingCount}
          </span>
        )}
      </button>

      {/* NOTIFICATION PANEL */}
      <div
        hidden={!open}
        className="absolute right-0 top-14 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-[#eaded5] bg-white p-5 text-[#44271f] shadow-xl"
      >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-serif text-xl">
              Notifications
            </h3>

            <button
              type="button"
              onClick={closePanel}
              aria-label="Close notifications"
              className="text-lg text-[#80685b]"
            >
              ×
            </button>
          </div>

          {newBooking && (
            <div
              role="status"
              className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-800"
            >
              🔔 New booking received!
            </div>
          )}

        <section aria-labelledby="booking-notifications-heading">
          <h4
            id="booking-notifications-heading"
            className="font-serif text-lg font-semibold"
          >
            Booking Notifications
          </h4>

          <p className="mt-2 text-sm text-[#80685b]">
            Pending Booking Requests
          </p>

          <p className="mt-1 text-2xl font-bold">
            {pendingCount}
          </p>

          <p className="mt-2 text-xs text-[#80685b]">
            {connected
              ? "● Booking realtime connected"
              : "● Booking realtime disconnected or connecting"}
          </p>

          <Link
            href="/admin/bookings"
            onClick={() => {
              setNewBooking(false);
              setOpen(false);
            }}
            className="mt-4 block rounded-full bg-[#693f31] px-5 py-3 text-center text-sm font-medium text-white hover:bg-[#875441]"
          >
            View Bookings →
          </Link>
        </section>

        <OrderNotifications
          onPendingCountChange={updatePendingOrderCount}
          onNewActivity={showNewOrderActivity}
          onNavigate={closePanel}
        />
      </div>
    </div>
  );
}
