<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StockMovement;
use Illuminate\Http\Request;

class StockMovementController extends Controller
{
    public function index(Request $request)
    {
        $productId = $request->integer('product_id');
        $type = $request->string('type')->toString();
        $date = $request->string('date')->toString();
        $page = max(1, (int) $request->integer('page'));
        $perPage = min(100, max(10, (int) $request->integer('per_page', 20)));

        $query = StockMovement::query()
            ->with(['product', 'creator'])
            ->when($productId, fn ($query) => $query->where('product_id', $productId))
            ->when($type !== '', fn ($query) => $query->where('type', $type))
            ->when($date !== '', fn ($query) => $query->whereDate('created_at', $date))
            ->orderByDesc('created_at');

        $total = $query->count();
        $movements = $query
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get()
            ->map(fn ($movement) => [
                'id' => $movement->id,
                'product' => $movement->product?->name,
                'type' => $movement->type,
                'qty' => (float) $movement->qty,
                'created_by' => $movement->creator?->name,
                'notes' => $movement->notes,
                'created_at' => $movement->created_at?->toDateTimeString(),
            ]);

        return response()->json([
            'data' => $movements,
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => (int) ceil($total / $perPage),
            ],
        ]);
    }

    public function export(Request $request)
    {
        $productId = $request->integer('product_id');
        $type = $request->string('type')->toString();
        $date = $request->string('date')->toString();

        $rows = StockMovement::query()
            ->with(['product', 'creator'])
            ->when($productId, fn ($query) => $query->where('product_id', $productId))
            ->when($type !== '', fn ($query) => $query->where('type', $type))
            ->when($date !== '', fn ($query) => $query->whereDate('created_at', $date))
            ->orderByDesc('created_at')
            ->get();

        $lines = [
            ['id', 'product', 'type', 'qty', 'created_by', 'notes', 'created_at'],
        ];

        foreach ($rows as $row) {
            $lines[] = [
                $row->id,
                $row->product?->name,
                $row->type,
                $row->qty,
                $row->creator?->name,
                $row->notes,
                $row->created_at?->toDateTimeString(),
            ];
        }

        $handle = fopen('php://temp', 'r+');
        foreach ($lines as $line) {
            fputcsv($handle, $line);
        }
        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        return response($csv ?? '', 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename=\"stock-movements.csv\"',
        ]);
    }
}
