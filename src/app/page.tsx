"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import Navbar from "@/components/Navbar";
import BusinessFooter from "@/components/BusinessFooter";
import { useBusinessProfile } from "@/lib/business-profile";
import { createClient } from "@/lib/supabase/client";

type FeaturedProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  imageUrl: string | null;
};

type ProductLoadingStatus = "loading" | "ready" | "error";

const CONTACT = {
  phone: "01306654666",
  phoneLink: "tel:+8801306654666",
  email: "meherinislam8383@gmail.com",
  emailLink: "mailto:meherinislam8383@gmail.com",
  whatsapp: "https://wa.me/8801306654666",
  facebook: "https://www.facebook.com/share/1F9BCw7zqs/",
  instagram:
    "https://www.instagram.com/mehedibymeherin?mdxt=MW0xcGRqaHZvN256cg==",
  developerWhatsApp: "https://wa.me/8801701054096",
};

const HERO_SLIDES = [
  {
    image: "/hero-slides/henna-1.jpg",
    label: "Bridal elegance",
  },
  {
    image: "/hero-slides/henna-2.jpg",
    label: "Beautiful traditions",
  },
  {
    image: "/hero-slides/henna-3.jpg",
    label: "The art of mehndi",
  },
];

const SLIDE_DURATION = 5500;

const storyCards = [
  {
    number: "01",
    title: "Explore",
    description: "Discover available henna products in our shop.",
    symbol: "✦",
    href: "/shop",
    surface:
      "border-[#DED5E9] bg-[#F1EBF7] hover:border-[#BDA8D5] hover:bg-[#EBE0F4]",
    icon: "bg-[#DDD0EB] text-[#6C5188]",
    color: "text-[#4A365D]",
  },
  {
    number: "02",
    title: "Find inspiration",
    description: "Browse the beautiful mehndi design gallery.",
    symbol: "✿",
    href: "/designs",
    surface:
      "border-[#ECD5DA] bg-[#F9EDF0] hover:border-[#D9AFBD] hover:bg-[#F6E3E9]",
    icon: "bg-[#EFCFD9] text-[#A45E78]",
    color: "text-[#774456]",
  },
  {
    number: "03",
    title: "Make it yours",
    description: "Choose an experience for your special occasion.",
    symbol: "✧",
    href: "/booking",
    surface:
      "border-[#E7DECA] bg-[#F8F2E5] hover:border-[#D7C297] hover:bg-[#F4E9D0]",
    icon: "bg-[#EDE0C0] text-[#926C33]",
    color: "text-[#725332]",
  },
  {
    number: "04",
    title: "Connect",
    description: "Reach out to us for orders and appointments.",
    symbol: "♡",
    href: "/#contact",
    surface:
      "border-[#D1E5DE] bg-[#EAF5F0] hover:border-[#A8CEC0] hover:bg-[#DFF0E8]",
    icon: "bg-[#C9E6D9] text-[#3D7963]",
    color: "text-[#315E4D]",
  },
];

function Arrow({
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
      className="h-5 w-5 shrink-0"
    >
      {diagonal ? (
        <path d="M5 19 19 5M8 5h11v11" />
      ) : (
        <path d="M4 12h16m-6-6 6 6-6 6" />
      )}
    </svg>
  );
}

function SocialIcon({
  type,
}: {
  type: "facebook" | "instagram" | "email" | "whatsapp";
}) {
  if (type === "facebook") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-6 w-6"
      >
        <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.46H15.2c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
      </svg>
    );
  }

  if (type === "instagram") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
      >
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle
          cx="17.5"
          cy="6.5"
          r="1"
          fill="currentColor"
          stroke="none"
        />
      </svg>
    );
  }

  if (type === "email") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <path d="M20 11.5a8.5 8.5 0 0 1-12.3 7.6L3 20l1.2-4.5A8.5 8.5 0 1 1 20 11.5Z" />
      <path d="M8.2 8.5c.6 2.8 2.6 4.8 5.4 5.4l1.6-1" />
    </svg>
  );
}

