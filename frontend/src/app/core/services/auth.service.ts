import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthResponse } from '../models/models';
import { tap } from 'rxjs';

const API = 'http://localhost:5000/api';
const TOKEN_KEY = 'inv_token';
const USER_KEY = 'inv_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = signal<AuthResponse | null>(this.loadUser());

  readonly user = this._user.asReadonly();

  constructor(private http: HttpClient, private router: Router) {}

  get token() { return localStorage.getItem(TOKEN_KEY); }
  get role() { return this._user()?.role ?? null; }
  get isApproved() {
    const val = this._user()?.isApproved;
    // undefined means old session (pre-isApproved JWT) — default true; backend enforces the real check
    return val === undefined ? true : val;
  }
  get displayName() { return this._user()?.name ?? this._user()?.email ?? ''; }
  get isLoggedIn() { return !!this._user(); }

  register(name: string, email: string, password: string, phoneNumber?: string, address?: string) {
    return this.http.post<AuthResponse>(`${API}/auth/register`, { name, email, password, phoneNumber, address })
      .pipe(tap(res => this.setSession(res)));
  }

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${API}/auth/login`, { email, password })
      .pipe(tap(res => this.setSession(res)));
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  updateUser(patch: Partial<AuthResponse>) {
    const current = this._user();
    if (!current) return;
    const updated = { ...current, ...patch };
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    this._user.set(updated);
  }

  private setSession(res: AuthResponse) {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res));
    this._user.set(res);
  }

  private loadUser(): AuthResponse | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
