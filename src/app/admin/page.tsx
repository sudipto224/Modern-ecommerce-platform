"use client";

import Link from "next/link";
import BookingNotifications from "@/components/admin/BookingNotifications";
import DashboardStatistics from "@/components/admin/DashboardStatistics";
import { useBusinessProfile } from "@/lib/business-profile";

type MenuItem = {
  label: string;
  icon: string;
  href?: string;
  active?: boolean;
};

// Admin Sidebar Menu
const menu: MenuItem[] = [
  {
    label: "Dashboard",
    icon: "▦",
    href: "/admin",
    active: true,
  },
  {
    label: "Products",
    icon: "▣",
    href: "/admin/products",
  },
  {
    label: "Mehndi Designs",
    icon: "✿",
    href: "/admin/designs",
  },
  {
    label: "Orders",
    icon: "▤",
    href: "/admin/orders",
  },
  {
    label: "Bookings",
    icon: "📅",
    href: "/admin/bookings",
  },
  {
    label: "Customers",
    icon: "♙",
    href: "/admin/customers",
  },
  {
    label: "Notifications",
    icon: "🔔",
  },
  {
    label: "Reports",
    icon: "▥",
    href: "/admin/reports",
  },
  {
    label: "Settings",
    icon: "⚙",
    href: "/admin/settings",
  },
];

