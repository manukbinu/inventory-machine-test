export interface AuthResponse {
  token: string;
  role: string;
  userId: number;
  name: string;
  email: string;
  isApproved: boolean;
  phoneNumber?: string;
  location?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  canLogin: boolean;
  isApproved: boolean;
  isActive: boolean;
  phoneNumber?: string;
  location?: string;
  activeFromDate?: string;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
  activeProductCount: number;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  costPrice: number;
  sellingPrice: number;
  unit: string;
  openingStock: number;
  currentStock: number;
  imageUrl?: string;
  categoryId: number;
  categoryName: string;
  supplierId: number;
  supplierEmail: string;
  createdAt: string;
}

export interface ProductListItem {
  id: number;
  name: string;
  sellingPrice: number;
  unit: string;
  currentStock: number;
  imageUrl?: string;
  categoryName: string;
  supplierEmail: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  priceAtOrder: number;
  subtotal: number;
  supplierId: number;
  supplierName: string;
}

export interface OrderFulfillment {
  supplierId: number;
  supplierName: string;
  supplierEmail: string;
  status: string; // Pending | Processing | Shipped | Cancelled
}

export interface Order {
  id: number;
  status: string;
  createdAt: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: OrderItem[];
  total: number;
  fulfillments: OrderFulfillment[];
}

export interface OrderListItem {
  id: number;
  status: string;
  createdAt: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  total: number;
  supplierTotal?: number;
}

export interface StockAdjustment {
  id: number;
  adjustmentType: string;
  stockBefore: number;
  quantityChanged: number;
  stockAfter: number;
  reason?: string;
  adjustedAt: string;
  adjustedByEmail: string;
}

export interface Dashboard {
  // KPIs
  totalOrdersToday: number;
  totalOrdersMonth: number;
  revenueToday: number;
  revenueMonth: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalCustomers: number;
  totalSuppliers: number;
  pendingOrdersCount: number;
  averageOrderValue: number;
  // Lists
  lowStockProducts: { id: number; name: string; currentStock: number; supplierEmail: string }[];
  outOfStockProducts: { id: number; name: string; supplierEmail: string }[];
  ordersPerDay: { date: string; count: number }[];
  revenuePerDay: { date: string; revenue: number }[];
  revenuePerSupplier: { supplierEmail: string; supplierName: string; revenue: number }[];
  ordersByStatus: { status: string; count: number }[];
  categoryProductCounts: { categoryName: string; productCount: number }[];
  topSellingProducts: { id: number; name: string; totalSold: number; revenue: number }[];
  supplierOrderCounts: { supplierName: string; supplierEmail: string; orderCount: number; revenue: number }[];
  recentOrders: { id: number; customerName: string; status: string; createdAt: string; total: number }[];
}

export interface AuditLog {
  id: number;
  tableName: string;
  recordId: number;
  actionType: string;
  changedByEmail: string;
  changedAt: string;
  ipAddress?: string;
}

export interface AuditLogDetail extends AuditLog {
  actions: { fieldName: string; oldValue?: string; newValue?: string }[];
}

export interface Notification {
  id: number;
  type: string;
  message: string;
  isRead: boolean;
  relatedEntityId?: number;
  createdAt: string;
}
