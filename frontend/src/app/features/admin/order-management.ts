import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { ApiService } from '../../core/services/api.service';
import { OrderListItem, Order } from '../../core/models/models';

const TRANSITIONS: Record<string, string[]> = {
  Pending:   ['Confirmed', 'Cancelled'],
  Confirmed: ['Cancelled'],   // Shipped is auto when all fulfillments shipped
  Shipped:   ['Delivered'],
  Delivered: [],
  Cancelled: []
};

const FULFILLMENT_COLOR: Record<string, string> = {
  Pending: '#f57c00', Processing: '#1976d2', Shipped: '#388e3c', Cancelled: '#d32f2f'
};

const STATUS_CHIP: Record<string, string> = {
  Pending: 'accent', Confirmed: 'primary', Shipped: 'primary',
  Delivered: 'primary', Cancelled: 'warn'
};

@Component({
  selector: 'app-order-management',
  imports: [DatePipe, MatCardModule, MatTableModule, MatChipsModule,
    MatButtonModule, MatIconModule, MatExpansionModule, MatDividerModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule],
  styles: [`
    .page-banner {
      background: linear-gradient(135deg, #1a237e, #3f51b5);
      padding: 24px 28px; display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 12px; color: #fff;
    }
    .page-banner h1 { margin: 0; font-size: 1.6rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 10px; }
    .page-banner h1 mat-icon { color: #ffc107; }
    .page-banner p { margin: 4px 0 0; font-size: .88rem; opacity: .8; color: #fff; }
    .banner-actions { display: flex; gap: 10px; }
    .export-btn { border-color: rgba(255,255,255,.5) !important; color: #fff !important; border-radius: 8px !important; }
    .page-body { max-width: 1200px; margin: 0 auto; padding: 24px; }
    .filter-bar-card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(63,81,181,.10); }
    mat-expansion-panel { margin-bottom: 10px; border-radius: 12px !important; box-shadow: 0 2px 8px rgba(63,81,181,.10) !important; }
    mat-panel-description { flex: 1; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .order-status-chip { font-size: .73rem; font-weight: 700; padding: 3px 12px; border-radius: 20px; }
    .chip-pending   { background: #fff3e0; color: #e65100; }
    .chip-confirmed { background: #e8eaf6; color: #283593; }
    .chip-shipped   { background: #f3e5f5; color: #4a148c; }
    .chip-delivered { background: #e8f5e9; color: #2e7d32; }
    .chip-cancelled { background: #ffebee; color: #b71c1c; }
    .customer-info { display:flex; flex-direction:column; gap:6px; background:#f8f9ff; border-radius:10px; padding:14px 16px; margin-bottom:16px; }
    .customer-info div { display:flex; align-items:flex-start; gap:8px; font-size:.9rem; }
    .info-icon { font-size:18px; height:18px; width:18px; color:#3f51b5; flex-shrink:0; margin-top:1px; }
    .wrap-text { white-space:pre-wrap; word-break:break-word; }
    .fulfillment-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px; margin-bottom:16px; }
    .fulfillment-card { border:1px solid #e8eaf6; border-radius:10px; padding:12px 14px; background:#fff; }
    .fulfillment-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; }
    .f-badge { font-size:.73rem; font-weight:700; padding:3px 10px; border-radius:20px; color:#fff; }
    .status-dot { width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:4px; }
    .all-shipped-banner { background:#e8f5e9; border-left:4px solid #2e7d32; border-radius:8px; padding:10px 16px; margin-bottom:12px; font-size:.85rem; color:#2e7d32; }
    .status-controls { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:8px; padding-top:12px; border-top:1px solid #f0f2f8; }
    .status-label { font-weight:600; font-size:.85rem; color:#666; }
    .btn-confirm  { background: #3f51b5 !important; color: #fff !important; border-radius: 8px !important; }
    .btn-ship     { background: #7b1fa2 !important; color: #fff !important; border-radius: 8px !important; }
    .btn-deliver  { background: #2e7d32 !important; color: #fff !important; border-radius: 8px !important; }
    .btn-cancel   { background: #f44336 !important; color: #fff !important; border-radius: 8px !important; }
    .no-more { color: #888; font-size: .82rem; margin-top: 4px; }
    @media (max-width: 768px) { .page-body { padding: 16px 10px; } }
  `],
  template: `
    <div class="page-banner">
      <div>
        <h1><mat-icon>receipt_long</mat-icon> Order Management</h1>
        <p>{{ filtered().length }} order{{ filtered().length !== 1 ? 's' : '' }} shown</p>
      </div>
      <div class="banner-actions">
        <button mat-stroked-button class="export-btn" (click)="exportCsv()">
          <mat-icon>download</mat-icon> Export CSV
        </button>
      </div>
    </div>
    <div class="page-body">
      <!-- Filters -->
      <div class="filter-bar-card">
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
        <mat-form-field appearance="outline" style="flex:1;min-width:200px">
          <mat-label>Search customer</mat-label>
          <input matInput (input)="searchQ.set($any($event.target).value)" placeholder="Name or email…">
        </mat-form-field>
        <mat-form-field appearance="outline" style="min-width:160px">
          <mat-label>Status</mat-label>
          <mat-select (selectionChange)="statusQ.set($event.value)">
            <mat-option [value]="''">All</mat-option>
            @for (s of allStatuses; track s) { <mat-option [value]="s">{{ s }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" style="min-width:160px">
          <mat-label>From Date</mat-label>
          <input matInput [matDatepicker]="fromPicker" (dateChange)="setFromDate($event.value)" placeholder="DD/MM/YYYY">
          <mat-datepicker-toggle matIconSuffix [for]="fromPicker"></mat-datepicker-toggle>
          <mat-datepicker #fromPicker></mat-datepicker>
        </mat-form-field>
        <mat-form-field appearance="outline" style="min-width:160px">
          <mat-label>To Date</mat-label>
          <input matInput [matDatepicker]="toPicker" [min]="fromDate()" (dateChange)="toDate.set($event.value)" placeholder="DD/MM/YYYY">
          <mat-datepicker-toggle matIconSuffix [for]="toPicker"></mat-datepicker-toggle>
          <mat-datepicker #toPicker></mat-datepicker>
        </mat-form-field>
        @if (fromDate() || toDate()) {
          <button mat-icon-button matTooltip="Clear dates" (click)="clearDates()"><mat-icon>clear</mat-icon></button>
        }
        </div>
      </div>

      @if (filtered().length === 0) {
        <div class="empty-state">
          <mat-icon>receipt_long</mat-icon>
          <h3>No orders found</h3>
          <p>Try adjusting your filters.</p>
        </div>
      }

      <mat-accordion multi>
        @for (o of filtered(); track o.id) {
          <mat-expansion-panel (opened)="loadDetail(o.id)">
            <mat-expansion-panel-header>
              <mat-panel-title style="flex:0 0 90px"><strong style="color:#3f51b5">#{{ o.id }}</strong></mat-panel-title>
              <mat-panel-description>
                <strong>{{ o.customerName || o.customerEmail }}</strong>
                <span style="color:#888;font-size:.82rem">{{ o.createdAt | date:'dd MMM yyyy' }}</span>
                <span class="order-status-chip" [class]="statusClass(o.status)">{{ o.status }}</span>
                <strong style="margin-left:auto;color:#3f51b5">₹{{ o.total.toFixed(2) }}</strong>
                <button mat-icon-button matTooltip="Print order" (click)="$event.stopPropagation(); printOrder(o)">
                  <mat-icon>print</mat-icon>
                </button>
              </mat-panel-description>
            </mat-expansion-panel-header>

            @if (detail()[o.id]) {
              <div class="customer-info">
                <div><mat-icon class="info-icon">person</mat-icon><span>{{ detail()[o.id]!.customerName || detail()[o.id]!.customerEmail }}</span></div>
                <div><mat-icon class="info-icon">email</mat-icon><span>{{ detail()[o.id]!.customerEmail }}</span></div>
                @if (detail()[o.id]!.customerPhone) {
                  <div><mat-icon class="info-icon">phone</mat-icon><span>{{ detail()[o.id]!.customerPhone }}</span></div>
                }
                @if (detail()[o.id]!.customerAddress) {
                  <div><mat-icon class="info-icon">location_on</mat-icon><span class="wrap-text">{{ detail()[o.id]!.customerAddress }}</span></div>
                }
              </div>

              @if (detail()[o.id]!.fulfillments.length > 0) {
                <p style="font-weight:700;margin:0 0 10px;font-size:.85rem;color:#3f51b5">Supplier Fulfillments</p>
                <div class="fulfillment-grid">
                  @for (f of detail()[o.id]!.fulfillments; track f.supplierId) {
                    <div class="fulfillment-card">
                      <div class="fulfillment-header">
                        <span style="font-weight:600;font-size:.85rem">{{ f.supplierName || f.supplierEmail }}</span>
                        <span class="f-badge" [style.background]="FULFILLMENT_COLOR[f.status]">{{ f.status }}</span>
                      </div>
                      <div style="font-size:.75rem;color:#888">{{ f.supplierEmail }}</div>
                    </div>
                  }
                </div>
                @if (allFulfillmentsShipped(o.id)) {
                  <div class="all-shipped-banner">✓ All suppliers have shipped — order is ready to deliver.</div>
                }
                <mat-divider style="margin-bottom:16px"></mat-divider>
              }

              <table mat-table [dataSource]="detail()[o.id]!.items" style="width:100%;margin-bottom:16px">
                <ng-container matColumnDef="product">
                  <th mat-header-cell *matHeaderCellDef>Product</th>
                  <td mat-cell *matCellDef="let i"><strong>{{ i.productName }}</strong></td>
                </ng-container>
                <ng-container matColumnDef="qty">
                  <th mat-header-cell *matHeaderCellDef>Qty</th>
                  <td mat-cell *matCellDef="let i">{{ i.quantity }}</td>
                </ng-container>
                <ng-container matColumnDef="price">
                  <th mat-header-cell *matHeaderCellDef>Price</th>
                  <td mat-cell *matCellDef="let i">₹{{ i.priceAtOrder }}</td>
                </ng-container>
                <ng-container matColumnDef="subtotal">
                  <th mat-header-cell *matHeaderCellDef>Subtotal</th>
                  <td mat-cell *matCellDef="let i" style="font-weight:700;color:#3f51b5">₹{{ i.subtotal.toFixed(2) }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="cols"></tr>
                <tr mat-row *matRowDef="let row; columns: cols;"></tr>
              </table>
            } @else {
              <div class="skeleton skeleton-row" style="margin:12px 0"></div>
            }

            <div class="status-controls">
              <span class="status-label">Change status:</span>
              @for (next of nextStatuses(o.status); track next) {
                <button mat-raised-button [class]="statusBtnClass(next)" (click)="changeStatus(o, next)">
                  <mat-icon>arrow_forward</mat-icon> {{ next }}
                </button>
              }
              @if (nextStatuses(o.status).length === 0) {
                <span class="no-more">No further status changes available.</span>
              }
            </div>
          </mat-expansion-panel>
        }
      </mat-accordion>
    </div>
  `
})
export class OrderManagementComponent implements OnInit {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  orders = signal<OrderListItem[]>([]);
  detail = signal<Record<number, Order | null>>({});
  cols = ['product', 'qty', 'price', 'subtotal'];
  searchQ = signal('');
  statusQ = signal('');
  fromDate = signal<Date | null>(null);
  toDate = signal<Date | null>(null);
  allStatuses = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

