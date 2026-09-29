import React, { useState, useMemo } from 'react';
import { useApp } from './AppContext';
import { ServiceRecord, ServiceLine, ServicePartLine, ServiceType, Product, Customer } from '../types';
import {
  Wrench, Plus, X, Printer, Search, CheckCircle,
  AlertCircle, DollarSign, Bike, Pencil, Trash2
} from 'lucide-react';
import {
  DEFAULT_THERMAL_PAPER_SIZE,
  ThermalPaperSize,
  ThermalPaperSizeSelect,
  thermalPaperClass,
} from '../lib/thermal-print';

const SERVICE_PRICES: Record<ServiceType, number> = {
  'Oil Change':     150,
  'Bike Tuning':    800,
  'Brake Service':  300,
  'Engine Service': 2500,
};

const SERVICE_LABELS: Record<ServiceType, string> = {
  'Bike Tuning':    'General Tuning',
  'Oil Change':     'Engine Oil Change',
  'Brake Service':  'Brake Overhaul',
  'Engine Service': 'Complete Engine Service',
};

const ALL_TYPES: ServiceType[] = ['Bike Tuning', 'Oil Change', 'Brake Service', 'Engine Service'];

const BIKE_MODELS = [
  'CD-70', 'CD-70 Dream', 'Pridor', 'CG-125', 'CG-125 Self', 'CB-150F',
];

// ─── Badge helpers ────────────────────────────────────────────────────────────
const TYPE_BADGE: Record<ServiceType, string> = {
  'Oil Change':     'bg-amber-100 text-amber-700',
  'Bike Tuning':    'bg-blue-100 text-blue-700',
  'Brake Service':  'bg-orange-100 text-orange-700',
  'Engine Service': 'bg-red-100 text-red-700',
};

const REMINDER_BADGE: Record<string, string> = {
  'Pending':   'bg-red-100 text-red-700',
  'Sent':      'bg-blue-100 text-blue-700',
  'Confirmed': 'bg-emerald-100 text-emerald-700',
};

