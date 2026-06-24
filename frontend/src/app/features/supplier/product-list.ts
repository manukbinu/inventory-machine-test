import { Component, inject, OnInit, signal, ViewChild, AfterViewInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ProductListItem } from '../../core/models/models';

@Component({
  selector: 'app-supplier-product-list',
  imports: [RouterLink, MatTableModule, MatPaginatorModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <!-- Approval Banner -->
    @if (!auth.isApproved) {
      <div class="approval-banner">
        <mat-icon>warning</mat-icon>
        <div>
          <strong>Account Pending Approval</strong>
          <p>Your account is awaiting Admin approval. You cannot add or edit products until approved.</p>
        </div>
      </div>
    }

    <!-- Page Banner -->
    <div class="page-banner">
      <div>
        <h1><mat-icon>inventory_2</mat-icon> My Products</h1>
        <p>{{ dataSource.data.length }} product{{ dataSource.data.length !== 1 ? 's' : '' }} in your catalog</p>
      </div>
      <div class="banner-actions">
        <button mat-stroked-button class="export-btn" (click)="exportCsv()">
          <mat-icon>download</mat-icon> Export CSV
        </button>
        <a mat-raised-button class="add-btn"
           routerLink="new"
           [class.disabled-link]="!auth.isApproved"
           [matTooltip]="!auth.isApproved ? 'Account not yet approved' : ''"
           (click)="onAddClick($event)">
          <mat-icon>add</mat-icon> Add Product
        </a>
      </div>
    </div>

    <div class="page-container">
      <!-- Skeleton Loading -->
      @if (loading()) {
        @for (_ of skeletonRows; track $index) {
          <div class="skeleton skeleton-row"></div>
        }
      } @else {
        <!-- Filter Bar -->
        <div class="filter-bar">
          <input class="filter-input" placeholder="🔍 Search by name…" (input)="applyFilter('name', $any($event.target).value)">
          <input class="filter-input" placeholder="Category…" (input)="applyFilter('category', $any($event.target).value)">
          <input class="filter-input" placeholder="Unit…" (input)="applyFilter('unit', $any($event.target).value)">
        </div>

        <div class="table-wrapper">
          <table mat-table [dataSource]="dataSource" class="products-table">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let p"><strong>{{ p.name }}</strong></td>
            </ng-container>
            <ng-container matColumnDef="category">
              <th mat-header-cell *matHeaderCellDef>Category</th>
              <td mat-cell *matCellDef="let p">
                <span class="cat-badge">{{ p.categoryName }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="selling">
              <th mat-header-cell *matHeaderCellDef>Selling Price</th>
              <td mat-cell *matCellDef="let p" class="price-cell">₹{{ p.sellingPrice }}</td>
            </ng-container>
            <ng-container matColumnDef="unit">
              <th mat-header-cell *matHeaderCellDef>Unit</th>
              <td mat-cell *matCellDef="let p" class="unit-cell">{{ p.unit }}</td>
            </ng-container>
            <ng-container matColumnDef="stock">
              <th mat-header-cell *matHeaderCellDef>Stock</th>
              <td mat-cell *matCellDef="let p">
                @if (p.currentStock === 0) {
                  <span class="stock-badge stock-out">Out of stock</span>
                } @else if (p.currentStock < 10) {
                  <span class="stock-badge stock-low">{{ p.currentStock }}</span>
                } @else {
                  <span class="stock-badge stock-ok">{{ p.currentStock }}</span>
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let p" class="actions-cell">
                <a mat-icon-button class="action-edit" matTooltip="Edit product" [routerLink]="[p.id, 'edit']">
                  <mat-icon>edit</mat-icon>
                </a>
                <button mat-icon-button class="action-print" matTooltip="Print" (click)="printRow(p)">
                  <mat-icon>print</mat-icon>
                </button>
                <button mat-icon-button class="action-delete" matTooltip="Delete product" (click)="delete(p.id)">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols;"></tr>
          </table>
        </div>
        <mat-paginator [pageSize]="10" [pageSizeOptions]="[10,25,50]" showFirstLastButtons></mat-paginator>
      }
    </div>
  `,
  styles: [`
    /* Approval Banner */
    .approval-banner {
      background: linear-gradient(135deg, #fff3e0, #ffe0b2);
      border-left: 5px solid #ff9800; padding: 16px 20px;
      display: flex; align-items: flex-start; gap: 14px;
      color: #e65100;
    }
    .approval-banner mat-icon { font-size: 24px; width: 24px; height: 24px; flex-shrink: 0; margin-top: 2px; }
    .approval-banner strong { display: block; font-size: 1rem; margin-bottom: 2px; }
    .approval-banner p { margin: 0; font-size: .85rem; opacity: .9; }

    /* Page Banner */
    .page-banner {
      background: linear-gradient(135deg, #283593, #3f51b5);
      padding: 24px 28px; display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 12px; color: #fff;
    }
    .page-banner h1 { margin: 0; font-size: 1.6rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 10px; }
    .page-banner h1 mat-icon { color: #ffc107; }
    .page-banner p { margin: 4px 0 0; font-size: .88rem; opacity: .8; color: #fff; }
    .banner-actions { display: flex; gap: 10px; align-items: center; }
    .export-btn { border-color: rgba(255,255,255,.5) !important; color: #fff !important; border-radius: 8px !important; }
    .add-btn { background: #ffc107 !important; color: #1a1a2e !important; font-weight: 700 !important; border-radius: 8px !important; }
    .disabled-link { opacity: .4; pointer-events: none; }

    .page-container { max-width: 1200px; margin: 0 auto; padding: 24px; }

    .filter-bar {
      display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;
      background: #fff; padding: 14px 16px; border-radius: 12px;
      box-shadow: 0 2px 8px rgba(63,81,181,.10);
    }
    .filter-input {
      flex: 1; min-width: 140px; border: 1.5px solid #e8eaf6; border-radius: 8px;
      padding: 8px 12px; font-size: .88rem; outline: none; font-family: inherit;
      transition: border-color .2s;
    }
    .filter-input:focus { border-color: #3f51b5; }

    .table-wrapper { overflow-x: auto; border-radius: 12px; box-shadow: 0 2px 8px rgba(63,81,181,.10); }
    .products-table { width: 100%; background: #fff; }

    .cat-badge { background: #e8eaf6; color: #283593; font-size: .75rem; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
    .price-cell { font-weight: 700; color: #3f51b5; }
    .unit-cell { color: #666; font-size: .88rem; }
    .stock-badge { font-size: .78rem; font-weight: 700; padding: 3px 12px; border-radius: 20px; }
    .stock-ok  { background: #e8f5e9; color: #2e7d32; }
    .stock-low { background: #fff3e0; color: #e65100; }
    .stock-out { background: #ffebee; color: #b71c1c; }

    .actions-cell { white-space: nowrap; }
    .action-edit { color: #3f51b5 !important; }
    .action-print { color: #666 !important; }
    .action-delete { color: #f44336 !important; }

    @media (max-width: 600px) {
      .page-container { padding: 16px 10px; }
      .filter-bar { flex-direction: column; }
    }
  `]
})
export class SupplierProductListComponent implements OnInit, AfterViewInit {
  private api = inject(ApiService);
  protected auth = inject(AuthService);
  private snack = inject(MatSnackBar);

  loading = signal(true);
  skeletonRows = Array(8).fill(0);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  dataSource = new MatTableDataSource<ProductListItem>([]);
  cols = ['name', 'category', 'selling', 'unit', 'stock', 'actions'];
  private filters: Record<string, string> = {};

  constructor() {
    this.dataSource.filterPredicate = (row, filter) => {
      const f = JSON.parse(filter) as Record<string, string>;
      return Object.entries(f).every(([k, v]) => {
        if (!v) return true;
        const val = v.toLowerCase();
        if (k === 'name') return row.name.toLowerCase().includes(val);
        if (k === 'category') return row.categoryName.toLowerCase().includes(val);
        if (k === 'unit') return row.unit.toLowerCase().includes(val);
        return true;
      });
    };
  }

  ngOnInit() { this.load(); }
  ngAfterViewInit() { this.dataSource.paginator = this.paginator; }

  onAddClick(e: Event) { if (!this.auth.isApproved) e.preventDefault(); }

  load() {
    this.loading.set(true);
    this.api.getProducts({ supplierId: this.auth.user()?.userId }).subscribe(res => {
      this.dataSource.data = res.items;
      this.loading.set(false);
    });
  }

  applyFilter(col: string, value: string) {
    this.filters[col] = value.trim();
    this.dataSource.filter = JSON.stringify(this.filters);
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  exportCsv() {
    const headers = ['Name', 'Category', 'Selling Price (₹)', 'Unit', 'Stock'];
    const rows = this.dataSource.data.map(p => [p.name, p.categoryName, p.sellingPrice.toString(), p.unit, p.currentStock.toString()]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `products_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  printRow(p: ProductListItem) {
    const win = window.open('', '_blank', 'width=500,height=420');
    if (!win) return;
    win.document.write(`<html><head><title>Product — ${p.name}</title>
      <style>body{font-family:Arial,sans-serif;padding:32px;color:#222}h2{margin-bottom:24px}table{border-collapse:collapse;width:100%}td{padding:8px 12px;border-bottom:1px solid #eee}td:first-child{font-weight:600;width:150px;color:#555}</style></head><body>
      <h2>Product Details</h2><table>
      <tr><td>Name</td><td>${p.name}</td></tr><tr><td>Category</td><td>${p.categoryName}</td></tr>
      <tr><td>Selling Price</td><td>₹${p.sellingPrice}</td></tr><tr><td>Unit</td><td>${p.unit}</td></tr>
      <tr><td>Current Stock</td><td>${p.currentStock}</td></tr></table>
      <script>window.onload=()=>{window.print();window.close()}<\/script></body></html>`);
    win.document.close();
  }

  delete(id: number) {
    if (!confirm('Delete this product?')) return;
    this.api.deleteProduct(id).subscribe({
      next: () => { this.snack.open('Product deleted', 'OK', { duration: 2000 }); this.load(); },
      error: () => this.snack.open('Delete failed', 'OK', { duration: 2000 })
    });
  }
}
