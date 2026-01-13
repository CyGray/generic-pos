<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryStock;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    public function receive(Request $request)
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'qty' => ['required', 'numeric', 'gt:0'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        $movement = DB::transaction(function () use ($data, $request) {
            $stock = InventoryStock::firstOrCreate(
                ['product_id' => $data['product_id']],
                ['qty_on_hand' => 0],
            );

            $stock->increment('qty_on_hand', $data['qty']);

            return StockMovement::create([
                'product_id' => $data['product_id'],
                'type' => 'receive',
                'qty' => $data['qty'],
                'unit_cost' => $data['unit_cost'] ?? null,
                'ref_type' => 'receive',
                'ref_id' => null,
                'created_by' => $request->user()->id,
                'notes' => $data['notes'] ?? null,
            ]);
        });

        return response()->json([
            'data' => [
                'id' => $movement->id,
                'type' => $movement->type,
            ],
        ], 201);
    }

    public function adjust(Request $request)
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'qty' => ['required', 'numeric', 'not_in:0'],
            'reason' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string'],
        ]);

        $movement = DB::transaction(function () use ($data, $request) {
            $stock = InventoryStock::firstOrCreate(
                ['product_id' => $data['product_id']],
                ['qty_on_hand' => 0],
            );

            $stock->increment('qty_on_hand', $data['qty']);

            return StockMovement::create([
                'product_id' => $data['product_id'],
                'type' => 'adjust',
                'qty' => $data['qty'],
                'unit_cost' => null,
                'ref_type' => 'adjust',
                'ref_id' => null,
                'created_by' => $request->user()->id,
                'notes' => $data['reason']
                    ? trim($data['reason'].': '.($data['notes'] ?? ''))
                    : ($data['notes'] ?? null),
            ]);
        });

        return response()->json([
            'data' => [
                'id' => $movement->id,
                'type' => $movement->type,
            ],
        ], 201);
    }

    private function authorizeAdmin(Request $request): void
    {
        if (($request->user()?->role ?? 'cashier') !== 'admin') {
            abort(403, 'Admin access required.');
        }
    }
}
