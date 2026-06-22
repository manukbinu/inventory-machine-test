import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-edit-profile',
  imports: [
    ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule
  ],
  template: `
    <div class="form-page">
      <div class="form-header">
        <button mat-stroked-button (click)="back()">
          <mat-icon>arrow_back</mat-icon> Back
        </button>
        <h2 style="margin:0">Edit My Profile</h2>
      </div>

      <mat-card class="form-card">
        <div class="user-badge">
          <mat-icon style="font-size:40px;height:40px;width:40px;color:#1976d2">account_circle</mat-icon>
          <div>
            <div style="font-weight:600;font-size:1rem">{{ auth.user()?.email }}</div>
            <div style="font-size:.85rem;color:#666">{{ auth.role }}</div>
          </div>
        </div>

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
              <mat-label>New Password</mat-label>
              <input matInput formControlName="newPassword" type="password">
              <mat-hint>Leave blank to keep current</mat-hint>
              <mat-error>Min 6 characters</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Phone Number</mat-label>
              <input matInput formControlName="phoneNumber">
            </mat-form-field>
          </div>

          <div class="row-1">
            <mat-form-field appearance="outline">
              <mat-label>Address / Location</mat-label>
              <input matInput formControlName="location">
            </mat-form-field>
          </div>

          @if (error) { <p class="form-error">{{ error }}</p> }

          <div class="form-actions">
            <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || saving">
              {{ saving ? 'Saving…' : 'Save Changes' }}
            </button>
            <button mat-stroked-button type="button" (click)="back()">Cancel</button>
          </div>
        </form>
      </mat-card>
    </div>
  `,
  styles: [`
    .form-page { padding:24px; width:100%; box-sizing:border-box; }
    .form-header { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
    .form-card { padding:24px; border-left:4px solid #1976d2; width:100%; box-sizing:border-box; }
    .user-badge { display:flex; align-items:center; gap:12px; margin-bottom:24px; padding:12px 16px; background:#f5f5f5; border-radius:8px; }
    mat-form-field { width:100%; }
    .row-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:16px; }
    .row-1 { display:grid; grid-template-columns:1fr; gap:16px; margin-bottom:16px; }
    .form-error { color:red; font-size:.85rem; margin:4px 0; }
    .form-actions { display:flex; gap:12px; margin-top:8px; }
    @media(max-width:900px) { .row-4 { grid-template-columns:1fr 1fr; } }
    @media(max-width:500px) { .row-4 { grid-template-columns:1fr; } }
  `]
})
export class EditProfileComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  private router = inject(Router);
  auth = inject(AuthService);

  error = '';
  saving = false;

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    newPassword: ['', [Validators.minLength(6)]],
    phoneNumber: [''],
    location: ['']
  });

  ngOnInit() {
    const u = this.auth.user();
    if (u) {
      this.form.patchValue({
        name: (u as any).name || '',
        email: u.email,
        newPassword: '',
        phoneNumber: (u as any).phoneNumber || '',
        location: (u as any).location || ''
      });
    }
  }

  submit() {
    this.error = '';
    this.saving = true;
    const val = this.form.getRawValue();
    const payload: any = {
      name: val.name,
      email: val.email,
      phoneNumber: val.phoneNumber || null,
      location: val.location || null
    };
    if (val.newPassword) payload.newPassword = val.newPassword;

    this.api.updateProfile(payload).subscribe({
      next: () => {
        this.saving = false;
        this.snack.open('Profile updated successfully', 'OK', { duration: 2500 });
        this.back();
      },
      error: err => {
        this.saving = false;
        this.error = err.error || 'Update failed.';
      }
    });
  }

  back() {
    const role = this.auth.role;
    if (role === 'Admin') this.router.navigate(['/admin/dashboard']);
    else if (role === 'Supplier') this.router.navigate(['/supplier/products']);
    else this.router.navigate(['/browse']);
  }
}
