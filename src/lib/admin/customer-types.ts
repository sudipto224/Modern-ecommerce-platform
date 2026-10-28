export type CustomerSource = "Orders" | "Bookings" | "Both";

export type CustomerSummary = {
  id: string;
  displayName: string;
  phone: string | null;
  orderCount: number;
  bookingCount: number;
  firstActivity: string | null;
  lastActivity: string | null;
  source: CustomerSource;
};

export type CustomerStatistics = {
  totalContacts: number;
  withOrders: number;
  withBookings: number;
  returning: number;
};

export type CustomerDirectoryResponse = {
  customers: CustomerSummary[];
  statistics: CustomerStatistics;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CustomerOrderHistory = {
  id: string;
  recordedName: string | null;
  createdAt: string | null;
  status: string;
  subtotal: number | null;
  deliveryFee: number | null;
  total: number | null;
};

export type CustomerBookingHistory = {
  id: string;
  recordedName: string | null;
  createdAt: string | null;
  status: string;
  selectedDesign: string | null;
};

export type CustomerProfile = {
  customer: CustomerSummary;
  orders: CustomerOrderHistory[];
  bookings: CustomerBookingHistory[];
};
