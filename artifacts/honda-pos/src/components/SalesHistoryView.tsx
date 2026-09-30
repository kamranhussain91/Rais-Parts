import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useApp } from './AppContext';
import { SaleInvoice, SaleItem, Product, ServiceRecord } from '../types';
import { EditServiceModal, ReceiptModal as WorkshopReceiptModal } from './WorkshopView';
import {
  Search,
  Printer,
  X,
  Edit3,
  ChevronDown,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Trash2,
  Package,
} from 'lucide-react';
import {
  InvoicePrintFooter,
  InvoicePrintHeader,
  ThermalInvoice,
} from '../lib/thermal-print';

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
};

const today = () => new Date().toISOString().slice(0, 10);
const sevenDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
};

const getSalesHistoryPaymentLabel = (
  record: Pick<SaleInvoice, 'paymentMethod' | 'bankAccountId'> | Pick<ServiceRecord, 'bankAccountId'>
) => {
  if ('paymentMethod' in record) {
    return record.paymentMethod === 'Cash' ? 'Cash' : 'Bank Deposit';
  }
  return !record.bankAccountId || record.bankAccountId === 'cash_chest' ? 'Cash' : 'Bank Deposit';
};

const getInvoicePaymentAccountLabel = (
  invoice: SaleInvoice,
  accounts: { id: string; bankName: string }[]
) => {
  if (invoice.paymentMethod === 'Cash' || invoice.bankAccountId === 'cash_chest') return 'Cash';
  return accounts.find(account => account.id === invoice.bankAccountId)?.bankName || 'Bank Deposit';
};

