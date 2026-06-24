import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  AuditLog, AuditLogDetail, Category, Dashboard, Notification, Order,
  OrderListItem, PagedResult, Product, ProductListItem, StockAdjustment, User
} from '../models/models';

const API = 'http://localhost:5000/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  // Categories
  getCategories() { return this.http.get<Category[]>(`${API}/categories`); }
  createCategory(data: { name: string; description?: string }) { return this.http.post<Category>(`${API}/categories`, data); }
  updateCategory(id: number, data: { name: string; description?: string }) { return this.http.put<Category>(`${API}/categories/${id}`, data); }
  deleteCategory(id: number) { return this.http.delete(`${API}/categories/${id}`); }

  // Products
  getProducts(params: Record<string, any> = {}) {
    let p = new HttpParams();
    Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') p = p.set(k, v); });
    return this.http.get<PagedResult<ProductListItem>>(`${API}/products`, { params: p });
  }
  getProduct(id: number) { return this.http.get<Product>(`${API}/products/${id}`); }
  createProduct(formData: FormData) { return this.http.post<Product>(`${API}/products`, formData); }
  updateProduct(id: number, formData: FormData) { return this.http.put<Product>(`${API}/products/${id}`, formData); }
  deleteProduct(id: number) { return this.http.delete(`${API}/products/${id}`); }
  stockAdjust(id: number, data: { quantityChanged: number; reason?: string }) {
    return this.http.post(`${API}/products/${id}/stock-adjustment`, data);
  }
  getStockHistory(id: number) { return this.http.get<StockAdjustment[]>(`${API}/products/${id}/stock-history`); }

  // Orders
  placeOrder(items: { productId: number; quantity: number }[]) {
    return this.http.post<{ id: number; status: string }>(`${API}/orders`, { items });
  }
  getOrders() { return this.http.get<OrderListItem[]>(`${API}/orders`); }
  getOrder(id: number) { return this.http.get<Order>(`${API}/orders/${id}`); }
  cancelOrder(id: number) {
    return this.http.post(`${API}/orders/${id}/cancel`, {});
  }
  updateOrderStatus(id: number, status: string) {
    return this.http.patch(`${API}/orders/${id}/status`, { status });
  }
  updateFulfillmentStatus(orderId: number, status: string) {
    return this.http.patch(`${API}/orders/${orderId}/fulfillment/status`, { status });
  }

  // Admin
  getUsers(role?: string) {
    let params = new HttpParams();
    if (role) params = params.set('role', role);
    return this.http.get<User[]>(`${API}/admin/users`, { params });
  }
  createSupplier(data: any) { return this.http.post<User>(`${API}/admin/users`, data); }
  updateUser(id: number, data: any) { return this.http.put<User>(`${API}/admin/users/${id}`, data); }
  deleteUser(id: number) { return this.http.delete(`${API}/admin/users/${id}`); }
  approveSupplier(id: number) { return this.http.post<User>(`${API}/admin/users/${id}/approve`, {}); }
  revokeSupplier(id: number) { return this.http.post<User>(`${API}/admin/users/${id}/revoke`, {}); }
  getDashboard() { return this.http.get<Dashboard>(`${API}/admin/dashboard`); }
  getAuditLogs(params: Record<string, any> = {}) {
    let p = new HttpParams();
    Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') p = p.set(k, v); });
    return this.http.get<{ items: AuditLog[]; total: number }>(`${API}/audit-logs`, { params: p });
  }
  getAuditLog(id: number) { return this.http.get<AuditLogDetail>(`${API}/audit-logs/${id}`); }

  // Profile (any role)
  updateProfile(data: any) { return this.http.put(`${API}/auth/profile`, data); }

  // Notifications
  getNotifications() { return this.http.get<Notification[]>(`${API}/notifications`); }
  markRead(id: number) { return this.http.patch(`${API}/notifications/${id}/read`, {}); }
  markAllRead() { return this.http.patch(`${API}/notifications/read-all`, {}); }
  deleteNotification(id: number) { return this.http.delete(`${API}/notifications/${id}`); }
}
