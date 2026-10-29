"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { useBusinessProfile } from "@/lib/business-profile";

type MenuItem = {
  label: string;
  href: string;
};

const navigation: MenuItem[] = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Designs", href: "/designs" },
  { label: "Booking", href: "/booking" },
  { label: "Collections", href: "/#collections" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
];

function CartIcon() {
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
      <path d="M3 4h2l2.2 11a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 2-1.6L22 8H6" />
      <circle cx="10" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </svg>
  );
}

function BrandName({ name }: { name: string }) {
  const isDefaultBrand =
    name.trim().toLowerCase() === "mehedi by meherin";

  if (isDefaultBrand) {
    return (
      <span className="flex flex-col justify-center whitespace-nowrap leading-[1.08]">
        <span className="font-serif text-[20px] font-bold tracking-[-0.035em] text-[#3B283D] transition-colors group-hover:text-[#845168] sm:text-[24px]">
          Mehedi
        </span>

        <span className="mt-1 font-serif text-[15px] font-semibold italic tracking-[0.01em] text-[#B47C8A] sm:text-[18px]">
          By Meherin
        </span>
      </span>
    );
  }

  return (
    <span className="max-w-[135px] font-serif text-[16px] font-bold leading-tight text-[#3B283D] sm:max-w-[220px] sm:text-[21px]">
      {name}
    </span>
  );
}

