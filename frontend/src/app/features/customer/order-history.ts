import { Component, inject, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/services/api.service';
import { OrderListItem } from '../../core/models/models';

@Component({
  selector: 'app-order-history',
  imports: [DatePipe, RouterLink, MatTableModule, MatPaginatorModule, MatChipsModule, MatButtonModule, MatIconModule],
  template: `
    <div style="padding:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
        <button mat-stroked-button (click)="router.navigate(['/browse'])">
          <mat-icon>arrow_back</mat-icon> Back
        </button>
        <h2 style="margin:0">My Orders</h2>
      </div>

      <table mat-table [dataSource]="dataSource" class="mat-elevation-z2 full-width">

        <!-- Filter row -->
        <ng-container matColumnDef="filter-id"><th mat-header-cell *matHeaderCellDef></th></ng-container>
        <ng-container matColumnDef="filter-date"><th mat-header-cell *matHeaderCellDef><input class="col-filter" placeholder="Date…" (input)="applyFilter('date', $any($event.target).value)"></th></ng-container>
        <ng-container matColumnDef="filter-status">
          <th mat-header-cell *matHeaderCellDef>
            <select class="col-filter" (change)="applyFilter('status', $any($event.target).value)">
              <option value="">All</option>
              <option>Pending</option>
              <option>Confirmed</option>
              <option>Shipped</option>
              <option>Delivered</option>
              <option>Cancelled</option>
            </select>
          </th>
        </ng-container>
        <ng-container matColumnDef="filter-total"><th mat-header-cell *matHeaderCellDef><input class="col-filter" placeholder="Min ₹…" type="number" (input)="applyFilter('total', $any($event.target).value)"></th></ng-container>
        <ng-container matColumnDef="filter-actions"><th mat-header-cell *matHeaderCellDef></th></ng-container>

        <ng-container matColumnDef="id">
          <th mat-header-cell *matHeaderCellDef>#</th>
          <td mat-cell *matCellDef="let o; index as i">{{ dataSource.data.length - dataSource.data.indexOf(o) }}</td>
        </ng-container>
        <ng-container matColumnDef="date">
          <th mat-header-cell *matHeaderCellDef>Date</th>
          <td mat-cell *matCellDef="let o">{{ o.createdAt | date }}</td>
        </ng-container>
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let o">
            <mat-chip [color]="statusColor(o.status)" highlighted>{{ o.status }}</mat-chip>
          </td>
        </ng-container>
        <ng-container matColumnDef="total">
          <th mat-header-cell *matHeaderCellDef>Total</th>
          <td mat-cell *matCellDef="let o">₹{{ o.total.toFixed(2) }}</td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let o"><a mat-button [routerLink]="[o.id]">View</a></td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-header-row *matHeaderRowDef="filterCols" class="filter-row"></tr>
        <tr mat-row *matRowDef="let row; columns: cols;"></tr>
      </table>

      @if (dataSource.data.length === 0) { <p>No orders yet.</p> }
      <mat-paginator [pageSize]="10" [pageSizeOptions]="[10,25,50]" showFirstLastButtons></mat-paginator>
    </div>
  `,
  styles: [`
    .full-width { width:100%; }
    mat-paginator { border-top:1px solid rgba(0,0,0,.12); }
    .filter-row th { padding:4px 8px !important; }
    .col-filter { width:100%; border:1px solid #ccc; border-radius:4px; padding:4px 6px; font-size:.8rem; outline:none; box-sizing:border-box; background:#fff; }
    .col-filter:focus { border-color:#1976d2; }
  `]
})
export class OrderHistoryComponent implements OnInit, AfterViewInit {
  private api = inject(ApiService);
  router = inject(Router);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  dataSource = new MatTableDataSource<OrderListItem>([]);
  cols = ['id', 'date', 'status', 'total', 'actions'];
  filterCols = this.cols.map(c => `filter-${c}`);
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

  ngOnInit() { this.api.getOrders().subscribe(o => { this.dataSource.data = o; }); }
  ngAfterViewInit() { this.dataSource.paginator = this.paginator; }

  applyFilter(col: string, value: string) {
    this.filters[col] = value.trim();
    this.dataSource.filter = JSON.stringify(this.filters);
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  statusColor(s: string) {
    return { Pending: 'primary', Confirmed: 'accent', Shipped: 'accent', Delivered: 'primary', Cancelled: 'warn' }[s] ?? 'primary';
  }
}
