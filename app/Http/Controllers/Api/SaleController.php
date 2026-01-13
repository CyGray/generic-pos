<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryStock;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SaleController extends Controller
{
    public function index(Request $request)
    {
        $date = $request->string('date')->toString();

        $sales = Sale::query()
            ->with('creator')
            ->withCount('items')
            ->when($date !== '', fn ($query) => $query->whereDate('created_at', $date))
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn ($sale) => [
                'id' => $sale->id,
                'receipt_no' => $sale->receipt_no,
                'total' => (float) $sale->total,
                'cash_received' => (float) $sale->cash_received,
                'change' => (float) $sale->change,
                'status' => $sale->status,
                'void_reason' => $sale->void_reason,
                'voided_at' => $sale->voided_at?->toDateTimeString(),
                'items_count' => $sale->items_count,
                'created_by' => $sale->creator?->name,
                'created_at' => $sale->created_at?->toDateTimeString(),
                'receipt_url' => route('receipt', $sale),
            ]);

        return response()->json([
            'data' => $sales,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.qty' => ['required', 'numeric', 'gt:0'],
            'payment_type' => ['nullable', 'string'],
            'cash_received' => ['required', 'numeric', 'min:0'],
        ]);

        $items = collect($data['items']);
        $productIds = $items->pluck('product_id')->unique()->all();

        $products = Product::query()
            ->with('inventoryStock')
            ->whereIn('id', $productIds)
            ->where('is_active', true)
            ->get()
            ->keyBy('id');

        $lineItems = $items->map(function ($item) use ($products) {
            $product = $products->get($item['product_id']);

            if (!$product) {
                abort(422, 'One or more products are unavailable.');
            }

            $qty = (float) $item['qty'];
            $price = (float) $product->price;

            return [
                'product' => $product,
                'qty' => $qty,
                'price' => $price,
                'line_total' => $qty * $price,
                'cost_snapshot' => $product->cost,
            ];
        });

        foreach ($lineItems as $lineItem) {
            $stock = $lineItem['product']->inventoryStock;
            $available = (float) ($stock?->qty_on_hand ?? 0);
            if ($available < $lineItem['qty']) {
                abort(422, 'Insufficient stock for '.$lineItem['product']->name.'.');
            }
        }

        $subtotal = $lineItems->sum('line_total');
        $total = $subtotal;
        $cashReceived = (float) $data['cash_received'];

        if ($cashReceived < $total) {
            abort(422, 'Cash received is below the total.');
        }

        $sale = DB::transaction(function () use ($request, $lineItems, $subtotal, $total, $cashReceived, $data) {
            $receiptNo = $this->nextReceiptNo();

            $sale = Sale::create([
                'receipt_no' => $receiptNo,
                'subtotal' => $subtotal,
                'total' => $total,
                'payment_type' => $data['payment_type'] ?? 'cash',
                'cash_received' => $cashReceived,
                'change' => $cashReceived - $total,
                'status' => 'posted',
                'created_by' => $request->user()->id,
            ]);

            foreach ($lineItems as $lineItem) {
                $product = $lineItem['product'];

                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $product->id,
                    'qty' => $lineItem['qty'],
                    'price' => $lineItem['price'],
                    'cost_snapshot' => $lineItem['cost_snapshot'],
                    'line_total' => $lineItem['line_total'],
                ]);

                InventoryStock::query()
                    ->where('product_id', $product->id)
                    ->decrement('qty_on_hand', $lineItem['qty']);

                StockMovement::create([
                    'product_id' => $product->id,
                    'type' => 'sale',
                    'qty' => -$lineItem['qty'],
                    'unit_cost' => $lineItem['cost_snapshot'],
                    'ref_type' => 'sale',
                    'ref_id' => $sale->id,
                    'created_by' => $request->user()->id,
                    'notes' => 'POS sale',
                ]);
            }

            return $sale->load('items.product');
        });

        return response()->json([
            'data' => [
                'sale_id' => $sale->id,
                'receipt_no' => $sale->receipt_no,
                'subtotal' => (float) $sale->subtotal,
                'total' => (float) $sale->total,
                'cash_received' => (float) $sale->cash_received,
                'change' => (float) $sale->change,
                'created_at' => $sale->created_at?->toDateTimeString(),
                'receipt_url' => route('receipt', $sale),
                'items' => $sale->items->map(fn ($item) => [
                    'name' => $item->product?->name,
                    'qty' => (float) $item->qty,
                    'price' => (float) $item->price,
                    'line_total' => (float) $item->line_total,
                ]),
            ],
        ], 201);
    }

    public function void(Request $request, Sale $sale)
    {
        $this->authorizeAdmin($request);

        if ($sale->status === 'voided') {
            abort(422, 'Sale already voided.');
        }

        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        DB::transaction(function () use ($sale, $request, $data) {
            $sale->load('items.product');

            foreach ($sale->items as $item) {
                $stock = InventoryStock::firstOrCreate(
                    ['product_id' => $item->product_id],
                    ['qty_on_hand' => 0],
                );

                $stock->increment('qty_on_hand', $item->qty);

                StockMovement::create([
                    'product_id' => $item->product_id,
                    'type' => 'void',
                    'qty' => $item->qty,
                    'unit_cost' => $item->cost_snapshot,
                    'ref_type' => 'sale_void',
                    'ref_id' => $sale->id,
                    'created_by' => $request->user()->id,
                    'notes' => $data['reason'] ?? 'Sale voided',
                ]);
            }

            $sale->update([
                'status' => 'voided',
                'void_reason' => $data['reason'] ?? null,
                'voided_at' => now(),
            ]);
        });

        return response()->json([
            'data' => [
                'id' => $sale->id,
                'status' => 'voided',
            ],
        ]);
    }

    private function nextReceiptNo(): string
    {
        $today = now()->format('Ymd');
        $sequence = Sale::query()
            ->whereDate('created_at', now()->toDateString())
            ->count() + 1;

        return $today.'-'.Str::padLeft((string) $sequence, 4, '0');
    }

    private function authorizeAdmin(Request $request): void
    {
        if (($request->user()?->role ?? 'cashier') !== 'admin') {
            abort(403, 'Admin access required.');
        }
    }
}
