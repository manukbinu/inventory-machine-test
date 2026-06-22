import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { DatePipe } from '@angular/common';
import { AuditLogDetail } from '../../core/models/models';

@Component({
  selector: 'app-audit-log-detail-dialog',
  imports: [MatDialogModule, MatTableModule, MatButtonModule, DatePipe],
  template: `
    <h2 mat-dialog-title>Audit Log #{{ data.id }} — {{ data.actionType }} on {{ data.tableName }}</h2>
    <mat-dialog-content>
      <p><strong>Record ID:</strong> {{ data.recordId }}</p>
      <p><strong>Changed by:</strong> {{ data.changedByEmail }}</p>
      <p><strong>At:</strong> {{ data.changedAt | date:'medium' }}</p>
      <p><strong>IP:</strong> {{ data.ipAddress || 'N/A' }}</p>
      @if (data.actions.length > 0) {
        <h3>Field Changes</h3>
        <table mat-table [dataSource]="data.actions" class="full-width">
          <ng-container matColumnDef="field"><th mat-header-cell *matHeaderCellDef>Field</th><td mat-cell *matCellDef="let a">{{ a.fieldName }}</td></ng-container>
          <ng-container matColumnDef="old"><th mat-header-cell *matHeaderCellDef>Old Value</th><td mat-cell *matCellDef="let a">{{ a.oldValue ?? '-' }}</td></ng-container>
          <ng-container matColumnDef="new"><th mat-header-cell *matHeaderCellDef>New Value</th><td mat-cell *matCellDef="let a">{{ a.newValue ?? '-' }}</td></ng-container>
          <tr mat-header-row *matHeaderRowDef="['field','old','new']"></tr>
          <tr mat-row *matRowDef="let r; columns: ['field','old','new'];"></tr>
        </table>
      } @else {
        <p>No field-level changes recorded.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width{width:100%}`]
})
export class AuditLogDetailDialogComponent {
  data: AuditLogDetail = inject(MAT_DIALOG_DATA);
}
