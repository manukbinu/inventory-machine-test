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

@Component({
  selector: 'app-category-manage',
  imports: [ReactiveFormsModule, MatTableModule, MatPaginatorModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatCardModule, MatTooltipModule],
  template: `
    <div style="padding:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <h2 style="margin:0">Manage Categories</h2>
        <button mat-stroked-button (click)="exportCsv()">
          <mat-icon>download</mat-icon> Export CSV
        </button>
      </div>
      <mat-card class="form-card">
        <form [formGroup]="form" (ngSubmit)="submit()" style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap">
          <mat-form-field appearance="outline" style="flex:1;min-width:160px">
            <mat-label>Name</mat-label>
            <input matInput formControlName="name">
          </mat-form-field>
          <mat-form-field appearance="outline" style="flex:2;min-width:200px">
            <mat-label>Description</mat-label>
            <input matInput formControlName="description">
          </mat-form-field>
          <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid" style="margin-top:4px">
            {{ editId() ? 'Update' : 'Add' }}
          </button>
          @if (editId()) {
            <button mat-stroked-button type="button" (click)="cancelEdit()" style="margin-top:4px">Cancel</button>
          }
        </form>
      </mat-card>

      <table mat-table [dataSource]="dataSource" class="mat-elevation-z2 full-width">

        <!-- Filter row -->
        <ng-container matColumnDef="filter-name">
          <th mat-header-cell *matHeaderCellDef>
            <input class="col-filter" placeholder="Search name…" (input)="applyFilter('name', $any($event.target).value)">
          </th>
        </ng-container>
        <ng-container matColumnDef="filter-description">
          <th mat-header-cell *matHeaderCellDef>
            <input class="col-filter" placeholder="Search description…" (input)="applyFilter('description', $any($event.target).value)">
          </th>
        </ng-container>
        <ng-container matColumnDef="filter-actions">
          <th mat-header-cell *matHeaderCellDef></th>
        </ng-container>

        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Name</th>
          <td mat-cell *matCellDef="let c">{{ c.name }}</td>
        </ng-container>
        <ng-container matColumnDef="description">
          <th mat-header-cell *matHeaderCellDef>Description</th>
          <td mat-cell *matCellDef="let c">{{ c.description }}</td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Actions</th>
          <td mat-cell *matCellDef="let c">
            <button mat-icon-button color="primary" matTooltip="Edit" (click)="startEdit(c)"><mat-icon>edit</mat-icon></button>
            <span [matTooltip]="c.activeProductCount > 0 ? c.activeProductCount + ' active product(s) — cannot delete' : 'Delete category'">
              <button mat-icon-button color="warn" [disabled]="c.activeProductCount > 0" (click)="delete(c.id)">
                <mat-icon>delete</mat-icon>
              </button>
            </span>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-header-row *matHeaderRowDef="filterCols" class="filter-row"></tr>
        <tr mat-row *matRowDef="let row; columns: cols;"></tr>
      </table>
      <mat-paginator [pageSize]="10" [pageSizeOptions]="[10,25,50]" showFirstLastButtons></mat-paginator>
    </div>
  `,
  styles: [`
    .form-card { padding:16px; margin-bottom:24px; }
    .full-width { width:100%; }
    .filter-row th { padding:4px 8px !important; }
    .col-filter { width:100%; border:1px solid #ccc; border-radius:4px; padding:4px 8px; font-size:.8rem; outline:none; box-sizing:border-box; }
    .col-filter:focus { border-color:#1976d2; }
    mat-paginator { border-top:1px solid rgba(0,0,0,.12); }
  `]
})
export class CategoryManageComponent implements OnInit, AfterViewInit {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  dataSource = new MatTableDataSource<Category>([]);
  cols = ['name', 'description', 'actions'];
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

  load() { this.api.getCategories().subscribe(cats => { this.dataSource.data = cats; }); }

  exportCsv() {
    const headers = ['Name', 'Description', 'Active Products'];
    const rows = this.dataSource.data.map(c => [
      c.name,
      c.description ?? '',
      String(c.activeProductCount)
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
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
