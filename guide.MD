# POS Template Guide

## Prerequisites

- PHP 8.2+
- Composer
- Node.js 20+
- SQLite or MySQL (configure in `.env`)

## Step-by-step setup

1) Install PHP dependencies

   `composer install`

2) Install JS dependencies

   `npm install`

3) Configure environment

   - Copy `.env.example` to `.env` if needed.
   - Set database credentials in `.env`.

4) Generate app key

   `php artisan key:generate`

5) Run migrations and seed data

   `php artisan migrate --seed`

   Seed users:
   - Admin: `admin@example.com` / `password`
   - Cashier: `cashier@example.com` / `password`

6) Start the servers

   In one terminal:

   `php artisan serve`

   In another terminal:

   `npm run dev`

7) Open the app

   - POS: `http://localhost:8000/pos`
   - Admin: `http://localhost:8000/admin`

## Daily usage

- POS search: type a name/SKU/barcode or scan a barcode
- POS shortcuts: `/` focus search, `Enter` open checkout, `Esc` close checkout, `R` reprint last receipt
- Admin: create/edit/soft-delete/restore products, receive/adjust stock, void sales, export stock movements

## Tests to run (manual)

### Setup

- [x] `php artisan migrate --seed` runs without errors
- [x] `npm run dev` and `php artisan serve` start without errors

### POS flow

- [x] Search products by name and SKU
- [ ] Scan a barcode and add to cart (barcode field)
- [x] Add items to cart and adjust quantity (+/- and remove)
- [x] Checkout with cash received >= total
- [x] Confirm sale clears cart
- [x] Receipt modal shows line items and totals
- [x] Print receipt opens the receipt print page
- [ ] `R` reprints the last receipt

### Admin flow

- [x] Admin login access to `/admin`
- [x] Create product and verify it appears in list
- [x] Edit product and verify updates
- [x] Deactivate product and verify it disappears from POS
- [x] Soft delete product and restore it from Deleted filter
- [x] Receive stock and verify on-hand increases
- [x] Adjust stock and verify on-hand changes
- [x] Stock movements list shows receive/adjust/sale/void entries
- [x] Stock movements filters (product/type/date) work
- [x] CSV export downloads a file
- [x] Void a sale and verify status changes to voided
- [x] Reprint a receipt from Admin sales list

### Permissions

- [x] Cashier cannot access `/admin`
- [x] Cashier can post sales at `/pos`

## Notes

- If you change database settings, re-run migrations.
- Soft-deleted products are hidden from POS.
- Receipt print page auto-triggers print on load.
