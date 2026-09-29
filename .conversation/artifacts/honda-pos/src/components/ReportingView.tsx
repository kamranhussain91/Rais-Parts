import React, { useState, useMemo } from 'react';
import { useApp } from './AppContext';
import {
  Download, Printer, TrendingUp, PackageOpen,
  ShoppingCart, Wrench, ReceiptText, BarChart3, ArrowUpRight, Tag
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid
} from 'recharts';

type Tab = 'sales' | 'profit' | 'expenses' | 'inventory';

const TAB_LABELS: Record<Tab, string> = {
  sales:     'Sales Report',
  profit:    'Profit & Revenue',
  expenses:  'Expense Statement',
  inventory: 'Inventory Audit',
};

const dateOnly = (value: unknown) => String(value || '').slice(0, 10);

const isInDateRange = (value: unknown, from: string, to: string, validRange: boolean) => {
  if (!validRange) return false;
  const date = dateOnly(value);
  return Boolean(date) && (!from || date >= from) && (!to || date <= to);
};

export const ReportingView: React.FC = () => {
  const { db } = useApp();
  const [tab, setTab] = useState<Tab>('sales');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  if (!db) return <div className="p-8 text-slate-400 text-sm">Loading reports...</div>;

  const { invoices, purchases, services, expenses, products, stockAdjustments = [] } = db;
  const validDateRange = !dateFrom || !dateTo || dateFrom <= dateTo;
  const hasDateFilter = Boolean(dateFrom || dateTo);
  const matchesDate = (value: unknown) => isInDateRange(value, dateFrom, dateTo, validDateRange);
  const filteredInvoices = invoices.filter(invoice => matchesDate(invoice.date));
  const filteredServices = services.filter(service => matchesDate(service.date));
  const filteredExpenses = expenses.filter(expense => matchesDate(expense.date));

  // Products have no product-level date, so a selected range filters the
  // inventory audit to products with stock activity during that period.
  const inventoryActivityIds = new Set<string>();
  if (hasDateFilter && validDateRange) {
    filteredInvoices.forEach(invoice => invoice.items?.forEach((item: any) => inventoryActivityIds.add(item.productId)));
    filteredServices.forEach(service => service.parts?.forEach((part: any) => inventoryActivityIds.add(part.productId)));
    purchases.filter(purchase => matchesDate(purchase.date))
      .forEach(purchase => purchase.items?.forEach((item: any) => inventoryActivityIds.add(item.productId)));
    stockAdjustments.filter(adjustment => matchesDate(adjustment.date))
      .forEach(adjustment => inventoryActivityIds.add(adjustment.productId));
  }
  const filteredProducts = hasDateFilter
    ? products.filter(product => inventoryActivityIds.has(product.id))
    : products;
  const dateRangeLabel = !hasDateFilter
    ? 'All dates'
    : dateFrom && dateTo
      ? `${dateFrom} to ${dateTo}`
      : dateFrom
        ? `From ${dateFrom}`
        : `Through ${dateTo}`;

  // ─── CSV Export ───────────────────────────────────────────────────────────
  const exportCSV = (headers: string[], rows: (string | number)[][], name: string) => {
    const csv = [headers, ...rows]
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `${name}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const handleExport = () => {
    if (tab === 'sales') {
      exportCSV(
        ['Invoice No', 'Date', 'Customer', 'Phone', 'Type', 'Payment', 'Discount', 'Amount'],
        [
          ...filteredInvoices
            .map(i => [i.invoiceNumber, i.date.slice(0, 10), i.customerName || '', i.customerPhone || '', 'Parts Sale', i.paymentMethod, i.discount, i.finalAmount] as (string | number)[])
            .concat(filteredServices.map(s => [s.invoiceNumber, s.date.slice(0, 10), s.customerName || '', s.customerPhone || '', 'Workshop', s.bankAccountId === 'cash_chest' || !s.bankAccountId ? 'Cash' : 'Bank Deposit', 0, s.price] as (string | number)[]))
            .sort((a, b) => String(b[1]).localeCompare(String(a[1]))),
        ],
        'sales_report'
      );
    } else if (tab === 'profit') {
      exportCSV(
        ['Ref', 'Date', 'Type', 'Revenue', 'Cost', 'Profit'],
        [
          ...filteredInvoices.map(i => [i.invoiceNumber, i.date.slice(0, 10), 'Sale', i.finalAmount, i.finalAmount - i.profit, i.profit] as (string | number)[]),
          ...filteredServices.map(s => [s.invoiceNumber, s.date.slice(0, 10), 'Service', s.price, s.price - (s.profit ?? s.price), s.profit ?? s.price] as (string | number)[]),
        ],
        'profit_report'
      );
    } else if (tab === 'expenses') {
      exportCSV(
        ['Date', 'Category', 'Description', 'Amount'],
        filteredExpenses.map(e => [e.date.slice(0,10), e.category, e.description, e.amount]),
        'expense_report'
      );
    } else {
      exportCSV(
        ['Part Name', 'Part No', 'Compatibility', 'Cost', 'Selling', 'Stock', 'Value'],
        filteredProducts.map(p => [p.name, p.partNumber || '', p.compatibility || '', p.purchasePrice, p.sellingPrice, p.stock, p.purchasePrice * p.stock]),
        'inventory_audit'
      );
    }
  };

  const handlePrint = () => {
    const previousTitle = document.title;
    document.title = TAB_LABELS[tab];
    window.print();
    window.setTimeout(() => { document.title = previousTitle; }, 500);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 no-print">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-600">Date filter</span>
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            From
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={e => setDateFrom(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-red-400 shadow-sm"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            To
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={e => setDateTo(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-red-400 shadow-sm"
            />
          </label>
          {hasDateFilter && (
            <button
              type="button"
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
          {!validDateRange && (
            <span className="text-xs font-semibold text-red-600">From date must be before To date.</span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold transition-all cursor-pointer shadow-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-all cursor-pointer shadow-sm">
            <Printer className="w-4 h-4" /> Print Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit no-print">
        {(Object.entries(TAB_LABELS) as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              tab === key ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="print-area report-print-area">
        <div className="hidden print:block text-center mb-5">
          <h1 className="text-xl font-bold text-slate-800">{TAB_LABELS[tab]}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Date range: {dateRangeLabel} · Generated {new Date().toLocaleDateString('en-PK')}
          </p>
        </div>

        {/* ── Sales Report ─────────────────────────────────────────────────────── */}
        {tab === 'sales' && <SalesTab invoices={filteredInvoices} services={filteredServices} />}

        {/* ── Profit & Revenue ─────────────────────────────────────────────────── */}
        {tab === 'profit' && <ProfitTab invoices={filteredInvoices} services={filteredServices} />}

        {/* ── Expenses ─────────────────────────────────────────────────────────── */}
        {tab === 'expenses' && <ExpensesTab expenses={filteredExpenses} />}

        {/* ── Inventory Audit ──────────────────────────────────────────────────── */}
        {tab === 'inventory' && (
          <InventoryTab
            products={filteredProducts}
            dateFiltered={hasDateFilter}
            dateRangeLabel={dateRangeLabel}
          />
        )}
      </div>
    </div>
  );
};

// ─── Sales Tab ────────────────────────────────────────────────────────────────
const SalesTab: React.FC<{ invoices: any[]; services: any[] }> = ({ invoices, services }) => {
  const [search, setSearch] = useState('');

  const totalSales    = invoices.reduce((s, i) => s + i.finalAmount, 0) + services.reduce((s, service) => s + service.price, 0);
  const totalDiscount = invoices.reduce((s, i) => s + i.discount,    0);
  const totalProfit   = invoices.reduce((s, i) => s + i.profit,      0);

  const chartData = useMemo(() => {
    const byDate: Record<string, number> = {};
    invoices.forEach(i => {
      const d = i.date.slice(0, 10);
      byDate[d] = (byDate[d] || 0) + i.finalAmount;
    });
    services.forEach(service => {
      const d = service.date.slice(0, 10);
      byDate[d] = (byDate[d] || 0) + service.price;
    });
    return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date: date.slice(5), amount }));
  }, [invoices, services]);

  const filteredInvoices = invoices.filter(i =>
    !search || (i.invoiceNumber + i.customerName + i.customerPhone).toLowerCase().includes(search.toLowerCase())
  );
  const filteredServices = services.filter(service =>
    !search || (service.invoiceNumber + service.customerName + service.customerPhone + (service.parts || []).map((part: any) => part.name).join(' ')).toLowerCase().includes(search.toLowerCase())
  );
  const salesRows = [
    ...filteredInvoices.map(invoice => ({ kind: 'sale' as const, record: invoice })),
    ...filteredServices.map(service => ({ kind: 'service' as const, record: service })),
  ].sort((a, b) => new Date(b.record.date).getTime() - new Date(a.record.date).getTime());

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
         <StatCard icon={<ReceiptText className="w-5 h-5 text-red-500" />} bg="bg-red-50" label="Total Bills" value={`${invoices.length + services.length} slips`} />
        <StatCard icon={<TrendingUp className="w-5 h-5 text-emerald-500" />} bg="bg-emerald-50" label="Gross Revenue" value={`Rs. ${totalSales.toLocaleString()}`} money />
        <StatCard icon={<Tag className="w-5 h-5 text-orange-500" />} bg="bg-orange-50" label="Total Discounts Given" value={`Rs. ${totalDiscount.toLocaleString()}`} money />
      </div>

      {chartData.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Daily Sales Trend</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`Rs. ${v.toLocaleString()}`, 'Sales']} />
              <Line type="monotone" dataKey="amount" stroke="#D32F2F" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

       <div className="flex items-center justify-between no-print">
         <p className="text-xs text-slate-400 font-semibold">{filteredInvoices.length + filteredServices.length} records</p>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search invoices..."
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-red-400 w-52 shadow-sm"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full report-table">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {['Invoice No', 'Date', 'Customer', 'Type', 'Payment', 'Discount', 'Amount'].map(h => (
                <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
             {filteredInvoices.length === 0 && filteredServices.length === 0 && (
               <tr><td colSpan={7} className="py-12 text-center text-slate-400 text-sm">No sales or workshop bills found.</td></tr>
            )}
             {salesRows.map(row => row.kind === 'sale' ? (() => {
               const inv = row.record;
               return (
              <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-3.5">
                  <span className="text-xs font-bold text-red-600 font-mono">{inv.invoiceNumber}</span>
                </td>
                <td className="px-5 py-3.5 text-xs text-slate-500 font-mono">{inv.date.slice(0, 10)}</td>
                <td className="px-5 py-3.5">
                  <p className="text-xs font-semibold text-slate-800">{inv.customerName || 'Walk-in'}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{inv.customerPhone || ''}</p>
                </td>
                <td className="px-5 py-3.5">
                   <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700">Parts Sale</span>
                 </td>
                 <td className="px-5 py-3.5">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">{inv.paymentMethod}</span>
                </td>
                <td className="px-5 py-3.5 text-xs font-mono text-orange-500">
                  {inv.discount > 0 ? `Rs. ${inv.discount}` : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-5 py-3.5 text-sm font-bold font-mono text-slate-900">Rs. {inv.finalAmount.toLocaleString()}</td>
              </tr>
               );
             })() : (() => {
               const service = row.record;
               return (
               <tr key={service.id} className="hover:bg-slate-50/50 transition-colors">
                 <td className="px-5 py-3.5"><span className="text-xs font-bold text-blue-600 font-mono">{service.invoiceNumber}</span></td>
                 <td className="px-5 py-3.5 text-xs text-slate-500 font-mono">{service.date.slice(0, 10)}</td>
                 <td className="px-5 py-3.5"><p className="text-xs font-semibold text-slate-800">{service.customerName || 'Walk-in'}</p><p className="text-[10px] text-slate-400 font-mono">{service.customerPhone || ''}</p></td>
                 <td className="px-5 py-3.5"><span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">Workshop</span></td>
                 <td className="px-5 py-3.5"><span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">Paid</span></td>
                 <td className="px-5 py-3.5 text-xs text-slate-300">—</td>
                 <td className="px-5 py-3.5 text-sm font-bold font-mono text-slate-900">Rs. {service.price.toLocaleString()}</td>
               </tr>
               );
             })())}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Profit Tab ───────────────────────────────────────────────────────────────
const ProfitTab: React.FC<{ invoices: any[]; services: any[] }> = ({ invoices, services }) => {
  const saleProfit    = invoices.reduce((s, i) => s + i.profit, 0);
  const serviceProfit = services.reduce((s, v) => s + (v.profit ?? v.price), 0);
  const totalProfit   = saleProfit + serviceProfit;

  const rows = [
    ...invoices.map(i => ({ id: i.id, ref: i.invoiceNumber, date: i.date.slice(0,10), type: 'Sale', revenue: i.finalAmount, cost: i.finalAmount - i.profit, profit: i.profit })),
    ...services.map(s => ({ id: s.id, ref: s.invoiceNumber, date: s.date.slice(0,10), type: 'Service', revenue: s.price, cost: s.price - (s.profit ?? s.price), profit: s.profit ?? s.price })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<ShoppingCart className="w-5 h-5 text-red-500" />} bg="bg-red-50" label="Parts Sales Margin" value={`Rs. ${saleProfit.toLocaleString()}`} money />
        <StatCard icon={<Wrench className="w-5 h-5 text-blue-500" />} bg="bg-blue-50" label="Workshop Revenue" value={`Rs. ${serviceProfit.toLocaleString()}`} money />
        <StatCard icon={<BarChart3 className="w-5 h-5 text-emerald-500" />} bg="bg-emerald-50" label="Total Net Profit" value={`Rs. ${totalProfit.toLocaleString()}`} money />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full report-table">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {['Ref', 'Date', 'Type', 'Revenue', 'Cost', 'Profit'].map(h => (
                <th key={h} className={`px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider ${h === 'Revenue' || h === 'Cost' || h === 'Profit' ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-3.5 text-xs font-bold font-mono text-red-600">{r.ref}</td>
                <td className="px-5 py-3.5 text-xs font-mono text-slate-500">{r.date}</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${r.type === 'Sale' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    {r.type}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right text-xs font-mono text-slate-700">Rs. {r.revenue.toLocaleString()}</td>
                <td className="px-5 py-3.5 text-right text-xs font-mono text-slate-400">{r.cost > 0 ? `Rs. ${r.cost.toLocaleString()}` : '—'}</td>
                <td className="px-5 py-3.5 text-right text-sm font-bold font-mono text-emerald-600">Rs. {r.profit.toLocaleString()}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-slate-400 text-sm">No profit data yet.</td></tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-slate-100 bg-slate-50/60">
                <td colSpan={3} className="px-5 py-3 text-xs font-bold text-slate-600">Total</td>
                <td className="px-5 py-3 text-right text-xs font-bold font-mono text-slate-700">
                  Rs. {rows.reduce((s, r) => s + r.revenue, 0).toLocaleString()}
                </td>
                <td className="px-5 py-3 text-right text-xs font-bold font-mono text-slate-400">
                  Rs. {rows.reduce((s, r) => s + r.cost, 0).toLocaleString()}
                </td>
                <td className="px-5 py-3 text-right text-sm font-bold font-mono text-emerald-600">
                  Rs. {totalProfit.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

// ─── Expenses Tab ─────────────────────────────────────────────────────────────
const ExpensesTab: React.FC<{ expenses: any[] }> = ({ expenses }) => {
  const [search, setSearch] = useState('');

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
  const categories  = [...new Set(expenses.map(e => e.category))];
  const biggestCat  = categories.reduce((max, cat) => {
    const sum = expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
    return sum > (expenses.filter(e => e.category === max).reduce((s, e) => s + e.amount, 0)) ? cat : max;
  }, categories[0] || '');

  const chartData = useMemo(() => {
    const byCat: Record<string, number> = {};
    expenses.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
    return Object.entries(byCat).map(([cat, amt]) => ({ cat, amt }));
  }, [expenses]);

  const filtered = expenses.filter(e =>
    !search || (e.description + e.category).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<ReceiptText className="w-5 h-5 text-red-500" />} bg="bg-red-50" label="Total Expenses" value={`Rs. ${totalAmount.toLocaleString()}`} money />
        <StatCard icon={<BarChart3 className="w-5 h-5 text-slate-500" />} bg="bg-slate-100" label="Categories" value={`${categories.length} types`} />
        <StatCard icon={<TrendingUp className="w-5 h-5 text-orange-500" />} bg="bg-orange-50" label="Biggest Category" value={biggestCat || '—'} />
      </div>

      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Expenses by Category</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData} barCategoryGap="30%">
              <XAxis dataKey="cat" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`Rs. ${v.toLocaleString()}`, 'Amount']} />
              <Bar dataKey="amt" fill="#D32F2F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

       <div className="flex items-center justify-between no-print">
        <p className="text-xs text-slate-400 font-semibold">{filtered.length} records</p>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search expenses..."
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-red-400 w-52 shadow-sm"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full report-table">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {['Date', 'Category', 'Description', 'Amount'].map(h => (
                <th key={h} className={`px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider ${h === 'Amount' ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="py-12 text-center text-slate-400 text-sm">No expenses found.</td></tr>
            )}
            {filtered.map(e => (
              <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-3.5 text-xs font-mono text-slate-500 whitespace-nowrap">{e.date.slice(0, 10)}</td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">{e.category}</span>
                </td>
                <td className="px-5 py-3.5 text-xs text-slate-700">{e.description}</td>
                <td className="px-5 py-3.5 text-right text-sm font-bold font-mono text-red-600">Rs. {e.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Inventory Tab ────────────────────────────────────────────────────────────
const InventoryTab: React.FC<{
  products: any[];
  dateFiltered: boolean;
  dateRangeLabel: string;
}> = ({ products, dateFiltered, dateRangeLabel }) => {
  const [search,   setSearch]   = useState('');
  const [lowOnly,  setLowOnly]  = useState(false);

  const totalValue   = products.reduce((s, p) => s + p.purchasePrice * p.stock, 0);
  const lowStockCount = products.filter(p => p.stock <= (p.lowStockAlert || 5)).length;
  const totalUnits   = products.reduce((s, p) => s + p.stock, 0);

  const filtered = products.filter(p => {
    const matchSearch = !search || (p.name + p.partNumber + p.compatibility).toLowerCase().includes(search.toLowerCase());
    const matchLow    = !lowOnly || p.stock <= (p.lowStockAlert || 5);
    return matchSearch && matchLow;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<PackageOpen className="w-5 h-5 text-red-500" />} bg="bg-red-50" label="Total Products" value={`${products.length} items`} />
        <StatCard icon={<BarChart3 className="w-5 h-5 text-emerald-500" />} bg="bg-emerald-50" label="Stock Value" value={`Rs. ${totalValue.toLocaleString()}`} money />
        <StatCard icon={<ArrowUpRight className="w-5 h-5 text-orange-500" />} bg="bg-orange-50" label="Low Stock Alerts" value={`${lowStockCount} items`} />
      </div>

      {dateFiltered && (
        <div className="px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
          Showing products with inventory activity during <span className="font-bold">{dateRangeLabel}</span>. Stock and value are the current inventory snapshot.
        </div>
      )}

       <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div className="flex items-center gap-3">
          <p className="text-xs text-slate-400 font-semibold">{filtered.length} products · {totalUnits} total units</p>
          <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
            <input type="checkbox" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} className="accent-red-600 cursor-pointer" />
            Low stock only
          </label>
        </div>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search parts..."
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-red-400 w-52 shadow-sm"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full report-table">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {['Part Name', 'Part No', 'Compatibility', 'Cost', 'Selling', 'Stock', 'Value'].map(h => (
                <th key={h} className={`px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider ${['Cost','Selling','Stock','Value'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="py-12 text-center text-slate-400 text-sm">No products found.</td></tr>
            )}
            {filtered.map(p => {
              const isLow = p.stock <= (p.lowStockAlert || 5);
              return (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="text-xs font-bold text-slate-800">{p.name}</p>
                    {p.barcode && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.barcode}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-xs font-mono text-slate-500">{p.partNumber || '—'}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">{p.compatibility || '—'}</td>
                  <td className="px-5 py-3.5 text-right text-xs font-mono text-slate-600">Rs. {p.purchasePrice.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-right text-xs font-mono text-slate-700">Rs. {p.sellingPrice.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                      isLow ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-xs font-bold font-mono text-slate-700">
                    Rs. {(p.purchasePrice * p.stock).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Reusable Stat Card ───────────────────────────────────────────────────────
const StatCard: React.FC<{ icon: React.ReactNode; bg: string; label: string; value: string; money?: boolean }> = ({ icon, bg, label, value, money }) => (
  <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
      {icon}
    </div>
    <div>
      <p className="text-[11px] text-slate-400 font-semibold">{label}</p>
      <p className={`text-lg font-bold ${money ? 'font-mono text-slate-800' : 'text-slate-800'}`}>{value}</p>
    </div>
  </div>
);
