import { connection, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getPublicProfileFallback,
  settingsErrorCode,
} from "@/lib/admin/settings-data";
import type { PublicBusinessProfile } from "@/lib/admin/settings-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isPublicProfile(value: unknown): value is PublicBusinessProfile {
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
  return (
    stringKeys.every((key) => typeof value[key] === "string") &&
    typeof value.deliveryAvailable === "boolean" &&
    typeof value.bookingAvailable === "boolean" &&
    typeof value.showTagline === "boolean" &&
    typeof value.announcementEnabled === "boolean" &&
    Array.isArray(value.serviceAreas) &&
    value.serviceAreas.every((area) => typeof area === "string")
  );
}

export async function GET() {
  await connection();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return NextResponse.json(getPublicProfileFallback(), {
      headers: { "Cache-Control": "no-store" },
    });
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
  if (error) {
    if (
      error.code === "PGRST202" ||
      error.code === "42883" ||
      error.code === "42P01"
    ) {
      return NextResponse.json(getPublicProfileFallback(), {
        headers: { "Cache-Control": "no-store" },
      });
    }
    console.error("Public business profile read failed:", {
      code: settingsErrorCode(error),
    });
    return NextResponse.json(
      { message: "Unable to load business profile." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
  if (!isPublicProfile(data)) {
    console.error("Public business profile response was invalid.");
    return NextResponse.json(
      { message: "Unable to load business profile." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
