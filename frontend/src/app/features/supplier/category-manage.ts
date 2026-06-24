import { Component, inject, OnInit, signal, ViewChild, AfterViewInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/services/api.service';
import { Category } from '../../core/models/models';

const PASTEL_COLORS = [
  { bg: '#e8eaf6', color: '#283593' }, { bg: '#e8f5e9', color: '#1b5e20' },
  { bg: '#fff3e0', color: '#e65100' }, { bg: '#fce4ec', color: '#880e4f' },
  { bg: '#e0f2f1', color: '#004d40' }, { bg: '#f3e5f5', color: '#4a148c' },
  { bg: '#e1f5fe', color: '#01579b' }, { bg: '#f9fbe7', color: '#558b2f' },
];

@Component({
  selector: 'app-category-manage',
  imports: [ReactiveFormsModule, MatTableModule, MatPaginatorModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatCardModule, MatTooltipModule],
  template: `
    <!-- Page Banner -->
    <div class="page-banner">
      <div>
        <h1><mat-icon>category</mat-icon> Manage Categories</h1>
        <p>Organise your products into categories</p>
      </div>
      <div class="banner-actions">
        <button mat-stroked-button class="export-btn" (click)="exportCsv()">
          <mat-icon>download</mat-icon> Export CSV
        </button>
      </div>
    </div>

    <div class="page-container">
      <div class="layout">
        <!-- Form Card -->
        <div class="form-side">
          <mat-card class="form-card">
            <mat-card-content>
              <form [formGroup]="form" (ngSubmit)="submit()">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Category Name</mat-label>
                  <mat-icon matPrefix>label</mat-icon>
                  <input matInput formControlName="name">
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Description</mat-label>
                  <mat-icon matPrefix>description</mat-icon>
                  <input matInput formControlName="description">
                </mat-form-field>
                <div class="form-actions">
                  <button mat-raised-button class="save-btn" type="submit" [disabled]="form.invalid">
                    <mat-icon>{{ editId() ? 'save' : 'add' }}</mat-icon>
                    {{ editId() ? 'Update' : 'Add Category' }}
                  </button>
                  @if (editId()) {
                    <button mat-stroked-button type="button" (click)="cancelEdit()">
                      <mat-icon>close</mat-icon> Cancel
                    </button>
                  }
                </div>
              </form>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Table Side -->
        <div class="table-side">
          @if (loading()) {
            @for (_ of skeletonRows; track $index) {
              <div class="skeleton skeleton-row"></div>
            }
          } @else {
            <div class="filter-bar">
              <input class="filter-input" placeholder="🔍 Search name…" (input)="applyFilter('name', $any($event.target).value)">
              <input class="filter-input" placeholder="Description…" (input)="applyFilter('description', $any($event.target).value)">
            </div>

            <div class="table-wrapper">
              <table mat-table [dataSource]="dataSource" class="cat-table">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Name</th>
                  <td mat-cell *matCellDef="let c; index as i">
                    <span class="cat-chip" [style.background]="pastel(i).bg" [style.color]="pastel(i).color">
                      {{ c.name }}
                    </span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="description">
                  <th mat-header-cell *matHeaderCellDef>Description</th>
                  <td mat-cell *matCellDef="let c" class="desc-cell">{{ c.description }}</td>
                </ng-container>
                <ng-container matColumnDef="products">
                  <th mat-header-cell *matHeaderCellDef>Products</th>
                  <td mat-cell *matCellDef="let c">
                    <span class="product-count">{{ c.activeProductCount }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>Actions</th>
                  <td mat-cell *matCellDef="let c" class="actions-cell">
                    <button mat-icon-button class="action-edit" matTooltip="Edit" (click)="startEdit(c)">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <span [matTooltip]="c.activeProductCount > 0 ? c.activeProductCount + ' active product(s) — cannot delete' : 'Delete category'">
                      <button mat-icon-button class="action-delete" [disabled]="c.activeProductCount > 0" (click)="delete(c.id)">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </span>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="cols"></tr>
                <tr mat-row *matRowDef="let row; columns: cols;"></tr>
              </table>
            </div>
            <mat-paginator [pageSize]="10" [pageSizeOptions]="[10,25,50]" showFirstLastButtons></mat-paginator>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-banner {
      background: linear-gradient(135deg, #283593, #3f51b5);
      padding: 24px 28px; display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 12px; color: #fff;
    }
    .page-banner h1 { margin: 0; font-size: 1.6rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 10px; }
    .page-banner h1 mat-icon { color: #ffc107; }
    .page-banner p { margin: 4px 0 0; font-size: .88rem; opacity: .8; color: #fff; }
    .banner-actions { display: flex; gap: 10px; }
    .export-btn { border-color: rgba(255,255,255,.5) !important; color: #fff !important; border-radius: 8px !important; }

    .page-container { max-width: 1200px; margin: 0 auto; padding: 24px; }
    .layout { display: grid; grid-template-columns: 340px 1fr; gap: 24px; align-items: start; }

    .form-card { }
    mat-card-title { display: flex; align-items: center; gap: 8px; font-size: 1rem; }
    .full-width { width: 100%; display: block; margin-bottom: 4px; }
    .form-actions { display: flex; gap: 10px; margin-top: 8px; flex-wrap: wrap; }
    .save-btn { background: #3f51b5 !important; color: #fff !important; border-radius: 8px !important; }

    .filter-bar {
      display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px;
      background: #fff; padding: 12px 14px; border-radius: 10px;
      box-shadow: 0 2px 8px rgba(63,81,181,.08);
    }
    .filter-input {
      flex: 1; min-width: 130px; border: 1.5px solid #e8eaf6; border-radius: 8px;
      padding: 7px 10px; font-size: .85rem; outline: none; font-family: inherit;
      transition: border-color .2s;
    }
    .filter-input:focus { border-color: #3f51b5; }

    .table-wrapper { overflow-x: auto; border-radius: 10px; box-shadow: 0 2px 8px rgba(63,81,181,.10); }
    .cat-table { width: 100%; background: #fff; }

    .cat-chip { font-size: .78rem; font-weight: 700; padding: 3px 12px; border-radius: 20px; }
    .desc-cell { color: #666; font-size: .88rem; }
    .product-count { background: #e8eaf6; color: #283593; font-size: .78rem; font-weight: 700; padding: 2px 10px; border-radius: 20px; }
    .actions-cell { white-space: nowrap; }
    .action-edit { color: #3f51b5 !important; }
    .action-delete { color: #f44336 !important; }

    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
    }
    @media (max-width: 600px) {
      .page-container { padding: 16px 10px; }
    }
  `]
})
export class CategoryManageComponent implements OnInit, AfterViewInit {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  loading = signal(true);
  skeletonRows = Array(6).fill(0);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  dataSource = new MatTableDataSource<Category>([]);
  cols = ['name', 'description', 'products', 'actions'];
  filterCols = this.cols.map(c => `filter-${c}`);
  editId = signal<number | null>(null);
  private filters: Record<string, string> = {};

