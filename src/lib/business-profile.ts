"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_BUSINESS_SETTINGS,
  type PublicBusinessProfile,
} from "@/lib/admin/settings-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isPublicBusinessProfile(
  value: unknown
): value is PublicBusinessProfile {
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

export function useBusinessProfile() {
  const [profile, setProfile] = useState<PublicBusinessProfile>({
    businessName: DEFAULT_BUSINESS_SETTINGS.businessName,
    tagline: DEFAULT_BUSINESS_SETTINGS.tagline,
    email: DEFAULT_BUSINESS_SETTINGS.email,
    phone: DEFAULT_BUSINESS_SETTINGS.phone,
    whatsapp: DEFAULT_BUSINESS_SETTINGS.whatsapp,
    address: DEFAULT_BUSINESS_SETTINGS.address,
    facebookUrl: DEFAULT_BUSINESS_SETTINGS.facebookUrl,
    instagramUrl: DEFAULT_BUSINESS_SETTINGS.instagramUrl,
    logoUrl: DEFAULT_BUSINESS_SETTINGS.logoUrl,
    deliveryAvailable: DEFAULT_BUSINESS_SETTINGS.deliveryAvailable,
    deliveryInstructions: DEFAULT_BUSINESS_SETTINGS.deliveryInstructions,
    estimatedDelivery: DEFAULT_BUSINESS_SETTINGS.estimatedDelivery,
    serviceAreas: DEFAULT_BUSINESS_SETTINGS.serviceAreas,
    bookingAvailable: DEFAULT_BUSINESS_SETTINGS.bookingAvailable,
    bookingInstructions: DEFAULT_BUSINESS_SETTINGS.bookingInstructions,
    businessHours: DEFAULT_BUSINESS_SETTINGS.businessHours,
    bookingConfirmation: DEFAULT_BUSINESS_SETTINGS.bookingConfirmation,
    showTagline: DEFAULT_BUSINESS_SETTINGS.showTagline,
    announcementEnabled: DEFAULT_BUSINESS_SETTINGS.announcementEnabled,
    announcementText: DEFAULT_BUSINESS_SETTINGS.announcementText,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProfile() {
      try {
        const response = await fetch("/api/public/business-profile", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) return;
        const result: unknown = await response.json();
        if (isPublicBusinessProfile(result)) setProfile(result);
      } catch {
        if (!controller.signal.aborted) {
          console.error("Unable to load public business profile.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadProfile();
    return () => controller.abort();
  }, []);

  return { profile, loading };
}
