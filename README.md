# Inventory & Order Management System

A full-stack inventory and order management platform with role-based access for Admins, Suppliers, and Customers.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 22, Angular Material 22, Chart.js |
| Backend | ASP.NET Core 10, EF Core 9, C# |
| Database | MySQL 8.0 |
| Auth | JWT (Bearer tokens, 24h expiry), BCrypt |

---

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/) and npm
- [MySQL 8.0](https://dev.mysql.com/downloads/)
- Angular CLI: `npm install -g @angular/cli`

---

## Setup & Installation

### 1. Clone the repository

```bash
git clone <repo-url>
cd inventory-machine-test
```

### 2. Database

Create an empty MySQL database (the migrations handle schema creation automatically):

```sql
CREATE DATABASE InventoryDB;
```

### 3. Backend configuration

Edit `backend/appsettings.json` and update the connection string and JWT settings to match your environment:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "server=localhost;port=3306;database=InventoryDB;user=root;password=YOUR_PASSWORD"
  },
  "Jwt": {
    "Secret": "SuperSecretKeyForInventorySystem2024!@#",
    "Issuer": "InventoryAPI",
    "Audience": "InventoryClient"
  }
}
```

### 4. Install and run the backend

```bash
cd backend
dotnet restore
dotnet run
```

On first run the backend automatically:
- Applies all EF Core migrations (creates tables)
- Seeds the database with initial data (see **Seed Data** below)

Backend runs on `http://localhost:5000`.

### 5. Install and run the frontend

```bash
cd frontend
npm install
ng serve
```

Frontend runs on `http://localhost:4200`.

---

## Seed Data

On a fresh database the following accounts are created automatically:

| Role | Email | Password |
|---|---|---|
| Admin | admin@inventory.com | Admin@123 |
| Supplier | supplier@inventory.com | Supplier@123 |
| Customer | customer@inventory.com | Customer@123 |

The seeded supplier is pre-approved. Two categories (Electronics, Grocery) and three sample products are also created so the browse page is not empty.

> **Note:** If you drop and recreate the database, clear your browser's `localStorage` (or log out first) before testing — old JWT tokens reference user IDs from the previous database.

---

## How to Run Locally (Step-by-Step)

1. Start MySQL and ensure the `InventoryDB` database exists
2. `cd backend && dotnet run` — wait for "Now listening on http://localhost:5000"
3. `cd frontend && ng serve` — wait for "Application bundle generation complete"
4. Open `http://localhost:4200` in your browser
5. Log in with any of the seed credentials above, or register as a new Customer

---

## Features

### Admin
- Dashboard with KPI cards (orders today/month, profit today/month, low-stock counts), charts (profit trend, orders per day, orders by status, revenue by supplier, category distribution), and sortable tables (recent orders, top-selling products, supplier performance, low-stock, out-of-stock)
- All dashboard tables export to CSV
- User management: create/edit/approve/revoke/delete suppliers; view and toggle customer accounts
- Order management: view all orders, change order status with enforced transition rules
- Audit log: paginated, filterable log of every data change with per-field old/new values
- Notifications for every order event

### Supplier
- Product management: create, edit, delete own products (with image upload)
- Category management: create/edit/delete categories
- Stock adjustments: manual restock or removal with reason; full stock history per product
- Order management: view orders containing their products, update fulfillment status (Pending → Processing → Shipped)
- Notifications for new orders, order status changes, and low-stock alerts (below 10 units)

### Customer
- Browse product catalogue with search, category filter, and price range filter
- Cart with quantity controls; place orders
- Order history with status tracking; order detail view
- Notifications for order confirmations and status updates

---

## Architecture Notes

### Backend
- **Soft deletes** — all entities use `IsDeleted` with a global EF query filter; nothing is hard-deleted
- **Audit logging** — `AppDbContext.SaveChangesAsync` intercepts every write and records the changed entity, action type, and per-field old/new values to `AuditLogs` / `AuditLogActions` (Notifications excluded to avoid noise)
- **Stock atomicity** — all stock changes go through `StockService.AdjustAsync` inside a DB transaction; stock can never go negative
- **Order fulfillments** — one `OrderFulfillment` row is created per supplier in an order; suppliers update their own fulfillment status; when all fulfillments reach Shipped the order auto-advances to Shipped
- **Revenue = profit** — all revenue figures are calculated as `qty × (sellingPrice − costPrice)`; selling price is validated to be strictly greater than cost price at creation and update
- **Rate limiting** — built-in ASP.NET Core `AddFixedWindowLimiter`: auth endpoints (10 req/min), all other endpoints (60 req/min)
- **Caching** — built-in `IMemoryCache`: dashboard cached 5 min, categories cached 10 min with write-invalidation

### Frontend
- Angular 22 standalone components with signals (`signal<T>`, `computed()`)
- JWT stored in `localStorage`; HTTP interceptor attaches Bearer token to every request and redirects on 401
- Role-based route guards (`adminGuard`, `supplierGuard`, `authGuard`)
- Notification bell in navbar polls every 30 s and refreshes on every route change (via `NavigationEnd`)
- All datetime values are serialized as UTC (`Z`-suffixed) by a global JSON converter; Angular's `DatePipe` converts to browser local time

---

## Assumptions & Shortcuts

| Area | Decision | Reason |
|---|---|---|
| Image storage | Saved to `wwwroot/uploads/` on the local filesystem | No cloud storage configured for a take-home; in production this would be S3/Azure Blob |
| Password reset | Not implemented | No email service in scope; users can be reset by Admin via the edit user form |
| In-process cache | `IMemoryCache` (single-node) | Simpler than Redis for a local assessment; would switch to distributed cache in a real deployment |
| JWT revocation | Not implemented | Tokens expire after 24 h; logout just clears `localStorage`. A token blacklist or refresh-token flow would be added in production |
| Pagination | Server-side for products and audit logs; client-side (MatPaginator) for smaller result sets (dashboard tables, orders) | Dashboard loads are already cached; full server-side pagination everywhere would be the production approach |
| Supplier approval | Admin must explicitly approve each new supplier before they can list products | Matches the PRD requirement; the seed supplier is pre-approved for testing convenience |
| `StockAdjustment.AdjustedAt` | Separate datetime field alongside `BaseEntity.CreatedAt` | Kept for explicit stock-history semantics; both reflect `DateTime.UtcNow` at write time |

---

## Time Spent

| Area | Approx. time |
|---|---|
| Planning & database design | 1 h |
| Backend — models, EF Core, migrations, seed | 1.5 h |
| Backend — auth, services, controllers | 2.5 h |
| Frontend — routing, guards, auth flow | 1 h |
| Frontend — supplier UI (products, categories, stock) | 2 h |
| Frontend — customer UI (browse, cart, orders) | 1.5 h |
| Frontend — admin UI (dashboard, users, audit log) | 2.5 h |
| Notifications system (backend + frontend) | 2 h |
| CSV export, pagination, KPI improvements | 1 h |
| Rate limiting & caching | 0.5 h |
| Revenue/profit correction & validation | 0.5 h |
| Bug fixes, datetime UTC fix, README | 1 h |
| **Total** | **~17 h** |
