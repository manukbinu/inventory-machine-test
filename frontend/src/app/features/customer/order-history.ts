import { Component, inject, OnInit, ViewChild, AfterViewInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/services/api.service';
import { OrderListItem } from '../../core/models/models';

@Component({
  selector: 'app-order-history',
  imports: [DatePipe, RouterLink, MatTableModule, MatPaginatorModule, MatButtonModule, MatIconModule],
  template: `
    <!-- Page Banner -->
    <div class="page-banner">
      <div>
        <h1><mat-icon>shopping_bag</mat-icon> My Orders</h1>
        <p>Track and manage all your orders</p>
      </div>
      <div class="banner-actions">
        <button mat-stroked-button class="back-btn" (click)="router.navigate(['/browse'])">
          <mat-icon>arrow_back</mat-icon> Browse Products
        </button>
      </div>
    </div>

    <div class="page-container">
      <!-- Skeleton Loading -->
      @if (loading()) {
        @for (_ of skeletonRows; track $index) {
          <div class="skeleton skeleton-row"></div>
        }
      } @else if (dataSource.data.length === 0) {
        <div class="empty-state">
          <mat-icon>shopping_bag</mat-icon>
          <h3>No orders yet</h3>
          <p>You haven't placed any orders. Start browsing products!</p>
          <button mat-raised-button color="primary" (click)="router.navigate(['/browse'])">
            <mat-icon>storefront</mat-icon> Browse Products
          </button>
        </div>
      } @else {
        <!-- Filter Bar -->
        <div class="filter-bar">
          <input class="filter-input" placeholder="🔍 Filter by date…" (input)="applyFilter('date', $any($event.target).value)">
          <select class="filter-input filter-select" (change)="applyFilter('status', $any($event.target).value)">
            <option value="">All statuses</option>
            <option>Pending</option>
            <option>Confirmed</option>
            <option>Shipped</option>
            <option>Delivered</option>
            <option>Cancelled</option>
          </select>
          <input class="filter-input" placeholder="Min ₹…" type="number" (input)="applyFilter('total', $any($event.target).value)">
        </div>

        <div class="table-wrapper">
          <table mat-table [dataSource]="dataSource" class="orders-table">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>#</th>
              <td mat-cell *matCellDef="let o"><strong>#{{ o.id }}</strong></td>
            </ng-container>
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let o" class="date-cell">{{ o.createdAt | date:'dd MMM yyyy' }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let o">
                <span [class]="'status-chip ' + statusClass(o.status)">{{ o.status }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="total">
              <th mat-header-cell *matHeaderCellDef>Total</th>
              <td mat-cell *matCellDef="let o" class="total-cell">₹{{ o.total.toFixed(2) }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let o">
                <a mat-stroked-button [routerLink]="[o.id]" class="view-btn">
                  <mat-icon>visibility</mat-icon> View
                </a>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols;" class="order-row" (click)="router.navigate(['/orders', row.id])"></tr>
          </table>
        </div>

        <mat-paginator [pageSize]="10" [pageSizeOptions]="[10,25,50]" showFirstLastButtons></mat-paginator>
      }
    </div>
  `,
  styles: [`
    .page-banner {
      background: linear-gradient(135deg, #283593, #3f51b5);
      padding: 24px 28px; display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 12px; color: #fff;
    }
    .page-banner h1 { margin: 0; font-size: 1.6rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 10px; }
    .page-banner h1 mat-icon { color: #ffc107; }
    .page-banner p { margin: 4px 0 0; font-size: .88rem; opacity: .8; color: #fff; }
    .back-btn { border-color: rgba(255,255,255,.5) !important; color: #fff !important; border-radius: 20px !important; }

    .page-container { max-width: 1000px; margin: 0 auto; padding: 24px; }

    .filter-bar {
      display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;
      background: #fff; padding: 16px; border-radius: 12px;
      box-shadow: 0 2px 8px rgba(63,81,181,.10);
    }
    .filter-input {
      flex: 1; min-width: 160px; border: 1.5px solid #e8eaf6; border-radius: 8px;
      padding: 8px 12px; font-size: .88rem; outline: none; font-family: inherit;
      transition: border-color .2s;
    }
    .filter-input:focus { border-color: #3f51b5; }
    .filter-select { background: #fff; cursor: pointer; }

    .table-wrapper { overflow-x: auto; border-radius: 12px; box-shadow: 0 2px 8px rgba(63,81,181,.10); }
    .orders-table { width: 100%; background: #fff; }

    .order-row { cursor: pointer; transition: background .2s; }
    .order-row:hover { background: #e8eaf6 !important; }

    .date-cell { color: #666; font-size: .88rem; }
    .total-cell { font-weight: 800; color: #2e7d32; font-size: 1rem; }

    .status-chip { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: .78rem; font-weight: 700; white-space: nowrap; }
    .chip-pending   { background: #fff3e0; color: #e65100; }
    .chip-confirmed { background: #e8eaf6; color: #283593; }
    .chip-shipped   { background: #f3e5f5; color: #4a148c; }
    .chip-delivered { background: #e8f5e9; color: #2e7d32; }
    .chip-cancelled { background: #ffebee; color: #b71c1c; }

    .view-btn { color: #3f51b5 !important; font-size: .82rem !important; padding: 0 12px !important; }

    @media (max-width: 600px) {
      .page-container { padding: 16px 10px; }
      .filter-bar { flex-direction: column; }
      .filter-input { min-width: 100%; }
    }
  `]
})
export class OrderHistoryComponent implements OnInit, AfterViewInit {
  private api = inject(ApiService);
  router = inject(Router);
  loading = signal(true);
  skeletonRows = Array(5).fill(0);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  dataSource = new MatTableDataSource<OrderListItem>([]);
  cols = ['id', 'date', 'status', 'total', 'actions'];
  private filters: Record<string, string> = {};

  constructor() {
    this.dataSource.filterPredicate = (row, filter) => {
      const f = JSON.parse(filter) as Record<string, string>;
      return Object.entries(f).every(([k, v]) => {
        if (!v) return true;
        if (k === 'status') return row.status.toLowerCase() === v.toLowerCase();
        if (k === 'date') return row.createdAt.toLowerCase().includes(v.toLowerCase());
        if (k === 'total') return row.total >= parseFloat(v);
        return true;
      });
    };
  }

  ngOnInit() {
    this.api.getOrders().subscribe(o => {
      this.dataSource.data = o;
      this.loading.set(false);
    });
  }
  ngAfterViewInit() { this.dataSource.paginator = this.paginator; }

  applyFilter(col: string, value: string) {
    this.filters[col] = value.trim();
    this.dataSource.filter = JSON.stringify(this.filters);
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  statusClass(s: string): string {
    const map: Record<string, string> = {
      Pending: 'chip-pending', Confirmed: 'chip-confirmed', Shipped: 'chip-shipped',
      Delivered: 'chip-delivered', Cancelled: 'chip-cancelled'
    };
    return map[s] ?? '';
  }
}
