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
    <div style="padding:24px;max-width:900px;margin:0 auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h2 style="margin:0">Notifications</h2>
        <button mat-stroked-button (click)="markAll()" [disabled]="unreadCount() === 0">
          <mat-icon>done_all</mat-icon> Mark all as read
        </button>
      </div>

      <table mat-table [dataSource]="dataSource" class="mat-elevation-z2 full-width">

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef style="width:8px;padding:0"></th>
          <td mat-cell *matCellDef="let n" style="width:8px;padding:0">
            @if (!n.isRead) { <div class="unread-dot"></div> }
          </td>
        </ng-container>

        <ng-container matColumnDef="type">
          <th mat-header-cell *matHeaderCellDef>Type</th>
          <td mat-cell *matCellDef="let n">
            <mat-chip [style.background]="typeColor(n.type)" style="color:#fff;font-size:.75rem">
              <mat-icon style="font-size:14px;width:14px;height:14px;margin-right:4px">{{ typeIcon(n.type) }}</mat-icon>
              {{ typeLabel(n.type) }}
            </mat-chip>
          </td>
        </ng-container>

        <ng-container matColumnDef="message">
          <th mat-header-cell *matHeaderCellDef>Message</th>
          <td mat-cell *matCellDef="let n" style="cursor:pointer;white-space:normal;line-height:1.4"
            (click)="open(n)" [style.font-weight]="n.isRead ? 'normal' : '600'">
            {{ n.message }}
          </td>
        </ng-container>

        <ng-container matColumnDef="date">
          <th mat-header-cell *matHeaderCellDef>Date</th>
          <td mat-cell *matCellDef="let n" style="white-space:nowrap;color:#666;font-size:.85rem">
            {{ n.createdAt | date:'medium' }}
          </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let n" style="white-space:nowrap">
            @if (!n.isRead) {
              <button mat-icon-button matTooltip="Mark as read" (click)="markOne(n)">
                <mat-icon style="color:#1976d2">mark_email_read</mat-icon>
              </button>
            }
            <button mat-icon-button color="warn" matTooltip="Delete" (click)="remove(n)">
              <mat-icon>delete</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let r; columns: cols;" [class.unread-row]="!r.isRead"></tr>
      </table>

      @if (dataSource.data.length === 0) {
        <div style="padding:32px;text-align:center;color:#999">
          <mat-icon style="font-size:48px;width:48px;height:48px;opacity:.3">notifications_off</mat-icon>
          <p>No notifications yet.</p>
        </div>
      }

      <mat-paginator [pageSize]="10" [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons></mat-paginator>
    </div>
  `,
  styles: [`
    .full-width { width: 100%; }
    .unread-dot { width:8px; height:8px; border-radius:50%; background:#1976d2; }
    .unread-row { background:rgba(25,118,210,.04); }
    mat-paginator { border-top:1px solid rgba(0,0,0,.12); }
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
