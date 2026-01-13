<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryStock;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->string('search'));
        $categoryId = $request->integer('category_id');
        $activeOnly = $request->boolean('active_only');
        $status = $request->string('status')->toString();

        $productsQuery = Product::query()
            ->with(['category', 'inventoryStock'])
            ->when($categoryId, fn ($query) => $query->where('category_id', $categoryId))
            ->when($activeOnly, fn ($query) => $query->where('is_active', true))
            ->when($status === 'active', fn ($query) => $query->where('is_active', true))
            ->when($status === 'inactive', fn ($query) => $query->where('is_active', false))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhere('barcode', 'like', "%{$search}%");
                });
            })
            ->orderBy('name');

        if ($status === 'deleted') {
            $productsQuery->onlyTrashed();
        } else {
            $productsQuery->whereNull('deleted_at');
        }

        $products = $productsQuery->get();

        return response()->json([
            'data' => $products->map(fn ($product) => $this->formatProduct($product)),
        ]);
    }

    public function showByBarcode(string $barcode)
    {
        $product = Product::query()
            ->with(['category', 'inventoryStock'])
            ->where('barcode', $barcode)
            ->firstOrFail();

        return response()->json([
            'data' => $this->formatProduct($product),
        ]);
    }

    public function store(Request $request)
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'category_id' => ['nullable', 'exists:categories,id'],
            'sku' => ['required', 'string', 'max:100', 'unique:products,sku'],
            'name' => ['required', 'string', 'max:255'],
            'barcode' => ['nullable', 'string', 'max:120', 'unique:products,barcode'],
            'price' => ['required', 'numeric', 'min:0'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'uom' => ['nullable', 'string', 'max:40'],
            'is_active' => ['nullable', 'boolean'],
            'qty_on_hand' => ['nullable', 'numeric'],
        ]);

        $product = Product::create([
            'category_id' => $data['category_id'] ?? null,
            'sku' => $data['sku'],
            'name' => $data['name'],
            'barcode' => $data['barcode'] ?? null,
            'price' => $data['price'],
            'cost' => $data['cost'] ?? null,
            'uom' => $data['uom'] ?? 'each',
            'is_active' => $data['is_active'] ?? true,
        ]);

        InventoryStock::create([
            'product_id' => $product->id,
            'qty_on_hand' => $data['qty_on_hand'] ?? 0,
        ]);

        $product->load(['category', 'inventoryStock']);

        return response()->json([
            'data' => $this->formatProduct($product),
        ], 201);
    }

    public function update(Request $request, Product $product)
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'category_id' => ['nullable', 'exists:categories,id'],
            'sku' => ['required', 'string', 'max:100', Rule::unique('products', 'sku')->ignore($product->id)],
            'name' => ['required', 'string', 'max:255'],
            'barcode' => ['nullable', 'string', 'max:120', Rule::unique('products', 'barcode')->ignore($product->id)],
            'price' => ['required', 'numeric', 'min:0'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'uom' => ['nullable', 'string', 'max:40'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $product->update([
            'category_id' => $data['category_id'] ?? null,
            'sku' => $data['sku'],
            'name' => $data['name'],
            'barcode' => $data['barcode'] ?? null,
            'price' => $data['price'],
            'cost' => $data['cost'] ?? null,
            'uom' => $data['uom'] ?? 'each',
            'is_active' => $data['is_active'] ?? true,
        ]);

        $product->load(['category', 'inventoryStock']);

        return response()->json([
            'data' => $this->formatProduct($product),
        ]);
    }

    public function destroy(Request $request, Product $product)
    {
        $this->authorizeAdmin($request);

        $product->delete();

        return response()->json([
            'data' => ['id' => $product->id, 'deleted' => true],
        ]);
    }

    public function restore(Request $request, int $product)
    {
        $this->authorizeAdmin($request);

        $product = Product::withTrashed()->findOrFail($product);
        $product->restore();

        return response()->json([
            'data' => $this->formatProduct($product),
        ]);
    }

    private function formatProduct(Product $product): array
    {
        return [
            'id' => $product->id,
            'name' => $product->name,
            'sku' => $product->sku,
            'barcode' => $product->barcode,
            'price' => (float) $product->price,
            'category_id' => $product->category_id,
            'category' => $product->category?->name,
            'is_active' => $product->is_active,
            'qty_on_hand' => (float) ($product->inventoryStock?->qty_on_hand ?? 0),
            'deleted_at' => $product->deleted_at?->toDateTimeString(),
        ];
    }

    private function authorizeAdmin(Request $request): void
    {
        if (($request->user()?->role ?? 'cashier') !== 'admin') {
            abort(403, 'Admin access required.');
        }
    }
}