  filtered = computed(() => {
    const q = this.searchQ().toLowerCase();
    const s = this.statusQ().toLowerCase();
    const from = this.fromDate();
    const to = this.toDate();
    return this.orders().filter(o => {
      const matchQ = !q || (o.customerName ?? '').toLowerCase().includes(q) || o.customerEmail.toLowerCase().includes(q);
      const matchS = !s || o.status.toLowerCase() === s;
      const orderDate = new Date(o.createdAt);
      const matchFrom = !from || orderDate >= new Date(from.setHours(0, 0, 0, 0));
      const matchTo = !to || orderDate <= new Date(to.setHours(23, 59, 59, 999));
      return matchQ && matchS && matchFrom && matchTo;
    });
  });

  setFromDate(date: Date | null) {
    this.fromDate.set(date);
    if (date && this.toDate() && this.toDate()! <= date) this.toDate.set(null);
  }

  clearDates() { this.fromDate.set(null); this.toDate.set(null); }

  readonly STATUS_CHIP = STATUS_CHIP;
  readonly FULFILLMENT_COLOR = FULFILLMENT_COLOR;

  ngOnInit() { this.api.getOrders().subscribe(list => this.orders.set(list)); }

  loadDetail(id: number) {
    if (this.detail()[id]) return;
    this.api.getOrder(id).subscribe(o => this.detail.update(d => ({ ...d, [id]: o })));
  }