function formatPrice(amount: number) {
  return `৳${amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function FeaturedProductCard({
  product,
}: {
  product: FeaturedProduct;
}) {
  const available = product.stock > 0;

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[25px] border border-[#EADDE1] bg-white shadow-[0_8px_28px_rgba(54,32,51,0.045)] transition-all duration-500 hover:-translate-y-2 hover:border-[#D8B7C4] hover:shadow-[0_24px_55px_rgba(65,41,58,0.14)]">
      <Link
        href="/shop"
        aria-label={`Browse ${product.name} in the shop`}
        className="relative block aspect-[4/4.5] overflow-hidden bg-[#F4E9EC]"
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            unoptimized
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-[#FBF1F2] via-[#F0E3E8] to-[#E9DAE2]">
            <span
              aria-hidden="true"
              className="font-serif text-7xl text-[#B78398]"
            >
              ✿
            </span>
            <p className="mt-3 px-3 text-center text-xs text-[#866F7D]">
              Product image coming soon
            </p>
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/70 bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#785164] shadow-sm backdrop-blur">
            {product.category || "Henna Collection"}
          </span>
        </div>

        <span
          className={`absolute bottom-3 left-3 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] shadow-sm ${
            available
              ? "bg-[#EAF6EF] text-[#28734E]"
              : "bg-[#3E303E] text-white"
          }`}
        >
          {available ? "Available" : "Sold Out"}
        </span>

        <span className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#433044] shadow-lg transition-all duration-300 group-hover:rotate-45 group-hover:bg-[#4D354D] group-hover:text-white">
          <Arrow diagonal />
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#AC7B90]">
          Mehedi By Meherin
        </p>

        <Link href="/shop" className="mt-2 block">
          <h3 className="line-clamp-2 min-h-[52px] font-serif text-lg font-semibold leading-snug text-[#3D2D3D] transition-colors group-hover:text-[#A3657D] sm:text-xl">
            {product.name}
          </h3>
        </Link>

        <div className="mt-auto pt-4">
          <p className="text-lg font-bold text-[#A76A80] sm:text-xl">
            {formatPrice(product.price)}
          </p>

          <Link
            href="/shop"
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#DCC4CF] bg-[#FAF2F5] px-4 py-3 text-xs font-bold text-[#5C3B51] transition-all duration-300 hover:border-[#4A3049] hover:bg-[#4A3049] hover:text-white sm:text-sm"
          >
            {available ? "View in Shop" : "Explore Collection"}
            <Arrow diagonal />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function HomePage() {
  const { profile } = useBusinessProfile();

  const businessName =
    profile.businessName?.trim() || "Mehedi By Meherin";

  const tagline =
    profile.showTagline && profile.tagline?.trim()
      ? profile.tagline.trim()
      : "Premium henna and mehndi experiences for your beautiful moments.";

  const [products, setProducts] = useState<FeaturedProduct[]>([]);
  const [productsStatus, setProductsStatus] =
    useState<ProductLoadingStatus>("loading");

  const [activeSlide, setActiveSlide] = useState(0);
  const [sliderPaused, setSliderPaused] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);

  // Automatic hero background slideshow.
  useEffect(() => {
    if (sliderPaused || hoverPaused) return;

    const timer = window.setInterval(() => {
      if (document.hidden) return;

      if (
        window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches
      ) {
        return;
      }

      setActiveSlide(
        (previous) => (previous + 1) % HERO_SLIDES.length
      );
    }, SLIDE_DURATION);

    return () => {
      window.clearInterval(timer);
    };
  }, [sliderPaused, hoverPaused]);

  // Automatically display the newest 6 published products.
  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        const { data, error } = await createClient()
          .from("products")
          .select(
            "id, name, category, price, stock, image_url"
          )
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(6);

        if (!active) return;

        if (error) {
          console.error(
            "Featured products loading error:",
            error.message
          );
          setProductsStatus("error");
          return;
        }

        const result: FeaturedProduct[] = (data ?? [])
          .filter(
            (item) =>
              typeof item.id === "string" &&
              typeof item.name === "string" &&
              Number.isFinite(Number(item.price)) &&
              Number(item.price) >= 0 &&
              Number.isFinite(Number(item.stock)) &&
              Number(item.stock) >= 0
          )
          .map((item) => ({
            id: String(item.id),
            name: String(item.name),
            category:
              typeof item.category === "string"
                ? item.category
                : "Henna Collection",
            price: Number(item.price),
            stock: Number(item.stock),
            imageUrl:
              typeof item.image_url === "string" &&
              item.image_url.trim()
                ? item.image_url
                : null,
          }));

        setProducts(result);
        setProductsStatus("ready");
      } catch (error) {
        if (!active) return;

        console.error("Unable to load featured products:", error);
        setProductsStatus("error");
      }
    }

    void loadProducts();

    return () => {
      active = false;
    };
  }, []);

  function previousSlide() {
    setActiveSlide(
      (previous) =>
        (previous - 1 + HERO_SLIDES.length) %
        HERO_SLIDES.length
    );
  }

  function nextSlide() {
    setActiveSlide(
      (previous) => (previous + 1) % HERO_SLIDES.length
    );
  }

  return (
    <>
      <Navbar />

      <main className="overflow-x-clip bg-[#FCFAF7] text-[#322635]">
        <style>{`
          @keyframes mm-reveal {
            from {
              opacity: 0;
              transform: translateY(22px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes mm-zoom {
            from {
              transform: scale(1);
            }

            to {
              transform: scale(1.065);
            }
          }

          .mm-reveal {
            animation: mm-reveal .85s ease both;
          }

          .mm-zoom {
            animation: mm-zoom 8s ease-out both;
          }

          @media (prefers-reduced-motion: reduce) {
            .mm-reveal,
            .mm-zoom {
              animation: none !important;
            }

            .mm-slide {
              transition: none !important;
            }
          }
        `}</style>

        {/* HERO BACKGROUND SLIDESHOW */}
        <section
          aria-label="Mehedi By Meherin introduction"
          className="relative isolate min-h-[630px] overflow-hidden bg-[#332438] text-white lg:min-h-[660px]"
          onMouseEnter={() => setHoverPaused(true)}
          onMouseLeave={() => setHoverPaused(false)}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            {HERO_SLIDES.map((slide, index) => (
              <div
                key={slide.image}
                className={`mm-slide absolute inset-0 transition-opacity duration-[1400ms] ease-in-out ${
                  activeSlide === index
                    ? "z-10 opacity-100"
                    : "z-0 opacity-0"
                }`}
              >
                <div
                  className={`absolute inset-0 bg-cover bg-center ${
                    activeSlide === index ? "mm-zoom" : ""
                  }`}
                  style={{
                    backgroundImage: `url("${slide.image}")`,
                  }}
                />
              </div>
            ))}
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20"
            style={{
              background:
                "linear-gradient(90deg,rgba(33,23,38,.96) 0%,rgba(36,25,40,.88) 38%,rgba(41,27,40,.55) 70%,rgba(36,24,36,.34) 100%)",
            }}
          />

          <div className="relative z-30 mx-auto flex min-h-[630px] max-w-7xl flex-col justify-between px-5 pb-8 pt-16 sm:px-8 lg:min-h-[660px] lg:px-12 lg:pb-9 lg:pt-20">
            <div className="mm-reveal max-w-[630px]">
              <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-[#E5B9C5]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#F9E5EA]">
                  THE ART OF MEHNDI
                </span>
              </div>

              <h1 className="font-serif text-[clamp(3rem,5.9vw,5.9rem)] leading-[1.035] tracking-[-0.055em]">
                Your moments.
                <br />
                <span className="italic text-[#E8B4C5]">
                  Beautifully
                </span>
                <br />
                expressed.
              </h1>

              <p className="mt-6 max-w-lg text-sm leading-7 text-[#F0DFE8] sm:text-base sm:leading-8">
                {tagline} Discover henna essentials,
                beautiful designs and memorable experiences
                in one place.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/shop"
                  className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#EAD3DC] px-7 py-3.5 text-sm font-bold text-[#39263D] transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-xl"
                >
                  Explore collection
                  <span className="transition-transform group-hover:translate-x-1">
                    <Arrow />
                  </span>
                </Link>

                <Link
                  href="/booking"
                  className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-white/50 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:bg-white/20"
                >
                  Book an appointment
                  <Arrow diagonal />
                </Link>
              </div>
            </div>

            {/* HERO SLIDER CONTROLS */}
            <div className="mt-12 flex flex-wrap items-end justify-between gap-5 border-t border-white/20 pt-6">
              <div>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.23em] text-white/75">
                  {HERO_SLIDES[activeSlide].label}
                </p>

                <div
                  role="group"
                  aria-label="Choose background image"
                  className="flex items-center gap-2.5"
                >
                  {HERO_SLIDES.map((slide, index) => (
                    <button
                      key={slide.image}
                      type="button"
                      aria-label={`Show slide ${index + 1}: ${slide.label}`}
                      aria-pressed={activeSlide === index}
                      onClick={() => setActiveSlide(index)}
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        activeSlide === index
                          ? "w-10 bg-[#EDC0D0]"
                          : "w-2.5 bg-white/50 hover:bg-white"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="mr-2 text-xs font-bold tracking-widest text-white">
                  {String(activeSlide + 1).padStart(2, "0")}
                  <span className="px-2 text-white/50">/</span>
                  {String(HERO_SLIDES.length).padStart(2, "0")}
                </span>

                <button
                  type="button"
                  onClick={previousSlide}
                  aria-label="Previous slide"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/10 backdrop-blur hover:bg-white/25"
                >
                  ←
                </button>

                <button
                  type="button"
                  onClick={nextSlide}
                  aria-label="Next slide"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/10 backdrop-blur hover:bg-white/25"
                >
                  →
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSliderPaused((paused) => !paused)
                  }
                  aria-label={
                    sliderPaused
                      ? "Play automatic slideshow"
                      : "Pause automatic slideshow"
                  }
                  aria-pressed={sliderPaused}
                  className="flex h-10 min-w-10 items-center justify-center rounded-full border border-white/40 bg-white/10 px-3 text-sm font-bold backdrop-blur hover:bg-white/25"
                >
                  {sliderPaused ? "▶" : "Ⅱ"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* PREMIUM FEATURE BAR */}
        <section className="border-b border-[#EDE5DF] bg-white">
          <div className="mx-auto grid max-w-7xl divide-y divide-[#EFE8E2] px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8 lg:px-12">
            {[
              {
                number: "01",
                title: "Shop at your pace",
                description: "Discover available henna essentials.",
              },
              {
                number: "02",
                title: "Find your inspiration",
                description: "Explore our mehndi design gallery.",
              },
              {
                number: "03",
                title: "Make it personal",
                description: "Request a booking for your occasion.",
              },
            ].map((item) => (
              <div
                key={item.number}
                className="flex items-start gap-4 py-7 sm:px-6"
              >
                <span className="font-serif text-2xl text-[#AD7986]">
                  {item.number}
                </span>

                <div>
                  <h2 className="text-sm font-semibold text-[#392B3C]">
                    {item.title}
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-[#8B7F86]">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* COLLECTIONS */}
        <section
          id="collections"
          className="scroll-mt-32 mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
        >
          <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#B47E77]">
                THE COLLECTION
              </p>

              <h2 className="mt-3 font-serif text-4xl tracking-[-0.045em] sm:text-5xl">
                A world of{" "}
                <span className="italic text-[#A56C80]">
                  beautiful details.
                </span>
              </h2>
            </div>

            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#534153] transition hover:gap-3"
            >
              View the shop
              <Arrow diagonal />
            </Link>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.12fr_0.88fr]">
            <Link
              href="/shop"
              className="group relative flex min-h-[420px] flex-col justify-between overflow-hidden rounded-[30px] bg-[#34293A] p-8 text-white transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_28px_60px_rgba(52,41,58,.23)] sm:p-11"
            >
              <div className="pointer-events-none absolute -right-24 -top-20 h-[400px] w-[400px] rounded-full border-[75px] border-white/[0.05] transition-transform duration-700 group-hover:scale-110" />

              <span className="relative text-xs uppercase tracking-[0.2em] text-[#DAC3D0]">
                01 / Shop
              </span>

              <div className="relative">
                <p className="mb-4 font-serif text-6xl italic text-[#CBA9B6] transition-transform duration-500 group-hover:translate-x-3 sm:text-7xl">
                  Atelier.
                </p>

                <h3 className="font-serif text-4xl sm:text-5xl">
                  Henna essentials
                </h3>

                <p className="mt-4 max-w-sm text-sm leading-7 text-[#D6C8D6]">
                  Thoughtfully curated products for the
                  moments that matter to you.
                </p>

                <span className="mt-7 inline-flex items-center gap-2 text-sm font-semibold">
                  Discover products
                  <Arrow diagonal />
                </span>
              </div>
            </Link>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
              <Link
                href="/designs"
                className="group relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-[28px] border border-[#E6D8D5] bg-[#EEE2E1] p-7 transition-all duration-500 hover:-translate-y-2 hover:shadow-lg sm:p-8"
              >
                <span className="text-xs uppercase tracking-[0.2em] text-[#9E6879]">
                  02 / Inspiration
                </span>

                <div>
                  <h3 className="font-serif text-3xl text-[#503848]">
                    Mehndi designs
                  </h3>

                  <p className="mt-2 text-sm text-[#866D7B]">
                    Find artistry that feels like you.
                  </p>

                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#6B445A]">
                    Explore designs
                    <Arrow diagonal />
                  </span>
                </div>
              </Link>

              <Link
                href="/booking"
                className="group relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-[28px] border border-[#E8D9C5] bg-[#F3E9D9] p-7 transition-all duration-500 hover:-translate-y-2 hover:shadow-lg sm:p-8"
              >
                <span className="text-xs uppercase tracking-[0.2em] text-[#A1886D]">
                  03 / Experience
                </span>

                <div>
                  <h3 className="font-serif text-3xl text-[#55433E]">
                    Book your moment
                  </h3>

                  <p className="mt-2 text-sm text-[#8C796C]">
                    An occasion worth remembering.
                  </p>

                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#735845]">
                    Request a booking
                    <Arrow diagonal />
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* FEATURED PRODUCTS — SUPABASE */}
        <section
          id="featured-products"
          aria-labelledby="featured-products-title"
          className="scroll-mt-32 border-y border-[#E9DEE3] bg-gradient-to-b from-[#F8F1F3] via-[#FCF8F8] to-[#F4EDF1] py-20 lg:py-24"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="mb-11 flex flex-wrap items-end justify-between gap-6">
              <div>
                <div className="mb-4 inline-flex items-center gap-3">
                  <span className="h-px w-10 bg-[#B47C91]" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#A56B82]">
                    Discover the Collection
                  </p>
                </div>

                <h2
                  id="featured-products-title"
                  className="font-serif text-[clamp(2.3rem,4.5vw,4.3rem)] leading-tight tracking-[-0.045em] text-[#3C2A3E]"
                >
                  Featured{" "}
                  <span className="italic text-[#AC728B]">
                    Products.
                  </span>
                </h2>

                <p className="mt-4 max-w-xl text-sm leading-7 text-[#81717D] sm:text-base">
                  Beautifully chosen henna essentials for
                  memorable moments. Explore our latest collection.
                </p>
              </div>

              <Link
                href="/shop"
                className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-[#D5B9C8] bg-white px-6 py-3.5 text-sm font-bold text-[#52394D] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#51344D] hover:bg-[#51344D] hover:text-white hover:shadow-lg"
              >
                Browse More Products
                <span className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1">
                  <Arrow diagonal />
                </span>
              </Link>
            </div>

            {productsStatus === "loading" ? (
              <div
                className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
                aria-label="Loading featured products"
              >
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse overflow-hidden rounded-[25px] border border-[#E9DEE3] bg-white"
                  >
                    <div className="aspect-[4/4.5] bg-[#EEE3E8]" />
                    <div className="space-y-4 p-5">
                      <div className="h-3 w-24 rounded bg-[#EEE3E8]" />
                      <div className="h-5 w-4/5 rounded bg-[#EEE3E8]" />
                      <div className="h-5 w-1/3 rounded bg-[#EEE3E8]" />
                      <div className="h-11 rounded-full bg-[#EEE3E8]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
                {products.map((product) => (
                  <FeaturedProductCard
                    key={product.id}
                    product={product}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[28px] border border-[#E7D9E1] bg-white px-6 py-16 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F7EAF0] font-serif text-4xl text-[#AC728B]">
                  ✿
                </div>

                <h3 className="mt-5 font-serif text-3xl text-[#433044]">
                  Something beautiful is coming.
                </h3>

                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#84717E]">
                  {productsStatus === "error"
                    ? "Our featured collection is temporarily unavailable. Please explore our shop."
                    : "Our featured collection is being prepared. Visit our shop to explore available products."}
                </p>

                <Link
                  href="/shop"
                  className="mt-7 inline-flex items-center gap-3 rounded-full bg-[#50364D] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[#76536C]"
                >
                  Browse More Products
                  <Arrow diagonal />
                </Link>
              </div>
            )}

            {products.length > 0 && (
              <div className="mt-11 flex flex-col items-center gap-4 text-center">
                <p className="text-xs text-[#947F8C]">
                  Discover more beautiful finds from our collection.
                </p>

                <Link
                  href="/shop"
                  className="group inline-flex items-center gap-3 border-b border-[#AF7891] pb-2 text-sm font-bold text-[#614259] transition-all duration-300 hover:gap-5 hover:text-[#A66A85]"
                >
                  View All Products
                  <Arrow />
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* STORY AND COLORED CARDS */}
        <section
          id="about"
          className="scroll-mt-32 mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16 lg:px-12 lg:py-28"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#AF7783]">
              THE STORY
            </p>

            <h2 className="mt-5 font-serif text-4xl leading-[1.17] tracking-[-0.045em] sm:text-5xl">
              More than henna.
              <br />
              <span className="italic text-[#A56C80]">
                A little piece of you.
              </span>
            </h2>

            <p className="mt-6 max-w-md text-sm leading-8 text-[#827581] sm:text-base">
              {businessName} brings mehndi inspiration,
              products and appointment requests together
              in a simple, personal and beautiful experience.
            </p>

            <Link
              href="/designs"
              className="group mt-7 inline-flex items-center gap-3 text-sm font-semibold text-[#463649]"
            >
              Explore our designs

              <span className="transition-transform group-hover:translate-x-1">
                <Arrow diagonal />
              </span>
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {storyCards.map((card) => (
              <Link
                key={card.number}
                href={card.href}
                className={`group relative flex min-h-[215px] flex-col justify-between overflow-hidden rounded-[24px] border p-6 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_22px_40px_rgba(60,38,57,0.13)] sm:p-7 ${card.surface}`}
              >
                <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full border-[24px] border-white/30 transition-transform duration-700 group-hover:scale-125" />

                <div className="relative flex items-start justify-between">
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition-all duration-500 group-hover:scale-110 group-hover:-rotate-12 ${card.icon}`}
                  >
                    {card.symbol}
                  </span>

                  <span
                    className={`text-xs font-bold tracking-widest ${card.color}`}
                  >
                    {card.number}
                  </span>
                </div>

                <div className="relative mt-8">
                  <h3
                    className={`font-serif text-2xl font-semibold ${card.color}`}
                  >
                    {card.title}
                  </h3>

                  <p
                    className={`mt-2 text-sm leading-6 opacity-80 ${card.color}`}
                  >
                    {card.description}
                  </p>

                  <span
                    className={`mt-4 inline-flex items-center gap-2 text-xs font-bold ${card.color}`}
                  >
                    Discover more
                    <span className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1">
                      <Arrow diagonal />
                    </span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* CONTACT, SOCIAL LINKS AND DEVELOPER */}
        <section
          id="contact"
          className="scroll-mt-32 border-t border-[#EEE5E0] bg-[#F3EFEB] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
        >
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#AC7783]">
                CONNECT WITH US
              </p>

              <h2 className="mt-4 font-serif text-4xl tracking-[-0.045em] text-[#382A3C] sm:text-5xl">
                Let&apos;s stay connected.
              </h2>

              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#82747C]">
                Explore our social pages, send an email or
                contact us directly for products and bookings.
              </p>
            </div>

            <div className="overflow-hidden rounded-[30px] border border-[#E8D9D8] bg-white shadow-[0_24px_70px_rgba(58,39,54,0.08)]">
              {/* OWNER CONTACT */}
              <div className="p-6 sm:p-10">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4E7EC] text-[#9D617B]">
                    <SocialIcon type="whatsapp" />
                  </div>

                  <div>
                    <h3 className="font-serif text-3xl text-[#3A2C3B]">
                      Contact With Us
                    </h3>

                    <p className="mt-1 text-sm text-[#8C7B84]">
                      {businessName} · Customer Support
                    </p>
                  </div>
                </div>

                {/* PHONE AND EMAIL */}
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <a
                    href={CONTACT.phoneLink}
                    className="group rounded-2xl border border-[#E9DFE1] bg-[#FCF8F9] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#D4AFBD] hover:shadow-lg"
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A47688]">
                      Call Us
                    </p>

                    <p className="mt-3 text-xl font-bold text-[#4E3549] group-hover:text-[#9D617B]">
                      {CONTACT.phone}
                    </p>
                  </a>

                  <a
                    href={CONTACT.emailLink}
                    className="group min-w-0 rounded-2xl border border-[#E9DFE1] bg-[#FCF8F9] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#D4AFBD] hover:shadow-lg"
                  >
                    <div className="flex items-center gap-2 text-[#A47688]">
                      <SocialIcon type="email" />

                      <p className="text-xs font-bold uppercase tracking-[0.16em]">
                        Email Us
                      </p>
                    </div>

                    <p className="mt-3 break-all text-sm font-bold text-[#4E3549] group-hover:text-[#9D617B] sm:text-base">
                      {CONTACT.email}
                    </p>
                  </a>
                </div>

                {/* SOCIAL MEDIA LINKS */}
                <div className="mt-7">
                  <h4 className="text-sm font-bold text-[#513B4D]">
                    Follow Us on Social Media
                  </h4>

                  <p className="mt-1 text-xs text-[#8C7B84]">
                    New designs, collections and updates.
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <a
                      href={CONTACT.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-4 rounded-2xl border border-[#DCE6F6] bg-[#EFF5FF] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#9DBAE9] hover:bg-[#E4EEFF] hover:shadow-xl"
                    >
                      <span className="flex h-13 w-13 items-center justify-center rounded-2xl bg-[#D8E8FF] text-[#2464C8] transition-transform duration-300 group-hover:scale-110">
                        <SocialIcon type="facebook" />
                      </span>

                      <span className="flex-1">
                        <span className="block text-base font-bold text-[#244B88]">
                          Facebook
                        </span>

                        <span className="mt-0.5 block text-xs text-[#6684B7]">
                          Visit our Facebook Page
                        </span>
                      </span>

                      <Arrow diagonal />
                    </a>

                    <a
                      href={CONTACT.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-4 rounded-2xl border border-[#F4DBE5] bg-[#FFF0F5] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#E7B5CF] hover:bg-[#FFE7F1] hover:shadow-xl"
                    >
                      <span className="flex h-13 w-13 items-center justify-center rounded-2xl bg-[#F9D9E9] text-[#B14C83] transition-transform duration-300 group-hover:scale-110">
                        <SocialIcon type="instagram" />
                      </span>

                      <span className="flex-1">
                        <span className="block text-base font-bold text-[#95436C]">
                          Instagram
                        </span>

                        <span className="mt-0.5 block text-xs text-[#BD7B9B]">
                          Follow @mehedibymeherin
                        </span>
                      </span>

                      <Arrow diagonal />
                    </a>
                  </div>
                </div>

                {/* CUSTOMER WHATSAPP */}
                <a
                  href={CONTACT.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group mt-7 flex min-h-13 items-center justify-center gap-3 rounded-2xl bg-[#3B2D40] px-6 py-4 text-center text-sm font-bold text-white transition-all duration-300 hover:-translate-y-1 hover:bg-[#63485F] hover:shadow-xl"
                >
                  <SocialIcon type="whatsapp" />
                  Message Us on WhatsApp

                  <span className="transition-transform group-hover:translate-x-1">
                    <Arrow diagonal />
                  </span>
                </a>
              </div>

              {/* DEVELOPER CONTACT */}
              <div className="border-t border-[#EFE3E8] bg-[#FCFAFB] p-6 sm:p-10">
                <div className="flex flex-wrap items-center justify-between gap-5">
                  <div>
                    <h3 className="font-serif text-2xl text-[#3B2D40]">
                      Developer Contact
                    </h3>

                    <p className="mt-2 max-w-lg text-sm leading-7 text-[#8B7E87]">
                      Need a modern professional website or
                      technical support? Contact the developer.
                    </p>
                  </div>

                  <a
                    href={CONTACT.developerWhatsApp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-xl border border-[#B78D9B] bg-white px-6 py-3.5 text-sm font-semibold text-[#68495B] transition duration-300 hover:-translate-y-1 hover:bg-[#F4E9EC] hover:shadow-md"
                  >
                    <SocialIcon type="whatsapp" />
                    Contact Developer

                    <span className="transition-transform group-hover:translate-x-1">
                      <Arrow diagonal />
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <BusinessFooter />
    </>
  );
}
