import { Component, inject, OnInit, ViewChild, AfterViewInit } from '@angular/core';
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
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { User } from '../../core/models/models';

@Component({
  selector: 'app-user-management',
  imports: [
    ReactiveFormsModule, DatePipe, MatTableModule, MatPaginatorModule, MatButtonModule,
    MatIconModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule, MatCardModule,
    MatChipsModule, MatTooltipModule, MatCheckboxModule, MatDividerModule
  ],
  template: `
    <div style="padding:16px">
      <h2>Supplier Management</h2>

      <!-- CREATE FORM — shown only when not editing -->
      @if (!editingUser) {
        <mat-card style="margin-bottom:24px;padding:16px;border-left:4px solid #1976d2">
          <h3 style="margin-top:0">Create Supplier Account</h3>
          <form [formGroup]="createForm" (ngSubmit)="createSupplier()">
            <div class="row-2">
              <mat-form-field appearance="outline">
                <mat-label>Full Name</mat-label>
                <input matInput formControlName="name">
                <mat-error>Name is required</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput formControlName="email" type="email">
                <mat-error>Valid email required</mat-error>
              </mat-form-field>
            </div>
            <div class="row-2">
              <mat-form-field appearance="outline">
                <mat-label>Password</mat-label>
                <input matInput formControlName="password" type="password">
                <mat-error>Min 6 characters</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Phone</mat-label>
                <input matInput formControlName="phoneNumber">
              </mat-form-field>
            </div>
            <mat-form-field appearance="outline" style="width:100%;margin-bottom:8px">
              <mat-label>Location</mat-label>
              <input matInput formControlName="location">
            </mat-form-field>
            @if (createError) { <p style="color:red;margin:4px 0">{{ createError }}</p> }
            <button mat-raised-button color="primary" type="submit" [disabled]="createForm.invalid">
              Create Supplier
            </button>
          </form>
        </mat-card>
      }

      <!-- EDIT FORM — same structure as customer page -->
      @if (editingUser) {
        <mat-card style="margin-bottom:24px;padding:16px;border-left:4px solid #1976d2">
          <h3 style="margin-top:0">Edit Supplier — <span style="color:#1976d2">{{ editingUser.email }}</span></h3>
          <form [formGroup]="editForm" (ngSubmit)="saveEdit()">
            <div class="row-2">
              <mat-form-field appearance="outline">
                <mat-label>Full Name</mat-label>
                <input matInput formControlName="name">
                <mat-error>Name is required</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput formControlName="email" type="email">
                <mat-error>Valid email required</mat-error>
              </mat-form-field>
            </div>
            <div class="row-2">
              <mat-form-field appearance="outline">
                <mat-label>New Password</mat-label>
                <input matInput formControlName="newPassword" type="password">
                <mat-hint>Leave blank to keep current</mat-hint>
                <mat-error>Min 6 characters</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Phone</mat-label>
                <input matInput formControlName="phoneNumber">
              </mat-form-field>
            </div>
            <mat-form-field appearance="outline" style="width:100%;margin-bottom:8px">
              <mat-label>Location</mat-label>
              <input matInput formControlName="location">
            </mat-form-field>
            <div style="margin-bottom:12px">
              <mat-checkbox formControlName="canLogin">Can Login</mat-checkbox>
            </div>
            @if (editError) { <p style="color:red;margin:4px 0">{{ editError }}</p> }
            <div style="display:flex;gap:8px">
              <button mat-raised-button color="primary" type="submit" [disabled]="editForm.invalid">
                Save Changes
              </button>
              <button mat-stroked-button type="button" (click)="cancelEdit()">Cancel</button>
            </div>
          </form>
        </mat-card>
      }

      <mat-divider style="margin-bottom:16px"></mat-divider>

      <!-- SUPPLIER TABLE -->
      <table mat-table [dataSource]="dataSource" class="mat-elevation-z2 full-width">
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
          <td mat-cell *matCellDef="let u">
            @if (u.isApproved) {
              <mat-chip color="primary" highlighted>Approved</mat-chip>
              <button mat-icon-button color="warn" matTooltip="Revoke approval" (click)="revoke(u)">
                <mat-icon>block</mat-icon>
              </button>
            } @else {
              <mat-chip color="warn" highlighted>Pending</mat-chip>
              <button mat-raised-button color="primary" (click)="approve(u)">Approve</button>
            }
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
            <button mat-icon-button color="primary" matTooltip="Edit supplier" (click)="startEdit(u)">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button color="warn" matTooltip="Delete" (click)="deleteUser(u.id)">
              <mat-icon>delete</mat-icon>
            </button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols;" [class.editing-row]="row.id === editingUser?.id"></tr>
      </table>

      @if (dataSource.data.length === 0) {
        <p style="padding:16px;color:#888">No suppliers yet.</p>
      }

      <mat-paginator [pageSize]="5" [pageSizeOptions]="[5, 10, 20]" showFirstLastButtons></mat-paginator>
    </div>
  `,
  styles: [`
    .full-width { width: 100%; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 8px; }
    .editing-row { background: #e3f2fd; }
    mat-paginator { border-top: 1px solid rgba(0,0,0,.12); }
  `]
})
export class UserManagementComponent implements OnInit, AfterViewInit {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  dataSource = new MatTableDataSource<User>([]);
  cols = ['name', 'email', 'phone', 'location', 'joined', 'approved', 'canLogin', 'actions'];
  editingUser: User | null = null;
  createError = '';
  editError = '';

