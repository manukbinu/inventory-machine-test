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
    <div class="form-bg">
      <div class="back-row">
        <button mat-stroked-button class="back-btn" (click)="back()">
          <mat-icon>arrow_back</mat-icon> Suppliers
        </button>
      </div>

      <div class="form-card">
        <div class="card-title">
          <mat-icon>{{ isEdit ? 'edit' : 'person_add' }}</mat-icon>
          <h2>{{ isEdit ? 'Edit Supplier' : 'Add New Supplier' }}</h2>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="section-label"><mat-icon>badge</mat-icon> Personal Info</div>
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
              <mat-icon matPrefix>phone</mat-icon>
              <input matInput formControlName="phoneNumber">
            </mat-form-field>
          </div>

          <div class="row-last">
            <mat-form-field appearance="outline">
              <mat-label>Location</mat-label>
              <mat-icon matPrefix>location_on</mat-icon>
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
            <button mat-raised-button class="save-btn" type="submit" [disabled]="form.invalid">
              <mat-icon>{{ isEdit ? 'save' : 'person_add' }}</mat-icon>
              {{ isEdit ? 'Save Changes' : 'Create Supplier' }}
            </button>
            <button mat-stroked-button type="button" (click)="back()">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .form-bg { background: #f0f2f8; min-height: calc(100vh - 64px); padding: 28px 24px; box-sizing: border-box; }
    .back-row { max-width: 760px; margin: 0 auto 16px; }
    .back-btn { border-color: #c5cae9 !important; color: #3f51b5 !important; border-radius: 8px !important; }
    .form-card {
      max-width: 760px; margin: 0 auto;
      background: #fff; border-radius: 16px; border-left: 5px solid #3f51b5;
      box-shadow: 0 4px 20px rgba(63,81,181,.15); padding: 28px 32px;
    }
    .card-title { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
    .card-title mat-icon { color: #3f51b5; }
    .card-title h2 { margin: 0; font-size: 1.25rem; font-weight: 800; }
    .section-label { display: flex; align-items: center; gap: 6px; font-size: .78rem; font-weight: 700; color: #3f51b5; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 10px; }
    .section-label mat-icon { font-size: 15px; height: 15px; width: 15px; }
    mat-form-field { width: 100%; }
    .row-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 8px; }
    .row-last { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 16px; margin-bottom: 16px; align-items: center; }
    .checkbox-cell { display: flex; align-items: center; gap: 8px; padding-top: 4px; }
    .form-error { color: #f44336; font-size: .85rem; margin: 4px 0 12px; }
    .form-actions { display: flex; gap: 12px; margin-top: 8px; }
    .save-btn { background: #3f51b5 !important; color: #fff !important; border-radius: 8px !important; }
    @media (max-width: 900px) { .row-4 { grid-template-columns: 1fr 1fr; } .row-last { grid-template-columns: 1fr 1fr; } .form-card { padding: 20px 16px; } }
    @media (max-width: 500px) { .row-4, .row-last { grid-template-columns: 1fr; } }
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
