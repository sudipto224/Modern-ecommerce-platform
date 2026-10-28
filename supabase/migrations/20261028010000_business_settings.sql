BEGIN;

CREATE TABLE IF NOT EXISTS public.business_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  config jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp()
);

INSERT INTO public.business_settings (id, config)
VALUES (
  1,
  '{
    "businessName": "Mehedi By Meherin",
    "tagline": "",
    "email": "",
    "phone": "",
    "whatsapp": "",
    "address": "",
    "facebookUrl": "",
    "instagramUrl": "",
    "logoUrl": "",
    "deliveryAvailable": true,
    "defaultDeliveryCharge": null,
    "deliveryInstructions": "",
    "estimatedDelivery": "",
    "serviceAreas": [],
    "bookingAvailable": true,
    "bookingInstructions": "",
    "businessHours": "",
    "bookingConfirmation": "",
    "showTagline": false,
    "announcementEnabled": false,
    "announcementText": ""
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_settings_admin_read
  ON public.business_settings;
CREATE POLICY business_settings_admin_read
  ON public.business_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users AS admin
      WHERE admin.user_id = (SELECT auth.uid())
        AND admin.role IN ('owner', 'manager')
    )
  );

REVOKE ALL ON TABLE public.business_settings FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.business_settings FROM authenticated;
GRANT SELECT ON TABLE public.business_settings TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_business_profile()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
  SELECT pg_catalog.jsonb_build_object(
    'businessName', config -> 'businessName',
    'tagline', config -> 'tagline',
    'email', config -> 'email',
    'phone', config -> 'phone',
    'whatsapp', config -> 'whatsapp',
    'address', config -> 'address',
    'facebookUrl', config -> 'facebookUrl',
    'instagramUrl', config -> 'instagramUrl',
    'logoUrl', config -> 'logoUrl',
    'deliveryAvailable', config -> 'deliveryAvailable',
    'deliveryInstructions', config -> 'deliveryInstructions',
    'estimatedDelivery', config -> 'estimatedDelivery',
    'serviceAreas', config -> 'serviceAreas',
    'bookingAvailable', config -> 'bookingAvailable',
    'bookingInstructions', config -> 'bookingInstructions',
    'businessHours', config -> 'businessHours',
    'bookingConfirmation', config -> 'bookingConfirmation',
    'showTagline', config -> 'showTagline',
    'announcementEnabled', config -> 'announcementEnabled',
    'announcementText', config -> 'announcementText'
  )
  FROM public.business_settings
  WHERE id = 1;
$function$;

