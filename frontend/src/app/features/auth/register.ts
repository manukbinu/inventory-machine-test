import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <div class="auth-page">
      <!-- Left Brand Panel -->
      <div class="brand-panel">
        <div class="brand-content">
          <div class="brand-logo">
            <div class="brand-logo-wrap">
              <img src="appers-logo.png" class="brand-logo-img" alt="Appers">
            </div>
          </div>
          <h1 class="brand-tagline">Join thousands of<br>businesses today.</h1>
          <p class="brand-sub">Create your free customer account and start browsing products from verified suppliers.</p>
          <div class="brand-features">
            <div class="feature-item"><mat-icon>check_circle</mat-icon><span>Browse thousands of products</span></div>
            <div class="feature-item"><mat-icon>check_circle</mat-icon><span>Track your orders in real time</span></div>
            <div class="feature-item"><mat-icon>check_circle</mat-icon><span>Secure checkout every time</span></div>
          </div>
        </div>
        <div class="brand-decoration">
          <div class="deco-circle deco-1"></div>
          <div class="deco-circle deco-2"></div>
          <div class="deco-circle deco-3"></div>
        </div>
      </div>

      <!-- Right Form Panel -->
      <div class="form-panel">
        <div class="form-container">
          <div class="mobile-logo">
            <img src="appers-logo.png" alt="Appers" style="height:32px;object-fit:contain;display:block">
          </div>

          <h2 class="form-title">Create account</h2>
          <p class="form-sub">Fill in your details to get started</p>

          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Full Name</mat-label>
              <mat-icon matPrefix>person</mat-icon>
              <input matInput formControlName="name" autocomplete="name">
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email address</mat-label>
              <mat-icon matPrefix>email</mat-icon>
              <input matInput formControlName="email" type="email" autocomplete="email">
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <mat-icon matPrefix>lock</mat-icon>
              <input matInput formControlName="password" [type]="showPassword() ? 'text' : 'password'" autocomplete="new-password">
              <button mat-icon-button matSuffix type="button" (click)="showPassword.set(!showPassword())">
                <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-hint>Minimum 6 characters</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Phone Number</mat-label>
              <mat-icon matPrefix>phone</mat-icon>
              <input matInput formControlName="phoneNumber" type="tel" autocomplete="tel">
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Address</mat-label>
              <mat-icon matPrefix>location_on</mat-icon>
              <textarea matInput formControlName="address" rows="2"></textarea>
            </mat-form-field>

            @if (error) {
              <div class="error-box">
                <mat-icon>error_outline</mat-icon>
                <span>{{ error }}</span>
              </div>
            }

            <button mat-raised-button type="submit" class="submit-btn full-width" [disabled]="form.invalid || loading()">
              @if (loading()) { <mat-icon class="spin">sync</mat-icon> Creating account… }
              @else { Create Account <mat-icon>arrow_forward</mat-icon> }
            </button>
          </form>

          <div class="form-footer">
            <span>Already have an account?</span>
            <a routerLink="/login" class="footer-link">Sign in</a>
          </div>
          <p class="copyright">© 2025 Appers Inventory. All rights reserved.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page { display: flex; min-height: calc(100vh - 64px); }

    .brand-panel {
      flex: 1;
      background: linear-gradient(145deg, #1b5e20, #2e7d32, #388e3c);
      display: flex; align-items: center; justify-content: center;
      padding: 48px 40px; position: relative; overflow: hidden;
    }
    .brand-content { position: relative; z-index: 2; max-width: 420px; }
    .brand-logo { display: flex; align-items: center; gap: 12px; margin-bottom: 36px; }
    .brand-logo-wrap { background: #fff; border-radius: 10px; padding: 8px 18px; display: inline-flex; }
    .brand-logo-img { height: 40px; object-fit: contain; display: block; }
    .brand-tagline { font-size: 2.2rem; font-weight: 800; color: #fff; line-height: 1.2; margin: 0 0 16px; }
    .brand-sub { color: rgba(255,255,255,.75); font-size: 1rem; line-height: 1.6; margin-bottom: 36px; }
    .brand-features { display: flex; flex-direction: column; gap: 14px; }
    .feature-item { display: flex; align-items: center; gap: 12px; color: rgba(255,255,255,.9); font-size: .95rem; }
    .feature-item mat-icon { color: #ffc107; font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    .brand-decoration { position: absolute; inset: 0; pointer-events: none; }
    .deco-circle { position: absolute; border-radius: 50%; background: rgba(255,255,255,.06); }
    .deco-1 { width: 350px; height: 350px; bottom: -80px; right: -80px; }
    .deco-2 { width: 200px; height: 200px; top: -40px; right: 40px; }
    .deco-3 { width: 120px; height: 120px; bottom: 120px; right: 60px; background: rgba(255,193,7,.1); }

    .form-panel {
      width: 480px; flex-shrink: 0; background: #fff;
      display: flex; align-items: center; justify-content: center; padding: 48px 40px;
      overflow-y: auto;
    }
    .form-container { width: 100%; max-width: 380px; }

    .mobile-logo { display: none; align-items: center; gap: 8px; margin-bottom: 28px; font-size: 1.4rem; font-weight: 800; color: #2e7d32; }

    .form-title { font-size: 1.8rem; font-weight: 800; color: #1a1a2e; margin: 0 0 6px; }
    .form-sub { color: #888; font-size: .9rem; margin: 0 0 24px; }
    .full-width { width: 100%; display: block; margin-bottom: 4px; }

    .error-box { display: flex; align-items: center; gap: 8px; background: #ffebee; color: #b71c1c; border-radius: 8px; padding: 10px 14px; font-size: .85rem; margin-bottom: 16px; }
    .error-box mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }

    .submit-btn {
      background: linear-gradient(135deg, #2e7d32, #1b5e20) !important;
      color: #fff !important; font-weight: 700 !important; font-size: 1rem !important;
      height: 48px !important; border-radius: 10px !important;
      display: flex !important; align-items: center !important; justify-content: center !important;
      gap: 8px !important; margin-top: 8px;
    }
    .submit-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .form-footer { display: flex; align-items: center; gap: 6px; justify-content: center; margin-top: 20px; font-size: .88rem; color: #666; }
    .footer-link { color: #3f51b5; font-weight: 600; }
    .copyright { text-align: center; margin-top: 24px; font-size: .75rem; color: #bbb; }

    @media (max-width: 900px) {
      .brand-panel { display: none; }
      .form-panel { width: 100%; padding: 40px 24px; }
      .mobile-logo { display: flex; }
    }
    @media (max-width: 480px) {
      .form-panel { padding: 32px 16px; }
      .form-title { font-size: 1.5rem; }
    }
  `]
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  error = '';
  showPassword = signal(false);
  loading = signal(false);

  form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    phoneNumber: [''],
    address: ['']
  });

  submit() {
    const { name, email, password, phoneNumber, address } = this.form.getRawValue();
    this.loading.set(true);
    this.error = '';
    this.auth.register(name, email, password, phoneNumber, address).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/browse']); },
      error: err => { this.loading.set(false); this.error = err.error || 'Registration failed.'; }
    });
  }
}
