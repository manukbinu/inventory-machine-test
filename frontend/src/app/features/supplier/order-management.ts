import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { OrderListItem, Order } from '../../core/models/models';

// Fulfillment transitions — supplier controls these
const FULFILLMENT_TRANSITIONS: Record<string, string[]> = {
  Pending:    ['Processing'],
  Processing: ['Shipped'],
  Shipped:    [],
  Cancelled:  []
};

const FULFILLMENT_LABELS: Record<string, string> = {
  Pending:    '⏳ Pending',
  Processing: '📦 Processing',
  Shipped:    '🚚 Shipped',
  Cancelled:  '❌ Cancelled'
};

const FULFILLMENT_COLOR: Record<string, string> = {
  Pending: '#f57c00', Processing: '#1976d2', Shipped: '#388e3c', Cancelled: '#d32f2f'
};

@Component({
  selector: 'app-supplier-orders',
  imports: [DatePipe, MatCardModule, MatTableModule, MatChipsModule,
    MatButtonModule, MatIconModule, MatExpansionModule, MatDividerModule,
    MatFormFieldModule, MatInputModule, MatSelectModule],
  styles: [`
    mat-expansion-panel { margin-bottom:8px; }
    .customer-info { display:flex; flex-direction:column; gap:6px; background:#f9f9f9; border-radius:6px; padding:12px 16px; margin-bottom:16px; }
    .customer-info div { display:flex; align-items:flex-start; gap:8px; font-size:.9rem; }
    .info-icon { font-size:18px; height:18px; width:18px; color:#555; flex-shrink:0; margin-top:1px; }
    .wrap-text { white-space:pre-wrap; word-break:break-word; }
    .fulfillment-banner { display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:6px; margin-bottom:16px; font-weight:500; }
    .other-suppliers { background:#fafafa; border:1px solid #eee; border-radius:6px; padding:10px 14px; margin-bottom:16px; }
    .other-supplier-row { display:flex; align-items:center; gap:10px; font-size:.85rem; color:#555; padding:4px 0; }
    .status-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
  `],
  template: `
    <div style="padding:24px">
      <h2 style="margin-bottom:16px">Orders for My Products</h2>

      <!-- Filters -->
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
        <mat-form-field appearance="outline" style="flex:1;min-width:200px">
          <mat-label>Search customer</mat-label>
          <input matInput (input)="searchQ.set($any($event.target).value)" placeholder="Name or email…">
        </mat-form-field>
        <mat-form-field appearance="outline" style="min-width:160px">
          <mat-label>Fulfillment Status</mat-label>
          <mat-select (selectionChange)="fulfillQ.set($event.value)">
            <mat-option [value]="''">All</mat-option>
            @for (s of fulfillStatuses; track s) { <mat-option [value]="s">{{ s }}</mat-option> }
          </mat-select>
        </mat-form-field>
      </div>

      @if (filtered().length === 0) {
        <p style="color:#888">No orders for your products yet.</p>
      }

      <mat-accordion multi>
        @for (o of filtered(); track o.id) {
          <mat-expansion-panel (opened)="loadDetail(o.id)">
            <mat-expansion-panel-header>
              <mat-panel-title style="flex:0 0 120px">Order #{{ o.id }}</mat-panel-title>
              <mat-panel-description style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
                <strong>{{ o.customerName || o.customerEmail }}</strong>
                <span>{{ o.createdAt | date:'short' }}</span>
                <!-- Order status -->
                <span style="font-size:.8rem;color:#555;margin-left:auto">Order: <strong>{{ o.status }}</strong></span>
                <!-- My fulfillment badge -->
                @if (myFulfillment(o.id)) {
                  <span [style.color]="FULFILLMENT_COLOR[myFulfillment(o.id)!.status]" style="font-weight:600;font-size:.85rem">
                    {{ FULFILLMENT_LABELS[myFulfillment(o.id)!.status] }}
                  </span>
                }
                <strong>₹{{ (o.supplierTotal ?? myTotal(o.id)).toFixed(2) }}</strong>
              </mat-panel-description>
            </mat-expansion-panel-header>

            @if (detail()[o.id]) {
              <!-- My fulfillment status banner -->
              @if (myFulfillment(o.id); as f) {
                <div class="fulfillment-banner" [style.background]="f.status === 'Shipped' ? '#e8f5e9' : f.status === 'Cancelled' ? '#ffebee' : '#e3f2fd'">
                  <mat-icon [style.color]="FULFILLMENT_COLOR[f.status]">local_shipping</mat-icon>
                  <span>My fulfillment status: <strong [style.color]="FULFILLMENT_COLOR[f.status]">{{ f.status }}</strong></span>
                  @for (next of nextFulfillmentStatuses(f.status); track next) {
                    <button mat-raised-button color="primary" style="margin-left:auto"
                      (click)="changeFulfillmentStatus(o, next)">
                      → {{ next }}
                    </button>
                  }
                </div>
              }

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

              <!-- My items only -->
              <p style="font-weight:600;margin:0 0 8px">My Items</p>
              <table mat-table [dataSource]="myItems(o.id)" style="width:100%;margin-bottom:8px">
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
              <div style="text-align:right;font-weight:600;padding:4px 0 16px;font-size:.95rem">
                My Items Total: ₹{{ myTotal(o.id).toFixed(2) }}
              </div>

              <!-- Other suppliers in this order -->
              @if (otherFulfillments(o.id).length > 0) {
                <mat-divider style="margin-bottom:12px"></mat-divider>
                <div class="other-suppliers">
                  <p style="font-size:.8rem;font-weight:600;color:#888;margin:0 0 8px">Other Suppliers in this Order</p>
                  @for (f of otherFulfillments(o.id); track f.supplierId) {
                    <div class="other-supplier-row">
                      <div class="status-dot" [style.background]="FULFILLMENT_COLOR[f.status]"></div>
                      <span>{{ f.supplierName || f.supplierEmail }}</span>
                      <span style="margin-left:auto;font-weight:500" [style.color]="FULFILLMENT_COLOR[f.status]">{{ f.status }}</span>
                    </div>
                  }
                </div>
              }
            } @else {
              <p style="color:#888;font-size:.85rem">Loading…</p>
            }
          </mat-expansion-panel>
        }
      </mat-accordion>
    </div>
  `
})
export class SupplierOrderManagementComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);

  orders = signal<OrderListItem[]>([]);
  detail = signal<Record<number, Order | null>>({});
  cols = ['product', 'qty', 'price', 'subtotal'];
  searchQ = signal('');
  fulfillQ = signal('');
  fulfillStatuses = ['Pending', 'Processing', 'Shipped', 'Cancelled'];

  filtered = computed(() => {
    const q = this.searchQ().toLowerCase();
    const fq = this.fulfillQ().toLowerCase();
    return this.orders().filter(o => {
      const matchQ = !q || (o.customerName ?? '').toLowerCase().includes(q) || o.customerEmail.toLowerCase().includes(q);
      // fulfillment status filter uses the loaded detail when available, otherwise skip
      const detail = this.detail()[o.id];
      const matchF = !fq || (detail
        ? (detail.fulfillments.find(f => f.supplierId === this.supplierId)?.status ?? '').toLowerCase() === fq
        : true);
      return matchQ && matchF;
    });
  });

  readonly FULFILLMENT_LABELS = FULFILLMENT_LABELS;
  readonly FULFILLMENT_COLOR = FULFILLMENT_COLOR;

  get supplierId() { return this.auth.user()?.userId ?? 0; }

  ngOnInit() {
    this.api.getOrders().subscribe(list => this.orders.set(list));
  }

  loadDetail(id: number) {
    if (this.detail()[id]) return;
    this.api.getOrder(id).subscribe(o => this.detail.update(d => ({ ...d, [id]: o })));
  }

  myItems(orderId: number) {
    return (this.detail()[orderId]?.items ?? []).filter(i => i.supplierId === this.supplierId);
  }

  myTotal(orderId: number) {
    return this.myItems(orderId).reduce((s, i) => s + i.subtotal, 0);
  }

  myFulfillment(orderId: number) {
    return (this.detail()[orderId]?.fulfillments ?? []).find(f => f.supplierId === this.supplierId) ?? null;
  }

  otherFulfillments(orderId: number) {
    return (this.detail()[orderId]?.fulfillments ?? []).filter(f => f.supplierId !== this.supplierId);
  }

  nextFulfillmentStatuses(status: string): string[] {
    return FULFILLMENT_TRANSITIONS[status] ?? [];
  }

  changeFulfillmentStatus(order: OrderListItem, newStatus: string) {
    this.api.updateFulfillmentStatus(order.id, newStatus).subscribe({
      next: () => {
        // Update local fulfillment status
        this.detail.update(d => {
          const ord = d[order.id];
          if (!ord) return d;
          const updatedFulfillments = ord.fulfillments.map(f =>
            f.supplierId === this.supplierId ? { ...f, status: newStatus } : f
          );
          // If all shipped → auto-reflect order Shipped
          const allShipped = updatedFulfillments.every(f => f.status === 'Shipped');
          return {
            ...d,
            [order.id]: {
              ...ord,
              fulfillments: updatedFulfillments,
              status: allShipped && ord.status === 'Confirmed' ? 'Shipped' : ord.status
            }
          };
        });
        if (newStatus === 'Shipped') {
          const allShipped = (this.detail()[order.id]?.fulfillments ?? []).every(f => f.status === 'Shipped');
          if (allShipped) {
            this.orders.update(list => list.map(o => o.id === order.id ? { ...o, status: 'Shipped' } : o));
          }
        }
        this.snack.open(`Fulfillment → ${newStatus}`, 'OK', { duration: 2500 });
      },
      error: err => this.snack.open(err.error || 'Update failed', 'OK', { duration: 3000 })
    });
  }
}
