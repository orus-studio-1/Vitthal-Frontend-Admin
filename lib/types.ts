export interface ApiResponse<T = unknown> {
  message: string;
  data: T;
}

export type UserRole = 'client' | 'vendor' | 'admin' | 'super_admin';
export type ProductCategory = 'Plastic' | 'Metal';
export type ApprovalStatus = 'pending' | 'agreement_sent' | 'approved' | 'rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  role?: UserRole;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  product_type?: string | null;
  specifications: Record<string, unknown> | unknown[];
  approval_status: ApprovalStatus;
  approval_notes?: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id?: string | null;
  created_by_vendor_id?: string | null;
  creator_name?: string | null;
  creator_email?: string | null;
  creator_role?: UserRole | null;
  creator_vendor_name?: string | null;
  vendor_count?: number;
  is_active?: boolean;
  detailed_specifications?: Array<{
    id: string;
    spec_key: string;
    spec_value: string;
    approval_status: 'pending' | 'approved' | 'rejected';
    approval_notes?: string | null;
    created_at: string;
    created_by_user_id: string;
  }>;
  detailed_images?: Array<{
    id: string;
    image_url: string;
    is_primary: boolean;
    display_order: number;
    approval_status: 'pending' | 'approved' | 'rejected';
    is_approved: boolean;
    created_by_user_id?: string | null;
  }>;
  detailed_vendors?: Array<{
    id: string;
    price: number;
    moq: number;
    stock_quantity: number;
    is_active: boolean;
    status: 'active' | 'inactive' | 'out_of_stock' | 'discontinued' | 'waiting';
    created_at: string;
    company_name: string;
    vendor_name: string;
    vendor_email: string;
  }>;
}

export interface ProductFormData {
  name: string;
  description: string;
  category: ProductCategory;
  productType: string;
  specifications: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type OrderSource = 'client' | 'vendor' | 'admin';

export interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  vendor_id: string;
  product_id: string;
  quantity: number;
  total_amount: number;
  status: OrderStatus;
  source: OrderSource;
  order_reference?: string | null;
  order_notes?: string | null;
  delivery_address?: string | null;
  created_at: string;
  updated_at: string;
  product_name?: string;
  vendor_name?: string;
  category?: string | null;
  product_type?: string | null;
}

export interface OrderFormData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  vendor_id: string;
  product_id: string;
  quantity: string;
  total_amount: string;
  address_line: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  order_notes: string;
}

export interface Vendor {
  id: string;
  user_id: string;
  name?: string;
  email?: string;
  company_name: string;
  gst_number?: string | null;
  gst_certificate_link?: string | null;
  business_type?: string | null;
  company_website?: string | null;
  phone?: string | null;
  alternative_number?: string | null;
  designation?: string | null;
  business_description?: string | null;
  credit_cycle?: string | null;
  minimum_commision_percentage?: number | null;
  maximum_commision_percentage?: number | null;
  rating?: number;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  approval_status: ApprovalStatus;
  approval_notes?: string | null;
  application_number?: string | null;
  is_active: boolean;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
  order_count?: number;
  categories?: { id: string; code: string; label: string }[];
}

export type VendorQuotationStatus =
  | 'sent'
  | 'vendor_opened'
  | 'vendor_approved'
  | 'vendor_rejected'
  | 'admin_approved'
  | 'admin_rejected';

export interface VendorQuotation {
  id: string;
  quotation_number: string;
  quotation_kind: 'vendor_agreement' | 'order_request';
  vendor_id: string;
  product_id: string | null;
  created_by_admin_id: string;
  sent_to_email: string;
  title: string;
  quantity: number;
  unit: string;
  target_price: number | null;
  requested_moq: number | null;
  request_notes: string | null;
  validity_date: string | null;
  status: VendorQuotationStatus;
  vendor_price: number | null;
  vendor_moq: number | null;
  vendor_notes: string | null;
  admin_signature_data: string;
  vendor_signature_data: string | null;
  token_expires_at: string;
  vendor_opened_at: string | null;
  vendor_responded_at: string | null;
  vendor_response_ip: string | null;
  vendor_response_user_agent: string | null;
  admin_reviewed_at: string | null;
  reviewed_by_admin_id: string | null;
  admin_review_notes: string | null;
  vendor_rejection_reason: string | null;
  email_sent_at: string | null;
  email_last_error: string | null;
  created_at: string;
  updated_at: string;
  vendor_name: string;
  vendor_email: string;
  vendor_phone: string | null;
  company_name: string;
  created_by_admin_name: string;
  created_by_admin_email: string;
}

