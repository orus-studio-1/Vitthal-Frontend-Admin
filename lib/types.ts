export interface ApiResponse<T = unknown> {
  message: string;
  data: T;
}

export type UserRole = 'client' | 'vendor' | 'admin' | 'super_admin';
export type ProductCategory = 'Plastic' | 'Metal';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active?: boolean;
  created_at?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
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
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  approval_status: ApprovalStatus;
  approval_notes?: string | null;
  is_active: boolean;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
  order_count?: number;
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
