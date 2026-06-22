import { Component, inject, OnInit, OnDestroy, signal, ViewChild, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Category, Product, StockAdjustment } from '../../core/models/models';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { DatePipe } from '@angular/common';
import { StockAdjustDialogComponent } from './stock-adjust-dialog';

@Component({
  selector: 'app-product-form',
  imports: [
    ReactiveFormsModule, DatePipe, MatCardModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatDialogModule, MatTableModule, MatChipsModule
  ],
  template: `
    <div class="form-page">
      <div class="form-header">
        <button mat-stroked-button (click)="cancel()">
          <mat-icon>arrow_back</mat-icon> Back
        </button>
        <h2 style="margin:0">{{ isEdit ? 'Edit Product' : 'Add Product' }}</h2>
      </div>

      <mat-card class="form-card">
        <form [formGroup]="form" (ngSubmit)="submit()">

          <!-- Row 1: Name, Cost Price, Selling Price, Unit -->
          <div class="row-4">
            <mat-form-field appearance="outline">
              <mat-label>Name</mat-label>
              <input matInput formControlName="name">
              <mat-error>Required</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Cost Price (₹)</mat-label>
              <input matInput formControlName="costPrice" type="number" min="0.01" step="0.01">
              <mat-error>Required</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Selling Price (₹)</mat-label>
              <input matInput formControlName="sellingPrice" type="number" min="0.01" step="0.01">
              <mat-error>
                @if (form.get('sellingPrice')?.errors?.['required']) { Required }
                @else if (form.hasError('sellingNotGreater')) { Must be greater than cost price }
              </mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Unit</mat-label>
              <input matInput formControlName="unit" placeholder="pcs / kg / litre">
              <mat-error>Required</mat-error>
            </mat-form-field>
          </div>

          <!-- Row 2: Category, Opening Stock / stock display, Description -->
          <div class="row-3">
            <mat-form-field appearance="outline">
              <mat-label>Category</mat-label>
              <mat-select formControlName="categoryId">
                @for (c of categories(); track c.id) {
                  <mat-option [value]="c.id">{{ c.name }}</mat-option>
                }
              </mat-select>
              <mat-error>Required</mat-error>
            </mat-form-field>

            @if (!isEdit) {
              <mat-form-field appearance="outline">
                <mat-label>Opening Stock</mat-label>
                <input matInput formControlName="openingStock" type="number" min="0">
              </mat-form-field>
            } @else {
              <div class="stock-display">
                <span>Opening: <strong>{{ product()?.openingStock }}</strong></span>
                <span>Current: <strong>{{ product()?.currentStock }}</strong></span>
              </div>
            }

            <mat-form-field appearance="outline">
              <mat-label>Description</mat-label>
              <input matInput formControlName="description">
            </mat-form-field>
          </div>

          <!-- Image -->
          @if (currentImageUrl) {
            <div class="image-preview">
              <p class="preview-label">{{ selectedFile ? 'Selected Image:' : 'Current Image:' }}</p>
              <img [src]="currentImageUrl" alt="Product image" class="preview-img">
            </div>
          }
          <div class="file-row">
            <span class="file-label">{{ isEdit ? 'Replace Image:' : 'Product Image:' }}</span>
            <input type="file" accept="image/*" (change)="onFileChange($event)">
          </div>

          @if (error) { <p class="form-error">{{ error }}</p> }

          <div class="form-actions">
            <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid">
              {{ isEdit ? 'Update' : 'Create' }}
            </button>
            @if (isEdit) {
              <button mat-stroked-button color="accent" type="button" (click)="openStockDialog()">
                <mat-icon>inventory</mat-icon> Adjust Stock
              </button>
            }
            <button mat-stroked-button type="button" (click)="cancel()">Cancel</button>
          </div>
        </form>
      </mat-card>

      <!-- Stock Adjustment History -->
      @if (isEdit && history().length > 0) {
        <div class="history-section">
          <h3 style="margin:0 0 12px">Product History</h3>
          <table mat-table [dataSource]="history()" class="mat-elevation-z1 full-width">
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let h">{{ h.adjustedAt | date:'medium' }}</td>
            </ng-container>
            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>Type</th>
              <td mat-cell *matCellDef="let h">
                <mat-chip [color]="typeColor(h.adjustmentType)" highlighted style="font-size:.75rem">{{ h.adjustmentType }}</mat-chip>
              </td>
            </ng-container>
            <ng-container matColumnDef="before">
              <th mat-header-cell *matHeaderCellDef>Before</th>
              <td mat-cell *matCellDef="let h">{{ h.stockBefore }}</td>
            </ng-container>
            <ng-container matColumnDef="change">
              <th mat-header-cell *matHeaderCellDef>Change</th>
              <td mat-cell *matCellDef="let h" [style.color]="h.quantityChanged >= 0 ? '#388e3c' : '#d32f2f'" style="font-weight:600">
                {{ h.quantityChanged >= 0 ? '+' : '' }}{{ h.quantityChanged }}
              </td>
            </ng-container>
            <ng-container matColumnDef="after">
              <th mat-header-cell *matHeaderCellDef>After</th>
              <td mat-cell *matCellDef="let h"><strong>{{ h.stockAfter }}</strong></td>
            </ng-container>
            <ng-container matColumnDef="reason">
              <th mat-header-cell *matHeaderCellDef>Reason</th>
              <td mat-cell *matCellDef="let h" style="font-size:.85rem;color:#666">{{ h.reason || '—' }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="historyCols"></tr>
            <tr mat-row *matRowDef="let row; columns: historyCols;"></tr>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .form-page { padding:24px; box-sizing:border-box; width:100%; }
    .form-header { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
    .form-card { padding:24px; width:100%; box-sizing:border-box; }
    mat-form-field { width:100%; }
    .row-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:16px; }
    .row-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:16px; align-items:start; }
    .stock-display { display:flex; flex-direction:column; gap:6px; padding:14px; background:#f5f5f5; border-radius:6px; font-size:.9rem; color:#555; border:1px solid #e0e0e0; }
    .image-preview { margin-bottom:12px; }
    .preview-label { margin:0 0 4px; font-size:.85rem; color:#555; }
    .preview-img { max-width:140px; max-height:140px; object-fit:contain; border:1px solid #ddd; border-radius:6px; padding:4px; }
    .file-row { display:flex; align-items:center; gap:8px; margin-bottom:16px; }
    .file-label { font-size:.9rem; font-weight:500; white-space:nowrap; }
    .form-error { color:red; font-size:.85rem; margin:4px 0; }
    .form-actions { display:flex; gap:12px; flex-wrap:wrap; }
    .history-section { margin-top:24px; }
    .full-width { width:100%; }
    @media(max-width:900px) { .row-4 { grid-template-columns:1fr 1fr; } .row-3 { grid-template-columns:1fr 1fr; } }
    @media(max-width:500px) { .row-4,.row-3 { grid-template-columns:1fr; } }
  `]
})
export class ProductFormComponent implements OnInit, OnDestroy, AfterViewInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private fb = inject(FormBuilder);

  private readonly BASE_URL = 'http://localhost:5000';
  isEdit = false;
  productId = signal<number | null>(null);
  product = signal<Product | null>(null);
  categories = signal<Category[]>([]);
  history = signal<StockAdjustment[]>([]);
  historyCols = ['date', 'type', 'before', 'change', 'after', 'reason'];
  selectedFile: File | null = null;
  currentImageUrl: string | null = null;
  private objectUrl: string | null = null;
  error = '';

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    costPrice: [0, [Validators.required, Validators.min(0.01)]],
    sellingPrice: [0, [Validators.required, Validators.min(0.01)]],
    unit: ['', Validators.required],
    categoryId: [0, Validators.required],
    openingStock: [0]
  }, { validators: (g: AbstractControl): ValidationErrors | null => {
    const cost = g.get('costPrice')?.value ?? 0;
    const sell = g.get('sellingPrice')?.value ?? 0;
    return sell > 0 && sell <= cost ? { sellingNotGreater: true } : null;
  }});

  ngOnInit() {
    this.api.getCategories().subscribe(cats => this.categories.set(cats));
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.productId.set(+id);
      this.api.getProduct(+id).subscribe(p => {
        this.product.set(p);
        this.currentImageUrl = p.imageUrl ? `${this.BASE_URL}${p.imageUrl}` : null;
        this.loadHistory(+id);
        this.form.patchValue({
          name: p.name, description: p.description ?? '',
          costPrice: p.costPrice, sellingPrice: p.sellingPrice,
          unit: p.unit, categoryId: p.categoryId
        });
      });
    }
  }

  onFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0] ?? null;
    this.selectedFile = file;
    if (file) {
      if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = URL.createObjectURL(file);
      this.currentImageUrl = this.objectUrl;
    }
  }

  submit() {
    const v = this.form.getRawValue();
    const fd = new FormData();
    fd.append('name', v.name);
    fd.append('description', v.description);
    fd.append('costPrice', String(v.costPrice));
    fd.append('sellingPrice', String(v.sellingPrice));
    fd.append('unit', v.unit);
    fd.append('categoryId', String(v.categoryId));
    if (this.selectedFile) fd.append('image', this.selectedFile);

    if (this.isEdit) {
      this.api.updateProduct(this.productId()!, fd).subscribe({
        next: () => { this.snack.open('Product updated', 'OK', { duration: 2000 }); this.router.navigate(['/supplier/products']); },
        error: err => { this.error = (typeof err.error === 'string' ? err.error : null) || err.error?.detail || 'Update failed.'; }
      });
    } else {
      fd.append('openingStock', String(v.openingStock));
      this.api.createProduct(fd).subscribe({
        next: () => { this.snack.open('Product created', 'OK', { duration: 2000 }); this.router.navigate(['/supplier/products']); },
        error: err => { this.error = (typeof err.error === 'string' ? err.error : null) || err.error?.detail || 'Create failed.'; }
      });
    }
  }

  ngAfterViewInit() {}

  loadHistory(id: number) {
    this.api.getStockHistory(id).subscribe(h => this.history.set(h));
  }

  typeColor(type: string) {
    if (type === 'Restock' || type === 'CancelRestore') return 'primary';
    if (type === 'Removal' || type === 'OrderDeduct') return 'warn';
    return undefined;
  }

  ngOnDestroy() { if (this.objectUrl) URL.revokeObjectURL(this.objectUrl); }
  cancel() { this.router.navigate(['/supplier/products']); }

  openStockDialog() {
    const ref = this.dialog.open(StockAdjustDialogComponent, {
      width: '400px',
      data: { productId: this.productId(), productName: this.product()?.name }
    });
    ref.afterClosed().subscribe(changed => {
      if (changed) {
        this.api.getProduct(this.productId()!).subscribe(p => this.product.set(p));
        this.loadHistory(this.productId()!);
        this.snack.open('Stock adjusted', 'OK', { duration: 2000 });
      }
    });
  }
}
