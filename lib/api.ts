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
    specifications: any;
    attributes?: Record<string, string>;
    material?: string;
    grade?: string;
    application?: string;
    standard?: string;
    itemCode?: string | null;
    quotationLimit?: number | null;
  }) => api.post<ApiResponse<Product>>('/api/products/addProduct', data),

  uploadProductImages: (formData: FormData) =>
    api.post<ApiResponse<any>>('/api/products/uploadProductImages', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  addProductVariant: (data: {
    productId: string;
    sku: string | null;
    name?: string | null;
    properties: Record<string, string>;
  }) => api.post<ApiResponse<any>>('/api/products/addProductVariant', data),

  getAll: () => api.get<ApiResponse<Product[]>>('/api/products'),

  getCategories: () => api.get<ApiResponse<any[]>>('/api/products/getCategories'),

  createCategory: (data: FormData | {
    code: string;
    label: string;
    description?: string;
    image: string;
    min_commision_percentage: number;
    max_commision_percentage: number;
    sort_order: number;
    is_active: boolean;
    category_type?: 'product' | 'service';
  }) => api.post<ApiResponse<any>>('/api/products/categories/add', data, data instanceof FormData ? {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  } : undefined),

  updateCategory: (
    id: string,
    data: FormData | Partial<{
      code: string;
      label: string;
      description: string | null;
      image: string;
      min_commision_percentage: number;
      max_commision_percentage: number;
      sort_order: number;
      is_active: boolean;
      category_type?: 'product' | 'service';
    }>
  ) => api.put<ApiResponse<any>>(`/api/products/categories/${id}`, data, data instanceof FormData ? {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  } : undefined),

  deleteCategory: (id: string) => api.delete<{ message: string }>(`/api/products/categories/${id}`),

  getById: (id: string) => api.get<ApiResponse<Product>>(`/api/products/${id}`),

  review: (id: string, decision: 'approved' | 'rejected', notes?: string) =>
    api.put<ApiResponse<Product>>(`/api/products/${id}/review`, { decision, notes }),

  reviewImage: (imageId: string, decision: 'approved' | 'rejected') =>
    api.put<ApiResponse<any>>(`/api/products/image/${imageId}/review`, { decision }),

  reviewSpecification: (specId: string, decision: 'approved' | 'rejected', notes?: string) =>
    api.put<ApiResponse<any>>(`/api/products/specification/${specId}/review`, { decision, notes }),

  reviewVendorProduct: (vendorProductId: string, decision: 'approved' | 'rejected') =>
    api.put<ApiResponse<any>>(`/api/products/pending-vendor/${vendorProductId}/review`, { decision }),

  getPendingVendorProducts: () =>
    api.get<ApiResponse<any[]>>('/api/products/pending-vendor/all'),

  getPendingPriceChanges: () =>
    api.get<ApiResponse<any[]>>('/api/products/pending-price/all'),

  reviewPendingPriceChange: (id: string, decision: 'approved' | 'rejected') =>
    api.put<ApiResponse<any>>(`/api/products/pending-price/${id}/review`, { decision }),

  getPendingVariants: () =>
    api.get<ApiResponse<any[]>>('/api/products/pending-variants/all'),

  reviewProductVariant: (variantId: string, decision: 'approved' | 'rejected', notes?: string) =>
    api.put<ApiResponse<any>>(`/api/products/pending-variants/${variantId}/review`, { decision, notes }),

  update: (
    id: string,
    data: Partial<{
      name: string;
      description: string;
      category: string;
      productType: string;
      specifications: string;
      is_active: boolean;
      attributes: Record<string, string>;
      material?: string;
      grade?: string;
      application?: string;
      standard?: string;
    }>
  ) => api.put<ApiResponse<Product>>(`/api/products/${id}`, data),

  delete: (id: string) => api.delete<{ message: string }>(`/api/products/${id}`),

  getProductTypes: () => api.get<ApiResponse<string[]>>('/api/products/getProductTypes'),
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

  getById: (id: string) =>
    api.get<ApiResponse<any>>(`/api/orders/${id}`),
};

