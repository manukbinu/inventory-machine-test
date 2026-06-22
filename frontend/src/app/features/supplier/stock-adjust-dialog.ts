import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-stock-adjust-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Adjust Stock — {{ data.productName }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Quantity Change (+ve to add, -ve to remove)</mat-label>
          <input matInput formControlName="quantityChanged" type="number">
          <mat-hint>e.g. 50 to add, -10 to remove</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Reason (optional)</mat-label>
          <input matInput formControlName="reason">
        </mat-form-field>
        @if (error) { <p class="error">{{ error }}</p> }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="submit()" [disabled]="form.invalid">Apply</button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width:100%; margin-bottom:12px; display:block; } .error { color:red; font-size:0.85rem; }`]
})
export class StockAdjustDialogComponent {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  data = inject(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef<StockAdjustDialogComponent>);
  error = '';

  form = this.fb.nonNullable.group({
    quantityChanged: [0, [Validators.required, Validators.min(-99999), Validators.max(99999)]],
    reason: ['']
  });

  submit() {
    const v = this.form.getRawValue();
    if (v.quantityChanged === 0) { this.error = 'Quantity cannot be 0.'; return; }
    this.api.stockAdjust(this.data.productId, { quantityChanged: v.quantityChanged, reason: v.reason || undefined }).subscribe({
      next: () => this.dialogRef.close(true),
      error: err => { this.error = err.error || 'Adjustment failed.'; }
    });
  }
}
