import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn) return true;
  return router.createUrlTree(['/login']);
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.role === 'Admin') return true;
  return router.createUrlTree(['/unauthorized']);
};

export const supplierGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.role === 'Supplier') return true;
  return router.createUrlTree(['/unauthorized']);
};

export const adminOrSupplierGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.role === 'Admin' || auth.role === 'Supplier') return true;
  return router.createUrlTree(['/unauthorized']);
};

export const customerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.role === 'Customer') return true;
  return router.createUrlTree(['/unauthorized']);
};
