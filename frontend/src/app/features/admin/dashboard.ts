import { Component, inject, OnInit, signal, AfterViewInit, ElementRef, ViewChildren, ViewChild, QueryList } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/services/api.service';
import { Dashboard } from '../../core/models/models';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const STATUS_COLOR: Record<string, string> = {
  Pending: '#ff9800', Confirmed: '#2196f3', Shipped: '#9c27b0',
  Delivered: '#4caf50', Cancelled: '#f44336'
};

@Component({
  selector: 'app-admin-dashboard',
  imports: [DatePipe, RouterLink, MatCardModule, MatTableModule, MatPaginatorModule, MatChipsModule,
    MatIconModule, MatProgressSpinnerModule, MatDividerModule, MatTooltipModule],
  template: `
    <div class="dash-page">
      <div class="dash-header">
        <h1 class="dash-title">Admin Dashboard</h1>
        <span class="dash-subtitle">{{ today | date:'fullDate' }}</span>
      </div>

      @if (!data()) {
        <div class="kpi-grid">
          @for (_ of [1,2,3,4,5,6]; track $index) {
            <div class="skeleton kpi-skeleton"></div>
          }
        </div>
        <div style="display:flex;justify-content:center;margin-top:48px">
          <mat-spinner diameter="48"></mat-spinner>
        </div>
      } @else {

        <!-- ── KPI CARDS ── -->
        <div class="kpi-grid">
          <div class="kpi-card kpi-blue">
            <mat-icon class="kpi-icon">shopping_cart</mat-icon>
            <div class="kpi-body">
              <div class="kpi-label">Orders Today</div>
              <div class="kpi-value">{{ data()!.totalOrdersToday }}</div>
              <div class="kpi-sub">This month: {{ data()!.totalOrdersMonth }}</div>
            </div>
          </div>
          <div class="kpi-card kpi-green">
            <mat-icon class="kpi-icon">payments</mat-icon>
            <div class="kpi-body">
              <div class="kpi-label">Profit Today</div>
              <div class="kpi-value">₹{{ data()!.revenueToday.toFixed(0) }}</div>
              <div class="kpi-sub">This month: ₹{{ data()!.revenueMonth.toFixed(0) }} profit</div>
            </div>
          </div>
          <div class="kpi-card kpi-orange">
            <mat-icon class="kpi-icon">pending_actions</mat-icon>
            <div class="kpi-body">
              <div class="kpi-label">Pending Orders</div>
              <div class="kpi-value">{{ data()!.pendingOrdersCount }}</div>
              <div class="kpi-sub">Awaiting action</div>
            </div>
          </div>
          <div class="kpi-card kpi-red">
            <mat-icon class="kpi-icon">warning</mat-icon>
            <div class="kpi-body">
              <div class="kpi-label">Low Stock</div>
              <div class="kpi-value">{{ data()!.lowStockCount }}</div>
              <div class="kpi-sub">Out of stock: {{ data()!.outOfStockCount }}</div>
            </div>
          </div>
          <a class="kpi-card kpi-purple kpi-link" routerLink="/admin/customers">
            <mat-icon class="kpi-icon">person</mat-icon>
            <div class="kpi-body">
              <div class="kpi-label">Customers</div>
              <div class="kpi-value">{{ data()!.totalCustomers }}</div>
              <div class="kpi-sub">Registered users</div>
            </div>
          </a>
          <a class="kpi-card kpi-indigo kpi-link" routerLink="/admin/users">
            <mat-icon class="kpi-icon">store</mat-icon>
            <div class="kpi-body">
              <div class="kpi-label">Suppliers</div>
              <div class="kpi-value">{{ data()!.totalSuppliers }}</div>
              <div class="kpi-sub">Active vendors</div>
            </div>
          </a>
          <div class="kpi-card kpi-teal">
            <mat-icon class="kpi-icon">analytics</mat-icon>
            <div class="kpi-body">
              <div class="kpi-label">Avg Order Value</div>
              <div class="kpi-value">₹{{ data()!.averageOrderValue.toFixed(0) }}</div>
              <div class="kpi-sub">Per non-cancelled order</div>
            </div>
          </div>
        </div>

        <!-- ── CHARTS ── -->
        <div class="section-title">Analytics</div>
        <div class="chart-grid">
          <mat-card class="chart-card wide2">
            <mat-card-header><mat-card-title>Orders per Day (Last 30 days)</mat-card-title></mat-card-header>
            <mat-card-content><canvas #ordersChart></canvas></mat-card-content>
          </mat-card>
          <mat-card class="chart-card">
            <mat-card-header><mat-card-title>Orders by Status</mat-card-title></mat-card-header>
            <mat-card-content><canvas #statusChart></canvas></mat-card-content>
          </mat-card>
        </div>
        <div class="chart-grid" style="margin-top:16px">
          <mat-card class="chart-card wide2">
            <mat-card-header><mat-card-title>Profit Trend (Last 30 days)</mat-card-title></mat-card-header>
            <mat-card-content><canvas #revenueChart></canvas></mat-card-content>
          </mat-card>
          <mat-card class="chart-card">
            <mat-card-header><mat-card-title>Category Distribution</mat-card-title></mat-card-header>
            <mat-card-content><canvas #categoryChart></canvas></mat-card-content>
          </mat-card>
        </div>
        <mat-card style="margin-top:16px">
          <mat-card-header><mat-card-title>Profit by Supplier</mat-card-title></mat-card-header>
          <mat-card-content><canvas #supplierChart style="max-height:280px"></canvas></mat-card-content>
        </mat-card>

        <!-- ── RECENT ORDERS + TOP SELLING ── -->
        <div class="section-title" style="margin-top:24px">Order Insights</div>
        <div class="two-col-grid">
          <mat-card>
            <mat-card-header>
              <mat-card-title>Recent Orders</mat-card-title>
              <span class="card-spacer"></span>
              <button mat-icon-button matTooltip="Export CSV" (click)="exportRecentOrders()"><mat-icon>download</mat-icon></button>
            </mat-card-header>
            <mat-card-content>
              <table mat-table [dataSource]="recentDs" class="full-width">
                <ng-container matColumnDef="id"><th mat-header-cell *matHeaderCellDef>#</th><td mat-cell *matCellDef="let o">#{{ o.id }}</td></ng-container>
                <ng-container matColumnDef="customer"><th mat-header-cell *matHeaderCellDef>Customer</th><td mat-cell *matCellDef="let o">{{ o.customerName }}</td></ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let o"><span class="status-badge" [style.background]="statusBg(o.status)">{{ o.status }}</span></td>
                </ng-container>
                <ng-container matColumnDef="total"><th mat-header-cell *matHeaderCellDef>Total</th><td mat-cell *matCellDef="let o">₹{{ o.total.toFixed(2) }}</td></ng-container>
                <ng-container matColumnDef="date"><th mat-header-cell *matHeaderCellDef>Date</th><td mat-cell *matCellDef="let o">{{ o.createdAt | date:'short' }}</td></ng-container>
                <tr mat-header-row *matHeaderRowDef="recentCols"></tr>
                <tr mat-row *matRowDef="let r; columns: recentCols;"></tr>
              </table>
              @if (data()!.recentOrders.length === 0) { <p class="empty">No orders yet.</p> }
            </mat-card-content>
            <mat-paginator #recentPag [pageSize]="4" hidePageSize showFirstLastButtons></mat-paginator>
          </mat-card>

          <mat-card>
            <mat-card-header>
              <mat-card-title>Top Selling Products</mat-card-title>
              <span class="card-spacer"></span>
              <button mat-icon-button matTooltip="Export CSV" (click)="exportTopSelling()"><mat-icon>download</mat-icon></button>
            </mat-card-header>
            <mat-card-content>
              <table mat-table [dataSource]="topDs" class="full-width">
                <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Product</th><td mat-cell *matCellDef="let p">{{ p.name }}</td></ng-container>
                <ng-container matColumnDef="sold"><th mat-header-cell *matHeaderCellDef>Units Sold</th><td mat-cell *matCellDef="let p"><strong>{{ p.totalSold }}</strong></td></ng-container>
                <ng-container matColumnDef="revenue"><th mat-header-cell *matHeaderCellDef>Profit</th><td mat-cell *matCellDef="let p">₹{{ p.revenue.toFixed(0) }}</td></ng-container>
                <tr mat-header-row *matHeaderRowDef="topCols"></tr>
                <tr mat-row *matRowDef="let r; columns: topCols;"></tr>
              </table>
              @if (data()!.topSellingProducts.length === 0) { <p class="empty">No sales yet.</p> }
            </mat-card-content>
            <mat-paginator #topPag [pageSize]="4" hidePageSize showFirstLastButtons></mat-paginator>
          </mat-card>
        </div>

        <!-- ── INVENTORY ── -->
        <div class="section-title" style="margin-top:24px">Inventory Insights</div>
        <div class="two-col-grid">
          <mat-card>
            <mat-card-header>
              <mat-card-title><mat-icon style="color:#ff9800;vertical-align:middle">warning</mat-icon> Low Stock Alerts</mat-card-title>
              <span class="card-spacer"></span>
              <button mat-icon-button matTooltip="Export CSV" (click)="exportLowStock()"><mat-icon>download</mat-icon></button>
            </mat-card-header>
            <mat-card-content>
              @if (data()!.lowStockProducts.length === 0) {
                <p class="empty success-text"><mat-icon>check_circle</mat-icon> All products well stocked.</p>
              } @else {
                <table mat-table [dataSource]="lowStockDs" class="full-width">
                  <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Product</th><td mat-cell *matCellDef="let p">{{ p.name }}</td></ng-container>
                  <ng-container matColumnDef="stock"><th mat-header-cell *matHeaderCellDef>Stock</th><td mat-cell *matCellDef="let p"><span class="badge-warn">{{ p.currentStock }}</span></td></ng-container>
                  <ng-container matColumnDef="supplier"><th mat-header-cell *matHeaderCellDef>Supplier</th><td mat-cell *matCellDef="let p">{{ p.supplierEmail }}</td></ng-container>
                  <tr mat-header-row *matHeaderRowDef="['name','stock','supplier']"></tr>
                  <tr mat-row *matRowDef="let r; columns: ['name','stock','supplier'];"></tr>
                </table>
              }
            </mat-card-content>
            @if (data()!.lowStockProducts.length > 0) {
              <mat-paginator #lowPag [pageSize]="4" hidePageSize showFirstLastButtons></mat-paginator>
            }
          </mat-card>

          <mat-card>
            <mat-card-header>
              <mat-card-title><mat-icon style="color:#f44336;vertical-align:middle">remove_shopping_cart</mat-icon> Out of Stock</mat-card-title>
              <span class="card-spacer"></span>
              <button mat-icon-button matTooltip="Export CSV" (click)="exportOutOfStock()"><mat-icon>download</mat-icon></button>
            </mat-card-header>
            <mat-card-content>
              @if (data()!.outOfStockProducts.length === 0) {
                <p class="empty success-text"><mat-icon>check_circle</mat-icon> No out-of-stock items.</p>
              } @else {
                <table mat-table [dataSource]="outOfStockDs" class="full-width">
                  <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Product</th><td mat-cell *matCellDef="let p">{{ p.name }}</td></ng-container>
                  <ng-container matColumnDef="supplier"><th mat-header-cell *matHeaderCellDef>Supplier</th><td mat-cell *matCellDef="let p">{{ p.supplierEmail }}</td></ng-container>
                  <tr mat-header-row *matHeaderRowDef="['name','supplier']"></tr>
                  <tr mat-row *matRowDef="let r; columns: ['name','supplier'];"></tr>
                </table>
              }
            </mat-card-content>
            @if (data()!.outOfStockProducts.length > 0) {
              <mat-paginator #outPag [pageSize]="4" hidePageSize showFirstLastButtons></mat-paginator>
            }
          </mat-card>
        </div>

        <!-- ── SUPPLIER ANALYTICS ── -->
        <div class="section-title" style="margin-top:24px">Supplier Analytics</div>
        <mat-card>
          <mat-card-header>
            <mat-card-title>Supplier Performance</mat-card-title>
            <span class="card-spacer"></span>
            <button mat-icon-button matTooltip="Export CSV" (click)="exportSupplierPerformance()"><mat-icon>download</mat-icon></button>
          </mat-card-header>
          <mat-card-content>
            <table mat-table [dataSource]="supplierDs" class="full-width">
              <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Supplier</th><td mat-cell *matCellDef="let s">{{ s.supplierName || s.supplierEmail }}</td></ng-container>
              <ng-container matColumnDef="email"><th mat-header-cell *matHeaderCellDef>Email</th><td mat-cell *matCellDef="let s">{{ s.supplierEmail }}</td></ng-container>
              <ng-container matColumnDef="orders"><th mat-header-cell *matHeaderCellDef>Orders</th><td mat-cell *matCellDef="let s"><strong>{{ s.orderCount }}</strong></td></ng-container>
              <ng-container matColumnDef="revenue"><th mat-header-cell *matHeaderCellDef>Profit</th><td mat-cell *matCellDef="let s" style="color:#2e7d32;font-weight:600">₹{{ s.revenue.toFixed(2) }}</td></ng-container>
              <tr mat-header-row *matHeaderRowDef="supplierCols"></tr>
              <tr mat-row *matRowDef="let r; columns: supplierCols;"></tr>
            </table>
            @if (data()!.supplierOrderCounts.length === 0) { <p class="empty">No supplier data yet.</p> }
          </mat-card-content>
          <mat-paginator #supplierPag [pageSize]="4" hidePageSize showFirstLastButtons></mat-paginator>
        </mat-card>

      }
    </div>
  `,
  styles: [`
    .dash-page { padding: 24px; max-width: 1400px; margin: 0 auto; }
    .dash-header { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:24px; }
    .dash-title { font-size:1.8rem; font-weight:700; margin:0; }
    .dash-subtitle { color:#666; font-size:.9rem; }
    .section-title { font-size:1.1rem; font-weight:600; color:#444; margin:24px 0 12px; border-left:4px solid #1976d2; padding-left:10px; }
    .kpi-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:16px; margin-bottom:24px; }
    .kpi-card { display:flex; align-items:center; gap:16px; padding:20px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,.08); }
    .kpi-icon { font-size:2.5rem; width:2.5rem; height:2.5rem; opacity:.85; }
    .kpi-label { font-size:.75rem; font-weight:600; text-transform:uppercase; letter-spacing:.5px; opacity:.75; }
    .kpi-value { font-size:1.8rem; font-weight:700; line-height:1.1; }
    .kpi-sub { font-size:.75rem; opacity:.65; margin-top:2px; }
    .kpi-link { text-decoration:none; cursor:pointer; transition:transform .15s,box-shadow .15s; }
    .kpi-link:hover { transform:translateY(-2px); box-shadow:0 6px 16px rgba(0,0,0,.14); }
    .kpi-blue   { background:linear-gradient(135deg,#e3f2fd,#bbdefb); color:#0d47a1; }
    .kpi-green  { background:linear-gradient(135deg,#e8f5e9,#c8e6c9); color:#1b5e20; }
    .kpi-orange { background:linear-gradient(135deg,#fff3e0,#ffe0b2); color:#e65100; }
    .kpi-red    { background:linear-gradient(135deg,#ffebee,#ffcdd2); color:#b71c1c; }
    .kpi-purple { background:linear-gradient(135deg,#f3e5f5,#e1bee7); color:#4a148c; }
    .kpi-teal   { background:linear-gradient(135deg,#e0f2f1,#b2dfdb); color:#004d40; }
    .kpi-indigo { background:linear-gradient(135deg,#e8eaf6,#c5cae9); color:#1a237e; }
    .chart-grid { display:grid; grid-template-columns:2fr 1fr; gap:16px; }
    .wide2 { grid-column: 1; }
    .two-col-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
    .full-width { width:100%; }
    .empty { color:#999; padding:16px 0; display:flex; align-items:center; gap:6px; }
    .success-text { color:#2e7d32; }
    .status-badge { padding:2px 10px; border-radius:12px; font-size:.78rem; font-weight:600; color:#fff; }
    .badge-warn { background:#ff9800; color:#fff; padding:2px 10px; border-radius:12px; font-size:.85rem; font-weight:700; }
    .skeleton { background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:12px; }
    .kpi-skeleton { height:96px; }
    mat-paginator { border-top:1px solid rgba(0,0,0,.08); }
    .card-spacer { flex:1; }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    @media (max-width:900px) { .chart-grid { grid-template-columns:1fr; } .two-col-grid { grid-template-columns:1fr; } .kpi-grid { grid-template-columns:repeat(2,1fr); } }
    @media (max-width:600px) { .kpi-grid { grid-template-columns:1fr; } }
  `]
})
export class AdminDashboardComponent implements OnInit, AfterViewInit {
  private api = inject(ApiService);
  data = signal<Dashboard | null>(null);
  today = new Date();