  form = this.fb.nonNullable.group({ name: ['', Validators.required], description: [''] });

  constructor() {
    this.dataSource.filterPredicate = (row, filter) => {
      const f = JSON.parse(filter) as Record<string, string>;
      return Object.entries(f).every(([k, v]) => {
        if (!v) return true;
        const val = v.toLowerCase();
        if (k === 'name') return row.name.toLowerCase().includes(val);
        if (k === 'description') return (row.description ?? '').toLowerCase().includes(val);
        return true;
      });
    };
  }

  ngOnInit() { this.load(); }
  ngAfterViewInit() { this.dataSource.paginator = this.paginator; }

  load() {
    this.loading.set(true);
    this.api.getCategories().subscribe(cats => { this.dataSource.data = cats; this.loading.set(false); });
  }

  pastel(index: number) { return PASTEL_COLORS[index % PASTEL_COLORS.length]; }

  exportCsv() {
    const headers = ['Name', 'Description', 'Active Products'];
    const rows = this.dataSource.data.map(c => [c.name, c.description ?? '', String(c.activeProductCount)]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `categories_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  applyFilter(col: string, value: string) {
    this.filters[col] = value.trim();
    this.dataSource.filter = JSON.stringify(this.filters);
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  submit() {
    const v = this.form.getRawValue();
    const op = this.editId() ? this.api.updateCategory(this.editId()!, v) : this.api.createCategory(v);
    op.subscribe({
      next: () => { this.load(); this.form.reset(); this.editId.set(null); this.snack.open('Saved', 'OK', { duration: 1500 }); },
      error: () => this.snack.open('Error saving', 'OK', { duration: 1500 })
    });
  }

  startEdit(c: Category) { this.editId.set(c.id); this.form.patchValue({ name: c.name, description: c.description ?? '' }); }
  cancelEdit() { this.editId.set(null); this.form.reset(); }

  delete(id: number) {
    if (!confirm('Delete category?')) return;
    this.api.deleteCategory(id).subscribe({
      next: () => this.load(),
      error: err => this.snack.open(typeof err.error === 'string' ? err.error : 'Cannot delete category.', 'OK', { duration: 5000 })
    });
  }
}