export interface CreateVendorQuotationPayload {
  vendorId: string;
  quotationKind?: 'vendor_agreement' | 'order_request';
  productId?: string;
  title: string;
  quantity?: number;
  unit?: string;
  targetPrice?: number | null;
  requestedMoq?: number | null;
  requestNotes?: string;
  validityDate?: string | null;
  adminSignatureData?: string;
  vendorUpdates?: {
    companyName?: string;
    businessType?: string;
    gstNumber?: string;
    gstCertificateLink?: string;
    companyWebsite?: string;
    alternativeNumber?: string;
    designation?: string;
    businessDescription?: string;
    creditCycle?: string;
    minimumCommissionPercentage?: number;
    maximumCommissionPercentage?: number;
    vendorCategories?: string[];
  };
}

export interface OrderProductVendorOption {
  id: string;
  company_name: string;
  price: number;
  moq: number;
  stock_quantity: number;
  quotation_enabled: boolean;
  quotation_min_qty: number | null;
}

export interface VendorFormData {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  gstNumber: string;
  password: string;
}

export interface DashboardStats {
  totals: {
    users: number;
    products: number;
    orders: number;
    vendors: number;
    activeVendors: number;
    pendingVendors: number;
    pendingProducts: number;
  };
  orderStats: Partial<Record<OrderStatus, number>>;
  recentOrders: Order[];
  monthlyRevenue: number;
}

export interface AnalyticsData {
  period: string;
  ordersOverTime: Array<{
    date: string;
    count: number;
    revenue: number;
  }>;
  topProducts: Array<{
    product_id: string;
    _count: { product_id: number };
    _sum: { total_amount: number | null };
    product?: { id: string; name: string };
  }>;
  topVendors: Array<{
    vendor_id: string;
    _count: { vendor_id: number };
    _sum: { total_amount: number | null };
    vendor?: { id: string; name: string };
  }>;
  statusDistribution: Partial<Record<OrderStatus, number>>;
  topCustomers: Array<{
    user_id: string;
    name: string;
    email: string;
    order_count: number;
    total_spent: number;
  }>;
  topCities: Array<{
    city: string;
    order_count: number;
    total_revenue: number;
  }>;
  purchaseTimeOfDay: Array<{
    hour_of_day: number;
    order_count: number;
    total_revenue: number;
  }>;
  categoryDistribution: Array<{
    category: string | null;
    order_count: number;
    total_quantity: number;
    total_revenue: number;
  }>;
}

export interface UserManagementData {
  users: User[];
  stats: {
    total: number;
    active: number;
    inactive: number;
    byRole: Partial<Record<UserRole, number>>;
  };
}

export interface VendorDashboardData {
  stats: {
    totalRevenue: number;
    totalOrders: number;
    activeProducts: number;
    totalCustomers: number;
  };
  revenueChart: {
    labels: string[];
    data: number[];
  };
  recentOrders: Array<{
    orderId: string;
    customerName: string;
    productName: string;
    date: string;
    amount: number;
    status: string;
  }>;
  topProducts: Array<{
    name: string;
    sales: number;
    revenue: number;
  }>;
}

export interface VendorAnalyticsSnapshot {
  timeframe: string;
  kpi: {
    totalQuantity: number;
    tonnageGrowth: number;
    avgOrderValue: number;
    aovGrowth: number;
    topSegment: {
      name: string;
      volume: number;
      percentage: number;
    } | null;
    totalRevenue: number;
    revenueGrowth: number;
  };
  revenueChart: {
    labels: string[];
    data: number[];
  };
  categoryDistribution: Array<{
    name: string;
    quantity: number;
    revenue: number;
    percentage: number;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    category: string;
    sales: number;
    revenue: number;
    growth: number;
  }>;
}

export interface VendorInsightsData {
  vendor: Vendor;
  dashboard: VendorDashboardData;
  analytics: VendorAnalyticsSnapshot;
}

export interface UserDetailsData {
  user: User;
  address: {
    address: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  } | null;
  clientProfile: {
    phone: string;
  } | null;
  vendorProfile: {
    id: string;
    company_name: string;
    gst_number?: string | null;
    phone?: string | null;
    approval_status: ApprovalStatus;
    approval_notes?: string | null;
    is_blocked: boolean;
    order_count: number;
    total_revenue: number;
  } | null;
  customerStats: {
    totalOrders: number;
    totalSpent: number;
    lastOrderAt: string | null;
  };
  recentOrders: Array<{
    id: string;
    status: string;
    total_amount: number;
    created_at: string;
    order_reference?: string | null;
    vendor_name?: string | null;
  }>;
}

export interface AdminVendorChatSummary {
  vendorId: string;
  vendor: {
    id: string;
    userId: string;
    companyName: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  unreadCount: number;
  lastMessage: {
    id: string;
    vendorId: string;
    senderUserId: string;
    senderRole: string;
    body: string;
    isRead: boolean;
    createdAt: string;
  } | null;
}

export interface AdminVendorChatConversation {
  vendor: {
    id: string;
    userId: string;
    companyName: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  messages: Array<{
    id: string;
    vendorId: string;
    senderUserId: string;
    senderRole: string;
    body: string;
    isRead: boolean;
    createdAt: string;
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}
