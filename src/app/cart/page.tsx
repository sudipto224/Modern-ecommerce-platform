"use client";

import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useCart } from "@/components/cart/CartProvider";

export default function CartPage() {
  const {
    items,
    isLoaded,
    totalItems,
    totalPrice,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  const formatPrice = (price: number) =>
    `৳${price.toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <>
      {/* WEBSITE NAVBAR */}
      <Navbar />

      <main className="min-h-screen bg-[#fffaf6] px-5 py-12 text-[#44271f] md:px-12 md:py-16">
        <div className="mx-auto max-w-6xl">
          {/* PAGE HEADER */}
          <div className="mb-10">
            <Link
              href="/shop"
              className="text-sm font-medium text-[#9b6d57] hover:underline"
            >
              ← Continue Shopping
            </Link>

            <h1 className="mt-5 font-serif text-4xl font-semibold md:text-5xl">
              Your Shopping Cart
            </h1>

            <p className="mt-3 text-sm text-[#8b7669]">
              Review your selected henna products before checkout.
            </p>
          </div>

          {!isLoaded ? (
            <div className="rounded-2xl border border-[#eaded5] bg-white p-12 text-center">
              Loading your cart...
            </div>
          ) : items.length === 0 ? (
            /* EMPTY CART */
            <div className="rounded-3xl border border-[#eaded5] bg-white px-6 py-16 text-center shadow-sm">
              <div className="mb-6 text-6xl">
                🛍️
              </div>

              <h2 className="font-serif text-3xl font-semibold">
                Your Cart is Empty
              </h2>

              <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#8b7669]">
                Discover our collection of premium natural
                henna products and find something beautiful.
              </p>

              <Link
                href="/shop"
                className="mt-8 inline-block rounded-full bg-[#693f31] px-8 py-4 text-sm font-semibold text-white transition hover:bg-[#4f2c22]"
              >
                Explore Products
              </Link>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-3">
              {/* CART PRODUCTS */}
              <div className="space-y-5 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-xl font-semibold">
                    Cart Items ({totalItems})
                  </h2>

                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-sm font-medium text-red-700 hover:underline"
                  >
                    Clear Cart
                  </button>
                </div>

                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-5 rounded-2xl border border-[#eaded5] bg-white p-5 shadow-sm sm:flex-row"
                  >
                    {/* PRODUCT IMAGE */}
                    <div className="relative h-44 w-full shrink-0 overflow-hidden rounded-xl bg-[#f5e9e1] sm:h-32 sm:w-32">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          unoptimized
                          sizes="(max-width: 640px) 100vw, 128px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-4xl">
                          🌿
                        </div>
                      )}
                    </div>

                    {/* PRODUCT DETAILS */}
                    <div className="flex flex-1 flex-col justify-between gap-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          {item.category && (
                            <p className="mb-2 text-xs uppercase tracking-wider text-[#b38a76]">
                              {item.category}
                            </p>
                          )}

                          <h3 className="font-serif text-lg font-semibold">
                            {item.name}
                          </h3>

                          <p className="mt-2 text-sm text-[#8b7669]">
                            {formatPrice(item.price)} each
                          </p>
                        </div>

                        {/* REMOVE PRODUCT */}
                        <button
                          type="button"
                          onClick={() =>
                            removeFromCart(item.id)
                          }
                          aria-label={`Remove ${item.name}`}
                          className="rounded-full px-2 text-2xl text-[#a18a7c] hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4">
                        {/* QUANTITY BUTTONS */}
                        <div className="flex items-center overflow-hidden rounded-full border border-[#e5d6cc]">
                          <button
                            type="button"
                            aria-label={`Decrease ${item.name} quantity`}
                            disabled={item.quantity <= 1}
                            onClick={() =>
                              updateQuantity(
                                item.id,
                                item.quantity - 1
                              )
                            }
                            className="px-4 py-2 text-lg hover:bg-[#f5e9e1] disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            −
                          </button>

                          <span className="min-w-9 text-center text-sm font-semibold">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            aria-label={`Increase ${item.name} quantity`}
                            disabled={
                              item.quantity >= item.stock
                            }
                            onClick={() =>
                              updateQuantity(
                                item.id,
                                item.quantity + 1
                              )
                            }
                            className="px-4 py-2 text-lg hover:bg-[#f5e9e1] disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>

                        {/* PRODUCT TOTAL */}
                        <p className="text-lg font-semibold">
                          {formatPrice(
                            item.price * item.quantity
                          )}
                        </p>
                      </div>

                      <p className="text-xs text-[#9d8375]">
                        Maximum available: {item.stock}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* ORDER SUMMARY */}
              <aside className="h-fit rounded-3xl border border-[#eaded5] bg-white p-7 shadow-sm">
                <h2 className="font-serif text-2xl font-semibold">
                  Order Summary
                </h2>

                <div className="mt-8 space-y-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8b7669]">
                      Items ({totalItems})
                    </span>

                    <span className="font-medium">
                      {formatPrice(totalPrice)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-[#8b7669]">
                      Delivery Charge
                    </span>

                    <span className="text-right text-[#9b6d57]">
                      To be confirmed
                    </span>
                  </div>

                  <div className="border-t border-[#eaded5] pt-5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        Products Subtotal
                      </span>

                      <span className="text-2xl font-bold">
                        {formatPrice(totalPrice)}
                      </span>
                    </div>
                  </div>

                  {/* ACTIVE CHECKOUT BUTTON */}
                  <Link
                    href="/checkout"
                    className="mt-4 block w-full rounded-full bg-[#693f31] px-6 py-4 text-center text-sm font-semibold text-white transition hover:bg-[#4f2c22]"
                  >
                    Proceed to Checkout →
                  </Link>

                  <p className="text-center text-xs leading-5 text-[#9d8375]">
                    Cash on Delivery is available.
                    Delivery charges and final payable
                    amount will be confirmed separately.
                  </p>

                  <Link
                    href="/shop"
                    className="block text-center text-sm font-medium text-[#9b6d57] hover:underline"
                  >
                    Continue Shopping
                  </Link>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
