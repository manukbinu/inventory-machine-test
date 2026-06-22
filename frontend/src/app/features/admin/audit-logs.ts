import { Component, inject, OnInit, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AuditLog, AuditLogDetail } from '../../core/models/models';
import { AuditLogDetailDialogComponent } from './audit-log-detail-dialog';

@Component({
  selector: 'app-audit-logs',
  imports: [
    ReactiveFormsModule, MatTableModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatPaginatorModule, MatDialogModule, DatePipe
  ],
  template: `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <h2 style="margin:0">Audit Logs</h2>
      <button mat-stroked-button (click)="exportCsv()">
        <mat-icon>download</mat-icon> Export CSV
      </button>
    </div>
    <div class="filter-bar">
      <mat-form-field appearance="outline">
        <mat-label>Table</mat-label>
        <input matInput [formControl]="tableCtrl" (input)="onFilterChange()">
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Action</mat-label>
        <mat-select [formControl]="actionCtrl" (selectionChange)="onFilterChange()">
          <mat-option [value]="null">All</mat-option>
          @for (a of actions; track a) { <mat-option [value]="a">{{ a }}</mat-option> }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Changed By (email)</mat-label>
        <input matInput [formControl]="byCtrl" (input)="onFilterChange()">
      </mat-form-field>
    </div>

    <table mat-table [dataSource]="logs()" class="mat-elevation-z2 full-width">
      <ng-container matColumnDef="id"><th mat-header-cell *matHeaderCellDef>#</th><td mat-cell *matCellDef="let l">{{ l.id }}</td></ng-container>
      <ng-container matColumnDef="table"><th mat-header-cell *matHeaderCellDef>Table</th><td mat-cell *matCellDef="let l">{{ l.tableName }}</td></ng-container>
      <ng-container matColumnDef="recordId"><th mat-header-cell *matHeaderCellDef>Record</th><td mat-cell *matCellDef="let l">{{ l.recordId }}</td></ng-container>
      <ng-container matColumnDef="action"><th mat-header-cell *matHeaderCellDef>Action</th><td mat-cell *matCellDef="let l">{{ l.actionType }}</td></ng-container>
      <ng-container matColumnDef="by"><th mat-header-cell *matHeaderCellDef>By</th><td mat-cell *matCellDef="let l">{{ l.changedByEmail }}</td></ng-container>
      <ng-container matColumnDef="at"><th mat-header-cell *matHeaderCellDef>At</th><td mat-cell *matCellDef="let l">{{ l.changedAt | date:'short' }}</td></ng-container>
      <ng-container matColumnDef="detail">
        <th mat-header-cell *matHeaderCellDef></th>
        <td mat-cell *matCellDef="let l"><button mat-button (click)="viewDetail(l.id)">Details</button></td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="cols"></tr>
      <tr mat-row *matRowDef="let r; columns: cols;"></tr>
    </table>
    <mat-paginator [length]="total()" [pageSize]="10" [pageSizeOptions]="[10, 25, 50]" (page)="onPage($event)"></mat-paginator>
  `,
  styles: [`.full-width{width:100%} .filter-bar{display:flex;gap:12px;margin-bottom:12px}`]
})
export class AuditLogsComponent implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private fb = inject(FormBuilder);
  logs = signal<AuditLog[]>([]);
  total = signal(0);
  page = 1;
  pageSize = 10;
  cols = ['id', 'table', 'recordId', 'action', 'by', 'at', 'detail'];
  actions = ['Created', 'Updated', 'Deleted'];
  tableCtrl = this.fb.control('');
  actionCtrl = this.fb.control<string | null>(null);
  byCtrl = this.fb.control('');

  ngOnInit() { this.load(); }

  onFilterChange() { this.page = 1; this.load(); }

  load() {
    this.api.getAuditLogs({
      tableName: this.tableCtrl.value || undefined,
      actionType: this.actionCtrl.value || undefined,
      changedByEmail: this.byCtrl.value || undefined,
      page: this.page, pageSize: this.pageSize
    }).subscribe(res => { this.logs.set(res.items); this.total.set(res.total); });
  }

  onPage(e: PageEvent) { this.page = e.pageIndex + 1; this.pageSize = e.pageSize; this.load(); }

  private fmtDate(iso: string) {
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2,'0')} ${(d.getMonth()+1).toString().padStart(2,'0')} ${d.getFullYear()}`;
  }

  exportCsv() {
    // Fetch all records matching current filters (large pageSize)
    this.api.getAuditLogs({
      tableName: this.tableCtrl.value || undefined,
      actionType: this.actionCtrl.value || undefined,
      changedByEmail: this.byCtrl.value || undefined,
      page: 1, pageSize: 10000
    }).subscribe(res => {
      const headers = ['#', 'Table', 'Record ID', 'Action', 'Changed By', 'Date'];
      const rows = res.items.map(l => [
        String(l.id),
        l.tableName,
        String(l.recordId),
        l.actionType,
        l.changedByEmail,
        this.fmtDate(l.changedAt)
      ]);
      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  viewDetail(id: number) {
    this.api.getAuditLog(id).subscribe(detail => {
      this.dialog.open(AuditLogDetailDialogComponent, { width: '600px', data: detail });
    });
  }
}
