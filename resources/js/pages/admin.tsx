import { apiFetch } from '@/lib/api';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';

type Product = {
    id: number;
    name: string;
    sku: string;
    barcode?: string | null;
    price: number;
    qty_on_hand: number;
    is_active: boolean;
    category?: string | null;
    category_id?: number | null;
    deleted_at?: string | null;
};

type Category = {
    id: number;
    name: string;
};

type Summary = {
    sales_today: number;
    transactions: number;
    low_stock: number;
    top_items: string[];
    low_stock_items: string[];
};

type StockMovement = {
    id: number;
    product: string | null;
    type: string;
    qty: number;
    created_by: string | null;
    created_at: string | null;
    notes: string | null;
};

type Sale = {
    id: number;
    receipt_no: string;
    total: number;
    cash_received: number;
    change: number;
    status: string;
    void_reason?: string | null;
    voided_at?: string | null;
    items_count: number;
    created_by: string | null;
    created_at: string | null;
    receipt_url: string;
};

type ApiList<T> = {
    data: T[];
    meta?: {
        page: number;
        per_page: number;
        total: number;
        total_pages: number;
    };
};

type ApiData<T> = {
    data: T;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin',
        href: '/admin',
    },
];

const currency = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
});

export default function Admin() {
    useEffect(() => {
        const root = document.documentElement;
        const wasDark = root.classList.contains('dark');
        root.classList.remove('dark');
        root.classList.add('admin-soft');

        return () => {
            root.classList.remove('admin-soft');
            if (wasDark) {
                root.classList.add('dark');
            }
        };
    }, []);

    const [summary, setSummary] = useState<Summary>({
        sales_today: 0,
        transactions: 0,
        low_stock: 0,
        top_items: [],
        low_stock_items: [],
    });
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [productStatusFilter, setProductStatusFilter] = useState('active');
    const [movementFilters, setMovementFilters] = useState({
        product_id: '',
        type: '',
        date: '',
    });
    const [movementMeta, setMovementMeta] = useState({
        page: 1,
        total_pages: 1,
    });
    const [movementPage, setMovementPage] = useState(1);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editProductId, setEditProductId] = useState<number | null>(null);
    const [createForm, setCreateForm] = useState({
        name: '',
        sku: '',
        barcode: '',
        price: '',
        category_id: '',
    });
    const [editForm, setEditForm] = useState({
        name: '',
        sku: '',
        barcode: '',
        price: '',
        category_id: '',
        is_active: true,
    });
    const [receiveForm, setReceiveForm] = useState({
        product_id: '',
        qty: '',
        unit_cost: '',
        notes: '',
    });
    const [adjustForm, setAdjustForm] = useState({
        product_id: '',
        qty: '',
        reason: '',
        notes: '',
    });

    const refreshSummary = useCallback(() => {
        apiFetch<ApiData<Summary>>('/api/reports/summary')
            .then((payload) => setSummary(payload.data))
            .catch((error) => setErrorMessage(error.message));
    }, []);

    const refreshProducts = useCallback(() => {
        setIsLoading(true);
        const params = new URLSearchParams();
        if (search.trim()) params.set('search', search.trim());
        if (productStatusFilter !== 'all') {
            params.set('status', productStatusFilter);
        }

        apiFetch<ApiList<Product>>(`/api/products?${params.toString()}`)
            .then((payload) => {
                setProducts(payload.data);
                setErrorMessage(null);
            })
            .catch((error) => setErrorMessage(error.message))
            .finally(() => setIsLoading(false));
    }, [productStatusFilter, search]);

    const refreshStockMovements = useCallback(() => {
        const params = new URLSearchParams();
        if (movementFilters.product_id) {
            params.set('product_id', movementFilters.product_id);
        }
        if (movementFilters.type) params.set('type', movementFilters.type);
        if (movementFilters.date) params.set('date', movementFilters.date);
        params.set('page', String(movementPage));
        params.set('per_page', '20');

        const query = params.toString();
        apiFetch<ApiList<StockMovement>>(`/api/stock-movements${query ? `?${query}` : ''}`)
            .then((payload) => {
                setStockMovements(payload.data);
                if (payload.meta) {
                    setMovementMeta({
                        page: payload.meta.page,
                        total_pages: payload.meta.total_pages,
                    });
                }
            })
            .catch((error) => setErrorMessage(error.message));
    }, [movementFilters, movementPage]);

    useEffect(() => {
        setMovementPage(1);
    }, [movementFilters]);

    const refreshSales = useCallback(() => {
        apiFetch<ApiList<Sale>>('/api/sales')
            .then((payload) => setSales(payload.data))
            .catch((error) => setErrorMessage(error.message));
    }, []);

    useEffect(() => {
        apiFetch<ApiList<Category>>('/api/categories')
            .then((payload) => setCategories(payload.data))
            .catch((error) => setErrorMessage(error.message));
    }, []);

    useEffect(() => {
        refreshSummary();
        refreshProducts();
        refreshStockMovements();
        refreshSales();
    }, [refreshProducts, refreshSales, refreshStockMovements, refreshSummary]);

    const handleCreateProduct = async () => {
        setErrorMessage(null);
        try {
            await apiFetch<ApiData<Product>>('/api/products', {
                method: 'POST',
                json: {
                    name: createForm.name,
                    sku: createForm.sku,
                    barcode: createForm.barcode || null,
                    price: Number(createForm.price || 0),
                    category_id: createForm.category_id
                        ? Number(createForm.category_id)
                        : null,
                    is_active: true,
                    qty_on_hand: 0,
                },
            });
            setCreateForm({
                name: '',
                sku: '',
                barcode: '',
                price: '',
                category_id: '',
            });
            setIsCreateOpen(false);
            refreshProducts();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Save failed.');
        }
    };

    const handleEditProduct = (product: Product) => {
        setIsEditOpen(true);
        setEditProductId(product.id);
        setEditForm({
            name: product.name,
            sku: product.sku,
            barcode: product.barcode ?? '',
            price: String(product.price ?? ''),
            category_id: product.category_id ? String(product.category_id) : '',
            is_active: product.is_active,
        });
    };

    const handleUpdateProduct = async () => {
        if (!editProductId) return;
        setErrorMessage(null);
        try {
            await apiFetch<ApiData<Product>>(`/api/products/${editProductId}`, {
                method: 'PUT',
                json: {
                    name: editForm.name,
                    sku: editForm.sku,
                    barcode: editForm.barcode || null,
                    price: Number(editForm.price || 0),
                    category_id: editForm.category_id
                        ? Number(editForm.category_id)
                        : null,
                    is_active: editForm.is_active,
                },
            });
            setIsEditOpen(false);
            setEditProductId(null);
            refreshProducts();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Update failed.');
        }
    };

    const handleToggleActive = async (product: Product) => {
        setErrorMessage(null);
        try {
            await apiFetch<ApiData<Product>>(`/api/products/${product.id}`, {
                method: 'PUT',
                json: {
                    name: product.name,
                    sku: product.sku,
                    barcode: product.barcode || null,
                    price: product.price,
                    category_id: product.category_id ?? null,
                    is_active: !product.is_active,
                },
            });
            refreshProducts();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Update failed.');
        }
    };
    const handleReceive = async () => {
        setErrorMessage(null);
        try {
            await apiFetch('/api/inventory/receive', {
                method: 'POST',
                json: {
                    product_id: Number(receiveForm.product_id),
                    qty: Number(receiveForm.qty),
                    unit_cost: receiveForm.unit_cost
                        ? Number(receiveForm.unit_cost)
                        : null,
                    notes: receiveForm.notes || null,
                },
            });
            setReceiveForm({ product_id: '', qty: '', unit_cost: '', notes: '' });
            refreshProducts();
            refreshSummary();
            refreshStockMovements();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Receive failed.');
        }
    };

    const handleRestoreProduct = async (product: Product) => {
        setErrorMessage(null);
        try {
            await apiFetch<ApiData<Product>>(`/api/products/${product.id}/restore`, {
                method: 'POST',
            });
            refreshProducts();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Restore failed.');
        }
    };

    const handleDeleteProduct = async (product: Product) => {
        const confirmed = window.confirm(
            `Soft delete ${product.name}? This can be restored later.`,
        );
        if (!confirmed) return;

        setErrorMessage(null);
        try {
            await apiFetch(`/api/products/${product.id}`, {
                method: 'DELETE',
            });
            refreshProducts();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Delete failed.');
        }
    };

    const handleAdjust = async () => {
        setErrorMessage(null);
        try {
            await apiFetch('/api/inventory/adjust', {
                method: 'POST',
                json: {
                    product_id: Number(adjustForm.product_id),
                    qty: Number(adjustForm.qty),
                    reason: adjustForm.reason || null,
                    notes: adjustForm.notes || null,
                },
            });
            setAdjustForm({ product_id: '', qty: '', reason: '', notes: '' });
            refreshProducts();
            refreshSummary();
            refreshStockMovements();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Adjust failed.');
        }
    };

    const handleVoidSale = async (sale: Sale) => {
        const reason = window.prompt('Reason for void (optional):', '');
        setErrorMessage(null);
        try {
            await apiFetch(`/api/sales/${sale.id}/void`, {
                method: 'POST',
                json: { reason: reason || null },
            });
            refreshSales();
            refreshProducts();
            refreshSummary();
            refreshStockMovements();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Void failed.');
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin" />
            <div className="flex h-full flex-1 flex-col gap-8 rounded-2xl bg-slate-50 p-8 text-slate-900">
                <section className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                Admin Console
                            </p>
                            <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">
                                Operations Overview
                            </h1>
                            <p className="mt-2 text-sm text-slate-500">
                                Track sales, inventory, and stock movement in one place.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <span>Live today</span>
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase text-emerald-600">
                                Active
                            </span>
                        </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                    {[
                        {
                            label: 'Sales today',
                            value: currency.format(summary.sales_today),
                        },
                        { label: 'Transactions', value: summary.transactions },
                        { label: 'Low stock', value: `${summary.low_stock} items` },
                    ].map((item) => (
                        <div
                            key={item.label}
                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                        >
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                {item.label}
                            </p>
                            <p className="mt-3 text-3xl font-semibold text-slate-900">
                                {item.value}
                            </p>
                        </div>
                    ))}
                </div>

                {errorMessage && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600">
                        {errorMessage}
                    </div>
                )}
                </section>

                <section className="mx-auto grid w-full max-w-[1400px] gap-6 xl:grid-cols-[2fr_1fr]">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    Products
                                </p>
                                <p className="text-xl font-semibold text-slate-900">
                                    Catalog overview
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                    Create, update, and manage availability.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search products"
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                />
                                <select
                                    value={productStatusFilter}
                                    onChange={(event) =>
                                        setProductStatusFilter(event.target.value)
                                    }
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="deleted">Deleted</option>
                                    <option value="all">All</option>
                                </select>
                                <button
                                    onClick={refreshProducts}
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:border-slate-300"
                                >
                                    Refresh
                                </button>
                                <button
                                    onClick={() => setIsCreateOpen((prev) => !prev)}
                                    className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-indigo-700"
                                >
                                    {isCreateOpen ? 'Close' : 'New product'}
                                </button>
                            </div>
                        </div>

                        {isCreateOpen && (
                            <div className="mt-6 grid gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5">
                                <div className="grid gap-3 md:grid-cols-2">
                                    <input
                                        value={createForm.name}
                                        onChange={(event) =>
                                            setCreateForm((prev) => ({
                                                ...prev,
                                                name: event.target.value,
                                            }))
                                        }
                                        placeholder="Product name"
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                                    />
                                    <p className="text-xs text-slate-400">
                                        Short, cashier-friendly name.
                                    </p>
                                    <input
                                        value={createForm.sku}
                                        onChange={(event) =>
                                            setCreateForm((prev) => ({
                                                ...prev,
                                                sku: event.target.value,
                                            }))
                                        }
                                        placeholder="SKU"
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                                    />
                                    <p className="text-xs text-slate-400">
                                        Unique stock code for search.
                                    </p>
                                    <input
                                        value={createForm.barcode}
                                        onChange={(event) =>
                                            setCreateForm((prev) => ({
                                                ...prev,
                                                barcode: event.target.value,
                                            }))
                                        }
                                        placeholder="Barcode (optional)"
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                                    />
                                    <p className="text-xs text-slate-400">
                                        Optional scanner value.
                                    </p>
                                    <input
                                        value={createForm.price}
                                        onChange={(event) =>
                                            setCreateForm((prev) => ({
                                                ...prev,
                                                price: event.target.value,
                                            }))
                                        }
                                        placeholder="Price"
                                        type="number"
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                                    />
                                    <p className="text-xs text-slate-400">
                                        Selling price in PHP.
                                    </p>
                                    <select
                                        value={createForm.category_id}
                                        onChange={(event) =>
                                            setCreateForm((prev) => ({
                                                ...prev,
                                                category_id: event.target.value,
                                            }))
                                        }
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                                    >
                                        <option value="">Select category</option>
                                        {categories.map((category) => (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-400">
                                        Group items for faster filtering.
                                    </p>
                                </div>
                                <button
                                    onClick={handleCreateProduct}
                                    disabled={!createForm.name || !createForm.sku || !createForm.price}
                                    className="self-start rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                                >
                                    Save product
                                </button>
                            </div>
                        )}

                        {isEditOpen && (
                            <div className="mt-6 grid gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Edit product
                                    </p>
                                    <button
                                        onClick={() => {
                                            setIsEditOpen(false);
                                            setEditProductId(null);
                                        }}
                                        className="text-xs font-semibold uppercase text-slate-500"
                                    >
                                        Close
                                    </button>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <input
                                        value={editForm.name}
                                        onChange={(event) =>
                                            setEditForm((prev) => ({
                                                ...prev,
                                                name: event.target.value,
                                            }))
                                        }
                                        placeholder="Product name"
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                                    />
                                    <p className="text-xs text-slate-400">
                                        Keep it short for POS.
                                    </p>
                                    <input
                                        value={editForm.sku}
                                        onChange={(event) =>
                                            setEditForm((prev) => ({
                                                ...prev,
                                                sku: event.target.value,
                                            }))
                                        }
                                        placeholder="SKU"
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                                    />
                                    <p className="text-xs text-slate-400">
                                        Unique stock code.
                                    </p>
                                    <input
                                        value={editForm.barcode}
                                        onChange={(event) =>
                                            setEditForm((prev) => ({
                                                ...prev,
                                                barcode: event.target.value,
                                            }))
                                        }
                                        placeholder="Barcode (optional)"
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                                    />
                                    <p className="text-xs text-slate-400">
                                        Optional scanner value.
                                    </p>
                                    <input
                                        value={editForm.price}
                                        onChange={(event) =>
                                            setEditForm((prev) => ({
                                                ...prev,
                                                price: event.target.value,
                                            }))
                                        }
                                        placeholder="Price"
                                        type="number"
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                    />
                                    <p className="text-xs text-slate-400">
                                        Selling price in PHP.
                                    </p>
                                    <select
                                        value={editForm.category_id}
                                        onChange={(event) =>
                                            setEditForm((prev) => ({
                                                ...prev,
                                                category_id: event.target.value,
                                            }))
                                        }
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                    >
                                        <option value="">Select category</option>
                                        {categories.map((category) => (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-400">
                                        Group items for faster filtering.
                                    </p>
                                    <label className="flex items-center gap-2 text-sm text-slate-600">
                                        <input
                                            type="checkbox"
                                            checked={editForm.is_active}
                                            onChange={(event) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    is_active: event.target.checked,
                                                }))
                                            }
                                        />
                                        Active
                                    </label>
                                    <p className="text-xs text-slate-400">
                                        Disable to hide from POS.
                                    </p>
                                </div>
                                <button
                                    onClick={handleUpdateProduct}
                                    disabled={!editForm.name || !editForm.sku || !editForm.price}
                                    className="self-start rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                                >
                                    Update product
                                </button>
                            </div>
                        )}

                        <div className="mt-6 overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead className="text-xs uppercase tracking-wide text-slate-400">
                                    <tr>
                                        <th className="pb-2">Product</th>
                                        <th className="pb-2">SKU</th>
                                        <th className="pb-2">Price</th>
                                        <th className="pb-2">Stock</th>
                                        <th className="pb-2">Status</th>
                                        <th className="pb-2">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {isLoading ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="py-6 text-center text-sm text-slate-500"
                                            >
                                                Loading products...
                                            </td>
                                        </tr>
                                    ) : (
                                        products.map((product) => (
                                            <tr key={product.id} className="text-slate-700">
                                                <td className="py-3 font-semibold text-slate-900">
                                                    {product.name}
                                                </td>
                                                <td className="py-3 text-xs text-slate-400">
                                                    {product.sku}
                                                </td>
                                                <td className="py-3">
                                                    {currency.format(product.price)}
                                                </td>
                                                <td className="py-3">
                                                    {product.qty_on_hand}
                                                </td>
                                                <td className="py-3">
                                                    <span
                                                        className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${
                                                            product.deleted_at
                                                                ? 'bg-slate-100 text-slate-400'
                                                                : !product.is_active
                                                                  ? 'bg-slate-100 text-slate-400'
                                                                  : product.qty_on_hand <= 0
                                                                    ? 'bg-rose-50 text-rose-500'
                                                                    : 'bg-emerald-50 text-emerald-600'
                                                        }`}
                                                    >
                                                        {product.deleted_at
                                                            ? 'Deleted'
                                                            : !product.is_active
                                                              ? 'Inactive'
                                                              : product.qty_on_hand <= 0
                                                                ? 'Out'
                                                                : 'Active'}
                                                    </span>
                                                </td>
                                                <td className="py-3">
                                                    {product.deleted_at ? (
                                                        <button
                                                            onClick={() => handleRestoreProduct(product)}
                                                            className="rounded-lg border border-emerald-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-600 hover:border-emerald-300"
                                                        >
                                                            Restore
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() =>
                                                                    handleEditProduct(product)
                                                                }
                                                                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:border-slate-300"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    handleToggleActive(product)
                                                                }
                                                                className="ml-2 rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:border-slate-300"
                                                            >
                                                                {product.is_active
                                                                    ? 'Deactivate'
                                                                    : 'Activate'}
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    handleDeleteProduct(product)
                                                                }
                                                                className="ml-2 rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-500 hover:border-rose-300"
                                                            >
                                                                Delete
                                                            </button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Receive stock
                            </p>
                            <p className="text-lg font-semibold text-slate-900">
                                Increase inventory
                            </p>
                            <div className="mt-3 grid gap-3">
                                <select
                                    value={receiveForm.product_id}
                                    onChange={(event) =>
                                        setReceiveForm((prev) => ({
                                            ...prev,
                                            product_id: event.target.value,
                                        }))
                                    }
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                                >
                                    <option value="">Select product</option>
                                    {products.map((product) => (
                                        <option key={product.id} value={product.id}>
                                            {product.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-400">
                                    Choose the product to increase.
                                </p>
                                <input
                                    value={receiveForm.qty}
                                    onChange={(event) =>
                                        setReceiveForm((prev) => ({
                                            ...prev,
                                            qty: event.target.value,
                                        }))
                                    }
                                    placeholder="Qty received"
                                    type="number"
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                                />
                                <p className="text-xs text-slate-400">
                                    Positive number only.
                                </p>
                                <input
                                    value={receiveForm.unit_cost}
                                    onChange={(event) =>
                                        setReceiveForm((prev) => ({
                                            ...prev,
                                            unit_cost: event.target.value,
                                        }))
                                    }
                                    placeholder="Unit cost (optional)"
                                    type="number"
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                />
                                <p className="text-xs text-slate-400">
                                    Used for margin tracking.
                                </p>
                                <textarea
                                    value={receiveForm.notes}
                                    onChange={(event) =>
                                        setReceiveForm((prev) => ({
                                            ...prev,
                                            notes: event.target.value,
                                        }))
                                    }
                                    placeholder="Notes"
                                    rows={2}
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                />
                                <p className="text-xs text-slate-400">
                                    Optional receiving note.
                                </p>
                                <button
                                    onClick={handleReceive}
                                    disabled={!receiveForm.product_id || !receiveForm.qty}
                                    className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                                >
                                    Receive
                                </button>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Adjust stock
                            </p>
                            <p className="text-lg font-semibold text-slate-900">
                                Corrections and shrinkage
                            </p>
                            <div className="mt-3 grid gap-3">
                                <select
                                    value={adjustForm.product_id}
                                    onChange={(event) =>
                                        setAdjustForm((prev) => ({
                                            ...prev,
                                            product_id: event.target.value,
                                        }))
                                    }
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                >
                                    <option value="">Select product</option>
                                    {products.map((product) => (
                                        <option key={product.id} value={product.id}>
                                            {product.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-400">
                                    Choose the product to adjust.
                                </p>
                                <input
                                    value={adjustForm.qty}
                                    onChange={(event) =>
                                        setAdjustForm((prev) => ({
                                            ...prev,
                                            qty: event.target.value,
                                        }))
                                    }
                                    placeholder="Qty adjustment (+/-)"
                                    type="number"
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                />
                                <p className="text-xs text-slate-400">
                                    Use negative for shrinkage.
                                </p>
                                <input
                                    value={adjustForm.reason}
                                    onChange={(event) =>
                                        setAdjustForm((prev) => ({
                                            ...prev,
                                            reason: event.target.value,
                                        }))
                                    }
                                    placeholder="Reason"
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                />
                                <p className="text-xs text-slate-400">
                                    Short reason for audit.
                                </p>
                                <textarea
                                    value={adjustForm.notes}
                                    onChange={(event) =>
                                        setAdjustForm((prev) => ({
                                            ...prev,
                                            notes: event.target.value,
                                        }))
                                    }
                                    placeholder="Notes"
                                    rows={2}
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                />
                                <p className="text-xs text-slate-400">
                                    Optional details.
                                </p>
                                <button
                                    onClick={handleAdjust}
                                    disabled={!adjustForm.product_id || !adjustForm.qty}
                                    className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                                >
                                    Adjust
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mx-auto grid w-full max-w-[1400px] gap-4 md:grid-cols-3">
                    {[
                        {
                            label: 'Daily sales',
                            value: currency.format(summary.sales_today),
                            note: 'Based on posted sales',
                        },
                        {
                            label: 'Top items',
                            value:
                                summary.top_items.length > 0
                                    ? summary.top_items.join(', ')
                                    : 'No sales yet',
                            note: 'Based on today',
                        },
                        {
                            label: 'Low stock list',
                            value:
                                summary.low_stock_items.length > 0
                                    ? summary.low_stock_items.join(', ')
                                    : 'All good',
                            note: 'Threshold: 5 units',
                        },
                    ].map((item) => (
                        <div
                            key={item.label}
                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                        >
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                {item.label}
                            </p>
                            <p className="mt-3 text-lg font-semibold text-slate-900">
                                {item.value}
                            </p>
                            <p className="mt-2 text-xs text-slate-400">{item.note}</p>
                        </div>
                    ))}
                </section>

                <section className="mx-auto grid w-full max-w-[1400px] gap-6 xl:grid-cols-[1.3fr_1fr]">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    Recent sales
                                </p>
                                <p className="text-xl font-semibold text-slate-900">
                                    Void controls
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                    Review and reprint recent receipts.
                                </p>
                            </div>
                            <button
                                onClick={refreshSales}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:border-slate-300"
                            >
                                Refresh
                            </button>
                        </div>
                        <div className="mt-6 space-y-3">
                            {sales.length === 0 ? (
                                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                                    No sales yet.
                                </p>
                            ) : (
                                sales.map((sale) => (
                                    <div
                                        key={sale.id}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-4 py-3 text-sm"
                                    >
                                        <div>
                                            <p className="font-semibold text-slate-900">
                                                {sale.receipt_no}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {sale.created_by ?? 'Unknown'} -{' '}
                                                {sale.items_count} items
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-slate-900">
                                                {currency.format(sale.total)}
                                            </span>
                                            <span
                                                className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${
                                                    sale.status === 'voided'
                                                        ? 'bg-rose-50 text-rose-500'
                                                        : 'bg-emerald-50 text-emerald-600'
                                                }`}
                                            >
                                                {sale.status}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    window.open(
                                                        sale.receipt_url,
                                                        '_blank',
                                                        'width=900,height=800',
                                                    )
                                                }
                                                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:border-slate-300"
                                            >
                                                Reprint
                                            </button>
                                            <button
                                                onClick={() => handleVoidSale(sale)}
                                                disabled={sale.status === 'voided'}
                                                className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-500 hover:border-rose-300 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                                            >
                                                Void
                                            </button>
                                        </div>
                                        {sale.status === 'voided' && sale.void_reason && (
                                            <p className="w-full text-xs text-slate-400">
                                                Reason: {sale.void_reason}
                                            </p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    Stock movements
                                </p>
                                <p className="text-xl font-semibold text-slate-900">
                                    Latest entries
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                    Filter by product, type, or date.
                                </p>
                            </div>
                            <button
                                onClick={refreshStockMovements}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:border-slate-300"
                            >
                                Refresh
                            </button>
                        </div>
                        <div className="mt-6 grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-500">
                            <select
                                value={movementFilters.product_id}
                                onChange={(event) =>
                                    setMovementFilters((prev) => ({
                                        ...prev,
                                        product_id: event.target.value,
                                    }))
                                }
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                            >
                                <option value="">All products</option>
                                {products.map((product) => (
                                    <option key={product.id} value={product.id}>
                                        {product.name}
                                    </option>
                                ))}
                            </select>
                            <div className="flex flex-wrap gap-2">
                                <select
                                    value={movementFilters.type}
                                    onChange={(event) =>
                                        setMovementFilters((prev) => ({
                                            ...prev,
                                            type: event.target.value,
                                        }))
                                    }
                                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900"
                                >
                                    <option value="">All types</option>
                                    <option value="receive">Receive</option>
                                    <option value="adjust">Adjust</option>
                                    <option value="sale">Sale</option>
                                    <option value="void">Void</option>
                                </select>
                                <input
                                    value={movementFilters.date}
                                    onChange={(event) =>
                                        setMovementFilters((prev) => ({
                                            ...prev,
                                            date: event.target.value,
                                        }))
                                    }
                                    type="date"
                                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900"
                                />
                                <button
                                    onClick={refreshStockMovements}
                                    className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:border-slate-300"
                                >
                                    Apply
                                </button>
                                <button
                                    onClick={() => {
                                        const params = new URLSearchParams();
                                        if (movementFilters.product_id) {
                                            params.set('product_id', movementFilters.product_id);
                                        }
                                        if (movementFilters.type) {
                                            params.set('type', movementFilters.type);
                                        }
                                        if (movementFilters.date) {
                                            params.set('date', movementFilters.date);
                                        }
                                        const query = params.toString();
                                        window.open(
                                            `/api/stock-movements/export${query ? `?${query}` : ''}`,
                                            '_blank',
                                        );
                                    }}
                                    className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:border-slate-300"
                                >
                                    Export CSV
                                </button>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                            <button
                                onClick={() => setMovementPage((page) => Math.max(1, page - 1))}
                                disabled={movementMeta.page <= 1}
                                className="rounded-md border border-slate-200 px-2 py-1 font-semibold uppercase tracking-wide text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300"
                            >
                                Prev
                            </button>
                            <span>
                                Page {movementMeta.page} of {movementMeta.total_pages}
                            </span>
                            <button
                                onClick={() =>
                                    setMovementPage((page) =>
                                        Math.min(movementMeta.total_pages, page + 1),
                                    )
                                }
                                disabled={movementMeta.page >= movementMeta.total_pages}
                                className="rounded-md border border-slate-200 px-2 py-1 font-semibold uppercase tracking-wide text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300"
                            >
                                Next
                            </button>
                        </div>
                        <div className="mt-4 space-y-3 text-sm text-slate-600">
                            {stockMovements.length === 0 ? (
                                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                                    No movements yet.
                                </p>
                            ) : (
                                stockMovements.map((movement) => (
                                    <div
                                        key={movement.id}
                                        className="rounded-xl border border-slate-100 px-4 py-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold text-slate-900">
                                                {movement.product ?? 'Unknown item'}
                                            </p>
                                            <span className="text-xs uppercase text-slate-400">
                                                {movement.type}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400">
                                            Qty {movement.qty} -{' '}
                                            {movement.created_by ?? 'System'}
                                        </p>
                                        {movement.notes && (
                                            <p className="text-xs text-slate-400">
                                                {movement.notes}
                                            </p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
