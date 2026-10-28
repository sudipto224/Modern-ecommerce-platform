"use client";

import {
  useRef,
  useState,
  type FormEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useCart } from "@/components/cart/CartProvider";
import { useBusinessProfile } from "@/lib/business-profile";

type CheckoutForm = {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryArea: string;
  notes: string;
};

type OrderSuccess = {
  orderId: string;
  status: string;
  cartGeneration: number;
};

const EMPTY_CHECKOUT_FORM: CheckoutForm = {
  customerName: "",
  customerPhone: "",
  deliveryAddress: "",
  deliveryArea: "",
  notes: "",
};

const PHONE_REGEX = /^(\+?88)?01[3-9][0-9]{8}$/;

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function formatPrice(amount: number) {
  return `৳${amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CheckoutPage() {
  const {
    items,
    isLoaded,
    totalItems,
    totalPrice,
    clearCart,
    cartGeneration,
  } = useCart();

  // Dynamic business profile from Admin Settings
  const { profile } = useBusinessProfile();

  const businessName =
    profile.businessName?.trim() || "Mehedi By Meherin";

  const [form, setForm] = useState<CheckoutForm>(
    EMPTY_CHECKOUT_FORM
  );

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [orderSuccess, setOrderSuccess] =
    useState<OrderSuccess | null>(null);

  const showOrderSuccess =
    orderSuccess !== null &&
    orderSuccess.cartGeneration === cartGeneration &&
    items.length === 0;

  // Prevent accidental double submissions
  const submissionLock = useRef(false);

  const updateField = (
    field: keyof CheckoutForm,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (errorMessage) {
      setErrorMessage("");
    }
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (submissionLock.current || showOrderSuccess) {
      return;
    }

    if (!isLoaded || items.length === 0) {
      setErrorMessage("Your shopping cart is empty.");
      return;
    }

    const customerName = form.customerName.trim();
    const customerPhone = form.customerPhone.trim();
    const deliveryAddress =
      form.deliveryAddress.trim();

    if (
      customerName.length < 2 ||
      customerName.length > 100
    ) {
      setErrorMessage(
        "Please enter a valid full name."
      );
      return;
    }

    if (!PHONE_REGEX.test(customerPhone)) {
      setErrorMessage(
        "Please enter a valid Bangladesh phone number."
      );
      return;
    }

    if (
      deliveryAddress.length < 8 ||
      deliveryAddress.length > 500
    ) {
      setErrorMessage(
        "Please enter your complete delivery address."
      );
      return;
    }

    submissionLock.current = true;
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      // Only product IDs and quantities are sent.
      // Database decides actual prices and stock.
      const payload = {
        customerName,
        customerPhone,
        deliveryAddress,
        deliveryArea: form.deliveryArea.trim(),
        notes: form.notes.trim(),
        items: items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
        })),
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result: unknown = await response.json();

      if (!isRecord(result)) {
        throw new Error(
          "Unable to confirm the order response."
        );
      }

      if (
        !response.ok ||
        result.success !== true
      ) {
        const message =
          typeof result.message === "string"
            ? result.message
            : "Unable to place your order.";

        setErrorMessage(message);
        return;
      }

      if (
        typeof result.orderId !== "string" ||
        !result.orderId
      ) {
        throw new Error(
          "Order response did not contain an order ID."
        );
      }

      // Keep confirmation before clearing the cart.
      setOrderSuccess({
        orderId: result.orderId,
        status:
          typeof result.status === "string"
            ? result.status
            : "pending",
        cartGeneration,
      });

      setForm(EMPTY_CHECKOUT_FORM);

      // Clear cart only after confirmed API success.
      clearCart();
    } catch (error) {
      console.error(
        "Checkout request failed:",
        error instanceof Error
          ? error.message
          : "Unknown error"
      );

      setErrorMessage(
        "We could not confirm your order. If you already submitted it, please contact the store before trying again to avoid a duplicate order."
      );
    } finally {
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "mt-2 w-full rounded-xl border border-[#e7d8cd] bg-[#fffaf6] px-4 py-3 text-sm text-[#44271f] outline-none transition focus:border-[#b77b5b] focus:ring-2 focus:ring-[#b77b5b]/15";

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#fffaf6] px-5 py-12 text-[#44271f] md:px-12 md:py-16">
        <div className="mx-auto max-w-6xl">

          {/* PAGE HEADER */}
          <div className="mb-10">
            {!showOrderSuccess && (
              <Link
                href="/cart"
                className="text-sm font-medium text-[#9b6d57] hover:underline"
              >
                ← Back to Shopping Cart
              </Link>
            )}

            <p className="mt-7 text-xs uppercase tracking-[0.2em] text-[#b77b5b]">
              Secure Shopping
            </p>

            <h1 className="mt-3 font-serif text-4xl font-semibold md:text-5xl">
              {showOrderSuccess
                ? "Order Confirmation"
                : "Checkout"}
            </h1>

            <p className="mt-3 text-sm text-[#8b7669]">
              {showOrderSuccess
                ? `Thank you for shopping with ${businessName}.`
                : "Complete your delivery details to prepare your order."}
            </p>
          </div>

          {/* SUCCESSFUL ORDER */}
          {showOrderSuccess && orderSuccess ? (
            <div
              role="status"
              className="mx-auto max-w-2xl rounded-3xl border border-[#eaded5] bg-white px-6 py-12 text-center shadow-sm md:px-12"
            >
              <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-4xl text-green-700">
                ✓
              </div>

              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-700">
                Order Placed Successfully
              </p>

              <h2 className="mt-4 font-serif text-3xl font-semibold">
                Thank You for Your Order!
              </h2>

              <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#8b7669]">
                Your order request has been received.
                The store will need to confirm the
                delivery charge and final payable
                amount.
              </p>

              {/* ORDER ID */}
              <div className="mt-8 rounded-2xl border border-[#eaded5] bg-[#fffaf6] p-6">
                <p className="text-xs uppercase tracking-widest text-[#9b6d57]">
                  Your Order ID
                </p>

                <p className="mt-3 break-all font-mono text-sm font-semibold text-[#44271f]">
                  {orderSuccess.orderId}
                </p>

                <div className="mt-5 flex items-center justify-center gap-2">
                  <span className="text-sm text-[#8b7669]">
                    Order Status:
                  </span>

                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold capitalize text-amber-800">
                    {orderSuccess.status}
                  </span>
                </div>
              </div>

              {/* PAYMENT INFORMATION */}
              <div className="mt-7 space-y-3 text-sm text-[#8b7669]">
                <p>
                  Payment Method:
                  <strong className="ml-2 text-[#44271f]">
                    Cash on Delivery
                  </strong>
                </p>

                <p>
                  Delivery charge and final total
                  are pending confirmation.
                </p>
              </div>

              <p className="mt-6 text-xs text-[#9d8375]">
                Please save your Order ID for
                future reference.
              </p>

              <Link
                href="/shop"
                className="mt-8 inline-block rounded-full bg-[#693f31] px-9 py-4 text-sm font-semibold text-white transition hover:bg-[#4f2c22]"
              >
                Continue Shopping
              </Link>
            </div>
          ) : !isLoaded ? (

            /* LOADING */
            <div className="rounded-2xl border border-[#eaded5] bg-white p-12 text-center">
              Loading checkout...
            </div>

          ) : items.length === 0 ? (

            /* EMPTY CART */
            <div className="rounded-3xl border border-[#eaded5] bg-white p-12 text-center">
              <div className="mb-5 text-5xl">
                🛍️
              </div>

              <h2 className="font-serif text-3xl">
                Your Cart is Empty
              </h2>

              <p className="mt-4 text-sm text-[#8b7669]">
                Add some beautiful henna products
                before proceeding to checkout.
              </p>

              <Link
                href="/shop"
                className="mt-7 inline-block rounded-full bg-[#693f31] px-8 py-4 text-sm font-semibold text-white transition hover:bg-[#4f2c22]"
              >
                Continue Shopping
              </Link>
            </div>

          ) : (
            <div className="grid items-start gap-8 lg:grid-cols-5">

              {/* CUSTOMER FORM */}
              <section className="rounded-3xl border border-[#eaded5] bg-white p-6 shadow-sm md:p-9 lg:col-span-3">
                <div className="mb-8">
                  <h2 className="font-serif text-2xl font-semibold">
                    Delivery Information
                  </h2>

                  <p className="mt-2 text-sm text-[#8b7669]">
                    Please enter your correct
                    contact and delivery information.
                  </p>

                  {profile.deliveryInstructions && (
                    <p className="mt-3 text-sm text-[#80685b]">
                      {profile.deliveryInstructions}
                    </p>
                  )}

                  {profile.estimatedDelivery && (
                    <p className="mt-2 text-sm text-[#80685b]">
                      Estimated delivery:{" "}
                      {profile.estimatedDelivery}
                    </p>
                  )}

                  {!profile.deliveryAvailable && (
                    <p
                      role="status"
                      className="mt-4 rounded-xl bg-[#f8f0e9] p-4 text-sm text-[#693f31]"
                    >
                      Delivery orders are temporarily unavailable.
                    </p>
                  )}
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="space-y-6"
                >

                  {/* CUSTOMER NAME */}
                  <div>
                    <label
                      htmlFor="customerName"
                      className="text-sm font-medium"
                    >
                      Full Name *
                    </label>

                    <input
                      id="customerName"
                      type="text"
                      autoComplete="name"
                      required
                      minLength={2}
                      maxLength={100}
                      placeholder="Enter your full name"
                      value={form.customerName}
                      onChange={(event) =>
                        updateField(
                          "customerName",
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </div>

                  {/* PHONE NUMBER */}
                  <div>
                    <label
                      htmlFor="customerPhone"
                      className="text-sm font-medium"
                    >
                      Phone Number *
                    </label>

                    <input
                      id="customerPhone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      required
                      maxLength={18}
                      placeholder="01XXXXXXXXX"
                      value={form.customerPhone}
                      onChange={(event) =>
                        updateField(
                          "customerPhone",
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />

                    <p className="mt-2 text-xs text-[#9d8375]">
                      Enter a valid Bangladesh
                      phone number.
                    </p>
                  </div>

                  {/* DELIVERY ADDRESS */}
                  <div>
                    <label
                      htmlFor="deliveryAddress"
                      className="text-sm font-medium"
                    >
                      Full Delivery Address *
                    </label>

                    <textarea
                      id="deliveryAddress"
                      required
                      rows={4}
                      minLength={8}
                      maxLength={500}
                      placeholder="House number, road, village or street, city and district"
                      value={form.deliveryAddress}
                      onChange={(event) =>
                        updateField(
                          "deliveryAddress",
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </div>

                  {/* DELIVERY AREA */}
                  <div>
                    <label
                      htmlFor="deliveryArea"
                      className="text-sm font-medium"
                    >
                      Delivery Area / District
                    </label>

                    <input
                      id="deliveryArea"
                      type="text"
                      maxLength={100}
                      placeholder="e.g. Khulna, Dhaka"
                      value={form.deliveryArea}
                      onChange={(event) =>
                        updateField(
                          "deliveryArea",
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </div>

                  {/* ORDER NOTES */}
                  <div>
                    <label
                      htmlFor="notes"
                      className="text-sm font-medium"
                    >
                      Order Notes (Optional)
                    </label>

                    <textarea
                      id="notes"
                      rows={3}
                      maxLength={1000}
                      placeholder="Any special instructions for your order..."
                      value={form.notes}
                      onChange={(event) =>
                        updateField(
                          "notes",
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </div>

                  {/* PAYMENT METHOD */}
                  <div className="border-t border-[#eaded5] pt-7">
                    <h3 className="font-serif text-xl font-semibold">
                      Payment Method
                    </h3>

                    <div className="mt-5 flex items-center gap-4 rounded-xl border border-[#dbc7ba] bg-[#fffaf6] p-5">
                      <input
                        type="radio"
                        checked
                        readOnly
                        name="paymentMethod"
                        aria-label="Cash on Delivery"
                        className="accent-[#693f31]"
                      />

                      <div>
                        <p className="text-sm font-semibold">
                          Cash on Delivery (COD)
                        </p>

                        <p className="mt-1 text-xs text-[#8b7669]">
                          Pay when your order
                          is delivered.
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-[#9d8375]">
                      Online payment options will
                      be added in a later step.
                    </p>
                  </div>

                  {/* SUBMIT ORDER */}
                  <div className="border-t border-[#eaded5] pt-7">
                    {errorMessage && (
                      <div
                        role="alert"
                        className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
                      >
                        {errorMessage}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={
                        isSubmitting ||
                        !profile.deliveryAvailable
                      }
                      className="w-full rounded-full bg-[#693f31] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#4f2c22] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting
                        ? "Placing Your Order..."
                        : "Place Order — Cash on Delivery"}
                    </button>

                    <p className="mt-3 text-center text-xs leading-5 text-[#9d8375]">
                      By placing your order, you
                      submit a Cash on Delivery
                      order request. The final
                      payable amount, including
                      delivery, will be confirmed
                      separately.
                    </p>
                  </div>
                </form>
              </section>

              {/* ORDER SUMMARY */}
              <aside className="rounded-3xl border border-[#eaded5] bg-white p-6 shadow-sm md:p-8 lg:col-span-2">
                <h2 className="font-serif text-2xl font-semibold">
                  Your Order
                </h2>

                <p className="mt-2 text-sm text-[#8b7669]">
                  {totalItems} item(s) in your cart
                </p>

                {/* ORDER PRODUCTS */}
                <div className="mt-7 max-h-96 space-y-5 overflow-y-auto">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 border-b border-[#f0e7e1] pb-5"
                    >
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#f5e9e1]">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            unoptimized
                            sizes="80px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-3xl">
                            🌿
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium">
                          {item.name}
                        </h3>

                        <p className="mt-1 text-xs text-[#8b7669]">
                          Qty: {item.quantity}
                        </p>

                        <p className="mt-2 text-sm font-semibold">
                          {formatPrice(
                            item.price * item.quantity
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* PRICE SUMMARY */}
                <div className="mt-6 space-y-5">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-[#8b7669]">
                      Subtotal
                    </span>

                    <span className="font-semibold">
                      {formatPrice(totalPrice)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-[#8b7669]">
                      Delivery Charge
                    </span>

                    <span className="text-right text-[#9b6d57]">
                      To be confirmed
                    </span>
                  </div>

                  <div className="border-t border-[#eaded5] pt-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">
                        Products Subtotal
                      </span>

                      <span className="font-serif text-2xl font-bold">
                        {formatPrice(totalPrice)}
                      </span>
                    </div>

                    <p className="mt-3 text-xs leading-5 text-[#8b7669]">
                      Product prices are verified
                      against the database when
                      placing an order.
                      Delivery fees are not included.
                      Final payable amount will
                      be confirmed separately.
                    </p>
                  </div>
                </div>

                <Link
                  href="/cart"
                  className="mt-7 block rounded-full border border-[#dbc7ba] px-6 py-3 text-center text-sm font-medium transition hover:bg-[#fffaf6]"
                >
                  Edit Shopping Cart
                </Link>
              </aside>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
