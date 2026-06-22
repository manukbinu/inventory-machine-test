import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <mat-card-header><mat-card-title>Register (Customer)</mat-card-title></mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Full Name</mat-label>
              <input matInput formControlName="name">
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email">
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput formControlName="password" type="password">
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Phone Number</mat-label>
              <input matInput formControlName="phoneNumber">
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Address</mat-label>
              <textarea matInput formControlName="address" rows="2"></textarea>
            </mat-form-field>
            @if (error) { <p class="error">{{ error }}</p> }
            <button mat-raised-button color="primary" type="submit" class="full-width" [disabled]="form.invalid">
              Register
            </button>
          </form>
        </mat-card-content>
        <mat-card-actions>
          <p>Already have an account? <a routerLink="/login">Login</a></p>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-container { display:flex; justify-content:center; align-items:center; min-height:80vh; }
    .auth-card { width:420px; padding:16px; }
    .full-width { width:100%; margin-bottom:12px; display:block; }
    .error { color:red; font-size:0.85rem; }
  `]
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  error = '';

  form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    phoneNumber: [''],
    address: ['']
  });

  submit() {
    const { name, email, password, phoneNumber, address } = this.form.getRawValue();
    this.auth.register(name, email, password, phoneNumber, address).subscribe({
      next: () => this.router.navigate(['/browse']),
      error: err => { this.error = err.error || 'Registration failed.'; }
    });
  }
}
