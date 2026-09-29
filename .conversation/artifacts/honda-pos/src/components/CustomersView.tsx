import React, { useState, useMemo } from 'react';
import { useApp } from './AppContext';
import { Customer, SaleInvoice, ServiceRecord } from '../types';
import {
  Plus, Pencil, Trash2, Search, X, Users, CreditCard, AlertCircle,
  ChevronRight, Receipt, CheckCircle, Clock, Banknote, Phone, MapPin, Bike,
} from 'lucide-react';

// ─── Customer Modal ────────────────────────────────────────────────────────────
interface CustomerModalProps {
  initial?: Customer;
  onClose: () => void;
  onSave: (data: Partial<Customer>) => Promise<boolean>;
  title: string;
}

const CustomerModal: React.FC<CustomerModalProps> = ({ initial, onClose, onSave, title }) => {
  const [name, setName]       = useState(initial?.name ?? '');
  const [phone, setPhone]     = useState(initial?.phone ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [bikeModel, setBike]  = useState(initial?.bikeModel ?? '');
  const [credit, setCredit]   = useState(initial?.creditBalance ?? 0);
  const [saving, setSaving]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Customer name is required.');
    if (!phone.trim()) return alert('Phone number is required.');
    setSaving(true);
    const ok = await onSave({ name: name.trim(), phone: phone.trim(), address: address.trim(), bikeModel: bikeModel.trim(), creditBalance: credit });
    setSaving(false);
    if (ok) onClose();
    else alert('Failed to save customer.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Muhammad Salman"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone <span className="text-red-500">*</span></label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="03XX-XXXXXXX"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Bike Model</label>
              <input type="text" value={bikeModel} onChange={e => setBike(e.target.value)} placeholder="e.g. CD-70, CG-125"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Address</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. Gulberg III, Lahore"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Credit Balance (Rs.)</label>
              <input type="number" min="0" value={credit || ''} onChange={e => setCredit(Math.max(0, Number(e.target.value)))} placeholder="0"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-all cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition-all cursor-pointer">
              {saving ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Customer Detail Drawer ───────────────────────────────────────────────────
interface CustomerDetailProps {
  customer: Customer;
  invoices: SaleInvoice[];
  services: ServiceRecord[];
  onClose: () => void;
  onEdit: () => void;
  onRecordPayment: (amount: number, note: string, bankAccountId: string) => Promise<void>;
  accounts: { id: string; bankName: string }[];
  showEdit?: boolean;
}

const CustomerDetail: React.FC<CustomerDetailProps> = ({ customer, invoices, services, onClose, onEdit, onRecordPayment, accounts, showEdit = true }) => {
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentNote, setPaymentNote]     = useState<string>('');
  const [paymentBankId, setPaymentBankId] = useState<string>('cash_chest');
  const [showPayForm, setShowPayForm]     = useState<boolean>(false);
  const [submitting, setSubmitting]       = useState<boolean>(false);

  // Get invoices for this customer (match by id or phone)
  const custInvoices = useMemo(() =>
    invoices
      .filter(inv => inv.customerId === customer.id || inv.customerPhone === customer.phone)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [invoices, customer]
  );
  const custServices = useMemo(() =>
    services
      .filter(service => service.customerPhone === customer.phone || service.customerName === customer.name)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [services, customer]
  );

  const totalSpent    = custInvoices.reduce((s, inv) => s + inv.finalAmount, 0) + custServices.reduce((s, service) => s + service.price, 0);
  const totalPaid     = custInvoices.reduce((s, inv) => s + ((inv as any).amountPaid ?? inv.finalAmount), 0) + custServices.reduce((s, service) => s + service.price, 0);
  const totalDueCalc  = custInvoices.reduce((s, inv) => s + ((inv as any).amountDue ?? 0), 0);
  const creditBalance = customer.creditBalance ?? 0;

  const handlePayment = async () => {
    if (paymentAmount <= 0) return alert('Enter a valid amount.');
    if (paymentAmount > creditBalance) return alert(`Amount cannot exceed credit balance of Rs.${creditBalance.toLocaleString()}`);
    setSubmitting(true);
    await onRecordPayment(paymentAmount, paymentNote || 'Customer credit payment', paymentBankId);
    setSubmitting(false);
    setPaymentAmount(0);
    setPaymentNote('');
    setShowPayForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <span className="text-red-600 font-bold text-sm">{customer.name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-slate-800 truncate">{customer.name}</h2>
            <p className="text-xs text-slate-500 font-mono">{customer.phone}</p>
          </div>
          {showEdit && (
            <button onClick={onEdit} className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition-all cursor-pointer">
              Edit
            </button>
          )}
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Customer Info + Summary */}
        <div className="px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex flex-wrap gap-3 text-xs text-slate-600 mb-4">
            {customer.phone && (
              <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /><span className="font-mono">{customer.phone}</span></div>
            )}
            {customer.bikeModel && (
              <div className="flex items-center gap-1.5"><Bike className="w-3.5 h-3.5 text-slate-400" /><span>{customer.bikeModel}</span></div>
            )}
            {customer.address && (
              <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" /><span>{customer.address}</span></div>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Total Sales</p>
              <p className="text-lg font-black text-slate-800 font-mono">Rs.{totalSpent.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500">{custInvoices.length} invoice{custInvoices.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
              <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wide">Total Paid</p>
              <p className="text-lg font-black text-emerald-700 font-mono">Rs.{totalPaid.toLocaleString()}</p>
            </div>
            <div className={`rounded-xl p-3 border ${creditBalance > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-100'}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${creditBalance > 0 ? 'text-amber-600' : 'text-green-600'}`}>Credit Due</p>
              <p className={`text-lg font-black font-mono ${creditBalance > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                Rs.{creditBalance.toLocaleString()}
              </p>
              {creditBalance > 0 && <p className="text-[10px] text-amber-500">Outstanding</p>}
            </div>
          </div>

          {/* Record Payment Button / Form */}
          {creditBalance > 0 && (
            <div className="mt-3">
              {!showPayForm ? (
                <button
                  onClick={() => setShowPayForm(true)}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-amber-500/25"
                >
                  <Banknote className="w-4 h-4" />
                  Record Credit Payment
                </button>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-amber-800">Record Payment</span>
                    <button onClick={() => setShowPayForm(false)} className="text-amber-500 hover:text-amber-700 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-semibold text-amber-700 mb-1">Amount Received (Rs.)</label>
                      <input
                        type="number" min="1" max={creditBalance}
                        value={paymentAmount || ''}
                        onChange={e => setPaymentAmount(Math.min(creditBalance, Math.max(0, Number(e.target.value))))}
                        placeholder={`Max: ${creditBalance.toLocaleString()}`}
                        className="w-full px-3 py-2 border border-amber-300 rounded-lg text-xs font-mono outline-none focus:border-amber-500 bg-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-semibold text-amber-700 mb-1">Deposit to Account</label>
                      <select
                        value={paymentBankId}
                        onChange={e => setPaymentBankId(e.target.value)}
                        className="w-full px-3 py-2 border border-amber-300 rounded-lg text-xs outline-none focus:border-amber-500 bg-white"
                      >
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.bankName}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-semibold text-amber-700 mb-1">Note (optional)</label>
                      <input type="text" value={paymentNote} onChange={e => setPaymentNote(e.target.value)}
                        placeholder="e.g. Cash collected at counter"
                        className="w-full px-3 py-2 border border-amber-300 rounded-lg text-xs outline-none focus:border-amber-500 bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowPayForm(false)} className="flex-1 py-2 text-xs font-semibold text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-100 transition-all cursor-pointer">
                      Cancel
                    </button>
                    <button
                      onClick={handlePayment}
                      disabled={submitting || paymentAmount <= 0}
                      className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      {submitting ? 'Saving...' : `Confirm Rs.${paymentAmount.toLocaleString()}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sales History */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-3 border-b border-slate-100 bg-white sticky top-0 z-10">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <Receipt className="w-3.5 h-3.5" />
              Sales History ({custInvoices.length})
            </h3>
          </div>

          {custInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
              <Receipt className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm">No sales recorded yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {custInvoices.map(inv => {
                const invAmountPaid = (inv as any).amountPaid ?? inv.finalAmount;
                const invAmountDue  = (inv as any).amountDue ?? 0;
                const isPaid = invAmountDue <= 0;
                return (
                  <div key={inv.id} className="px-6 py-4 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[11px] font-bold text-slate-700">{inv.invoiceNumber}</span>
                          {isPaid ? (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                              <CheckCircle className="w-2.5 h-2.5" />PAID
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                              <Clock className="w-2.5 h-2.5" />CREDIT
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mb-1.5">{new Date(inv.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        <div className="flex flex-wrap gap-1">
                          {inv.items.slice(0, 3).map(item => (
                            <span key={item.productId} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium truncate max-w-[120px]">
                              {item.name} ×{item.qty}
                            </span>
                          ))}
                          {inv.items.length > 3 && (
                            <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">+{inv.items.length - 3} more</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black font-mono text-slate-800">Rs.{inv.finalAmount.toLocaleString()}</p>
                        {!isPaid ? (
                          <>
                            <p className="text-[10px] text-emerald-600 font-semibold font-mono">Paid: Rs.{invAmountPaid.toLocaleString()}</p>
                            <p className="text-[10px] text-amber-600 font-bold font-mono">Due: Rs.{invAmountDue.toLocaleString()}</p>
                          </>
                        ) : (
                          <p className="text-[10px] text-slate-400">{inv.paymentMethod}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {custServices.length > 0 && (
            <div className="border-t border-slate-100">
              <div className="px-6 py-3 bg-slate-50/70">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <Bike className="w-3.5 h-3.5" /> Workshop Bills ({custServices.length})
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {custServices.map(service => (
                  <div key={service.id} className="px-6 py-3.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] font-bold text-blue-700">{service.invoiceNumber}</p>
                      <p className="text-[10px] text-slate-400">{new Date(service.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })} · {service.bikeModel}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(service.serviceLines || [{ serviceType: service.serviceType, price: service.price }]).map((line, index) => (
                          <span key={index} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                            {line.serviceType}
                          </span>
                        ))}
                        {(service.parts || []).map(part => (
                          <span key={part.productId} className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded">
                            {part.name} ×{part.qty}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-sm font-black font-mono text-slate-800 shrink-0">Rs.{service.price.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main CustomersView ───────────────────────────────────────────────────────
export const CustomersView: React.FC = () => {
  const { db, saveCustomer, updateCustomer, deleteCustomer, recordCreditPayment, currentUser } = useApp();
  const canEditCustomers = currentUser?.role !== 'Cashier';

  const [search,       setSearch]       = useState('');
  const [showAdd,      setShowAdd]      = useState(false);
  const [editCust,     setEditCust]     = useState<Customer | null>(null);
  const [viewCust,     setViewCust]     = useState<Customer | null>(null);

  if (!db) return <div className="p-8 text-slate-400 text-sm">Loading customers...</div>;

  const { customers, invoices, services, accounts } = db;

  // Stats
  const totalCustomers = customers.length;
  const withCredit     = customers.filter(c => (c.creditBalance ?? 0) > 0).length;
  const totalCredit    = customers.reduce((s, c) => s + (c.creditBalance ?? 0), 0);

  // Filtered list
  const filtered = useMemo(() =>
    customers.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.bikeModel || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.address || '').toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => {
      const aTime = Number(a.id.replace(/\D/g, '')) || 0;
      const bTime = Number(b.id.replace(/\D/g, '')) || 0;
      return bTime - aTime;
    }),
    [customers, search]
  );

  // Purchase count per customer
  const purchaseCount = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach(inv => { if (inv.customerId) map[inv.customerId] = (map[inv.customerId] || 0) + 1; });
    return map;
  }, [invoices]);

  const handleDelete = async (c: Customer) => {
    if (!confirm(`Delete customer "${c.name}"? This cannot be undone.`)) return;
    await deleteCustomer(c.id);
  };

  const handleSaveNew = async (data: Partial<Customer>): Promise<boolean> =>
    saveCustomer({ id: '', name: '', phone: '', address: '', bikeModel: '', ...data });

  const handleUpdate = async (data: Partial<Customer>): Promise<boolean> => {
    if (!editCust) return false;
    return updateCustomer(editCust.id, data);
  };

  const handleRecordPayment = async (amount: number, note: string, bankAccountId: string) => {
    if (!viewCust) return;
    const ok = await recordCreditPayment(viewCust.id, amount, note, bankAccountId);
    if (!ok) alert('Failed to record payment. Please try again.');
  };

  // Keep drawer in sync with latest db after payment updates
  const liveViewCust = viewCust ? customers.find(c => c.id === viewCust.id) ?? viewCust : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <p className="text-sm text-slate-500">Manage customers and credit balances</p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-semibold">Total Customers</p>
            <p className="text-2xl font-bold text-slate-800">{totalCustomers}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-semibold">Customers with Credit</p>
            <p className="text-2xl font-bold text-slate-800">{withCredit}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-semibold">Total Credit Outstanding</p>
            <p className="text-xl font-bold text-red-600 font-mono">Rs. {totalCredit.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20 shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Phone</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Address</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bike</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Credit Balance</th>
              <th className="px-5 py-3.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-16 text-center text-slate-400 text-sm">
                  {search ? `No customers matching "${search}".` : 'No customers yet. Click "+ Add Customer" to get started.'}
                </td>
              </tr>
            )}
            {filtered.map(c => {
              const credit = c.creditBalance ?? 0;
              const orders = purchaseCount[c.id] || 0;
              return (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                  onClick={() => setViewCust(c)}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-red-600 font-bold text-xs">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800">{c.name}</p>
                        {orders > 0 && <p className="text-[10px] text-slate-400 mt-0.5">{orders} order{orders !== 1 ? 's' : ''}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs font-mono text-slate-600">{c.phone}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-600 hidden md:table-cell">{c.address || <span className="text-slate-300">—</span>}</td>
                  <td className="px-5 py-3.5">
                    {c.bikeModel
                      ? <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">{c.bikeModel}</span>
                      : <span className="text-slate-300 text-xs">—</span>
                    }
                  </td>
                  <td className="px-5 py-3.5">
                    {credit > 0
                      ? <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 font-mono">Rs. {credit.toLocaleString()}</span>
                      : <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-100 text-green-700">No Balance</span>
                    }
                  </td>
                  <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setViewCust(c)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                        title="View details"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      {canEditCustomers && (
                        <>
                          <button
                            onClick={() => setEditCust(c)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all cursor-pointer"
                            title="Edit customer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all cursor-pointer"
                            title="Delete customer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showAdd && <CustomerModal title="Add Customer" onClose={() => setShowAdd(false)} onSave={handleSaveNew} />}
      {editCust && (
        <CustomerModal
          initial={editCust}
          title="Edit Customer"
          onClose={() => setEditCust(null)}
          onSave={handleUpdate}
        />
      )}

      {/* Customer Detail Drawer */}
      {liveViewCust && (
        <CustomerDetail
          customer={liveViewCust}
          invoices={invoices}
          services={services}
          accounts={accounts}
          onClose={() => setViewCust(null)}
          onEdit={() => { setEditCust(liveViewCust); setViewCust(null); }}
          onRecordPayment={handleRecordPayment}
          showEdit={canEditCustomers}
        />
      )}
    </div>
  );
};
