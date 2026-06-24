import { Component, inject, OnInit, ViewChild, AfterViewInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { User } from '../../core/models/models';

@Component({
  selector: 'app-supplier-list',
  imports: [DatePipe, MatTableModule, MatPaginatorModule, MatButtonModule,
    MatIconModule, MatSlideToggleModule, MatTooltipModule],
  template: `
    <!-- Page Banner -->
    <div class="page-banner">
      <div>
        <h1><mat-icon>store</mat-icon> Supplier Management</h1>
        <p>{{ dataSource.data.length }} supplier{{ dataSource.data.length !== 1 ? 's' : '' }} registered</p>
      </div>
      <div class="banner-actions">
        <button mat-stroked-button class="export-btn" (click)="exportCsv()">
          <mat-icon>download</mat-icon> Export CSV
        </button>
        <button mat-raised-button class="add-btn" (click)="router.navigate(['/admin/users/new'])">
          <mat-icon>add</mat-icon> Add Supplier
        </button>
      </div>
    </div>

    <div class="page-container">
      <!-- Skeleton -->
      @if (loading()) {
        @for (_ of skeletonRows; track $index) {
          <div class="skeleton skeleton-row"></div>
        }
      } @else {
        <div class="filter-bar">
          <input class="filter-input" placeholder="🔍 Name…" (input)="applyFilter('name', $any($event.target).value)">
          <input class="filter-input" placeholder="Email…" (input)="applyFilter('email', $any($event.target).value)">
          <input class="filter-input" placeholder="Phone…" (input)="applyFilter('phone', $any($event.target).value)">
          <input class="filter-input" placeholder="Location…" (input)="applyFilter('location', $any($event.target).value)">
          <select class="filter-input filter-select" (change)="applyFilter('approved', $any($event.target).value)">
            <option value="">All statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div class="table-wrapper">
          <table mat-table [dataSource]="dataSource" class="suppliers-table">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let u"><strong>{{ u.name || '—' }}</strong></td>
            </ng-container>
            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef>Email</th>
              <td mat-cell *matCellDef="let u" class="email-cell">{{ u.email }}</td>
            </ng-container>
            <ng-container matColumnDef="phone">
              <th mat-header-cell *matHeaderCellDef>Phone</th>
              <td mat-cell *matCellDef="let u" class="muted-cell">{{ u.phoneNumber || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="location">
              <th mat-header-cell *matHeaderCellDef>Location</th>
              <td mat-cell *matCellDef="let u" class="muted-cell location-cell">{{ u.location || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="joined">
              <th mat-header-cell *matHeaderCellDef>Joined</th>
              <td mat-cell *matCellDef="let u" class="muted-cell">{{ u.createdAt | date:'dd MMM yyyy' }}</td>
            </ng-container>
            <ng-container matColumnDef="approved">
              <th mat-header-cell *matHeaderCellDef>Approval</th>
              <td mat-cell *matCellDef="let u">
                <div class="approval-cell">
                  @if (u.isApproved) {
                    <span class="status-chip chip-approved">✓ Approved</span>
                    <button mat-icon-button class="revoke-btn" matTooltip="Revoke approval" (click)="revoke(u)">
                      <mat-icon>block</mat-icon>
                    </button>
                  } @else {
                    <span class="status-chip chip-pending-approval">⏳ Pending</span>
                    <button mat-raised-button class="approve-btn" (click)="approve(u)">Approve</button>
                  }
                </div>
              </td>
            </ng-container>
            <ng-container matColumnDef="canLogin">
              <th mat-header-cell *matHeaderCellDef>Login</th>
              <td mat-cell *matCellDef="let u">
                <mat-slide-toggle [checked]="u.canLogin" (change)="toggleLogin(u, $event.checked)"></mat-slide-toggle>
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let u" class="actions-cell">
                <button mat-icon-button class="action-edit" matTooltip="Edit" (click)="router.navigate(['/admin/users', u.id, 'edit'])"><mat-icon>edit</mat-icon></button>
                <button mat-icon-button class="action-print" matTooltip="Print" (click)="printRow(u)"><mat-icon>print</mat-icon></button>
                <button mat-icon-button class="action-delete" matTooltip="Delete" (click)="deleteUser(u)"><mat-icon>delete</mat-icon></button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols;"></tr>
          </table>
        </div>
        <mat-paginator [pageSize]="5" [pageSizeOptions]="[5,10,20]" showFirstLastButtons></mat-paginator>
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
    .banner-actions { display: flex; gap: 10px; align-items: center; }
    .export-btn { border-color: rgba(255,255,255,.5) !important; color: #fff !important; border-radius: 8px !important; }
    .add-btn { background: #ffc107 !important; color: #1a1a2e !important; font-weight: 700 !important; border-radius: 8px !important; }

    .page-container { max-width: 1400px; margin: 0 auto; padding: 24px; }

    .filter-bar {
      display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px;
      background: #fff; padding: 14px 16px; border-radius: 12px;
      box-shadow: 0 2px 8px rgba(63,81,181,.10);
    }
    .filter-input {
      flex: 1; min-width: 120px; border: 1.5px solid #e8eaf6; border-radius: 8px;
      padding: 7px 10px; font-size: .85rem; outline: none; font-family: inherit;
      transition: border-color .2s;
    }
    .filter-input:focus { border-color: #3f51b5; }
    .filter-select { background: #fff; cursor: pointer; }

    .table-wrapper { overflow-x: auto; border-radius: 12px; box-shadow: 0 2px 8px rgba(63,81,181,.10); }
    .suppliers-table { width: 100%; background: #fff; }

    .email-cell { font-size: .85rem; color: #555; }
    .muted-cell { color: #666; font-size: .85rem; }
    .location-cell { max-width: 180px; white-space: normal; }

    .approval-cell { display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; }
    .status-chip { font-size: .75rem; font-weight: 700; padding: 3px 12px; border-radius: 20px; white-space: nowrap; }
    .chip-approved { background: #e8f5e9; color: #2e7d32; }
    .chip-pending-approval { background: #fff3e0; color: #e65100; }
    .approve-btn { background: #3f51b5 !important; color: #fff !important; font-size: .75rem !important; height: 28px !important; line-height: 28px !important; padding: 0 12px !important; border-radius: 20px !important; }
    .revoke-btn { color: #f44336 !important; }

    .actions-cell { white-space: nowrap; }
    .action-edit { color: #3f51b5 !important; }
    .action-print { color: #666 !important; }
    .action-delete { color: #f44336 !important; }

    @media (max-width: 768px) {
      .page-container { padding: 16px 10px; }
      .filter-bar { gap: 8px; }
    }
  `]
})
export class SupplierListComponent implements OnInit, AfterViewInit {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  router = inject(Router);
  loading = signal(true);
  skeletonRows = Array(5).fill(0);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  dataSource = new MatTableDataSource<User>([]);
  cols = ['name', 'email', 'phone', 'location', 'joined', 'approved', 'canLogin', 'actions'];
  private filters: Record<string, string> = {};

