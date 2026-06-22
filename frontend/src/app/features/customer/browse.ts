import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Category, ProductListItem } from '../../core/models/models';

interface CartItem { product: ProductListItem; quantity: number; }

@Component({
  selector: 'app-browse',
  imports: [
    ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatChipsModule, MatPaginatorModule,
    MatBadgeModule, MatIconModule
  ],
  template: `
    <div class="page">
      <div class="filter-bar">
        <mat-form-field appearance="outline">
          <mat-label>Search</mat-label>
          <input matInput [formControl]="searchCtrl" (input)="load()">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Category</mat-label>
          <mat-select [formControl]="categoryCtrl" (selectionChange)="load()">
            <mat-option [value]="null">All</mat-option>
            @for (c of categories(); track c.id) {
              <mat-option [value]="c.id">{{ c.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Min Price</mat-label>
          <input matInput [formControl]="minPriceCtrl" type="number" (input)="load()">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Max Price</mat-label>
          <input matInput [formControl]="maxPriceCtrl" type="number" (input)="load()">
        </mat-form-field>

        @if (auth.isLoggedIn && auth.role === 'Customer') {
          <button mat-raised-button color="accent" (click)="checkout()"
            [matBadge]="cart().length" matBadgeColor="warn" [disabled]="cart().length === 0">
            🛒 Place Order
          </button>
        }
      </div>

      <div class="products-grid">
        @for (p of products(); track p.id) {
          <mat-card class="product-card">
            @if (p.imageUrl) {
              <img mat-card-image [src]="'http://localhost:5000' + p.imageUrl" alt="product">
            }
            <mat-card-header>
              <mat-card-title>{{ p.name }}</mat-card-title>
              <mat-card-subtitle>{{ p.categoryName }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p class="price">₹{{ p.sellingPrice }} / {{ p.unit }}</p>
              <mat-chip [color]="p.currentStock === 0 ? 'warn' : (p.currentStock < 10 ? 'accent' : 'primary')" highlighted>
                {{ p.currentStock === 0 ? 'Out of stock' : p.currentStock + ' in stock' }}
              </mat-chip>
            </mat-card-content>
            @if (auth.isLoggedIn && auth.role === 'Customer' && p.currentStock > 0) {
              <mat-card-actions>
                <button mat-stroked-button color="primary" (click)="addToCart(p)">Add to Cart</button>
              </mat-card-actions>
            }
          </mat-card>
        }
        @if (products().length === 0) {
          <p>No products found.</p>
        }
      </div>

      <mat-paginator [length]="total()" [pageSize]="pageSize" [pageIndex]="page()-1"
        (page)="onPage($event)">
      </mat-paginator>

      @if (cart().length > 0) {
        <div class="cart-panel mat-elevation-z6">
          <div class="cart-header">
            <span style="font-weight:600;font-size:1rem">🛒 Cart ({{ cart().length }})</span>
          </div>
          <div class="cart-body">
            @for (item of cart(); track item.product.id) {
              <div class="cart-item">
                <span class="cart-name">{{ item.product.name }}</span>
                <div class="cart-controls">
                  <button mat-icon-button (click)="changeQty(item, -1)"><mat-icon>remove</mat-icon></button>
                  <strong>{{ item.quantity }}</strong>
                  <button mat-icon-button (click)="changeQty(item, 1)"><mat-icon>add</mat-icon></button>
                  <button mat-icon-button color="warn" (click)="removeFromCart(item)"><mat-icon>close</mat-icon></button>
                </div>
              </div>
            }
          </div>
          <div class="cart-footer">
            <span style="font-weight:600">Total: ₹{{ cartTotal() }}</span>
            <button mat-raised-button color="primary" (click)="checkout()">Place Order</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { padding:16px; }
    .filter-bar { display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin-bottom:16px; }
    .products-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:16px; margin-bottom:16px; }
    .product-card img { height:160px; object-fit:cover; }
    .price { font-size:1.1rem; font-weight:700; color:#1976d2; }
    .cart-panel { position:fixed; right:16px; bottom:16px; background:#fff; border-radius:8px; min-width:280px; max-width:340px; max-height:420px; display:flex; flex-direction:column; z-index:100; }
    .cart-header { padding:12px 16px; border-bottom:1px solid #e0e0e0; flex-shrink:0; }
    .cart-body { overflow-y:auto; flex:1; padding:4px 16px; }
    .cart-footer { padding:12px 16px; border-top:1px solid #e0e0e0; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; }
    .cart-item { display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px solid #f5f5f5; }
    .cart-name { flex:1; font-size:0.9rem; margin-right:8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .cart-controls { display:flex; align-items:center; gap:2px; flex-shrink:0; }
  `]
})
export class BrowseComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  products = signal<ProductListItem[]>([]);
  categories = signal<Category[]>([]);
  cart = signal<CartItem[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = 12;

  searchCtrl = this.fb.control('');
  categoryCtrl = this.fb.control<number | null>(null);
  minPriceCtrl = this.fb.control<number | null>(null);
  maxPriceCtrl = this.fb.control<number | null>(null);

  ngOnInit() {
    this.api.getCategories().subscribe(cats => this.categories.set(cats));
    this.load();
  }

  load() {
    this.api.getProducts({
      search: this.searchCtrl.value || undefined,
      categoryId: this.categoryCtrl.value || undefined,
      minPrice: this.minPriceCtrl.value || undefined,
      maxPrice: this.maxPriceCtrl.value || undefined,
      page: this.page(),
      pageSize: this.pageSize
    }).subscribe(res => { this.products.set(res.items); this.total.set(res.total); });
  }

  onPage(e: PageEvent) { this.page.set(e.pageIndex + 1); this.load(); }

  addToCart(p: ProductListItem) {
    const existing = this.cart().find(c => c.product.id === p.id);
    if (existing) {
      if (existing.quantity >= p.currentStock) { this.snack.open('Max stock reached', 'OK', { duration: 1500 }); return; }
      this.cart.update(c => c.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      this.cart.update(c => [...c, { product: p, quantity: 1 }]);
    }
    this.snack.open('Added to cart', '', { duration: 800 });
  }

  changeQty(item: CartItem, delta: number) {
    const newQty = item.quantity + delta;
    if (newQty <= 0) { this.removeFromCart(item); return; }
    if (newQty > item.product.currentStock) return;
    this.cart.update(c => c.map(i => i.product.id === item.product.id ? { ...i, quantity: newQty } : i));
  }

  removeFromCart(item: CartItem) { this.cart.update(c => c.filter(i => i.product.id !== item.product.id)); }

  cartTotal() { return this.cart().reduce((s, i) => s + i.product.sellingPrice * i.quantity, 0).toFixed(2); }

  checkout() {
    if (!this.auth.isLoggedIn) { this.router.navigate(['/login']); return; }
    const items = this.cart().map(i => ({ productId: i.product.id, quantity: i.quantity }));
    this.api.placeOrder(items).subscribe({
      next: res => {
        this.snack.open('Order placed successfully!', 'View Orders', { duration: 4000 }).onAction().subscribe(() => this.router.navigate(['/orders']));
        this.cart.set([]);
      },
      error: err => this.snack.open(err.error || 'Order failed', 'OK', { duration: 3000 })
    });
  }
}
