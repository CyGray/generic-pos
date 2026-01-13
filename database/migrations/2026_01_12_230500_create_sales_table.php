<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->string('receipt_no')->unique();
            $table->decimal('subtotal', 12, 2);
            $table->decimal('total', 12, 2);
            $table->string('payment_type')->default('cash');
            $table->decimal('cash_received', 12, 2)->default(0);
            $table->decimal('change', 12, 2)->default(0);
            $table->string('status')->default('posted');
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index(['status', 'created_by']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
