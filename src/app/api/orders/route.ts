import { NextResponse } from "next/server";
import {
  createClient,
  type PostgrestError,
} from "@supabase/supabase-js";
import {
  readPublicAvailability,
  SettingsAccessError,
} from "@/lib/admin/settings-data";

type OrderItem = {
  id: string;
  quantity: number;
};

type OrderRequest = {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryArea: string;
  notes: string;
  items: OrderItem[];
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PHONE_REGEX = /^(\+?88)?01[3-9][0-9]{8}$/;

const MAX_REQUEST_SIZE = 15_000;

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function validateOrder(
  body: unknown
):
  | { success: true; order: OrderRequest }
  | { success: false; message: string } {
  if (!isRecord(body)) {
    return {
      success: false,
      message: "Invalid order information.",
    };
  }

  const {
    customerName,
    customerPhone,
    deliveryAddress,
    deliveryArea,
    notes,
    items,
  } = body;

  if (
    typeof customerName !== "string" ||
    customerName.trim().length < 2 ||
    customerName.trim().length > 100
  ) {
    return {
      success: false,
      message: "Please enter a valid customer name.",
    };
  }

  if (
    typeof customerPhone !== "string" ||
    !PHONE_REGEX.test(customerPhone.trim())
  ) {
    return {
      success: false,
      message: "Please enter a valid Bangladesh phone number.",
    };
  }

  if (
    typeof deliveryAddress !== "string" ||
    deliveryAddress.trim().length < 8 ||
    deliveryAddress.trim().length > 500
  ) {
    return {
      success: false,
      message: "Please enter a complete delivery address.",
    };
  }

  if (
    deliveryArea !== undefined &&
    (typeof deliveryArea !== "string" ||
      deliveryArea.trim().length > 100)
  ) {
    return {
      success: false,
      message: "Invalid delivery area.",
    };
  }

  if (
    notes !== undefined &&
    (typeof notes !== "string" ||
      notes.trim().length > 1000)
  ) {
    return {
      success: false,
      message: "Order notes are too long.",
    };
  }

  if (
    !Array.isArray(items) ||
    items.length < 1 ||
    items.length > 20
  ) {
    return {
      success: false,
      message: "Cart must contain 1 to 20 products.",
    };
  }

  const validatedItems: OrderItem[] = [];
  const productIds = new Set<string>();

  for (const item of items) {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      !UUID_REGEX.test(item.id) ||
      !Number.isSafeInteger(item.quantity) ||
      typeof item.quantity !== "number" ||
      item.quantity < 1 ||
      item.quantity > 99
    ) {
      return {
        success: false,
        message: "Your cart contains an invalid product.",
      };
    }

    const id = item.id.toLowerCase();

    if (productIds.has(id)) {
      return {
        success: false,
        message: "Duplicate products were found in your cart.",
      };
    }

    productIds.add(id);

    validatedItems.push({
      id,
      quantity: item.quantity,
    });
  }

  return {
    success: true,
    order: {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      deliveryArea:
        typeof deliveryArea === "string"
          ? deliveryArea.trim()
          : "",
      notes:
        typeof notes === "string"
          ? notes.trim()
          : "",
      items: validatedItems,
    },
  };
}

function redactOrderDetails(
  value: string | null,
  order: OrderRequest
) {
  if (!value) return null;

  let redacted = value;

  for (const sensitiveValue of [
    order.customerName,
    order.customerPhone,
    order.deliveryAddress,
    order.deliveryArea,
    order.notes,
  ]) {
    if (sensitiveValue) {
      redacted = redacted.replaceAll(
        sensitiveValue,
        "[redacted]"
      );
    }
  }

  return redacted
    .replace(/(?:\+?88)?01[3-9]\d{8}/g, "[redacted]")
    .slice(0, 1000);
}

function databaseErrorResponse(
  error: PostgrestError,
  order: OrderRequest
) {
  const message = error.message;

  console.error("Order RPC failed:", {
    code: error.code,
    message: redactOrderDetails(message, order),
    details: redactOrderDetails(error.details, order),
    hint: redactOrderDetails(error.hint, order),
  });

  if (
    message.includes("Too many recent orders")
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Too many orders from this phone number. Please try again later.",
      },
      { status: 429 }
    );
  }

  if (
    message.includes("Insufficient stock") ||
    message.includes("no longer available")
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "A product is out of stock or no longer available. Please review your cart.",
      },
      { status: 409 }
    );
  }

  if (
    message.includes("Invalid") ||
    message.includes("Duplicate product") ||
    message.includes("Cart must contain")
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Some order details are invalid. Please check and try again.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      message:
        "Unable to place your order right now. Please try again.",
    },
    { status: 500 }
  );
}

export async function POST(request: Request) {
  try {
    // Accept JSON requests only
    const contentType =
      request.headers.get("content-type") ?? "";

    if (
      !/^application\/json(?:\s*;|$)/i.test(contentType)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Content-Type must be application/json.",
        },
        { status: 415 }
      );
    }

    // Basic request size restriction
    const contentLength = Number(
      request.headers.get("content-length") ?? "0"
    );

    if (
      contentLength > MAX_REQUEST_SIZE
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Order request is too large.",
        },
        { status: 413 }
      );
    }

    const rawBody = await request.text();

    if (rawBody.length > MAX_REQUEST_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: "Order request is too large.",
        },
        { status: 413 }
      );
    }

    let body: unknown;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON request.",
        },
        { status: 400 }
      );
    }

    // Validate all customer and cart inputs
    const validation = validateOrder(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: validation.message,
        },
        { status: 400 }
      );
    }

    let deliveryAvailable: boolean | null;
    try {
      deliveryAvailable = await readPublicAvailability("delivery");
    } catch (error) {
      if (error instanceof SettingsAccessError) {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: error.status }
        );
      }
      throw error;
    }
    if (deliveryAvailable === false) {
      return NextResponse.json(
        {
          success: false,
          message: "Delivery orders are temporarily unavailable.",
        },
        { status: 409 }
      );
    }

    // Server-only Supabase credentials
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      console.error(
        "Order API: Supabase server configuration missing."
      );

      return NextResponse.json(
        {
          success: false,
          message: "Order service is not configured.",
        },
        { status: 503 }
      );
    }

    // Privileged client stays on the server.
    const supabase = createClient(
      supabaseUrl,
      supabaseSecretKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    const order = validation.order;

    // Database RPC handles:
    // 1. Published product validation
    // 2. Current database pricing
    // 3. Stock checks and reservation
    // 4. Atomic order and order_items creation
    // 5. Per-phone order rate limit
    const { data, error } = await supabase.rpc(
      "create_order_request",
      {
        p_customer_name: order.customerName,
        p_customer_phone: order.customerPhone,
        p_delivery_address: order.deliveryAddress,
        p_delivery_area: order.deliveryArea,
        p_notes: order.notes,
        p_items: order.items,
      }
    );

    if (error) {
      return databaseErrorResponse(error, order);
    }

    // Function returns the newly created order UUID.
    if (
      typeof data !== "string" ||
      !UUID_REGEX.test(data)
    ) {
      console.error(
        "Order API: Invalid database response."
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Order status could not be confirmed. Please contact support before retrying.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Your order has been placed successfully.",
        orderId: data,
        status: "pending",
        paymentMethod: "cod",
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Order API unexpected error:",
      error instanceof Error
        ? error.name
        : "Unknown error"
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "An unexpected error occurred. Please try again later.",
      },
      { status: 500 }
    );
  }
}
