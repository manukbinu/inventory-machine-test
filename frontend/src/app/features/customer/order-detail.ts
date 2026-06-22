import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../core/services/api.service';
import { Order } from '../../core/models/models';

const STATUS_STEPS = ['Pending', 'Confirmed', 'Shipped', 'Delivered'];

@Component({
  selector: 'app-order-detail',
  imports: [DatePipe, MatCardModule, MatTableModule, MatChipsModule,
    MatButtonModule, MatIconModule, MatStepperModule, MatDialogModule],
  template: `
    @if (order()) {
      <div style="max-width:720px;margin:24px auto;padding:0 16px">
        <!-- Back + actions row -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
          <button mat-stroked-button (click)="back()">
            <mat-icon>arrow_back</mat-icon> Back
          </button>
          <span style="flex:1"></span>
          @if (canCancel()) {
            <button mat-raised-button color="warn" (click)="confirmCancel()">
              <mat-icon>cancel</mat-icon> Cancel Order
            </button>
          }
        </div>

        <mat-card>
          <mat-card-header>
            <mat-card-title>Order #{{ order()!.id }}</mat-card-title>
            <mat-card-subtitle>{{ order()!.createdAt | date:'medium' }}</mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <!-- Status stepper -->
            @if (order()!.status !== 'Cancelled') {
              <div class="stepper-wrap">
                <mat-stepper [selectedIndex]="stepIndex()" [linear]="false" [disableRipple]="true">
                  @for (s of steps; track s) {
                    <mat-step [label]="s" [completed]="isStepDone(s)" [editable]="false"></mat-step>
                  }
                </mat-stepper>
              </div>
            } @else {
              <div class="cancelled-badge">
                <mat-icon color="warn">cancel</mat-icon>
                <span>This order was cancelled. Stock has been restored.</span>
              </div>
            }

            <!-- Supplier fulfillment status -->
            @if (order()!.fulfillments?.length > 0) {
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 4px">
                @for (f of order()!.fulfillments; track f.supplierId) {
                  <div style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;font-size:.8rem;font-weight:500;border:1px solid #e0e0e0">
                    <span style="width:8px;height:8px;border-radius:50%;display:inline-block"
                      [style.background]="fColor(f.status)"></span>
                    {{ f.supplierName || f.supplierEmail }}: <strong [style.color]="fColor(f.status)">{{ f.status }}</strong>
                  </div>
                }
              </div>
            }

            <!-- Items table -->
            <table mat-table [dataSource]="order()!.items" class="full-width" style="margin-top:16px">
              <ng-container matColumnDef="product">
                <th mat-header-cell *matHeaderCellDef>Product</th>
                <td mat-cell *matCellDef="let i">{{ i.productName }}</td>
              </ng-container>
              <ng-container matColumnDef="supplier">
                <th mat-header-cell *matHeaderCellDef>Supplier</th>
                <td mat-cell *matCellDef="let i" style="color:#666;font-size:.85rem">{{ i.supplierName }}</td>
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

            <p class="total">Total: ₹{{ order()!.total.toFixed(2) }}</p>
          </mat-card-content>
        </mat-card>
      </div>
    }

    <!-- Cancel confirmation dialog inline -->
    @if (showConfirm()) {
      <div class="overlay">
        <mat-card class="confirm-dialog mat-elevation-z8">
          <mat-card-header>
            <mat-card-title>Cancel Order #{{ order()!.id }}?</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>This will cancel your order and restore stock for all items.</p>
          </mat-card-content>
          <mat-card-actions align="end">
            <button mat-stroked-button (click)="showConfirm.set(false)">Keep Order</button>
            <button mat-raised-button color="warn" (click)="cancelOrder()" [disabled]="cancelling()">
              {{ cancelling() ? 'Cancelling…' : 'Yes, Cancel' }}
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    }
  `,
  styles: [`
    .full-width { width:100% }
    .total { font-size:1.1rem; font-weight:700; margin-top:16px }
    .stepper-wrap { margin:16px 0; pointer-events:none }
    .cancelled-badge { display:flex; align-items:center; gap:8px; color:#c62828; padding:12px 0; font-weight:500 }
    .overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); display:flex; align-items:center; justify-content:center; z-index:999 }
    .confirm-dialog { width:360px; padding:8px }
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

  // Customer can cancel while not yet Delivered or already Cancelled
  canCancel() {
    const s = this.order()?.status;
    return s === 'Pending' || s === 'Confirmed' || s === 'Shipped';
  }

  fColor(status: string) {
    const m: Record<string,string> = { Pending:'#f57c00', Processing:'#1976d2', Shipped:'#388e3c', Cancelled:'#d32f2f' };
    return m[status] ?? '#888';
  }

  back() { this.router.navigate(['/orders']); }

  confirmCancel() { this.showConfirm.set(true); }

  cancelOrder() {
    this.cancelling.set(true);
    this.api.updateOrderStatus(this.order()!.id, 'Cancelled').subscribe({
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
