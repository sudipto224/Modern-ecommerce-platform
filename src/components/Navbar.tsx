"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { useBusinessProfile } from "@/lib/business-profile";

export default function Navbar() {
  const [cartOpen, setCartOpen] = useState(false);

  const {
    items,
    totalItems,
    totalPrice,
    isLoaded,
  } = useCart();

  const { profile } = useBusinessProfile();

  return (
    <header className="sticky top-0 z-50 border-b border-[#e9ddd5] bg-[#fffaf6]/95 backdrop-blur-md">

      {/* BUSINESS ANNOUNCEMENT */}
      {profile.announcementEnabled &&
        profile.announcementText && (
          <p className="bg-[#693f31] px-4 py-2 text-center text-sm text-white">
            {profile.announcementText}
          </p>
        )}

      {/* RESPONSIVE NAVBAR CONTAINER */}
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-4 px-5 py-5 sm:px-6 md:px-10 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:gap-x-5 lg:px-10 xl:px-12">

        {/* BRAND LOGO */}
        <Link
          href="/"
          className="col-start-1 row-start-1 flex min-w-0 flex-col text-[#44271f]"
        >
          <span className="block whitespace-normal break-words text-lg font-bold leading-tight tracking-wide sm:text-2xl lg:text-xl xl:text-2xl">
            {profile.businessName}
          </span>

          {profile.showTagline && profile.tagline && (
            <span className="mt-1 block whitespace-normal break-words text-xs font-normal leading-relaxed tracking-normal text-[#80685b]">
              {profile.tagline}
            </span>
          )}
        </Link>

        {/* NAVIGATION */}
        <nav
          aria-label="Main navigation"
          className="col-span-2 col-start-1 row-start-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-xs font-medium text-[#44271f] sm:gap-x-6 sm:text-sm lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:flex-nowrap lg:gap-x-5 xl:gap-x-7"
        >
          <Link
            href="/"
            className="whitespace-nowrap transition hover:text-[#b77b5b]"
          >
            Home
          </Link>

          <Link
            href="/shop"
            className="whitespace-nowrap transition hover:text-[#b77b5b]"
          >
            Shop
          </Link>

          <Link
            href="/designs"
            className="whitespace-nowrap transition hover:text-[#b77b5b]"
          >
            Designs
          </Link>

          <Link
            href="/booking"
            className="whitespace-nowrap transition hover:text-[#b77b5b]"
          >
            Booking
          </Link>

          <Link
            href="/#collections"
            className="whitespace-nowrap transition hover:text-[#b77b5b]"
          >
            Collections
          </Link>

          <Link
            href="/#about"
            className="whitespace-nowrap transition hover:text-[#b77b5b]"
          >
            About
          </Link>
        </nav>

        {/* SHOPPING CART */}
        <div className="relative col-start-2 row-start-1 justify-self-end lg:col-start-3">

          <button
            type="button"
            onClick={() => setCartOpen(!cartOpen)}
            aria-label="Open shopping cart"
            aria-expanded={cartOpen}
            aria-controls="cart-preview"
            className="relative flex items-center gap-2 whitespace-nowrap rounded-full border border-[#e9ddd5] bg-white px-3 py-3 text-[#44271f] transition hover:bg-[#f4e4dc] sm:px-4"
          >
            <span className="text-xl">
              🛒
            </span>

            <span className="text-sm font-semibold">
              Cart
            </span>

            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#693f31] px-1 text-xs font-bold text-white">
              {isLoaded ? totalItems : 0}
            </span>
          </button>

          {/* CART PREVIEW */}
          {cartOpen && (
            <div
              id="cart-preview"
              className="absolute right-0 top-16 z-50 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-[#eaded5] bg-white p-5 text-[#44271f] shadow-xl"
            >

              {/* CART HEADER */}
              <div className="mb-5 flex items-center justify-between">
                <h3 className="font-serif text-xl font-semibold">
                  Shopping Cart
                </h3>

                <button
                  type="button"
                  onClick={() => setCartOpen(false)}
                  aria-label="Close cart"
                  className="text-xl text-[#80685b] transition hover:text-[#44271f]"
                >
                  ×
                </button>
              </div>

              {/* CART LOADING */}
              {!isLoaded ? (
                <p className="py-5 text-center text-sm text-[#80685b]">
                  Loading cart...
                </p>
              ) : items.length === 0 ? (

                /* EMPTY CART */
                <div className="py-6 text-center">

                  <p className="mb-3 text-4xl">
                    🛍️
                  </p>

                  <p className="font-medium">
                    Your cart is empty
                  </p>

                  <p className="mt-2 text-sm text-[#80685b]">
                    Explore our beautiful henna products.
                  </p>

                  <Link
                    href="/shop"
                    onClick={() => setCartOpen(false)}
                    className="mt-5 inline-block rounded-full bg-[#693f31] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#4f2c22]"
                  >
                    Explore Products
                  </Link>

                </div>
              ) : (

                /* CART ITEMS */
                <>
                  <div className="max-h-64 space-y-4 overflow-y-auto">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between gap-3 border-b border-[#f0e7e1] pb-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-medium">
                            {item.name}
                          </p>

                          <p className="mt-1 text-xs text-[#80685b]">
                            Qty: {item.quantity}
                          </p>
                        </div>

                        <p className="shrink-0 text-sm font-semibold">
                          ৳{(
                            item.price * item.quantity
                          ).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* CART SUBTOTAL */}
                  <div className="mt-5 flex justify-between border-t border-[#eaded5] pt-4">
                    <span className="font-medium">
                      Subtotal
                    </span>

                    <span className="font-bold">
                      ৳{totalPrice.toFixed(2)}
                    </span>
                  </div>

                  {/* VIEW FULL CART */}
                  <Link
                    href="/cart"
                    onClick={() => setCartOpen(false)}
                    className="mt-5 block rounded-full bg-[#693f31] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#4f2c22]"
                  >
                    View Full Cart →
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
