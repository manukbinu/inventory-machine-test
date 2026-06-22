import { Component, inject, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { User } from '../../core/models/models';

@Component({
  selector: 'app-supplier-list',
  imports: [
    DatePipe, MatTableModule, MatPaginatorModule, MatButtonModule,
    MatIconModule, MatInputModule, MatSlideToggleModule, MatChipsModule, MatTooltipModule
  ],
  template: `
    <div style="padding:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
        <h2 style="margin:0">Supplier Management</h2>
        <div style="display:flex;gap:8px">
          <button mat-stroked-button (click)="exportCsv()">
            <mat-icon>download</mat-icon> Export CSV
          </button>
          <button mat-raised-button color="primary" (click)="router.navigate(['/admin/users/new'])">
            <mat-icon>add</mat-icon> Add Supplier
          </button>
        </div>
      </div>

      <table mat-table [dataSource]="dataSource" class="mat-elevation-z2 full-width">

        <!-- Filter row -->
        <ng-container matColumnDef="filter-name">
          <th mat-header-cell *matHeaderCellDef><input class="col-filter" placeholder="Name…" (input)="applyFilter('name', $any($event.target).value)"></th>
        </ng-container>
        <ng-container matColumnDef="filter-email">
          <th mat-header-cell *matHeaderCellDef><input class="col-filter" placeholder="Email…" (input)="applyFilter('email', $any($event.target).value)"></th>
        </ng-container>
        <ng-container matColumnDef="filter-phone">
          <th mat-header-cell *matHeaderCellDef><input class="col-filter" placeholder="Phone…" (input)="applyFilter('phone', $any($event.target).value)"></th>
        </ng-container>
        <ng-container matColumnDef="filter-location">
          <th mat-header-cell *matHeaderCellDef><input class="col-filter" placeholder="Location…" (input)="applyFilter('location', $any($event.target).value)"></th>
        </ng-container>
        <ng-container matColumnDef="filter-joined"><th mat-header-cell *matHeaderCellDef></th></ng-container>
        <ng-container matColumnDef="filter-approved">
          <th mat-header-cell *matHeaderCellDef>
            <select class="col-filter" (change)="applyFilter('approved', $any($event.target).value)">
              <option value="">All</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>
          </th>
        </ng-container>
        <ng-container matColumnDef="filter-canLogin"><th mat-header-cell *matHeaderCellDef></th></ng-container>
        <ng-container matColumnDef="filter-actions"><th mat-header-cell *matHeaderCellDef></th></ng-container>

        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Name</th>
          <td mat-cell *matCellDef="let u">{{ u.name || '—' }}</td>
        </ng-container>
        <ng-container matColumnDef="email">
          <th mat-header-cell *matHeaderCellDef>Email</th>
          <td mat-cell *matCellDef="let u">{{ u.email }}</td>
        </ng-container>
        <ng-container matColumnDef="phone">
          <th mat-header-cell *matHeaderCellDef>Phone</th>
          <td mat-cell *matCellDef="let u" style="width:130px">{{ u.phoneNumber || '—' }}</td>
        </ng-container>
        <ng-container matColumnDef="location">
          <th mat-header-cell *matHeaderCellDef>Location</th>
          <td mat-cell *matCellDef="let u" style="max-width:200px;white-space:normal;font-size:.85rem">{{ u.location || '—' }}</td>
        </ng-container>
        <ng-container matColumnDef="joined">
          <th mat-header-cell *matHeaderCellDef>Joined</th>
          <td mat-cell *matCellDef="let u">{{ u.createdAt | date:'mediumDate' }}</td>
        </ng-container>
        <ng-container matColumnDef="approved">
          <th mat-header-cell *matHeaderCellDef>Approval</th>
          <td mat-cell *matCellDef="let u" style="min-width:200px">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:nowrap">
              @if (u.isApproved) {
                <mat-chip color="primary" highlighted>Approved</mat-chip>
                <button mat-icon-button color="warn" matTooltip="Revoke approval" (click)="revoke(u)"><mat-icon>block</mat-icon></button>
              } @else {
                <mat-chip color="warn" highlighted>Pending</mat-chip>
                <button mat-raised-button color="primary" style="height:30px;line-height:30px;font-size:.8rem;padding:0 12px" (click)="approve(u)">Approve</button>
              }
            </div>
          </td>
        </ng-container>
        <ng-container matColumnDef="canLogin">
          <th mat-header-cell *matHeaderCellDef>Can Login</th>
          <td mat-cell *matCellDef="let u">
            <mat-slide-toggle [checked]="u.canLogin" (change)="toggleLogin(u, $event.checked)"></mat-slide-toggle>
          </td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Actions</th>
          <td mat-cell *matCellDef="let u" style="white-space:nowrap">
            <button mat-icon-button color="primary" matTooltip="Edit supplier" (click)="router.navigate(['/admin/users', u.id, 'edit'])"><mat-icon>edit</mat-icon></button>
            <button mat-icon-button matTooltip="Print" (click)="printRow(u)"><mat-icon>print</mat-icon></button>
            <button mat-icon-button color="warn" matTooltip="Delete" (click)="deleteUser(u)"><mat-icon>delete</mat-icon></button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-header-row *matHeaderRowDef="filterCols" class="filter-row"></tr>
        <tr mat-row *matRowDef="let row; columns: cols;"></tr>
      </table>

      @if (dataSource.data.length === 0) {
        <p style="padding:16px;color:#888">No suppliers yet.</p>
      }
      <mat-paginator [pageSize]="5" [pageSizeOptions]="[5,10,20]" showFirstLastButtons></mat-paginator>
    </div>
  `,
  styles: [`
    .full-width { width:100%; }
    mat-paginator { border-top:1px solid rgba(0,0,0,.12); }
    .filter-row th { padding:4px 8px !important; }
    .col-filter { width:100%; border:1px solid #ccc; border-radius:4px; padding:4px 6px; font-size:.8rem; outline:none; box-sizing:border-box; background:#fff; }
    .col-filter:focus { border-color:#1976d2; }
  `]
})
export class SupplierListComponent implements OnInit, AfterViewInit {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  router = inject(Router);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  dataSource = new MatTableDataSource<User>([]);
  cols = ['name', 'email', 'phone', 'location', 'joined', 'approved', 'canLogin', 'actions'];
  filterCols = this.cols.map(c => `filter-${c}`);
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

  load() { this.api.getUsers('Supplier').subscribe(u => { this.dataSource.data = u; }); }

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
    const rows = this.dataSource.data.map(u => [
      u.name ?? '',
      u.email,
      u.phoneNumber ?? '',
      u.location ?? '',
      this.fmtDate(u.createdAt),
      u.isApproved ? 'Yes' : 'No',
      u.canLogin ? 'Yes' : 'No'
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `suppliers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  printRow(u: User) {
    const win = window.open('', '_blank', 'width=600,height=500');
    if (!win) return;
    win.document.write(`
      <html><head><title>Supplier — ${u.name ?? u.email}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #222; }
        h2 { margin-bottom: 24px; }
        table { border-collapse: collapse; width: 100%; }
        td { padding: 8px 12px; border-bottom: 1px solid #eee; }
        td:first-child { font-weight: 600; width: 140px; color: #555; }
      </style></head><body>
      <h2>Supplier Details</h2>
      <table>
        <tr><td>Name</td><td>${u.name ?? '—'}</td></tr>
        <tr><td>Email</td><td>${u.email}</td></tr>
        <tr><td>Phone</td><td>${u.phoneNumber ?? '—'}</td></tr>
        <tr><td>Location</td><td>${u.location ?? '—'}</td></tr>
        <tr><td>Joined</td><td>${new Date(u.createdAt).toLocaleDateString()}</td></tr>
        <tr><td>Approval</td><td>${u.isApproved ? 'Approved' : 'Pending'}</td></tr>
        <tr><td>Can Login</td><td>${u.canLogin ? 'Yes' : 'No'}</td></tr>
      </table>
      <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body></html>
    `);
    win.document.close();
  }

  approve(u: User) {
    this.api.approveSupplier(u.id).subscribe({ next: () => { this.snack.open('Approved', 'OK', { duration: 2000 }); this.load(); } });
  }
  revoke(u: User) {
    if (!confirm(`Revoke approval for ${u.email}?`)) return;
    this.api.revokeSupplier(u.id).subscribe({ next: () => { this.snack.open('Revoked', 'OK', { duration: 2000 }); this.load(); } });
  }
  toggleLogin(u: User, val: boolean) {
    this.api.updateUser(u.id, { canLogin: val }).subscribe({ next: () => this.snack.open(val ? 'Login enabled' : 'Login disabled', 'OK', { duration: 1500 }) });
  }
  deleteUser(u: User) {
    if (!confirm(`Delete supplier ${u.email}?`)) return;
    this.api.deleteUser(u.id).subscribe({ next: () => { this.snack.open('Deleted', 'OK', { duration: 1500 }); this.load(); } });
  }
}
