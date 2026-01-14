import { apiFetch } from '@/lib/api';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { Minus, Plus, Search, ShoppingCart, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type Product = {
    id: number;
    name: string;
    sku: string;
    barcode?: string | null;
    price: number;
    category_id?: number | null;
    category?: string | null;
    qty_on_hand: number;
    is_active: boolean;
};

type Category = {
    id: number;
    name: string;
};

type CartItem = {
    productId: number;
    name: string;
    price: number;
    qty: number;
};

type SaleResponse = {
    data: {
        sale_id: number;
        receipt_no: string;
        subtotal: number;
        total: number;
        cash_received: number;
        change: number;
        created_at: string | null;
        receipt_url: string;
        items: {
            name: string | null;
            qty: number;
            price: number;
            line_total: number;
        }[];
    };
};

type ApiList<T> = {
    data: T[];
};

const currency = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
});

export default function Pos() {
    const { auth } = usePage<SharedData>().props;
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isReceiptOpen, setIsReceiptOpen] = useState(false);
    const [cashReceived, setCashReceived] = useState('');
    const [now, setNow] = useState(new Date());
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [isPostingSale, setIsPostingSale] = useState(false);
    const [lastReceiptUrl, setLastReceiptUrl] = useState<string | null>(null);
    const [lastReceiptNo, setLastReceiptNo] = useState<string | null>(null);
    const [receiptData, setReceiptData] = useState<SaleResponse['data'] | null>(null);
    const searchRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 60_000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const isInput =
                target?.tagName === 'INPUT' ||
                target?.tagName === 'TEXTAREA' ||
                target?.isContentEditable;

            if (!isInput && event.key === '/') {
                event.preventDefault();
                searchRef.current?.focus();
            }

            if (!isInput && event.key === 'Enter' && !isCheckoutOpen) {
                if (cartItems.length > 0) {
                    setIsCheckoutOpen(true);
                }
            }

            if (isCheckoutOpen && event.key === 'Escape') {
                setIsCheckoutOpen(false);
            }

            if (!isInput && event.key.toLowerCase() === 'r' && lastReceiptUrl) {
                window.open(lastReceiptUrl, '_blank', 'width=900,height=800');
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [cartItems.length, isCheckoutOpen, lastReceiptUrl]);

    useEffect(() => {
        let isMounted = true;
        apiFetch<ApiList<Category>>('/api/categories')
            .then((payload) => {
                if (!isMounted) return;
                setCategories(payload.data);
            })
            .catch((error) => {
                if (!isMounted) return;
                setErrorMessage(error.message);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        setIsLoadingProducts(true);
        const timeout = window.setTimeout(() => {
            const categoryId =
                activeCategory === 'All'
                    ? ''
                    : categories.find((category) => category.name === activeCategory)?.id ?? '';

            const params = new URLSearchParams();
            params.set('active_only', '1');
            if (search.trim()) params.set('search', search.trim());
            if (categoryId) params.set('category_id', String(categoryId));

            apiFetch<ApiList<Product>>(`/api/products?${params.toString()}`)
                .then((payload) => {
                    if (!isMounted) return;
                    setProducts(payload.data);
                    setErrorMessage(null);
                })
                .catch((error) => {
                    if (!isMounted) return;
                    setErrorMessage(error.message);
                })
                .finally(() => {
                    if (!isMounted) return;
                    setIsLoadingProducts(false);
                });
        }, 250);

        return () => {
            isMounted = false;
            window.clearTimeout(timeout);
        };
    }, [activeCategory, categories, search]);

    const categoryLabels = useMemo(
        () => ['All', ...categories.map((category) => category.name)],
        [categories],
    );

    const skeletonCards = Array.from({ length: 6 }, (_, index) => index);

    const subtotal = cartItems.reduce(
        (total, item) => total + item.price * item.qty,
        0,
    );

    const total = subtotal;
    const cashValue = Number.parseFloat(cashReceived || '0');
    const change = cashValue - total;

    const getCartQty = (productId: number) =>
        cartItems.find((item) => item.productId === productId)?.qty ?? 0;

    const availableQty = (product: Product) =>
        Math.max(0, product.qty_on_hand - getCartQty(product.id));

    const addToCart = (product: Product) => {
        if (availableQty(product) <= 0) {
            return;
        }

        setCartItems((items) => {
            const existing = items.find((item) => item.productId === product.id);
            if (existing) {
                return items.map((item) =>
                    item.productId === product.id
                        ? { ...item, qty: item.qty + 1 }
                        : item,
                );
            }
            return [
                ...items,
                {
                    productId: product.id,
                    name: product.name,
                    price: product.price,
                    qty: 1,
                },
            ];
        });
    };

    const updateQty = (productId: number, nextQty: number) => {
        const product = products.find((item) => item.id === productId);
        const maxQty = product ? product.qty_on_hand : nextQty;
        const safeQty = Math.min(nextQty, maxQty);

        if (safeQty <= 0) {
            setCartItems((items) =>
                items.filter((item) => item.productId !== productId),
            );
            return;
        }

        setCartItems((items) =>
            items.map((item) =>
                item.productId === productId
                    ? { ...item, qty: safeQty }
                    : item,
            ),
        );
    };

    const handleCheckout = () => {
        if (cartItems.length === 0) {
            return;
        }

        setIsCheckoutOpen(true);
    };

    const handleConfirmSale = async () => {
        if (cartItems.length === 0) {
            return;
        }

        setIsPostingSale(true);
        setErrorMessage(null);

        try {
            const payload = await apiFetch<SaleResponse>('/api/sales', {
                method: 'POST',
                json: {
                    items: cartItems.map((item) => ({
                        product_id: item.productId,
                        qty: item.qty,
                    })),
                    payment_type: 'cash',
                    cash_received: cashValue,
                },
            });

            setLastReceiptUrl(payload.data.receipt_url);
            setLastReceiptNo(payload.data.receipt_no);
            setReceiptData(payload.data);
            setIsReceiptOpen(true);
            setCartItems([]);
            setCashReceived('');
            setIsCheckoutOpen(false);
            setProducts((items) =>
                items.map((product) => {
                    const sold = cartItems.find(
                        (item) => item.productId === product.id,
                    );
                    if (!sold) return product;
                    return {
                        ...product,
                        qty_on_hand: Math.max(0, product.qty_on_hand - sold.qty),
                    };
                }),
            );
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Sale failed.');
        } finally {
            setIsPostingSale(false);
        }
    };

    const handlePrintReceipt = () => {
        if (!receiptData) return;
        window.open(receiptData.receipt_url, '_blank', 'width=900,height=800');
    };

    const handleReprintLast = () => {
        if (!lastReceiptUrl) return;
        window.open(lastReceiptUrl, '_blank', 'width=900,height=800');
    };

    const handleBarcodeLookup = async () => {
        const query = search.trim();
        if (!query || !/^\d+$/.test(query)) return;

        try {
            const payload = await apiFetch<{ data: Product }>(
                `/api/products/by-barcode/${encodeURIComponent(query)}`,
            );
            addToCart(payload.data);
            setSearch('');
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Barcode not found.',
            );
        }
    };

    const displayName = auth?.user?.name ?? 'Cashier';
    const displayRole = auth?.user?.role ?? 'Cashier';

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <Head title="POS" />
            <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
                <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4 px-6">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                            CyGray Market
                        </p>
                        <p className="text-lg font-semibold text-slate-900">POS Terminal</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                        <div className="text-right">
                            <p className="font-semibold text-slate-900">{displayName}</p>
                            <p className="text-xs uppercase tracking-wide">{displayRole}</p>
                        </div>
                        <div className="hidden text-xs text-slate-400 md:block">
                            {now.toLocaleString('en-PH')}
                        </div>
                        {lastReceiptUrl && (
                            <button
                                onClick={handleReprintLast}
                                className="hidden rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 md:inline-flex"
                            >
                                Reprint last (R)
                            </button>
                        )}
                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                        >
                            Logout
                        </Link>
                    </div>
                </div>
            </header>

            <main className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-6 py-6 md:grid-cols-[1.15fr_0.85fr]">
                <section className="flex flex-col gap-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-3">
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 md:text-[10px]">
                            Search
                        </label>
                        <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 md:mt-1 md:px-2 md:py-1.5">
                            <Search className="h-4 w-4 text-slate-400" />
                            <input
                                ref={searchRef}
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        void handleBarcodeLookup();
                                    }
                                }}
                                placeholder="Search products or scan barcode"
                                className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                            />
                            <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase text-slate-400 md:text-[9px]">
                                /
                            </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 md:mt-2 md:gap-1.5">
                            {categoryLabels.map((category) => {
                                const isActive = category === activeCategory;
                                return (
                                    <button
                                        key={category}
                                        onClick={() => setActiveCategory(category)}
                                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                            isActive
                                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                        }`}
                                    >
                                        {category}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {errorMessage && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600">
                            {errorMessage}
                        </div>
                    )}

                    {lastReceiptNo && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-600">
                            Sale posted. Receipt {lastReceiptNo}.
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-4">
                        {isLoadingProducts &&
                            skeletonCards.map((item) => (
                                <div
                                    key={`skeleton-${item}`}
                                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                                >
                                    <div className="space-y-3">
                                        <div className="h-4 w-3/4 animate-pulse rounded-full bg-slate-100" />
                                        <div className="h-3 w-1/3 animate-pulse rounded-full bg-slate-100" />
                                    </div>
                                    <div className="mt-6 flex items-end justify-between">
                                        <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
                                        <div className="h-4 w-16 animate-pulse rounded-full bg-slate-100" />
                                    </div>
                                </div>
                            ))}
                        {!isLoadingProducts && products.length === 0 && (
                            <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                                No products match your search.
                            </div>
                        )}
                        {!isLoadingProducts &&
                            products.map((product) => {
                                const remaining = availableQty(product);
                                const isOut = remaining <= 0;
                                return (
                                    <button
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    disabled={isOut}
                                    className={`group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition ${
                                        isOut
                                            ? 'cursor-not-allowed opacity-60'
                                            : 'hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md'
                                    }`}
                                >
                                    <div className="space-y-2">
                                        <p className="max-h-10 overflow-hidden text-sm font-semibold text-slate-900">
                                            {product.name}
                                        </p>
                                        <p className="text-xs text-slate-400">{product.sku}</p>
                                    </div>
                                    <div className="mt-4 flex items-end justify-between">
                                        <span className="text-lg font-bold text-slate-900">
                                            {currency.format(product.price)}
                                        </span>
                                        {isOut ? (
                                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase text-slate-400">
                                                Out of stock
                                            </span>
                                        ) : (
                                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase text-emerald-600">
                                                {remaining} left
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                            })}
                    </div>
                </section>

                <section className="flex h-full flex-col gap-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Cart
                                </p>
                                <p className="text-lg font-semibold text-slate-900">
                                    Current Sale
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <ShoppingCart className="h-4 w-4" />
                                {cartItems.length} items
                            </div>
                        </div>

                        {cartItems.length === 0 ? (
                            <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                                Scan or add items to begin.
                            </div>
                        ) : (
                            <div className="mt-4 space-y-4">
                                {cartItems.map((item) => (
                                    <div
                                        key={item.productId}
                                        className="flex items-center justify-between gap-4"
                                    >
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">
                                                {item.name}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {currency.format(item.price)} each
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center rounded-lg border border-slate-200 bg-white">
                                                <button
                                                    onClick={() =>
                                                        updateQty(item.productId, item.qty - 1)
                                                    }
                                                    className="px-2 py-1 text-slate-500 hover:text-slate-900"
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </button>
                                                <span className="min-w-[2rem] text-center text-sm font-semibold text-slate-900">
                                                    {item.qty}
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        updateQty(item.productId, item.qty + 1)
                                                    }
                                                    className="px-2 py-1 text-slate-500 hover:text-slate-900"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <div className="w-24 text-right text-sm font-semibold text-slate-900">
                                                {currency.format(item.price * item.qty)}
                                            </div>
                                            <button
                                                onClick={() => updateQty(item.productId, 0)}
                                                className="rounded-lg border border-transparent p-1 text-slate-400 hover:border-slate-200 hover:text-slate-600"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="sticky top-20 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between text-sm text-slate-500">
                            <span>Subtotal</span>
                            <span className="font-semibold text-slate-900">
                                {currency.format(subtotal)}
                            </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-200 pt-3 text-base font-semibold text-slate-900">
                            <span>Total</span>
                            <span className="text-2xl">
                                {currency.format(total)}
                            </span>
                        </div>
                        <button
                            onClick={handleCheckout}
                            disabled={cartItems.length === 0}
                            className={`mt-4 flex h-14 w-full items-center justify-center rounded-xl text-sm font-semibold uppercase tracking-wide transition ${
                                cartItems.length === 0
                                    ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                        >
                            Checkout
                        </button>
                    </div>
                </section>
            </main>

            {isCheckoutOpen && (
                <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/50 p-6">
                    <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Checkout
                                </p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {currency.format(total)}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsCheckoutOpen(false)}
                                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:text-slate-900"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr]">
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Cash received
                                </label>
                                <input
                                    autoFocus
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={cashReceived}
                                    onChange={(event) => setCashReceived(event.target.value)}
                                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Change
                                </label>
                                <div className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-lg font-semibold text-slate-900">
                                    {currency.format(Math.max(change, 0))}
                                </div>
                                {cashReceived && change < 0 && (
                                    <p className="mt-2 text-xs text-rose-500">
                                        Cash received is below the total.
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <button
                                onClick={() => setIsCheckoutOpen(false)}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmSale}
                                disabled={total <= 0 || change < 0 || isPostingSale}
                                className={`rounded-xl px-4 py-2 text-sm font-semibold uppercase tracking-wide ${
                                    total <= 0 || change < 0 || isPostingSale
                                        ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                                        : 'bg-emerald-500 text-white hover:bg-emerald-600'
                                }`}
                            >
                                {isPostingSale ? 'Processing...' : 'Confirm sale'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isReceiptOpen && receiptData && (
                <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/50 p-6">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Receipt
                                </p>
                                <p className="text-lg font-semibold text-slate-900">
                                    {receiptData.receipt_no}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsReceiptOpen(false)}
                                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:text-slate-900"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="mt-4 space-y-2 text-sm text-slate-600">
                            {receiptData.items.map((item, index) => (
                                <div
                                    key={`${item.name}-${index}`}
                                    className="flex items-center justify-between"
                                >
                                    <span>{item.name ?? 'Item'}</span>
                                    <span>{currency.format(item.line_total)}</span>
                                </div>
                            ))}
                            <div className="border-t border-dashed border-slate-200 pt-3 text-base font-semibold text-slate-900">
                                Total {currency.format(receiptData.total)}
                            </div>
                            <div className="text-xs text-slate-500">
                                Cash {currency.format(receiptData.cash_received)} - Change{' '}
                                {currency.format(receiptData.change)}
                            </div>
                        </div>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <button
                                onClick={handlePrintReceipt}
                                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-indigo-700"
                            >
                                Print receipt
                            </button>
                            {lastReceiptUrl && (
                                <button
                                    onClick={handleReprintLast}
                                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:border-slate-300"
                                >
                                    Reprint last (R)
                                </button>
                            )}
                            <button
                                onClick={() => setIsReceiptOpen(false)}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:border-slate-300"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