export const vendorAPI = {
  getAll: () => api.get<ApiResponse<Vendor[]>>('/api/vendors'),

  getInsights: (id: string, timeframe?: 'month' | '6months' | 'year' | 'all') =>
    api.get<ApiResponse<VendorInsightsData>>(`/api/vendors/${id}/insights`, { params: { timeframe } }),

  updateStatus: (id: string, data: Partial<Pick<Vendor, 'is_active' | 'is_blocked'>>) =>
    api.put<ApiResponse<Vendor>>(`/api/vendors/${id}/status`, data),

  review: (id: string, decision: 'approved' | 'rejected' | 'reconsideration', notes?: string) =>
    api.put<ApiResponse<Vendor>>(`/api/vendors/${id}/review`, { decision, notes }),
};

export const adminAPI = {
  getDashboard: () => api.get<ApiResponse<DashboardStats>>('/api/admin/dashboard'),

  getAnalytics: (period?: string, range?: { startDate?: string; endDate?: string }) =>
    api.get<ApiResponse<AnalyticsData>>('/api/admin/analytics', { params: { period, ...range } }),

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

  getPayments: () =>
    api.get<ApiResponse<any[]>>('/api/admin/payments'),

  getPayouts: () =>
    api.get<ApiResponse<any[]>>('/api/orders/payouts'),

  updatePayout: (orderId: string, payoutPercentage: number, notes?: string) =>
    api.put<ApiResponse<any>>(`/api/orders/payouts/${orderId}`, { payoutPercentage, notes }),
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

export const fulfillmentCenterAPI = {
  getAll: () =>
    api.get<ApiResponse<any[]>>('/api/admin/fulfillment-centers'),

  getById: (id: string) =>
    api.get<ApiResponse<any>>(`/api/admin/fulfillment-centers/${id}`),

  create: (data: any) =>
    api.post<ApiResponse<any>>('/api/admin/fulfillment-centers', data),

  update: (id: string, data: any) =>
    api.put<ApiResponse<any>>(`/api/admin/fulfillment-centers/${id}`, data),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/api/admin/fulfillment-centers/${id}`),
};

export const riderAPI = {
  getAll: () =>
    api.get<ApiResponse<any[]>>('/api/admin/delivery-agents'),

  create: (data: any) =>
    api.post<ApiResponse<any>>('/api/admin/delivery-agents', data),
};

export const serviceAPI = {
  getAll: (params?: { status?: string; search?: string; page?: number; limit?: number }) =>
    api.get<ApiResponse<any>>('/api/services', { params }),

  create: (data: { name: string; description?: string; categoryId: string; status?: string }) =>
    api.post<ApiResponse<any>>('/api/services', data),

  update: (
    id: string,
    data: Partial<{
      name: string;
      description: string;
      categoryId: string;
      status: string;
    }>
  ) => api.put<ApiResponse<any>>(`/api/services/${id}`, data),

  review: (id: string, decision: 'approved' | 'rejected', notes?: string) =>
    api.put<ApiResponse<any>>(`/api/services/${id}/review`, { decision, notes }),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/api/services/${id}`),

  getOfferings: (serviceId: string) =>
    api.get<ApiResponse<any[]>>(`/api/services/${serviceId}/offerings`),

  uploadMedia: (serviceId: string, formData: FormData) =>
    api.post<ApiResponse<any>>(`/api/services/${serviceId}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getBookings: (params?: { status?: string; vendorId?: string; page?: number; limit?: number }) =>
    api.get<ApiResponse<any>>('/api/services/admin/bookings', { params }),

  getQuotations: (params?: { status?: string; vendorId?: string; page?: number; limit?: number }) =>
    api.get<ApiResponse<any>>('/api/services/admin/quotations', { params }),
};

export default api;
