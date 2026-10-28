import { createServerClient } from "@supabase/ssr";
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  DEFAULT_BUSINESS_SETTINGS,
  type BusinessSettings,
} from "@/lib/admin/settings-types";

export class SettingsAccessError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "SettingsAccessError";
  }
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isBusinessSettings(
  value: unknown
): value is BusinessSettings {
  if (!isRecord(value)) return false;

  const stringKeys = [
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

  const booleanKeys = [
    "deliveryAvailable",
    "bookingAvailable",
    "showTagline",
    "announcementEnabled",
  ] as const;

  return (
    stringKeys.every(
      (key) => typeof value[key] === "string"
    ) &&
    booleanKeys.every(
      (key) => typeof value[key] === "boolean"
    ) &&
    (value.defaultDeliveryCharge === null ||
      (typeof value.defaultDeliveryCharge === "number" &&
        Number.isFinite(value.defaultDeliveryCharge))) &&
    Array.isArray(value.serviceAreas) &&
    value.serviceAreas.every(
      (area) => typeof area === "string"
    )
  );
}

// Authenticated admin session.
// Uses the real Supabase user identity.
export async function createSettingsSession(): Promise<{
  client: SupabaseClient;
  role: "owner" | "manager";
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new SettingsAccessError(
      "Settings service is not configured.",
      503
    );
  }

  const cookieStore = await cookies();

  const client = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(
          ({ name, value, options }) => {
            cookieStore.set(name, value, options);
          }
        );
      },
    },
  });

  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) {
    throw new SettingsAccessError(
      "Please sign in with an authorized admin account.",
      401
    );
  }

  const { data: admin, error: roleError } =
    await client
      .from("admin_users")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

  if (roleError) {
    throw new SettingsAccessError(
      "Unable to verify administrator access.",
      500
    );
  }

  if (
    !admin ||
    (admin.role !== "owner" &&
      admin.role !== "manager")
  ) {
    throw new SettingsAccessError(
      "Administrator access is required.",
      403
    );
  }

  return {
    client,
    role: admin.role,
  };
}

// Read actual saved settings.
// Database RLS protects the read operation.
export async function loadSavedSettings(
  client: SupabaseClient
) {
  const { data, error } = await client
    .from("business_settings")
    .select("config, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    if (
      error.code === "42P01" ||
      error.code === "PGRST205"
    ) {
      throw new SettingsAccessError(
        "Business settings database migration is required. Apply 20261028010000_business_settings.sql in Supabase.",
        503
      );
    }

    throw error;
  }

  if (!data) {
    throw new SettingsAccessError(
      "Business settings are not initialized. Apply the required Supabase migration.",
      503
    );
  }

  if (!isBusinessSettings(data.config)) {
    throw new SettingsAccessError(
      "Saved settings are invalid. Refresh or contact an owner.",
      500
    );
  }

  if (
    typeof data.updated_at !== "string" ||
    Number.isNaN(Date.parse(data.updated_at))
  ) {
    throw new SettingsAccessError(
      "Saved settings have an invalid update timestamp.",
      500
    );
  }

  return {
    settings: data.config,
    updatedAt: data.updated_at,
  };
}

// Public fallback includes only public profile fields.
// Operational availability defaults to disabled
// when the actual database state is unavailable.
export function getPublicProfileFallback() {
  return {
    businessName: DEFAULT_BUSINESS_SETTINGS.businessName,
    tagline: DEFAULT_BUSINESS_SETTINGS.tagline,
    email: DEFAULT_BUSINESS_SETTINGS.email,
    phone: DEFAULT_BUSINESS_SETTINGS.phone,
    whatsapp: DEFAULT_BUSINESS_SETTINGS.whatsapp,
    address: DEFAULT_BUSINESS_SETTINGS.address,
    facebookUrl: DEFAULT_BUSINESS_SETTINGS.facebookUrl,
    instagramUrl: DEFAULT_BUSINESS_SETTINGS.instagramUrl,
    logoUrl: DEFAULT_BUSINESS_SETTINGS.logoUrl,

    // Fail closed when configuration is unavailable.
    deliveryAvailable: false,

    deliveryInstructions:
      DEFAULT_BUSINESS_SETTINGS.deliveryInstructions,
    estimatedDelivery:
      DEFAULT_BUSINESS_SETTINGS.estimatedDelivery,
    serviceAreas:
      DEFAULT_BUSINESS_SETTINGS.serviceAreas,

    // Fail closed when configuration is unavailable.
    bookingAvailable: false,

    bookingInstructions:
      DEFAULT_BUSINESS_SETTINGS.bookingInstructions,
    businessHours:
      DEFAULT_BUSINESS_SETTINGS.businessHours,
    bookingConfirmation:
      DEFAULT_BUSINESS_SETTINGS.bookingConfirmation,

    showTagline:
      DEFAULT_BUSINESS_SETTINGS.showTagline,
    announcementEnabled:
      DEFAULT_BUSINESS_SETTINGS.announcementEnabled,
    announcementText:
      DEFAULT_BUSINESS_SETTINGS.announcementText,
  };
}

export function settingsErrorCode(
  error: unknown
): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return undefined;
}

export function settingsErrorName(
  error: unknown
): string {
  return error instanceof Error
    ? error.name
    : "UnknownError";
}

// CRITICAL SECURITY RULE:
// Never allow orders or bookings to continue
// when availability cannot be verified.
//
// The function now returns only boolean.
// Missing RPC, missing database configuration,
// or other errors result in HTTP 503 through
// the caller's SettingsAccessError handler.
export async function readPublicAvailability(
  kind: "delivery" | "booking"
): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new SettingsAccessError(
      "Business configuration is unavailable.",
      503
    );
  }

  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await client.rpc(
    "get_public_business_profile"
  );

  // Do not return null if the RPC is unavailable.
  // An unavailable settings service must not
  // allow customers to bypass availability rules.
  if (error) {
    console.error(
      "Business availability verification failed:",
      {
        code: settingsErrorCode(error),
      }
    );

    throw new SettingsAccessError(
      "Business availability could not be verified.",
      503
    );
  }

  if (!isRecord(data)) {
    throw new SettingsAccessError(
      "Business availability could not be verified.",
      503
    );
  }

  const value =
    kind === "delivery"
      ? data.deliveryAvailable
      : data.bookingAvailable;

  if (typeof value !== "boolean") {
    throw new SettingsAccessError(
      "Business availability could not be verified.",
      503
    );
  }

  return value;
}