  constructor() {
    this.dataSource.filterPredicate = (row, filter) => {
      const f = JSON.parse(filter) as Record<string, string>;
      return Object.entries(f).every(([k, v]) => {
        if (!v) return true;
        const val = v.toLowerCase();
        if (k === 'name') return (row.name ?? '').toLowerCase().includes(val);
        if (k === 'email') return row.email.toLowerCase().includes(val);
        if (k === 'phone') return (row.phoneNumber ?? '').toLowerCase().includes(val);
        if (k === 'location') return (row.location ?? '').toLowerCase().includes(val);
        if (k === 'approved') return val === 'approved' ? row.isApproved : !row.isApproved;
        return true;
      });
    };
  }

  ngOnInit() { this.load(); }
  ngAfterViewInit() { this.dataSource.paginator = this.paginator; }

  load() { this.api.getUsers('Supplier').subscribe(u => { this.dataSource.data = u; this.loading.set(false); }); }

  applyFilter(col: string, value: string) {
    this.filters[col] = value.trim();
    this.dataSource.filter = JSON.stringify(this.filters);
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  private fmtDate(iso: string) {
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2,'0')} ${(d.getMonth()+1).toString().padStart(2,'0')} ${d.getFullYear()}`;
  }

  exportCsv() {
    const headers = ['Name', 'Email', 'Phone', 'Location', 'Joined', 'Approved', 'Can Login'];
    const rows = this.dataSource.data.map(u => [u.name ?? '', u.email, u.phoneNumber ?? '', u.location ?? '', this.fmtDate(u.createdAt), u.isApproved ? 'Yes' : 'No', u.canLogin ? 'Yes' : 'No']);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `suppliers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  printRow(u: User) {
    const win = window.open('', '_blank', 'width=600,height=500');
    if (!win) return;
    win.document.write(`<html><head><title>Supplier — ${u.name ?? u.email}</title>
      <style>body{font-family:Arial,sans-serif;padding:32px;color:#222}h2{margin-bottom:24px}table{border-collapse:collapse;width:100%}td{padding:8px 12px;border-bottom:1px solid #eee}td:first-child{font-weight:600;width:140px;color:#555}</style></head><body>
      <h2>Supplier Details</h2><table>
      <tr><td>Name</td><td>${u.name ?? '—'}</td></tr><tr><td>Email</td><td>${u.email}</td></tr>
      <tr><td>Phone</td><td>${u.phoneNumber ?? '—'}</td></tr><tr><td>Location</td><td>${u.location ?? '—'}</td></tr>
      <tr><td>Joined</td><td>${new Date(u.createdAt).toLocaleDateString()}</td></tr>
      <tr><td>Approval</td><td>${u.isApproved ? 'Approved' : 'Pending'}</td></tr>
      <tr><td>Can Login</td><td>${u.canLogin ? 'Yes' : 'No'}</td></tr></table>
      <script>window.onload=()=>{window.print();window.close()}<\/script></body></html>`);
    win.document.close();
  }

  approve(u: User) { this.api.approveSupplier(u.id).subscribe({ next: () => { this.snack.open('Approved', 'OK', { duration: 2000 }); this.load(); } }); }
  revoke(u: User) {
    if (!confirm(`Revoke approval for ${u.email}?`)) return;
    this.api.revokeSupplier(u.id).subscribe({ next: () => { this.snack.open('Revoked', 'OK', { duration: 2000 }); this.load(); } });
  }
  toggleLogin(u: User, val: boolean) { this.api.updateUser(u.id, { canLogin: val }).subscribe({ next: () => this.snack.open(val ? 'Login enabled' : 'Login disabled', 'OK', { duration: 1500 }) }); }
  deleteUser(u: User) {
    if (!confirm(`Delete supplier ${u.email}?`)) return;
    this.api.deleteUser(u.id).subscribe({ next: () => { this.snack.open('Deleted', 'OK', { duration: 1500 }); this.load(); } });
  }
}