// ── Receipt Modal ────────────────────────────────────────────────────────────
const ReceiptModal: React.FC<{
  invoice: SaleInvoice;
  accounts?: { id: string; bankName: string }[];
  onClose: () => void;
}> = ({ invoice, accounts = [], onClose }) => {
  const [printFormat, setPrintFormat] = useState<'A4' | 'Thermal'>('Thermal');
  const paymentLabel = getInvoicePaymentAccountLabel(invoice, accounts);

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 bg-neutral-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${printFormat === 'A4' ? 'max-w-4xl' : 'max-w-lg'} border border-neutral-100 flex flex-col`}
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        <InvoicePrintHeader
          format={printFormat}
          onFormatChange={setPrintFormat}
          invoiceNumber={invoice.invoiceNumber}
          credit={invoice.paymentStatus === 'Partial' || (invoice as any).amountDue > 0}
          onClose={onClose}
        />

        <div className={`overflow-y-auto flex-1 print-area bg-white p-4 ${printFormat === 'Thermal' ? 'thermal-print-container thermal-paper-80x210' : ''}`}>
          {printFormat === 'Thermal' ? (
            <ThermalInvoice
              invoiceNumber={invoice.invoiceNumber}
              date={invoice.date}
              customerName={invoice.customerName}
              customerPhone={invoice.customerPhone}
              customerBikeModel={invoice.customerBikeModel}
              items={invoice.items.map((item: SaleItem) => ({
                id: item.productId,
                name: item.name,
                qty: item.qty,
                amount: item.sellingPrice * item.qty,
              }))}
              subtotal={invoice.subtotal}
              discount={invoice.discount}
              taxRate={(invoice as any).taxRate}
              taxAmount={(invoice as any).taxAmount}
              finalAmount={invoice.finalAmount}
              paymentLabel={paymentLabel}
              amountPaid={(invoice as any).amountPaid}
              amountDue={(invoice as any).amountDue}
            />
          ) : (
            <div className="text-neutral-800 text-xs font-sans leading-relaxed p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black text-red-600 uppercase tracking-widest">RAIS MOTOR LABS & PARTS</h1>
                  <p className="text-neutral-500 font-mono text-xs">Automotive Workshop, Tuning & Wholesalers</p>
                  <p className="text-neutral-400 mt-2 text-xs">Allama Iqbal Road, Dharampura, Lahore<br />Tel: 042-36814912 | NTN: 7721590-3</p>
                </div>
                <div className="text-right">
                  <div className="px-3 py-1 bg-red-50 inline-block rounded text-red-700 font-extrabold uppercase text-xs border border-red-100">CASH TRANSACTION SLIP</div>
                  <p className="text-neutral-500 mt-3 font-mono text-[10px]">
                    <strong>Invoice #:</strong> {invoice.invoiceNumber}<br />
                    <strong>Date:</strong> {new Date(invoice.date).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="border-b border-neutral-200 my-4" />
              <div className="grid grid-cols-2 gap-4 text-[11px] mb-4">
                <div>
                  <p className="font-bold text-neutral-600 uppercase text-[9px] tracking-wider mb-1">Bill To</p>
                  <p className="font-semibold">{invoice.customerName}</p>
                  {invoice.customerPhone !== 'N/A' && <p className="text-neutral-500">{invoice.customerPhone}</p>}
                  {invoice.customerAddress && <p className="text-neutral-500">{invoice.customerAddress}</p>}
                  {invoice.customerBikeModel && <p className="text-neutral-500">Bike: {invoice.customerBikeModel}</p>}
                </div>
                <div className="text-right">
                  <p className="font-bold text-neutral-600 uppercase text-[9px] tracking-wider mb-1">Payment Info</p>
                   <p className="font-semibold">{paymentLabel}</p>
                  <p className="text-neutral-500">Terminal: {(invoice as any).terminalId || 'T1'}</p>
                </div>
              </div>
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-neutral-800 text-white">
                    <th className="text-left p-2 rounded-tl font-semibold">Item</th>
                    <th className="text-center p-2 font-semibold">Qty</th>
                    <th className="text-right p-2 font-semibold">Unit Price</th>
                    <th className="text-right p-2 rounded-tr font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item: SaleItem, i: number) => (
                    <tr key={item.productId} className={i % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}>
                      <td className="p-2 font-medium">{item.name}</td>
                      <td className="p-2 text-center">{item.qty}</td>
                      <td className="p-2 text-right font-mono">Rs. {item.sellingPrice.toLocaleString()}</td>
                      <td className="p-2 text-right font-mono font-semibold">Rs. {(item.sellingPrice * item.qty).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end mt-4">
                <div className="w-60 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-neutral-600"><span>Subtotal</span><span className="font-mono">Rs. {invoice.subtotal.toLocaleString()}</span></div>
                  {invoice.discount > 0 && <div className="flex justify-between text-rose-600"><span>Discount</span><span className="font-mono">-Rs. {invoice.discount.toLocaleString()}</span></div>}
                  <div className="flex justify-between text-neutral-600"><span>GST ({(invoice as any).taxRate ?? 18}%)</span><span className="font-mono">+Rs. {((invoice as any).taxAmount ?? 0).toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold text-sm pt-2 border-t border-neutral-200"><span>TOTAL</span><span className="font-mono text-red-600">Rs. {invoice.finalAmount.toLocaleString()}</span></div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-neutral-100 text-center text-[10px] text-neutral-400">
                <p className="font-semibold text-neutral-600">Thank you for your business!</p>
                <p>Genuine Honda parts guarantee engine performance & safety.</p>
              </div>
            </div>
          )}
        </div>
        <InvoicePrintFooter onPrint={handlePrint} onClose={onClose} />
      </div>
    </div>
  );
};

// ── Product Dropdown for Sales (fixed-position portal) ───────────────────────
interface SaleProductDropdownProps {
  products: Product[];
  selectedId: string;
  onSelect: (p: Product) => void;
}
const SaleProductDropdown: React.FC<SaleProductDropdownProps> = ({ products, selectedId, onSelect }) => {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');
  const triggerRef            = useRef<HTMLButtonElement>(null);
  const dropdownRef           = useRef<HTMLDivElement>(null);
  const inputRef              = useRef<HTMLInputElement>(null);
  const [pos, setPos]         = useState({ top: 0, left: 0, width: 0 });

  const selected = products.find(p => p.id === selectedId);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return products.slice(0, 30);
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.partNumber || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q) ||
      (p.compatibility || '').toLowerCase().includes(q)
    ).slice(0, 30);
  }, [products, query]);

  const reposition = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);

  useEffect(() => {
    if (!open) return;
    reposition();
    setTimeout(() => inputRef.current?.focus(), 50);
    const handleScroll = () => setOpen(false);
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!triggerRef.current?.contains(e.target as Node) && !dropdownRef.current?.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 border border-slate-200 rounded-md text-xs bg-white hover:border-red-400 focus:border-red-400 outline-none transition-colors cursor-pointer"
      >
        {selected ? (
          <span className="truncate text-left">
            <span className="font-semibold text-slate-800">{selected.name}</span>
            <span className="text-slate-400 ml-1 font-mono text-[10px]">{selected.partNumber}</span>
          </span>
        ) : (
          <span className="text-slate-400 flex items-center gap-1.5"><Package className="w-3 h-3" /> Search product…</span>
        )}
        <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 ml-1 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && typeof document !== 'undefined' && (
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: Math.max(pos.width, 300), zIndex: 9999 }}
          className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
        >
          <div className="p-2 border-b border-slate-100">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search name, part #, barcode…"
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-red-400"
            />
          </div>
          <div className="overflow-y-auto max-h-48">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-xs text-slate-400 text-center">No products found</p>
            ) : filtered.map(p => (
              <button
                key={p.id}
                type="button"
                onMouseDown={() => { onSelect(p); setQuery(''); setOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-red-50 transition-colors flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{p.partNumber} · Stock: {p.stock}</p>
                </div>
                <span className="text-xs font-bold text-red-600 font-mono shrink-0">Rs.{p.sellingPrice.toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

// ── Edit Invoice Modal ───────────────────────────────────────────────────────
const EditInvoiceModal: React.FC<{
  invoice: SaleInvoice;
  onSave: (updates: Partial<SaleInvoice> & { notes?: string; items?: SaleItem[] }) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}> = ({ invoice, onSave, onClose, saving }) => {
  const { db } = useApp();
  const [customerName,     setCustomerName]     = useState(invoice.customerName);
  const [customerPhone,    setCustomerPhone]     = useState(invoice.customerPhone);
  const [customerAddress,  setCustomerAddress]   = useState(invoice.customerAddress || '');
  const [customerBikeModel,setCustomerBikeModel] = useState(invoice.customerBikeModel || '');
  const [paymentMethod,    setPaymentMethod]     = useState(invoice.paymentMethod);
  const [bankAccountId,    setBankAccountId]     = useState(invoice.bankAccountId || 'cash_chest');
  const [discount,         setDiscount]          = useState(invoice.discount);
  const [notes,            setNotes]             = useState((invoice as any).notes || '');
  const [items,            setItems]             = useState<SaleItem[]>([...invoice.items]);

  const accounts  = db?.accounts  || [];
  const products  = db?.products  || [];
  const taxRate   = (invoice as any).taxRate ?? 18;

  const subtotal    = items.reduce((s, i) => s + i.sellingPrice * i.qty, 0);
  const taxable     = Math.max(0, subtotal - discount);
  const taxAmount   = Math.round(taxable * (taxRate / 100));
  const finalAmount = taxable + taxAmount;

  const addItem = () => setItems(prev => [...prev, {
    productId: '', name: '', partNumber: '', qty: 1, sellingPrice: 0, purchasePrice: 0,
  }]);

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof SaleItem, value: string | number) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  const handleProductSelect = (idx: number, p: Product) =>
    setItems(prev => prev.map((item, i) => i === idx ? {
      ...item,
      productId:     p.id,
      name:          p.name,
      partNumber:    p.partNumber || '',
      sellingPrice:  p.sellingPrice,
      purchasePrice: p.purchasePrice,
    } : item));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0)              return alert('At least one item is required.');
    if (items.some(i => !i.productId))  return alert('Please select a product for every item row.');
    if (items.some(i => i.qty < 1))     return alert('Quantity must be at least 1.');
    await onSave({ customerName, customerPhone, customerAddress, customerBikeModel, paymentMethod, bankAccountId, discount, notes, items });
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-neutral-100 max-h-[95vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Edit Sale Invoice</h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">#{invoice.invoiceNumber}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-400 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-5 space-y-5 overflow-y-auto flex-1">

            {/* Customer */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Customer Information</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Name</label>
                  <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Phone</label>
                  <input type="text" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Bike Model</label>
                  <input type="text" value={customerBikeModel} onChange={e => setCustomerBikeModel(e.target.value)}
                    placeholder="e.g. CD-70"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Address</label>
                  <input type="text" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20" />
                </div>
              </div>
            </div>

            {/* Payment */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Payment</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Method</label>
                   <select
                     value={bankAccountId}
                     onChange={e => {
                       const accountId = e.target.value;
                       setBankAccountId(accountId);
                       setPaymentMethod(accountId === 'cash_chest' ? 'Cash' : 'Bank Transfer');
                     }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-red-400 bg-white cursor-pointer">
                     {accounts.map(account => (
                       <option key={account.id} value={account.id}>
                         {account.id === 'cash_chest' ? 'Cash' : account.bankName}
                       </option>
                     ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Discount (Rs.)</label>
                  <input type="number" min={0} value={discount} onChange={e => setDiscount(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20" />
                </div>
              </div>
            </div>

            {/* ── Items ──────────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Items
                  <span className="ml-2 text-slate-400 font-normal normal-case">({items.length} {items.length === 1 ? 'item' : 'items'})</span>
                </p>
                <button type="button" onClick={addItem}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-600 hover:text-red-700 rounded-lg text-[11px] font-semibold transition-all cursor-pointer">
                  <Plus className="w-3 h-3" /> Add Item
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                {/* Column headers */}
                <div className="grid gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                  style={{ gridTemplateColumns: '1fr 60px 90px 80px 28px' }}>
                  <span>Product</span>
                  <span className="text-center">Qty</span>
                  <span className="text-center">Unit Price</span>
                  <span className="text-right">Total</span>
                  <span />
                </div>

                {/* Item rows */}
                <div className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <div key={idx} className="grid gap-2 px-3 py-2.5 items-center hover:bg-slate-50/50"
                      style={{ gridTemplateColumns: '1fr 60px 90px 80px 28px' }}>
                      <SaleProductDropdown
                        products={products}
                        selectedId={item.productId}
                        onSelect={p => handleProductSelect(idx, p)}
                      />
                      <input
                        type="number" min={1} value={item.qty}
                        onChange={e => updateItem(idx, 'qty', Math.max(1, Number(e.target.value)))}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs font-mono text-center outline-none focus:border-red-400"
                      />
                      <input
                        type="number" min={0} value={item.sellingPrice || ''}
                        onChange={e => updateItem(idx, 'sellingPrice', Math.max(0, Number(e.target.value)))}
                        placeholder="0"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs font-mono text-center outline-none focus:border-red-400"
                      />
                      <span className="text-right font-mono text-xs font-bold text-slate-800">
                        Rs.{(item.qty * item.sellingPrice).toLocaleString()}
                      </span>
                      <button type="button" onClick={() => removeItem(idx)}
                        disabled={items.length === 1}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Totals footer */}
                <div className="border-t-2 border-slate-200 bg-slate-50 px-3 py-3 space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span className="font-semibold">Subtotal</span>
                    <span className="font-mono">Rs. {subtotal.toLocaleString()}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-xs text-rose-600">
                      <span className="font-semibold">Discount</span>
                      <span className="font-mono">-Rs. {discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-slate-500">
                    <span className="font-semibold">GST ({taxRate}%)</span>
                    <span className="font-mono">+Rs. {taxAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-200">
                    <span className="text-slate-800">Total</span>
                    <span className="font-mono text-red-600">Rs. {finalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="Optional note about this sale..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20 resize-none" />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-5 py-4 border-t border-slate-100 shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? (
                <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
              ) : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Sales History View ──────────────────────────────────────────────────
export const SalesHistoryView: React.FC = () => {
  const { db, updateSaleInvoice, updateServiceRecord, currentUser } = useApp();
  const canEdit = currentUser?.role === 'Super Admin';
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(sevenDaysAgo());
  const [dateTo, setDateTo] = useState(today());
  const [editInvoice, setEditInvoice] = useState<SaleInvoice | null>(null);
  const [printInvoice, setPrintInvoice] = useState<SaleInvoice | null>(null);
  const [editService, setEditService] = useState<ServiceRecord | null>(null);
  const [printService, setPrintService] = useState<ServiceRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const invoices = useMemo(() => {
    if (!db) return [];
    return [...db.invoices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [db]);
  const services = useMemo(() => {
    if (!db) return [];
    return [...db.services].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [db]);

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const invDate = inv.date.slice(0, 10);
      if (invDate < dateFrom || invDate > dateTo) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.customerPhone.toLowerCase().includes(q)
      );
    });
  }, [invoices, search, dateFrom, dateTo]);

  const filteredServices = useMemo(() => services.filter(service => {
    const serviceDate = service.date.slice(0, 10);
    if (serviceDate < dateFrom || serviceDate > dateTo) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      service.invoiceNumber.toLowerCase().includes(q) ||
      service.customerName.toLowerCase().includes(q) ||
      service.customerPhone.toLowerCase().includes(q) ||
      (service.parts || []).some(part => `${part.name} ${part.partNumber}`.toLowerCase().includes(q))
    );
  }), [services, search, dateFrom, dateTo]);

  const combinedFiltered = useMemo(() => [
    ...filtered.map(invoice => ({ kind: 'sale' as const, record: invoice })),
    ...filteredServices.map(service => ({ kind: 'service' as const, record: service })),
  ].sort((a, b) => new Date(b.record.date).getTime() - new Date(a.record.date).getTime()), [filtered, filteredServices]);

  const handleSave = async (updates: Partial<SaleInvoice> & { notes?: string }) => {
    if (!editInvoice) return;
    setSaving(true);
    const ok = await updateSaleInvoice(editInvoice.id, updates);
    setSaving(false);
    if (ok) setEditInvoice(null);
    else alert('Failed to save changes. Please try again.');
  };

  const getFbrBadge = (inv: SaleInvoice) => {
    const status = (inv as any).fbrStatus;
    if (status === 'Approved') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">completed</span>;
    if (status === 'Rejected') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">rejected</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">pending</span>;
  };

  if (!db) return <div className="p-8 text-slate-400">Loading...</div>;

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 pb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search invoice or customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/15 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-slate-500">From</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/15 cursor-pointer" />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-slate-500">To</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/15 cursor-pointer" />
        </div>

        <div className="shrink-0 px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-500">
           {filtered.length + filteredServices.length} result{filtered.length + filteredServices.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Invoice No</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Items</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Payment</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total</th>
                <th className="text-center px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-center px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {combinedFiltered.map(entry => {
                if (entry.kind === 'sale') {
                  const inv = entry.record;
                  return (
                <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="px-4 py-3">
                    <span className="text-red-600 font-bold text-xs font-mono">
                      {inv.invoiceNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{formatDate(inv.date)}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{inv.customerName}</p>
                      {inv.customerPhone && inv.customerPhone !== 'N/A' && (
                        <p className="text-[11px] text-slate-400 font-mono">{inv.customerPhone}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {inv.items.length} item{inv.items.length !== 1 ? 's' : ''}
                  </td>
                   <td className="px-4 py-3 text-xs text-slate-600 font-medium">{getSalesHistoryPaymentLabel(inv)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-bold text-slate-800 font-mono">Rs. {inv.finalAmount.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3 text-center">{getFbrBadge(inv)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {canEdit && (
                        <button
                          onClick={() => setEditInvoice(inv)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-500 hover:text-blue-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => setPrintInvoice(inv)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-500 hover:text-red-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print
                      </button>
                    </div>
                  </td>
                </tr>
                  );
                }
                const service = entry.record;
                return (
                <tr key={service.id} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="px-4 py-3"><span className="text-blue-600 font-bold text-xs font-mono">{service.invoiceNumber}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-600">{formatDate(service.date)}</td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-800">{service.customerName}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{service.customerPhone}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {((service.serviceLines?.length || 0) + (service.parts?.length || 0))} line{((service.serviceLines?.length || 0) + (service.parts?.length || 0)) !== 1 ? 's' : ''}
                  </td>
                   <td className="px-4 py-3 text-xs text-slate-600 font-medium">{getSalesHistoryPaymentLabel(service)}</td>
                  <td className="px-4 py-3 text-right"><span className="text-sm font-bold text-slate-800 font-mono">Rs. {service.price.toLocaleString()}</span></td>
                  <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">Workshop</span></td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {canEdit && (
                        <button
                          onClick={() => setEditService(service)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-500 hover:text-blue-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => setPrintService(service)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-500 hover:text-red-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>

           {filtered.length === 0 && filteredServices.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Search className="w-6 h-6 text-slate-300" />
              </div>
               <p className="text-sm font-semibold text-slate-400">No sales or workshop bills found</p>
              <p className="text-xs text-slate-300 mt-1">Try adjusting the date range or search query</p>
            </div>
          )}
        </div>

        {/* Summary footer */}
         {filtered.length + filteredServices.length > 0 && (
          <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
               {filtered.length + filteredServices.length} bill{filtered.length + filteredServices.length !== 1 ? 's' : ''} shown
            </span>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-slate-500">Total Revenue:</span>
              <span className="font-black text-red-600 font-mono text-sm">
                 Rs. {(filtered.reduce((s, inv) => s + inv.finalAmount, 0) + filteredServices.reduce((s, service) => s + service.price, 0)).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {editInvoice && (
        <EditInvoiceModal
          invoice={editInvoice}
          onSave={handleSave}
          onClose={() => setEditInvoice(null)}
          saving={saving}
        />
      )}
      {editService && (
        <EditServiceModal
          record={editService}
          products={db.products}
          accounts={db.accounts}
          onClose={() => setEditService(null)}
          onSave={updateServiceRecord}
        />
      )}
      {printInvoice && (
        <ReceiptModal
          invoice={printInvoice}
          accounts={db.accounts}
          onClose={() => setPrintInvoice(null)}
        />
      )}
      {printService && (
        <WorkshopReceiptModal
          record={printService}
          onClose={() => setPrintService(null)}
        />
      )}
    </div>
  );
};
