import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { OrderListItem, Order } from '../../core/models/models';

const FULFILLMENT_TRANSITIONS: Record<string, string[]> = {
  Pending:    ['Processing'],
  Processing: ['Shipped'],
  Shipped:    [],
  Cancelled:  []
};

const FULFILLMENT_COLOR: Record<string, string> = {
  Pending: '#f57c00', Processing: '#3f51b5', Shipped: '#2e7d32', Cancelled: '#d32f2f'
};

const FULFILLMENT_BG: Record<string, string> = {
  Pending: '#fff3e0', Processing: '#e8eaf6', Shipped: '#e8f5e9', Cancelled: '#ffebee'
};

@Component({
  selector: 'app-supplier-orders',
  imports: [DatePipe, MatTableModule, MatButtonModule, MatIconModule, MatExpansionModule,
    MatDividerModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTooltipModule],
  template: `
    <!-- Page Banner -->
    <div class="page-banner">
      <div>
        <h1><mat-icon>receipt_long</mat-icon> Orders for My Products</h1>
        <p>{{ filtered().length }} order{{ filtered().length !== 1 ? 's' : '' }} found</p>
      </div>
    </div>

    <div class="page-container">
      <!-- Filters -->
      <div class="filter-bar">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-icon matPrefix>search</mat-icon>
          <mat-label>Search customer</mat-label>
          <input matInput (input)="searchQ.set($any($event.target).value)" placeholder="Name or email…">
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter-field-sm">
          <mat-label>Fulfillment Status</mat-label>
          <mat-select (selectionChange)="fulfillQ.set($event.value)">
            <mat-option [value]="''">All</mat-option>
            @for (s of fulfillStatuses; track s) { <mat-option [value]="s">{{ s }}</mat-option> }
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Skeleton -->
      @if (loading()) {
        @for (_ of skeletonRows; track $index) {
          <div class="skeleton skeleton-row" style="margin-bottom:10px;height:64px"></div>
        }
      } @else if (filtered().length === 0) {
        <div class="empty-state">
          <mat-icon>receipt_long</mat-icon>
          <h3>No orders yet</h3>
          <p>Orders containing your products will appear here.</p>
        </div>
      } @else {
        <mat-accordion multi>
          @for (o of filtered(); track o.id) {
            <mat-expansion-panel class="order-panel" (opened)="loadDetail(o.id)">
              <mat-expansion-panel-header class="order-panel-header">
                <mat-panel-title class="panel-title">
                  <strong>#{{ o.id }}</strong>
                </mat-panel-title>
                <mat-panel-description class="panel-desc">
                  <span class="cust-name">{{ o.customerName || o.customerEmail }}</span>
                  <span class="order-date">{{ o.createdAt | date:'dd MMM yyyy' }}</span>
                  <span class="order-status-badge" [class]="orderStatusClass(o.status)">{{ o.status }}</span>
                  @if (myFulfillment(o.id)) {
                    <span class="fulfill-badge"
                      [style.background]="FULFILLMENT_BG[myFulfillment(o.id)!.status]"
                      [style.color]="FULFILLMENT_COLOR[myFulfillment(o.id)!.status]">
                      {{ myFulfillment(o.id)!.status }}
                    </span>
                  }
                  <strong class="panel-total">₹{{ (o.supplierTotal ?? myTotal(o.id)).toFixed(2) }}</strong>
                </mat-panel-description>
              </mat-expansion-panel-header>

              @if (detail()[o.id]) {
                <div class="panel-content">
                  <!-- My Fulfillment Banner -->
                  @if (myFulfillment(o.id); as f) {
                    <div class="fulfillment-banner" [style.background]="FULFILLMENT_BG[f.status]" [style.border-color]="FULFILLMENT_COLOR[f.status]">
                      <mat-icon [style.color]="FULFILLMENT_COLOR[f.status]">local_shipping</mat-icon>
                      <div>
                        <div class="fb-label">My Fulfillment Status</div>
                        <div class="fb-status" [style.color]="FULFILLMENT_COLOR[f.status]">{{ f.status }}</div>
                      </div>
                      <div class="fb-actions">
                        @if (o.status === 'Pending') {
                          <div class="awaiting-admin-notice">
                            <mat-icon>hourglass_empty</mat-icon>
                            <span>Awaiting admin confirmation</span>
                          </div>
                        } @else {
                          @for (next of nextFulfillmentStatuses(f.status); track next) {
                            <button mat-raised-button class="transition-btn" (click)="changeFulfillmentStatus(o, next)">
                              <mat-icon>arrow_forward</mat-icon> Mark as {{ next }}
                            </button>
                          }
                        }
                      </div>
                    </div>
                  }

                  <!-- Customer Info -->
                  <div class="customer-card">
                    <div class="customer-row"><mat-icon>person</mat-icon> {{ detail()[o.id]!.customerName || detail()[o.id]!.customerEmail }}</div>
                    <div class="customer-row"><mat-icon>email</mat-icon> {{ detail()[o.id]!.customerEmail }}</div>
                    @if (detail()[o.id]!.customerPhone) {
                      <div class="customer-row"><mat-icon>phone</mat-icon> {{ detail()[o.id]!.customerPhone }}</div>
                    }
                    @if (detail()[o.id]!.customerAddress) {
                      <div class="customer-row"><mat-icon>location_on</mat-icon> {{ detail()[o.id]!.customerAddress }}</div>
                    }
                  </div>

                  <!-- My Items -->
                  <div class="section-label">My Items</div>
                  <div class="table-wrapper">
                    <table mat-table [dataSource]="myItems(o.id)" class="items-table">
                      <ng-container matColumnDef="product">
                        <th mat-header-cell *matHeaderCellDef>Product</th>
                        <td mat-cell *matCellDef="let i"><strong>{{ i.productName }}</strong></td>
                      </ng-container>
                      <ng-container matColumnDef="qty">
                        <th mat-header-cell *matHeaderCellDef>Qty</th>
                        <td mat-cell *matCellDef="let i">{{ i.quantity }}</td>
                      </ng-container>
                      <ng-container matColumnDef="price">
                        <th mat-header-cell *matHeaderCellDef>Unit Price</th>
                        <td mat-cell *matCellDef="let i">₹{{ i.priceAtOrder }}</td>
                      </ng-container>
                      <ng-container matColumnDef="subtotal">
                        <th mat-header-cell *matHeaderCellDef>Subtotal</th>
                        <td mat-cell *matCellDef="let i" class="subtotal-cell">₹{{ i.subtotal.toFixed(2) }}</td>
                      </ng-container>
                      <tr mat-header-row *matHeaderRowDef="cols"></tr>
                      <tr mat-row *matRowDef="let row; columns: cols;"></tr>
                    </table>
                  </div>
                  <div class="items-total">My Items Total: <strong>₹{{ myTotal(o.id).toFixed(2) }}</strong></div>

                  <!-- Other Suppliers -->
                  @if (otherFulfillments(o.id).length > 0) {
                    <mat-divider style="margin: 16px 0"></mat-divider>
                    <div class="other-suppliers">
                      <div class="section-label">Other Suppliers in this Order</div>
                      @for (f of otherFulfillments(o.id); track f.supplierId) {
                        <div class="other-row">
                          <span class="other-dot" [style.background]="FULFILLMENT_COLOR[f.status]"></span>
                          <span>{{ f.supplierName || f.supplierEmail }}</span>
                          <span class="other-status" [style.color]="FULFILLMENT_COLOR[f.status]">{{ f.status }}</span>
                        </div>
                      }
                    </div>
                  }
                </div>
              } @else {
                <div class="skeleton skeleton-row" style="margin:12px 0"></div>
              }
            </mat-expansion-panel>
          }
        </mat-accordion>
      }
    </div>
  `,
  styles: [`
    .page-banner {
      background: linear-gradient(135deg, #283593, #3f51b5);
      padding: 24px 28px; color: #fff;
    }
    .page-banner h1 { margin: 0; font-size: 1.6rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 10px; }
    .page-banner h1 mat-icon { color: #ffc107; }
    .page-banner p { margin: 4px 0 0; font-size: .88rem; opacity: .8; color: #fff; }

    .page-container { max-width: 1100px; margin: 0 auto; padding: 24px; }

    .filter-bar { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
    .filter-field { flex: 1; min-width: 200px; }
    .filter-field-sm { min-width: 180px; }

    /* Accordion */
    .order-panel { margin-bottom: 10px; border-radius: 12px !important; box-shadow: 0 2px 8px rgba(63,81,181,.10) !important; }
    .panel-title { flex: 0 0 80px; font-size: 1rem; color: #3f51b5; }
    .panel-desc { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; font-size: .85rem; }
    .cust-name { font-weight: 600; color: #1a1a2e; }
    .order-date { color: #888; }
    .order-status-badge { font-size: .73rem; font-weight: 700; padding: 2px 10px; border-radius: 20px; background: #e8eaf6; color: #283593; }
    .fulfill-badge { font-size: .73rem; font-weight: 700; padding: 2px 10px; border-radius: 20px; }
    .panel-total { margin-left: auto; font-size: 1rem; color: #3f51b5; }

    .panel-content { padding: 8px 0; }

    /* Fulfillment Banner */
    .fulfillment-banner {
      display: flex; align-items: center; gap: 14px; padding: 14px 18px;
      border-radius: 10px; margin-bottom: 16px; border-left: 4px solid;
    }
    .fulfillment-banner mat-icon { font-size: 24px; width: 24px; height: 24px; flex-shrink: 0; }
    .fb-label { font-size: .75rem; color: #888; font-weight: 600; }
    .fb-status { font-size: 1rem; font-weight: 800; }
    .fb-actions { margin-left: auto; display: flex; gap: 8px; align-items: center; }
    .transition-btn { background: #3f51b5 !important; color: #fff !important; border-radius: 8px !important; }
    .awaiting-admin-notice { display: flex; align-items: center; gap: 6px; color: #f57c00; font-size: .82rem; font-weight: 600; background: #fff8e1; border-radius: 8px; padding: 6px 12px; border: 1px solid #ffe082; }
    .awaiting-admin-notice mat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* Customer Card */
    .customer-card {
      background: #f8f9ff; border-radius: 10px; padding: 14px 16px;
      margin-bottom: 16px; display: flex; flex-direction: column; gap: 8px;
    }
    .customer-row { display: flex; align-items: flex-start; gap: 10px; font-size: .9rem; color: #444; }
    .customer-row mat-icon { font-size: 18px; width: 18px; height: 18px; color: #3f51b5; flex-shrink: 0; margin-top: 1px; }

    .section-label { font-size: .78rem; font-weight: 700; color: #3f51b5; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
    .table-wrapper { overflow-x: auto; border-radius: 8px; }
    .items-table { width: 100%; background: #fff; }
    .subtotal-cell { font-weight: 700; color: #3f51b5; }
    .items-total { text-align: right; padding: 10px 4px; font-size: .9rem; color: #555; }

    .other-suppliers { background: #f8f9ff; border-radius: 10px; padding: 12px 16px; }
    .other-row { display: flex; align-items: center; gap: 10px; font-size: .85rem; color: #555; padding: 4px 0; }
    .other-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .other-status { margin-left: auto; font-weight: 700; }

    @media (max-width: 600px) {
      .page-container { padding: 16px 10px; }
      .panel-desc { gap: 6px; }
      .panel-total { display: none; }
    }
  `]
})
export class SupplierOrderManagementComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);

  orders = signal<OrderListItem[]>([]);
  detail = signal<Record<number, Order | null>>({});
  loading = signal(true);
  skeletonRows = Array(3).fill(0);
  cols = ['product', 'qty', 'price', 'subtotal'];
  searchQ = signal('');
  fulfillQ = signal('');
  fulfillStatuses = ['Pending', 'Processing', 'Shipped', 'Cancelled'];

  readonly FULFILLMENT_COLOR = FULFILLMENT_COLOR;
  readonly FULFILLMENT_BG = FULFILLMENT_BG;

  filtered = computed(() => {
    const q = this.searchQ().toLowerCase();
    const fq = this.fulfillQ().toLowerCase();
    return this.orders().filter(o => {
      const matchQ = !q || (o.customerName ?? '').toLowerCase().includes(q) || o.customerEmail.toLowerCase().includes(q);
      const detail = this.detail()[o.id];
      const matchF = !fq || (detail
        ? (detail.fulfillments.find(f => f.supplierId === this.supplierId)?.status ?? '').toLowerCase() === fq
        : true);
      return matchQ && matchF;
    });
  });

  get supplierId() { return this.auth.user()?.userId ?? 0; }

  ngOnInit() {
    this.api.getOrders().subscribe(list => { this.orders.set(list); this.loading.set(false); });
  }

  loadDetail(id: number) {
    if (this.detail()[id]) return;
    this.api.getOrder(id).subscribe(o => this.detail.update(d => ({ ...d, [id]: o })));
  }

  myItems(orderId: number) { return (this.detail()[orderId]?.items ?? []).filter(i => i.supplierId === this.supplierId); }
  myTotal(orderId: number) { return this.myItems(orderId).reduce((s, i) => s + i.subtotal, 0); }
  myFulfillment(orderId: number) { return (this.detail()[orderId]?.fulfillments ?? []).find(f => f.supplierId === this.supplierId) ?? null; }
  otherFulfillments(orderId: number) { return (this.detail()[orderId]?.fulfillments ?? []).filter(f => f.supplierId !== this.supplierId); }
  nextFulfillmentStatuses(status: string): string[] { return FULFILLMENT_TRANSITIONS[status] ?? []; }

  orderStatusClass(s: string): string {
    const map: Record<string, string> = {
      Pending: 'chip-pending', Confirmed: 'chip-confirmed', Shipped: 'chip-shipped',
      Delivered: 'chip-delivered', Cancelled: 'chip-cancelled'
    };
    return map[s] ?? '';
  }

  changeFulfillmentStatus(order: OrderListItem, newStatus: string) {
    this.api.updateFulfillmentStatus(order.id, newStatus).subscribe({
      next: () => {
        this.detail.update(d => {
          const ord = d[order.id];
          if (!ord) return d;
          const updatedFulfillments = ord.fulfillments.map(f => f.supplierId === this.supplierId ? { ...f, status: newStatus } : f);
          const allShipped = updatedFulfillments.every(f => f.status === 'Shipped');
          return { ...d, [order.id]: { ...ord, fulfillments: updatedFulfillments, status: allShipped && ord.status === 'Confirmed' ? 'Shipped' : ord.status } };
        });
        if (newStatus === 'Shipped') {
          const allShipped = (this.detail()[order.id]?.fulfillments ?? []).every(f => f.status === 'Shipped');
          if (allShipped) this.orders.update(list => list.map(o => o.id === order.id ? { ...o, status: 'Shipped' } : o));
        }
        this.snack.open(`Fulfillment → ${newStatus}`, 'OK', { duration: 2500 });
      },
      error: err => this.snack.open(err.error || 'Update failed', 'OK', { duration: 3000 })
    });
  }
}
