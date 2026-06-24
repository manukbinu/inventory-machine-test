import { Component, inject, OnInit, signal, ViewChild, AfterViewInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { User } from '../../core/models/models';

@Component({
  selector: 'app-customer-management',
  imports: [
    ReactiveFormsModule, DatePipe, MatTableModule, MatPaginatorModule, MatButtonModule,
    MatIconModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule,
    MatCardModule, MatTooltipModule, MatCheckboxModule, MatDividerModule
  ],
  template: `
    <!-- Page Banner -->
    <div class="page-banner">
      <div>
        <h1><mat-icon>people</mat-icon> Customer Management</h1>
        <p>{{ dataSource.data.length }} customer{{ dataSource.data.length !== 1 ? 's' : '' }} registered</p>
      </div>
      <div class="banner-actions">
        <button mat-stroked-button class="export-btn" (click)="exportCsv()">
          <mat-icon>download</mat-icon> Export CSV
        </button>
      </div>
    </div>

    <div class="page-container">
      <!-- Edit Form -->
      @if (editingUser) {
        <div class="edit-card">
          <h3><mat-icon>edit</mat-icon> Edit Customer — {{ editingUser.email }}</h3>
          <form [formGroup]="editForm" (ngSubmit)="saveEdit()">
            <div class="row-4">
              <mat-form-field appearance="outline">
                <mat-label>Full Name</mat-label>
                <input matInput formControlName="name">
                <mat-error>Required</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput formControlName="email" type="email">
                <mat-error>Valid email required</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>New Password</mat-label>
                <input matInput formControlName="newPassword" type="password">
                <mat-hint>Leave blank to keep</mat-hint>
                <mat-error>Min 6 chars</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Phone Number</mat-label>
                <input matInput formControlName="phoneNumber">
              </mat-form-field>
            </div>
            <div class="row-last">
              <mat-form-field appearance="outline">
                <mat-label>Address</mat-label>
                <input matInput formControlName="location">
              </mat-form-field>
              <div class="checkbox-cell">
                <mat-checkbox formControlName="canLogin">Can Login</mat-checkbox>
              </div>
            </div>
            @if (editError) { <p class="form-error">{{ editError }}</p> }
            <div style="display:flex;gap:8px">
              <button mat-raised-button class="save-edit-btn" type="submit" [disabled]="editForm.invalid">
                <mat-icon>save</mat-icon> Save Changes
              </button>
              <button mat-stroked-button type="button" (click)="cancelEdit()">
                <mat-icon>close</mat-icon> Cancel
              </button>
            </div>
          </form>
        </div>
      }

      <!-- Skeleton -->
      @if (loading()) {
        @for (_ of skeletonRows; track $index) {
          <div class="skeleton skeleton-row"></div>
        }
      } @else {
        <!-- Filter Bar -->
        <div class="filter-bar">
          <input class="filter-input" placeholder="🔍 Name…" (input)="applyFilter('name', $any($event.target).value)">
          <input class="filter-input" placeholder="Email…" (input)="applyFilter('email', $any($event.target).value)">
          <input class="filter-input" placeholder="Phone…" (input)="applyFilter('phone', $any($event.target).value)">
          <input class="filter-input" placeholder="Address…" (input)="applyFilter('address', $any($event.target).value)">
          <select class="filter-input filter-select" (change)="applyFilter('canLogin', $any($event.target).value)">
            <option value="">Login: All</option>
            <option value="yes">Enabled</option>
            <option value="no">Disabled</option>
          </select>
        </div>

        <div class="table-wrapper">
          <table mat-table [dataSource]="dataSource" class="customers-table">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let u"><strong>{{ u.name || '—' }}</strong></td>
            </ng-container>
            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef>Email</th>
              <td mat-cell *matCellDef="let u" class="muted-cell">{{ u.email }}</td>
            </ng-container>
            <ng-container matColumnDef="phone">
              <th mat-header-cell *matHeaderCellDef>Phone</th>
              <td mat-cell *matCellDef="let u" class="muted-cell">{{ u.phoneNumber || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="address">
              <th mat-header-cell *matHeaderCellDef>Address</th>
              <td mat-cell *matCellDef="let u" class="muted-cell" style="max-width:180px;white-space:normal">{{ u.location || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="joined">
              <th mat-header-cell *matHeaderCellDef>Joined</th>
              <td mat-cell *matCellDef="let u" class="muted-cell">{{ u.createdAt | date:'dd MMM yyyy' }}</td>
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
                <button mat-icon-button class="action-edit" matTooltip="Edit customer" (click)="startEdit(u)"><mat-icon>edit</mat-icon></button>
                <button mat-icon-button class="action-print" matTooltip="Print" (click)="printRow(u)"><mat-icon>print</mat-icon></button>
                <button mat-icon-button class="action-delete" matTooltip="Delete" (click)="deleteUser(u.id)"><mat-icon>delete</mat-icon></button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols;" [class.editing-row]="row.id === editingUser?.id"></tr>
          </table>
        </div>

        @if (dataSource.data.length === 0) {
          <div class="empty-note"><mat-icon style="font-size:36px;color:#c5cae9">people_outline</mat-icon><p>No customers registered yet.</p></div>
        }
        <mat-paginator [pageSize]="5" [pageSizeOptions]="[5, 10, 20]" showFirstLastButtons></mat-paginator>
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
    .page-container { max-width: 1400px; margin: 0 auto; padding: 24px; }

    .edit-card {
      background: #fff; border-radius: 12px; border-left: 5px solid #7b1fa2;
      padding: 20px 24px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(63,81,181,.15);
    }
    .edit-card h3 { margin: 0 0 16px; font-size: 1rem; display: flex; align-items: center; gap: 8px; color: #7b1fa2; }
    .row-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 8px; }
    .row-last { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 16px; margin-bottom: 16px; align-items: center; }
    .checkbox-cell { display: flex; align-items: center; padding-top: 4px; }
    .form-error { color: #f44336; font-size: .85rem; margin: 4px 0; }
    mat-form-field { width: 100%; }
    .save-edit-btn { background: #7b1fa2 !important; color: #fff !important; border-radius: 8px !important; }

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
    .customers-table { width: 100%; background: #fff; }
    .editing-row { background: #f3e5f5 !important; }
    .muted-cell { color: #666; font-size: .85rem; }
    .actions-cell { white-space: nowrap; }
    .action-edit { color: #7b1fa2 !important; }
    .action-print { color: #666 !important; }
    .action-delete { color: #f44336 !important; }
    .empty-note { text-align: center; padding: 32px; color: #888; }

    @media (max-width: 900px) {
      .row-4 { grid-template-columns: 1fr 1fr; }
      .row-last { grid-template-columns: 1fr 1fr; }
      .page-container { padding: 16px 10px; }
    }
  `]
})
export class CustomerManagementComponent implements OnInit, AfterViewInit {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  loading = signal(true);
  skeletonRows = Array(5).fill(0);
  dataSource = new MatTableDataSource<User>([]);
  cols = ['name', 'email', 'phone', 'address', 'joined', 'canLogin', 'actions'];
  filterCols = this.cols.map(c => `filter-${c}`);
  private filters: Record<string, string> = {};
  editingUser: User | null = null;
  editError = '';

  editForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    newPassword: [''],
    phoneNumber: [''],
    location: [''],
    canLogin: [true]
  });

  constructor() {
    this.dataSource.filterPredicate = (row, filter) => {
      const f = JSON.parse(filter) as Record<string, string>;
      return Object.entries(f).every(([k, v]) => {
        if (!v) return true;
        const val = v.toLowerCase();
        if (k === 'name') return (row.name ?? '').toLowerCase().includes(val);
        if (k === 'email') return row.email.toLowerCase().includes(val);
        if (k === 'phone') return (row.phoneNumber ?? '').toLowerCase().includes(val);
        if (k === 'address') return (row.location ?? '').toLowerCase().includes(val);
        if (k === 'canLogin') return val === 'yes' ? row.canLogin : !row.canLogin;
        return true;
      });
    };
  }

  ngOnInit() { this.load(); }
  ngAfterViewInit() { this.dataSource.paginator = this.paginator; }

  load() {
    this.loading.set(true);
    this.api.getUsers('Customer').subscribe(u => { this.dataSource.data = u; this.loading.set(false); });
  }

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
    const headers = ['Name', 'Email', 'Phone', 'Address', 'Joined', 'Can Login'];
    const rows = this.dataSource.data.map(u => [
      u.name ?? '',
      u.email,
      u.phoneNumber ?? '',
      u.location ?? '',
      this.fmtDate(u.createdAt),
      u.canLogin ? 'Yes' : 'No'
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `customers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  printRow(u: User) {
    const win = window.open('', '_blank', 'width=600,height=480');
    if (!win) return;
    win.document.write(`
      <html><head><title>Customer — ${u.name ?? u.email}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #222; }
        h2 { margin-bottom: 24px; }
        table { border-collapse: collapse; width: 100%; }
        td { padding: 8px 12px; border-bottom: 1px solid #eee; }
        td:first-child { font-weight: 600; width: 140px; color: #555; }
      </style></head><body>
      <h2>Customer Details</h2>
      <table>
        <tr><td>Name</td><td>${u.name ?? '—'}</td></tr>
        <tr><td>Email</td><td>${u.email}</td></tr>
        <tr><td>Phone</td><td>${u.phoneNumber ?? '—'}</td></tr>
        <tr><td>Address</td><td>${u.location ?? '—'}</td></tr>
        <tr><td>Joined</td><td>${this.fmtDate(u.createdAt)}</td></tr>
        <tr><td>Can Login</td><td>${u.canLogin ? 'Yes' : 'No'}</td></tr>
      </table>
      <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body></html>
    `);
    win.document.close();
  }

  startEdit(u: User) {
    this.editingUser = u;
    this.editError = '';
    this.editForm.reset({
      name: u.name || '',
      email: u.email,
      newPassword: '',
      phoneNumber: u.phoneNumber ?? '',
      location: u.location ?? '',
      canLogin: u.canLogin
    });
    this.editForm.get('newPassword')!.setValidators([Validators.minLength(6)]);
    this.editForm.get('newPassword')!.updateValueAndValidity();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() {
    this.editingUser = null;
    this.editError = '';
    this.editForm.reset();
  }

  saveEdit() {
    if (!this.editingUser) return;
    this.editError = '';
    const val = this.editForm.getRawValue();
    const payload: any = {
      name: val.name,
      email: val.email,
      phoneNumber: val.phoneNumber || null,
      location: val.location || null,
      canLogin: val.canLogin
    };
    if (val.newPassword) payload.newPassword = val.newPassword;

    this.api.updateUser(this.editingUser.id, payload).subscribe({
      next: () => {
        this.snack.open('Customer updated', 'OK', { duration: 2000 });
        this.cancelEdit();
        this.load();
      },
      error: err => { this.editError = err.error || 'Update failed.'; }
    });
  }

  toggleLogin(u: User, val: boolean) {
    this.api.updateUser(u.id, { canLogin: val }).subscribe({
      next: () => this.snack.open(val ? 'Login enabled' : 'Login disabled', 'OK', { duration: 1500 }),
      error: () => this.snack.open('Update failed', 'OK', { duration: 1500 })
    });
  }

  deleteUser(id: number) {
    if (!confirm('Delete this customer?')) return;
    this.api.deleteUser(id).subscribe({
      next: () => {
        if (this.editingUser?.id === id) this.cancelEdit();
        this.load();
      },
      error: () => this.snack.open('Delete failed', 'OK', { duration: 1500 })
    });
  }
}