REVOKE ALL ON FUNCTION public.get_public_business_profile()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_business_profile()
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_business_settings(
  p_expected_updated_at timestamptz,
  p_settings jsonb
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
DECLARE
  v_current_updated_at timestamptz;
  v_updated_at timestamptz;
  v_charge numeric;
  v_area jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.admin_users AS admin
    WHERE admin.user_id = auth.uid()
      AND admin.role = 'owner'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Only an authorized owner may change business settings.';
  END IF;

  IF p_settings IS NULL OR pg_catalog.jsonb_typeof(p_settings) <> 'object' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Settings must be a JSON object.';
  END IF;

  IF (SELECT COUNT(*) FROM pg_catalog.jsonb_object_keys(p_settings)) <> 21 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Settings are incomplete.';
  END IF;

  IF (p_settings - ARRAY[
    'businessName', 'tagline', 'email', 'phone', 'whatsapp', 'address',
    'facebookUrl', 'instagramUrl', 'logoUrl', 'deliveryAvailable',
    'defaultDeliveryCharge', 'deliveryInstructions', 'estimatedDelivery',
    'serviceAreas', 'bookingAvailable', 'bookingInstructions',
    'businessHours', 'bookingConfirmation', 'showTagline',
    'announcementEnabled', 'announcementText'
  ]) <> '{}'::jsonb THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Settings contain unsupported fields.';
  END IF;

  IF pg_catalog.jsonb_typeof(p_settings -> 'businessName') <> 'string'
     OR pg_catalog.char_length(p_settings ->> 'businessName') NOT BETWEEN 2 AND 120
     OR pg_catalog.jsonb_typeof(p_settings -> 'tagline') <> 'string'
     OR pg_catalog.char_length(p_settings ->> 'tagline') > 180
     OR pg_catalog.jsonb_typeof(p_settings -> 'email') <> 'string'
     OR pg_catalog.char_length(p_settings ->> 'email') > 254
     OR pg_catalog.jsonb_typeof(p_settings -> 'phone') <> 'string'
     OR pg_catalog.char_length(p_settings ->> 'phone') > 32
     OR pg_catalog.jsonb_typeof(p_settings -> 'whatsapp') <> 'string'
     OR pg_catalog.char_length(p_settings ->> 'whatsapp') > 32
     OR pg_catalog.jsonb_typeof(p_settings -> 'address') <> 'string'
     OR pg_catalog.char_length(p_settings ->> 'address') > 500
     OR pg_catalog.jsonb_typeof(p_settings -> 'deliveryInstructions') <> 'string'
     OR pg_catalog.char_length(p_settings ->> 'deliveryInstructions') > 500
     OR pg_catalog.jsonb_typeof(p_settings -> 'estimatedDelivery') <> 'string'
     OR pg_catalog.char_length(p_settings ->> 'estimatedDelivery') > 120
     OR pg_catalog.jsonb_typeof(p_settings -> 'bookingInstructions') <> 'string'
     OR pg_catalog.char_length(p_settings ->> 'bookingInstructions') > 500
     OR pg_catalog.jsonb_typeof(p_settings -> 'businessHours') <> 'string'
     OR pg_catalog.char_length(p_settings ->> 'businessHours') > 300
     OR pg_catalog.jsonb_typeof(p_settings -> 'bookingConfirmation') <> 'string'
     OR pg_catalog.char_length(p_settings ->> 'bookingConfirmation') > 300
     OR pg_catalog.jsonb_typeof(p_settings -> 'announcementText') <> 'string'
     OR pg_catalog.char_length(p_settings ->> 'announcementText') > 180 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'One or more text settings are invalid or too long.';
  END IF;

  IF pg_catalog.jsonb_typeof(p_settings -> 'deliveryAvailable') <> 'boolean'
     OR pg_catalog.jsonb_typeof(p_settings -> 'bookingAvailable') <> 'boolean'
     OR pg_catalog.jsonb_typeof(p_settings -> 'showTagline') <> 'boolean'
     OR pg_catalog.jsonb_typeof(p_settings -> 'announcementEnabled') <> 'boolean' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Availability and website preference settings must be boolean.';
  END IF;

  IF pg_catalog.jsonb_typeof(p_settings -> 'serviceAreas') <> 'array'
     OR pg_catalog.jsonb_array_length(p_settings -> 'serviceAreas') > 30 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Service areas must be an array containing at most 30 entries.';
  END IF;

  FOR v_area IN
    SELECT value FROM pg_catalog.jsonb_array_elements(p_settings -> 'serviceAreas')
  LOOP
    IF pg_catalog.jsonb_typeof(v_area) <> 'string'
       OR pg_catalog.char_length(v_area #>> '{}') NOT BETWEEN 1 AND 100 THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'Each service area must contain 1 to 100 characters.';
    END IF;
  END LOOP;

  IF pg_catalog.jsonb_typeof(p_settings -> 'defaultDeliveryCharge') = 'number' THEN
    BEGIN
      v_charge := (p_settings ->> 'defaultDeliveryCharge')::numeric;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'Default delivery charge must be a valid amount.';
    END;
    IF v_charge < 0 OR v_charge <> pg_catalog.round(v_charge, 2) THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'Default delivery charge must be non-negative with at most two decimals.';
    END IF;
  ELSIF pg_catalog.jsonb_typeof(p_settings -> 'defaultDeliveryCharge') <> 'null' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Default delivery charge must be an amount or null.';
  END IF;

  IF (p_settings ->> 'businessName') <> pg_catalog.btrim(p_settings ->> 'businessName')
     OR (p_settings ->> 'email') <> ''
        AND (p_settings ->> 'email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Business name or email address is invalid.';
  END IF;

  IF (p_settings ->> 'phone') !~ '^[+0-9 ()-]*$'
     OR (p_settings ->> 'whatsapp') !~ '^[+0-9 ()-]*$' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Phone fields may contain only digits, spaces, and + ( ) -.';
  END IF;

  IF (p_settings ->> 'facebookUrl') !~ '^$|^https://([A-Za-z0-9-]+\.)+[A-Za-z]{2,}(:[0-9]{1,5})?(/[^\s]*)?$'
     OR (p_settings ->> 'instagramUrl') !~ '^$|^https://([A-Za-z0-9-]+\.)+[A-Za-z]{2,}(:[0-9]{1,5})?(/[^\s]*)?$'
     OR (p_settings ->> 'logoUrl') !~ '^$|^https://([A-Za-z0-9-]+\.)+[A-Za-z]{2,}(:[0-9]{1,5})?(/[^\s]*)?$' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Social and logo URLs must be blank or HTTPS URLs.';
  END IF;

  SELECT updated_at
  INTO v_current_updated_at
  FROM public.business_settings
  WHERE id = 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Business settings are not initialized.';
  END IF;

  IF p_expected_updated_at IS NULL
     OR p_expected_updated_at IS DISTINCT FROM v_current_updated_at THEN
    RAISE EXCEPTION USING
      ERRCODE = '40001',
      MESSAGE = 'Settings changed since they were loaded. Refresh before saving.';
  END IF;

  UPDATE public.business_settings
  SET config = p_settings,
      updated_at = pg_catalog.statement_timestamp()
  WHERE id = 1
  RETURNING updated_at INTO v_updated_at;

  RETURN v_updated_at;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_update_business_settings(
  timestamptz, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_business_settings(
  timestamptz, jsonb
) TO authenticated;

COMMIT;
