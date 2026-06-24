import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { Notification } from '../../core/models/models';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule, MatMenuModule,
    MatIconModule, MatBadgeModule, MatDividerModule, DatePipe],
  template: `
    <mat-toolbar class="navbar">
      <!-- Logo -->
      <a routerLink="/" class="logo-link">
        <div class="logo-wrap">
          <img src="appers-logo.png" class="logo-img" alt="Appers">
        </div>
      </a>

      <!-- Desktop nav links -->
      <nav class="desktop-nav">
        @if (auth.isLoggedIn) {
          @if (auth.role === 'Admin') {
            <a mat-button routerLink="/admin/dashboard" routerLinkActive="nav-active">
              <mat-icon>dashboard</mat-icon> Dashboard
            </a>
            <a mat-button routerLink="/admin/users" routerLinkActive="nav-active">
              <mat-icon>store</mat-icon> Suppliers
            </a>
            <a mat-button routerLink="/admin/customers" routerLinkActive="nav-active">
              <mat-icon>people</mat-icon> Customers
            </a>
            <a mat-button routerLink="/admin/categories" routerLinkActive="nav-active">
              <mat-icon>category</mat-icon> Categories
            </a>
            <a mat-button routerLink="/admin/orders" routerLinkActive="nav-active">
              <mat-icon>receipt_long</mat-icon> Orders
            </a>
            <a mat-button routerLink="/admin/audit-logs" routerLinkActive="nav-active">
              <mat-icon>history</mat-icon> Audit Logs
            </a>
          }
          @if (auth.role === 'Supplier') {
            <a mat-button routerLink="/supplier/products" routerLinkActive="nav-active">
              <mat-icon>inventory_2</mat-icon> Products
            </a>
            <a mat-button routerLink="/supplier/categories" routerLinkActive="nav-active">
              <mat-icon>category</mat-icon> Categories
            </a>
            <a mat-button routerLink="/supplier/orders" routerLinkActive="nav-active">
              <mat-icon>receipt_long</mat-icon> Orders
            </a>
          }
          @if (auth.role === 'Customer') {
            <a mat-button routerLink="/browse" routerLinkActive="nav-active">
              <mat-icon>storefront</mat-icon> Browse
            </a>
            <a mat-button routerLink="/orders" routerLinkActive="nav-active">
              <mat-icon>shopping_bag</mat-icon> My Orders
            </a>
          }
        }
      </nav>

      <span class="spacer"></span>

      @if (auth.isLoggedIn) {
        <!-- Notification Bell -->
        <button mat-icon-button [matMenuTriggerFor]="notifMenu"
          [matBadge]="unreadCount()" [matBadgeHidden]="unreadCount() === 0"
          matBadgeColor="warn" matBadgeSize="small"
          class="notif-btn" [class.has-notif]="unreadCount() > 0">
          <mat-icon>notifications</mat-icon>
        </button>

        <mat-menu #notifMenu xPosition="before" class="notif-menu">
          <div class="notif-header" (click)="$event.stopPropagation()">
            <span>Notifications</span>
            @if (unreadCount() > 0) {
              <button mat-button class="mark-all-btn" (click)="markAll()">Mark all read</button>
            }
          </div>
          <mat-divider></mat-divider>
          @if (recent().length === 0) {
            <div class="notif-empty"><mat-icon>notifications_none</mat-icon><br>No notifications</div>
          }
          @for (n of recent(); track n.id) {
            <button mat-menu-item class="notif-item" [class.unread]="!n.isRead" (click)="openNotif(n)">
              <mat-icon class="notif-type-icon" [style.color]="typeColor(n.type)">{{ typeIcon(n.type) }}</mat-icon>
              <div class="notif-text">
                <div class="notif-msg">{{ n.message }}</div>
                <div class="notif-time">{{ n.createdAt | date:'short' }}</div>
              </div>
            </button>
          }
          <mat-divider></mat-divider>
          <a mat-menu-item routerLink="/notifications" class="see-all">
            <mat-icon>list</mat-icon> See all notifications
          </a>
        </mat-menu>

        <!-- User Avatar Menu -->
        <button mat-button [matMenuTriggerFor]="userMenu" class="avatar-btn">
          <div class="avatar-circle" [class]="'avatar-' + (auth.role?.toLowerCase() || 'customer')">
            {{ userInitial() }}
          </div>
          <mat-icon class="avatar-chevron">expand_more</mat-icon>
        </button>
        <mat-menu #userMenu>
          <div class="user-menu-header" (click)="$event.stopPropagation()">
            <div class="avatar-circle avatar-circle-lg" [class]="'avatar-' + (auth.role?.toLowerCase() || 'customer')">
              {{ userInitial() }}
            </div>
            <div>
              <div class="user-name">{{ auth.user()?.name || auth.user()?.email }}</div>
              <div class="user-role">{{ auth.role }}</div>
            </div>
          </div>
          <mat-divider></mat-divider>
          <button mat-menu-item (click)="router.navigate(['/profile'])">
            <mat-icon>manage_accounts</mat-icon> Edit Profile
          </button>
          <button mat-menu-item (click)="auth.logout()" class="logout-item">
            <mat-icon>logout</mat-icon> Logout
          </button>
        </mat-menu>

        <!-- Hamburger (mobile) -->
        <button mat-icon-button class="hamburger-btn" [matMenuTriggerFor]="mobileMenu">
          <mat-icon>menu</mat-icon>
        </button>

        <mat-menu #mobileMenu>
          @if (auth.role === 'Admin') {
            <a mat-menu-item routerLink="/admin/dashboard"><mat-icon>dashboard</mat-icon> Dashboard</a>
            <a mat-menu-item routerLink="/admin/users"><mat-icon>store</mat-icon> Suppliers</a>
            <a mat-menu-item routerLink="/admin/customers"><mat-icon>people</mat-icon> Customers</a>
            <a mat-menu-item routerLink="/admin/categories"><mat-icon>category</mat-icon> Categories</a>
            <a mat-menu-item routerLink="/admin/orders"><mat-icon>receipt_long</mat-icon> Orders</a>
            <a mat-menu-item routerLink="/admin/audit-logs"><mat-icon>history</mat-icon> Audit Logs</a>
          }
          @if (auth.role === 'Supplier') {
            <a mat-menu-item routerLink="/supplier/products"><mat-icon>inventory_2</mat-icon> Products</a>
            <a mat-menu-item routerLink="/supplier/categories"><mat-icon>category</mat-icon> Categories</a>
            <a mat-menu-item routerLink="/supplier/orders"><mat-icon>receipt_long</mat-icon> Orders</a>
          }
          @if (auth.role === 'Customer') {
            <a mat-menu-item routerLink="/browse"><mat-icon>storefront</mat-icon> Browse</a>
            <a mat-menu-item routerLink="/orders"><mat-icon>shopping_bag</mat-icon> My Orders</a>
          }
          <mat-divider></mat-divider>
          <a mat-menu-item routerLink="/profile"><mat-icon>manage_accounts</mat-icon> Edit Profile</a>
          <button mat-menu-item (click)="auth.logout()"><mat-icon>logout</mat-icon> Logout</button>
        </mat-menu>

      } @else {
        <a mat-button routerLink="/login" class="nav-auth-link">Login</a>
        <a mat-raised-button routerLink="/register" class="nav-register-btn">Register</a>
      }
    </mat-toolbar>
  `,
  styles: [`
    .navbar {
      background: linear-gradient(135deg, #283593, #3f51b5) !important;
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 4px 20px rgba(40,53,147,.30);
      padding: 0 16px;
      height: 64px;
    }
    .logo-link { display: flex; align-items: center; text-decoration: none; flex-shrink: 0; }
    .logo-wrap { background: #fff; border-radius: 8px; padding: 5px 12px; display: flex; align-items: center; }
    .logo-img { height: 28px; object-fit: contain; display: block; }

    /* Desktop nav */
    .desktop-nav { display: flex; align-items: center; gap: 2px; }
    .desktop-nav a { color: rgba(255,255,255,.85) !important; border-radius: 20px !important; font-size: .85rem !important; font-weight: 500 !important; transition: all .2s ease; display: flex; align-items: center; gap: 4px; padding: 6px 14px !important; }
    .desktop-nav a mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .desktop-nav a:hover { background: rgba(255,255,255,.15) !important; color: #fff !important; }
    .desktop-nav a.nav-active { background: rgba(255,255,255,.20) !important; color: #fff !important; }

    .spacer { flex: 1; }

    /* Notification bell */
    .notif-btn { color: rgba(255,255,255,.85) !important; }
    .notif-btn.has-notif mat-icon { animation: pulse 2s infinite; }
    @keyframes pulse {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(12deg); }
      75% { transform: rotate(-12deg); }
    }

    /* Notification dropdown */
    .notif-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; font-weight: 700; font-size: .88rem; color: #283593; }
    .mark-all-btn { font-size: .75rem !important; min-width: 0 !important; padding: 0 8px !important; color: #3f51b5 !important; }
    .notif-empty { padding: 20px 16px; color: #999; text-align: center; font-size: .85rem; }
    .notif-item { display: flex !important; align-items: flex-start !important; gap: 10px; padding: 8px 16px !important; min-height: 52px !important; }
    .notif-item.unread { background: rgba(63,81,181,.07) !important; border-left: 3px solid #3f51b5; }
    .notif-type-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; margin-top: 2px; }
    .notif-text { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
    .notif-msg { font-size: .82rem; white-space: normal; line-height: 1.3; }
    .notif-time { font-size: .73rem; color: #888; margin-top: 2px; }
    .see-all { color: #3f51b5 !important; font-size: .85rem; }

    /* Avatar */
    .avatar-btn { display: flex !important; align-items: center !important; gap: 6px; padding: 4px 8px !important; border-radius: 24px !important; color: rgba(255,255,255,.9) !important; }
    .avatar-chevron { font-size: 18px !important; width: 18px !important; height: 18px !important; opacity: .7; }
    .avatar-circle {
      width: 34px; height: 34px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: .95rem; color: #fff;
      flex-shrink: 0;
    }
    .avatar-circle-lg { width: 44px; height: 44px; font-size: 1.2rem; }
    .avatar-admin    { background: #e53935; }
    .avatar-supplier { background: #f9a825; color: #1a1a2e !important; }
    .avatar-customer { background: #2e7d32; }

    /* User menu header */
    .user-menu-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; }
    .user-name { font-weight: 700; font-size: .88rem; color: #1a1a2e; }
    .user-role { font-size: .75rem; color: #5c6bc0; }
    .logout-item { color: #e53935 !important; }
    .logout-item mat-icon { color: #e53935 !important; }

    /* Auth links (logged out) */
    .nav-auth-link { color: rgba(255,255,255,.85) !important; }
    .nav-register-btn { background: rgba(255,255,255,.18) !important; color: #fff !important; border-radius: 20px !important; margin-left: 8px; }

    /* Hamburger — hidden on desktop, visible on mobile */
    .hamburger-btn { display: none !important; color: rgba(255,255,255,.85) !important; }

    @media (max-width: 768px) {
      .desktop-nav { display: none; }
      .hamburger-btn { display: inline-flex !important; }
      .avatar-chevron { display: none; }
    }
    @media (max-width: 480px) {
      .navbar { padding: 0 8px; }
      .logo-img { height: 22px; }
      .logo-wrap { padding: 4px 8px; }
    }
  `]
})
export class NavbarComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  router = inject(Router);
  private api = inject(ApiService);

  notifications = signal<Notification[]>([]);
  unreadCount = computed(() => this.notifications().filter(n => !n.isRead).length);
  recent = computed(() => this.notifications().slice(0, 5));

  userInitial = computed(() => {
    const email = this.auth.user()?.email || '';
    return email.charAt(0).toUpperCase();
  });

  private timer: any;
  private routerSub: any;

  ngOnInit() {
    if (this.auth.isLoggedIn) {
      this.loadNotifications();
      this.timer = setInterval(() => this.loadNotifications(), 30000);
      this.routerSub = this.router.events
        .pipe(filter(e => e instanceof NavigationEnd))
        .subscribe(() => this.loadNotifications());
    }
  }

  ngOnDestroy() {
    clearInterval(this.timer);
    this.routerSub?.unsubscribe();
  }

  loadNotifications() {
    this.api.getNotifications().subscribe({ next: n => this.notifications.set(n), error: () => {} });
  }

  openNotif(n: Notification) {
    if (!n.isRead) {
      this.api.markRead(n.id).subscribe(() => this.loadNotifications());
    }
    if (n.relatedEntityId) {
      if (n.type === 'LowStock') {
        this.router.navigate(['/supplier/products', n.relatedEntityId, 'edit']);
      } else {
        if (this.auth.role === 'Customer') {
          this.router.navigate(['/orders', n.relatedEntityId]);
        } else {
          this.router.navigate(['/admin/orders']);
        }
      }
    }
  }

  markAll() {
    this.api.markAllRead().subscribe(() => this.loadNotifications());
  }

  typeIcon(type: string): string {
    if (type === 'LowStock') return 'warning';
    if (type === 'OrderPlaced') return 'shopping_cart';
    return 'notifications';
  }

  typeColor(type: string): string {
    if (type === 'LowStock') return '#ff9800';
    if (type === 'OrderPlaced') return '#3f51b5';
    return '#4caf50';
  }
}
