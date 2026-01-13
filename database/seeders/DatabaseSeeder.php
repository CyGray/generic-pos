<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\InventoryStock;
use App\Models\Product;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'role' => 'admin',
            'password' => Hash::make('password'),
        ]);

        User::factory()->create([
            'name' => 'Cashier User',
            'email' => 'cashier@example.com',
            'role' => 'cashier',
            'password' => Hash::make('password'),
        ]);

        $categories = collect(['Drinks', 'Snacks', 'Grocery', 'Home'])->map(
            fn ($name) => Category::create(['name' => $name]),
        );

        $products = [
            [
                'category' => 'Drinks',
                'sku' => 'DRK-101',
                'name' => 'Cold Brew Coffee 12oz',
                'barcode' => '049000012345',
                'price' => 120.0,
                'cost' => 65.0,
            ],
            [
                'category' => 'Drinks',
                'sku' => 'DRK-102',
                'name' => 'Still Water 16oz',
                'barcode' => '049000054321',
                'price' => 45.0,
                'cost' => 20.0,
            ],
            [
                'category' => 'Snacks',
                'sku' => 'SNK-210',
                'name' => 'Classic Potato Chips',
                'barcode' => null,
                'price' => 65.0,
                'cost' => 30.0,
            ],
            [
                'category' => 'Snacks',
                'sku' => 'SNK-211',
                'name' => 'Trail Mix 6oz',
                'barcode' => '075000098765',
                'price' => 95.0,
                'cost' => 45.0,
            ],
            [
                'category' => 'Home',
                'sku' => 'HOM-330',
                'name' => 'Dish Soap 16oz',
                'barcode' => null,
                'price' => 135.0,
                'cost' => 80.0,
            ],
            [
                'category' => 'Grocery',
                'sku' => 'GRY-441',
                'name' => 'Organic Granola 12oz',
                'barcode' => '036000123456',
                'price' => 175.0,
                'cost' => 95.0,
            ],
        ];

        foreach ($products as $productData) {
            $category = $categories->firstWhere('name', $productData['category']);
            $product = Product::create([
                'category_id' => $category?->id,
                'sku' => $productData['sku'],
                'name' => $productData['name'],
                'barcode' => $productData['barcode'],
                'price' => $productData['price'],
                'cost' => $productData['cost'],
                'uom' => 'each',
                'is_active' => true,
            ]);

            InventoryStock::create([
                'product_id' => $product->id,
                'qty_on_hand' => $product->sku === 'SNK-211' ? 0 : 12,
            ]);
        }
    }
}
