"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  BusinessSettings,
  SavedBusinessSettings,
} from "@/lib/admin/settings-types";
import { DEFAULT_BUSINESS_SETTINGS } from "@/lib/admin/settings-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isBusinessSettings(value: unknown): value is BusinessSettings {
  if (!isRecord(value)) return false;
  const textFields = [
    "businessName",
    "tagline",
    "email",
    "phone",
    "whatsapp",
    "address",
    "facebookUrl",
    "instagramUrl",
    "logoUrl",
    "deliveryInstructions",
    "estimatedDelivery",
    "bookingInstructions",
    "businessHours",
    "bookingConfirmation",
    "announcementText",
  ] as const;
  const booleanFields = [
    "deliveryAvailable",
    "bookingAvailable",
    "showTagline",
    "announcementEnabled",
  ] as const;

  return (
    textFields.every((field) => typeof value[field] === "string") &&
    booleanFields.every((field) => typeof value[field] === "boolean") &&
    (value.defaultDeliveryCharge === null ||
      typeof value.defaultDeliveryCharge === "number") &&
    Array.isArray(value.serviceAreas) &&
    value.serviceAreas.every((area) => typeof area === "string")
  );
}

function isSavedSettings(value: unknown): value is SavedBusinessSettings {
  return (
    isRecord(value) &&
    isBusinessSettings(value.settings) &&
    typeof value.updatedAt === "string" &&
    typeof value.canEdit === "boolean"
  );
}

