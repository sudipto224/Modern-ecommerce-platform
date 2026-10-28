"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { useBusinessProfile } from "@/lib/business-profile";

type Design = {
  id: string;
  title: string;
  category: string;
};

type BookingForm = {
  design_id: string;
  customer_name: string;
  customer_phone: string;
  preferred_date: string;
  preferred_time: string;
  service_address: string;
  notes: string;
  website: string;
};

const initialForm: BookingForm = {
  design_id: "",
  customer_name: "",
  customer_phone: "",
  preferred_date: "",
  preferred_time: "",
  service_address: "",
  notes: "",
  website: "",
};

const inputStyle =
  "w-full rounded-xl border border-[#e6d6cc] bg-white px-4 py-3 text-[#44271f] outline-none focus:border-[#b77b5b] focus:ring-2 focus:ring-[#b77b5b]/20";

export default function BookingPage() {
  const { profile } = useBusinessProfile();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<BookingForm>(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDesigns() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("designs")
        .select("id,title,category")
        .eq("status", "published")
        .order("title");

      if (!active) return;

      if (error) {
        setError("Unable to load designs.");
      } else {
        setDesigns(data ?? []);
      }

      setLoading(false);
    }

    void loadDesigns();

    return () => {
      active = false;
    };
  }, []);

  function updateField(
    name: keyof BookingForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Unable to submit booking."
        );
      }

      setSuccess(
        "Booking request submitted successfully! We will contact you after reviewing your request."
      );

      setForm(initialForm);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fffaf6] text-[#44271f]">
      <Navbar />

      <section className="px-6 pb-10 pt-16 text-center">
        <p className="mb-4 text-sm uppercase tracking-[0.25em] text-[#b77b5b]">
          Your Special Moment
        </p>

        <h1 className="font-serif text-4xl md:text-6xl">
          Book Your Henna Session
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-[#80685b]">
          Choose your favourite design and submit
          your appointment request.
        </p>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-24 lg:grid-cols-2 lg:gap-16">

        {/* LEFT IMAGE */}
        <div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl">
            <Image
              src="/henna-hero.jpg"
              alt="Bridal henna design"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>

          <div className="mt-6 rounded-2xl bg-[#f3e7dc] p-6">
            <h2 className="font-serif text-2xl">
              Make Your Day Beautiful
            </h2>

            <p className="mt-3 text-[#80685b]">
              Discover elegant designs for weddings,
              parties and special celebrations.
            </p>
          </div>
        </div>

        {/* BOOKING FORM */}
        <div className="rounded-3xl border border-[#eaded5] bg-white p-6 shadow-sm sm:p-10">

          <h2 className="mb-3 font-serif text-3xl">
            Appointment Details
          </h2>

          <p className="mb-8 text-sm text-[#80685b]">
            Fill in your details to request a booking.
          </p>
          {profile.businessHours && (
            <p className="mb-4 text-sm text-[#80685b]">
              Business hours: {profile.businessHours}
            </p>
          )}
          {profile.bookingInstructions && (
            <p className="mb-4 text-sm text-[#80685b]">
              {profile.bookingInstructions}
            </p>
          )}
          {profile.bookingConfirmation && (
            <p className="mb-6 rounded-xl bg-[#f8f0e9] p-4 text-sm text-[#693f31]">
              {profile.bookingConfirmation}
            </p>
          )}
          {!profile.bookingAvailable && (
            <p
              role="status"
              className="mb-6 rounded-xl bg-[#f8f0e9] p-4 text-sm text-[#693f31]"
            >
              Booking requests are temporarily unavailable.
            </p>
          )}

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
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

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div>
              <label
                htmlFor="design"
                className="mb-2 block text-sm font-medium"
              >
                Select Henna Design *
              </label>

              <select
                id="design"
                required
                disabled={loading}
                value={form.design_id}
                onChange={(e) =>
                  updateField("design_id", e.target.value)
                }
                className={inputStyle}
              >
                <option value="">
                  {loading
                    ? "Loading designs..."
                    : "Choose your design"}
                </option>

                {designs.map((design) => (
                  <option
                    key={design.id}
                    value={design.id}
                  >
                    {design.title} ({design.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium"
              >
                Full Name *
              </label>

              <input
                id="name"
                type="text"
                required
                minLength={2}
                maxLength={120}
                autoComplete="name"
                className={inputStyle}
                value={form.customer_name}
                onChange={(e) =>
                  updateField(
                    "customer_name",
                    e.target.value
                  )
                }
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-medium"
              >
                Phone Number *
              </label>

              <input
                id="phone"
                type="tel"
                required
                autoComplete="tel"
                placeholder="01XXXXXXXXX"
                className={inputStyle}
                value={form.customer_phone}
                onChange={(e) =>
                  updateField(
                    "customer_phone",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="date"
                  className="mb-2 block text-sm font-medium"
                >
                  Preferred Date *
                </label>

                <input
                  id="date"
                  required
                  type="date"
                  onFocus={(event) => {
                    event.currentTarget.min = new Date(
                      Date.now() -
                        new Date().getTimezoneOffset() * 60000
                    )
                      .toISOString()
                      .slice(0, 10);
                  }}
                  className={inputStyle}
                  value={form.preferred_date}
                  onChange={(e) =>
                    updateField(
                      "preferred_date",
                      e.target.value
                    )
                  }
                />
              </div>

              <div>
                <label
                  htmlFor="time"
                  className="mb-2 block text-sm font-medium"
                >
                  Preferred Time *
                </label>

                <input
                  id="time"
                  required
                  type="time"
                  className={inputStyle}
                  value={form.preferred_time}
                  onChange={(e) =>
                    updateField(
                      "preferred_time",
                      e.target.value
                    )
                  }
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="address"
                className="mb-2 block text-sm font-medium"
              >
                Service Address *
              </label>

              <textarea
                id="address"
                required
                minLength={10}
                maxLength={500}
                rows={3}
                className={inputStyle}
                value={form.service_address}
                onChange={(e) =>
                  updateField(
                    "service_address",
                    e.target.value
                  )
                }
              />
            </div>

            <div>
              <label
                htmlFor="notes"
                className="mb-2 block text-sm font-medium"
              >
                Special Instructions
              </label>

              <textarea
                id="notes"
                rows={3}
                maxLength={1000}
                className={inputStyle}
                value={form.notes}
                onChange={(e) =>
                  updateField("notes", e.target.value)
                }
              />
            </div>

            {/* Hidden spam prevention field */}
            <div
              className="absolute -left-[9999px]"
              aria-hidden="true"
            >
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(e) =>
                  updateField("website", e.target.value)
                }
              />
            </div>

            <button
              type="submit"
              disabled={
                submitting ||
                loading ||
                designs.length === 0 ||
                !profile.bookingAvailable
              }
              className="w-full rounded-full bg-[#693f31] px-8 py-4 font-semibold text-white transition hover:bg-[#875441] disabled:opacity-50"
            >
              {submitting
                ? "Submitting Booking..."
                : "Submit Booking Request →"}
            </button>

            <p className="text-center text-xs text-[#80685b]">
              Your appointment is not confirmed until
              our team reviews your request.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
