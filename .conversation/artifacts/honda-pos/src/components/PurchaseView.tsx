import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from './AppContext';
import { PurchaseRecord, PurchaseItem, Product } from '../types';
import { Plus, Trash2, X, Eye, CheckCircle, Search, ChevronDown, Package, Pencil, AlertTriangle, PackageCheck, Loader2 } from 'lucide-react';

// ─── Searchable Product Dropdown (fixed-position — bypasses all overflow clips) ─
interface ProductDropdownProps {
  products: Product[];
  selectedId: string;
  onSelect: (product: Product) => void;
}

const ProductDropdown: React.FC<ProductDropdownProps> = ({ products, selectedId, onSelect }) => {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const [dropRect, setDropRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const btnRef   = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLDivElement>(null);

  const selected = products.find(p => p.id === selectedId);

  // ── Search across name, part number, barcode and compatibility ──────────
  const filtered = products.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.name          || '').toLowerCase().includes(q) ||
      (p.partNumber    || '').toLowerCase().includes(q) ||
      (p.barcode       || '').toLowerCase().includes(q) ||
      (p.compatibility || '').toLowerCase().includes(q)
    );
  });

  // Position the dropdown relative to the button using fixed coords
  const openDropdown = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    // If too close to bottom, open upward (max 240px list height)
    const spaceBelow = window.innerHeight - r.bottom;
    const openUpward  = spaceBelow < 260;
    setDropRect({
      top:   openUpward ? r.top - 260 : r.bottom + 2,
      left:  r.left,
      width: r.width,
    });
    setOpen(true);
    setSearch('');
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  // Close on outside click or scroll
  const close = useCallback(() => { setOpen(false); setSearch(''); }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node) &&
          btnRef.current  && !btnRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('scroll',    close, true);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('scroll',    close, true);
    };
  }, [open, close]);

  return (
    <div className="relative w-full">
      {/* Trigger button */}
      <button
        ref={btnRef}
        type="button"
        onClick={openDropdown}
        className="w-full flex items-center justify-between px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs hover:border-slate-300 focus:outline-none focus:border-red-400 transition-colors"
      >
        <span className={selected ? 'text-slate-800 font-medium truncate mr-1' : 'text-slate-400'}>
          {selected ? selected.name : 'Select product...'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {/* Fixed-position dropdown — renders outside any overflow container */}
      {open && dropRect && (
        <div
          ref={listRef}
          style={{
            position: 'fixed',
            top:      dropRect.top,
            left:     dropRect.left,
            width:    dropRect.width,
            zIndex:   9999,
          }}
          className="bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden"
        >
          {/* Search input */}
          <div className="p-2 border-b border-slate-100">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded-md">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search name, part no, barcode..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-xs outline-none text-slate-700 placeholder-slate-400"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Results list */}
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <Package className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No products match "<span className="font-semibold">{search}</span>"</p>
                <p className="text-[10px] text-slate-300 mt-1">Try part number, barcode, or bike model</p>
              </div>
            ) : (
              filtered.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { onSelect(p); close(); }}
                  className={`w-full text-left px-3 py-2.5 hover:bg-red-50 transition-colors flex items-start gap-2.5 ${p.id === selectedId ? 'bg-red-50' : ''}`}
                >
                  <Package className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {p.partNumber && <span>P/N: {p.partNumber} · </span>}
                      Stock: {p.stock} · Rs. {p.purchasePrice.toLocaleString()}
                      {p.compatibility && <span className="text-slate-300"> · {p.compatibility}</span>}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer hint */}
          {filtered.length > 0 && (
            <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-400">
              {filtered.length} of {products.length} products shown
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Draft item row type ──────────────────────────────────────────────────────
interface DraftItem {
  productId:  string;
  name:       string;
  partNumber: string;
  qty:        number;
  unitCost:   number;
}

// ─── Partial Receive Modal ────────────────────────────────────────────────────
interface PartialReceiveModalProps {
  purchase: PurchaseRecord;
  onClose: () => void;
  onSave: (id: string, receipts: { productId: string; qtyToReceive: number }[]) => Promise<{ success: boolean; errors?: string[] }>;
}

const PartialReceiveModal: React.FC<PartialReceiveModalProps> = ({ purchase, onClose, onSave }) => {
  // Local qty-to-receive per item, keyed by productId
  const [qtys, setQtys] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    purchase.items.forEach(item => { init[item.productId] = 0; });
    return init;
  });
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState<string[]>([]);

  const totalOrdered  = purchase.items.reduce((s, i) => s + i.qty, 0);
  const totalReceived = purchase.items.reduce((s, i) => s + (i.qtyReceived || 0), 0);
  const totalPending  = totalOrdered - totalReceived;

  const setAllRemaining = () => {
    const next: Record<string, number> = {};
    purchase.items.forEach(item => {
      next[item.productId] = item.qty - (item.qtyReceived || 0);
    });
    setQtys(next);
  };

  const qtyToReceiveNow = Object.values(qtys).reduce((s, v) => s + v, 0);

  const handleSubmit = async () => {
    const receipts = purchase.items
      .map(item => ({ productId: item.productId, qtyToReceive: qtys[item.productId] || 0 }))
      .filter(r => r.qtyToReceive > 0);
    if (!receipts.length) { setErrors(['Enter at least one quantity to receive.']); return; }
    setSaving(true);
    const result = await onSave(purchase.id, receipts);
    setSaving(false);
    if (result.success) {
      if (result.errors?.length) setErrors(result.errors); // partial warnings
      else onClose();
    } else {
      setErrors(['Failed to record receipt. Please try again.']);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-100 max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <PackageCheck className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Receive Stock</h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {purchase.invoiceRef} · {purchase.supplierName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress summary */}
        <div className="px-6 pt-4 shrink-0">
          <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between gap-4">
            <div className="text-xs">
              <span className="text-slate-400">Total ordered: </span>
              <span className="font-bold text-slate-800 font-mono">{totalOrdered} units</span>
            </div>
            <div className="text-xs">
              <span className="text-slate-400">Already received: </span>
              <span className="font-bold text-emerald-600 font-mono">{totalReceived} units</span>
            </div>
            <div className="text-xs">
              <span className="text-slate-400">Still outstanding: </span>
              <span className="font-bold text-amber-600 font-mono">{totalPending} units</span>
            </div>
            <button
              type="button"
              onClick={setAllRemaining}
              className="ml-auto px-3 py-1.5 text-[11px] font-bold border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all cursor-pointer whitespace-nowrap"
            >
              Receive All Remaining
            </button>
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="px-6 pt-3 shrink-0">
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
              {errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          </div>
        )}

        {/* Items table */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div
              className="grid px-3 py-2.5 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider"
              style={{ gridTemplateColumns: '1fr 70px 70px 70px 100px' }}
            >
              <span>Product</span>
              <span className="text-center">Ordered</span>
              <span className="text-center">Received</span>
              <span className="text-center">Remaining</span>
              <span className="text-center">Receive Now</span>
            </div>
            <div className="divide-y divide-slate-100">
              {purchase.items.map((item) => {
                const received  = item.qtyReceived || 0;
                const remaining = item.qty - received;
                const now       = qtys[item.productId] || 0;
                const pct       = item.qty > 0 ? Math.round(((received + now) / item.qty) * 100) : 0;
                const fullyDone = remaining === 0;

                return (
                  <div
                    key={item.productId}
                    className={`grid px-3 py-3 items-center gap-2 ${fullyDone ? 'bg-emerald-50/40' : 'hover:bg-slate-50/60'}`}
                    style={{ gridTemplateColumns: '1fr 70px 70px 70px 100px' }}
                  >
                    {/* Product info */}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p>
                      {item.partNumber && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.partNumber}</p>
                      )}
                      {/* Progress bar */}
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-blue-400' : 'bg-slate-300'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">{pct}%</span>
                      </div>
                    </div>

                    {/* Ordered */}
                    <div className="text-center font-mono text-xs text-slate-600">{item.qty}</div>

                    {/* Received */}
                    <div className={`text-center font-mono text-xs font-semibold ${received > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {received}
                    </div>

                    {/* Remaining */}
                    <div className={`text-center font-mono text-xs font-semibold ${remaining > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {remaining > 0 ? remaining : '—'}
                    </div>

                    {/* Receive now input */}
                    {fullyDone ? (
                      <div className="flex items-center justify-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                          <CheckCircle className="w-3.5 h-3.5" /> Done
                        </span>
                      </div>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        max={remaining}
                        value={now || ''}
                        onChange={e => {
                          const v = Math.min(Math.max(0, parseInt(e.target.value) || 0), remaining);
                          setQtys(prev => ({ ...prev, [item.productId]: v }));
                        }}
                        placeholder="0"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-center outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 shrink-0 bg-white rounded-b-2xl">
          <button
            type="button" onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || qtyToReceiveNow === 0}
            className="flex-[2] py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating Stock…</>
              : <>
                  <PackageCheck className="w-4 h-4" />
                  Receive {qtyToReceiveNow > 0 ? `${qtyToReceiveNow} Unit${qtyToReceiveNow !== 1 ? 's' : ''}` : 'Stock'}
                </>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── View Purchase Modal ──────────────────────────────────────────────────────
const ViewModal: React.FC<{ purchase: PurchaseRecord; onClose: () => void }> = ({ purchase, onClose }) => {
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Purchase Order Details</h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{purchase.invoiceRef}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div><p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">Supplier</p><p className="font-bold text-slate-800">{purchase.supplierName}</p></div>
            <div><p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">Date</p><p className="font-bold text-slate-800">{fmt(purchase.date)}</p></div>
            <div><p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">Total Amount</p><p className="font-bold text-red-600 font-mono">Rs. {purchase.totalAmount.toLocaleString()}</p></div>
            <div><p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">Amount Paid</p><p className="font-bold text-slate-800 font-mono">Rs. {(purchase.amountPaid || 0).toLocaleString()}</p></div>
            <div><p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">Payment</p><p className="font-semibold text-slate-700">{purchase.paymentMethod}</p></div>
            <div>
              <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">Status</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${purchase.status === 'received' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {purchase.status === 'received' ? 'Received' : 'Pending'}
              </span>
            </div>
          </div>
          {purchase.notes && (
            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] mb-1">Notes</p>
              {purchase.notes}
            </div>
          )}
          <div>
            <p className="text-slate-500 font-bold uppercase tracking-wider text-[10px] mb-2">Items ({purchase.items.length})</p>
            <div className="border border-slate-100 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Product</th>
                    <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-500 uppercase">Ordered</th>
                    <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-500 uppercase">Received</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-500 uppercase">Unit Cost</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchase.items.map((item, i) => {
                    const received = item.qtyReceived ?? (purchase.status === 'received' ? item.qty : 0);
                    const remaining = item.qty - received;
                    return (
                      <tr key={i}>
                        <td className="px-3 py-2">
                          <p className="font-semibold text-slate-800">{item.name}</p>
                          {item.partNumber && <p className="text-[10px] text-slate-400 font-mono">{item.partNumber}</p>}
                          {/* mini progress bar */}
                          <div className="mt-1 h-1 w-24 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${received >= item.qty ? 'bg-emerald-500' : received > 0 ? 'bg-blue-400' : 'bg-slate-300'}`}
                              style={{ width: `${item.qty > 0 ? Math.round((received / item.qty) * 100) : 0}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center font-mono">{item.qty}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`font-mono font-semibold ${received >= item.qty ? 'text-emerald-600' : received > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                            {received}
                            {remaining > 0 && <span className="text-slate-400 text-[10px] ml-1">({remaining} left)</span>}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">Rs. {item.purchasePrice.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold">Rs. {(item.purchasePrice * item.qty).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td colSpan={4} className="px-3 py-2 text-right text-xs font-bold text-slate-600">Total:</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-red-600">Rs. {purchase.totalAmount.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Edit Purchase Modal ──────────────────────────────────────────────────────
interface EditPurchaseModalProps {
  purchase: PurchaseRecord;
  products: Product[];
  suppliers: { id: string; name: string }[];
  accounts: { id: string; bankName: string; balance: number }[];
  onClose: () => void;
  onSave: (id: string, purchase: PurchaseRecord) => Promise<boolean>;
}

const EditPurchaseModal: React.FC<EditPurchaseModalProps> = ({ purchase, products, suppliers, accounts, onClose, onSave }) => {
  const [supplierName,  setSupplierName]  = useState(purchase.supplierName);
  const [date,          setDate]          = useState(purchase.date.split('T')[0]);
  const [amountPaid,    setAmountPaid]    = useState<number>(purchase.amountPaid || 0);
  const [notes,         setNotes]         = useState(purchase.notes || '');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Mobile Wallet' | 'Credit'>(purchase.paymentMethod);
  const [bankAccountId, setBankAccountId] = useState(purchase.bankAccountId || accounts[0]?.id || '');
  const [items,         setItems]         = useState<DraftItem[]>(
    purchase.items.map(i => ({ productId: i.productId, name: i.name, partNumber: i.partNumber || '', qty: i.qty, unitCost: i.purchasePrice }))
  );
  const [saving, setSaving] = useState(false);

  const total   = items.reduce((s, i) => s + i.qty * i.unitCost, 0);
  const balance = total - amountPaid;
  const isReceived = purchase.status === 'received';

  const addItem    = () => setItems(prev => [...prev, { productId: '', name: '', partNumber: '', qty: 1, unitCost: 0 }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof DraftItem, value: string | number) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  const handleProductSelect = (idx: number, product: Product) =>
    setItems(prev => prev.map((item, i) => i === idx ? {
      ...item,
      productId:  product.id,
      name:       product.name,
      partNumber: product.partNumber || '',
      unitCost:   product.purchasePrice,
    } : item));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) return alert('Please select a supplier.');
    if (items.some(i => !i.productId))  return alert('Please select a product for each item row.');
    if (items.some(i => i.qty < 1))     return alert('Quantity must be at least 1 for all items.');

    setSaving(true);
    const purchaseItems: PurchaseItem[] = items.map(i => ({
      productId:     i.productId,
      name:          i.name,
      partNumber:    i.partNumber,
      purchasePrice: i.unitCost,
      qty:           i.qty,
    }));

    const updated: PurchaseRecord = {
      ...purchase,
      date:          new Date(date).toISOString(),
      supplierName,
      items:         purchaseItems,
      totalAmount:   total,
      amountPaid,
      paymentMethod,
      bankAccountId,
      notes:         notes.trim() || undefined,
    };

    const ok = await onSave(purchase.id, updated);
    setSaving(false);
    if (ok) onClose();
    else alert('Failed to update purchase order. Please try again.');
  };

  const filteredAccounts = accounts.filter(a =>
    paymentMethod === 'Cash' ? a.id === 'cash_chest' : a.id !== 'cash_chest'
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-100 max-h-[95vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800">Edit Purchase Order</h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{purchase.invoiceRef}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Received warning */}
        {isReceived && (
          <div className="mx-6 mt-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 font-medium leading-relaxed">
              This order is already <strong>received</strong>. Editing prices or quantities will automatically
              recalculate inventory stock levels and weighted average costs across the entire system.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-5 overflow-y-auto flex-1">

            {/* Row 1: Supplier + Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Supplier <span className="text-red-500">*</span></label>
                <select
                  value={supplierName}
                  onChange={e => setSupplierName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20 bg-white cursor-pointer"
                >
                  <option value="">Select supplier...</option>
                  {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  {/* keep current if not in list */}
                  {supplierName && !suppliers.find(s => s.name === supplierName) && (
                    <option value={supplierName}>{supplierName}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date</label>
                <input
                  type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20"
                />
              </div>
            </div>

            {/* Row 2: Payment Method + Account + Amount Paid */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400 bg-white cursor-pointer"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Mobile Wallet">Mobile Wallet</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Debit Account</label>
                <select
                  value={bankAccountId}
                  onChange={e => setBankAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400 bg-white cursor-pointer"
                >
                  {filteredAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.bankName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Amount Paid (Rs.)</label>
                <input
                  type="number" min="0"
                  value={amountPaid || ''}
                  onChange={e => setAmountPaid(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Notes</label>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Optional notes about this order..."
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20 resize-none"
              />
            </div>

            {/* ── Items ─────────────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-slate-700">
                  Items <span className="text-red-500">*</span>
                  <span className="text-slate-400 font-normal ml-2">({items.length} {items.length === 1 ? 'item' : 'items'})</span>
                </label>
                <button
                  type="button" onClick={addItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-600 hover:text-red-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl">
                <div
                  className="grid gap-2 px-3 py-2.5 bg-slate-50 border-b border-slate-200 rounded-t-xl text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                  style={{ gridTemplateColumns: '1fr 70px 100px 90px 32px' }}
                >
                  <span>Product</span>
                  <span className="text-center">Qty</span>
                  <span className="text-center">Unit Cost</span>
                  <span className="text-right">Line Total</span>
                  <span />
                </div>

                <div className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid gap-2 px-3 py-2.5 items-center hover:bg-slate-50/50 transition-colors"
                      style={{ gridTemplateColumns: '1fr 70px 100px 90px 32px' }}
                    >
                      <ProductDropdown
                        products={products}
                        selectedId={item.productId}
                        onSelect={p => handleProductSelect(idx, p)}
                      />
                      <input
                        type="number" min="1" value={item.qty}
                        onChange={e => updateItem(idx, 'qty', Math.max(1, Number(e.target.value)))}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs font-mono text-center outline-none focus:border-red-400"
                      />
                      <input
                        type="number" min="0"
                        value={item.unitCost || ''}
                        onChange={e => updateItem(idx, 'unitCost', Math.max(0, Number(e.target.value)))}
                        placeholder="0"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs font-mono text-center outline-none focus:border-red-400"
                      />
                      <span className="text-right font-mono text-xs font-bold text-slate-800">
                        Rs. {(item.qty * item.unitCost).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        disabled={items.length === 1}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Totals footer */}
                <div className="border-t-2 border-slate-200 bg-slate-50 rounded-b-xl px-3 py-3 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-semibold">Order Total:</span>
                    <span className="font-bold font-mono text-slate-800">Rs. {total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-semibold">Amount Paid:</span>
                    <span className="font-mono text-emerald-600 font-bold">Rs. {amountPaid.toLocaleString()}</span>
                  </div>
                  {balance > 0 && (
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200">
                      <span className="text-slate-500 font-semibold">Balance Due:</span>
                      <span className="font-mono text-red-600 font-bold text-sm">Rs. {balance.toLocaleString()}</span>
                    </div>
                  )}
                  {balance <= 0 && total > 0 && (
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200">
                      <span className="text-slate-500 font-semibold">Balance Due:</span>
                      <span className="font-mono text-emerald-600 font-bold">Fully Paid</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-slate-100 shrink-0 bg-white rounded-b-2xl">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition-all cursor-pointer"
            >
              {saving ? 'Saving...' : isReceived ? 'Save & Update Inventory' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── New Purchase Modal ───────────────────────────────────────────────────────
interface NewPurchaseModalProps {
  products:  Product[];
  suppliers: { id: string; name: string }[];
  accounts:  { id: string; bankName: string; balance: number }[];
  onClose:   () => void;
  onSave:    (purchase: PurchaseRecord) => Promise<boolean>;
}

const NewPurchaseModal: React.FC<NewPurchaseModalProps> = ({ products, suppliers, accounts, onClose, onSave }) => {
  const [supplierName,  setSupplierName]  = useState('Honda Atlas Parts Ltd');
  const [invoiceRef]                       = useState(() => `PO-${Math.floor(100000 + Math.random() * 900000)}`);
  const [date,          setDate]          = useState(() => new Date().toISOString().split('T')[0]);
  const [amountPaid,    setAmountPaid]    = useState<number>(0);
  const [notes,         setNotes]         = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Mobile Wallet'>('Bank Transfer');
  const [bankAccountId, setBankAccountId] = useState(() => accounts.find(a => a.id !== 'cash_chest')?.id || accounts[0]?.id || '');
  const [items,         setItems]         = useState<DraftItem[]>([{ productId: '', name: '', partNumber: '', qty: 1, unitCost: 0 }]);
  const [saving,        setSaving]        = useState(false);

  const total = items.reduce((s, i) => s + i.qty * i.unitCost, 0);
  const balance = total - amountPaid;

  const addItem    = () => setItems(prev => [...prev, { productId: '', name: '', partNumber: '', qty: 1, unitCost: 0 }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof DraftItem, value: string | number) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  const handleProductSelect = (idx: number, product: Product) =>
    setItems(prev => prev.map((item, i) => i === idx ? {
      ...item,
      productId:  product.id,
      name:       product.name,
      partNumber: product.partNumber || '',
      unitCost:   product.purchasePrice,
    } : item));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) return alert('Please select a supplier.');
    if (items.some(i => !i.productId))  return alert('Please select a product for each item row.');
    if (items.some(i => i.qty < 1))     return alert('Quantity must be at least 1 for all items.');

    setSaving(true);
    const purchaseItems: PurchaseItem[] = items.map(i => ({
      productId:     i.productId,
      name:          i.name,
      partNumber:    i.partNumber,
      purchasePrice: i.unitCost,
      qty:           i.qty,
    }));

    const purchase: PurchaseRecord = {
      id: '', invoiceRef,
      date:          new Date(date).toISOString(),
      supplierName,
      items:         purchaseItems,
      totalAmount:   total,
      amountPaid,
      paymentMethod,
      bankAccountId,
      status:        'pending',
      notes:         notes.trim() || undefined,
    };

    const ok = await onSave(purchase);
    setSaving(false);
    if (ok) onClose();
    else alert('Failed to save purchase order. Please try again.');
  };

  const filteredAccounts = accounts.filter(a =>
    paymentMethod === 'Cash' ? a.id === 'cash_chest' : a.id !== 'cash_chest'
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-100 max-h-[95vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800">New Purchase Order</h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{invoiceRef}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-5 overflow-y-auto flex-1">

            {/* Row 1: Supplier + Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Supplier <span className="text-red-500">*</span></label>
                <select
                  value={supplierName}
                  onChange={e => setSupplierName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20 bg-white cursor-pointer"
                >
                  <option value="">Select supplier...</option>
                  {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date</label>
                <input
                  type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20"
                />
              </div>
            </div>

            {/* Row 2: Payment Method + Account + Amount Paid */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400 bg-white cursor-pointer"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Mobile Wallet">Mobile Wallet</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Debit Account</label>
                <select
                  value={bankAccountId}
                  onChange={e => setBankAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400 bg-white cursor-pointer"
                >
                  {filteredAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.bankName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Amount Paid (Rs.)</label>
                <input
                  type="number" min="0"
                  value={amountPaid || ''}
                  onChange={e => setAmountPaid(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Notes</label>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Optional notes about this order..."
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20 resize-none"
              />
            </div>

            {/* ── Items section ─────────────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-slate-700">
                  Items <span className="text-red-500">*</span>
                  <span className="text-slate-400 font-normal ml-2">({items.length} {items.length === 1 ? 'item' : 'items'})</span>
                </label>
                <button
                  type="button" onClick={addItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-600 hover:text-red-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>
              </div>

              {/* Items table — NO overflow-hidden so dropdowns are not clipped */}
              <div className="border border-slate-200 rounded-xl">
                {/* Column headers */}
                <div className="grid gap-2 px-3 py-2.5 bg-slate-50 border-b border-slate-200 rounded-t-xl text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                  style={{ gridTemplateColumns: '1fr 70px 100px 90px 32px' }}>
                  <span>Product</span>
                  <span className="text-center">Qty</span>
                  <span className="text-center">Unit Cost</span>
                  <span className="text-right">Line Total</span>
                  <span />
                </div>

                {/* Item rows — each row is a div grid, NOT a table, avoiding overflow-hidden on tbody */}
                <div className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid gap-2 px-3 py-2.5 items-center hover:bg-slate-50/50 transition-colors"
                      style={{ gridTemplateColumns: '1fr 70px 100px 90px 32px' }}
                    >
                      {/* Product selector */}
                      <ProductDropdown
                        products={products}
                        selectedId={item.productId}
                        onSelect={p => handleProductSelect(idx, p)}
                      />

                      {/* Qty */}
                      <input
                        type="number" min="1" value={item.qty}
                        onChange={e => updateItem(idx, 'qty', Math.max(1, Number(e.target.value)))}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs font-mono text-center outline-none focus:border-red-400"
                      />

                      {/* Unit Cost */}
                      <input
                        type="number" min="0"
                        value={item.unitCost || ''}
                        onChange={e => updateItem(idx, 'unitCost', Math.max(0, Number(e.target.value)))}
                        placeholder="0"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs font-mono text-center outline-none focus:border-red-400"
                      />

                      {/* Line total */}
                      <span className="text-right font-mono text-xs font-bold text-slate-800">
                        Rs. {(item.qty * item.unitCost).toLocaleString()}
                      </span>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        disabled={items.length === 1}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Totals footer */}
                <div className="border-t-2 border-slate-200 bg-slate-50 rounded-b-xl px-3 py-3 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-semibold">Order Total:</span>
                    <span className="font-bold font-mono text-slate-800">Rs. {total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-semibold">Amount Paid:</span>
                    <span className="font-mono text-emerald-600 font-bold">Rs. {amountPaid.toLocaleString()}</span>
                  </div>
                  {balance > 0 && (
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200">
                      <span className="text-slate-500 font-semibold">Balance Due:</span>
                      <span className="font-mono text-red-600 font-bold text-sm">Rs. {balance.toLocaleString()}</span>
                    </div>
                  )}
                  {balance === 0 && total > 0 && (
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200">
                      <span className="text-slate-500 font-semibold">Balance Due:</span>
                      <span className="font-mono text-emerald-600 font-bold">Fully Paid</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex gap-3 px-6 py-4 border-t border-slate-100 shrink-0 bg-white rounded-b-2xl">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition-all cursor-pointer"
            >
              {saving ? 'Saving...' : 'Create Purchase Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main PurchaseView ────────────────────────────────────────────────────────
export const PurchaseView: React.FC = () => {
  const { db, savePurchase, editPurchase, receivePurchase, partialReceivePurchase } = useApp();
  const [showNew,            setShowNew]            = useState(false);
  const [viewPurchase,       setViewPurchase]       = useState<PurchaseRecord | null>(null);
  const [editingPurchase,    setEditingPurchase]    = useState<PurchaseRecord | null>(null);
  const [receivingPurchase,  setReceivingPurchase]  = useState<PurchaseRecord | null>(null);

  if (!db) return <div className="p-8 text-slate-400 text-sm">Loading purchases...</div>;

  const { purchases, products, suppliers, accounts } = db;
  const recentPurchases = [...purchases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const handleFullReceive = async (id: string) => {
    if (!confirm('Mark ALL remaining items as received? This will update stock levels for every outstanding item.')) return;
    await receivePurchase(id);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Manage supplier purchase orders</p>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Purchase
        </button>
      </div>

      {/* Purchase History Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-36" />
            <col className="w-24" />
            <col />
            <col className="w-32" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-44" />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-4 py-3.5 text-left   text-[11px] font-bold text-slate-500 uppercase tracking-wider">Invoice No</th>
              <th className="px-4 py-3.5 text-left   text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3.5 text-left   text-[11px] font-bold text-slate-500 uppercase tracking-wider">Supplier</th>
              <th className="px-4 py-3.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Stock Progress</th>
              <th className="px-4 py-3.5 text-right  text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total</th>
              <th className="px-4 py-3.5 text-right  text-[11px] font-bold text-slate-500 uppercase tracking-wider">Paid</th>
              <th className="px-4 py-3.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {purchases.length === 0 && (
              <tr>
                <td colSpan={8} className="py-16 text-center text-slate-400 text-sm">
                  No purchase orders yet. Click "+ New Purchase" to create one.
                </td>
              </tr>
            )}
            {recentPurchases.map(pc => {
              const totalOrdered  = pc.items.reduce((s, i) => s + i.qty, 0);
              const totalReceived = pc.items.reduce((s, i) => s + (i.qtyReceived ?? (pc.status === 'received' ? i.qty : 0)), 0);
              const pct           = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;
              const isReceived    = pc.status === 'received';
              const isPartial     = pc.status === 'partial';

              return (
                <tr key={pc.id} className="hover:bg-slate-50/50 transition-colors">

                  {/* Invoice No */}
                  <td className="px-4 py-3.5">
                    <span className="text-xs font-bold font-mono text-slate-800 truncate block">{pc.invoiceRef}</span>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                    {fmt(pc.date)}
                  </td>

                  {/* Supplier */}
                  <td className="px-4 py-3.5 text-xs font-semibold text-slate-800 truncate">
                    {pc.supplierName}
                  </td>

                  {/* Stock progress */}
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isReceived ? 'bg-emerald-500' : isPartial ? 'bg-blue-400' : 'bg-slate-300'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {totalReceived}/{totalOrdered} units
                      </span>
                    </div>
                  </td>

                  {/* Total */}
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      Rs.&nbsp;{pc.totalAmount.toLocaleString()}
                    </span>
                  </td>

                  {/* Paid */}
                  <td className="px-4 py-3.5 text-right">
                    <span className={`text-xs font-mono font-semibold ${
                      (pc.amountPaid || 0) >= pc.totalAmount ? 'text-emerald-600' : 'text-slate-600'
                    }`}>
                      Rs.&nbsp;{(pc.amountPaid || 0).toLocaleString()}
                    </span>
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-3.5 text-center">
                    {isReceived ? (
                      <span className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
                        <CheckCircle className="w-3 h-3" /> Received
                      </span>
                    ) : isPartial ? (
                      <span className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
                        <PackageCheck className="w-3 h-3" /> Partial
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">
                        <Package className="w-3 h-3" /> Pending
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setViewPurchase(pc)}
                        title="View details"
                        className="inline-flex items-center gap-1 px-2 py-1.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap"
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>
                      {!isReceived && (
                        <button
                          onClick={() => setReceivingPurchase(pc)}
                          title="Receive stock (full or partial)"
                          className="inline-flex items-center gap-1 px-2 py-1.5 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap"
                        >
                          <PackageCheck className="w-3 h-3" /> Receive
                        </button>
                      )}
                      <button
                        onClick={() => setEditingPurchase(pc)}
                        title="Edit purchase order"
                        className="inline-flex items-center gap-1 px-2 py-1.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showNew && (
        <NewPurchaseModal
          products={products}
          suppliers={suppliers}
          accounts={accounts}
          onClose={() => setShowNew(false)}
          onSave={savePurchase}
        />
      )}
      {viewPurchase && (
        <ViewModal purchase={viewPurchase} onClose={() => setViewPurchase(null)} />
      )}
      {receivingPurchase && (
        <PartialReceiveModal
          purchase={receivingPurchase}
          onClose={() => setReceivingPurchase(null)}
          onSave={async (id, receipts) => {
            const result = await partialReceivePurchase(id, receipts);
            // Refresh the local copy so progress bars update
            if (result.success) {
              setReceivingPurchase(prev => {
                if (!prev) return null;
                const updated = db.purchases.find(p => p.id === prev.id);
                return updated || null;
              });
              // Close if no errors
              if (!result.errors?.length) setReceivingPurchase(null);
            }
            return result;
          }}
        />
      )}
      {editingPurchase && (
        <EditPurchaseModal
          purchase={editingPurchase}
          products={products}
          suppliers={suppliers}
          accounts={accounts}
          onClose={() => setEditingPurchase(null)}
          onSave={async (id, updated) => {
            const ok = await editPurchase(id, updated);
            if (ok) setEditingPurchase(null);
            return ok;
          }}
        />
      )}
    </div>
  );
};
