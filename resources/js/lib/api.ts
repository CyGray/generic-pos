export type ApiError = {
    message: string;
};

const getCsrfToken = () =>
    document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

const getCookie = (name: string) => {
    const value = document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith(`${name}=`));
    return value ? decodeURIComponent(value.split('=')[1] ?? '') : null;
};

export async function apiFetch<T>(url: string, options: RequestInit & { json?: unknown } = {}) {
    const headers = new Headers(options.headers);
    headers.set('X-Requested-With', 'XMLHttpRequest');

    const method = (options.method ?? 'GET').toUpperCase();
    const csrfToken = getCsrfToken();
    const xsrfToken = getCookie('XSRF-TOKEN');

    if (csrfToken) {
        headers.set('X-CSRF-TOKEN', csrfToken);
    }
    if (xsrfToken) {
        headers.set('X-XSRF-TOKEN', xsrfToken);
    }

    if (options.json !== undefined) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'same-origin',
        body: options.json ? JSON.stringify(options.json) : options.body,
    });

    if (!response.ok) {
        let message = 'Request failed.';
        try {
            const payload = await response.json();
            message = payload?.message ?? message;
        } catch {
            // ignore parse errors
        }
        throw new Error(message);
    }

    return (await response.json()) as T;
}
