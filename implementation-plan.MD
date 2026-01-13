## POS Template Plan (1 location, cashier + admin, receipt printer, barcode scanner optional)

### Current Status (as of now)

Implemented

* POS screen: search, category filters, product grid, cart, checkout modal
* Admin screen: product list, create product, receive stock, adjust stock
* API: categories, products (search + barcode), inventory receive/adjust, sales posting, reports summary
* Inventory and sales updates are server-authoritative with stock movement tracking
* Receipt numbers generated per day (YYYYMMDD-####)
* PHP currency formatting in UI
* Receipt print page (auto print on load)
* Admin sales list + void controls + stock movement feed
* Product edit + activate/deactivate
* Stock movement filters (product/type/date)
* Admin receipt reprint
* Void reasons stored and displayed
* Product soft delete + restore
* Stock movement pagination + CSV export
* POS reprint shortcut (R)

Not yet implemented

* API auth via Sanctum (using session-auth for now)

---

### Phase 0 - Scope + Decisions (All day)

* Target: single terminal, single location, cash-only (v1), receipt printing
* Inventory: simple on-hand qty (no batches/expiry in v1)
* Products: supports barcode, but barcode not required for every item (v1)
* Roles

  * admin: manage products, receive stock, adjust stock, view reports
  * cashier: sell + print receipts + view own shift totals (optional)

Deliverables

* Written v1 scope checklist
* DB schema draft
* Receipt layout draft

---

### Phase 1 - Project Setup (All day)

* Laravel 11 + React (Vite) + Tailwind (done)
* API auth: using session-authenticated routes for now (Sanctum optional later)
* Basic layout for:

  * /pos (cashier screen)
  * /admin (product + inventory tools)
* Create seed users: 1 admin, 1 cashier (done)

Deliverables

* Login flow working (existing)
* POS + Admin screens wired (done)

---

### Phase 2 - Database + Core Models (1 day)

Create migrations + models:

* users (role column)
* categories
* products

  * sku, name, barcode (nullable), price, cost, uom, is_active, category_id
* inventory_stocks

  * product_id, qty_on_hand (decimal)
* stock_movements

  * product_id, type (sale|receive|adjust|return|void)
  * qty (decimal, negative for out)
  * unit_cost (nullable)
  * ref_type, ref_id
  * created_by, notes
* sales

  * receipt_no, subtotal, total
  * payment_type (cash)
  * cash_received, change
  * status (posted|voided)
  * created_by
* sale_items

  * sale_id, product_id, qty, price, cost_snapshot, line_total

Rules

* Always create inventory changes via stock_movements
* Keep inventory_stocks.qty_on_hand updated for speed

Deliverables

* Migrations done (done)
* Model relationships + seeds (done)
* Receipt number generator (daily sequence) implemented (done)

---

### Phase 3 - Product Management (Admin) (1 day)

Admin UI

* CRUD product (create done, update/delete pending)
* Optional quick import (CSV later)
* Category management (optional in v1, but nice)

API

* GET /api/products?search=&category_id=
* GET /api/products/by-barcode/{barcode}
* POST/PUT /api/products (admin)

Deliverables

* Admin can create products (done)
* Search works fast (index on name, barcode, sku)

---

### Phase 4 - Inventory: Receive + Adjust (Admin) (1 day)

Receive Stock

* Form: product, qty, unit_cost (optional), notes
* Creates:

  * stock_movements(type=receive, qty=+x)
  * increments inventory_stocks.qty_on_hand

Adjust Stock

* Form: product, qty (+/-), reason (spoilage/count), notes
* Creates:

  * stock_movements(type=adjust, qty=+/-x)
  * updates inventory_stocks

Deliverables

* Receive/adjust forms wired to stock movements (done)
* Stock movement list page (basic audit) done

---

### Phase 5 - POS UI v1 (Click-to-Add + Fallback Scan/Input) (1-2 days)

UI layout (React)

* Left: Product browser

  * Search box (name/SKU/barcode)
  * Category filter pills
  * Product grid/list
* Right: Cart

  * line items with qty controls (+/-), editable qty (decimal allowed)
  * remove item
  * totals
* Footer / Sticky: Checkout button

Add-to-cart sources (all feed the same function)

* Click product card -> addToCart(productId)
* Scan barcode (scanner types + Enter) -> lookupProduct(barcode) -> addToCart
* Manual input: type barcode/name, select result -> addToCart

Deliverables

* Fast cart flow (done)
* Keyboard shortcuts (optional but helpful)

  * / focuses search
  * Enter opens checkout
  * Esc closes modal

---

### Phase 6 - Checkout + Post Sale (Server-authoritative) (1 day)

Checkout modal

* Shows total
* Cash received input
* Change computed client-side (but validated server-side)

API

* POST /api/sales

  * payload: items {product_id, qty} + payment details
* Server behavior (important):

  * Validate product exists + active
  * Validate qty > 0
  * Validate stock is sufficient
  * DB transaction:

    * create sales
    * create sale_items
    * create stock_movements(type=sale, qty=-x)
    * decrement inventory_stocks
  * Return receipt payload

Deliverables

* Sale posting is atomic + consistent (done)
* Cart clears only after success (done)

---

### Phase 7 - Receipt Printing (Browser First, Then ESC/POS) (All day)

v1 printing option A (fastest): Browser print

* Create a receipt HTML template route/component (done)
* Open print dialog after sale (done)
* Good enough for practice, but may be slower

v1.1 printing option B (recommended): QZ Tray / ESC-POS

* Convert receipt payload to ESC/POS commands
* Print silently (much nicer cashier experience)

Deliverables

* Receipt prints reliably (done)
* Reprint last receipt (admin-only optional)

---

### Phase 8 - Voids + Simple Reports (1 day)

Void sale

* Admin-only (done)
* Marks sales.status=voided (done)
* Creates reversal stock_movements(type=void, qty=+x) per item (done)
* Logs reason + who voided (done)

Reports

* Daily sales total (by date) (done)
* Top items sold today (done)
* Low stock list (done)

Deliverables

* Basic operational tools
* Audit trail exists (partial: stock movement feed done)

---

### Phase 9 - Polish + Hardening (ongoing, but do a quick pass) (All day)

* Prevent duplicate submits (idempotency key optional)
* Better error handling (out of stock, unknown barcode)
* Performance:

  * product search indexing
  * product list pagination or category caching
* UX:

  * always keep search focused if you want speed
  * sound/toast on add item (optional)

Deliverables

* Feels like a real POS, not a demo
