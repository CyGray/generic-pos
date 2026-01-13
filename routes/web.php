<?php

use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SaleController;
use App\Models\Sale;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    Route::get('pos', function () {
        return Inertia::render('pos');
    })->name('pos');

    Route::get('receipt/{sale}', function (Sale $sale) {
        $sale->load('items.product', 'creator');

        $user = request()->user();
        if (($user->role ?? 'cashier') !== 'admin' && $sale->created_by !== $user->id) {
            abort(403, 'Receipt access denied.');
        }

        return view('receipt', [
            'sale' => $sale,
        ]);
    })->name('receipt');

    Route::prefix('api')->group(function () {
        Route::get('categories', [CategoryController::class, 'index']);
        Route::get('products', [ProductController::class, 'index']);
        Route::get('products/by-barcode/{barcode}', [ProductController::class, 'showByBarcode']);
        Route::post('sales', [SaleController::class, 'store']);
        Route::get('sales', [SaleController::class, 'index']);
    });

    Route::middleware('admin')->group(function () {
        Route::get('admin', function () {
            return Inertia::render('admin');
        })->name('admin');

        Route::prefix('api')->group(function () {
            Route::post('products', [ProductController::class, 'store']);
            Route::put('products/{product}', [ProductController::class, 'update']);
            Route::delete('products/{product}', [ProductController::class, 'destroy']);
            Route::post('products/{product}/restore', [ProductController::class, 'restore']);
            Route::post('inventory/receive', [InventoryController::class, 'receive']);
            Route::post('inventory/adjust', [InventoryController::class, 'adjust']);
            Route::post('sales/{sale}/void', [SaleController::class, 'void']);
            Route::get('reports/summary', [ReportController::class, 'summary']);
            Route::get('stock-movements', [\App\Http\Controllers\Api\StockMovementController::class, 'index']);
            Route::get('stock-movements/export', [\App\Http\Controllers\Api\StockMovementController::class, 'export']);
        });
    });
});

require __DIR__.'/settings.php';
