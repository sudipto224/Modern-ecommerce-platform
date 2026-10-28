import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

type OrderStatus = (typeof ORDER_STATUSES)[number];

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

function isOrderStatus(value: string): value is OrderStatus {
  return ORDER_STATUSES.some((status) => status === value);
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

function errorResponse(
  message: string,
  status: number
) {
  return NextResponse.json(
    { success: false, message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  const origin = request.headers.get("origin");

  if (
    origin &&
    origin !== new URL(request.url).origin
  ) {
    return errorResponse("Invalid request origin.", 403);
  }

  if (
    !/^application\/json(?:\s*;|$)/i.test(
      request.headers.get("content-type") ?? ""
    )
  ) {
    return errorResponse(
      "Content-Type must be application/json.",
      415
    );
  }

  const contentLength = Number(
    request.headers.get("content-length") ?? "0"
  );
  if (contentLength > 4_000) {
    return errorResponse("Request is too large.", 413);
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 4_000) {
      return errorResponse("Request is too large.", 413);
    }
    body = JSON.parse(rawBody);
  } catch {
    return errorResponse("Invalid JSON request.", 400);
  }

  if (!isRecord(body)) {
    return errorResponse("Invalid order update.", 400);
  }

  const { orderId } = await context.params;
  if (!UUID_REGEX.test(orderId)) {
    return errorResponse("Invalid order ID.", 400);
  }

  const status = body.status;
  if (
    typeof status !== "string" ||
    !isOrderStatus(status)
  ) {
    return errorResponse("Invalid order status.", 400);
  }

  const updateDeliveryFee =
    Object.hasOwn(body, "deliveryFee");
  let deliveryFee: string | null = null;

  if (updateDeliveryFee) {
    if (
      typeof body.deliveryFee !== "string" ||
      body.deliveryFee.length > 32 ||
      !/^\d+(?:\.\d{1,2})?$/.test(body.deliveryFee) ||
      !Number.isFinite(Number(body.deliveryFee))
    ) {
      return errorResponse(
        "Enter a non-negative delivery fee with no more than two decimal places.",
        400
      );
    }
    deliveryFee = body.deliveryFee;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !publishableKey || !secretKey) {
    console.error("Admin order API configuration is missing.");
    return errorResponse(
      "Order management is not configured.",
      503
    );
  }

  try {
    const cookieStore = await cookies();
    const sessionClient = createServerClient(
      supabaseUrl,
      publishableKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await sessionClient.auth.getUser();

    if (authError || !user) {
      return errorResponse(
        "Please sign in with an authorized admin account.",
        401
      );
    }

    const { data: admin, error: roleError } =
      await sessionClient
        .from("admin_users")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

    if (roleError) {
      console.error("Admin order role verification failed:", {
        code: roleError.code,
      });
      return errorResponse(
        "Unable to verify administrator access.",
        500
      );
    }

    if (!admin || !["owner", "manager"].includes(admin.role)) {
      return errorResponse(
        "Only authorized owners and managers can update orders.",
        403
      );
    }

    const serviceClient = createClient(
      supabaseUrl,
      secretKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    const { error: rpcError } = await serviceClient.rpc(
      "admin_update_order",
      {
        p_order_id: orderId,
        p_admin_user_id: user.id,
        p_new_status: status,
        p_update_delivery_fee: updateDeliveryFee,
        p_delivery_fee: deliveryFee,
      }
    );

    if (rpcError) {
      console.error("Admin order update RPC failed:", {
        code: rpcError.code,
        message: rpcError.message,
      });

      switch (rpcError.code) {
        case "42501":
          return errorResponse(
            "Administrator access is required.",
            403
          );
        case "P0002":
          return errorResponse("Order not found.", 404);
        case "22023":
        case "23514":
          return errorResponse(rpcError.message, 409);
        default:
          return errorResponse(
            "Unable to update the order. Please try again.",
            500
          );
      }
    }

    return NextResponse.json(
      { success: true, message: "Order updated successfully." },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Admin order API failed:", {
      errorName:
        error instanceof Error ? error.name : "UnknownError",
    });
    return errorResponse(
      "Unable to update the order. Please try again.",
      500
    );
  }
}
