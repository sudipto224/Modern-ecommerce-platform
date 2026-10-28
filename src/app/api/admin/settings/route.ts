import { connection, NextResponse } from "next/server";
import {
  createSettingsSession,
  loadSavedSettings,
  settingsErrorCode,
  settingsErrorName,
  SettingsAccessError,
} from "@/lib/admin/settings-data";
import type { BusinessSettings } from "@/lib/admin/settings-types";

const MAX_BODY_SIZE = 12_000;
const SETTINGS_KEYS = [
  "businessName",
  "tagline",
  "email",
  "phone",
  "whatsapp",
  "address",
  "facebookUrl",
  "instagramUrl",
  "logoUrl",
  "deliveryAvailable",
  "defaultDeliveryCharge",
  "deliveryInstructions",
  "estimatedDelivery",
  "serviceAreas",
  "bookingAvailable",
  "bookingInstructions",
  "businessHours",
  "bookingConfirmation",
  "showTagline",
  "announcementEnabled",
  "announcementText",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isHttpUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.username.length === 0 &&
      url.password.length === 0 &&
      url.hostname.includes(".")
    );
  } catch {
    return false;
  }
}

function validateSettings(value: unknown):
  | { success: true; settings: BusinessSettings }
  | { success: false; message: string } {
  if (!isRecord(value)) {
    return { success: false, message: "Settings must be an object." };
  }

  const keys = Object.keys(value);
  if (
    keys.length !== SETTINGS_KEYS.length ||
    keys.some(
      (key) => !SETTINGS_KEYS.some((settingKey) => settingKey === key)
    )
  ) {
    return {
      success: false,
      message: "Settings contain missing or unsupported fields.",
    };
  }

  const stringLimits: Array<[keyof BusinessSettings, number]> = [
    ["businessName", 120],
    ["tagline", 180],
    ["email", 254],
    ["phone", 32],
    ["whatsapp", 32],
    ["address", 500],
    ["facebookUrl", 2048],
    ["instagramUrl", 2048],
    ["logoUrl", 2048],
    ["deliveryInstructions", 500],
    ["estimatedDelivery", 120],
    ["bookingInstructions", 500],
    ["businessHours", 300],
    ["bookingConfirmation", 300],
    ["announcementText", 180],
  ];

  for (const [key, maximum] of stringLimits) {
    const field = value[key];
    if (
      typeof field !== "string" ||
      field.length > maximum ||
      (key === "businessName" && field.trim().length < 2)
    ) {
      return {
        success: false,
        message: `${key} must be a valid text value of no more than ${maximum} characters.`,
      };
    }
  }

  const getString = (key: keyof BusinessSettings): string => {
    const field = value[key];
    return typeof field === "string" ? field : "";
  };
  const getBoolean = (
    key:
      | "deliveryAvailable"
      | "bookingAvailable"
      | "showTagline"
      | "announcementEnabled"
  ): boolean => value[key] === true;

  const email = getString("email");
  if (
    email !== "" &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return { success: false, message: "Enter a valid business email." };
  }

  for (const key of ["phone", "whatsapp"] as const) {
    if (!/^[+0-9 ()-]*$/.test(getString(key))) {
      return {
        success: false,
        message: "Phone fields may contain only digits, spaces, and + ( ) -.",
      };
    }
  }

  for (const key of [
    "facebookUrl",
    "instagramUrl",
    "logoUrl",
  ] as const) {
    if (!isHttpUrl(getString(key))) {
      return {
        success: false,
        message: `${key} must be blank or a valid HTTPS URL.`,
      };
    }
  }

  for (const key of [
    "deliveryAvailable",
    "bookingAvailable",
    "showTagline",
    "announcementEnabled",
  ] as const) {
    if (typeof value[key] !== "boolean") {
      return {
        success: false,
        message: `${key} must be enabled or disabled.`,
      };
    }
  }

  const charge = value.defaultDeliveryCharge;
  if (
    charge !== null &&
    (typeof charge !== "number" ||
      !Number.isFinite(charge) ||
      charge < 0 ||
      Math.round(charge * 100) !== charge * 100)
  ) {
    return {
      success: false,
      message:
        "Default delivery charge must be blank or a non-negative amount with at most two decimals.",
    };
  }

  const areas = value.serviceAreas;
  if (
    !Array.isArray(areas) ||
    areas.length > 30 ||
    !areas.every(
      (area) =>
        typeof area === "string" &&
        area.trim().length >= 1 &&
        area.trim().length <= 100
    )
  ) {
    return {
      success: false,
      message: "Enter up to 30 service areas, each 1 to 100 characters.",
    };
  }
  const businessName = getString("businessName").trim();
  const chargeValue =
    typeof charge === "number" && Number.isFinite(charge) ? charge : null;

  return {
    success: true,
    settings: {
      businessName,
      tagline: getString("tagline"),
      email,
      phone: getString("phone"),
      whatsapp: getString("whatsapp"),
      address: getString("address"),
      facebookUrl: getString("facebookUrl"),
      instagramUrl: getString("instagramUrl"),
      logoUrl: getString("logoUrl"),
      deliveryAvailable: getBoolean("deliveryAvailable"),
      defaultDeliveryCharge: chargeValue,
      deliveryInstructions: getString("deliveryInstructions"),
      estimatedDelivery: getString("estimatedDelivery"),
      serviceAreas: areas.flatMap((area) =>
        typeof area === "string" ? [area.trim()] : []
      ),
      bookingAvailable: getBoolean("bookingAvailable"),
      bookingInstructions: getString("bookingInstructions"),
      businessHours: getString("businessHours"),
      bookingConfirmation: getString("bookingConfirmation"),
      showTagline: getBoolean("showTagline"),
      announcementEnabled: getBoolean("announcementEnabled"),
      announcementText: getString("announcementText"),
    },
  };
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { message },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

async function readJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    throw new SettingsAccessError(
      "Content-Type must be application/json.",
      415
    );
  }
  const contentLength = Number(
    request.headers.get("content-length") ?? "0"
  );
  if (contentLength > MAX_BODY_SIZE) {
    throw new SettingsAccessError("Settings request is too large.", 413);
  }
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_SIZE) {
    throw new SettingsAccessError("Settings request is too large.", 413);
  }
  try {
    return JSON.parse(rawBody);
  } catch {
    throw new SettingsAccessError("Invalid JSON request.", 400);
  }
}