  recentCols = ['id', 'customer', 'status', 'total', 'date'];
  topCols = ['name', 'sold', 'revenue'];
  supplierCols = ['name', 'email', 'orders', 'revenue'];

  recentDs = new MatTableDataSource<any>([]);
  topDs = new MatTableDataSource<any>([]);
  lowStockDs = new MatTableDataSource<any>([]);
  outOfStockDs = new MatTableDataSource<any>([]);
  supplierDs = new MatTableDataSource<any>([]);

  @ViewChild('recentPag') recentPag!: MatPaginator;
  @ViewChild('topPag') topPag!: MatPaginator;
  @ViewChild('lowPag') lowPag!: MatPaginator;
  @ViewChild('outPag') outPag!: MatPaginator;
  @ViewChild('supplierPag') supplierPag!: MatPaginator;

  private charts: Chart[] = [];

  @ViewChildren('ordersChart,revenueChart,statusChart,categoryChart,supplierChart')
  canvases!: QueryList<ElementRef<HTMLCanvasElement>>;

  ngOnInit() {
    this.api.getDashboard().subscribe(d => {
      this.data.set(d);
      this.recentDs.data = d.recentOrders;
      this.topDs.data = d.topSellingProducts;
      this.lowStockDs.data = d.lowStockProducts;
      this.outOfStockDs.data = d.outOfStockProducts;
      this.supplierDs.data = d.supplierOrderCounts;
      setTimeout(() => {
        this.recentDs.paginator = this.recentPag;
        this.topDs.paginator = this.topPag;
        this.lowStockDs.paginator = this.lowPag;
        this.outOfStockDs.paginator = this.outPag;
        this.supplierDs.paginator = this.supplierPag;
        this.renderCharts();
      }, 100);
    });
  }

