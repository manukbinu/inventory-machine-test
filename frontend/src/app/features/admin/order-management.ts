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
    mat-expansion-panel { margin-bottom:8px; }
    mat-panel-description { flex:1; }
    .customer-info { display:flex; flex-direction:column; gap:6px; background:#f9f9f9; border-radius:6px; padding:12px 16px; margin-bottom:16px; }
    .customer-info div { display:flex; align-items:flex-start; gap:8px; font-size:.9rem; }
    .info-icon { font-size:18px; height:18px; width:18px; color:#555; flex-shrink:0; margin-top:1px; }
    .wrap-text { white-space:pre-wrap; word-break:break-word; }
    .fulfillment-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px; margin-bottom:16px; }
    .fulfillment-card { border:1px solid #e0e0e0; border-radius:8px; padding:10px 14px; }
    .fulfillment-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; }
    .f-badge { font-size:.75rem; font-weight:600; padding:2px 8px; border-radius:10px; color:#fff; }
    .status-dot { width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:4px; }
  `],
  template: `
    <div style="padding:24px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
        <h2 style="margin:0">Order Management</h2>
        <button mat-stroked-button (click)="exportCsv()">
          <mat-icon>download</mat-icon> Export CSV
        </button>
      </div>

      <!-- Filters -->
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
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

      @if (filtered().length === 0) { <p>No orders found.</p> }

      <mat-accordion multi>
        @for (o of filtered(); track o.id) {
          <mat-expansion-panel (opened)="loadDetail(o.id)">
            <mat-expansion-panel-header>
              <mat-panel-title style="flex:0 0 120px">Order #{{ o.id }}</mat-panel-title>
              <mat-panel-description style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
                <strong>{{ o.customerName || o.customerEmail }}</strong>
                <span>{{ o.createdAt | date:'short' }}</span>
                <mat-chip [color]="STATUS_CHIP[o.status]" highlighted style="margin-left:auto">{{ o.status }}</mat-chip>
                <strong>₹{{ o.total.toFixed(2) }}</strong>
                <button mat-icon-button matTooltip="Print order" (click)="$event.stopPropagation(); printOrder(o)">
                  <mat-icon>print</mat-icon>
                </button>
              </mat-panel-description>
            </mat-expansion-panel-header>

            @if (detail()[o.id]) {
              <!-- Customer info -->
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

              <!-- Fulfillment status per supplier -->
              @if (detail()[o.id]!.fulfillments.length > 0) {
                <p style="font-weight:600;margin:0 0 10px;font-size:.9rem">Supplier Fulfillments</p>
                <div class="fulfillment-grid">
                  @for (f of detail()[o.id]!.fulfillments; track f.supplierId) {
                    <div class="fulfillment-card">
                      <div class="fulfillment-header">
                        <span style="font-weight:500;font-size:.85rem">{{ f.supplierName || f.supplierEmail }}</span>
                        <span class="f-badge" [style.background]="FULFILLMENT_COLOR[f.status]">{{ f.status }}</span>
                      </div>
                      <div style="font-size:.78rem;color:#888">{{ f.supplierEmail }}</div>
                    </div>
                  }
                </div>
                @if (allFulfillmentsShipped(o.id)) {
                  <div style="background:#e8f5e9;border-radius:6px;padding:8px 14px;margin-bottom:12px;font-size:.85rem;color:#2e7d32">
                    ✓ All suppliers have shipped — order is ready to deliver.
                  </div>
                }
                <mat-divider style="margin-bottom:16px"></mat-divider>
              }

              <!-- Items table -->
              <table mat-table [dataSource]="detail()[o.id]!.items" style="width:100%;margin-bottom:16px">
                <ng-container matColumnDef="product">
                  <th mat-header-cell *matHeaderCellDef>Product</th>
                  <td mat-cell *matCellDef="let i">{{ i.productName }}</td>
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
                  <td mat-cell *matCellDef="let i">₹{{ i.subtotal.toFixed(2) }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="cols"></tr>
                <tr mat-row *matRowDef="let row; columns: cols;"></tr>
              </table>
            } @else {
              <p style="color:#888;font-size:.85rem">Loading…</p>
            }

            <!-- Admin status controls -->
            @if (nextStatuses(o.status).length > 0) {
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:4px">
                <span style="font-weight:500">Change status:</span>
                @for (next of nextStatuses(o.status); track next) {
                  <button mat-raised-button [color]="next === 'Cancelled' ? 'warn' : 'primary'"
                    (click)="changeStatus(o, next)">→ {{ next }}</button>
                }
              </div>
              @if (o.status === 'Confirmed') {
                <p style="font-size:.78rem;color:#888;margin:6px 0 0">
                  Order will auto-advance to <strong>Shipped</strong> once all suppliers mark their fulfillment as Shipped.
                </p>
              }
            } @else {
              <p style="color:#888;font-size:.85rem;margin-top:4px">No further status changes available.</p>
            }
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
