import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@supabase/supabase-js";

import Navbar from "@/components/Navbar";
import BusinessFooter from "@/components/BusinessFooter";

export const metadata: Metadata = {
  title: "Mehndi Designs",
  description:
    "Explore beautiful bridal, Arabic, traditional and modern mehndi designs at Mehedi By Meherin. Discover designs and request your appointment.",
};

type Design = {
  id: string;
  title: string;
  category: string;
  description: string;
  starting_price: number | null;
  image_url: string | null;
};

function ArrowIcon({
  diagonal = false,
}: {
  diagonal?: boolean;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
    >
      {diagonal ? (
        <path d="M5 19 19 5M8 5h11v11" />
      ) : (
        <path d="M4 12h16m-6-6 6 6-6 6" />
      )}
    </svg>
  );
}

function FlowerIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <path d="M12 12C7 8 7 4 12 3c5 1 5 5 0 9Z" />
      <path d="M12 12c-6-1-9 1-8 6 4 3 7 1 8-6Z" />
      <path d="M12 12c1 6 4 9 8 6 1-5-2-7-8-6Z" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function formatPrice(value: number | null) {
  if (
    value === null ||
    !Number.isFinite(Number(value))
  ) {
    return "Price on Request";
  }

  return `৳${Number(value).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* -----------------------------------------
   PREMIUM DESIGN CARD
------------------------------------------ */

function DesignCard({
  design,
  index,
}: {
  design: Design;
  index: number;
}) {
  const accents = [
    {
      badge: "bg-[#F8EBEF] text-[#955D73]",
      icon: "bg-[#F3E2E9] text-[#A36880]",
    },
    {
      badge: "bg-[#F4EEE3] text-[#9B7962]",
      icon: "bg-[#F1E4CF] text-[#99754F]",
    },
    {
      badge: "bg-[#ECE9F5] text-[#74618C]",
      icon: "bg-[#E6DDF2] text-[#806596]",
    },
  ];

  const accent = accents[index % accents.length];

  return (
    <article className="design-card group flex min-w-0 flex-col overflow-hidden rounded-[27px] border border-[#EBE0DF] bg-white shadow-[0_9px_32px_rgba(65,44,59,0.045)] transition-all duration-500 hover:-translate-y-2 hover:border-[#D8B8C6] hover:shadow-[0_28px_65px_rgba(66,40,60,0.16)]">

      {/* DESIGN IMAGE */}
      <div className="relative aspect-[4/5] overflow-hidden bg-[#F1E6E4]">

        {design.image_url ? (
          <Image
            src={design.image_url}
            alt={design.title}
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="design-photo object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]"
          />
        ) : (
          <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#F7EDEE] via-[#EEDDE2] to-[#E6D3D9]">

            <div
              aria-hidden="true"
              className="absolute h-64 w-64 rounded-full border-[30px] border-white/35"
            />

            <div
              aria-hidden="true"
              className="absolute h-40 w-40 rounded-full border border-[#CDAAB6]"
            />

            <span className="relative font-serif text-8xl text-[#AB788B] transition-transform duration-700 group-hover:rotate-12 group-hover:scale-110">
              ✿
            </span>

            <p className="relative mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9F7D8B]">
              Artwork Coming Soon
            </p>
          </div>
        )}

        {/* PHOTO GRADIENT */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#291A29]/45 via-transparent to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-90" />

        {/* REAL CATEGORY LABEL */}
        <span
          className={`absolute left-4 top-4 max-w-[80%] rounded-full border border-white/75 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.13em] shadow-sm backdrop-blur-md ${accent.badge}`}
        >
          {design.category || "Mehndi Design"}
        </span>

        {/* HOVER DETAIL */}
        <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3 text-white">

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">
              THE DESIGN EDIT
            </p>

            <p className="mt-1 font-serif text-xl leading-tight sm:text-2xl">
              {design.title}
            </p>
          </div>

          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/55 bg-white/15 backdrop-blur-md transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-white group-hover:text-[#4C3047]">
            <ArrowIcon diagonal />
          </span>

        </div>
      </div>

      {/* DESIGN DETAILS */}
      <div className="flex flex-1 flex-col p-6">

        <div className="flex items-center gap-2">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-xl ${accent.icon}`}
          >
            <FlowerIcon />
          </span>

          <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-[#A87B8D]">
            MEHNDI ARTISTRY
          </p>
        </div>

        <h2 className="mt-4 font-serif text-[26px] leading-tight tracking-[-0.025em] text-[#3D2D3C] transition-colors duration-300 group-hover:text-[#9C627A]">
          {design.title}
        </h2>

        {design.description ? (
          <p className="mt-3 line-clamp-3 text-sm leading-7 text-[#847581]">
            {design.description}
          </p>
        ) : (
          <p className="mt-3 text-sm leading-7 text-[#847581]">
            Discover the details of this beautiful mehndi
            design.
          </p>
        )}

        {/* STARTING PRICE */}
        <div className="mt-auto pt-6">

          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-[#F0E8E8] pt-5">

            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.13em] text-[#A18E9A]">
                {design.starting_price !== null
                  ? "Starting From"
                  : "Design Pricing"}
              </p>

              <p className="mt-2 font-serif text-[25px] font-semibold leading-tight text-[#9D657A]">
                {formatPrice(design.starting_price)}
              </p>
            </div>

            <span className="rounded-full bg-[#F7F0F3] px-3 py-1.5 text-[10px] font-semibold text-[#987587]">
              Appointment
            </span>
          </div>

          {/* ORIGINAL BOOKING NAVIGATION */}
          <Link
            href="/booking"
            className="group/book mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-[#402D40] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(62,43,62,0.09)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#704E69] hover:shadow-lg"
          >
            Request Booking

            <span className="transition-transform duration-300 group-hover/book:translate-x-1 group-hover/book:-translate-y-1">
              <ArrowIcon diagonal />
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}

/* -----------------------------------------
   LOADING SKELETON
------------------------------------------ */

function DesignLoadingSkeleton() {
  return (
    <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">

      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="overflow-hidden rounded-[27px] border border-[#EBE0DF] bg-white"
        >
          <div className="aspect-[4/5] animate-pulse bg-[#EDE0E3]" />

          <div className="space-y-4 p-6">
            <div className="h-5 w-24 animate-pulse rounded-full bg-[#F0E6E8]" />

            <div className="h-7 w-3/4 animate-pulse rounded-full bg-[#F0E6E8]" />

            <div className="h-4 w-full animate-pulse rounded-full bg-[#F0E6E8]" />

            <div className="h-4 w-2/3 animate-pulse rounded-full bg-[#F0E6E8]" />

            <div className="mt-6 h-12 w-full animate-pulse rounded-full bg-[#F0E6E8]" />
          </div>
        </div>
      ))}

    </div>
  );
}

