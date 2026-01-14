# POS Template (Laravel + React)

A clean, fast point-of-sale template for single-terminal use. It includes a cashier POS screen, an admin back office, inventory tracking, sales logging, and printable receipts.

## Features

- POS screen with search, category filters, cart, and checkout
- Server-authoritative sales posting with stock updates
- Receipt preview + print page
- Admin tools: product catalog, stock receive/adjust, sales voids
- Stock movement audit feed with filters + CSV export
- Soft delete + restore for products

## Tech Stack

- Laravel 11
- Inertia + React (Vite)
- Tailwind CSS
- SQLite/MySQL

## Quick Start

1) Install dependencies

   `composer install`
   `npm install`

2) Configure `.env`

   - Set database credentials
   - Generate app key: `php artisan key:generate`

3) Migrate + seed

   `php artisan migrate --seed`

4) Run the app

   `php artisan serve`
   `npm run dev`

5) Open

   - POS: `http://localhost:8000/pos`
   - Admin: `http://localhost:8000/admin`

## Default Users

- Admin: `admin@example.com` / `password`
- Cashier: `cashier@example.com` / `password`

## Cashier Flow (POS)

1) Open `/pos` and log in as cashier.
2) Search by name, SKU, or barcode (scanner input + Enter).
3) Add items to cart and adjust quantities.
4) Open checkout and enter cash received.
5) Confirm sale to post transaction and update stock.
6) Receipt opens in print view; use `R` to reprint the last receipt.

## Admin Flow (Back Office)

1) Open `/admin` and log in as admin.
2) Create or edit products (SKU, price, barcode, category).
3) Receive stock or adjust stock for counts/spoilage.
4) Review recent sales and void if needed.
5) Review stock movement feed, filter, and export CSV.
6) Soft delete products and restore from Deleted filter.

## Engineering Specs

### Architecture

- Backend: Laravel routes + controllers with session auth.
- Frontend: Inertia React pages for POS and Admin.
- State: API-backed lists with lightweight client state for cart.

### Key Routes (Web)

- `/pos` cashier screen
- `/admin` admin screen (admin-only)
- `/receipt/{sale}` print view

### API Endpoints (session-auth)

- `GET /api/categories`
- `GET /api/products?search=&category_id=&status=`  
  status: `active|inactive|deleted|all`
- `GET /api/products/by-barcode/{barcode}`
- `POST /api/products`
- `PUT /api/products/{product}`
- `DELETE /api/products/{product}` (soft delete)
- `POST /api/products/{product}/restore`
- `POST /api/inventory/receive`
- `POST /api/inventory/adjust`
- `GET /api/sales`
- `POST /api/sales`
- `POST /api/sales/{sale}/void`
- `GET /api/reports/summary`
- `GET /api/stock-movements`
- `GET /api/stock-movements/export` (CSV)

### Data Model (core)

- `users` (role)
- `categories`
- `products` (sku, barcode, price, cost, uom, is_active, soft delete)
- `inventory_stocks` (qty_on_hand)
- `stock_movements` (type, qty, ref, created_by, notes)
- `sales` (receipt_no, totals, payment, status, void_reason)
- `sale_items` (qty, price, line_total, cost_snapshot)

### Business Rules

- Inventory changes only via stock movements.
- Sales are posted in a DB transaction.
- Stock is validated before sale posting.
- Soft-deleted products are hidden from POS.

### Security

- Admin access enforced via role middleware and server checks.
- CSRF-protected API calls via session tokens.

### Receipt Printing

- Print page auto-triggers `window.print()` on load.
- POS and Admin can reprint the last receipt.

## Notes

- Admin is protected by role middleware; cashier cannot access `/admin`.
- Receipts open in a print-friendly page and auto-print on load.

## More

See `guide.MD` for a full setup and test checklist.
