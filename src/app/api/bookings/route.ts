import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  readPublicAvailability,
  SettingsAccessError,
} from "@/lib/admin/settings-data";

// Correct UUID format: 8-4-4-4-12
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

// Convert values into trimmed strings
function getText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// Validate a real calendar date
function isValidDate(value: string): boolean {
  if (!datePattern.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

// Get current Bangladesh date
function getBangladeshDate(): string {
  const bangladeshTime = new Date(
    Date.now() + 6 * 60 * 60 * 1000
  );

  return bangladeshTime.toISOString().slice(0, 10);
}

// JSON error response helper
function errorResponse(
  message: string,
  status: number
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

// Customer Booking API
export async function POST(request: NextRequest) {
  try {
    // 1. Verify request origin
    const origin = request.headers.get("origin");

    if (origin && origin !== request.nextUrl.origin) {
      return errorResponse(
        "Request origin not allowed.",
        403
      );
    }

    // 2. Require JSON request
    const contentType =
      request.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      return errorResponse(
        "JSON request required.",
        415
      );
    }

    // 3. Read request body
    const raw = await request.text();

    if (raw.length > 12000) {
      return errorResponse(
        "Request too large.",
        413
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch {
      return errorResponse(
        "Invalid JSON request.",
        400
      );
    }

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return errorResponse(
        "Invalid booking data.",
        400
      );
    }

    const body = parsed as Record<string, unknown>;

    // 4. Honeypot spam protection
    if (getText(body.website)) {
      return errorResponse(
        "Invalid request.",
        400
      );
    }

    // 5. Extract booking information
    const designId = getText(body.design_id);
    const customerName = getText(body.customer_name);
    const customerPhone = getText(body.customer_phone);
    const preferredDate = getText(body.preferred_date);
    const preferredTime = getText(body.preferred_time);
    const serviceAddress = getText(body.service_address);
    const notes = getText(body.notes);

    // 6. Validate design UUID
    if (!uuidPattern.test(designId)) {
      return errorResponse(
        "Please select a valid Henna Design.",
        400
      );
    }

    // 7. Validate customer name
    if (
      customerName.length < 2 ||
      customerName.length > 120
    ) {
      return errorResponse(
        "Please enter a valid full name.",
        400
      );
    }

    // 8. Validate phone number
    const phoneDigits = customerPhone.replace(/\D/g, "");

    const validPhone =
      /^\+?[0-9 ()-]+$/.test(customerPhone) &&
      phoneDigits.length >= 7 &&
      phoneDigits.length <= 15;

    if (!validPhone) {
      return errorResponse(
        "Please enter a valid phone number.",
        400
      );
    }

    // Normalize phone for consistent rate limiting
    const normalizedPhone = customerPhone.replace(
      /[\s()-]/g,
      ""
    );

    // 9. Validate booking date
    const today = getBangladeshDate();

    if (
      !isValidDate(preferredDate) ||
      preferredDate < today
    ) {
      return errorResponse(
        "Please select a valid future booking date.",
        400
      );
    }

    // 10. Validate booking time
    if (!timePattern.test(preferredTime)) {
      return errorResponse(
        "Please select a valid booking time.",
        400
      );
    }

    // 11. Validate service address
    if (
      serviceAddress.length < 10 ||
      serviceAddress.length > 500
    ) {
      return errorResponse(
        "Service address must contain 10 to 500 characters.",
        400
      );
    }

    // 12. Validate special instructions
    if (notes.length > 1000) {
      return errorResponse(
        "Special instructions are too long.",
        400
      );
    }

    try {
      const bookingAvailable =
        await readPublicAvailability("booking");
      if (bookingAvailable === false) {
        return errorResponse(
          "Booking requests are temporarily unavailable.",
          409
        );
      }
    } catch (error) {
      if (error instanceof SettingsAccessError) {
        return errorResponse(error.message, error.status);
      }
      throw error;
    }

    // 13. Read Supabase environment variables
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseSecret =
      process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecret) {
      console.error(
        "Booking API configuration missing.",
        {
          hasUrl: Boolean(supabaseUrl),
          hasSecret: Boolean(supabaseSecret),
        }
      );

      return errorResponse(
        "Booking service unavailable.",
        503
      );
    }

    // 14. Create secure server-only Supabase client
    const supabase = createClient(
      supabaseUrl,
      supabaseSecret,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 15. Save booking through database RPC
    const { data, error } = await supabase.rpc(
      "create_booking_request",
      {
        p_design_id: designId,
        p_customer_name: customerName,
        p_customer_phone: normalizedPhone,
        p_preferred_date: preferredDate,
        p_preferred_time: `${preferredTime}:00`,
        p_service_address: serviceAddress,
        p_notes: notes,
      }
    );

    // 16. Handle database errors
    if (error) {
      console.error("Booking database error:", {
        code: error.code,
      });

      // Phone-based booking rate limit
      if (error.message.includes("booking_rate_limit")) {
        return errorResponse(
          "Too many booking requests. Please try again later.",
          429
        );
      }

      // Unavailable design
      if (error.message.includes("design_unavailable")) {
        return errorResponse(
          "This Henna Design is no longer available.",
          400
        );
      }

      // Database permission errors
      if (error.code === "42501") {
        return errorResponse(
          "Booking database permission error.",
          500
        );
      }

      // Other database errors
      return errorResponse(
        "Unable to save booking.",
        500
      );
    }

    // 17. Check booking ID returned
    if (typeof data !== "string" || !uuidPattern.test(data)) {
      console.error("Booking RPC returned an invalid ID.");

      return errorResponse(
        "Unable to verify booking submission.",
        500
      );
    }

    // 18. Return successful submission
    return NextResponse.json(
      {
        success: true,
        booking_id: data,
        message:
          "Booking request submitted successfully!",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Booking API unexpected error:",
      error instanceof Error
        ? error.name
        : "Unknown server error"
    );

    return errorResponse(
      "Unable to process booking request.",
      500
    );
  }
}
