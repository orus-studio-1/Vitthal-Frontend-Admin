import axios from 'axios';
import {
  AnalyticsData,
  AdminVendorChatConversation,
  AdminVendorChatSummary,
  ApiResponse,
  DashboardStats,
  LoginCredentials,
  Order,
  OrderStatus,
  Product,
  RegisterData,
  User,
  UserDetailsData,
  UserManagementData,
  OrderProductVendorOption,
  Vendor,
  VendorInsightsData,
  VendorQuotation,
  CreateVendorQuotationPayload,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url as string | undefined;
    const isSessionProbe = requestUrl?.includes('/api/auth/me');
    const isAuthRequest =
      requestUrl?.includes('/api/auth/login') ||
      requestUrl?.includes('/api/auth/register') ||
      requestUrl?.includes('/api/auth/logout');

    if (
      error.response?.status === 401 &&
      !isSessionProbe &&
      !isAuthRequest &&
      typeof window !== 'undefined' &&
      window.location.pathname !== '/login'
    ) {
      window.location.assign('/login');
    }

    return Promise.reject(error);
  }
);

export function extractApiError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string } | undefined)?.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export const authAPI = {
  login: (credentials: LoginCredentials) =>
    api.post('/api/auth/login', credentials),

  register: (data: RegisterData) =>
    api.post<ApiResponse<User>>('/api/auth/register', data),

  logout: () =>
    api.post<{ message: string }>('/api/auth/logout'),

  me: () =>
    api.get('/api/auth/me'),
};

export const productAPI = {
  create: (data: {
    name: string;
    description: string;
    category: string;
    productType: string;
    specifications: string;
  }) => api.post<ApiResponse<Product>>('/api/products/addProduct', data),

  getAll: () => api.get<ApiResponse<Product[]>>('/api/products'),

  review: (id: string, decision: 'approved' | 'rejected', notes?: string) =>
    api.put<ApiResponse<Product>>(`/api/products/${id}/review`, { decision, notes }),

  update: (
    id: string,
    data: Partial<{
      name: string;
      description: string;
      category: string;
      productType: string;
      specifications: string;
      is_active: boolean;
    }>
  ) => api.put<ApiResponse<Product>>(`/api/products/${id}`, data),

  delete: (id: string) => api.delete<{ message: string }>(`/api/products/${id}`),
};

export const orderAPI = {
  create: (data: {
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
    vendor_id: string;
    product_id: string;
    quantity: number;
    total_amount: number;
    address_line: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    order_notes?: string;
  }) => api.post<ApiResponse<Order>>('/api/orders', data),

  getAll: () => api.get<ApiResponse<Order[]>>('/api/orders'),

  getProductVendors: (productId: string) =>
    api.get<ApiResponse<OrderProductVendorOption[]>>(`/api/orders/products/${productId}/vendors`),

  updateStatus: (id: string, status: OrderStatus) =>
    api.patch<ApiResponse<Order>>(`/api/orders/${id}/status`, { status }),
};

export const vendorAPI = {
  getAll: () => api.get<ApiResponse<Vendor[]>>('/api/vendors'),

  getInsights: (id: string, timeframe?: 'month' | '6months' | 'year' | 'all') =>
    api.get<ApiResponse<VendorInsightsData>>(`/api/vendors/${id}/insights`, { params: { timeframe } }),

  updateStatus: (id: string, data: Partial<Pick<Vendor, 'is_active' | 'is_blocked'>>) =>
    api.put<ApiResponse<Vendor>>(`/api/vendors/${id}/status`, data),

  review: (id: string, decision: 'approved' | 'rejected', notes?: string) =>
    api.put<ApiResponse<Vendor>>(`/api/vendors/${id}/review`, { decision, notes }),
};

export const adminAPI = {
  getDashboard: () => api.get<ApiResponse<DashboardStats>>('/api/admin/dashboard'),

  getAnalytics: (period?: string) =>
    api.get<ApiResponse<AnalyticsData>>('/api/admin/analytics', { params: { period } }),

  getUsers: () => api.get<ApiResponse<UserManagementData>>('/api/admin/users'),

  getUserDetails: (id: string) =>
    api.get<ApiResponse<UserDetailsData>>(`/api/admin/users/${id}`),

  updateUserStatus: (id: string, is_active: boolean) =>
    api.put<ApiResponse<User>>(`/api/admin/users/${id}/status`, { is_active }),

  getVendorChats: () =>
    api.get<ApiResponse<AdminVendorChatSummary[]>>('/api/admin/vendor-chats'),

  getVendorChatConversation: (vendorId: string, page = 1, limit = 100) =>
    api.get<ApiResponse<AdminVendorChatConversation>>(`/api/admin/vendor-chats/${vendorId}`, { params: { page, limit } }),

  sendVendorChatMessage: (vendorId: string, body: string) =>
    api.post<ApiResponse<AdminVendorChatConversation['messages'][number]>>(`/api/admin/vendor-chats/${vendorId}`, { body }),
};

export const quotationAPI = {
  create: (data: CreateVendorQuotationPayload) =>
    api.post<ApiResponse<{ quotation: VendorQuotation; vendorLink: string }>>('/api/quotations/admin', data),

  getAll: () =>
    api.get<ApiResponse<VendorQuotation[]>>('/api/quotations/admin'),

  getById: (id: string) =>
    api.get<ApiResponse<VendorQuotation>>(`/api/quotations/admin/${id}`),

  review: (id: string, decision: 'approved' | 'rejected', adminReviewNotes?: string) =>
    api.put<ApiResponse<VendorQuotation>>(`/api/quotations/admin/${id}/review`, { decision, adminReviewNotes }),

  getPdfUrl: (id: string) =>
    `${API_BASE_URL}/api/quotations/admin/${id}/pdf`,
};

export const clientQuotationAPI = {
  getAll: () =>
    api.get<ApiResponse<any[]>>('/api/client-quotations'),

  getById: (id: string) =>
    api.get<ApiResponse<any>>(`/api/client-quotations/${id}`),

  sendConfirmation: (id: string, message: string) =>
    api.post<ApiResponse<any>>(`/api/client-quotations/${id}/confirm`, { message }),
};

export default api;