/* -----------------------------------------
   REAL SUPABASE DESIGNS
------------------------------------------ */

async function DesignList() {
  // Preserve Next.js 16 dynamic rendering behavior.
  await connection();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return (
      <div
        role="alert"
        className="rounded-3xl border border-[#E9C9CF] bg-[#FFF1F4] px-6 py-12 text-center"
      >
        <h2 className="font-serif text-2xl text-[#8F4D62]">
          Gallery Temporarily Unavailable
        </h2>

        <p className="mt-3 text-sm text-[#9C6B7C]">
          The gallery configuration could not be loaded.
        </p>
      </div>
    );
  }

  const supabase = createClient(url, key);

  // Customers see only published designs.
  const { data, error } = await supabase
    .from("designs")
    .select(
      "id, title, category, description, starting_price, image_url"
    )
    .eq("status", "published")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Design loading error:",
      error.message
    );

    return (
      <div
        role="alert"
        className="rounded-3xl border border-[#E9C9CF] bg-[#FFF1F4] px-6 py-14 text-center"
      >
        <h2 className="font-serif text-3xl text-[#774457]">
          Unable to Load Designs
        </h2>

        <p className="mt-3 text-sm text-[#9B7181]">
          Please refresh the page or try again later.
        </p>
      </div>
    );
  }

  const designs = (data ?? []) as Design[];

  /* EMPTY STATE — important for client handover */
  if (designs.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-[30px] border border-[#EADFE1] bg-white px-6 py-16 text-center shadow-sm sm:px-12 sm:py-20">

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full border-[45px] border-[#F5EDEF]"
        />

        <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#F7ECF0] text-[#A87388]">
          <FlowerIcon />
        </div>

        <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.23em] text-[#B48695]">
          THE DESIGN GALLERY
        </p>

        <h2 className="mt-3 font-serif text-3xl text-[#392B3B] sm:text-4xl">
          New inspiration is on its way.
        </h2>

        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#897983]">
          Our mehndi gallery is being prepared.
          New designs will appear here when published.
        </p>

        <Link
          href="/booking"
          className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#402D40] px-7 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-1 hover:bg-[#704E69]"
        >
          Visit Booking Page
          <ArrowIcon diagonal />
        </Link>
      </div>
    );
  }

  // Category names come from real published design data.
  const categories = Array.from(
    new Set(
      designs
        .map((design) => design.category?.trim())
        .filter((category): category is string => Boolean(category))
    )
  );

  return (
    <>
      {/* GALLERY HEADER / TOOLBAR */}
      <div className="mb-9 flex flex-wrap items-end justify-between gap-5 border-b border-[#E8DFDE] pb-7">

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.23em] text-[#A97789]">
            PUBLISHED ARTWORK
          </p>

          <p className="mt-2 text-sm text-[#867583]">
            Explore{" "}
            <span className="font-bold text-[#473447]">
              {designs.length}
            </span>{" "}
            available{" "}
            {designs.length === 1 ? "design" : "designs"}
          </p>
        </div>

        <Link
          href="/booking"
          className="group inline-flex min-h-12 items-center gap-3 rounded-full border border-[#DEC9D1] bg-white px-6 py-3 text-sm font-semibold text-[#553B50] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#BA93A2] hover:bg-[#FCF5F7] hover:shadow-md"
        >
          Request an appointment

          <span className="transition-transform group-hover:translate-x-1">
            <ArrowIcon diagonal />
          </span>
        </Link>
      </div>

      {/* REAL CATEGORIES — INFORMATIONAL LABELS */}
      {categories.length > 0 && (
        <div className="mb-9 flex flex-wrap items-center gap-2.5">
          <span className="mr-1 text-xs font-semibold text-[#8F7B87]">
            Explore:
          </span>

          {categories.map((category) => (
            <span
              key={category}
              className="rounded-full border border-[#E7D9DE] bg-[#F8F0F3] px-4 py-2 text-xs font-semibold text-[#926A7D]"
            >
              {category}
            </span>
          ))}
        </div>
      )}

      {/* DESIGN GALLERY */}
      <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">

        {designs.map((design, index) => (
          <DesignCard
            key={design.id}
            design={design}
            index={index}
          />
        ))}

      </div>

      {/* BOTTOM CTA */}
      <div className="relative mt-16 flex flex-col items-start justify-between gap-6 overflow-hidden rounded-[28px] bg-[#3D2D40] p-8 text-white sm:p-10 lg:flex-row lg:items-center lg:p-12">

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border-[45px] border-white/[0.05]"
        />

        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#DBB6C6]">
            SOMETHING SPECIAL
          </p>

          <h2 className="mt-3 font-serif text-3xl tracking-tight sm:text-4xl">
            Found your inspiration?
          </h2>

          <p className="mt-3 max-w-lg text-sm leading-7 text-[#D5C6D4]">
            Take the next step and request a mehndi
            appointment for your special occasion.
          </p>
        </div>

        <Link
          href="/booking"
          className="group relative inline-flex shrink-0 items-center gap-3 rounded-full bg-[#F0DEE5] px-7 py-3.5 text-sm font-bold text-[#422F42] transition-all duration-300 hover:-translate-y-1 hover:bg-white"
        >
          Book an Appointment

          <span className="transition-transform group-hover:translate-x-1">
            <ArrowIcon diagonal />
          </span>
        </Link>
      </div>
    </>
  );
}

