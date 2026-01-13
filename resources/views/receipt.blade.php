<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Receipt {{ $sale->receipt_no }}</title>
        <style>
            body {
                font-family: "Courier New", Courier, monospace;
                padding: 24px;
                color: #111827;
            }
            h1 {
                font-size: 16px;
                margin: 0 0 8px;
            }
            .meta {
                font-size: 12px;
                color: #6b7280;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 12px;
            }
            td {
                padding: 4px 0;
                font-size: 12px;
            }
            td:last-child {
                text-align: right;
            }
            .total {
                font-weight: bold;
                border-top: 1px solid #111827;
                padding-top: 8px;
                margin-top: 8px;
            }
            .actions {
                margin-top: 16px;
            }
            .button {
                border: 1px solid #d1d5db;
                background: #fff;
                padding: 6px 10px;
                font-size: 12px;
                cursor: pointer;
            }
            @media print {
                .actions {
                    display: none;
                }
            }
        </style>
    </head>
    <body>
        <h1>CyGray Market</h1>
        <div class="meta">Receipt: {{ $sale->receipt_no }}</div>
        <div class="meta">{{ $sale->created_at?->format('Y-m-d H:i') }}</div>

        <table>
            @foreach ($sale->items as $item)
                <tr>
                    <td>{{ $item->product?->name ?? 'Item' }}</td>
                    <td>{{ rtrim(rtrim(number_format((float) $item->qty, 3, '.', ''), '0'), '.') }}</td>
                    <td>PHP {{ number_format((float) $item->line_total, 2) }}</td>
                </tr>
            @endforeach
        </table>

        <div class="total">TOTAL: PHP {{ number_format((float) $sale->total, 2) }}</div>
        <div class="meta">Cash: PHP {{ number_format((float) $sale->cash_received, 2) }}</div>
        <div class="meta">Change: PHP {{ number_format((float) $sale->change, 2) }}</div>

        <div class="actions">
            <button class="button" onclick="window.print()">Print again</button>
        </div>

        <script>
            window.addEventListener('load', () => {
                window.print();
            });
        </script>
    </body>
</html>
