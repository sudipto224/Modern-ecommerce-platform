"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  AdminReport,
  ReportMetric,
  ReportPreset,
  ReportProduct,
  ReportTrendPoint,
} from "@/lib/admin/report-types";

type ExportType = "orders" | "products" | "bookings";

const presets: Array<{ value: ReportPreset; label: string }> = [
  { value: "today", label: "Today" },
  { value: "last7", label: "Last 7 Days" },
  { value: "last30", label: "Last 30 Days" },
  { value: "thisMonth", label: "This Month" },
  { value: "custom", label: "Custom Date Range" },
  { value: "all", label: "All Time" },
];

const sidebarItems = [
  { label: "Dashboard", href: "/admin", icon: "▦" },
  { label: "Products", href: "/admin/products", icon: "▣" },
  { label: "Mehndi Designs", href: "/admin/designs", icon: "✿" },
  { label: "Orders", href: "/admin/orders", icon: "▤" },
  { label: "Bookings", href: "/admin/bookings", icon: "📅" },
  { label: "Customers", href: "/admin/customers", icon: "♙" },
  { label: "Notifications", href: null, icon: "🔔" },
  { label: "Reports", href: "/admin/reports", icon: "▥" },
  { label: "Settings", href: null, icon: "⚙" },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isMetric(value: unknown): value is ReportMetric {
  return (
    isRecord(value) &&
    typeof value.label === "string" &&
    typeof value.count === "number"
  );
}

function isTrend(value: unknown): value is ReportTrendPoint {
  return (
    isRecord(value) &&
    typeof value.key === "string" &&
    typeof value.label === "string" &&
    typeof value.orders === "number" &&
    typeof value.recordedOrderValue === "number" &&
    typeof value.bookings === "number"
  );
}

function isProduct(value: unknown): value is ReportProduct {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.currentStock === null ||
      typeof value.currentStock === "number") &&
    typeof value.orderedQuantity === "number" &&
    (value.recordedOrderValue === null ||
      typeof value.recordedOrderValue === "number") &&
    typeof value.unpricedItemCount === "number"
  );
}

function isReport(value: unknown): value is AdminReport {
  if (!isRecord(value) || !isRecord(value.overview)) return false;
  const overviewValues = Object.values(value.overview);
  return (
    overviewValues.every(
      (field) => field === null || typeof field === "number"
    ) &&
    Array.isArray(value.orderStatuses) &&
    value.orderStatuses.every(isMetric) &&
    Array.isArray(value.bookingStatuses) &&
    value.bookingStatuses.every(isMetric) &&
    Array.isArray(value.trends) &&
    value.trends.every(isTrend) &&
    Array.isArray(value.products) &&
    value.products.every(isProduct) &&
    typeof value.lowStockThreshold === "number" &&
    Array.isArray(value.popularDesigns) &&
    value.popularDesigns.every(
      (design) =>
        isRecord(design) &&
        typeof design.title === "string" &&
        typeof design.bookingCount === "number"
    ) &&
    value.paymentCollectionTracked === false &&
    isRecord(value.filter)
  );
}