/* -----------------------------------------
   PREMIUM DESIGNS PAGE
------------------------------------------ */

export default function DesignsPage() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen overflow-x-clip bg-[#FCFAF8] text-[#3B2C3D]">

        {/* LOCAL PAGE ANIMATIONS */}
        <style>{`
          @keyframes design-fade-up {
            from {
              opacity: 0;
              transform: translateY(20px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .design-hero-copy {
            animation: design-fade-up 850ms ease both;
          }

          .design-hero-photo {
            transition: transform 900ms ease;
          }

          @media (hover: hover) {
            .design-hero:hover .design-hero-photo {
              transform: scale(1.06);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .design-hero-copy {
              animation: none;
            }

            .design-hero-photo,
            .design-card,
            .design-photo {
              transition: none !important;
            }

            .design-hero:hover .design-hero-photo {
              transform: none;
            }
          }
        `}</style>

        {/* EDITORIAL DESIGNS HERO */}
        <section className="border-b border-[#EDE2E0] bg-[#F6F0EC]">

          <div className="mx-auto max-w-7xl px-5 pb-8 pt-8 sm:px-8 lg:px-12 lg:pb-12 lg:pt-12">

            <div className="design-hero grid overflow-hidden rounded-[30px] border border-[#EADDDD] bg-[#EEE1E3] shadow-[0_16px_55px_rgba(65,43,59,0.075)] lg:grid-cols-[1.05fr_0.95fr]">

              {/* LEFT — HERO CONTENT */}
              <div className="design-hero-copy relative flex flex-col justify-center px-7 py-12 sm:px-12 sm:py-16 lg:px-14">

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#E4C8D5]/30 blur-3xl"
                />

                <div className="relative z-10">

                  <div className="mb-6 flex items-center gap-3">
                    <span className="h-px w-10 bg-[#AA788A]" />

                    <span className="text-[11px] font-bold uppercase tracking-[0.21em] text-[#A47185]">
                      THE MEHNDI GALLERY
                    </span>
                  </div>

                  <h1 className="font-serif text-[clamp(2.8rem,5vw,4.9rem)] leading-[1.05] tracking-[-0.055em] text-[#3C2B3D]">
                    Art that tells
                    <br />

                    <span className="italic text-[#A76F83]">
                      your story.
                    </span>
                  </h1>

                  <p className="mt-6 max-w-md text-sm leading-7 text-[#806D7C] sm:text-base sm:leading-8">
                    Every design holds a little beauty.
                    Explore our mehndi creations and find
                    inspiration for the moments you love.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">

                    <a
                      href="#design-gallery"
                      className="group inline-flex min-h-12 items-center gap-3 rounded-full bg-[#412E42] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_12px_25px_rgba(62,43,62,0.12)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#6B4C65]"
                    >
                      Explore the gallery

                      <span className="transition-transform group-hover:translate-x-1">
                        <ArrowIcon />
                      </span>
                    </a>

                    <Link
                      href="/booking"
                      className="group inline-flex min-h-12 items-center gap-3 rounded-full border border-[#D8BEC9] bg-white/75 px-7 py-3.5 text-sm font-semibold text-[#5B4357] transition-all duration-300 hover:-translate-y-1 hover:bg-white"
                    >
                      Book a session

                      <ArrowIcon diagonal />
                    </Link>

                  </div>

                  <div className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t border-[#DCCAD1] pt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A08491] sm:text-[11px]">
                    <span>Henna artistry</span>
                    <span>✦</span>
                    <span>Design inspiration</span>
                    <span>✦</span>
                    <span>Special occasions</span>
                  </div>
                </div>
              </div>

              {/* RIGHT — MEHNDI PHOTOGRAPHY */}
              <div className="relative min-h-[310px] overflow-hidden bg-[#DEBFC5] sm:min-h-[400px] lg:min-h-[465px]">

                <Image
                  src="/hero-slides/henna-2.jpg"
                  alt="Traditional mehndi artistry and beautiful henna design"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="design-hero-photo object-cover object-center"
                />

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#302030]/55 via-transparent to-transparent" />

                {/* BOTTOM PHOTO LABEL */}
                <div className="absolute bottom-7 left-7 right-7 sm:bottom-9 sm:left-9 sm:right-9">

                  <p className="text-[10px] font-bold uppercase tracking-[0.23em] text-white/80">
                    THE ART OF HENNA
                  </p>

                  <h2 className="mt-2 max-w-xs font-serif text-2xl leading-tight text-white sm:text-3xl">
                    Every detail,
                    <br />
                    a little masterpiece.
                  </h2>
                </div>

                {/* FLOATING DECORATIVE DETAIL */}
                <span
                  aria-hidden="true"
                  className="absolute right-7 top-7 flex h-12 w-12 items-center justify-center rounded-full border border-white/50 bg-white/15 text-2xl text-white backdrop-blur-md"
                >
                  ✿
                </span>

              </div>
            </div>
          </div>
        </section>

        {/* DESIGN GALLERY */}
        <section
          id="design-gallery"
          className="scroll-mt-32 mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-20"
        >

          {/* SECTION HEADING */}
          <div className="mb-11">

            <p className="text-[11px] font-bold uppercase tracking-[0.23em] text-[#AF7B8D]">
              CURATED INSPIRATION
            </p>

            <h2 className="mt-3 font-serif text-4xl tracking-[-0.045em] text-[#3B2C3D] sm:text-5xl">
              Discover your{" "}
              <span className="italic text-[#A66C82]">
                favorite design.
              </span>
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-7 text-[#877782]">
              Browse our published mehndi collection.
              Each design is displayed with its available
              details and starting price when provided.
            </p>
          </div>

          {/* ORIGINAL SUPABASE SERVER LOGIC */}
          <Suspense fallback={<DesignLoadingSkeleton />}>
            <DesignList />
          </Suspense>

        </section>

      </main>

      <BusinessFooter />
    </>
  );
}