export default function AdminDashboard() {
  // Dynamic business branding from saved Settings.
  // This is the same profile source used by the public Navbar.
  const { profile } = useBusinessProfile();

  const businessName = profile.businessName.trim();

  // Preserve the previous two-tone brand styling.
  // The last word receives the accent color.
  const brandWords = businessName.split(/\s+/).filter(Boolean);

  const highlightedWord =
    brandWords.length > 1
      ? brandWords[brandWords.length - 1]
      : "";

  const primaryBrand =
    brandWords.length > 1
      ? brandWords.slice(0, -1).join(" ")
      : businessName;

  return (
    <div className="min-h-screen bg-[#faf6f3] text-[#44271f]">
      <div className="lg:flex">

        {/* SIDEBAR */}
        <aside className="border-b border-[#eaded5] bg-white lg:min-h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">

          {/* DYNAMIC BUSINESS BRAND */}
          <div className="border-b border-[#eaded5] p-6">
            <Link
              href="/admin"
              className="block text-[#44271f]"
            >
              <h1 className="break-words text-xl font-bold leading-snug tracking-wide">
                {primaryBrand}

                {highlightedWord && (
                  <>
                    {" "}
                    <span className="text-[#b77b5b]">
                      {highlightedWord}
                    </span>
                  </>
                )}
              </h1>
            </Link>

            <p className="mt-2 text-xs text-[#80685b]">
              Business Management
            </p>
          </div>

          {/* NAVIGATION */}
          <div className="p-4">
            <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-[#a38b7d]">
              Management
            </p>

            <nav
              aria-label="Admin navigation"
              className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1"
            >
              {menu.map((item) => {
                const className = `
                  flex items-center gap-3 rounded-xl
                  px-4 py-3 text-sm font-medium
                  transition
                  ${
                    item.active
                      ? "bg-[#693f31] text-white"
                      : "text-[#80685b]"
                  }
                `;

                const content = (
                  <>
                    <span
                      aria-hidden="true"
                      className="text-lg"
                    >
                      {item.icon}
                    </span>

                    <span>{item.label}</span>
                  </>
                );

                if (item.href) {
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      aria-current={
                        item.active
                          ? "page"
                          : undefined
                      }
                      className={`${className} ${
                        item.active
                          ? ""
                          : "hover:bg-[#f8f0e9] hover:text-[#693f31]"
                      }`}
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <div
                    key={item.label}
                    title="Coming soon"
                    className={`${className} cursor-default opacity-60`}
                  >
                    {content}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* PUBLIC WEBSITE */}
          <div className="p-4">
            <Link
              href="/"
              className="block rounded-xl border border-[#eaded5] px-4 py-3 text-center text-sm transition hover:bg-[#f8f0e9]"
            >
              ← View Website
            </Link>
          </div>
        </aside>

        {/* MAIN DASHBOARD */}
        <main className="min-w-0 flex-1 p-5 md:p-10">

          {/* HEADER */}
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4">

            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#b77b5b]">
                Business Overview
              </p>

              <h2 className="font-serif text-4xl">
                Dashboard
              </h2>

              <p className="mt-2 text-sm text-[#80685b]">
                Welcome to your {businessName} dashboard.
              </p>
            </div>

            {/* REALTIME NOTIFICATION BELL */}
            <div className="flex items-center gap-3">

              <BookingNotifications />

              <div className="rounded-full bg-[#f1e2d8] px-5 py-3 text-sm font-medium">
                Admin Dashboard
              </div>

            </div>
          </div>

          {/* LIVE DATABASE STATISTICS */}
          <DashboardStatistics />

          {/* QUICK ACCESS */}
          <section className="mb-10">
            <h3 className="mb-5 font-serif text-2xl">
              Quick Access
            </h3>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

              {/* MANAGE PRODUCTS */}
              <Link
                href="/admin/products"
                className="rounded-2xl border border-[#eaded5] bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <p className="mb-3 text-3xl">
                  📦
                </p>

                <h4 className="font-semibold">
                  Manage Products
                </h4>

                <p className="mt-2 text-sm text-[#80685b]">
                  Add, edit, delete and manage product images.
                </p>
              </Link>

              {/* MANAGE DESIGNS */}
              <Link
                href="/admin/designs"
                className="rounded-2xl border border-[#eaded5] bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <p className="mb-3 text-3xl">
                  🌸
                </p>

                <h4 className="font-semibold">
                  Manage Mehndi Designs
                </h4>

                <p className="mt-2 text-sm text-[#80685b]">
                  Upload, edit and publish Mehndi Designs.
                </p>
              </Link>

              {/* MANAGE BOOKINGS */}
              <Link
                href="/admin/bookings"
                className="rounded-2xl border border-[#eaded5] bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <p className="mb-3 text-3xl">
                  📅
                </p>

                <h4 className="font-semibold">
                  Manage Bookings
                </h4>

                <p className="mt-2 text-sm text-[#80685b]">
                  Review appointments, confirm or reject
                  customer booking requests.
                </p>
              </Link>

            </div>
          </section>

          {/* BOOKING MANAGEMENT SHORTCUT */}
          <section className="mb-10 rounded-2xl border border-[#eaded5] bg-white p-6 shadow-sm">

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="mb-2 text-xs uppercase tracking-widest text-[#b77b5b]">
                  Live Booking Management
                </p>

                <h3 className="font-serif text-2xl">
                  Customer Appointments
                </h3>

                <p className="mt-2 text-sm text-[#80685b]">
                  Manage customer booking requests,
                  appointment dates and booking status.
                </p>
              </div>

              <Link
                href="/admin/bookings"
                className="rounded-full bg-[#693f31] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#875441]"
              >
                View Bookings →
              </Link>
            </div>

          </section>

          {/* ORDER MANAGEMENT PLACEHOLDER */}
          <section className="rounded-2xl border border-[#eaded5] bg-white p-6 shadow-sm">
            <h3 className="font-serif text-2xl">
              Orders &amp; Revenue
            </h3>

            <p className="mt-2 text-sm text-[#80685b]">
              Order management is available for Cash on
              Delivery orders. Online payment integration
              is not yet configured, and collected revenue
              is not currently tracked.
            </p>
          </section>

          {/* DYNAMIC BUSINESS FOOTER */}
          <p className="mt-8 text-center text-xs text-[#a38b7d]">
            {businessName} Admin Dashboard
            {" • "}
            Business Management System
          </p>

        </main>
      </div>
    </div>
  );
}
