"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type BookingStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "completed";

type Booking = {
  id: string;
  customer_name: string;
  customer_phone: string;
  preferred_date: string;
  preferred_time: string;
  service_address: string;
  notes: string;
  status: BookingStatus;
  created_at: string;
  designs: {
    title: string;
  }[];
};

const statuses: BookingStatus[] = [
  "pending",
  "confirmed",
  "rejected",
  "cancelled",
  "completed",
];

export default function AdminBookingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selected, setSelected] = useState<
    Record<string, BookingStatus>
  >({});

  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState("");

  const loadBookings = useCallback(async () => {
    try {
      const { data: auth, error: authError } =
        await supabase.auth.getUser();

      setLoading(true);
      setErrorMessage("");

      if (authError || !auth.user) {
        setAuthorized(false);
        router.replace("/admin-login");
        return;
      }

      const { data: admin, error: roleError } =
        await supabase
          .from("admin_users")
          .select("role")
          .eq("user_id", auth.user.id)
          .maybeSingle();

      if (
        roleError ||
        !admin ||
        !["owner", "manager"].includes(admin.role)
      ) {
        setAuthorized(false);
        throw new Error("Admin access denied.");
      }

      setAuthorized(true);

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          customer_name,
          customer_phone,
          preferred_date,
          preferred_time,
          service_address,
          notes,
          status,
          created_at,
          designs(title)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows = (data ?? []) as Booking[];

      setBookings(rows);

      setSelected(
        Object.fromEntries(
          rows.map((booking) => [
            booking.id,
            booking.status,
          ])
        )
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load bookings."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBookings();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadBookings]);

  async function updateStatus(booking: Booking) {
    if (!authorized || savingId) return;

    const newStatus = selected[booking.id];

    if (!newStatus || newStatus === booking.status) {
      return;
    }

    setSavingId(booking.id);
    setErrorMessage("");
    setSuccess("");

    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id)
        .select("id")
        .single();

      if (error) throw error;

      setBookings((previous) =>
        previous.map((item) =>
          item.id === booking.id
            ? { ...item, status: newStatus }
            : item
        )
      );

      setSuccess("Booking status updated successfully!");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to update booking."
      );
    } finally {
      setSavingId(null);
    }
  }

  const filteredBookings = bookings.filter(
    (booking) =>
      filter === "all" || booking.status === filter
  );

  const pendingCount = bookings.filter(
    (booking) => booking.status === "pending"
  ).length;

  return (
    <main className="min-h-screen bg-[#faf6f3] px-5 py-10 text-[#44271f] md:px-10">
      <div className="mx-auto max-w-6xl">

        {/* PAGE HEADER */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-widest text-[#b77b5b]">
              Appointment Management
            </p>

            <h1 className="font-serif text-4xl">
              Booking Management
            </h1>

            <p className="mt-3 text-sm text-[#80685b]">
              Review and manage customer bookings.
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-full border border-[#d9c3b5] px-6 py-3 text-sm hover:bg-white"
          >
            ← Dashboard
          </Link>
        </header>

        {errorMessage && (
          <div
            role="alert"
            className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {errorMessage}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-6 rounded-xl bg-green-50 p-4 text-sm text-green-800"
          >
            {success}
          </div>
        )}

        {loading ? (
          <p>Loading bookings...</p>
        ) : !authorized ? (
          <p>Admin authorization required.</p>
        ) : (
          <>
            {/* OVERVIEW */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#eaded5] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#80685b]">
                  Total Bookings
                </p>
                <p className="mt-3 text-3xl font-bold">
                  {bookings.length}
                </p>
              </div>

              <div className="rounded-2xl border border-[#eaded5] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#80685b]">
                  Pending Bookings
                </p>
                <p className="mt-3 text-3xl font-bold text-[#b77b5b]">
                  {pendingCount}
                </p>
              </div>
            </div>

            {/* FILTER */}
            <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
              <select
                aria-label="Filter bookings"
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value)
                }
                className="rounded-xl border border-[#eaded5] bg-white px-5 py-3 text-sm"
              >
                <option value="all">All Bookings</option>

                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() +
                      status.slice(1)}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => void loadBookings()}
                className="rounded-full border border-[#d9c3b5] px-6 py-3 text-sm hover:bg-white"
              >
                Refresh Bookings
              </button>
            </div>

            {/* BOOKING LIST */}
            <div className="space-y-5">
              {filteredBookings.map((booking) => (
                <article
                  key={booking.id}
                  className="rounded-2xl border border-[#eaded5] bg-white p-6 shadow-sm"
                >
                  <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="font-serif text-2xl">
                        {booking.customer_name}
                      </h2>

                      <p className="mt-2 text-sm text-[#80685b]">
                        Booking ID: {booking.id.slice(0, 8)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-4 py-2 text-xs font-semibold ${
                        booking.status === "confirmed"
                          ? "bg-green-100 text-green-800"
                          : booking.status === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : booking.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {booking.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid gap-5 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-[#80685b]">
                        Mehndi Design
                      </p>
                      <p className="mt-1 font-medium">
                        {booking.designs[0]?.title ??
                          "Design unavailable"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[#80685b]">
                        Phone Number
                      </p>
                      <p className="mt-1 font-medium">
                        {booking.customer_phone}
                      </p>
                    </div>

                    <div>
                      <p className="text-[#80685b]">
                        Preferred Date
                      </p>
                      <p className="mt-1 font-medium">
                        {booking.preferred_date}
                      </p>
                    </div>

                    <div>
                      <p className="text-[#80685b]">
                        Preferred Time
                      </p>
                      <p className="mt-1 font-medium">
                        {booking.preferred_time.slice(0, 5)}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <p className="text-[#80685b]">
                        Service Address
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">
                        {booking.service_address}
                      </p>
                    </div>

                    {booking.notes && (
                      <div className="sm:col-span-2">
                        <p className="text-[#80685b]">
                          Special Instructions
                        </p>
                        <p className="mt-1 whitespace-pre-wrap">
                          {booking.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* STATUS MANAGEMENT */}
                  <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#eaded5] pt-5">
                    <select
                      aria-label={`Status for ${booking.customer_name}`}
                      value={
                        selected[booking.id] ??
                        booking.status
                      }
                      onChange={(event) =>
                        setSelected((previous) => ({
                          ...previous,
                          [booking.id]:
                            event.target.value as BookingStatus,
                        }))
                      }
                      className="rounded-xl border border-[#e6d6cc] bg-white px-4 py-3 text-sm"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() +
                            status.slice(1)}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={
                        savingId !== null ||
                        selected[booking.id] === booking.status
                      }
                      onClick={() =>
                        void updateStatus(booking)
                      }
                      className="rounded-full bg-[#693f31] px-6 py-3 text-sm font-medium text-white hover:bg-[#875441] disabled:opacity-50"
                    >
                      {savingId === booking.id
                        ? "Saving..."
                        : "Save Status"}
                    </button>
                  </div>
                </article>
              ))}

              {filteredBookings.length === 0 && (
                <div className="rounded-2xl bg-white p-10 text-center text-[#80685b]">
                  No bookings found.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
