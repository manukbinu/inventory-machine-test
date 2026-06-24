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
import { AuditLog } from '../../core/models/models';
import { AuditLogDetailDialogComponent } from './audit-log-detail-dialog';

@Component({
  selector: 'app-audit-logs',
  imports: [
    ReactiveFormsModule, MatTableModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatPaginatorModule, MatDialogModule, DatePipe
  ],
  template: `
    <!-- Page Banner -->
    <div class="page-banner">
      <div>
        <h1><mat-icon>history</mat-icon> Audit Logs</h1>
        <p>Complete record of all changes in the system</p>
      </div>
      <div class="banner-actions">
        <button mat-stroked-button class="export-btn" (click)="exportCsv()">
          <mat-icon>download</mat-icon> Export CSV
        </button>
      </div>
    </div>

    <div class="page-container">
      <!-- Filter Bar -->
      <div class="filter-bar">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-icon matPrefix>table_chart</mat-icon>
          <mat-label>Table</mat-label>
          <input matInput [formControl]="tableCtrl" (input)="onFilterChange()">
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter-field-sm">
          <mat-label>Action</mat-label>
          <mat-select [formControl]="actionCtrl" (selectionChange)="onFilterChange()">
            <mat-option [value]="null">All actions</mat-option>
            @for (a of actions; track a) { <mat-option [value]="a">{{ a }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter-field">
          <mat-icon matPrefix>person</mat-icon>
          <mat-label>Changed By (email)</mat-label>
          <input matInput [formControl]="byCtrl" (input)="onFilterChange()">
        </mat-form-field>
      </div>

      <!-- Skeleton -->
      @if (loading()) {
        @for (_ of skeletonRows; track $index) {
          <div class="skeleton skeleton-row"></div>
        }
      } @else {
        <div class="table-wrapper">
          <table mat-table [dataSource]="logs()" class="audit-table">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>#</th>
              <td mat-cell *matCellDef="let l" class="id-cell">#{{ l.id }}</td>
            </ng-container>
            <ng-container matColumnDef="table">
              <th mat-header-cell *matHeaderCellDef>Table</th>
              <td mat-cell *matCellDef="let l"><span class="table-badge">{{ l.tableName }}</span></td>
            </ng-container>
            <ng-container matColumnDef="recordId">
              <th mat-header-cell *matHeaderCellDef>Record</th>
              <td mat-cell *matCellDef="let l" class="muted-cell">{{ l.recordId }}</td>
            </ng-container>
            <ng-container matColumnDef="action">
              <th mat-header-cell *matHeaderCellDef>Action</th>
              <td mat-cell *matCellDef="let l">
                <span class="action-chip" [class]="actionClass(l.actionType)">{{ l.actionType }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="by">
              <th mat-header-cell *matHeaderCellDef>Changed By</th>
              <td mat-cell *matCellDef="let l" class="by-cell">{{ l.changedByEmail }}</td>
            </ng-container>
            <ng-container matColumnDef="at">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let l" class="muted-cell">{{ l.changedAt | date:'dd MMM yy, h:mm a' }}</td>
            </ng-container>
            <ng-container matColumnDef="detail">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let l">
                <button mat-stroked-button class="detail-btn" (click)="viewDetail(l.id)">
                  <mat-icon>open_in_new</mat-icon> Details
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let r; columns: cols;"></tr>
          </table>
        </div>
        <mat-paginator [length]="total()" [pageSize]="10" [pageSizeOptions]="[10, 25, 50]" (page)="onPage($event)"></mat-paginator>
      }
    </div>
  `,
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

    .page-container { max-width: 1300px; margin: 0 auto; padding: 24px; }

    .filter-bar { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
    .filter-field { flex: 1; min-width: 200px; }
    .filter-field-sm { min-width: 160px; }

    .table-wrapper { overflow-x: auto; border-radius: 12px; box-shadow: 0 2px 8px rgba(63,81,181,.10); }
    .audit-table { width: 100%; background: #fff; }

    .id-cell { font-weight: 700; color: #888; font-size: .82rem; }
    .muted-cell { color: #666; font-size: .82rem; }
    .by-cell { font-size: .82rem; color: #3f51b5; }

    .table-badge { background: #e8eaf6; color: #283593; font-size: .73rem; font-weight: 700; padding: 2px 10px; border-radius: 20px; }

    .action-chip { font-size: .73rem; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
    .chip-created { background: #e8f5e9; color: #2e7d32; }
    .chip-updated { background: #fff3e0; color: #e65100; }
    .chip-deleted { background: #ffebee; color: #b71c1c; }

    .detail-btn { font-size: .78rem !important; color: #3f51b5 !important; border-color: #c5cae9 !important; padding: 0 10px !important; height: 30px !important; }

    @media (max-width: 600px) { .page-container { padding: 16px 10px; } .filter-bar { flex-direction: column; } }
  `]
})
export class AuditLogsComponent implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private fb = inject(FormBuilder);
  logs = signal<AuditLog[]>([]);
  total = signal(0);
  loading = signal(true);
  skeletonRows = Array(8).fill(0);
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
    this.loading.set(true);
    this.api.getAuditLogs({
      tableName: this.tableCtrl.value || undefined,
      actionType: this.actionCtrl.value || undefined,
      changedByEmail: this.byCtrl.value || undefined,
      page: this.page, pageSize: this.pageSize
    }).subscribe(res => { this.logs.set(res.items); this.total.set(res.total); this.loading.set(false); });
  }

  onPage(e: PageEvent) { this.page = e.pageIndex + 1; this.pageSize = e.pageSize; this.load(); }

  actionClass(action: string): string {
    const map: Record<string, string> = { Created: 'chip-created', Updated: 'chip-updated', Deleted: 'chip-deleted' };
    return map[action] ?? '';
  }

  private fmtDate(iso: string) {
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2,'0')} ${(d.getMonth()+1).toString().padStart(2,'0')} ${d.getFullYear()}`;
  }

  exportCsv() {
    this.api.getAuditLogs({
      tableName: this.tableCtrl.value || undefined,
      actionType: this.actionCtrl.value || undefined,
      changedByEmail: this.byCtrl.value || undefined,
      page: 1, pageSize: 10000
    }).subscribe(res => {
      const headers = ['#', 'Table', 'Record ID', 'Action', 'Changed By', 'Date'];
      const rows = res.items.map(l => [String(l.id), l.tableName, String(l.recordId), l.actionType, l.changedByEmail, this.fmtDate(l.changedAt)]);
      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click(); URL.revokeObjectURL(a.href);
    });
  }

  viewDetail(id: number) {
    this.api.getAuditLog(id).subscribe(detail => {
      this.dialog.open(AuditLogDetailDialogComponent, { width: '600px', data: detail });
    });
  }
}
