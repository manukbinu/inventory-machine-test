import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-supplier-form',
  imports: [
    ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatCheckboxModule
  ],
  template: `
    <div class="form-page">
      <div class="form-header">
        <button mat-stroked-button (click)="back()">
          <mat-icon>arrow_back</mat-icon> Back
        </button>
        <h2 style="margin:0">{{ isEdit ? 'Edit Supplier' : 'Add Supplier' }}</h2>
      </div>

      <mat-card class="form-card">
        <form [formGroup]="form" (ngSubmit)="submit()">
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
              <mat-label>{{ isEdit ? 'New Password' : 'Password' }}</mat-label>
              <input matInput formControlName="password" type="password">
              @if (isEdit) { <mat-hint>Leave blank to keep</mat-hint> }
              <mat-error>Min 6 chars</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Phone</mat-label>
              <input matInput formControlName="phoneNumber">
            </mat-form-field>
          </div>

          <div class="row-last">
            <mat-form-field appearance="outline">
              <mat-label>Location</mat-label>
              <input matInput formControlName="location">
            </mat-form-field>
            @if (isEdit) {
              <div class="checkbox-cell">
                <mat-checkbox formControlName="canLogin">Can Login</mat-checkbox>
              </div>
            }
          </div>

          @if (error) { <p class="form-error">{{ error }}</p> }
          <div class="form-actions">
            <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid">
              {{ isEdit ? 'Save Changes' : 'Create Supplier' }}
            </button>
            <button mat-stroked-button type="button" (click)="back()">Cancel</button>
          </div>
        </form>
      </mat-card>
    </div>
  `,
  styles: [`
    .form-page { padding:24px; box-sizing:border-box; width:100%; }
    .form-header { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
    .form-card { padding:24px; border-left:4px solid #1976d2; width:100%; box-sizing:border-box; }
    .row-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:16px; }
    .row-last { display:grid; grid-template-columns:2fr 1fr 1fr; gap:16px; margin-bottom:16px; align-items:center; }
    .checkbox-cell { display:flex; align-items:center; gap:8px; padding-top:4px; }
    .form-error { color:red; font-size:.85rem; margin:4px 0; }
    .form-actions { display:flex; gap:12px; margin-top:8px; }
    mat-form-field { width:100%; }
    @media(max-width:900px) { .row-4 { grid-template-columns:1fr 1fr; } .row-last { grid-template-columns:1fr 1fr; } }
    @media(max-width:500px) { .row-4,.row-last { grid-template-columns:1fr; } }
  `]
})
export class SupplierFormComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  isEdit = false;
  editId: number | null = null;
  error = '';

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    phoneNumber: [''],
    location: [''],
    canLogin: [true]
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.editId = +id;
      // password optional on edit
      this.form.get('password')!.setValidators([Validators.minLength(6)]);
      this.form.get('password')!.updateValueAndValidity();
      // load existing data
      this.api.getUsers('Supplier').subscribe(users => {
        const u = users.find(x => x.id === this.editId);
        if (u) {
          this.form.patchValue({
            name: u.name || '',
            email: u.email,
            password: '',
            phoneNumber: u.phoneNumber ?? '',
            location: u.location ?? '',
            canLogin: u.canLogin
          });
        }
      });
    }
  }

  submit() {
    this.error = '';
    const val = this.form.getRawValue();

    if (this.isEdit && this.editId) {
      const payload: any = {
        name: val.name,
        email: val.email,
        phoneNumber: val.phoneNumber || null,
        location: val.location || null,
        canLogin: val.canLogin
      };
      if (val.password) payload.newPassword = val.password;

      this.api.updateUser(this.editId, payload).subscribe({
        next: () => {
          this.snack.open('Supplier updated', 'OK', { duration: 2000 });
          this.router.navigate(['/admin/users']);
        },
        error: err => { this.error = err.error || 'Update failed.'; }
      });
    } else {
      this.api.createSupplier({
        name: val.name, email: val.email, password: val.password,
        phoneNumber: val.phoneNumber || null, location: val.location || null, isActive: true
      }).subscribe({
        next: () => {
          this.snack.open('Supplier created', 'OK', { duration: 2000 });
          this.router.navigate(['/admin/users']);
        },
        error: err => { this.error = err.error || 'Creation failed.'; }
      });
    }
  }

  back() { this.router.navigate(['/admin/users']); }
}
