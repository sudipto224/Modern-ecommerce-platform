"use client";

import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useCart } from "@/components/cart/CartProvider";

function formatPrice(price: number): string {
  return `৳${Number(price).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function ShoppingBagIcon({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 8h14l1 13H4L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

function ArrowRightIcon({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      style={{
        display: "block",
        width: "20px",
        height: "20px",
        minWidth: "20px",
        minHeight: "20px",
        maxWidth: "20px",
        maxHeight: "20px",
        flexShrink: 0,
      }}
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m19 6-1 14H6L5 6" />
      <path d="M10 10v6M14 10v6" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

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

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#fbf5f2] px-4 py-6 text-[#40283c] sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="mx-auto max-w-7xl">
          {!isLoaded ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-[#eadbe2] bg-white p-8 shadow-sm">
              <div className="text-center">
                <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[#eadbe2] border-t-[#a96b88]" />
                <p className="mt-5 text-sm text-[#8e7484]">
                  Preparing your shopping bag...
                </p>
              </div>
            </div>
          ) : items.length === 0 ? (
            /* EMPTY CART */
            <section className="flex min-h-[520px] flex-col items-center justify-center rounded-[28px] border border-[#eadbe2] bg-white px-5 py-12 text-center shadow-[0_12px_45px_rgba(75,43,65,0.04)] sm:px-10 sm:py-16">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-[#eadbe2] bg-[#fbf0f5] text-[#ad6e8c] shadow-[0_8px_30px_rgba(169,107,136,0.10)]">
                <ShoppingBagIcon className="h-9 w-9" />
              </div>

              <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.28em] text-[#b16f8b]">
                A beautiful collection awaits
              </p>

              <h1 className="mt-4 font-serif text-3xl font-medium tracking-tight text-[#40283c] sm:text-4xl">
                Your cart is empty.
              </h1>

              <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#887587] sm:text-base">
                It looks like you haven&apos;t discovered your
                favourites yet. Explore our collection and find
                something special for your next beautiful moment.
              </p>

              <Link
                href="/shop"
                className="group mt-8 inline-flex h-14 min-h-14 max-h-14 w-[240px] max-w-full items-center justify-between gap-4 overflow-hidden rounded-full bg-[#56364d] px-6 py-0 text-sm font-semibold leading-none text-white shadow-[0_8px_24px_rgba(86,54,77,0.15)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#68445e] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b16f8b] focus-visible:ring-offset-2"
              >
                <span className="min-w-0 flex-1 whitespace-nowrap text-left">
                  Explore the Collection
                </span>

                <ArrowRightIcon className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>

              <p className="mt-6 text-xs tracking-wide text-[#a28b9b]">
                Thoughtfully chosen. Beautifully yours.
              </p>
            </section>
          ) : (
            /* CART WITH PRODUCTS */
            <>
              {/* PAGE HEADING */}
              <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-[#ad6e8c]">
                    Your selection
                  </p>

                  <h1 className="font-serif text-3xl font-medium tracking-tight text-[#40283c] sm:text-4xl">
                    Shopping bag
                    <span className="ml-3 align-middle font-sans text-sm font-normal text-[#9c8394]">
                      ({totalItems}{" "}
                      {totalItems === 1 ? "item" : "items"})
                    </span>
                  </h1>
                </div>

                <button
                  type="button"
                  onClick={clearCart}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#eadbe2] bg-white px-4 py-2 text-xs font-medium text-[#95677f] transition hover:border-[#d8a8bb] hover:bg-[#fff4f7] hover:text-[#8d405e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b16f8b]"
                >
                  <TrashIcon />
                  Clear cart
                </button>
              </div>

              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)] lg:gap-8">
                {/* PRODUCT LIST */}
                <section
                  aria-label="Shopping cart products"
                  className="min-w-0 space-y-4"
                >
                  {items.map((item) => (
                    <article
                      key={item.id}
                      className="group rounded-[24px] border border-[#e8cedb] bg-white p-4 shadow-[0_8px_28px_rgba(75,43,65,0.035)] transition duration-300 hover:border-[#dcb6c8] hover:shadow-[0_12px_34px_rgba(75,43,65,0.07)] sm:p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
                        {/* PRODUCT IMAGE */}
                        <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-[16px] bg-[#f6e9ee] sm:h-36 sm:w-36 sm:aspect-auto">
                          {item.image_url ? (
                            <Image
                              src={item.image_url}
                              alt={item.name}
                              fill
                              unoptimized
                              sizes="(max-width: 640px) 100vw, 144px"
                              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-5xl text-[#ad6e8c]">
                              <ShoppingBagIcon className="h-10 w-10" />
                            </div>
                          )}
                        </div>

                        {/* PRODUCT DETAILS */}
                        <div className="flex min-w-0 flex-1 flex-col justify-between gap-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              {item.category && (
                                <span className="inline-flex rounded-full bg-[#f8edf2] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#a96b88]">
                                  {item.category}
                                </span>
                              )}

                              <h2 className="mt-3 break-words font-serif text-xl font-medium leading-snug text-[#40283c] sm:text-2xl">
                                {item.name}
                              </h2>

                              <p className="mt-2 text-sm text-[#987f91]">
                                {formatPrice(item.price)}{" "}
                                <span className="text-xs">
                                  per item
                                </span>
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeFromCart(item.id)}
                              aria-label={`Remove ${item.name} from cart`}
                              title="Remove item"
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#b29aaa] transition hover:bg-[#fff0f2] hover:text-[#b43852] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b16f8b]"
                            >
                              <TrashIcon />
                            </button>
                          </div>

                          <div className="flex flex-wrap items-end justify-between gap-4 border-t border-[#f0e2e9] pt-4">
                            {/* QUANTITY CONTROL */}
                            <div>
                              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#a18a9f]">
                                Quantity
                              </p>

                              <div className="inline-flex h-10 items-center overflow-hidden rounded-full border border-[#ead5e0] bg-[#fffafd]">
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
                                  className="flex h-10 w-10 items-center justify-center text-[#a57994] transition hover:bg-[#f8eaf1] disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                  <MinusIcon />
                                </button>

                                <span
                                  className="min-w-9 text-center text-sm font-semibold text-[#56364d]"
                                  aria-live="polite"
                                >
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
                                  className="flex h-10 w-10 items-center justify-center text-[#a57994] transition hover:bg-[#f8eaf1] disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                  <PlusIcon />
                                </button>
                              </div>

                              <p className="mt-2 text-[10px] text-[#a18a9f]">
                                Available: {item.stock}
                              </p>
                            </div>

                            {/* ITEM TOTAL */}
                            <div className="text-right">
                              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#a18a9f]">
                                Item total
                              </p>

                              <p className="font-serif text-2xl font-semibold text-[#68445e]">
                                {formatPrice(
                                  item.price * item.quantity
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}

                  {/* CONTINUE SHOPPING */}
                  <Link
                    href="/shop"
                    className="group inline-flex min-h-12 items-center gap-3 rounded-full px-3 py-2 text-sm font-semibold text-[#805b75] transition hover:bg-white hover:text-[#56364d]"
                  >
                    <ArrowLeftIcon />
                    <span>Continue shopping</span>
                  </Link>
                </section>

                {/* ORDER SUMMARY */}
                <aside className="h-fit min-w-0 overflow-hidden rounded-[26px] border border-[#e8d7e1] bg-white shadow-[0_12px_36px_rgba(75,43,65,0.06)] lg:sticky lg:top-24">
                  {/* SUMMARY HEADER */}
                  <div className="bg-gradient-to-br from-[#56364d] to-[#79546d] px-6 py-6 text-white sm:px-7">
                    <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#f0c7d9]">
                      Almost yours
                    </p>

                    <h2 className="mt-3 font-serif text-3xl font-medium">
                      Order summary
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-[#f0dfe8]">
                      A little beauty, prepared just for you.
                    </p>
                  </div>

                  {/* SUMMARY DETAILS */}
                  <div className="space-y-6 p-5 sm:p-7">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-[#90798f]">
                        Products ({totalItems})
                      </span>

                      <span className="shrink-0 font-semibold tabular-nums text-[#56364d]">
                        {formatPrice(totalPrice)}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-3 text-sm">
                      <div>
                        <p className="text-[#90798f]">
                          Delivery charge
                        </p>

                        <p className="mt-1 text-[10px] leading-5 text-[#a18a9f]">
                          Confirmed with your order
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-[#f8edf2] px-3 py-2 text-[9px] font-semibold text-[#a45e7f]">
                        To be confirmed
                      </span>
                    </div>

                    <div className="border-t border-dashed border-[#e8d7e1] pt-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#56364d]">
                            Products subtotal
                          </p>

                          <p className="mt-1 text-[10px] text-[#a18a9f]">
                            Excluding delivery charge
                          </p>
                        </div>

                        <p className="shrink-0 font-serif text-2xl font-semibold tabular-nums text-[#68445e]">
                          {formatPrice(totalPrice)}
                        </p>
                      </div>
                    </div>

                    {/* COMPACT CHECKOUT BUTTON */}
                    <Link
                      href="/checkout"
                      className="group flex h-14 min-h-14 max-h-14 w-full items-center justify-between gap-3 overflow-hidden rounded-full bg-[#56364d] px-5 py-0 text-sm font-semibold leading-none text-white shadow-[0_8px_22px_rgba(86,54,77,0.14)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#68445e] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b16f8b] focus-visible:ring-offset-2 sm:px-6"
                    >
                      <span className="min-w-0 flex-1 leading-tight">
                        Proceed to checkout
                      </span>

                      <ArrowRightIcon className="transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>

                    <div className="flex items-start gap-3 rounded-2xl bg-[#fbf5f8] p-4">
                      <span className="mt-0.5 text-[#a96b88]">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <rect
                            x="3"
                            y="5"
                            width="18"
                            height="14"
                            rx="2"
                          />
                          <path d="M3 10h18" />
                        </svg>
                      </span>

                      <div>
                        <p className="text-xs font-semibold text-[#68445e]">
                          Cash on Delivery
                        </p>

                        <p className="mt-1 text-[11px] leading-5 text-[#927b8e]">
                          Delivery charges and the final payable
                          amount will be confirmed separately.
                        </p>
                      </div>
                    </div>

                    <p className="text-center text-[10px] leading-5 text-[#a18a9f]">
                      Your product prices are verified when
                      placing your order.
                    </p>
                  </div>
                </aside>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