  nextStatuses(status: string): string[] { return TRANSITIONS[status] ?? []; }

  allFulfillmentsShipped(orderId: number): boolean {
    const f = this.detail()[orderId]?.fulfillments ?? [];
    return f.length > 0 && f.every(x => x.status === 'Shipped');
  }

  private fmtDate(iso: string) {
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2,'0')} ${(d.getMonth()+1).toString().padStart(2,'0')} ${d.getFullYear()}`;
  }

  exportCsv() {
    const headers = ['Order ID', 'Customer', 'Email', 'Phone', 'Address', 'Date', 'Status', 'Total (₹)'];
    const rows = this.orders().map(o => [
      String(o.id),
      o.customerName ?? '',
      o.customerEmail,
      o.customerPhone ?? '',
      o.customerAddress ?? '',
      this.fmtDate(o.createdAt),
      o.status,
      o.total.toFixed(2)
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  printOrder(o: OrderListItem) {
    const d = this.detail()[o.id];
    const itemsHtml = d
      ? d.items.map(i => `<tr><td>${i.productName}</td><td>${i.quantity}</td><td>₹${i.priceAtOrder}</td><td>₹${i.subtotal.toFixed(2)}</td></tr>`).join('')
      : '<tr><td colspan="4" style="color:#888">Expand the order first to load item details.</td></tr>';
    const fulfillHtml = d && d.fulfillments.length
      ? d.fulfillments.map(f => `<tr><td>${f.supplierName || f.supplierEmail}</td><td>${f.status}</td></tr>`).join('')
      : '';

    const win = window.open('', '_blank', 'width=700,height=600');
    if (!win) return;
    win.document.write(`
      <html><head><title>Order #${o.id}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #222; }
        h2 { margin-bottom: 4px; } .sub { color:#555; font-size:.9rem; margin-bottom:20px; }
        .info { display:grid; grid-template-columns:1fr 1fr; gap:8px 24px; margin-bottom:20px; font-size:.9rem; }
        .info span:nth-child(odd) { font-weight:600; color:#555; }
        table { border-collapse:collapse; width:100%; margin-bottom:20px; }
        th { background:#f5f5f5; text-align:left; padding:8px 10px; font-size:.85rem; border-bottom:2px solid #ddd; }
        td { padding:7px 10px; border-bottom:1px solid #eee; font-size:.85rem; }
        .total { text-align:right; font-weight:700; font-size:1rem; margin-top:8px; }
        h3 { margin:16px 0 8px; font-size:.95rem; color:#333; }
      </style></head><body>
      <h2>Order #${o.id}</h2>
      <div class="sub">Status: <strong>${o.status}</strong> &nbsp;|&nbsp; Date: ${this.fmtDate(o.createdAt)}</div>
      <div class="info">
        <span>Customer</span><span>${o.customerName || '—'}</span>
        <span>Email</span><span>${o.customerEmail}</span>
        <span>Phone</span><span>${o.customerPhone || '—'}</span>
        <span>Address</span><span>${o.customerAddress || '—'}</span>
      </div>
      <h3>Items</h3>
      <table><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
      <tbody>${itemsHtml}</tbody></table>
      <div class="total">Total: ₹${o.total.toFixed(2)}</div>
      ${fulfillHtml ? `<h3>Supplier Fulfillments</h3><table><thead><tr><th>Supplier</th><th>Status</th></tr></thead><tbody>${fulfillHtml}</tbody></table>` : ''}
      <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body></html>
    `);
    win.document.close();
  }

  statusClass(s: string): string {
    const map: Record<string, string> = { Pending: 'chip-pending', Confirmed: 'chip-confirmed', Shipped: 'chip-shipped', Delivered: 'chip-delivered', Cancelled: 'chip-cancelled' };
    return `order-status-chip ${map[s] ?? ''}`;
  }

  statusBtnClass(next: string): string {
    const map: Record<string, string> = { Confirmed: 'btn-confirm', Shipped: 'btn-ship', Delivered: 'btn-deliver', Cancelled: 'btn-cancel' };
    return map[next] ?? 'btn-confirm';
  }

  changeStatus(order: OrderListItem, newStatus: string) {
    this.api.updateOrderStatus(order.id, newStatus).subscribe({
      next: () => {
        this.orders.update(list => list.map(o => o.id === order.id ? { ...o, status: newStatus } : o));
        this.detail.update(d => d[order.id] ? { ...d, [order.id]: { ...d[order.id]!, status: newStatus } } : d);
        this.snack.open(`Order #${order.id} → ${newStatus}`, 'OK', { duration: 3000 });
      },
      error: err => this.snack.open(err.error || 'Update failed', 'OK', { duration: 3000 })
    });
  }
}