async function responseMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      isRecord(body) &&
      typeof body.message === "string" &&
      body.message.length > 0
    ) {
      return body.message;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

function formatMoney(value: number | null): string {
  if (value === null) return "Pending";
  return `৳${value.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getTodayInDhaka() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) =>
    parts.find((value) => value.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
}) {
  return (
    <article className="rounded-2xl border border-[#eaded5] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-2xl" aria-hidden="true">
          {icon}
        </span>
        <span className="text-right text-xs text-[#a38b7d]">
          {detail}
        </span>
      </div>
      <p className="text-sm text-[#80685b]">{label}</p>
      <p className="mt-2 break-words text-2xl font-bold">{value}</p>
    </article>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-[#eaded5] bg-white p-5 shadow-sm md:p-6">
      <h3 className="font-serif text-xl">{title}</h3>
      <p className="mt-1 text-xs text-[#80685b]">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function VerticalBarChart({
  title,
  data,
  valueFormatter,
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
  valueFormatter?: (value: number) => string;
}) {
  if (data.length === 0 || data.every((item) => item.value === 0)) {
    return (
      <p className="rounded-xl bg-[#fbf7f4] p-8 text-center text-sm text-[#80685b]">
        No data for this period.
      </p>
    );
  }

  const chartWidth = 720;
  const chartHeight = 250;
  const left = 42;
  const right = 12;
  const top = 18;
  const bottom = 52;
  const plotWidth = chartWidth - left - right;
  const plotHeight = chartHeight - top - bottom;
  const max = Math.max(1, ...data.map((point) => point.value));
  const step = plotWidth / data.length;
  const barWidth = Math.max(3, Math.min(34, step * 0.62));
  const labelStep = Math.max(1, Math.ceil(data.length / 9));

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-label={title}
        className="h-auto min-w-[560px] w-full"
      >
        <title>{title}</title>
        <line
          x1={left}
          y1={top + plotHeight}
          x2={chartWidth - right}
          y2={top + plotHeight}
          stroke="#eaded5"
          strokeWidth="1"
        />
        {[0, 0.5, 1].map((fraction) => {
          const y = top + plotHeight * fraction;
          const label = Math.round(max * (1 - fraction));
          return (
            <g key={fraction}>
              <line
                x1={left}
                y1={y}
                x2={chartWidth - right}
                y2={y}
                stroke="#f3ece7"
                strokeWidth="1"
              />
              <text
                x={left - 7}
                y={y + 4}
                textAnchor="end"
                className="fill-[#80685b] text-[10px]"
              >
                {valueFormatter ? valueFormatter(label) : label}
              </text>
            </g>
          );
        })}
        {data.map((point, index) => {
          const x = left + step * index + (step - barWidth) / 2;
          const height = (point.value / max) * plotHeight;
          const y = top + plotHeight - height;
          return (
            <g key={`${point.label}-${index}`}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(0, height)}
                rx="4"
                fill="#b77b5b"
              >
                <title>
                  {point.label}:{" "}
                  {valueFormatter
                    ? valueFormatter(point.value)
                    : point.value.toLocaleString("en-BD")}
                </title>
              </rect>
              {index % labelStep === 0 && (
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - 22}
                  textAnchor="middle"
                  className="fill-[#80685b] text-[10px]"
                >
                  {point.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function HorizontalBarChart({
  title,
  data,
  valueFormatter,
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
  valueFormatter?: (value: number) => string;
}) {
  const nonzeroData = data.filter((item) => item.value > 0);
  if (nonzeroData.length === 0) {
    return (
      <p className="rounded-xl bg-[#fbf7f4] p-8 text-center text-sm text-[#80685b]">
        No data for this period.
      </p>
    );
  }

  const width = 720;
  const rowHeight = 40;
  const height = Math.max(150, nonzeroData.length * rowHeight + 20);
  const labelWidth = 210;
  const valueWidth = 78;
  const barWidth = width - labelWidth - valueWidth - 20;
  const max = Math.max(1, ...nonzeroData.map((item) => item.value));

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={title}
        className="h-auto min-w-[560px] w-full"
      >
        <title>{title}</title>
        {nonzeroData.map((item, index) => {
          const y = index * rowHeight + 8;
          const widthValue = (item.value / max) * barWidth;
          return (
            <g key={item.label}>
              <text
                x="0"
                y={y + 17}
                className="fill-[#44271f] text-[12px]"
              >
                {item.label.length > 29
                  ? `${item.label.slice(0, 27)}…`
                  : item.label}
                <title>{item.label}</title>
              </text>
              <rect
                x={labelWidth}
                y={y}
                width={barWidth}
                height="22"
                rx="7"
                fill="#f3ece7"
              />
              <rect
                x={labelWidth}
                y={y}
                width={Math.max(0, widthValue)}
                height="22"
                rx="7"
                fill="#875441"
              >
                <title>
                  {item.label}:{" "}
                  {valueFormatter
                    ? valueFormatter(item.value)
                    : item.value.toLocaleString("en-BD")}
                </title>
              </rect>
              <text
                x={width - 4}
                y={y + 16}
                textAnchor="end"
                className="fill-[#80685b] text-[11px]"
              >
                {valueFormatter
                  ? valueFormatter(item.value)
                  : item.value.toLocaleString("en-BD")}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function AdminReportsPage() {
  const router = useRouter();
  const [preset, setPreset] = useState<ReportPreset>("last30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [report, setReport] = useState<AdminReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [exporting, setExporting] = useState<ExportType | null>(null);
  const [exportError, setExportError] = useState("");
  const [today, setToday] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams({ preset });
    if (preset === "custom") {
      params.set("from", customFrom);
      params.set("to", customTo);
    }
    return params.toString();
  }, [customFrom, customTo, preset]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadReport() {
      setLoading(true);
      setErrorMessage("");
      try {
        const response = await fetch(`/api/admin/reports?${query}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.status === 401) {
          router.replace("/admin-login");
          return;
        }
        if (!response.ok) {
          throw new Error(
            await responseMessage(response, "Unable to load reports.")
          );
        }
        const result: unknown = await response.json();
        if (!isReport(result)) {
          throw new Error("The reports response was invalid.");
        }
        setReport(result);
      } catch (error) {
        if (controller.signal.aborted) return;
        setReport(null);
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load reports."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadReport();
    return () => controller.abort();
  }, [query, refreshKey, router]);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setToday(getTodayInDhaka()),
      0
    );
    return () => window.clearTimeout(timeout);
  }, []);

  async function downloadCsv(dataset: ExportType) {
    if (preset === "custom" && (!customFrom || !customTo)) {
      setExportError("Select both dates before exporting this range.");
      return;
    }

    setExporting(dataset);
    setExportError("");
    try {
      const response = await fetch(
        `/api/admin/reports?${query}&export=${dataset}`,
        { cache: "no-store" }
      );
      if (response.status === 401) {
        router.replace("/admin-login");
        return;
      }
      if (!response.ok) {
        throw new Error(
          await responseMessage(response, "Unable to export report data.")
        );
      }
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `henna-${dataset}-report.csv`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "Unable to export report data."
      );
    } finally {
      setExporting(null);
    }
  }

  const productsTop = report?.products.slice(0, 10) ?? [];
  const lowStockProducts =
    report?.products.filter(
      (product) =>
        product.currentStock !== null &&
        product.currentStock <= report.lowStockThreshold
    ) ?? [];

  const overview = report?.overview;
  const statistics = [
    {
      label: "Total Orders",
      value: overview?.totalOrders,
      detail: "Includes every order status",
      icon: "🛍️",
      money: false,
    },
    {
      label: "Pending Orders",
      value: overview?.pendingOrders,
      detail: "Current status in selected period",
      icon: "🕒",
      money: false,
    },
    {
      label: "Confirmed Orders",
      value: overview?.confirmedOrders,
      detail: "COD collection not implied",
      icon: "✅",
      money: false,
    },
    {
      label: "Delivered Orders",
      value: overview?.deliveredOrders,
      detail: "Payment not verified",
      icon: "📦",
      money: false,
    },
    {
      label: "Cancelled Orders",
      value: overview?.cancelledOrders,
      detail: "Separated from active value",
      icon: "↩️",
      money: false,
    },
    {
      label: "Recorded Order Value",
      value: overview?.recordedOrderValue,
      detail: "Active orders, stored total",
      icon: "৳",
      money: true,
    },
    {
      label: "Total Bookings",
      value: overview?.totalBookings,
      detail: "Booking creation date",
      icon: "📋",
      money: false,
    },
    {
      label: "Pending Bookings",
      value: overview?.pendingBookings,
      detail: "Current booking status",
      icon: "📅",
      money: false,
    },
    {
      label: "Completed Bookings",
      value: overview?.completedBookings,
      detail: "Current booking status",
      icon: "🌿",
      money: false,
    },
    {
      label: "Total Products",
      value: overview?.totalProducts,
      detail: "Current product catalog",
      icon: "🧴",
      money: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#faf6f3] text-[#44271f] lg:flex">
      <aside className="w-full shrink-0 border-b border-[#eaded5] bg-white lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
        <div className="border-b border-[#eaded5] p-6">
          <Link href="/admin" className="text-xl font-bold tracking-wide">
            HENNA <span className="text-[#b77b5b]">STUDIO</span>
          </Link>
          <p className="mt-2 text-xs text-[#80685b]">Business Management</p>
        </div>
        <nav aria-label="Admin navigation" className="p-4">
          <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-[#a38b7d]">
            Management
          </p>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
            {sidebarItems.map((item) => {
              const active = item.href === "/admin/reports";
              const classes = `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                active
                  ? "bg-[#693f31] text-white"
                  : "text-[#80685b] hover:bg-[#f8f0e9] hover:text-[#693f31]"
              }`;
              const content = (
                <>
                  <span aria-hidden="true" className="text-lg">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </>
              );
              return item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={classes}
                >
                  {content}
                </Link>
              ) : (
                <div
                  key={item.label}
                  title="Coming soon"
                  className={`${classes} cursor-default opacity-60`}
                >
                  {content}
                </div>
              );
            })}
          </div>
        </nav>
        <div className="p-4">
          <Link
            href="/"
            className="block rounded-xl border border-[#eaded5] px-4 py-3 text-center text-sm transition hover:bg-[#f8f0e9]"
          >
            ← View Website
          </Link>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-5 md:p-10">
        <div className="mx-auto max-w-[1500px]">
          <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#b77b5b]">
                Business Intelligence
              </p>
              <h1 className="font-serif text-4xl">Reports &amp; Analytics</h1>
              <p className="mt-3 max-w-3xl text-sm text-[#80685b]">
                Operational summaries from recorded orders, products, and
                bookings. Payment collection is not tracked.
              </p>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => setRefreshKey((value) => value + 1)}
              className="rounded-full border border-[#d9c3b5] bg-white px-6 py-3 text-sm font-medium transition hover:bg-[#f5ebe5] disabled:opacity-50"
            >
              {loading ? "Refreshing…" : "Refresh Reports"}
            </button>
          </header>

          <section className="mb-7 rounded-2xl border border-[#eaded5] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-end gap-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#80685b]">
                  Reporting period
                </span>
                <select
                  value={preset}
                  onChange={(event) => {
                    const value = presets.find(
                      (option) => option.value === event.target.value
                    );
                    if (value) setPreset(value.value);
                  }}
                  className="min-w-52 rounded-xl border border-[#e6d6cc] bg-white px-4 py-3 text-sm"
                >
                  {presets.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {preset === "custom" && (
                <>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#80685b]">
                      From (Dhaka)
                    </span>
                    <input
                      type="date"
                      value={customFrom}
                      max={today}
                      onChange={(event) => setCustomFrom(event.target.value)}
                      className="rounded-xl border border-[#e6d6cc] bg-white px-4 py-3 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#80685b]">
                      Through (Dhaka)
                    </span>
                    <input
                      type="date"
                      value={customTo}
                      min={customFrom || undefined}
                      max={today}
                      onChange={(event) => setCustomTo(event.target.value)}
                      className="rounded-xl border border-[#e6d6cc] bg-white px-4 py-3 text-sm"
                    />
                  </label>
                </>
              )}
            </div>
            <p className="mt-3 text-xs text-[#80685b]">
              Orders and bookings are filtered by their recorded creation date
              (<code>created_at</code>) in Asia/Dhaka. Product stock reflects
              the current catalog; ordered quantity uses orders created in the
              selected period and excludes cancelled orders.
            </p>
          </section>

          {errorMessage && (
            <div
              role="alert"
              className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setRefreshKey((value) => value + 1)}
                className="font-semibold underline"
              >
                Try again
              </button>
            </div>
          )}

          {exportError && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              {exportError}
            </div>
          )}

          {loading && !report ? (
            <p className="rounded-2xl border border-[#eaded5] bg-white p-10 text-center text-sm text-[#80685b]">
              Loading reports…
            </p>
          ) : !report ? (
            <p className="rounded-2xl border border-[#eaded5] bg-white p-10 text-center text-sm text-[#80685b]">
              Reports are unavailable until the data can be loaded.
            </p>
          ) : (
            <>
              <section
                aria-label="Reports overview statistics"
                className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
              >
                {statistics.map((statistic) => (
                  <StatCard
                    key={statistic.label}
                    label={statistic.label}
                    value={
                      statistic.value === undefined
                        ? "Unavailable"
                        : statistic.money
                          ? formatMoney(statistic.value)
                          : statistic.value.toLocaleString("en-BD")
                    }
                    detail={statistic.detail}
                    icon={statistic.icon}
                  />
                ))}
              </section>

              <section className="mb-8 grid gap-4 md:grid-cols-3">
                <StatCard
                  label="Products Subtotal"
                  value={formatMoney(report.overview.productsSubtotal)}
                  detail="Active orders, stored subtotal"
                  icon="🧾"
                />
                <StatCard
                  label="Cancelled Order Value"
                  value={formatMoney(report.overview.cancelledOrderValue)}
                  detail="Separate from active order value"
                  icon="↩️"
                />
                <StatCard
                  label="Average Recorded Order Value"
                  value={formatMoney(
                    report.overview.averageRecordedOrderValue
                  )}
                  detail={`${report.overview.averageValueOrderCount} active orders with stored totals`}
                  icon="📊"
                />
              </section>

              <div className="mb-8 rounded-2xl border border-[#e8d5c8] bg-[#f7ece4] p-5">
                <h2 className="font-serif text-xl">Payment Collection Not Tracked</h2>
                <p className="mt-2 text-sm text-[#6f5144]">
                  Order amounts are recorded values, not collected revenue.
                  Cash-on-delivery orders are not assumed paid when confirmed
                  or delivered. Collected Revenue: <strong>Not Yet Tracked</strong>.
                  {report.overview.pendingOrderValueCount > 0 &&
                    ` ${report.overview.pendingOrderValueCount} order total(s) have not been recorded and are shown as Pending.`}
                </p>
              </div>

              <section className="mb-8 grid gap-5 xl:grid-cols-2">
                <ChartCard
                  title="Orders Over Time"
                  description={`Order count by ${report.trendGranularity === "day" ? "Dhaka calendar day" : "Dhaka calendar month"} using orders.created_at. Includes all statuses.`}
                >
                  <VerticalBarChart
                    title="Orders created over time"
                    data={report.trends.map((point) => ({
                      label: point.label,
                      value: point.orders,
                    }))}
                  />
                </ChartCard>

                <ChartCard
                  title="Recorded Order Value Over Time"
                  description="Stored total for non-cancelled orders only; null totals are excluded, not treated as zero."
                >
                  <VerticalBarChart
                    title="Recorded order value over time"
                    data={report.trends.map((point) => ({
                      label: point.label,
                      value: point.recordedOrderValue,
                    }))}
                    valueFormatter={(value) => `৳${value.toLocaleString("en-BD")}`}
                  />
                </ChartCard>

                <ChartCard
                  title="Bookings Over Time"
                  description={`Booking creation count by Dhaka calendar ${report.trendGranularity}; this is not the preferred appointment date.`}
                >
                  <VerticalBarChart
                    title="Bookings created over time"
                    data={report.trends.map((point) => ({
                      label: point.label,
                      value: point.bookings,
                    }))}
                  />
                </ChartCard>

                <ChartCard
                  title="Orders by Status"
                  description="Current order status for records created in the selected period."
                >
                  <HorizontalBarChart
                    title="Orders grouped by status"
                    data={report.orderStatuses.map((status) => ({
                      label: status.label,
                      value: status.count,
                    }))}
                  />
                </ChartCard>

                <ChartCard
                  title="Bookings by Status"
                  description="Current booking status for bookings created in the selected period."
                >
                  <HorizontalBarChart
                    title="Bookings grouped by status"
                    data={report.bookingStatuses.map((status) => ({
                      label: status.label,
                      value: status.count,
                    }))}
                  />
                </ChartCard>

                <ChartCard
                  title="Top Products"
                  description="Net ordered quantity from non-cancelled orders in this period."
                >
                  <HorizontalBarChart
                    title="Top products by net ordered quantity"
                    data={productsTop.map((product) => ({
                      label: product.name,
                      value: product.orderedQuantity,
                    }))}
                  />
                </ChartCard>
              </section>

              <section className="mb-8 rounded-2xl border border-[#eaded5] bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eaded5] px-5 py-5">
                  <div>
                    <h2 className="font-serif text-2xl">Product Performance</h2>
                    <p className="mt-1 text-xs text-[#80685b]">
                      Current stock is a live inventory snapshot. Ordered
                      quantity and item value are historical for the selected
                      period, excluding cancelled orders.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={exporting !== null}
                    onClick={() => void downloadCsv("products")}
                    className="rounded-full border border-[#d9c3b5] px-5 py-2 text-sm font-semibold text-[#693f31] hover:bg-[#f5ebe5] disabled:opacity-50"
                  >
                    {exporting === "products"
                      ? "Preparing CSV…"
                      : "Export Products CSV"}
                  </button>
                </div>
                {report.products.length === 0 ? (
                  <p className="p-8 text-center text-sm text-[#80685b]">
                    No products are currently recorded.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="bg-[#fbf7f4] text-xs uppercase tracking-wide text-[#80685b]">
                        <tr>
                          <th className="px-5 py-4">Product Name</th>
                          <th className="px-5 py-4">Current Stock</th>
                          <th className="px-5 py-4">Net Ordered Quantity</th>
                          <th className="px-5 py-4">Recorded Product Order Value</th>
                          <th className="px-5 py-4">Stock Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f0e7e1]">
                        {report.products.map((product) => {
                          const lowStock =
                            product.currentStock !== null &&
                            product.currentStock <= report.lowStockThreshold;
                          return (
                            <tr key={product.id}>
                              <td className="px-5 py-4 font-medium">
                                {product.name}
                              </td>
                              <td className="px-5 py-4">
                                {product.currentStock ?? "Unavailable"}
                              </td>
                              <td className="px-5 py-4">
                                {product.orderedQuantity.toLocaleString("en-BD")}
                              </td>
                              <td className="px-5 py-4">
                                {formatMoney(product.recordedOrderValue)}
                                {product.unpricedItemCount > 0 && (
                                  <span className="ml-2 text-xs text-[#80685b]">
                                    ({product.unpricedItemCount} item value(s)
                                    pending)
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-4">
                                {lowStock ? (
                                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                                    Low stock
                                  </span>
                                ) : (
                                  <span className="text-xs text-[#80685b]">
                                    {product.currentStock === null
                                      ? "Stock unavailable"
                                      : "In stock"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="mb-8 grid gap-5 xl:grid-cols-2">
                <ChartCard
                  title={`Low-Stock Products (≤ ${report.lowStockThreshold})`}
                  description="Current stock snapshot; threshold is explicitly set to five or fewer units."
                >
                  {lowStockProducts.length === 0 ? (
                    <p className="rounded-xl bg-[#fbf7f4] p-6 text-center text-sm text-[#80685b]">
                      No products are at or below the low-stock threshold.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {lowStockProducts.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between gap-4 rounded-xl bg-[#fbf7f4] px-4 py-3"
                        >
                          <span className="text-sm font-medium">
                            {product.name}
                          </span>
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                            {product.currentStock} in stock
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </ChartCard>

                <ChartCard
                  title="Popular Mehndi Designs"
                  description="Bookings grouped by the linked design title in this period."
                >
                  {report.popularDesigns.length === 0 ? (
                    <p className="rounded-xl bg-[#fbf7f4] p-6 text-center text-sm text-[#80685b]">
                      No linked design booking data is available for this period.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {report.popularDesigns.map((design) => (
                        <div
                          key={design.title}
                          className="flex items-center justify-between gap-4 rounded-xl bg-[#fbf7f4] px-4 py-3"
                        >
                          <span className="text-sm font-medium">
                            {design.title}
                          </span>
                          <span className="text-sm text-[#80685b]">
                            {design.bookingCount} booking
                            {design.bookingCount === 1 ? "" : "s"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </ChartCard>
              </section>

              <section className="rounded-2xl border border-[#eaded5] bg-white p-5 shadow-sm md:p-6">
                <div className="mb-4">
                  <h2 className="font-serif text-2xl">Export Report Data</h2>
                  <p className="mt-1 text-sm text-[#80685b]">
                    CSV files use the selected period and include no customer
                    phone numbers or addresses. Order and booking dates are
                    their creation dates in Asia/Dhaka.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {([
                    ["orders", "Export Orders Summary CSV"],
                    ["products", "Export Product Performance CSV"],
                    ["bookings", "Export Booking Summary CSV"],
                  ] as const).map(([dataset, label]) => (
                    <button
                      key={dataset}
                      type="button"
                      disabled={exporting !== null}
                      onClick={() => void downloadCsv(dataset)}
                      className="rounded-full bg-[#693f31] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#875441] disabled:opacity-50"
                    >
                      {exporting === dataset
                        ? "Preparing CSV…"
                        : label}
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
