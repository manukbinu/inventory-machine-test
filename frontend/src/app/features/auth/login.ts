import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <mat-card-header><mat-card-title>Login</mat-card-title></mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email">
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput formControlName="password" type="password">
            </mat-form-field>
            @if (error) { <p class="error">{{ error }}</p> }
            <button mat-raised-button color="primary" type="submit" class="full-width" [disabled]="form.invalid">
              Login
            </button>
          </form>
        </mat-card-content>
        <mat-card-actions>
          <p>Don't have an account? <a routerLink="/register">Register as Customer</a></p>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-container { display:flex; justify-content:center; align-items:center; min-height:80vh; }
    .auth-card { width:400px; padding:16px; }
    .full-width { width:100%; margin-bottom:12px; display:block; }
    .error { color:red; font-size:0.85rem; margin-bottom:8px; }
  `]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  error = '';

  form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  submit() {
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: res => {
        const routes: Record<string, string> = { Admin: '/admin/dashboard', Supplier: '/supplier/products', Customer: '/browse' };
        this.router.navigate([routes[res.role] ?? '/']);
      },
      error: err => { this.error = err.error || 'Login failed.'; }
    });
  }
}
