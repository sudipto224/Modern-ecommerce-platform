import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import { Suspense } from "react";

type Design = {
  id: string;
  title: string;
  category: string;
  description: string;
  starting_price: number | null;
  image_url: string | null;
};

// Get real published designs from Supabase
async function DesignList() {
  await connection();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return (
      <p className="text-center text-red-700">
        Supabase configuration is missing.
      </p>
    );
  }

  const supabase = createClient(url, key);

  const { data, error } = await supabase
    .from("designs")
    .select(
      "id, title, category, description, starting_price, image_url"
    )
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Design loading error:", error.message);

    return (
      <div className="rounded-xl bg-red-50 p-6 text-center text-red-700">
        Unable to load designs. Please try again.
      </div>
    );
  }

  const designs = (data ?? []) as Design[];

  if (designs.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-12 text-center">
        <h2 className="font-serif text-2xl">
          No Designs Available
        </h2>

        <p className="mt-3 text-[#80685b]">
          New mehndi designs will appear here soon.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="mb-8 text-sm text-[#80685b]">
        Showing {designs.length} beautiful design(s)
      </p>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {designs.map((design) => (
          <article
            key={design.id}
            className="group overflow-hidden rounded-2xl border border-[#eaded5] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            {/* DESIGN IMAGE */}
            <div className="relative aspect-[4/5] overflow-hidden bg-[#f2e2d7]">
              {design.image_url ? (
                <Image
                  src={design.image_url}
                  alt={design.title}
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <span className="text-7xl text-[#b77b5b]">
                    ✿
                  </span>

                  <p className="mt-4 text-xs uppercase tracking-widest text-[#80685b]">
                    Design Image Coming Soon
                  </p>
                </div>
              )}
            </div>

            {/* DESIGN DETAILS */}
            <div className="p-6">
              <p className="mb-3 text-xs uppercase tracking-widest text-[#b77b5b]">
                {design.category}
              </p>

              <h2 className="font-serif text-2xl font-medium">
                {design.title}
              </h2>

              <p className="mt-3 line-clamp-3 text-sm leading-7 text-[#80685b]">
                {design.description}
              </p>

              <div className="mt-5">
                <p className="text-xs text-[#80685b]">
                  Starting From
                </p>

                <p className="mt-1 text-xl font-semibold text-[#b77b5b]">
                  {design.starting_price !== null
                    ? `৳${Number(
                        design.starting_price
                      ).toFixed(2)}`
                    : "Price on Request"}
                </p>
              </div>

              <Link
                href="/booking"
                className="mt-6 inline-flex rounded-full bg-[#693f31] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#875441]"
              >
                Request Booking →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

export default function DesignsPage() {
  return (
    <main className="min-h-screen bg-[#fffaf6] text-[#44271f]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-16">
        {/* PAGE HEADING */}
        <div className="mb-12 text-center">
          <p className="mb-4 text-sm uppercase tracking-[0.25em] text-[#b77b5b]">
            The Art of Henna
          </p>

          <h1 className="font-serif text-4xl md:text-6xl">
            Our Mehndi Designs
          </h1>

          <p className="mx-auto mt-5 max-w-xl leading-7 text-[#80685b]">
            Discover beautiful bridal, Arabic,
            traditional and modern mehndi designs.
          </p>
        </div>

        {/* SUPABASE DESIGNS */}
        <Suspense
          fallback={
            <p className="py-12 text-center text-[#80685b]">
              Loading designs...
            </p>
          }
        >
          <DesignList />
        </Suspense>
      </section>
    </main>
  );
}
