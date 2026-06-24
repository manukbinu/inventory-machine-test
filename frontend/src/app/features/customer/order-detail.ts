import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';
import { Order } from '../../core/models/models';

const STATUS_STEPS = ['Pending', 'Confirmed', 'Shipped', 'Delivered'];

@Component({
  selector: 'app-order-detail',
  imports: [DatePipe, MatCardModule, MatTableModule, MatButtonModule, MatIconModule, MatStepperModule],
  template: `
    <!-- Page Banner -->
    <div class="page-banner">
      <div>
        @if (order()) {
          <h1><mat-icon>receipt_long</mat-icon> Order #{{ order()!.id }}</h1>
          <p>Placed on {{ order()!.createdAt | date:'dd MMM yyyy, h:mm a' }}</p>
        } @else {
          <h1><mat-icon>receipt_long</mat-icon> Order Detail</h1>
        }
      </div>
      <div class="banner-actions">
        <button mat-stroked-button class="back-btn" (click)="back()">
          <mat-icon>arrow_back</mat-icon> My Orders
        </button>
        @if (order() && canCancel()) {
          <button mat-raised-button class="cancel-order-btn" (click)="showConfirm.set(true)">
            <mat-icon>cancel</mat-icon> Cancel Order
          </button>
        }
      </div>
    </div>

    <div class="detail-body">
      @if (!order()) {
        <!-- Skeleton -->
        <div class="skeleton skeleton-banner"></div>
        <div style="background:#fff;border-radius:12px;padding:24px;margin-bottom:16px">
          <div class="skeleton skeleton-text-lg" style="width:50%;margin-bottom:16px"></div>
          @for (_ of [1,2,3,4]; track $index) {
            <div class="skeleton skeleton-row" style="margin-bottom:8px"></div>
          }
        </div>
      } @else {

        <!-- Status Stepper -->
        @if (order()!.status !== 'Cancelled') {
          <div class="stepper-card">
            <div class="step-track">
              @for (s of steps; track s; let i = $index) {
                <div class="step-item" [class.done]="isStepDone(s)" [class.active]="stepIndex() === i">
                  <div class="step-circle">
                    @if (isStepDone(s)) { <mat-icon>check</mat-icon> }
                    @else { <span>{{ i + 1 }}</span> }
                  </div>
                  <div class="step-label">{{ s }}</div>
                  @if (i < steps.length - 1) { <div class="step-line" [class.done]="isStepDone(steps[i+1]) || stepIndex() > i"></div> }
                </div>
              }
            </div>
          </div>
        } @else {
          <div class="cancelled-card">
            <mat-icon>cancel</mat-icon>
            <div>
              <strong>Order Cancelled</strong>
              <p>This order was cancelled. Stock has been restored to suppliers.</p>
            </div>
          </div>
        }

        <!-- Fulfillment Badges -->
        @if (order()!.fulfillments?.length > 0) {
          <div class="fulfillment-row">
            @for (f of order()!.fulfillments; track f.supplierId) {
              <div class="fulfillment-badge" [style.border-color]="fColor(f.status)">
                <span class="f-dot" [style.background]="fColor(f.status)"></span>
                <span class="f-supplier">{{ f.supplierName || f.supplierEmail }}</span>
                <span class="f-status" [style.color]="fColor(f.status)">{{ f.status }}</span>
              </div>
            }
          </div>
        }

        <!-- Items Table -->
        <mat-card class="items-card">
          <mat-card-header>
            <mat-card-title>Order Items</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="table-wrapper">
              <table mat-table [dataSource]="order()!.items" class="full-width">
                <ng-container matColumnDef="product">
                  <th mat-header-cell *matHeaderCellDef>Product</th>
                  <td mat-cell *matCellDef="let i"><strong>{{ i.productName }}</strong></td>
                </ng-container>
                <ng-container matColumnDef="supplier">
                  <th mat-header-cell *matHeaderCellDef>Supplier</th>
                  <td mat-cell *matCellDef="let i" class="supplier-cell">{{ i.supplierName }}</td>
                </ng-container>
                <ng-container matColumnDef="qty">
                  <th mat-header-cell *matHeaderCellDef>Qty</th>
                  <td mat-cell *matCellDef="let i" class="qty-cell">{{ i.quantity }}</td>
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

            <!-- Grand Total -->
            <div class="total-box">
              <span class="total-label">Grand Total</span>
              <span class="total-val">₹{{ order()!.total.toFixed(2) }}</span>
            </div>
          </mat-card-content>
        </mat-card>
      }
    </div>

    <!-- Cancel Confirmation Overlay -->
    @if (showConfirm()) {
      <div class="overlay">
        <mat-card class="confirm-dialog mat-elevation-z12">
          <mat-card-header>
            <mat-card-title><mat-icon style="color:#f44336;vertical-align:middle">warning</mat-icon> Cancel Order #{{ order()!.id }}?</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>This will cancel your entire order and stock will be restored for all items. This action cannot be undone.</p>
          </mat-card-content>
          <mat-card-actions align="end">
            <button mat-stroked-button (click)="showConfirm.set(false)">Keep Order</button>
            <button mat-raised-button class="cancel-confirm-btn" (click)="cancelOrder()" [disabled]="cancelling()">
              {{ cancelling() ? 'Cancelling…' : 'Yes, Cancel Order' }}
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    }
  `,
  styles: [`
    .page-banner {
      background: linear-gradient(135deg, #283593, #3f51b5);
      padding: 24px 28px; display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 12px; color: #fff;
    }
    .page-banner h1 { margin: 0; font-size: 1.5rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 8px; }
    .page-banner h1 mat-icon { color: #ffc107; }
    .page-banner p { margin: 4px 0 0; font-size: .85rem; opacity: .8; color: #fff; }
    .banner-actions { display: flex; gap: 10px; align-items: center; }
    .back-btn { border-color: rgba(255,255,255,.5) !important; color: #fff !important; border-radius: 20px !important; }
    .cancel-order-btn { background: rgba(244,67,54,.85) !important; color: #fff !important; border-radius: 8px !important; }

    .detail-body { max-width: 860px; margin: 0 auto; padding: 24px; }

    /* Stepper */
    .stepper-card {
      background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(63,81,181,.10);
      padding: 24px 32px; margin-bottom: 16px;
    }
    .step-track { display: flex; align-items: flex-start; justify-content: space-between; position: relative; }
    .step-item { display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; }
    .step-circle {
      width: 40px; height: 40px; border-radius: 50%; border: 2.5px solid #e0e0e0;
      display: flex; align-items: center; justify-content: center;
      background: #fff; font-weight: 700; font-size: .9rem; color: #bbb;
      transition: all .3s ease; z-index: 1;
    }
    .step-item.done .step-circle { background: #2e7d32; border-color: #2e7d32; color: #fff; }
    .step-item.active .step-circle { background: #3f51b5; border-color: #3f51b5; color: #fff; box-shadow: 0 0 0 4px rgba(63,81,181,.2); }
    .step-item.done .step-circle mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .step-label { margin-top: 8px; font-size: .78rem; font-weight: 600; color: #888; text-align: center; }
    .step-item.done .step-label { color: #2e7d32; }
    .step-item.active .step-label { color: #3f51b5; }
    .step-line {
      position: absolute; top: 20px; left: 50%; width: 100%;
      height: 2px; background: #e0e0e0; z-index: 0;
    }
    .step-line.done { background: #2e7d32; }

    /* Cancelled card */
    .cancelled-card {
      display: flex; align-items: center; gap: 16px;
      background: #ffebee; border-radius: 12px; padding: 20px 24px;
      margin-bottom: 16px; border-left: 4px solid #f44336;
    }
    .cancelled-card mat-icon { font-size: 2rem; width: 2rem; height: 2rem; color: #f44336; flex-shrink: 0; }
    .cancelled-card strong { font-size: 1rem; color: #b71c1c; }
    .cancelled-card p { margin: 4px 0 0; font-size: .85rem; color: #c62828; }

    /* Fulfillment */
    .fulfillment-row { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
    .fulfillment-badge {
      display: flex; align-items: center; gap: 8px;
      background: #fff; border-radius: 20px; border: 1.5px solid;
      padding: 6px 14px; font-size: .82rem;
      box-shadow: 0 1px 4px rgba(0,0,0,.08);
    }
    .f-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .f-supplier { color: #555; }
    .f-status { font-weight: 700; }

    /* Items table */
    .items-card { margin-bottom: 24px; }
    .full-width { width: 100%; }
    .supplier-cell { color: #666; font-size: .85rem; }
    .qty-cell { font-weight: 700; }
    .subtotal-cell { font-weight: 700; color: #3f51b5; }
    .table-wrapper { overflow-x: auto; }

    .total-box {
      display: flex; justify-content: space-between; align-items: center;
      margin-top: 20px; padding: 16px 20px;
      background: linear-gradient(135deg, #e8eaf6, #f0f2f8);
      border-radius: 10px;
    }
    .total-label { font-size: .9rem; color: #666; font-weight: 600; }
    .total-val { font-size: 1.6rem; font-weight: 800; color: #3f51b5; }

    /* Confirm dialog */
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 999; }
    .confirm-dialog { width: 400px; max-width: 92vw; padding: 12px; border-radius: 16px !important; }
    .cancel-confirm-btn { background: #f44336 !important; color: #fff !important; }

    @media (max-width: 600px) {
      .detail-body { padding: 16px 10px; }
      .stepper-card { padding: 16px; }
      .step-circle { width: 32px; height: 32px; font-size: .8rem; }
      .step-label { font-size: .7rem; }
    }
  `]
})
export class OrderDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  order = signal<Order | null>(null);
  showConfirm = signal(false);
  cancelling = signal(false);

  cols = ['product', 'supplier', 'qty', 'price', 'subtotal'];
  steps = STATUS_STEPS;

  ngOnInit() {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.api.getOrder(id).subscribe(o => this.order.set(o));
  }

  stepIndex() {
    const idx = STATUS_STEPS.indexOf(this.order()!.status);
    return idx >= 0 ? idx : 0;
  }

  isStepDone(step: string) {
    return STATUS_STEPS.indexOf(step) < this.stepIndex();
  }

  canCancel() {
    const s = this.order()?.status;
    return s === 'Pending';
  }

  fColor(status: string) {
    const m: Record<string, string> = { Pending: '#f57c00', Processing: '#1976d2', Shipped: '#388e3c', Cancelled: '#d32f2f' };
    return m[status] ?? '#888';
  }

  back() { this.router.navigate(['/orders']); }

  cancelOrder() {
    this.cancelling.set(true);
    this.api.cancelOrder(this.order()!.id).subscribe({
      next: () => {
        this.order.update(o => o ? { ...o, status: 'Cancelled' } : o);
        this.showConfirm.set(false);
        this.cancelling.set(false);
        this.snack.open('Order cancelled. Stock has been restored.', 'OK', { duration: 4000 });
      },
      error: err => {
        this.cancelling.set(false);
        this.snack.open(err.error || 'Cancel failed', 'OK', { duration: 3000 });
      }
    });
  }
}
