import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@supabase/supabase-js";

import Navbar from "@/components/Navbar";
import BusinessFooter from "@/components/BusinessFooter";
import AddToCartButton from "@/components/cart/AddToCartButton";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Explore the henna product collection at Mehedi By Meherin. Discover beautiful essentials for your special moments.",
};

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
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

function ShoppingBagIcon() {
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
      <path d="M4 8h16l-1.2 12H5.2L4 8Z" />
      <path d="M9 9V6a3 3 0 0 1 6 0v3" />
    </svg>
  );
}

function formatPrice(value: number) {
  return `৳${Number(value).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* -------------------------------------------
   PREMIUM PRODUCT CARD
-------------------------------------------- */

function ProductCard({
  product,
}: {
  product: Product;
}) {
  const price = Number(product.price);
  const stock = Number(product.stock);
  const available = stock > 0;

  return (
    <article className="shop-product-card group relative flex min-w-0 flex-col overflow-hidden rounded-[26px] border border-[#ECE2DF] bg-white shadow-[0_8px_30px_rgba(61,42,56,0.035)] transition-all duration-500 hover:-translate-y-2 hover:border-[#D9BCC7] hover:shadow-[0_25px_60px_rgba(61,42,56,0.15)]">

      {/* PRODUCT PHOTO */}
      <div className="relative aspect-[4/4.5] overflow-hidden bg-[#F3EAE6] sm:aspect-[4/4.25]">

        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="shop-product-photo object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
          />
        ) : (
          <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#F7EFF0] via-[#EEE0E2] to-[#E6D5D9]">

            <div
              aria-hidden="true"
              className="absolute h-52 w-52 rounded-full border-[20px] border-white/40"
            />

            <div
              aria-hidden="true"
              className="absolute h-32 w-32 rounded-full border border-[#CBA9B5]"
            />

            <span
              aria-hidden="true"
              className="relative font-serif text-7xl text-[#A87589] transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110"
            >
              ✿
            </span>

            <p className="relative mt-5 text-xs font-semibold uppercase tracking-[0.15em] text-[#9F7E8B]">
              Image coming soon
            </p>
          </div>
        )}

        {/* SUBTLE PHOTO OVERLAY */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#382738]/15 via-transparent to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-30" />

        {/* STOCK BADGE */}
        <div className="absolute left-4 top-4 z-10">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[10px] font-bold tracking-[0.06em] shadow-sm backdrop-blur-md ${
              available
                ? "border-white/80 bg-white/90 text-[#6D4D61]"
                : "border-[#E8D9DC] bg-[#F7F1F2]/95 text-[#9A5362]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                available
                  ? "bg-[#7D9B73]"
                  : "bg-[#B36B79]"
              }`}
            />

            {available ? "AVAILABLE" : "SOLD OUT"}
          </span>
        </div>

        {/* CATEGORY LABEL ON IMAGE */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">

          <span className="max-w-[75%] truncate rounded-full border border-white/50 bg-white/90 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#795668] backdrop-blur-md">
            {product.category || "Henna collection"}
          </span>

          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 text-[#5B3C52] shadow-md transition-all duration-300 group-hover:rotate-45 group-hover:bg-[#443044] group-hover:text-white">
            <ArrowIcon diagonal />
          </span>
        </div>
      </div>

      {/* PRODUCT INFORMATION */}
      <div className="flex flex-1 flex-col p-5 sm:p-6">

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-[#B08492]">
            THE HENNA EDIT
          </p>

          <h2 className="mt-3 min-h-[56px] font-serif text-[24px] leading-[1.2] tracking-[-0.025em] text-[#392B3B] transition-colors duration-300 group-hover:text-[#985E78]">
            {product.name}
          </h2>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#F1EAE7] pb-5">

            <p className="font-serif text-[27px] font-semibold tracking-tight text-[#8E5A71]">
              {formatPrice(price)}
            </p>

            <span
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                available
                  ? "bg-[#EDF4EA] text-[#57784E]"
                  : "bg-[#F8E9EC] text-[#A25E6E]"
              }`}
            >
              {available
                ? `${stock} in stock`
                : "Out of stock"}
            </span>

          </div>
        </div>

        {/* CART ACTIONS */}
        <div className="mt-auto pt-5">

          {/* Keep original AddToCartButton logic */}
          <div className="w-full">
            <AddToCartButton
              product={{
                id: product.id,
                name: product.name,
                category: product.category,
                price,
                stock,
                image_url: product.image_url,
              }}
            />
          </div>

          <Link
            href="/cart"
            className="group/cart mt-4 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#866C7C] transition-colors duration-300 hover:bg-[#F8F1F4] hover:text-[#513649]"
          >
            View shopping cart

            <span className="transition-transform duration-300 group-hover/cart:translate-x-1">
              <ArrowIcon />
            </span>
          </Link>
        </div>
      </div>

    </article>
  );
}

/* -------------------------------------------
   PREMIUM LOADING SKELETON
-------------------------------------------- */

function ProductLoadingSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="overflow-hidden rounded-[26px] border border-[#ECE2DF] bg-white"
        >
          <div className="aspect-[4/4.25] animate-pulse bg-[#EDE3E2]" />

          <div className="space-y-4 p-6">
            <div className="h-3 w-24 animate-pulse rounded-full bg-[#EFE5E6]" />

            <div className="h-7 w-3/4 animate-pulse rounded-full bg-[#EFE5E6]" />

            <div className="h-6 w-1/3 animate-pulse rounded-full bg-[#EFE5E6]" />

            <div className="mt-7 h-12 w-full animate-pulse rounded-xl bg-[#EFE5E6]" />
          </div>
        </div>
      ))}

    </div>
  );
}

/* -------------------------------------------
   SERVER PRODUCT FETCH
-------------------------------------------- */

async function ProductList() {
  // Preserve Next.js 16 dynamic connection behavior.
  await connection();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return (
      <div
        role="alert"
        className="rounded-3xl border border-[#E7C7CD] bg-[#FFF1F3] px-6 py-12 text-center text-[#985164]"
      >
        <h2 className="font-serif text-2xl">
          Shop is temporarily unavailable
        </h2>

        <p className="mt-3 text-sm">
          The store configuration could not be loaded.
        </p>
      </div>
    );
  }

  const supabase = createClient(url, key);

  // Only published products are shown to customers.
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, category, price, stock, image_url"
    )
    .eq("status", "published")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Shop product loading error:",
      error.message
    );

    return (
      <div
        role="alert"
        className="rounded-3xl border border-[#E7C7CD] bg-[#FFF1F3] px-6 py-14 text-center"
      >
        <span className="font-serif text-4xl text-[#B58391]">
          ✿
        </span>

        <h2 className="mt-4 font-serif text-3xl text-[#503445]">
          Unable to load products
        </h2>

        <p className="mt-3 text-sm text-[#896F7D]">
          Please refresh the page or try again later.
        </p>
      </div>
    );
  }

  const products = (data ?? []) as Product[];

  // Empty state is important for a new client website.
  if (products.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-[30px] border border-[#EADFE0] bg-white px-6 py-16 text-center shadow-sm sm:px-12 sm:py-20">

        <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full border-[45px] border-[#F5EDEF]" />

        <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#F6EBEE]">
          <span className="font-serif text-5xl text-[#A76D82]">
            ✿
          </span>
        </div>

        <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.23em] text-[#B48695]">
          THE COLLECTION
        </p>

        <h2 className="mt-3 font-serif text-3xl tracking-tight text-[#392B3B] sm:text-4xl">
          Something beautiful is coming.
        </h2>

        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#897983]">
          Our product collection is currently being prepared.
          New products will appear here once available.
        </p>

        <Link
          href="/designs"
          className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#392B3B] px-7 py-3.5 text-sm font-semibold text-white transition duration-300 hover:-translate-y-1 hover:bg-[#64485D]"
        >
          Explore mehndi designs
          <ArrowIcon diagonal />
        </Link>

      </div>
    );
  }

  return (
    <>
      {/* SHOP TOOLBAR */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-5 border-b border-[#E9E0DE] pb-6">

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B38897]">
            AVAILABLE COLLECTION
          </p>

          <p className="mt-2 text-sm text-[#756773]">
            Showing{" "}
            <span className="font-bold text-[#463344]">
              {products.length}
            </span>{" "}
            published{" "}
            {products.length === 1 ? "product" : "products"}
          </p>
        </div>

        <Link
          href="/cart"
          className="group inline-flex min-h-12 items-center gap-3 rounded-full border border-[#E0CDD3] bg-white px-6 py-3 text-sm font-semibold text-[#493548] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#B78B9B] hover:bg-[#FAF2F5] hover:shadow-md"
        >
          <ShoppingBagIcon />

          View shopping cart

          <span className="transition-transform group-hover:translate-x-1">
            <ArrowIcon />
          </span>
        </Link>
      </div>

      {/* RESPONSIVE PRODUCT GRID */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">

        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
          />
        ))}

      </div>

      {/* BOTTOM COLLECTION MESSAGE */}
      <div className="mt-14 flex flex-col items-center justify-between gap-5 rounded-[24px] border border-[#E8DBDC] bg-[#F7F0EE] px-7 py-8 text-center sm:flex-row sm:text-left">

        <div>
          <p className="font-serif text-2xl text-[#473344]">
            Looking for something special?
          </p>

          <p className="mt-2 text-sm leading-6 text-[#877783]">
            Explore our mehndi designs or request an appointment.
          </p>
        </div>

        <Link
          href="/booking"
          className="group inline-flex shrink-0 items-center gap-3 rounded-full bg-[#443044] px-6 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-1 hover:bg-[#75546A]"
        >
          Book a session

          <span className="transition-transform group-hover:translate-x-1">
            <ArrowIcon diagonal />
          </span>
        </Link>

      </div>
    </>
  );
}

/* -------------------------------------------
   PREMIUM SHOP PAGE
-------------------------------------------- */

export default function ShopPage() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen overflow-x-clip bg-[#FCFAF8] text-[#392B3B]">

        <style>{`
          @keyframes shop-fade-up {
            from {
              opacity: 0;
              transform: translateY(18px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .shop-hero-content {
            animation: shop-fade-up 850ms ease both;
          }

          .shop-hero-photo {
            transition: transform 1100ms ease;
          }

          .shop-hero:hover .shop-hero-photo {
            transform: scale(1.065);
          }

          @media (prefers-reduced-motion: reduce) {
            .shop-hero-content {
              animation: none;
            }

            .shop-hero-photo,
            .shop-product-card,
            .shop-product-photo {
              transition: none !important;
            }

            .shop-hero:hover .shop-hero-photo {
              transform: none;
            }
          }
        `}</style>

        {/* SHOP EDITORIAL HERO */}
        <section className="border-b border-[#EDE2E0] bg-[#F6F0EC]">

          <div className="mx-auto max-w-7xl px-5 pb-8 pt-8 sm:px-8 lg:px-12 lg:pb-12 lg:pt-12">

            <div className="shop-hero grid overflow-hidden rounded-[30px] border border-[#EADDDC] bg-[#F3E7E5] shadow-[0_15px_50px_rgba(70,48,60,0.06)] lg:grid-cols-[1.05fr_0.95fr]">

              {/* LEFT — CONTENT */}
              <div className="shop-hero-content relative flex flex-col justify-center px-7 py-12 sm:px-12 sm:py-16 lg:px-14 lg:py-16">

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#E7CBD2]/30 blur-3xl"
                />

                <div className="relative z-10">

                  <div className="mb-6 flex items-center gap-3">
                    <span className="h-px w-10 bg-[#A76F83]" />

                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A36C7F]">
                      THE HENNA ATELIER
                    </p>
                  </div>

                  <h1 className="max-w-xl font-serif text-[clamp(2.8rem,5vw,4.9rem)] leading-[1.05] tracking-[-0.055em] text-[#39293B]">
                    The art of
                    <br />

                    <span className="italic text-[#A56D80]">
                      choosing
                    </span>{" "}
                    beautifully.
                  </h1>

                  <p className="mt-6 max-w-md text-sm leading-7 text-[#806D79] sm:text-base sm:leading-8">
                    Discover our henna essentials, thoughtfully
                    presented for the moments that matter.
                    Find your favorites and shop with ease.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">

                    <a
                      href="#shop-products"
                      className="group inline-flex min-h-12 items-center gap-3 rounded-full bg-[#3D2C3E] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_12px_25px_rgba(62,43,62,0.12)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#684A62]"
                    >
                      Explore products

                      <span className="transition-transform group-hover:translate-x-1">
                        <ArrowIcon />
                      </span>
                    </a>

                    <Link
                      href="/designs"
                      className="group inline-flex min-h-12 items-center gap-3 rounded-full border border-[#D6BDC5] bg-white/70 px-7 py-3.5 text-sm font-semibold text-[#5B4256] transition-all duration-300 hover:-translate-y-1 hover:bg-white"
                    >
                      View designs

                      <ArrowIcon diagonal />
                    </Link>

                  </div>

                  <div className="mt-10 flex flex-wrap gap-4 border-t border-[#DFCDD0] pt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9C808D]">
                    <span>Henna essentials</span>
                    <span>✦</span>
                    <span>Mehndi artistry</span>
                    <span>✦</span>
                    <span>Online shopping</span>
                  </div>
                </div>
              </div>

              {/* RIGHT — LIFESTYLE PHOTO */}
              <div className="relative min-h-[280px] overflow-hidden bg-[#E9D8D4] sm:min-h-[360px] lg:min-h-[450px]">

                <Image
                  src="/hero-slides/henna-1.jpg"
                  alt="Beautiful traditional henna artwork"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="shop-hero-photo object-cover object-center"
                />

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#332337]/45 via-transparent to-transparent" />

                {/* EDITORIAL LABEL */}
                <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-end justify-between gap-4 sm:bottom-8 sm:left-8 sm:right-8">

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.23em] text-white/80">
                      ART OF MEHNDI
                    </p>

                    <p className="mt-2 font-serif text-2xl text-white sm:text-3xl">
                      Beauty in every detail.
                    </p>
                  </div>

                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/60 bg-white/15 text-white backdrop-blur-md">
                    <ArrowIcon diagonal />
                  </span>

                </div>
              </div>
            </div>
          </div>
        </section>

        {/* COLLECTION PRODUCTS */}
        <section
          id="shop-products"
          className="scroll-mt-32 mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-20"
        >

          {/* SECTION HEADING */}
          <div className="mb-10">

            <p className="text-[11px] font-bold uppercase tracking-[0.23em] text-[#B27C8C]">
              SHOP THE COLLECTION
            </p>

            <h2 className="mt-3 font-serif text-4xl tracking-[-0.045em] text-[#382B3C] sm:text-5xl">
              Find your{" "}
              <span className="italic text-[#A46E82]">
                favorite.
              </span>
            </h2>

            <p className="mt-4 max-w-lg text-sm leading-7 text-[#81727F]">
              Explore our available products. Prices and stock
              information are loaded from our store.
            </p>
          </div>

          {/* ORIGINAL SERVER-SIDE PRODUCT LOGIC */}
          <Suspense fallback={<ProductLoadingSkeleton />}>
            <ProductList />
          </Suspense>

        </section>

      </main>

      <BusinessFooter />
    </>
  );
}
