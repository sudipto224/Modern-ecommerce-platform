"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import Image from "next/image";
import Link from "next/link";

import Navbar from "@/components/Navbar";
import BusinessFooter from "@/components/BusinessFooter";
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
  "w-full min-w-0 rounded-2xl border border-[#E5D9DD] bg-[#FFFCFC] px-4 py-3.5 text-[15px] text-[#403043] outline-none transition-all duration-300 placeholder:text-[#AF9AA7] hover:border-[#C9AAB7] focus:border-[#AD788C] focus:bg-white focus:ring-4 focus:ring-[#B98A9A]/15 disabled:cursor-not-allowed disabled:bg-[#F6F0F2] disabled:opacity-70";

const labelStyle =
  "mb-2 block text-[13px] font-semibold text-[#564151]";

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M5 19 19 5M8 5h11v11" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4M17 3v4M3 10h18" />
      <path d="m9 16 2 2 4-4" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M20.8 8.5c0 5-8.8 11.1-8.8 11.1S3.2 13.5 3.2 8.5a4.8 4.8 0 0 1 8.8-2.6 4.8 4.8 0 0 1 8.8 2.6Z" />
    </svg>
  );
}

// Only read the current date after user interaction.
// This avoids Next.js 16 hydration/prerender issues.
function getTodayForDateInput() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    today.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function BookingPage() {
  const { profile } = useBusinessProfile();

  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] =
    useState<BookingForm>(initialForm);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load real published designs from Supabase.
  useEffect(() => {
    let active = true;

    async function loadDesigns() {
      try {
        const supabase = createClient();

        const { data, error: loadError } =
          await supabase
            .from("designs")
            .select("id,title,category")
            .eq("status", "published")
            .order("title");

        if (!active) return;

        if (loadError) {
          setError("Unable to load designs.");
        } else {
          setDesigns((data ?? []) as Design[]);
        }
      } catch {
        if (active) {
          setError(
            "Unable to load designs. Please try again."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
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
      // Preserve the original booking API.
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
          result.error ||
            "Unable to submit booking."
        );
      }

      setSuccess(
        "Booking request submitted successfully! We will contact you after reviewing your request."
      );

      setForm(initialForm);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const bookingAvailable =
    profile.bookingAvailable;

  const selectedDesign = designs.find(
    (design) => design.id === form.design_id
  );

  return (
    <>
      <Navbar />

      <main className="min-h-screen overflow-x-clip bg-[#FCFAF8] text-[#3C2D3D]">

        {/* PAGE-SCOPED ANIMATIONS */}
        <style>{`
          @keyframes booking-fade-up {
            from {
              opacity: 0;
              transform: translateY(20px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .booking-hero-copy {
            animation: booking-fade-up 850ms ease both;
          }

          .booking-hero-photo {
            transition:
              transform 900ms ease,
              filter 900ms ease;
          }

          @media (hover: hover) {
            .booking-hero:hover .booking-hero-photo {
              transform: scale(1.06);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .booking-hero-copy {
              animation: none;
            }

            .booking-hero-photo {
              transition: none;
            }

            .booking-hero:hover .booking-hero-photo {
              transform: none;
            }
          }
        `}</style>

        {/* PREMIUM BOOKING HERO */}
        <section className="border-b border-[#ECE1E0] bg-[#F7F0ED]">

          <div className="mx-auto max-w-7xl px-5 pb-8 pt-8 sm:px-8 lg:px-12 lg:pb-12 lg:pt-12">

            <div className="booking-hero grid overflow-hidden rounded-[30px] border border-[#EADCDD] bg-[#F2E5E6] shadow-[0_16px_55px_rgba(65,43,59,0.07)] lg:grid-cols-[1.05fr_0.95fr]">

              {/* HERO TEXT */}
              <div className="booking-hero-copy relative flex flex-col justify-center px-7 py-12 sm:px-12 sm:py-16 lg:px-14">

                <div className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-[#E5C9D0]/30 blur-3xl" />

                <div className="relative z-10">

                  <div className="mb-6 flex items-center gap-3">
                    <span className="h-px w-10 bg-[#A77286]" />

                    <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A47084]">
                      YOUR SPECIAL MOMENT
                    </span>
                  </div>

                  <h1 className="font-serif text-[clamp(2.8rem,5vw,4.9rem)] leading-[1.07] tracking-[-0.055em] text-[#392B3B]">
                    Your occasion.
                    <br />

                    <span className="italic text-[#A56B81]">
                      Beautifully
                    </span>
                    <br />

                    remembered.
                  </h1>

                  <p className="mt-6 max-w-md text-sm leading-7 text-[#806F7C] sm:text-base sm:leading-8">
                    From beautiful bridal mehndi to
                    special celebrations, find a design
                    you love and request your perfect
                    henna appointment.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">

                    <a
                      href="#appointment-form"
                      className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#402E41] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_12px_25px_rgba(62,43,62,0.12)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#6E5068]"
                    >
                      Book your session

                      <span className="transition-transform group-hover:translate-x-1">
                        <ArrowIcon />
                      </span>
                    </a>

                    <Link
                      href="/designs"
                      className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-[#D8BEC9] bg-white/80 px-7 py-3.5 text-sm font-semibold text-[#5C4357] transition-all duration-300 hover:-translate-y-1 hover:bg-white"
                    >
                      Explore designs
                      <ArrowIcon />
                    </Link>
                  </div>

                  <div className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t border-[#DECDD1] pt-5 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#A18492] sm:text-[11px]">

                    <span>Mehndi artistry</span>
                    <span>✦</span>
                    <span>Special occasions</span>
                    <span>✦</span>
                    <span>Easy requests</span>

                  </div>
                </div>
              </div>

              {/* PREMIUM HERO PHOTOGRAPHY */}
              <div className="relative min-h-[300px] overflow-hidden bg-[#E7D0D1] sm:min-h-[390px] lg:min-h-[470px]">

                <Image
                  src="/henna-hero.jpg"
                  alt="Beautiful bridal henna artistry"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="booking-hero-photo object-cover object-center"
                />

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#2F2030]/60 via-transparent to-transparent" />

                <div className="absolute bottom-7 left-7 right-7 sm:bottom-9 sm:left-9 sm:right-9">

                  <p className="text-[10px] font-bold uppercase tracking-[0.23em] text-white/80">
                    THE BEAUTY OF HENNA
                  </p>

                  <h2 className="mt-2 max-w-xs font-serif text-2xl leading-tight text-white sm:text-3xl">
                    Art for moments
                    <br />
                    worth celebrating.
                  </h2>
                </div>

                <div
                  aria-hidden="true"
                  className="absolute right-7 top-7 flex h-12 w-12 items-center justify-center rounded-full border border-white/50 bg-white/15 text-white backdrop-blur-md"
                >
                  <HeartIcon />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BOOKING CONTENT */}
        <section
          id="appointment-form"
          className="scroll-mt-32 mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-24"
        >

          {/* SECTION HEADING */}
          <div className="mb-11">
            <p className="text-[11px] font-bold uppercase tracking-[0.23em] text-[#AC778A]">
              RESERVE YOUR MOMENT
            </p>

            <h2 className="mt-3 font-serif text-4xl tracking-[-0.045em] text-[#382B3B] sm:text-5xl">
              Let&apos;s create something{" "}
              <span className="italic text-[#A56F82]">
                beautiful.
              </span>
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#857581]">
              Complete the appointment form below.
              Your request will be reviewed before
              confirmation.
            </p>
          </div>

          <div className="grid items-start gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:gap-10">

            {/* MAIN BOOKING FORM */}
            <div className="min-w-0 overflow-hidden rounded-[30px] border border-[#EADFE0] bg-white shadow-[0_16px_55px_rgba(60,40,55,0.06)]">

              {/* FORM HEADER */}
              <div className="border-b border-[#F0E5E7] bg-[#FDF8F9] px-6 py-8 sm:px-9 sm:py-9">

                <div className="flex items-center gap-4">

                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#F1E2E8] text-[#A16B80]">
                    <CalendarIcon />
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.21em] text-[#AD7F90]">
                      APPOINTMENT REQUEST
                    </p>

                    <h3 className="mt-1 font-serif text-3xl text-[#3D2C3F]">
                      Booking Details
                    </h3>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-7 text-[#877781]">
                  Please provide accurate information
                  so our team can review your request.
                </p>
              </div>

              <div className="px-6 py-8 sm:px-9 sm:py-10">

                {/* SETTINGS-DRIVEN INFORMATION */}
                {profile.businessHours && (
                  <div className="mb-4 rounded-2xl border border-[#E7DBE0] bg-[#FCF7F9] px-5 py-4">

                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#A27688]">
                      Business Hours
                    </p>

                    <p className="mt-2 text-sm leading-7 text-[#584454]">
                      {profile.businessHours}
                    </p>
                  </div>
                )}

                {profile.bookingInstructions && (
                  <div className="mb-4 rounded-2xl border border-[#E7DBE0] bg-[#FCF7F9] px-5 py-4">

                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#A27688]">
                      Booking Instructions
                    </p>

                    <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#584454]">
                      {profile.bookingInstructions}
                    </p>
                  </div>
                )}

                {profile.bookingConfirmation && (
                  <p className="mb-6 rounded-2xl border border-[#E9D8DF] bg-[#F9F0F3] px-5 py-4 text-sm leading-7 text-[#79566A]">
                    {profile.bookingConfirmation}
                  </p>
                )}

                {!bookingAvailable && (
                  <div
                    role="status"
                    className="mb-6 rounded-2xl border border-[#E8D6C8] bg-[#FFF7ED] px-5 py-4"
                  >
                    <p className="text-sm font-semibold text-[#9A654C]">
                      Booking requests are temporarily unavailable.
                    </p>

                    <p className="mt-2 text-xs leading-6 text-[#A18471]">
                      Please contact the store for more information.
                    </p>
                  </div>
                )}

                {/* ERROR MESSAGE */}
                {error && (
                  <div
                    role="alert"
                    className="mb-6 rounded-2xl border border-[#F1CDD2] bg-[#FFF1F3] px-5 py-4 text-sm leading-7 text-[#A7475D]"
                  >
                    {error}
                  </div>
                )}

                {/* SUCCESS MESSAGE */}
                {success && (
                  <div
                    role="status"
                    className="mb-6 rounded-2xl border border-[#CFE3D5] bg-[#EFF9F2] px-5 py-4 text-sm leading-7 text-[#376A4C]"
                  >
                    {success}
                  </div>
                )}

                <form
                  onSubmit={handleSubmit}
                  className="space-y-7"
                >
                  {/* DESIGN SELECTION */}
                  <div>
                    <div className="mb-5 flex items-center gap-3">

                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3E8ED] text-xs font-bold text-[#9B6980]">
                        01
                      </span>

                      <div>
                        <h4 className="font-serif text-xl text-[#443244]">
                          Choose your design
                        </h4>

                        <p className="mt-1 text-xs text-[#9A8794]">
                          Select from our published gallery.
                        </p>
                      </div>
                    </div>

                    <label
                      htmlFor="design"
                      className={labelStyle}
                    >
                      Select Henna Design{" "}
                      <span className="text-[#AE6784]">*</span>
                    </label>

                    <select
                      id="design"
                      required
                      disabled={loading}
                      value={form.design_id}
                      onChange={(event) =>
                        updateField(
                          "design_id",
                          event.target.value
                        )
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

                    {selectedDesign && (
                      <div className="mt-3 rounded-xl border border-[#EBDDE1] bg-[#FCF7F9] px-4 py-3">

                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A57C8D]">
                          Your selected design
                        </p>

                        <p className="mt-1 text-sm font-semibold text-[#64465B]">
                          {selectedDesign.title}
                        </p>
                      </div>
                    )}

                    {!loading && designs.length === 0 && (
                      <p className="mt-3 text-xs leading-6 text-[#997E8A]">
                        No published designs are currently available.
                      </p>
                    )}
                  </div>

                  <div className="border-t border-[#F0E7E8]" />

                  {/* CUSTOMER INFORMATION */}
                  <div>
                    <div className="mb-5 flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3E8ED] text-xs font-bold text-[#9B6980]">
                        02
                      </span>

                      <div>
                        <h4 className="font-serif text-xl text-[#443244]">
                          Your information
                        </h4>

                        <p className="mt-1 text-xs text-[#9A8794]">
                          How can we reach you?
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">

                      {/* CUSTOMER NAME */}
                      <div>
                        <label
                          htmlFor="name"
                          className={labelStyle}
                        >
                          Full Name{" "}
                          <span className="text-[#AE6784]">*</span>
                        </label>

                        <input
                          id="name"
                          type="text"
                          required
                          minLength={2}
                          maxLength={120}
                          autoComplete="name"
                          placeholder="Enter your full name"
                          className={inputStyle}
                          value={form.customer_name}
                          onChange={(event) =>
                            updateField(
                              "customer_name",
                              event.target.value
                            )
                          }
                        />
                      </div>

                      {/* CUSTOMER PHONE */}
                      <div>
                        <label
                          htmlFor="phone"
                          className={labelStyle}
                        >
                          Phone Number{" "}
                          <span className="text-[#AE6784]">*</span>
                        </label>

                        <input
                          id="phone"
                          type="tel"
                          required
                          autoComplete="tel"
                          placeholder="01XXXXXXXXX"
                          className={inputStyle}
                          value={form.customer_phone}
                          onChange={(event) =>
                            updateField(
                              "customer_phone",
                              event.target.value
                            )
                          }
                        />
                      </div>

                    </div>
                  </div>

                  <div className="border-t border-[#F0E7E8]" />

                  {/* APPOINTMENT INFORMATION */}
                  <div>
                    <div className="mb-5 flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3E8ED] text-xs font-bold text-[#9B6980]">
                        03
                      </span>

                      <div>
                        <h4 className="font-serif text-xl text-[#443244]">
                          Appointment preferences
                        </h4>

                        <p className="mt-1 text-xs text-[#9A8794]">
                          Tell us when and where.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">

                      {/* PREFERRED DATE */}
                      <div>
                        <label
                          htmlFor="date"
                          className={labelStyle}
                        >
                          Preferred Date{" "}
                          <span className="text-[#AE6784]">*</span>
                        </label>

                        <input
                          id="date"
                          type="date"
                          required
                          onFocus={(event) => {
                            event.currentTarget.min =
                              getTodayForDateInput();
                          }}
                          className={inputStyle}
                          value={form.preferred_date}
                          onChange={(event) =>
                            updateField(
                              "preferred_date",
                              event.target.value
                            )
                          }
                        />
                      </div>

                      {/* PREFERRED TIME */}
                      <div>
                        <label
                          htmlFor="time"
                          className={labelStyle}
                        >
                          Preferred Time{" "}
                          <span className="text-[#AE6784]">*</span>
                        </label>

                        <input
                          id="time"
                          type="time"
                          required
                          className={inputStyle}
                          value={form.preferred_time}
                          onChange={(event) =>
                            updateField(
                              "preferred_time",
                              event.target.value
                            )
                          }
                        />
                      </div>

                    </div>

                    {/* SERVICE ADDRESS */}
                    <div className="mt-5">
                      <label
                        htmlFor="address"
                        className={labelStyle}
                      >
                        Service Address{" "}
                        <span className="text-[#AE6784]">*</span>
                      </label>

                      <textarea
                        id="address"
                        required
                        minLength={10}
                        maxLength={500}
                        rows={3}
                        placeholder="Enter your complete service address"
                        className={inputStyle}
                        value={form.service_address}
                        onChange={(event) =>
                          updateField(
                            "service_address",
                            event.target.value
                          )
                        }
                      />
                    </div>

                    {/* SPECIAL INSTRUCTIONS */}
                    <div className="mt-5">
                      <label
                        htmlFor="notes"
                        className={labelStyle}
                      >
                        Special Instructions
                        <span className="ml-2 text-xs font-normal text-[#A8949F]">
                          Optional
                        </span>
                      </label>

                      <textarea
                        id="notes"
                        rows={3}
                        maxLength={1000}
                        placeholder="Share any additional requests or details..."
                        className={inputStyle}
                        value={form.notes}
                        onChange={(event) =>
                          updateField(
                            "notes",
                            event.target.value
                          )
                        }
                      />
                    </div>
                  </div>

                  {/* ORIGINAL HONEYPOT SPAM PROTECTION */}
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
                      onChange={(event) =>
                        updateField(
                          "website",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  {/* SUBMIT */}
                  <div className="border-t border-[#F0E7E8] pt-7">

                    <button
                      type="submit"
                      disabled={
                        submitting ||
                        loading ||
                        designs.length === 0 ||
                        !bookingAvailable
                      }
                      className="group flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#402D41] px-6 py-4 text-sm font-bold text-white shadow-[0_13px_25px_rgba(58,39,57,0.13)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#704E69] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      {submitting
                        ? "Submitting Booking..."
                        : "Submit Booking Request"}

                      {!submitting && (
                        <span className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1">
                          <ArrowIcon />
                        </span>
                      )}
                    </button>

                    <p className="mt-5 text-center text-xs leading-6 text-[#95838E]">
                      Your appointment is not confirmed until
                      our team reviews your request.
                    </p>
                  </div>

                </form>
              </div>
            </div>

            {/* RIGHT BOOKING INFORMATION */}
            <aside className="space-y-6 lg:sticky lg:top-32">

              {/* EXPLANATION CARD */}
              <div className="relative overflow-hidden rounded-[28px] bg-[#3D2D40] p-7 text-white shadow-[0_18px_45px_rgba(57,39,57,0.12)] sm:p-9">

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full border-[45px] border-white/[0.06]"
                />

                <div className="relative">

                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-[#E8D2DC]">
                    <HeartIcon />
                  </span>

                  <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.21em] text-[#D8AFBF]">
                    THE BOOKING EXPERIENCE
                  </p>

                  <h3 className="mt-4 font-serif text-3xl leading-tight">
                    Made for
                    <br />
                    your special day.
                  </h3>

                  <p className="mt-5 text-sm leading-7 text-[#D6C7D2]">
                    Select your design, share your details
                    and send an appointment request.
                    Our team will review the information
                    before confirming.
                  </p>

                  <div className="mt-8 space-y-4 border-t border-white/15 pt-6">

                    <div className="flex items-center gap-3 text-sm text-[#E6D8E0]">
                      <span className="text-[#E9C1CF]">✦</span>
                      Choose your design
                    </div>

                    <div className="flex items-center gap-3 text-sm text-[#E6D8E0]">
                      <span className="text-[#E9C1CF]">✦</span>
                      Share date and location
                    </div>

                    <div className="flex items-center gap-3 text-sm text-[#E6D8E0]">
                      <span className="text-[#E9C1CF]">✦</span>
                      Await booking confirmation
                    </div>

                  </div>
                </div>
              </div>

              {/* CUSTOMER CONTACT CARD */}
              <div className="rounded-[27px] border border-[#E7DCDD] bg-white p-7 shadow-[0_10px_30px_rgba(60,40,55,0.04)] sm:p-8">

                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#A97789]">
                  NEED ASSISTANCE?
                </p>

                <h3 className="mt-3 font-serif text-2xl text-[#3D2D40]">
                  We&apos;re here to help.
                </h3>

                <p className="mt-3 text-sm leading-7 text-[#877681]">
                  Questions about your mehndi appointment?
                  Contact the store directly.
                </p>

                <a
                  href="tel:+8801306654666"
                  className="mt-5 block text-xl font-bold text-[#68485D] transition hover:text-[#A46A81]"
                >
                  01306654666
                </a>

                <a
                  href="https://wa.me/8801306654666"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group mt-5 inline-flex w-full items-center justify-center gap-3 rounded-xl border border-[#DBC7D0] bg-[#FBF5F7] px-5 py-3.5 text-sm font-semibold text-[#62465B] transition-all duration-300 hover:-translate-y-1 hover:bg-[#F4E8EE] hover:shadow-md"
                >
                  Contact With Us
                  <ArrowIcon />
                </a>
              </div>

              {/* GALLERY SHORTCUT */}
              <Link
                href="/designs"
                className="group flex items-center justify-between gap-4 rounded-[24px] border border-[#E6D9DE] bg-[#F5ECEF] px-6 py-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#D3B5C2] hover:shadow-md"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#A97789]">
                    FIND INSPIRATION
                  </p>

                  <p className="mt-2 font-serif text-xl text-[#583F52]">
                    Explore Mehndi Designs
                  </p>
                </div>

                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#6C4C64] transition-transform duration-300 group-hover:rotate-45">
                  <ArrowIcon />
                </span>
              </Link>

            </aside>
          </div>
        </section>

      </main>

      <BusinessFooter />
    </>
  );
}
