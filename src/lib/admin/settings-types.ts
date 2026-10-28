export type BusinessSettings = {
  businessName: string;
  tagline: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  facebookUrl: string;
  instagramUrl: string;
  logoUrl: string;
  deliveryAvailable: boolean;
  defaultDeliveryCharge: number | null;
  deliveryInstructions: string;
  estimatedDelivery: string;
  serviceAreas: string[];
  bookingAvailable: boolean;
  bookingInstructions: string;
  businessHours: string;
  bookingConfirmation: string;
  showTagline: boolean;
  announcementEnabled: boolean;
  announcementText: string;
};

export type PublicBusinessProfile = Pick<
  BusinessSettings,
  | "businessName"
  | "tagline"
  | "email"
  | "phone"
  | "whatsapp"
  | "address"
  | "facebookUrl"
  | "instagramUrl"
  | "logoUrl"
  | "deliveryAvailable"
  | "deliveryInstructions"
  | "estimatedDelivery"
  | "serviceAreas"
  | "bookingAvailable"
  | "bookingInstructions"
  | "businessHours"
  | "bookingConfirmation"
  | "showTagline"
  | "announcementEnabled"
  | "announcementText"
>;

export type SavedBusinessSettings = {
  settings: BusinessSettings;
  updatedAt: string;
  canEdit: boolean;
};

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  businessName: "Mehedi By Meherin",
  tagline: "",
  email: "",
  phone: "",
  whatsapp: "",
  address: "",
  facebookUrl: "",
  instagramUrl: "",
  logoUrl: "",
  deliveryAvailable: true,
  defaultDeliveryCharge: null,
  deliveryInstructions: "",
  estimatedDelivery: "",
  serviceAreas: [],
  bookingAvailable: true,
  bookingInstructions: "",
  businessHours: "",
  bookingConfirmation: "",
  showTagline: false,
  announcementEnabled: false,
  announcementText: "",
};
