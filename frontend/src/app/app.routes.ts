import { Routes } from '@angular/router';
import { adminGuard, authGuard, supplierGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'browse', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./features/auth/login').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./features/auth/register').then(m => m.RegisterComponent) },
  { path: 'profile', canActivate: [authGuard], loadComponent: () => import('./features/profile/edit-profile').then(m => m.EditProfileComponent) },
  { path: 'notifications', canActivate: [authGuard], loadComponent: () => import('./features/notifications/notifications').then(m => m.NotificationsComponent) },
  { path: 'unauthorized', loadComponent: () => import('./features/auth/login').then(m => m.LoginComponent) },

  // Customer
  { path: 'browse', loadComponent: () => import('./features/customer/browse').then(m => m.BrowseComponent) },
  { path: 'orders', canActivate: [authGuard], loadComponent: () => import('./features/customer/order-history').then(m => m.OrderHistoryComponent) },
  { path: 'orders/:id', canActivate: [authGuard], loadComponent: () => import('./features/customer/order-detail').then(m => m.OrderDetailComponent) },

  // Supplier
  {
    path: 'supplier',
    canActivate: [supplierGuard],
    children: [
      { path: 'products', loadComponent: () => import('./features/supplier/product-list').then(m => m.SupplierProductListComponent) },
      { path: 'products/new', loadComponent: () => import('./features/supplier/product-form').then(m => m.ProductFormComponent) },
      { path: 'products/:id/edit', loadComponent: () => import('./features/supplier/product-form').then(m => m.ProductFormComponent) },
      { path: 'categories', loadComponent: () => import('./features/supplier/category-manage').then(m => m.CategoryManageComponent) },
      { path: 'orders', loadComponent: () => import('./features/supplier/order-management').then(m => m.SupplierOrderManagementComponent) },
      { path: '', redirectTo: 'products', pathMatch: 'full' }
    ]
  },

  // Admin
  {
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/admin/dashboard').then(m => m.AdminDashboardComponent) },
      { path: 'users', loadComponent: () => import('./features/admin/supplier-list').then(m => m.SupplierListComponent) },
      { path: 'users/new', loadComponent: () => import('./features/admin/supplier-form').then(m => m.SupplierFormComponent) },
      { path: 'users/:id/edit', loadComponent: () => import('./features/admin/supplier-form').then(m => m.SupplierFormComponent) },
      { path: 'customers', loadComponent: () => import('./features/admin/customer-management').then(m => m.CustomerManagementComponent) },
      { path: 'categories', loadComponent: () => import('./features/supplier/category-manage').then(m => m.CategoryManageComponent) },
      { path: 'orders', loadComponent: () => import('./features/admin/order-management').then(m => m.OrderManagementComponent) },
      { path: 'audit-logs', loadComponent: () => import('./features/admin/audit-logs').then(m => m.AuditLogsComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'browse' }
];
