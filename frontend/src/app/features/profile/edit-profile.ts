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
    <div class="profile-bg">
      <!-- Back link -->
      <div class="back-row">
        <button mat-stroked-button class="back-btn" (click)="back()">
          <mat-icon>arrow_back</mat-icon> Back
        </button>
      </div>

      <div class="profile-card">
        <!-- Avatar -->
        <div class="avatar-block">
          <div class="avatar" [class]="avatarClass()">{{ initial() }}</div>
          <div class="avatar-info">
            <div class="avatar-email">{{ auth.user()?.email }}</div>
            <span class="role-chip" [class]="roleBadgeClass()">{{ auth.role }}</span>
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="section-label"><mat-icon>person</mat-icon> Account Info</div>
          <div class="row-2">
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
              <mat-label>Phone Number</mat-label>
              <mat-icon matPrefix>phone</mat-icon>
              <input matInput formControlName="phoneNumber">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Address / Location</mat-label>
              <mat-icon matPrefix>location_on</mat-icon>
              <input matInput formControlName="location">
            </mat-form-field>
          </div>

          <div class="section-label" style="margin-top:16px"><mat-icon>lock</mat-icon> Change Password</div>
          <div class="row-1">
            <mat-form-field appearance="outline">
              <mat-label>New Password</mat-label>
              <input matInput formControlName="newPassword" type="password">
              <mat-hint>Leave blank to keep current password</mat-hint>
              <mat-error>Min 6 characters</mat-error>
            </mat-form-field>
          </div>

          @if (error) { <p class="form-error">{{ error }}</p> }

          <div class="form-actions">
            <button mat-raised-button class="save-btn" type="submit" [disabled]="form.invalid || saving">
              <mat-icon>{{ saving ? 'hourglass_empty' : 'save' }}</mat-icon>
              {{ saving ? 'Saving…' : 'Save Changes' }}
            </button>
            <button mat-stroked-button type="button" (click)="back()">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .profile-bg { background: #f0f2f8; min-height: calc(100vh - 64px); padding: 32px 24px; box-sizing: border-box; }
    .back-row { max-width: 720px; margin: 0 auto 16px; }
    .back-btn { border-color: #c5cae9 !important; color: #3f51b5 !important; border-radius: 8px !important; }

    .profile-card {
      max-width: 720px; margin: 0 auto;
      background: #fff; border-radius: 16px;
      box-shadow: 0 4px 20px rgba(63,81,181,.15);
      padding: 32px;
    }

    .avatar-block { display: flex; align-items: center; gap: 16px; margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1px solid #e8eaf6; }
    .avatar { width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 800; color: #fff; flex-shrink: 0; }
    .avatar-admin    { background: linear-gradient(135deg, #c62828, #e53935); }
    .avatar-supplier { background: linear-gradient(135deg, #f57c00, #ffa726); }
    .avatar-customer { background: linear-gradient(135deg, #2e7d32, #43a047); }
    .avatar-default  { background: linear-gradient(135deg, #283593, #3f51b5); }
    .avatar-email { font-size: .95rem; font-weight: 600; margin-bottom: 4px; }
    .role-chip { font-size: .73rem; font-weight: 700; padding: 3px 12px; border-radius: 20px; }
    .role-admin    { background: #ffebee; color: #c62828; }
    .role-supplier { background: #fff3e0; color: #e65100; }
    .role-customer { background: #e8f5e9; color: #2e7d32; }

    .section-label { display: flex; align-items: center; gap: 6px; font-size: .8rem; font-weight: 700; color: #3f51b5; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 12px; }
    .section-label mat-icon { font-size: 16px; height: 16px; width: 16px; }

    mat-form-field { width: 100%; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 4px; }
    .row-1 { display: grid; grid-template-columns: 1fr; margin-bottom: 16px; }
    .form-error { color: #f44336; font-size: .85rem; margin: 4px 0 12px; }
    .form-actions { display: flex; gap: 12px; margin-top: 8px; }
    .save-btn { background: #3f51b5 !important; color: #fff !important; border-radius: 8px !important; }

    @media (max-width: 600px) {
      .profile-bg { padding: 16px 12px; }
      .profile-card { padding: 20px 16px; }
      .row-2 { grid-template-columns: 1fr; }
    }
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

  initial() { return this.auth.user()?.email?.charAt(0).toUpperCase() ?? '?'; }
  avatarClass() {
    const r = this.auth.role;
    if (r === 'Admin') return 'avatar avatar-admin';
    if (r === 'Supplier') return 'avatar avatar-supplier';
    if (r === 'Customer') return 'avatar avatar-customer';
    return 'avatar avatar-default';
  }
  roleBadgeClass() {
    const r = this.auth.role;
    if (r === 'Admin') return 'role-chip role-admin';
    if (r === 'Supplier') return 'role-chip role-supplier';
    return 'role-chip role-customer';
  }

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
        this.auth.updateUser({ name: val.name, email: val.email, phoneNumber: val.phoneNumber || undefined, location: val.location || undefined });
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
