export type ReportPreset =
  | "today"
  | "last7"
  | "last30"
  | "thisMonth"
  | "custom"
  | "all";

export type ReportFilter = {
  preset: ReportPreset;
  startDate: string | null;
  endDate: string | null;
  timeZone: "Asia/Dhaka";
  orderDateField: "created_at";
  bookingDateField: "created_at";
};

export type ReportMetric = {
  label: string;
  count: number;
};

export type ReportTrendPoint = {
  key: string;
  label: string;
  orders: number;
  recordedOrderValue: number;
  bookings: number;
};

export type ReportProduct = {
  id: string;
  name: string;
  currentStock: number | null;
  orderedQuantity: number;
  recordedOrderValue: number | null;
  unpricedItemCount: number;
};

export type ReportDesign = {
  title: string;
  bookingCount: number;
};

export type AdminReport = {
  filter: ReportFilter;
  overview: {
    totalOrders: number;
    pendingOrders: number;
    confirmedOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    recordedOrderValue: number;
    pendingOrderValueCount: number;
    cancelledOrderValue: number;
    productsSubtotal: number;
    totalBookings: number;
    pendingBookings: number;
    confirmedBookings: number;
    rejectedBookings: number;
    cancelledBookings: number;
    completedBookings: number;
    totalProducts: number;
    averageRecordedOrderValue: number | null;
    averageValueOrderCount: number;
  };
  orderStatuses: ReportMetric[];
  bookingStatuses: ReportMetric[];
  trends: ReportTrendPoint[];
  trendGranularity: "day" | "month";
  products: ReportProduct[];
  lowStockThreshold: number;
  popularDesigns: ReportDesign[];
  paymentCollectionTracked: false;
};
