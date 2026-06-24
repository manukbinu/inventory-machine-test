import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Category, ProductListItem } from '../../core/models/models';

interface CartItem { product: ProductListItem; quantity: number; }

@Component({
  selector: 'app-browse',
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatChipsModule, MatPaginatorModule, MatIconModule
  ],
  template: `
    <!-- Hero Filter Bar -->
    <div class="hero-bar">
      <div class="hero-content">
        <h1 class="hero-title">
          <mat-icon>storefront</mat-icon>
          Browse Products
        </h1>
        <p class="hero-sub">Discover fresh products from verified suppliers</p>
        <div class="filter-row">
          <mat-form-field appearance="outline" class="filter-field search-field">
            <mat-icon matPrefix>search</mat-icon>
            <mat-label>Search products…</mat-label>
            <input matInput [formControl]="searchCtrl" (input)="load()">
          </mat-form-field>
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Category</mat-label>
            <mat-select [formControl]="categoryCtrl" (selectionChange)="load()">
              <mat-option [value]="null">All categories</mat-option>
              @for (c of categories(); track c.id) {
                <mat-option [value]="c.id">{{ c.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="filter-field price-field">
            <mat-icon matPrefix>currency_rupee</mat-icon>
            <mat-label>Min Price</mat-label>
            <input matInput [formControl]="minPriceCtrl" type="number" (input)="load()">
          </mat-form-field>
          <mat-form-field appearance="outline" class="filter-field price-field">
            <mat-icon matPrefix>currency_rupee</mat-icon>
            <mat-label>Max Price</mat-label>
            <input matInput [formControl]="maxPriceCtrl" type="number" (input)="load()">
          </mat-form-field>
          @if (auth.isLoggedIn && auth.role === 'Customer') {
            <button mat-raised-button class="cart-fab-btn" (click)="toggleCart()">
              <mat-icon>shopping_cart</mat-icon>
              @if (cart().length > 0) { <span class="cart-count-badge">{{ cart().length }}</span> }
              Cart
            </button>
          }
        </div>
      </div>
    </div>

    <div class="browse-body">
      <!-- Skeleton Loading -->
      @if (loading()) {
        <div class="products-grid">
          @for (_ of skeletonItems; track $index) {
            <div class="skeleton-card-wrap">
              <div class="skeleton skeleton-card"></div>
              <div style="padding:14px">
                <div class="skeleton skeleton-text-lg" style="width:70%"></div>
                <div class="skeleton skeleton-text-sm" style="width:45%"></div>
                <div class="skeleton skeleton-text-sm" style="width:55%;margin-top:8px"></div>
              </div>
            </div>
          }
        </div>
      } @else if (products().length === 0) {
        <div class="empty-state">
          <mat-icon>search_off</mat-icon>
          <h3>No products found</h3>
          <p>Try adjusting your search or filters</p>
          <button mat-raised-button color="primary" (click)="clearFilters()">Clear Filters</button>
        </div>
      } @else {
        <div class="products-grid">
          @for (p of products(); track p.id) {
            <div class="product-card">
              <div class="card-image-wrap">
                @if (p.imageUrl) {
                  <img [src]="'http://localhost:5000' + p.imageUrl" alt="{{ p.name }}" class="card-img">
                } @else {
                  <div class="card-img-placeholder"><mat-icon>image_not_supported</mat-icon></div>
                }
                <div class="card-category-badge">{{ p.categoryName }}</div>
                <div class="card-img-overlay"></div>
              </div>
              <div class="card-body">
                <h3 class="card-title">{{ p.name }}</h3>
                <div class="card-price">₹{{ p.sellingPrice }} <span class="card-unit">/ {{ p.unit }}</span></div>
                <div class="card-stock">
                  @if (p.currentStock === 0) {
                    <span class="stock-badge stock-out">Out of stock</span>
                  } @else if (p.currentStock < 10) {
                    <span class="stock-badge stock-low">Only {{ p.currentStock }} left</span>
                  } @else {
                    <span class="stock-badge stock-ok">{{ p.currentStock }} in stock</span>
                  }
                </div>
                @if (auth.isLoggedIn && auth.role === 'Customer' && p.currentStock > 0) {
                  <button mat-raised-button class="add-cart-btn" (click)="addToCart(p)">
                    <mat-icon>add_shopping_cart</mat-icon> Add to Cart
                  </button>
                }
              </div>
            </div>
          }
        </div>

        <mat-paginator [length]="total()" [pageSize]="pageSize" [pageIndex]="page()-1"
          (page)="onPage($event)" class="paginator">
        </mat-paginator>
      }
    </div>

    <!-- Floating Cart Panel -->
    @if (cartOpen()) {
      <div class="cart-panel mat-elevation-z8" id="cart-panel">
        <div class="cart-header">
          <mat-icon>shopping_cart</mat-icon>
          <span>Cart <span class="cart-count">({{ cart().length }})</span></span>
          <span class="cart-spacer"></span>
          <button mat-icon-button class="cart-close-btn" (click)="cartOpen.set(false)">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        @if (cart().length === 0) {
          <div class="cart-empty-state">
            <mat-icon>remove_shopping_cart</mat-icon>
            <p>Your cart is empty</p>
            <span>Add items from the store to get started</span>
          </div>
        }
        <div class="cart-body">
          @for (item of cart(); track item.product.id) {
            <div class="cart-item">
              <div class="cart-item-name">{{ item.product.name }}</div>
              <div class="cart-item-price">₹{{ (item.product.sellingPrice * item.quantity).toFixed(0) }}</div>
              <div class="cart-controls">
                <button mat-icon-button class="qty-btn" (click)="changeQty(item, -1)"><mat-icon>remove</mat-icon></button>
                <span class="qty-val">{{ item.quantity }}</span>
                <button mat-icon-button class="qty-btn" (click)="changeQty(item, 1)"><mat-icon>add</mat-icon></button>
                <button mat-icon-button class="qty-btn remove-btn" (click)="removeFromCart(item)"><mat-icon>close</mat-icon></button>
              </div>
            </div>
          }
        </div>
        <div class="cart-footer">
          <div class="cart-total">
            <span class="total-label">Total</span>
            <span class="total-val">₹{{ cartTotal() }}</span>
          </div>
          <button mat-raised-button class="checkout-btn" (click)="checkout()">
            <mat-icon>bolt</mat-icon> Place Order
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    /* ── Hero Filter Bar ── */
    .hero-bar {
      background: linear-gradient(135deg, #1a237e, #283593, #3f51b5);
      padding: 32px 28px 28px;
    }
    .hero-content { max-width: 1400px; margin: 0 auto; }
    .hero-title {
      font-size: 1.9rem; font-weight: 800; color: #fff; margin: 0 0 6px;
      display: flex; align-items: center; gap: 10px;
    }
    .hero-title mat-icon { font-size: 2rem; width: 2rem; height: 2rem; color: #ffc107; }
    .hero-sub { color: rgba(255,255,255,.75); margin: 0 0 20px; font-size: .95rem; }
    .filter-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
    .filter-field { background: rgba(255,255,255,.12); border-radius: 10px; }
    .filter-field ::ng-deep .mat-mdc-text-field-wrapper { background: rgba(255,255,255,.15) !important; border-radius: 10px !important; }
    .filter-field ::ng-deep .mat-mdc-form-field-label, .filter-field ::ng-deep label { color: rgba(255,255,255,.8) !important; }
    .filter-field ::ng-deep input { color: #fff !important; }
    .filter-field ::ng-deep mat-icon { color: rgba(255,255,255,.7) !important; }
    .search-field { flex: 2; min-width: 200px; }
    .price-field { width: 140px; }
    .cart-fab-btn {
      background: #ffc107 !important; color: #1a1a2e !important; font-weight: 700 !important;
      border-radius: 10px !important; height: 48px !important; position: relative;
      padding: 0 20px !important; flex-shrink: 0;
    }
    .cart-count-badge {
      position: absolute; top: -8px; right: -8px;
      background: #f44336; color: #fff; border-radius: 50%;
      width: 20px; height: 20px; font-size: .7rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }

    /* ── Browse Body ── */
    .browse-body { max-width: 1400px; margin: 0 auto; padding: 24px; }

    /* ── Product Grid ── */
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }
    .skeleton-card-wrap {
      background: #fff; border-radius: 16px; overflow: hidden;
      box-shadow: 0 2px 8px rgba(63,81,181,.10);
    }

    /* ── Product Card ── */
    .product-card {
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(63,81,181,.10);
      transition: transform 0.25s ease, box-shadow 0.25s ease;
      display: flex;
      flex-direction: column;
    }
    .product-card:hover {
      transform: translateY(-6px);
      box-shadow: 0 12px 32px rgba(63,81,181,.22);
    }
    .card-image-wrap { position: relative; height: 200px; overflow: hidden; background: #e8eaf6; flex-shrink: 0; }
    .card-img { width: 100%; height: 100%; object-fit: cover; transition: transform .4s ease; }
    .product-card:hover .card-img { transform: scale(1.04); }
    .card-img-placeholder {
      width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
    }
    .card-img-placeholder mat-icon { font-size: 3rem; width: 3rem; height: 3rem; opacity: .25; }
    .card-img-overlay {
      position: absolute; bottom: 0; left: 0; right: 0; height: 60px;
      background: linear-gradient(to top, rgba(0,0,0,.35), transparent);
    }
    .card-category-badge {
      position: absolute; top: 10px; left: 10px;
      background: rgba(255,255,255,.92); color: #3f51b5;
      font-size: .72rem; font-weight: 700; padding: 3px 10px;
      border-radius: 20px; letter-spacing: .3px;
    }

    .card-body { padding: 16px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
    .card-title { font-size: 1rem; font-weight: 700; color: #1a1a2e; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .card-price { font-size: 1.25rem; font-weight: 800; color: #3f51b5; }
    .card-unit { font-size: .78rem; font-weight: 400; color: #888; }

    .stock-badge { font-size: .75rem; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
    .stock-ok  { background: #e8f5e9; color: #2e7d32; }
    .stock-low { background: #fff3e0; color: #e65100; }
    .stock-out { background: #ffebee; color: #b71c1c; }

    .add-cart-btn {
      margin-top: auto !important;
      background: #3f51b5 !important; color: #fff !important;
      font-weight: 700 !important; border-radius: 8px !important;
      width: 100% !important; display: flex !important; align-items: center !important;
      justify-content: center !important; gap: 6px !important;
    }

    .paginator { background: transparent !important; margin-top: 8px; }

    /* ── Cart Panel ── */
    .cart-panel {
      position: fixed; right: 20px; bottom: 20px;
      background: #fff; border-radius: 16px;
      width: 340px; max-height: 460px;
      display: flex; flex-direction: column;
      z-index: 200; overflow: hidden;
      animation: slideInRight .3s ease;
    }
    @keyframes slideInRight {
      from { transform: translateX(20px); opacity: 0; }
      to   { transform: translateX(0); opacity: 1; }
    }
    .cart-header {
      background: linear-gradient(135deg, #283593, #3f51b5);
      padding: 14px 16px;
      display: flex; align-items: center; gap: 10px;
      font-weight: 700; font-size: 1rem; color: #fff;
      flex-shrink: 0;
    }
    .cart-header mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .cart-count { font-weight: 400; font-size: .88rem; opacity: .85; }
    .cart-spacer { flex: 1; }
    .cart-close-btn { color: rgba(255,255,255,.8) !important; width: 32px !important; height: 32px !important; line-height: 32px !important; }
    .cart-close-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .cart-empty-state {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 32px 20px; gap: 8px; text-align: center;
    }
    .cart-empty-state mat-icon { font-size: 52px; width: 52px; height: 52px; color: #c5cae9; }
    .cart-empty-state p { margin: 0; font-size: 1rem; font-weight: 700; color: #3f51b5; }
    .cart-empty-state span { font-size: .8rem; color: #888; }
    .cart-body { flex: 1; overflow-y: auto; padding: 8px 0; }
    .cart-item {
      padding: 8px 16px; display: flex; flex-wrap: wrap; gap: 4px;
      align-items: center; border-bottom: 1px solid #f0f2f8;
    }
    .cart-item-name { flex: 1; font-size: .88rem; font-weight: 600; color: #1a1a2e; min-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cart-item-price { font-size: .88rem; font-weight: 700; color: #3f51b5; margin-left: auto; }
    .cart-controls { display: flex; align-items: center; gap: 2px; width: 100%; }
    .qty-btn { width: 28px !important; height: 28px !important; line-height: 28px !important; }
    .qty-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .qty-val { font-weight: 700; font-size: .9rem; min-width: 24px; text-align: center; }
    .remove-btn { color: #f44336 !important; margin-left: auto; }

    .cart-footer {
      padding: 14px 16px; border-top: 1px solid #e8eaf6; flex-shrink: 0;
    }
    .cart-total { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
    .total-label { font-size: .85rem; color: #888; }
    .total-val { font-size: 1.3rem; font-weight: 800; color: #1a1a2e; }
    .checkout-btn {
      width: 100% !important; background: #ffc107 !important; color: #1a1a2e !important;
      font-weight: 800 !important; border-radius: 10px !important; height: 44px !important;
      font-size: .95rem !important; display: flex !important; align-items: center !important;
      justify-content: center !important; gap: 6px !important;
    }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .hero-bar { padding: 24px 16px 20px; }
      .hero-title { font-size: 1.4rem; }
      .browse-body { padding: 16px 12px; }
      .products-grid { grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 14px; }
      .card-image-wrap { height: 150px; }
      .cart-panel { right: 0; bottom: 0; left: 0; width: 100%; border-radius: 16px 16px 0 0; max-height: 70vh; }
      .price-field { display: none; }
    }
    @media (max-width: 480px) {
      .products-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
      .search-field { min-width: 100%; }
    }
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
  cartOpen = signal(false);
  total = signal(0);
  page = signal(1);
  loading = signal(true);
  pageSize = 12;
  skeletonItems = Array(12).fill(0);

  searchCtrl = this.fb.control('');
  categoryCtrl = this.fb.control<number | null>(null);
  minPriceCtrl = this.fb.control<number | null>(null);
  maxPriceCtrl = this.fb.control<number | null>(null);

  ngOnInit() {
    this.api.getCategories().subscribe(cats => this.categories.set(cats));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.getProducts({
      search: this.searchCtrl.value || undefined,
      categoryId: this.categoryCtrl.value || undefined,
      minPrice: this.minPriceCtrl.value || undefined,
      maxPrice: this.maxPriceCtrl.value || undefined,
      page: this.page(),
      pageSize: this.pageSize
    }).subscribe(res => {
      this.products.set(res.items);
      this.total.set(res.total);
      this.loading.set(false);
    });
  }

  clearFilters() {
    this.searchCtrl.setValue('');
    this.categoryCtrl.setValue(null);
    this.minPriceCtrl.setValue(null);
    this.maxPriceCtrl.setValue(null);
    this.load();
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

  toggleCart() { this.cartOpen.set(!this.cartOpen()); }

  checkout() {
    if (!this.auth.isLoggedIn) { this.router.navigate(['/login']); return; }
    const items = this.cart().map(i => ({ productId: i.product.id, quantity: i.quantity }));
    this.api.placeOrder(items).subscribe({
      next: () => {
        this.snack.open('Order placed successfully!', 'View Orders', { duration: 4000 }).onAction().subscribe(() => this.router.navigate(['/orders']));
        this.cart.set([]);
      },
      error: err => this.snack.open(err.error || 'Order failed', 'OK', { duration: 3000 })
    });
  }
}