export default function Navbar() {
  const pathname = usePathname();

  const { totalItems } = useCart();
  const { profile } = useBusinessProfile();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentHash, setCurrentHash] = useState("");

  const businessName =
    profile.businessName?.trim() || "Mehedi By Meherin";

  const announcement =
    "announcementEnabled" in profile &&
    profile.announcementEnabled === true &&
    "announcementText" in profile &&
    typeof profile.announcementText === "string"
      ? profile.announcementText.trim()
      : "";

  useEffect(() => {
    const updateHash = () => {
      setCurrentHash(window.location.hash);
    };

    updateHash();

    window.addEventListener("hashchange", updateHash);

    return () => {
      window.removeEventListener("hashchange", updateHash);
    };
  }, [pathname]);

  function isActive(href: string) {
    if (href.startsWith("/#")) {
      return (
        pathname === "/" &&
        currentHash === href.substring(1)
      );
    }

    if (href === "/") {
      return pathname === "/" && !currentHash;
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  function handleNavigation(href: string) {
    setMobileOpen(false);

    if (href.startsWith("/#")) {
      setCurrentHash(href.substring(1));
    } else if (href === "/") {
      setCurrentHash("");
    }
  }

  const cartActive =
    pathname === "/cart" || pathname === "/checkout";

  return (
    <header className="sticky top-0 z-50 border-b border-[#ECE3E2] bg-[#FFFCFA]/95 text-[#3B2E3B] shadow-[0_5px_24px_rgba(54,37,51,0.06)] backdrop-blur-xl">

      {/* OPTIONAL ANNOUNCEMENT */}
      {announcement && (
        <div className="bg-[#3C2D40] px-4 py-2.5 text-center text-xs font-medium tracking-wide text-white">
          {announcement}
        </div>
      )}

      <div className="mx-auto flex min-h-[88px] max-w-[1440px] items-center justify-between gap-3 px-4 sm:min-h-[104px] sm:px-7 xl:px-10">

        {/* LARGER OFFICIAL LOGO AND ELEGANT WORDMARK */}
        <Link
          href="/"
          onClick={() => handleNavigation("/")}
          aria-label={`${businessName} - Home`}
          className="group flex min-w-0 shrink items-center gap-2.5 sm:gap-3.5"
        >
          <span className="relative flex h-[65px] w-[65px] shrink-0 items-center justify-center rounded-full border-2 border-[#E8D6DC] bg-white p-[3px] shadow-[0_7px_22px_rgba(70,38,61,0.12)] transition-all duration-500 group-hover:-rotate-3 group-hover:scale-105 group-hover:border-[#C59DAE] group-hover:shadow-xl sm:h-[80px] sm:w-[80px]">

            <Image
              src="/mehedi-logo.png"
              alt={`${businessName} official logo`}
              width={84}
              height={84}
              priority
              sizes="(max-width: 640px) 65px, 80px"
              className="h-full w-full rounded-full object-contain"
            />

          </span>

          <BrandName name={businessName} />
        </Link>

        {/* DESKTOP NAVIGATION */}
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-0.5 xl:flex"
        >
          {navigation.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => handleNavigation(item.href)}
                aria-current={active ? "page" : undefined}
                className={`group relative rounded-xl px-3.5 py-3.5 text-[14px] transition-all duration-300 2xl:px-4 ${
                  active
                    ? "bg-[#F7ECF0] font-extrabold text-[#965C76]"
                    : "font-semibold text-[#6E5F6C] hover:-translate-y-0.5 hover:bg-[#F7EEF1] hover:text-[#523A4D]"
                }`}
              >
                {item.label}

                <span
                  className={`absolute bottom-1.5 left-3.5 right-3.5 h-[3px] rounded-full transition-transform duration-300 2xl:left-4 2xl:right-4 ${
                    active
                      ? "scale-x-100 bg-[#AB738A]"
                      : "scale-x-0 bg-[#AB738A] group-hover:scale-x-100"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* CART AND MOBILE MENU */}
        <div className="flex shrink-0 items-center gap-2">

          <Link
            href="/cart"
            onClick={() => setMobileOpen(false)}
            aria-label={`Shopping cart with ${totalItems} items`}
            className={`inline-flex min-h-12 items-center gap-2 rounded-full border px-3 py-2.5 text-[13px] font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:px-5 ${
              cartActive
                ? "border-[#A87587] bg-[#F8EAEE] text-[#8F536F]"
                : "border-[#E2D5D7] bg-white text-[#49394A] hover:border-[#B99EA8]"
            }`}
          >
            <CartIcon />

            <span className="hidden sm:inline">
              Cart
            </span>

            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#A46B80] px-1.5 text-[11px] font-extrabold text-white">
              {totalItems}
            </span>
          </Link>

          <button
            type="button"
            aria-label={
              mobileOpen
                ? "Close navigation"
                : "Open navigation"
            }
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileOpen((value) => !value)}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[#E2D5D7] bg-white text-[#483748] transition-colors hover:bg-[#F5ECEE] xl:hidden"
          >
            {mobileOpen ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="h-5 w-5"
              >
                <path d="M5 5 19 19M19 5 5 19" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="h-5 w-5"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>

        </div>
      </div>

      {/* MOBILE AND TABLET NAVIGATION */}
      {mobileOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="border-t border-[#EEE5E3] bg-[#FFFCFA] px-4 pb-5 pt-3 xl:hidden"
        >
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 sm:grid-cols-3">

            {navigation.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => handleNavigation(item.href)}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-xl px-4 py-4 text-[15px] transition-all ${
                    active
                      ? "bg-[#F4E6E9] font-extrabold text-[#945A75] ring-1 ring-[#E5CCD5]"
                      : "font-semibold text-[#6D5A6B] hover:bg-[#F7EFF0]"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    {item.label}

                    {active && (
                      <span className="h-2 w-2 rounded-full bg-[#A46B80]" />
                    )}
                  </span>
                </Link>
              );
            })}

          </div>

          {/* MOBILE CONTACT SHORTCUT */}
          <a
            href="https://wa.me/8801306654666"
            target="_blank"
            rel="noopener noreferrer"
            className="mx-auto mt-4 flex max-w-7xl items-center justify-center gap-2 rounded-xl bg-[#3C2D40] px-5 py-3.5 text-sm font-semibold text-white"
          >
            Contact With Us
            <span aria-hidden="true">↗</span>
          </a>
        </nav>
      )}

    </header>
  );
}