export async function GET() {
  await connection();
  try {
    const { client, role } = await createSettingsSession();
    const saved = await loadSavedSettings(client);
    return NextResponse.json(
      { ...saved, canEdit: role === "owner" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof SettingsAccessError) {
      return errorResponse(error.message, error.status);
    }
    console.error("Admin settings read failed:", {
      code: settingsErrorCode(error),
      errorName: settingsErrorName(error),
    });
    return errorResponse("Unable to load business settings.", 500);
  }
}

export async function PUT(request: Request) {
  await connection();
  try {
    const { client, role } = await createSettingsSession();
    if (role !== "owner") {
      return errorResponse(
        "Only owner accounts can change business settings.",
        403
      );
    }

    const body = await readJson(request);
    if (!isRecord(body) || typeof body.expectedUpdatedAt !== "string") {
      return errorResponse(
        "Settings update requires the latest saved version.",
        400
      );
    }
    const validation = validateSettings(body.settings);
    if (!validation.success) {
      return errorResponse(validation.message, 400);
    }

    const { data, error } = await client.rpc(
      "admin_update_business_settings",
      {
        p_expected_updated_at: body.expectedUpdatedAt,
        p_settings: validation.settings,
      }
    );
    if (error) {
      if (error.code === "42501") {
        return errorResponse(
          "Only owner accounts can change business settings.",
          403
        );
      }
      if (error.code === "40001") {
        return errorResponse(
          "Settings were changed elsewhere. Refresh before saving.",
          409
        );
      }
      if (
        error.code === "PGRST202" ||
        error.code === "42883" ||
        error.code === "42P01"
      ) {
        return errorResponse(
          "Business settings migration is required. Apply 20261028010000_business_settings.sql in Supabase.",
          503
        );
      }
      console.error("Admin settings update failed:", {
        code: error.code,
      });
      return errorResponse("Unable to save business settings.", 500);
    }
    if (typeof data !== "string" || Number.isNaN(Date.parse(data))) {
      return errorResponse(
        "Settings update could not be confirmed.",
        500
      );
    }

    return NextResponse.json(
      {
        settings: validation.settings,
        updatedAt: data,
        canEdit: true,
        message: "Business settings saved.",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof SettingsAccessError) {
      return errorResponse(error.message, error.status);
    }
    console.error("Admin settings write failed:", {
      code: settingsErrorCode(error),
      errorName: settingsErrorName(error),
    });
    return errorResponse("Unable to save business settings.", 500);
  }
}
