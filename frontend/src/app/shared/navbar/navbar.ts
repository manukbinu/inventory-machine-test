import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
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
  imports: [RouterLink, MatToolbarModule, MatButtonModule, MatMenuModule,
    MatIconModule, MatBadgeModule, MatDividerModule, DatePipe],
  template: `
    <mat-toolbar color="primary">
      <img src="appers-logo.png" class="logo-img" alt="Appers">
      <span class="spacer"></span>

      @if (auth.isLoggedIn) {
        @if (auth.role === 'Admin') {
          <a mat-button routerLink="/admin/dashboard">Dashboard</a>
          <a mat-button routerLink="/admin/users">Suppliers</a>
          <a mat-button routerLink="/admin/customers">Customers</a>
          <a mat-button routerLink="/admin/categories">Categories</a>
          <a mat-button routerLink="/admin/orders">Orders</a>
          <a mat-button routerLink="/admin/audit-logs">Audit Logs</a>
        }
        @if (auth.role === 'Supplier') {
          <a mat-button routerLink="/supplier/products">Products</a>
          <a mat-button routerLink="/supplier/categories">Categories</a>
          <a mat-button routerLink="/supplier/orders">Orders</a>
        }
        @if (auth.role === 'Customer') {
          <a mat-button routerLink="/browse">Browse</a>
          <a mat-button routerLink="/orders">My Orders</a>
        }

        <!-- Bell icon -->
        <button mat-icon-button [matMenuTriggerFor]="notifMenu"
          [matBadge]="unreadCount()" [matBadgeHidden]="unreadCount() === 0"
          matBadgeColor="warn" matBadgeSize="small">
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
            <div class="notif-empty">No notifications</div>
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

        <button mat-icon-button [matMenuTriggerFor]="userMenu">
          <mat-icon>account_circle</mat-icon>
        </button>
        <mat-menu #userMenu>
          <span mat-menu-item disabled>{{ auth.user()?.email }}</span>
          <span mat-menu-item disabled>{{ auth.role }}</span>
          <button mat-menu-item (click)="router.navigate(['/profile'])">
            <mat-icon>manage_accounts</mat-icon> Edit Profile
          </button>
          <button mat-menu-item (click)="auth.logout()">
            <mat-icon>logout</mat-icon> Logout
          </button>
        </mat-menu>
      } @else {
        <a mat-button routerLink="/login">Login</a>
        <a mat-button routerLink="/register">Register</a>
      }
    </mat-toolbar>
  `,
  styles: [`
    .spacer { flex: 1 }
    .logo-img { height: 32px; object-fit: contain; }
    .notif-header { display:flex; justify-content:space-between; align-items:center; padding:8px 16px; font-weight:600; font-size:.9rem; }
    .mark-all-btn { font-size:.75rem; min-width:0; padding:0 8px; }
    .notif-empty { padding:16px; color:#999; text-align:center; font-size:.85rem; }
    .notif-item { display:flex !important; align-items:flex-start !important; gap:10px; padding:8px 16px !important; min-height:52px !important; }
    .notif-item.unread { background:rgba(25,118,210,.06); }
    .notif-type-icon { font-size:20px; width:20px; height:20px; flex-shrink:0; margin-top:2px; }
    .notif-text { display:flex; flex-direction:column; flex:1; overflow:hidden; }
    .notif-msg { font-size:.82rem; white-space:normal; line-height:1.3; }
    .notif-time { font-size:.73rem; color:#888; margin-top:2px; }
    .see-all { color:#1976d2 !important; font-size:.85rem; }
  `]
})
export class NavbarComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  router = inject(Router);
  private api = inject(ApiService);

  notifications = signal<Notification[]>([]);
  unreadCount = computed(() => this.notifications().filter(n => !n.isRead).length);
  recent = computed(() => this.notifications().slice(0, 5));

  private timer: any;
  private routerSub: any;

  ngOnInit() {
    if (this.auth.isLoggedIn) {
      this.loadNotifications();
      this.timer = setInterval(() => this.loadNotifications(), 30000);
      // Refresh on every navigation so the bell is always up to date
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
    if (type === 'OrderPlaced') return '#2196f3';
    return '#4caf50';
  }
}
