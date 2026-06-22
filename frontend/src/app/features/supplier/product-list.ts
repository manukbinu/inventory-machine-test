import { Component, inject, OnInit, signal, ViewChild, AfterViewInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ProductListItem } from '../../core/models/models';

@Component({
  selector: 'app-supplier-product-list',
  imports: [RouterLink, MatTableModule, MatPaginatorModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatChipsModule, MatTooltipModule],
  template: `
    @if (!auth.isApproved) {
      <div class="approval-banner">
        <mat-icon style="vertical-align:middle;margin-right:8px">warning</mat-icon>
        Your account is <strong>pending Admin approval</strong>. You cannot add or edit products until approved.
      </div>
    }

    <div class="page-header">
      <h2>My Products</h2>
      <div style="display:flex;gap:8px;align-items:center">
        <button mat-stroked-button (click)="exportCsv()">
          <mat-icon>download</mat-icon> Export CSV
        </button>
        <a mat-raised-button color="primary" routerLink="new"
           [class.disabled-link]="!auth.isApproved"
           [matTooltip]="!auth.isApproved ? 'Account not yet approved' : ''"
           (click)="onAddClick($event)">
          + Add Product
        </a>
      </div>
    </div>

    <table mat-table [dataSource]="dataSource" class="mat-elevation-z2 full-width">

      <!-- Filter row -->
      <ng-container matColumnDef="filter-name">
        <th mat-header-cell *matHeaderCellDef>
          <input class="col-filter" placeholder="Search name…" (input)="applyFilter('name', $any($event.target).value)">
        </th>
      </ng-container>
      <ng-container matColumnDef="filter-category">
        <th mat-header-cell *matHeaderCellDef>
          <input class="col-filter" placeholder="Category…" (input)="applyFilter('category', $any($event.target).value)">
        </th>
      </ng-container>
      <ng-container matColumnDef="filter-selling">
        <th mat-header-cell *matHeaderCellDef></th>
      </ng-container>
      <ng-container matColumnDef="filter-unit">
        <th mat-header-cell *matHeaderCellDef>
          <input class="col-filter" placeholder="Unit…" (input)="applyFilter('unit', $any($event.target).value)">
        </th>
      </ng-container>
      <ng-container matColumnDef="filter-stock">
        <th mat-header-cell *matHeaderCellDef></th>
      </ng-container>
      <ng-container matColumnDef="filter-actions">
        <th mat-header-cell *matHeaderCellDef></th>
      </ng-container>

      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef>Name</th>
        <td mat-cell *matCellDef="let p">{{ p.name }}</td>
      </ng-container>
      <ng-container matColumnDef="category">
        <th mat-header-cell *matHeaderCellDef>Category</th>
        <td mat-cell *matCellDef="let p">{{ p.categoryName }}</td>
      </ng-container>
      <ng-container matColumnDef="selling">
        <th mat-header-cell *matHeaderCellDef>Selling Price</th>
        <td mat-cell *matCellDef="let p">₹{{ p.sellingPrice }}</td>
      </ng-container>
      <ng-container matColumnDef="unit">
        <th mat-header-cell *matHeaderCellDef>Unit</th>
        <td mat-cell *matCellDef="let p">{{ p.unit }}</td>
      </ng-container>
      <ng-container matColumnDef="stock">
        <th mat-header-cell *matHeaderCellDef>Stock</th>
        <td mat-cell *matCellDef="let p">
          <mat-chip [color]="p.currentStock < 10 ? 'warn' : 'primary'" highlighted>{{ p.currentStock }}</mat-chip>
        </td>
      </ng-container>
      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef>Actions</th>
        <td mat-cell *matCellDef="let p" style="white-space:nowrap">
          <a mat-icon-button color="primary" matTooltip="Edit product" [routerLink]="[p.id, 'edit']"><mat-icon>edit</mat-icon></a>
          <button mat-icon-button matTooltip="Print" (click)="printRow(p)"><mat-icon>print</mat-icon></button>
          <button mat-icon-button color="warn" matTooltip="Delete product" (click)="delete(p.id)"><mat-icon>delete</mat-icon></button>
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="cols"></tr>
      <tr mat-header-row *matHeaderRowDef="filterCols" class="filter-row"></tr>
      <tr mat-row *matRowDef="let row; columns: cols;"></tr>
    </table>
    <mat-paginator [pageSize]="10" [pageSizeOptions]="[10,25,50]" showFirstLastButtons></mat-paginator>
  `,
  styles: [`
    .page-header{display:flex;justify-content:space-between;align-items:center;padding:16px 0 8px}
    .full-width{width:100%}
    .approval-banner{background:#fff3e0;border:1px solid #ff9800;border-radius:6px;padding:12px 16px;margin-bottom:16px;color:#e65100;display:flex;align-items:center}
    .disabled-link{opacity:0.5;pointer-events:none}
    .filter-row th { padding:4px 8px !important; }
    .col-filter { width:100%; border:1px solid #ccc; border-radius:4px; padding:4px 8px; font-size:.8rem; outline:none; box-sizing:border-box; }
    .col-filter:focus { border-color:#1976d2; }
    mat-paginator { border-top:1px solid rgba(0,0,0,.12); }
  `]
})
export class SupplierProductListComponent implements OnInit, AfterViewInit {
  private api = inject(ApiService);
  protected auth = inject(AuthService);
  private snack = inject(MatSnackBar);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  dataSource = new MatTableDataSource<ProductListItem>([]);
  cols = ['name', 'category', 'selling', 'unit', 'stock', 'actions'];
  filterCols = this.cols.map(c => `filter-${c}`);
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
    this.api.getProducts({ supplierId: this.auth.user()?.userId }).subscribe(res => {
      this.dataSource.data = res.items;
    });
  }

  applyFilter(col: string, value: string) {
    this.filters[col] = value.trim();
    this.dataSource.filter = JSON.stringify(this.filters);
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  exportCsv() {
    const headers = ['Name', 'Category', 'Selling Price (₹)', 'Unit', 'Stock'];
    const rows = this.dataSource.data.map(p => [
      p.name,
      p.categoryName,
      p.sellingPrice.toString(),
      p.unit,
      p.currentStock.toString()
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `products_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  printRow(p: ProductListItem) {
    const win = window.open('', '_blank', 'width=500,height=420');
    if (!win) return;
    win.document.write(`
      <html><head><title>Product — ${p.name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #222; }
        h2 { margin-bottom: 24px; }
        table { border-collapse: collapse; width: 100%; }
        td { padding: 8px 12px; border-bottom: 1px solid #eee; }
        td:first-child { font-weight: 600; width: 150px; color: #555; }
      </style></head><body>
      <h2>Product Details</h2>
      <table>
        <tr><td>Name</td><td>${p.name}</td></tr>
        <tr><td>Category</td><td>${p.categoryName}</td></tr>
        <tr><td>Selling Price</td><td>₹${p.sellingPrice}</td></tr>
        <tr><td>Unit</td><td>${p.unit}</td></tr>
        <tr><td>Current Stock</td><td>${p.currentStock}</td></tr>
      </table>
      <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body></html>
    `);
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