async function getResponseMessage(
  response: Response,
  fallback: string
) {
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

const fieldClass =
  "mt-2 w-full rounded-xl border border-[#e6d6cc] bg-[#fffaf6] px-4 py-3 text-sm text-[#44271f] outline-none transition focus:border-[#b77b5b] focus:ring-2 focus:ring-[#b77b5b]/15 disabled:cursor-not-allowed disabled:bg-[#f5f0ec]";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#eaded5] bg-white p-5 shadow-sm md:p-7">
      <div className="mb-6">
        <h2 className="font-serif text-2xl">{title}</h2>
        {description && (
          <p className="mt-2 text-sm text-[#80685b]">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function ToggleField({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-[#eaded5] bg-[#fffaf6] p-4">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-[#693f31] disabled:opacity-50"
      />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-1 block text-xs text-[#80685b]">
          {description}
        </span>
      </span>
    </label>
  );
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [savedSettings, setSavedSettings] =
    useState<BusinessSettings>(DEFAULT_BUSINESS_SETTINGS);
  const [settings, setSettings] =
    useState<BusinessSettings>(DEFAULT_BUSINESS_SETTINGS);
  const [updatedAt, setUpdatedAt] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [areasInput, setAreasInput] = useState("");
  const saveLock = useRef(false);

  const dirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSettings() {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");
      try {
        const response = await fetch("/api/admin/settings", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.status === 401) {
          router.replace("/admin-login");
          return;
        }
        if (!response.ok) {
          throw new Error(
            await getResponseMessage(
              response,
              "Unable to load business settings."
            )
          );
        }
        const result: unknown = await response.json();
        if (!isSavedSettings(result)) {
          throw new Error("The settings response was invalid.");
        }
        setSettings(result.settings);
        setSavedSettings(result.settings);
        setUpdatedAt(result.updatedAt);
        setCanEdit(result.canEdit);
        setAreasInput(result.settings.serviceAreas.join("\n"));
      } catch (error) {
        if (controller.signal.aborted) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load business settings."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadSettings();
    return () => controller.abort();
  }, [refreshKey, router]);

  function updateField<K extends keyof BusinessSettings>(
    key: K,
    value: BusinessSettings[K]
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function saveSettings() {
    if (!canEdit || !dirty || saving || saveLock.current) return;
    if (!updatedAt) {
      setErrorMessage("Refresh settings before saving.");
      return;
    }

    const serviceAreas = areasInput
      .split(/\r?\n/)
      .map((area) => area.trim())
      .filter(Boolean);
    if (serviceAreas.length > 30) {
      setErrorMessage("Enter no more than 30 service areas.");
      return;
    }
    const nextSettings = { ...settings, serviceAreas };

    saveLock.current = true;
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedUpdatedAt: updatedAt,
          settings: nextSettings,
        }),
      });

      if (response.status === 401) {
        router.replace("/admin-login");
        return;
      }
      if (!response.ok) {
        throw new Error(
          await getResponseMessage(response, "Unable to save settings.")
        );
      }

      const result: unknown = await response.json();
      if (!isSavedSettings(result)) {
        throw new Error("The save response could not be verified.");
      }
      setSettings(result.settings);
      setSavedSettings(result.settings);
      setUpdatedAt(result.updatedAt);
      setCanEdit(result.canEdit);
      setAreasInput(result.settings.serviceAreas.join("\n"));
      setSuccessMessage("Settings saved successfully.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save settings."
      );
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  const inputDisabled = loading || saving || !canEdit;

  return (
    <div className="min-h-screen bg-[#faf6f3] text-[#44271f] lg:flex">
      <aside className="w-full shrink-0 border-b border-[#eaded5] bg-white lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
        <div className="border-b border-[#eaded5] p-6">
          <Link href="/admin" className="text-xl font-bold tracking-wide">
            Mehedi <span className="text-[#b77b5b]">By Meherin</span>
          </Link>
          <p className="mt-2 text-xs text-[#80685b]">Business Management</p>
        </div>
        <nav aria-label="Admin navigation" className="p-4">
          <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-[#a38b7d]">
            Management
          </p>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
            {[
              ["Dashboard", "/admin", "▦"],
              ["Products", "/admin/products", "▣"],
              ["Mehndi Designs", "/admin/designs", "✿"],
              ["Orders", "/admin/orders", "▤"],
              ["Bookings", "/admin/bookings", "📅"],
              ["Customers", "/admin/customers", "♙"],
              ["Notifications", null, "🔔"],
              ["Reports", "/admin/reports", "▥"],
              ["Settings", "/admin/settings", "⚙"],
            ].map(([label, href, icon]) => {
              const active = href === "/admin/settings";
              const classes = `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                active
                  ? "bg-[#693f31] text-white"
                  : "text-[#80685b] hover:bg-[#f8f0e9] hover:text-[#693f31]"
              }`;
              return href ? (
                <Link
                  key={label}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={classes}
                >
                  <span aria-hidden="true" className="text-lg">
                    {icon}
                  </span>
                  {label}
                </Link>
              ) : (
                <div
                  key={label}
                  title="Coming soon"
                  className={`${classes} cursor-default opacity-60`}
                >
                  <span aria-hidden="true" className="text-lg">
                    {icon}
                  </span>
                  {label}
                </div>
              );
            })}
          </div>
        </nav>
        <div className="p-4">
          <Link
            href="/"
            className="block rounded-xl border border-[#eaded5] px-4 py-3 text-center text-sm hover:bg-[#f8f0e9]"
          >
            ← View Website
          </Link>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-5 md:p-10">
        <div className="mx-auto max-w-5xl">
          <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#b77b5b]">
                Business Management
              </p>
              <h1 className="font-serif text-4xl">Website Settings</h1>
              <p className="mt-3 text-sm text-[#80685b]">
                Manage public business details and operational availability.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={loading || saving}
                onClick={() => {
                  if (
                    dirty &&
                    !window.confirm(
                      "Discard unsaved settings changes and reload?"
                    )
                  ) {
                    return;
                  }
                  setRefreshKey((value) => value + 1);
                }}
                className="rounded-full border border-[#d9c3b5] bg-white px-5 py-3 text-sm hover:bg-[#f5ebe5] disabled:opacity-50"
              >
                Refresh
              </button>
              <button
                type="button"
                disabled={!canEdit || !dirty || loading || saving}
                onClick={() => void saveSettings()}
                className="rounded-full bg-[#693f31] px-6 py-3 text-sm font-semibold text-white hover:bg-[#875441] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Settings"}
              </button>
            </div>
          </header>

          <div
            aria-live="polite"
            className={`mb-5 rounded-xl border p-4 text-sm ${
              dirty
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-transparent p-0 text-transparent"
            }`}
          >
            {dirty ? "You have unsaved changes." : ""}
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
            >
              {successMessage}
            </div>
          )}
          {loading && (
            <p className="mb-5 rounded-xl border border-[#eaded5] bg-white p-4 text-sm text-[#80685b]">
              Loading saved settings…
            </p>
          )}
          {!loading && !canEdit && !errorMessage && (
            <p className="mb-5 rounded-xl border border-[#eaded5] bg-[#f7ece4] p-4 text-sm text-[#6f5144]">
              Manager accounts can view settings. Only an owner can save
              changes.
            </p>
          )}

          <div className="space-y-5">
            <Section
              title="Business Profile"
              description="These saved details are used for customer-facing business identity."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block text-sm font-medium">
                  Business Name
                  <input
                    className={fieldClass}
                    value={settings.businessName}
                    maxLength={120}
                    disabled={inputDisabled}
                    onChange={(event) =>
                      updateField("businessName", event.target.value)
                    }
                  />
                </label>
                <label className="block text-sm font-medium">
                  Business Tagline
                  <input
                    className={fieldClass}
                    value={settings.tagline}
                    maxLength={180}
                    disabled={inputDisabled}
                    onChange={(event) =>
                      updateField("tagline", event.target.value)
                    }
                  />
                </label>
              </div>
              <p className="mt-3 text-xs text-[#80685b]">
                Proposed initial name: Mehedi By Meherin. Existing saved names
                remain unchanged until an owner saves an edit.
              </p>
            </Section>

            <Section
              title="Contact Information"
              description="Unknown contact details may remain blank. Only secure HTTPS social and logo URLs are accepted."
            >
              <div className="grid gap-5 md:grid-cols-2">
                {([
                  ["email", "Business Email", "email"],
                  ["phone", "Contact Phone", "tel"],
                  ["whatsapp", "WhatsApp Number", "tel"],
                  ["facebookUrl", "Facebook URL", "url"],
                  ["instagramUrl", "Instagram URL", "url"],
                  ["logoUrl", "Business Logo URL", "url"],
                ] as const).map(([field, label, type]) => (
                  <label key={field} className="block text-sm font-medium">
                    {label}
                    <input
                      type={type}
                      className={fieldClass}
                      value={settings[field]}
                      maxLength={field === "email" ? 254 : field.endsWith("Url") ? 2048 : 32}
                      disabled={inputDisabled}
                      onChange={(event) =>
                        updateField(field, event.target.value)
                      }
                    />
                  </label>
                ))}
                <label className="block text-sm font-medium md:col-span-2">
                  Business Address
                  <textarea
                    className={fieldClass}
                    rows={3}
                    maxLength={500}
                    value={settings.address}
                    disabled={inputDisabled}
                    onChange={(event) =>
                      updateField("address", event.target.value)
                    }
                  />
                </label>
              </div>
            </Section>

            <Section
              title="Delivery Settings"
              description="The default charge is informational only. Admins continue confirming each order's delivery fee separately."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <ToggleField
                  label="Delivery Available"
                  description="When turned off, customers cannot submit new delivery orders."
                  checked={settings.deliveryAvailable}
                  disabled={inputDisabled}
                  onChange={(checked) =>
                    updateField("deliveryAvailable", checked)
                  }
                />
                <label className="block text-sm font-medium">
                  Reference Standard Delivery Charge
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={fieldClass}
                    value={settings.defaultDeliveryCharge ?? ""}
                    disabled={inputDisabled}
                    onChange={(event) => {
                      const value = event.target.value;
                      updateField(
                        "defaultDeliveryCharge",
                        value === "" ? null : Number(value)
                      );
                    }}
                  />
                  <span className="mt-2 block text-xs font-normal text-[#80685b]">
                    Reference only; does not change checkout or existing orders.
                  </span>
                </label>
                <label className="block text-sm font-medium">
                  Estimated Delivery Description
                  <input
                    className={fieldClass}
                    maxLength={120}
                    value={settings.estimatedDelivery}
                    disabled={inputDisabled}
                    onChange={(event) =>
                      updateField("estimatedDelivery", event.target.value)
                    }
                    placeholder="Leave blank if unknown"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Delivery Service Areas
                  <textarea
                    className={fieldClass}
                    rows={3}
                    value={areasInput}
                    disabled={inputDisabled}
                    onChange={(event) => {
                      setAreasInput(event.target.value);
                      updateField(
                        "serviceAreas",
                        event.target.value
                          .split(/\r?\n/)
                          .map((area) => area.trim())
                          .filter(Boolean)
                      );
                    }}
                    placeholder="One area per line"
                  />
                  <span className="mt-2 block text-xs font-normal text-[#80685b]">
                    Up to 30 areas; each line is limited to 100 characters.
                  </span>
                </label>
                <label className="block text-sm font-medium md:col-span-2">
                  Delivery Instructions
                  <textarea
                    className={fieldClass}
                    rows={3}
                    maxLength={500}
                    value={settings.deliveryInstructions}
                    disabled={inputDisabled}
                    onChange={(event) =>
                      updateField("deliveryInstructions", event.target.value)
                    }
                  />
                </label>
              </div>
            </Section>

            <Section
              title="Order Settings"
              description="Only Cash on Delivery is currently supported. Payment collection is not tracked."
            >
              <div className="rounded-xl border border-[#eaded5] bg-[#fffaf6] p-4">
                <p className="text-sm font-semibold">
                  Active payment method: Cash on Delivery
                </p>
                <p className="mt-2 text-sm text-[#80685b]">
                  COD cannot be disabled while it is the only supported
                  payment method. Online payments are paused; no payment
                  gateway keys or credentials are stored in settings.
                </p>
              </div>
            </Section>

            <Section
              title="Booking Settings"
              description="Booking availability is enforced in the public booking form and submission API."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <ToggleField
                  label="Accept Booking Requests"
                  description="When turned off, the booking form is disabled and the API rejects new requests."
                  checked={settings.bookingAvailable}
                  disabled={inputDisabled}
                  onChange={(checked) =>
                    updateField("bookingAvailable", checked)
                  }
                />
                <label className="block text-sm font-medium">
                  Business Hours
                  <textarea
                    className={fieldClass}
                    rows={3}
                    maxLength={300}
                    value={settings.businessHours}
                    disabled={inputDisabled}
                    onChange={(event) =>
                      updateField("businessHours", event.target.value)
                    }
                    placeholder="Leave blank if not set"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Booking Contact Instructions
                  <textarea
                    className={fieldClass}
                    rows={3}
                    maxLength={500}
                    value={settings.bookingInstructions}
                    disabled={inputDisabled}
                    onChange={(event) =>
                      updateField("bookingInstructions", event.target.value)
                    }
                  />
                </label>
                <label className="block text-sm font-medium">
                  Booking Confirmation Description
                  <textarea
                    className={fieldClass}
                    rows={3}
                    maxLength={300}
                    value={settings.bookingConfirmation}
                    disabled={inputDisabled}
                    onChange={(event) =>
                      updateField("bookingConfirmation", event.target.value)
                    }
                  />
                </label>
              </div>
            </Section>

            <Section
              title="Website Preferences"
              description="Public announcement text is rendered as escaped text, never as HTML."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <ToggleField
                  label="Show Tagline in Website Branding"
                  description="Display the saved tagline beneath the business name in the navigation."
                  checked={settings.showTagline}
                  disabled={inputDisabled}
                  onChange={(checked) => updateField("showTagline", checked)}
                />
                <ToggleField
                  label="Show Website Announcement"
                  description="Display the announcement message in the public navigation."
                  checked={settings.announcementEnabled}
                  disabled={inputDisabled}
                  onChange={(checked) =>
                    updateField("announcementEnabled", checked)
                  }
                />
                <label className="block text-sm font-medium md:col-span-2">
                  Website Announcement
                  <input
                    className={fieldClass}
                    maxLength={180}
                    value={settings.announcementText}
                    disabled={inputDisabled}
                    onChange={(event) =>
                      updateField("announcementText", event.target.value)
                    }
                  />
                </label>
              </div>
            </Section>
          </div>

          <footer className="sticky bottom-3 z-10 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#eaded5] bg-white/95 p-4 shadow-lg backdrop-blur">
            <p className="text-xs text-[#80685b]">
              {canEdit ? "Owner access" : "Read-only manager access"}
              {updatedAt
                ? ` · Last saved ${new Date(updatedAt).toLocaleString("en-BD", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}`
                : ""}
            </p>
            <button
              type="button"
              disabled={!canEdit || !dirty || loading || saving}
              onClick={() => void saveSettings()}
              className="rounded-full bg-[#693f31] px-7 py-3 text-sm font-semibold text-white hover:bg-[#875441] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </footer>
        </div>
      </main>
    </div>
  );
}
