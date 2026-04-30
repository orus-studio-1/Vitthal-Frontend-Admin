import axios from 'axios';
import {
  AnalyticsData,
  ApiResponse,
  DashboardStats,
  LoginCredentials,
  Order,
  OrderStatus,
  Product,
  RegisterData,
  User,
  UserManagementData,
  Vendor,
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

  updateStatus: (id: string, status: OrderStatus) =>
    api.patch<ApiResponse<Order>>(`/api/orders/${id}/status`, { status }),
};

export const vendorAPI = {
  create: (data: {
    name: string;
    email: string;
    phone?: string;
    companyName: string;
    gstNumber?: string;
    password?: string;
  }) => api.post<ApiResponse<Vendor>>('/api/vendors', data),

  getAll: () => api.get<ApiResponse<Vendor[]>>('/api/vendors'),

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

  updateUserStatus: (id: string, is_active: boolean) =>
    api.put<ApiResponse<User>>(`/api/admin/users/${id}/status`, { is_active }),
};

export default api;