  createForm = this.buildCreateForm();

  editForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    newPassword: [''],
    phoneNumber: [''],
    location: [''],
    canLogin: [true]
  });

  private buildCreateForm() {
    return this.fb.nonNullable.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      phoneNumber: [''],
      location: [''],
      isActive: [true]
    });
  }

  ngOnInit() { this.load(); }
  ngAfterViewInit() { this.dataSource.paginator = this.paginator; }

  load() { this.api.getUsers('Supplier').subscribe(u => { this.dataSource.data = u; }); }

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

  cancelEdit() { this.editingUser = null; this.editError = ''; this.editForm.reset(); }

  createSupplier() {
    this.createError = '';
    this.api.createSupplier(this.createForm.getRawValue()).subscribe({
      next: () => {
        this.snack.open('Supplier created', 'OK', { duration: 2000 });
        this.createForm = this.buildCreateForm();
        this.load();
      },
      error: err => { this.createError = err.error || 'Creation failed.'; }
    });
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
        this.snack.open('Supplier updated', 'OK', { duration: 2000 });
        this.cancelEdit();
        this.load();
      },
      error: err => { this.editError = err.error || 'Update failed.'; }
    });
  }

  approve(u: User) {
    this.api.approveSupplier(u.id).subscribe({
      next: () => { this.snack.open('Supplier approved ✓', 'OK', { duration: 2000 }); this.load(); },
      error: () => this.snack.open('Approval failed', 'OK', { duration: 2000 })
    });
  }

  revoke(u: User) {
    if (!confirm(`Revoke approval for ${u.email}?`)) return;
    this.api.revokeSupplier(u.id).subscribe({
      next: () => { this.snack.open('Approval revoked', 'OK', { duration: 2000 }); this.load(); },
      error: () => this.snack.open('Revoke failed', 'OK', { duration: 2000 })
    });
  }

  toggleLogin(u: User, val: boolean) {
    this.api.updateUser(u.id, { canLogin: val }).subscribe({
      next: () => this.snack.open(val ? 'Login enabled' : 'Login disabled', 'OK', { duration: 1500 }),
      error: () => this.snack.open('Update failed', 'OK', { duration: 1500 })
    });
  }

  deleteUser(id: number) {
    if (!confirm('Delete this supplier?')) return;
    this.api.deleteUser(id).subscribe({
      next: () => { if (this.editingUser?.id === id) this.cancelEdit(); this.load(); },
      error: () => this.snack.open('Delete failed', 'OK', { duration: 1500 })
    });
  }
}
