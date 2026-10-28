BEGIN;

CREATE OR REPLACE FUNCTION public.admin_update_order(
  p_order_id uuid,
  p_admin_user_id uuid,
  p_new_status text,
  p_update_delivery_fee boolean DEFAULT false,
  p_delivery_fee numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_delivery_fee numeric;
  v_product_id uuid;
BEGIN
  IF p_admin_user_id IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM public.admin_users AS admin
       WHERE admin.user_id = p_admin_user_id
         AND admin.role IN ('owner', 'manager')
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Administrator access is required.';
  END IF;

  IF p_new_status IS NULL
     OR p_new_status NOT IN (
       'pending',
       'confirmed',
       'processing',
       'shipped',
       'delivered',
       'cancelled'
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Invalid order status.';
  END IF;

  IF p_update_delivery_fee THEN
    IF p_delivery_fee IS NULL
       OR p_delivery_fee::text IN ('NaN', 'Infinity', '-Infinity')
       OR p_delivery_fee < 0
       OR p_delivery_fee <> round(p_delivery_fee, 2) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'Delivery fee must be non-negative with at most two decimal places.';
    END IF;
  ELSIF p_delivery_fee IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Delivery fee update flag is invalid.';
  END IF;

  SELECT order_row.*
  INTO v_order
  FROM public.orders AS order_row
  WHERE order_row.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Order not found.';
  END IF;

  IF p_new_status = v_order.status THEN
    IF NOT p_update_delivery_fee THEN
      RETURN;
    END IF;
  ELSIF NOT (
    (v_order.status = 'pending'
      AND p_new_status IN ('confirmed', 'cancelled'))
    OR (v_order.status = 'confirmed'
      AND p_new_status IN ('processing', 'cancelled'))
    OR (v_order.status = 'processing'
      AND p_new_status IN ('shipped', 'cancelled'))
    OR (v_order.status = 'shipped'
      AND p_new_status = 'delivered')
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'This order status transition is not allowed.';
  END IF;

  IF p_update_delivery_fee
     AND (
       v_order.status NOT IN ('pending', 'confirmed')
       OR p_new_status IN ('cancelled', 'delivered')
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Delivery fee can only be updated before order processing.';
  END IF;

  v_delivery_fee := CASE
    WHEN p_update_delivery_fee THEN p_delivery_fee
    ELSE v_order.delivery_fee
  END;

  IF p_new_status = 'confirmed' AND v_delivery_fee IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'A delivery fee is required before confirming an order.';
  END IF;

  IF p_new_status = 'cancelled' THEN
    FOR v_product_id IN
      SELECT product.id
      FROM public.products AS product
      WHERE product.id IN (
        SELECT order_item.product_id
        FROM public.order_items AS order_item
        WHERE order_item.order_id = p_order_id
          AND order_item.product_id IS NOT NULL
      )
      ORDER BY product.id
      FOR UPDATE
    LOOP
      UPDATE public.products AS product
      SET stock = product.stock + (
        SELECT sum(order_item.quantity)::integer
        FROM public.order_items AS order_item
        WHERE order_item.order_id = p_order_id
          AND order_item.product_id = v_product_id
      )
      WHERE product.id = v_product_id;
    END LOOP;
  END IF;

  UPDATE public.orders AS order_row
  SET
    status = p_new_status,
    delivery_fee = v_delivery_fee,
    total = CASE
      WHEN v_delivery_fee IS NULL THEN NULL
      ELSE order_row.subtotal + v_delivery_fee
    END,
    updated_at = pg_catalog.now()
  WHERE order_row.id = p_order_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_update_order(
  uuid, uuid, text, boolean, numeric
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_update_order(
  uuid, uuid, text, boolean, numeric
) TO service_role;

COMMIT;