  ngAfterViewInit() {}

  private renderCharts() {
    const d = this.data();
    if (!d) return;
    this.charts.forEach(c => c.destroy());
    this.charts = [];
    const els = this.canvases.toArray();
    if (els.length < 5) return;
    const [ordersEl, revenueEl, statusEl, categoryEl, supplierEl] = els;

    this.charts.push(new Chart(ordersEl.nativeElement, {
      type: 'line',
      data: { labels: d.ordersPerDay.map(x => x.date), datasets: [{ label: 'Orders', data: d.ordersPerDay.map(x => x.count), borderColor: '#1976d2', backgroundColor: 'rgba(25,118,210,.1)', fill: true, tension: 0.4, pointRadius: 4 }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    }));
    this.charts.push(new Chart(revenueEl.nativeElement, {
      type: 'line',
      data: { labels: d.revenuePerDay.map(x => x.date), datasets: [{ label: 'Profit (₹)', data: d.revenuePerDay.map(x => x.revenue), borderColor: '#2e7d32', backgroundColor: 'rgba(46,125,50,.1)', fill: true, tension: 0.4, pointRadius: 4 }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    }));
    this.charts.push(new Chart(statusEl.nativeElement, {
      type: 'doughnut',
      data: { labels: d.ordersByStatus.map(x => x.status), datasets: [{ data: d.ordersByStatus.map(x => x.count), backgroundColor: d.ordersByStatus.map(x => STATUS_COLOR[x.status] ?? '#90a4ae') }] },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    }));
    this.charts.push(new Chart(categoryEl.nativeElement, {
      type: 'pie',
      data: { labels: d.categoryProductCounts.map(x => x.categoryName), datasets: [{ data: d.categoryProductCounts.map(x => x.productCount), backgroundColor: ['#42a5f5','#66bb6a','#ffa726','#ab47bc','#26c6da','#ef5350','#8d6e63'] }] },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    }));
    this.charts.push(new Chart(supplierEl.nativeElement, {
      type: 'bar',
      data: { labels: d.revenuePerSupplier.map(x => x.supplierName || x.supplierEmail), datasets: [{ label: 'Profit (₹)', data: d.revenuePerSupplier.map(x => x.revenue), backgroundColor: '#1976d2', borderRadius: 6 }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    }));
  }

  statusBg(status: string): string { return STATUS_COLOR[status] ?? '#90a4ae'; }

  private fmtDate(iso: string) {
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2,'0')} ${(d.getMonth()+1).toString().padStart(2,'0')} ${d.getFullYear()}`;
  }

  private downloadCsv(filename: string, headers: string[], rows: string[][]) {
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  exportRecentOrders() {
    const d = this.data(); if (!d) return;
    this.downloadCsv('recent_orders.csv',
      ['#', 'Customer', 'Status', 'Total (₹)', 'Date'],
      d.recentOrders.map(o => [String(o.id), o.customerName, o.status, o.total.toFixed(2), this.fmtDate(o.createdAt)]));
  }

  exportTopSelling() {
    const d = this.data(); if (!d) return;
    this.downloadCsv('top_selling_products.csv',
      ['Product', 'Units Sold', 'Profit (₹)'],
      d.topSellingProducts.map(p => [p.name, String(p.totalSold), p.revenue.toFixed(2)]));
  }

  exportLowStock() {
    const d = this.data(); if (!d) return;
    this.downloadCsv('low_stock_alerts.csv',
      ['Product', 'Current Stock', 'Supplier'],
      d.lowStockProducts.map(p => [p.name, String(p.currentStock), p.supplierEmail]));
  }

  exportOutOfStock() {
    const d = this.data(); if (!d) return;
    this.downloadCsv('out_of_stock.csv',
      ['Product', 'Supplier'],
      d.outOfStockProducts.map(p => [p.name, p.supplierEmail]));
  }

  exportSupplierPerformance() {
    const d = this.data(); if (!d) return;
    this.downloadCsv('supplier_performance.csv',
      ['Supplier', 'Email', 'Orders', 'Profit (₹)'],
      d.supplierOrderCounts.map(s => [s.supplierName || s.supplierEmail, s.supplierEmail, String(s.orderCount), s.revenue.toFixed(2)]));
  }
}