// ─── Service Lines Editor (shared between New + Edit modals) ──────────────────
const ServiceLinesEditor: React.FC<{
  lines: ServiceLine[];
  onChange: (lines: ServiceLine[]) => void;
}> = ({ lines, onChange }) => {
  const addLine = () => {
    const usedTypes = new Set(lines.map(l => l.serviceType));
    const nextType = ALL_TYPES.find(t => !usedTypes.has(t)) ?? 'Bike Tuning';
    onChange([...lines, { serviceType: nextType, price: SERVICE_PRICES[nextType] }]);
  };

  const removeLine = (idx: number) => {
    onChange(lines.filter((_, i) => i !== idx));
  };

  const updateType = (idx: number, type: ServiceType) => {
    onChange(lines.map((l, i) => i === idx ? { serviceType: type, price: SERVICE_PRICES[type] } : l));
  };

  const updatePrice = (idx: number, price: number) => {
    onChange(lines.map((l, i) => i === idx ? { ...l, price } : l));
  };

  const total = lines.reduce((s, l) => s + Number(l.price || 0), 0);
  const hasOilChange = lines.some(l => l.serviceType === 'Oil Change');

  return (
    <div className="col-span-2 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-semibold text-slate-700">Services <span className="text-red-500">*</span></label>
        {lines.length < 4 && (
          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Service
          </button>
        )}
      </div>

      <div className="space-y-2">
        {lines.map((line, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-xl p-2.5 border border-slate-200">
            <select
              value={line.serviceType}
              onChange={e => updateType(idx, e.target.value as ServiceType)}
              className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-red-400 bg-white cursor-pointer"
            >
              {ALL_TYPES.map(t => <option key={t} value={t}>{SERVICE_LABELS[t]}</option>)}
            </select>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[11px] text-slate-400 font-mono">Rs.</span>
              <input
                type="number"
                min="0"
                value={line.price || ''}
                onChange={e => updatePrice(idx, Math.max(0, Number(e.target.value)))}
                className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-red-400 text-right"
              />
            </div>
            <button
              type="button"
              onClick={() => removeLine(idx)}
              disabled={lines.length === 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1 px-1">
        <span className="text-[11px] text-slate-400 font-semibold">{lines.length} service{lines.length > 1 ? 's' : ''}</span>
        <span className="text-sm font-bold text-slate-800 font-mono">Total: Rs. {total.toLocaleString()}</span>
      </div>

      {hasOilChange && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>An oil change reminder will be automatically scheduled 30 days from today.</span>
        </div>
      )}
    </div>
  );
};

// ─── Inventory Parts Editor ──────────────────────────────────────────────────
const PartsEditor: React.FC<{
  parts: ServicePartLine[];
  products: Product[];
  onChange: (parts: ServicePartLine[]) => void;
}> = ({ parts, products, onChange }) => {
  const addPart = () => onChange([
    ...parts,
    { productId: '', name: '', partNumber: '', qty: 1, purchasePrice: 0, sellingPrice: 0 },
  ]);

  const removePart = (idx: number) => onChange(parts.filter((_, i) => i !== idx));

  const selectProduct = (idx: number, product: Product) => {
    onChange(parts.map((part, i) => i === idx ? {
      ...part,
      productId: product.id,
      name: product.name,
      partNumber: product.partNumber || '',
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
    } : part));
  };

  const updateQty = (idx: number, qty: number) => {
    onChange(parts.map((part, i) => i === idx ? { ...part, qty: Math.max(1, qty) } : part));
  };

  const total = parts.reduce((sum, part) => sum + part.qty * part.sellingPrice, 0);

  return (
    <div className="col-span-2 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-semibold text-slate-700">Parts Used <span className="text-slate-400 font-normal">(optional)</span></label>
        <button type="button" onClick={addPart} className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Add Part
        </button>
      </div>
      {parts.length === 0 && (
        <p className="text-[11px] text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl px-3 py-2.5">
          Add parts such as engine oil, filters, plugs, or brake shoes to this same customer bill.
        </p>
      )}
      <div className="space-y-2">
        {parts.map((part, idx) => (
          <PartRow
            key={`${idx}-${part.productId}`}
            part={part}
            products={products}
            onSelect={product => selectProduct(idx, product)}
            onQtyChange={qty => updateQty(idx, qty)}
            onRemove={() => removePart(idx)}
          />
        ))}
      </div>
      {parts.length > 0 && (
        <div className="flex justify-between px-1 text-[11px]">
          <span className="text-slate-400">{parts.length} part line{parts.length !== 1 ? 's' : ''} · stock will be reduced when saved</span>
          <span className="font-bold text-slate-800 font-mono">Parts: Rs. {total.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};

const PartRow: React.FC<{
  part: ServicePartLine;
  products: Product[];
  onSelect: (product: Product) => void;
  onQtyChange: (qty: number) => void;
  onRemove: () => void;
}> = ({ part, products, onSelect, onQtyChange, onRemove }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = products.find(product => product.id === part.productId);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 20);
    return products.filter(product =>
      product.name.toLowerCase().includes(q) ||
      (product.partNumber || '').toLowerCase().includes(q) ||
      (product.barcode || '').toLowerCase().includes(q)
    ).slice(0, 20);
  }, [products, query]);

  return (
    <div className="flex items-start gap-2 bg-slate-50 rounded-xl p-2.5 border border-slate-200">
      <div className="relative flex-1 min-w-0">
        <button type="button" onClick={() => setOpen(value => !value)}
          className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white hover:border-red-400 text-left cursor-pointer">
          {selected ? (
            <span className="truncate">
              <span className="font-semibold text-slate-800">{selected.name}</span>
              <span className="text-slate-400 ml-1 font-mono text-[10px]">{selected.partNumber}</span>
            </span>
          ) : <span className="text-slate-400">Search part by name or part number…</span>}
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>
        {open && (
          <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            <div className="p-2 border-b border-slate-100">
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search part name, P/N, barcode…"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-red-400" />
            </div>
            <div className="max-h-44 overflow-y-auto">
              {filtered.length === 0 ? <p className="px-3 py-4 text-xs text-slate-400 text-center">No parts found</p> : filtered.map(product => (
                <button key={product.id} type="button" onClick={() => { onSelect(product); setQuery(''); setOpen(false); }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-red-50 cursor-pointer">
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-slate-800 truncate">{product.name}</span>
                    <span className="block text-[10px] text-slate-400 font-mono">{product.partNumber} · Stock: {product.stock}</span>
                  </span>
                  <span className="text-xs font-bold text-red-600 font-mono shrink-0">Rs.{product.sellingPrice.toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <input type="number" min="1" max={selected?.stock ?? undefined} value={part.qty || ''}
        onChange={e => onQtyChange(Number(e.target.value))}
        className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-center outline-none focus:border-red-400"
        title={selected ? `Available stock: ${selected.stock}` : 'Quantity'} />
      <span className="w-20 text-right text-xs font-bold text-slate-800 font-mono pt-1.5">
        Rs.{(part.qty * part.sellingPrice).toLocaleString()}
      </span>
      <button type="button" onClick={onRemove} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 cursor-pointer">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// ─── Print Receipt Modal ──────────────────────────────────────────────────────
export const ReceiptModal: React.FC<{
  record: ServiceRecord;
  accounts?: { id: string; bankName: string }[];
  onClose: () => void;
}> = ({ record, accounts = [], onClose }) => {
  const [thermalPaperSize, setThermalPaperSize] = useState<ThermalPaperSize>(DEFAULT_THERMAL_PAPER_SIZE);
  const lines: ServiceLine[] = record.serviceLines ?? [{ serviceType: record.serviceType, price: record.price }];
  const hasOilChange = lines.some(l => l.serviceType === 'Oil Change');
  const paymentAccount = accounts.find(account => account.id === record.bankAccountId);
  const paymentLabel = !record.bankAccountId || record.bankAccountId === 'cash_chest'
    ? 'Cash'
    : paymentAccount?.bankName || 'Bank Deposit';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50 no-print">
          <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Printer className="w-4 h-4 text-slate-500" /> Workshop Job Receipt
          </span>
          <div className="flex gap-2">
            <ThermalPaperSizeSelect value={thermalPaperSize} onChange={setThermalPaperSize} />
            <button onClick={() => window.print()} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1">
              <Printer className="w-3 h-3" /> Print
            </button>
            <button onClick={onClose} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer">
              Close
            </button>
          </div>
        </div>

        <div className={`p-6 font-mono text-[11px] leading-relaxed text-neutral-800 print-area thermal-paper ${thermalPaperClass(thermalPaperSize)}`}>
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-wider">RAIS MOTOR WORKSHOP</p>
            <p className="text-[10px] text-neutral-500 font-sans mt-0.5">Allama Iqbal Road, Dharampura, Lahore</p>
            <p className="text-[10px] text-neutral-500 font-sans">Mob: 0321-4567812 | Certified Technicians</p>
            <div className="border-b border-dashed border-neutral-300 my-3" />
          </div>

          <div className="space-y-1.5 text-[11px]">
            {[
              ['Job Ticket',    record.invoiceNumber],
              ['Date',          new Date(record.date).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' })],
              ['Customer',      record.customerName],
              ['Phone',         record.customerPhone],
              ['Bike Model',    `Honda ${record.bikeModel}`],
              ['Payment',       paymentLabel],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <span className="text-neutral-500">{label}:</span>
                <span className="font-bold text-neutral-800 text-right">{value}</span>
              </div>
            ))}
          </div>

          <div className="border-b border-dashed border-neutral-300 my-3" />

          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase text-neutral-500">
              <span>Service</span><span>Charges</span>
            </div>
            {lines.map((line, i) => (
              <div key={i} className="flex justify-between bg-neutral-50 p-2 rounded border border-neutral-100">
                <span className="text-neutral-800 font-bold">{SERVICE_LABELS[line.serviceType as ServiceType] ?? line.serviceType}</span>
                <span className="font-mono shrink-0">Rs. {Number(line.price).toLocaleString()}</span>
              </div>
            ))}
            {(record.parts || []).map(part => (
              <div key={part.productId} className="flex justify-between bg-red-50/50 p-2 rounded border border-red-100">
                <span className="text-neutral-800 font-bold">{part.name} <span className="text-[9px] text-neutral-400 font-normal">×{part.qty}</span></span>
                <span className="font-mono shrink-0">Rs. {(part.qty * part.sellingPrice).toLocaleString()}</span>
              </div>
            ))}
            {record.notes && (
              <p className="text-[10px] text-neutral-400 italic px-1">Notes: "{record.notes}"</p>
            )}
            {(lines.length > 1 || (record.parts || []).length > 0) && (
              <div className="flex justify-between font-bold border-t border-dashed border-neutral-200 pt-2 mt-1">
                <span>TOTAL</span>
                <span className="font-mono">Rs. {record.price.toLocaleString()}</span>
              </div>
            )}
          </div>

          {hasOilChange && (
            <div className="mt-3 p-2.5 border border-red-200 bg-red-50/60 rounded text-center">
              <p className="font-bold text-red-600 text-[10px]">⚠ OIL CHANGE REMINDER SCHEDULED</p>
              <p className="text-[10px] text-neutral-500 font-sans mt-0.5">
                Next Due: <strong className="text-neutral-800">
                  {new Date(new Date().setDate(new Date().getDate() + 30)).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' })}
                </strong>
              </p>
            </div>
          )}

          <div className="border-b border-dashed border-neutral-300 my-3" />
          <p className="text-center text-[10px] font-bold uppercase text-neutral-700">Thank you for choosing Rais Honda!</p>
          <p className="text-center text-[10px] text-neutral-400 font-sans mt-0.5">Check engine oil every 1000 km. Drive safely.</p>
        </div>
      </div>
    </div>
  );
};

// ─── Edit Service Modal ───────────────────────────────────────────────────────
export const EditServiceModal: React.FC<{
  record: ServiceRecord;
  products: Product[];
  accounts: { id: string; bankName: string }[];
  onClose: () => void;
  onSave: (id: string, updates: Partial<ServiceRecord>) => Promise<boolean>;
}> = ({ record, products, accounts, onClose, onSave }) => {
  const initLines: ServiceLine[] = record.serviceLines && record.serviceLines.length > 0
    ? record.serviceLines
    : [{ serviceType: record.serviceType, price: record.price }];

  const [customerName,  setName]      = useState(record.customerName);
  const [customerPhone, setPhone]     = useState(record.customerPhone);
  const [bikeModel,     setBike]      = useState(record.bikeModel || 'CD-70');
  const [lines,         setLines]     = useState<ServiceLine[]>(initLines);
  const [parts,         setParts]     = useState<ServicePartLine[]>(record.parts || []);
  const [bankAccountId, setBankAccountId] = useState(record.bankAccountId || 'cash_chest');
  const [notes,         setNotes]     = useState(record.notes || '');
  const [reminderStatus,setReminder]  = useState<'Pending'|'Sent'|'Confirmed'|undefined>(record.reminderStatus);
  const [saving,        setSaving]    = useState(false);

  const hasOilChange = lines.some(l => l.serviceType === 'Oil Change');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return alert('Customer name is required.');
    if (!customerPhone.trim()) return alert('Phone number is required.');
    if (lines.length === 0) return alert('At least one service is required.');
    setSaving(true);
    const ok = await onSave(record.id, {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      bikeModel,
      serviceLines: lines,
      parts,
      bankAccountId,
      notes: notes.trim(),
      reminderStatus: hasOilChange ? reminderStatus : undefined,
    });
    setSaving(false);
    if (ok) onClose();
    else alert('Failed to save changes. Please try again.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h3 className="font-bold text-slate-800">Edit Service Record</h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{record.invoiceNumber}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Customer Name <span className="text-red-500">*</span></label>
              <input type="text" value={customerName} onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone <span className="text-red-500">*</span></label>
              <input type="text" value={customerPhone} onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Bike Model</label>
              <select value={bikeModel} onChange={e => setBike(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400 bg-white cursor-pointer">
                {BIKE_MODELS.map(m => <option key={m} value={m}>Honda {m}</option>)}
              </select>
            </div>

            <ServiceLinesEditor lines={lines} onChange={setLines} />
            <PartsEditor parts={parts} products={products} onChange={setParts} />

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payment Account</label>
              <select value={bankAccountId} onChange={e => setBankAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400 bg-white cursor-pointer">
                {accounts.map(account => <option key={account.id} value={account.id}>{account.bankName}</option>)}
              </select>
            </div>

            {hasOilChange && reminderStatus && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Oil Change Reminder</label>
                <select value={reminderStatus} onChange={e => setReminder(e.target.value as 'Pending'|'Sent'|'Confirmed')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400 bg-white cursor-pointer">
                  <option value="Pending">Pending</option>
                  <option value="Sent">Sent</option>
                  <option value="Confirmed">Confirmed</option>
                </select>
              </div>
            )}

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Diagnostic Notes</label>
              <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Adjusted tappets, replaced rear brake shoes..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none resize-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20" />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-all cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── New Service Modal ────────────────────────────────────────────────────────
interface NewServiceModalProps {
  products: Product[];
  accounts: { id: string; bankName: string }[];
  customers: Customer[];
  onClose: () => void;
  onSave: (record: ServiceRecord) => Promise<boolean>;
  onBooked: (record: ServiceRecord) => void;
}

const NewServiceModal: React.FC<NewServiceModalProps> = ({ products, accounts, customers, onClose, onSave, onBooked }) => {
  const [customerName,  setName]   = useState('');
  const [customerPhone, setPhone]  = useState('');
  const [bikeModel,     setBike]   = useState('CD-70');
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [lines,         setLines]  = useState<ServiceLine[]>([{ serviceType: 'Bike Tuning', price: 800 }]);
  const [parts,         setParts]  = useState<ServicePartLine[]>([]);
  const [bankAccountId, setBankAccountId] = useState('cash_chest');
  const [notes,         setNotes]  = useState('');
  const [saving,        setSaving] = useState(false);

  const matchingCustomers = useMemo(() => {
    const query = customerQuery.trim().toLowerCase();
    if (!query) return customers.slice(0, 8);
    return customers.filter(customer =>
      `${customer.name} ${customer.phone} ${customer.bikeModel}`.toLowerCase().includes(query)
    ).slice(0, 8);
  }, [customers, customerQuery]);

  const selectExistingCustomer = (customer: Customer) => {
    setCustomerQuery(`${customer.name} · ${customer.phone}`);
    setName(customer.name);
    setPhone(customer.phone);
    const matchingBike = BIKE_MODELS.find(model => model.toLowerCase() === (customer.bikeModel || '').toLowerCase());
    setBike(matchingBike || 'CD-70');
    setSelectedCustomerId(customer.id);
    setCustomerSearchOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return alert('Customer name is required.');
    if (!customerPhone.trim()) return alert('Phone number is required.');
    if (lines.length === 0) return alert('At least one service is required.');
    setSaving(true);

    const hasOilChange = lines.some(l => l.serviceType === 'Oil Change');
    const primaryType: ServiceType | string = hasOilChange ? 'Oil Change' : lines[0].serviceType;
    const totalPrice = lines.reduce((s, l) => s + Number(l.price || 0), 0);
    const partsTotal = parts.reduce((s, part) => s + part.qty * part.sellingPrice, 0);

    const payload: ServiceRecord = {
      id: '', invoiceNumber: '',
      customerName: customerName.trim(), customerPhone: customerPhone.trim(),
      bikeModel,
      serviceType: primaryType,
      price: totalPrice + partsTotal,
      serviceLines: lines,
      parts,
      bankAccountId,
      date: new Date().toISOString(),
      notes: notes.trim(),
    };
    const ok = await onSave(payload);
    setSaving(false);
    if (ok) {
      onBooked({ ...payload, invoiceNumber: `SRV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-NEW` });
      onClose();
    } else {
      alert('Failed to save service record. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-slate-800">New Service Booking</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Existing Customer <span className="text-slate-400 font-normal">(optional)</span></label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input type="text" value={customerQuery}
                  onFocus={() => setCustomerSearchOpen(true)}
                  onChange={e => {
                    setCustomerQuery(e.target.value);
                    setSelectedCustomerId(null);
                    setCustomerSearchOpen(true);
                  }}
                  placeholder="Search saved customer by name or phone"
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20" />
                {customerSearchOpen && customers.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                    <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Saved Customers</span>
                      <button type="button" onClick={() => setCustomerSearchOpen(false)} className="text-[11px] text-slate-400 hover:text-slate-700 cursor-pointer">Close</button>
                    </div>
                    <div className="max-h-44 overflow-y-auto">
                      {matchingCustomers.length > 0 ? matchingCustomers.map(customer => (
                        <button key={customer.id} type="button" onClick={() => selectExistingCustomer(customer)}
                          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-red-50 cursor-pointer">
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold text-slate-800 truncate">{customer.name}</span>
                            <span className="block text-[10px] text-slate-400 font-mono">
                              {customer.phone}{customer.bikeModel ? ` · Honda ${customer.bikeModel}` : ''}
                            </span>
                          </span>
                          <span className="text-[10px] text-red-600 font-semibold shrink-0">Select</span>
                        </button>
                      )) : (
                        <p className="px-3 py-3 text-xs text-slate-400 text-center">No saved customer matches</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-1.5 min-h-4">
                <p className="text-[10px] text-slate-400">Select a saved customer, or leave this blank to add a new one below.</p>
                {selectedCustomerId && <span className="text-[10px] font-semibold text-emerald-600">Saved customer selected</span>}
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Customer Name <span className="text-red-500">*</span></label>
              <input type="text" value={customerName}
                onChange={e => {
                  setName(e.target.value);
                  setSelectedCustomerId(null);
                }}
                placeholder="Enter new customer name"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone <span className="text-red-500">*</span></label>
              <input type="text" value={customerPhone} onChange={e => setPhone(e.target.value)}
                placeholder="03XX-XXXXXXX"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Bike Model</label>
              <select value={bikeModel} onChange={e => setBike(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400 bg-white cursor-pointer">
                {BIKE_MODELS.map(m => <option key={m} value={m}>Honda {m}</option>)}
              </select>
            </div>

            <ServiceLinesEditor lines={lines} onChange={setLines} />
            <PartsEditor parts={parts} products={products} onChange={setParts} />

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payment Account</label>
              <select value={bankAccountId} onChange={e => setBankAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400 bg-white cursor-pointer">
                {accounts.map(account => <option key={account.id} value={account.id}>{account.bankName}</option>)}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Diagnostic Notes</label>
              <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Adjusted tappets, replaced rear brake shoes..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none resize-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20" />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-all cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {saving ? 'Saving...' : 'Book & Print Slip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main WorkshopView ────────────────────────────────────────────────────────
export const WorkshopView: React.FC = () => {
  const { db, saveServiceRecord, updateServiceRecord, currentUser } = useApp();
  const canEdit = currentUser?.role !== 'Cashier';

  const [search,          setSearch]        = useState('');
  const [filterType,      setFilterType]    = useState<ServiceType | 'all'>('all');
  const [showNew,         setShowNew]       = useState(false);
  const [receipt,         setReceipt]       = useState<ServiceRecord | null>(null);
  const [editingService,  setEditingService] = useState<ServiceRecord | null>(null);

  if (!db) return <div className="p-8 text-slate-400 text-sm">Loading workshop...</div>;

  const { services, products, accounts, customers } = db;

  const totalRevenue     = services.reduce((s, r) => s + r.price, 0);
  const pendingReminders = services.filter(r => r.reminderStatus === 'Pending').length;

  const filtered = useMemo(() =>
    services.filter(r => {
      const allTypes = r.serviceLines?.map(l => l.serviceType).join(' ') ?? r.serviceType;
      const partNames = (r.parts || []).map(part => `${part.name} ${part.partNumber}`).join(' ');
      const matchSearch = !search || (r.customerName + r.customerPhone + r.bikeModel + r.invoiceNumber + allTypes + partNames).toLowerCase().includes(search.toLowerCase());
      const matchType   = filterType === 'all'
        || r.serviceType === filterType
        || r.serviceLines?.some(l => l.serviceType === filterType);
      return matchSearch && matchType;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [services, search, filterType]
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <p className="text-sm text-slate-500">Manage service tickets and oil change reminders</p>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Service
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <Wrench className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-semibold">Total Services</p>
            <p className="text-2xl font-bold text-slate-800">{services.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-semibold">Workshop Revenue</p>
            <p className="text-lg font-bold text-slate-800 font-mono">Rs. {totalRevenue.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-semibold">Oil Reminders Pending</p>
            <p className="text-2xl font-bold text-slate-800">{pendingReminders}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, ticket..."
            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20 shadow-sm w-64"
          />
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden text-xs font-semibold">
          {(['all', 'Oil Change', 'Bike Tuning', 'Brake Service', 'Engine Service'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-2 transition-colors cursor-pointer whitespace-nowrap ${filterType === t ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              {t === 'all' ? 'All Types' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ticket</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Customer</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bike</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Services</th>
              <th className="px-5 py-3.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total</th>
              <th className="px-5 py-3.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Reminder</th>
              <th className="px-5 py-3.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="py-16 text-center text-slate-400 text-sm">
                  {search || filterType !== 'all'
                    ? 'No service records match your filters.'
                    : 'No service records yet. Click "+ New Service" to get started.'}
                </td>
              </tr>
            )}
            {filtered.map(srv => {
              const lines: ServiceLine[] = srv.serviceLines && srv.serviceLines.length > 0
                ? srv.serviceLines
                : [{ serviceType: srv.serviceType, price: srv.price }];
              return (
                <tr key={srv.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-bold font-mono text-red-600">{srv.invoiceNumber}</span>
                  </td>
                  <td className="px-5 py-3.5 text-xs font-mono text-slate-500 whitespace-nowrap">
                    {new Date(srv.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-xs font-bold text-slate-800">{srv.customerName}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{srv.customerPhone}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                      <Bike className="w-3 h-3" />{srv.bikeModel || 'CD-70'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col gap-1">
                      {lines.map((line, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${TYPE_BADGE[line.serviceType as ServiceType] ?? 'bg-slate-100 text-slate-600'}`}>
                            {line.serviceType}
                          </span>
                          {lines.length > 1 && (
                            <span className="text-[10px] text-slate-400 font-mono">Rs. {Number(line.price).toLocaleString()}</span>
                          )}
                        </div>
                      ))}
                      {(srv.parts || []).map(part => (
                        <div key={part.productId} className="flex items-center gap-1.5">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">
                            {part.name} ×{part.qty}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">Rs. {(part.qty * part.sellingPrice).toLocaleString()}</span>
                        </div>
                      ))}
                      {srv.notes && (
                        <p className="text-[10px] text-slate-400 italic mt-0.5 max-w-[180px] truncate" title={srv.notes}>
                          {srv.notes}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm font-bold font-mono text-slate-800">
                    Rs. {srv.price.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {srv.reminderStatus ? (
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${REMINDER_BADGE[srv.reminderStatus] ?? 'bg-slate-100 text-slate-500'}`}>
                        {srv.reminderStatus}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {canEdit && (
                        <button
                          onClick={() => setEditingService(srv)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all cursor-pointer"
                          title="Edit service record"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setReceipt(srv)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all cursor-pointer"
                        title="Print receipt"
                      >
                        <Printer className="w-3.5 h-3.5" />
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
        <NewServiceModal
          products={products}
          accounts={accounts}
          customers={customers}
          onClose={() => setShowNew(false)}
          onSave={saveServiceRecord}
          onBooked={r => setReceipt(r)}
        />
      )}
      {receipt && (
        <ReceiptModal record={receipt} accounts={accounts} onClose={() => setReceipt(null)} />
      )}
      {editingService && (
        <EditServiceModal
          record={editingService}
          products={products}
          accounts={accounts}
          onClose={() => setEditingService(null)}
          onSave={updateServiceRecord}
        />
      )}
    </div>
  );
};
