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
    <div style="padding:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px">
        <h2 style="margin:0">Customer Management</h2>
        <button mat-stroked-button (click)="exportCsv()">
          <mat-icon>download</mat-icon> Export CSV
        </button>
      </div>

      <!-- EDIT FORM -->
      @if (editingUser) {
        <mat-card style="margin-bottom:24px;padding:16px;border-left:4px solid #7b1fa2">
          <h3>Edit Customer — <span style="color:#7b1fa2">{{ editingUser.email }}</span></h3>
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
              <button mat-raised-button color="primary" type="submit" [disabled]="editForm.invalid">Save Changes</button>
              <button mat-stroked-button type="button" (click)="cancelEdit()">Cancel</button>
            </div>
          </form>
        </mat-card>
      }

      <mat-divider style="margin-bottom:16px"></mat-divider>

      <!-- CUSTOMER TABLE -->
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
        <ng-container matColumnDef="filter-address">
          <th mat-header-cell *matHeaderCellDef><input class="col-filter" placeholder="Address…" (input)="applyFilter('address', $any($event.target).value)"></th>
        </ng-container>
        <ng-container matColumnDef="filter-joined"><th mat-header-cell *matHeaderCellDef></th></ng-container>
        <ng-container matColumnDef="filter-canLogin">
          <th mat-header-cell *matHeaderCellDef>
            <select class="col-filter" (change)="applyFilter('canLogin', $any($event.target).value)">
              <option value="">All</option>
              <option value="yes">Enabled</option>
              <option value="no">Disabled</option>
            </select>
          </th>
        </ng-container>
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
        <ng-container matColumnDef="address">
          <th mat-header-cell *matHeaderCellDef>Address</th>
          <td mat-cell *matCellDef="let u" style="max-width:200px;white-space:normal;font-size:.85rem">{{ u.location || '—' }}</td>
        </ng-container>
        <ng-container matColumnDef="joined">
          <th mat-header-cell *matHeaderCellDef>Joined</th>
          <td mat-cell *matCellDef="let u">{{ u.createdAt | date:'mediumDate' }}</td>
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
            <button mat-icon-button color="primary" matTooltip="Edit customer" (click)="startEdit(u)">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button matTooltip="Print" (click)="printRow(u)">
              <mat-icon>print</mat-icon>
            </button>
            <button mat-icon-button color="warn" matTooltip="Delete" (click)="deleteUser(u.id)">
              <mat-icon>delete</mat-icon>
            </button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-header-row *matHeaderRowDef="filterCols" class="filter-row"></tr>
        <tr mat-row *matRowDef="let row; columns: cols;" [class.editing-row]="row.id === editingUser?.id"></tr>
      </table>

      @if (dataSource.data.length === 0) {
        <p style="padding:16px;color:#888">No customers registered yet.</p>
      }

      <mat-paginator [pageSize]="5" [pageSizeOptions]="[5, 10, 20]" showFirstLastButtons></mat-paginator>
    </div>
  `,
  styles: [`
    .full-width { width: 100%; }
    mat-form-field { width:100%; }
    .row-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:16px; }
    .row-last { display:grid; grid-template-columns:2fr 1fr 1fr; gap:16px; margin-bottom:16px; align-items:center; }
    .checkbox-cell { display:flex; align-items:center; padding-top:4px; }
    .form-error { color:red; font-size:.85rem; margin:4px 0; }
    .editing-row { background: #f3e5f5; }
    mat-paginator { border-top: 1px solid rgba(0,0,0,.12); }
    .filter-row th { padding:4px 8px !important; }
    .col-filter { width:100%; border:1px solid #ccc; border-radius:4px; padding:4px 6px; font-size:.8rem; outline:none; box-sizing:border-box; background:#fff; }
    .col-filter:focus { border-color:#7b1fa2; }
    @media(max-width:900px) { .row-4 { grid-template-columns:1fr 1fr; } .row-last { grid-template-columns:1fr 1fr; } }
  `]
})
export class CustomerManagementComponent implements OnInit, AfterViewInit {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

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
    this.api.getUsers('Customer').subscribe(u => { this.dataSource.data = u; });
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
