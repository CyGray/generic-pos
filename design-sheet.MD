# POS Template — UI Design Sheet (v1)

## 1. Design Philosophy

**Keywords**

* Fast > Fancy
* Clear > Clever
* Confident > Busy
* Minimal but not empty

**Overall feel**

* Light background, strong contrast
* Large touch-friendly elements
* Subtle motion (not flashy)
* Clear hierarchy: *scan → cart → pay*

Think: **Apple Store meets modern retail POS**, not accounting software.

---

## 2. Color System

### Primary Palette

Use **one strong brand color**, everything else neutral.

```txt
Primary:        Indigo / Blue-violet
Primary Dark:   Indigo-700
Primary Light:  Indigo-100

Success:        Emerald-500
Danger:         Rose-500
Warning:        Amber-500
```

Example Tailwind usage:

```txt
bg-indigo-600
text-indigo-600
hover:bg-indigo-700
```

### Neutrals (very important)

```txt
Background:     slate-50
Surface:        white
Border:         slate-200
Text Primary:   slate-900
Text Secondary: slate-500
Muted:          slate-400
```

**Rule**

> If everything is colorful, nothing is.
> Use color **only** to signal action or state.

---

## 3. Typography

### Font

* **Inter** (default Tailwind-friendly, modern, neutral)

### Type Scale

```txt
App Title:      text-xl / font-semibold
Section Title: text-sm / font-semibold / uppercase / tracking-wide
Body:           text-sm
Meta:           text-xs / text-slate-500
Price / Total:  text-2xl–3xl / font-bold
```

### Rules

* Prices should always be **bigger than text**
* Use uppercase sparingly (labels only)
* Avoid more than **2 font weights per screen**

---

## 4. Layout System

### App Shell

```txt
┌─────────────────────────────┐
│ Top Bar (User / Time)       │
├─────────────┬───────────────┤
│ Product     │ Cart          │
│ Browser     │               │
│             │               │
│             │ Totals        │
│             │ Checkout Btn  │
└─────────────┴───────────────┘
```

### Spacing Rules

* Use **8px system**
* Padding inside cards: `p-4`
* Gaps between elements: `gap-3` or `gap-4`
* Never cram things

---

## 5. Top Bar (Minimal, Calm)

**Contents**

* Store name (left)
* Current user + role
* Current date/time
* Logout button

**Style**

* White background
* Bottom border
* Height ~56px

**No distractions**

* No bright colors
* No large buttons

---

## 6. Product Browser (Left Panel)

### Purpose

Fast discovery + fast adding

### Layout

* Search bar at top
* Category pills below
* Product grid/list

### Search Bar

```txt
[ 🔍 Search products or scan barcode ]
```

* Rounded
* Always visible
* Subtle focus ring
* Keyboard-focusable

### Category Pills

* Horizontal scroll if many
* Active pill = primary color
* Inactive = muted outline

### Product Card (Click-to-Add)

**Design**

* White card
* Soft shadow
* Rounded-xl
* Entire card clickable

**Content**

* Product name (2 lines max)
* Price (bold)
* Optional stock badge

**Hover**

* Slight lift
* Border glow in primary color

**Out-of-stock**

* Grayed
* Disabled click
* Small “Out of stock” label

---

## 7. Cart Panel (Right Panel)

### Cart Item Row

```txt
[ Name           ]
[ ₱price  x  qty ]   [ −  + ] [ ✕ ]
```

**Rules**

* Item name always readable
* Qty controls large and click-friendly
* Remove button subtle but visible

### Visual Hierarchy

1. Item name
2. Qty
3. Line total
4. Remove

### Empty Cart State

* Friendly icon
* Text: “Scan or add items to begin”
* No CTA needed

---

## 8. Totals Section (Very Important)

### Layout

* Sticky bottom section
* Separated by top border
* Always visible

### Content

```txt
Subtotal     ₱1,234.00
──────────────
TOTAL        ₱1,234.00
```

**Design**

* Total is BIG
* Strong contrast
* Calm background

---

## 9. Primary Action: Checkout Button

### Style

* Full width
* Height ≥ 56px
* Primary color
* Rounded-xl
* Bold text

```txt
CHECKOUT
```

### States

* Disabled if cart empty
* Loading spinner on submit
* Success → green flash or checkmark

---

## 10. Checkout Modal

### Layout

* Centered
* Large
* Focused

### Content

* Total (very large)
* Cash received input
* Change displayed live
* Confirm + Cancel

### UX Rules

* Autofocus cash input
* Enter = confirm
* Esc = cancel
* Prevent double submit

---

## 11. Receipt Design (Print + Screen)

### Style

* Monospaced or clean sans-serif
* No colors (printer-safe)
* Clear spacing

### Must Feel

* Clean
* Official
* Not cluttered

### Screen Receipt

* Preview after sale
* “Print again” button

---

## 12. Admin Screens (Simple but Polished)

### Tables

* White background
* Zebra rows (very light)
* Sticky header
* Actions hidden until hover

### Forms

* Label above input
* Helper text small and muted
* Errors in red, concise

### Buttons

* Primary: save/submit
* Secondary: cancel
* Danger: delete/void (always confirm)

---

## 13. Icons

* Use **lucide-react** or **Heroicons**
* Size: 16–20px
* Always paired with text for critical actions

---

## 14. Motion & Feedback (Subtle Only)

### Use motion for:

* Add-to-cart confirmation
* Button hover
* Modal open/close

### Avoid:

* Long animations
* Bouncing effects
* Anything slowing cashier flow

---

## 15. States You MUST Design (to feel complete)

* Empty states
* Loading states
* Error states
* Disabled buttons
* Out-of-stock items
* No search results

A POS that handles states well feels **professional**, even if features are limited.

---

## 16. Dark Mode?

Optional, but:

* POS systems often stay light
* If you add it later, do it properly (not half-baked)

---

## 17. What Makes This Feel “Not Boring”

* Large confident typography for money
* Calm neutral surfaces
* One strong accent color
* Consistent spacing
* No clutter
* Clear flow: **Add → Review → Pay → Done**

---

### Final Advice

If you ever hesitate between:

* **“This looks cool”**
* **“This is faster to use”**

Pick **faster**.

Speed + clarity is what *actually* makes POS UIs feel cool.



## 18. Responsiveness
- The POS and Admin panel must be responsive to the screen size, and must still adapt a two column style for POS, collapsible sidebar for admin/dashboard, and improved responsiveness for all pages.