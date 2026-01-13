<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryStock;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function summary(Request $request)
    {
        $today = now()->toDateString();

        $salesToday = Sale::query()
            ->whereDate('created_at', $today)
            ->where('status', 'posted');

        $totalSales = (float) $salesToday->sum('total');
        $transactions = $salesToday->count();

        $lowStockCount = InventoryStock::query()
            ->where('qty_on_hand', '<=', 5)
            ->count();

        $topItems = SaleItem::query()
            ->select('product_id', DB::raw('SUM(qty) as total_qty'))
            ->whereHas('sale', function ($query) use ($today) {
                $query->whereDate('created_at', $today)->where('status', 'posted');
            })
            ->with('product')
            ->groupBy('product_id')
            ->orderByDesc('total_qty')
            ->limit(3)
            ->get()
            ->map(fn ($item) => $item->product?->name)
            ->filter()
            ->values();

        $lowStockItems = InventoryStock::query()
            ->with('product')
            ->where('qty_on_hand', '<=', 5)
            ->orderBy('qty_on_hand')
            ->limit(3)
            ->get()
            ->map(fn ($stock) => $stock->product?->name)
            ->filter()
            ->values();

        return response()->json([
            'data' => [
                'sales_today' => $totalSales,
                'transactions' => $transactions,
                'low_stock' => $lowStockCount,
                'top_items' => $topItems,
                'low_stock_items' => $lowStockItems,
            ],
        ]);
    }
}
