import { Component, inject, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Notification } from '../../core/models/models';

@Component({
  selector: 'app-notifications',
  imports: [DatePipe, MatTableModule, MatPaginatorModule, MatButtonModule,
    MatIconModule, MatChipsModule, MatTooltipModule],
  template: `
    <!-- Banner -->
    <div class="page-banner">
      <div style="display:flex;align-items:center;gap:12px">
        <h1><mat-icon>notifications</mat-icon> Notifications</h1>
        @if (unreadCount() > 0) {
          <span class="unread-badge">{{ unreadCount() }} unread</span>
        }
      </div>
      <button mat-stroked-button class="mark-all-btn" (click)="markAll()" [disabled]="unreadCount() === 0">
        <mat-icon>done_all</mat-icon> Mark all as read
      </button>
    </div>

    <div class="page-container">
      <div class="table-wrapper">
        <table mat-table [dataSource]="dataSource" class="notif-table">

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef style="width:4px;padding:0"></th>
            <td mat-cell *matCellDef="let n" style="padding:0 4px">
              @if (!n.isRead) { <div class="unread-dot"></div> }
            </td>
          </ng-container>

          <ng-container matColumnDef="type">
            <th mat-header-cell *matHeaderCellDef>Type</th>
            <td mat-cell *matCellDef="let n">
              <span class="type-chip" [style.background]="typeColor(n.type)">
                <mat-icon class="type-icon">{{ typeIcon(n.type) }}</mat-icon>
                {{ typeLabel(n.type) }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="message">
            <th mat-header-cell *matHeaderCellDef>Message</th>
            <td mat-cell *matCellDef="let n" class="message-cell"
              (click)="open(n)" [class.unread-text]="!n.isRead">
              {{ n.message }}
            </td>
          </ng-container>

          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Date</th>
            <td mat-cell *matCellDef="let n" class="date-cell">{{ n.createdAt | date:'dd MMM yy, h:mm a' }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let n" style="white-space:nowrap">
              @if (!n.isRead) {
                <button mat-icon-button class="btn-read" matTooltip="Mark as read" (click)="markOne(n)">
                  <mat-icon>mark_email_read</mat-icon>
                </button>
              }
              <button mat-icon-button class="btn-delete" matTooltip="Delete" (click)="remove(n)">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let r; columns: cols;" [class.unread-row]="!r.isRead"></tr>
        </table>
      </div>

      @if (dataSource.data.length === 0) {
        <div class="empty-state">
          <mat-icon>notifications_off</mat-icon>
          <h3>No notifications</h3>
          <p>You're all caught up!</p>
        </div>
      }

      <mat-paginator [pageSize]="10" [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons></mat-paginator>
    </div>
  `,
  styles: [`
    .page-banner {
      background: linear-gradient(135deg, #1a237e, #3f51b5);
      padding: 20px 28px; display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 12px; color: #fff;
    }
    .page-banner h1 { margin: 0; font-size: 1.5rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 10px; }
    .page-banner h1 mat-icon { color: #ffc107; }
    .unread-badge { background: #ffc107; color: #1a1a2e; font-size: .75rem; font-weight: 800; padding: 3px 10px; border-radius: 20px; }
    .mark-all-btn { border-color: rgba(255,255,255,.5) !important; color: #fff !important; border-radius: 8px !important; }

    .page-container { max-width: 960px; margin: 0 auto; padding: 24px; }
    .table-wrapper { overflow-x: auto; border-radius: 12px; box-shadow: 0 2px 8px rgba(63,81,181,.10); }
    .notif-table { width: 100%; background: #fff; }

    .unread-row { background: #f0f4ff !important; border-left: 4px solid #3f51b5; }
    .unread-dot { width: 9px; height: 9px; border-radius: 50%; background: #3f51b5; box-shadow: 0 0 4px rgba(63,81,181,.4); }
    .unread-text { font-weight: 700; }

    .type-chip { display: inline-flex; align-items: center; gap: 4px; color: #fff; font-size: .73rem; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
    .type-icon { font-size: 13px !important; height: 13px !important; width: 13px !important; }

    .message-cell { cursor: pointer; white-space: normal; line-height: 1.5; font-size: .9rem; }
    .date-cell { white-space: nowrap; color: #888; font-size: .82rem; }

    .btn-read { color: #3f51b5 !important; }
    .btn-delete { color: #f44336 !important; }

    @media (max-width: 600px) { .page-container { padding: 16px 10px; } }
  `]
})
export class NotificationsComponent implements OnInit, AfterViewInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  dataSource = new MatTableDataSource<Notification>([]);
  cols = ['status', 'type', 'message', 'date', 'actions'];

  ngOnInit() { this.load(); }
  ngAfterViewInit() { this.dataSource.paginator = this.paginator; }

  load() {
    this.api.getNotifications().subscribe(n => { this.dataSource.data = n; });
  }

  unreadCount() { return this.dataSource.data.filter(n => !n.isRead).length; }

  markOne(n: Notification) {
    this.api.markRead(n.id).subscribe(() => this.load());
  }

  markAll() {
    this.api.markAllRead().subscribe(() => this.load());
  }

  remove(n: Notification) {
    this.api.deleteNotification(n.id).subscribe(() => this.load());
  }

  open(n: Notification) {
    if (!n.isRead) this.api.markRead(n.id).subscribe();
    if (!n.relatedEntityId) return;
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

  typeLabel(type: string): string {
    if (type === 'LowStock') return 'Low Stock';
    if (type === 'OrderPlaced') return 'Order Placed';
    if (type === 'OrderStatusChanged') return 'Order Update';
    return type;
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
