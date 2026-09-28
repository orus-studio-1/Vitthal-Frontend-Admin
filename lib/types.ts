export interface ApiResponse<T = unknown> {
  message: string;
  data: T;
}

export type UserRole = 'client' | 'vendor' | 'admin' | 'super_admin' | 'fulfillment_center';
export type ProductCategory = 'Plastic' | 'Metal';
export type ApprovalStatus = 'pending' | 'agreement_sent' | 'approved' | 'rejected' | 'reconsideration';

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
  category_label?: string | null;
  subcategory_id?: string | null;
  subcategory_name?: string | null;
  product_type?: string | null;
  item_code?: string | null;
  quotation_limit?: number | null;
  attributes?: Record<string, any>;
  material?: string;
  grade?: string;
  application?: string;
  standard?: string;
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
    media_type?: 'image' | 'video';
  }>;
  detailed_vendors?: Array<{
    id: string;
    price: number;
    pending_price?: number | null;
    moq: number;
    stock_quantity: number;
    is_active: boolean;
    status: 'active' | 'inactive' | 'out_of_stock' | 'discontinued' | 'waiting';
    created_at: string;
    company_name: string;
    vendor_name: string;
    vendor_email: string;
    gst_percentage?: number;
  }>;
  variants?: Array<{
    id: string;
    name?: string | null;
    sku: string | null;
    properties: Record<string, string>;
    approval_status: 'pending' | 'approved' | 'rejected';
    approval_notes?: string | null;
    created_at: string;
    creator_name?: string | null;
    creator_email?: string | null;
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
  vendor_signature_image_link?: string | null;
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
  reconsideration_notes?: string | null;
  application_number?: string | null;
  vendor_type?: 'product' | 'service' | 'both' | null;
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
  orderDetails?: Order[];
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

export interface FulfillmentCenter {
  id: string;
  user_id: string;
  name: string;
  code: string;
  email: string;
  contact_phone?: string | null;
  contact_email?: string | null;
  manager_name?: string | null;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  total_area_sqft?: number | null;
  capacity_packages?: number | null;
  storage_type?: string | null;
  operating_hours?: string | null;
  status: 'active' | 'inactive' | 'maintenance';
  created_at: string;
  updated_at: string;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  code: string;
  label: string;
  description: string | null;
  image: string;
  min_commision_percentage: number;
  max_commision_percentage: number;
  sort_order: number;
  is_active: boolean;
  category_type?: 'product' | 'service';
  subcategories?: Subcategory[];
  subcategory_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  category_id: string;
  category_label?: string | null;
  subcategory_id?: string | null;
  subcategory_name?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_by_user_id?: string | null;
  is_active: boolean;
  rating: string | number;
  review_count: number;
  created_at: string;
  updated_at: string;
  vendor_count?: number | string;
  booking_count?: number | string;
}

export interface EmployeeDocument {
  id: string;
  candidate_id: string;
  doc_type: string;
  doc_number?: string | null;
  doc_url: string;
  doc_name?: string | null;
  metadata?: Record<string, any>;
  uploaded_by_user_id?: string | null;
  uploaded_by_name?: string | null;
  created_at: string;
}

export interface EmployeeCandidate {
  id: string;
  full_name: string;
  email?: string | null;
  phone: string;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  address_line?: string | null;
  designation?: string | null;
  experience_years: number;
  skills: string[];
  metadata: {
    hiring_type?: 'freelance' | 'contract' | 'permanent' | string;
    expected_salary?: string | number;
    languages?: string[];
    bio?: string;
    [key: string]: any;
  };
  photo_url?: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  rejection_reason?: string | null;
  verified_at?: string | null;
  verified_by_user_id?: string | null;
  verified_by_name?: string | null;
  is_available: boolean;
  commission_percentage: number;
  registered_by_user_id?: string | null;
  registered_by_name?: string | null;
  registered_by_email?: string | null;
  created_at: string;
  updated_at: string;
  documents?: EmployeeDocument[];
  hire_requests?: HireRequest[];
}

export interface HireRequest {
  id: string;
  candidate_id: string;
  requested_by_user_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  request_details: {
    hiring_type?: string;
    duration?: string;
    salary_offered?: string | number;
    notes?: string;
    company_name?: string;
    [key: string]: any;
  };
  admin_notes?: string | null;
  reviewed_by_user_id?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  candidate_name?: string;
  candidate_designation?: string;
  candidate_phone?: string;
  candidate_city?: string;
  candidate_photo?: string;
  requester_name?: string;
  requester_email?: string;
}

export interface HiringStats {
  total_candidates: number;
  pending_candidates: number;
  verified_candidates: number;
  rejected_candidates: number;
  available_candidates: number;
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
}

export interface ClientAsset {
  id: string;
  user_id: string;
  category_id?: string | null;
  subcategory_id?: string | null;
  asset_name: string;
  asset_code?: string | null;
  brand?: string | null;
  model_number?: string | null;
  serial_number?: string | null;
  installation_year?: number | null;
  specs: Record<string, any>;
  location_details: Record<string, any>;
  documents: Array<{ name?: string; url: string; type?: string }>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  users?: { id: string; name: string; email: string };
  product_category?: { id: string; label: string };
  subcategories?: { id: string; name: string };
  _count?: { service_tickets: number };
}

export interface ServiceTicketQuotation {
  id: string;
  ticket_id: string;
  vendor_id: string;
  status: 'submitted' | 'accepted' | 'rejected' | 'countered';
  quote_breakdown: {
    line_items?: Array<{ item: string; qty: number; rate: number; amount: number }>;
    subtotal?: number;
    gst?: number;
    total?: number;
    notes?: string;
    delivery_days?: number;
    [key: string]: any;
  };
  total_price: number | string;
  token_percentage?: number | string | null;
  token_amount?: number | string | null;
  valid_until?: string | null;
  created_at: string;
  updated_at: string;
  vendors?: { id: string; company_name: string; phone?: string; rating?: number | string };
}

export interface ServiceTicketDocument {
  id: string;
  ticket_id: string;
  doc_type: string;
  doc_name?: string | null;
  doc_url: string;
  uploaded_by_user_id?: string | null;
  metadata: Record<string, any>;
  created_at: string;
  uploaded_by_user?: { id: string; name: string };
}

export interface ServiceTicket {
  id: string;
  ticket_number: string;
  category_id: string;
  subcategory_id?: string | null;
  client_user_id: string;
  vendor_id?: string | null;
  assigned_agent_id?: string | null;
  asset_id?: string | null;
  status: 'draft' | 'broadcasted' | 'quote_pending' | 'quoted' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'emergency_breakdown';
  ticket_payload: Record<string, any>;
  quotation_breakdown: Record<string, any>;
  total_amount?: number | string | null;
  advance_paid?: number | string | null;
  completion_otp?: string | null;
  otp_verified_at?: string | null;
  timeline_logs: Array<{ status: string; note: string; timestamp: string; by_user_id?: string }>;
  created_at: string;
  updated_at: string;
  product_category?: { id: string; label: string; code?: string };
  subcategories?: { id: string; name: string };
  client_user?: { id: string; name: string; email: string };
  vendors?: { id: string; company_name: string; phone?: string; rating?: number | string };
  assigned_agent?: { id: string; name: string; email: string };
  client_asset?: ClientAsset | null;
  service_ticket_quotations?: ServiceTicketQuotation[];
  service_ticket_documents?: ServiceTicketDocument[];
  _count?: { service_ticket_quotations: number; service_ticket_documents: number };
}

export interface ServiceHubStats {
  totalTickets: number;
  openTickets: number;
  completedTickets: number;
  totalAssets: number;
  broadcastedTickets: number;
  emergencyTickets: number;
}


export interface ContactQuery {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'resolved';
  created_at: string;
  updated_at: string;
}


