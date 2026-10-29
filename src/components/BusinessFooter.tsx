"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useBusinessProfile } from "@/lib/business-profile";

const CUSTOMER_PHONE = "01306654666";
const CUSTOMER_WHATSAPP = "https://wa.me/8801306654666";
const DEVELOPER_WHATSAPP = "https://wa.me/8801701054096";

export default function BusinessFooter() {
  const { profile } = useBusinessProfile();

  const businessName =
    profile.businessName?.trim() || "Mehedi By Meherin";

  const tagline =
    profile.showTagline && profile.tagline?.trim()
      ? profile.tagline.trim()
      : "Beautiful mehndi, thoughtfully made.";

  // Avoid reading the current date during Next.js prerender.
  const [year, setYear] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setYear(String(new Date().getFullYear()));
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <footer className="border-t border-[#E8DDD9] bg-[#302532] text-white">

      {/* MAIN FOOTER */}
      <div className="mx-auto grid max-w-7xl gap-12 px-5 pb-14 pt-16 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.1fr_0.7fr_1fr] lg:gap-16 lg:px-12 lg:pb-20 lg:pt-20">

        {/* BRAND */}
        <div>
          <Link
            href="/"
            className="group inline-flex items-center gap-3"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white p-1 transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/mehedi-logo.png"
                alt={`${businessName} logo`}
                width={52}
                height={52}
                sizes="52px"
                className="h-full w-full object-contain"
              />
            </span>

            <span className="max-w-[220px] text-lg font-bold leading-tight">
              {businessName}
            </span>
          </Link>

          <p className="mt-6 max-w-sm text-sm leading-7 text-[#D6C9D2]">
            {tagline}
          </p>

          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D9B5B7]">
            HENNA · MEHNDI · CELEBRATIONS
          </p>
        </div>

        {/* EXPLORE */}
        <div>
          <h2 className="mb-6 text-[11px] font-bold uppercase tracking-[0.22em] text-[#D7B59D]">
            Explore
          </h2>

          <nav
            aria-label="Footer navigation"
            className="flex flex-col items-start gap-4 text-sm text-[#E0D5DD]"
          >
            {[
              { label: "Home", href: "/" },
              { label: "Shop", href: "/shop" },
              { label: "Mehndi Designs", href: "/designs" },
              { label: "Book Appointment", href: "/booking" },
              { label: "Collections", href: "/#collections" },
              { label: "Our Story", href: "/#about" },
              { label: "Contact", href: "/#contact" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-white hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* STORE CONTACT */}
        <div>
          <h2 className="mb-6 text-[11px] font-bold uppercase tracking-[0.22em] text-[#D7B59D]">
            Contact With Us
          </h2>

          <p className="text-sm leading-7 text-[#D2C5CF]">
            For products, mehndi designs and bookings,
            contact the store directly.
          </p>

          <a
            href="tel:+8801306654666"
            className="mt-4 block font-serif text-3xl tracking-tight text-white transition hover:text-[#F2C3CA]"
          >
            {CUSTOMER_PHONE}
          </a>

          <a
            href={CUSTOMER_WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#E9D9C2] px-6 py-3.5 text-sm font-bold text-[#342938] transition-all duration-300 hover:-translate-y-1 hover:bg-white"
          >
            Message Us on WhatsApp
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>

      {/* SEPARATE DEVELOPER CONTACT */}
      <div className="border-t border-white/10 bg-[#29202B]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-8 sm:px-8 lg:px-12">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Developer Contact
            </h2>

            <p className="mt-2 text-xs leading-6 text-[#C2B5C0]">
              Website development and technical support.
            </p>
          </div>

          <a
            href={DEVELOPER_WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[#D0AAB9]/70 bg-transparent px-6 py-3 text-sm font-semibold text-[#F2DCE3] transition hover:border-white hover:bg-white/10"
          >
            Developer WhatsApp
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>

      {/* COPYRIGHT */}
      <div className="border-t border-white/10 bg-[#29202B]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-5 text-xs text-[#B9ABB8] sm:px-8 lg:px-12">
          <span>
            © {year ? `${year} ` : ""}
            {businessName}. All rights reserved.
          </span>

          <span>
            Made with care.
          </span>
        </div>
      </div>
    </footer>
  );
}
