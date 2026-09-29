import React, { useState, useMemo } from 'react';
import { useApp } from './AppContext';
import { ExpenseCategory, Expense } from '../types';
import { Plus, Trash2, Pencil, X, TrendingDown, Calendar, Tag } from 'lucide-react';

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORIES: ExpenseCategory[] = ['Rent', 'Salary', 'Electricity', 'Utilities', 'Marketing', 'Miscellaneous', 'Transportation', 'Office Supplies'];

const categoryColor: Record<string, string> = {
  Rent:             'bg-purple-100 text-purple-700',
  Salary:           'bg-blue-100 text-blue-700',
  Electricity:      'bg-yellow-100 text-yellow-700',
  Utilities:        'bg-cyan-100 text-cyan-700',
  Marketing:        'bg-pink-100 text-pink-700',
  Miscellaneous:    'bg-slate-100 text-slate-600',
  Transportation:   'bg-orange-100 text-orange-700',
  'Office Supplies':'bg-green-100 text-green-700',
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const toInput = (iso: string) => iso.split('T')[0];

// ─── Expense Form Modal ───────────────────────────────────────────────────────
interface ExpenseModalProps {
  initial?: Expense;
  accounts: { id: string; bankName: string; balance: number }[];
  onClose: () => void;
  onSave: (data: Partial<Expense>) => Promise<boolean>;
  title: string;
}

const ExpenseModal: React.FC<ExpenseModalProps> = ({ initial, accounts, onClose, onSave, title }) => {
  const [category, setCategory] = useState<ExpenseCategory>((initial?.category as ExpenseCategory) ?? 'Utilities');
  const [amount, setAmount]       = useState<number>(initial?.amount ?? 0);
  const [description, setDesc]    = useState(initial?.description ?? '');
  const [date, setDate]           = useState(initial ? toInput(initial.date) : new Date().toISOString().split('T')[0]);
  const [bankAccountId, setBank]  = useState(initial?.bankAccountId ?? 'cash_chest');
  const [saving, setSaving]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return alert('Amount must be greater than 0.');
    if (!description.trim()) return alert('Please enter a description.');
    setSaving(true);
    const ok = await onSave({ category, amount, description: description.trim(), date: new Date(date).toISOString(), bankAccountId });
    setSaving(false);
    if (ok) onClose();
    else alert('Failed to save expense. Please try again.');
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
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category <span className="text-red-500">*</span></label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-red-400 bg-white"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Amount (Rs.) <span className="text-red-500">*</span></label>
              <input
                type="number" min="0" step="0.01"
                value={amount || ''}
                onChange={e => setAmount(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-red-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={description}
              onChange={e => setDesc(e.target.value)}
              placeholder="e.g. Monthly electricity bill..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-red-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-red-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Debit Account</label>
              <select
                value={bankAccountId}
                onChange={e => setBank(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-red-400 bg-white"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.bankName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-all cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition-all cursor-pointer">
              {saving ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main ExpensesView ────────────────────────────────────────────────────────
export const ExpensesView: React.FC = () => {
  const { db, saveExpense, updateExpense, deleteExpense } = useApp();

  const today = new Date().toISOString().split('T')[0];
  const monthStart = today.slice(0, 7) + '-01';

  const [fromDate, setFrom] = useState(monthStart);
  const [toDate,   setTo]   = useState(today);
  const [showAdd,  setShowAdd]  = useState(false);
  const [editExp,  setEditExp]  = useState<Expense | null>(null);

  if (!db) return <div className="p-8 text-slate-400 text-sm">Loading expenses...</div>;

  const { expenses, accounts } = db;

  // ─── Derived stats ────────────────────────────────────────────────────────
  const thisMonthTotal = useMemo(() =>
    expenses.filter(e => e.date.startsWith(today.slice(0, 7))).reduce((s, e) => s + e.amount, 0),
    [expenses, today]
  );

  const filtered = useMemo(() => {
    const from = new Date(fromDate); from.setHours(0, 0, 0, 0);
    const to   = new Date(toDate);   to.setHours(23, 59, 59, 999);
    return expenses.filter(e => {
      const d = new Date(e.date);
      return d >= from && d <= to;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, fromDate, toDate]);

  const filteredTotal = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);

  const topCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    const entries = Object.entries(map);
    if (!entries.length) return '—';
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }, [filtered]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSaveNew = async (data: Partial<Expense>): Promise<boolean> => {
    return saveExpense({
      id: '', date: data.date!, category: data.category!, amount: data.amount!, description: data.description!, bankAccountId: data.bankAccountId
    });
  };

  const handleUpdate = async (data: Partial<Expense>): Promise<boolean> => {
    if (!editExp) return false;
    return updateExpense(editExp.id, data);
  };

  const handleDelete = async (exp: Expense) => {
    if (!confirm(`Delete expense "${exp.description}" (Rs. ${exp.amount.toLocaleString()})? This will reverse the ledger entry.`)) return;
    await deleteExpense(exp.id);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <p className="text-sm text-slate-500">Track business expenses and overheads</p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" /> Record Expense
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <TrendingDown className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-semibold">This Month</p>
            <p className="text-lg font-bold text-red-600 font-mono">Rs. {thisMonthTotal.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-semibold">Filtered Period Total</p>
            <p className="text-lg font-bold text-orange-600 font-mono">Rs. {filteredTotal.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <Tag className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-semibold">Top Category (period)</p>
            <p className="text-lg font-bold text-slate-800">{topCategory}</p>
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-4">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={e => setFrom(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-red-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">To</label>
              <input
                type="date"
                value={toDate}
                onChange={e => setTo(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-red-400"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">
            <span className="font-semibold text-slate-700">{filtered.length}</span> expense{filtered.length !== 1 ? 's' : ''} — Total:{' '}
            <span className="font-bold text-red-600">Rs. {filteredTotal.toLocaleString()}</span>
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Description</th>
              <th className="px-5 py-3.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Amount</th>
              <th className="px-5 py-3.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-16 text-center text-slate-400 text-sm">
                  No expenses in the selected period. Click "+ Record Expense" to add one.
                </td>
              </tr>
            )}
            {filtered.map(exp => (
              <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-3.5 text-xs text-slate-600 whitespace-nowrap">{fmt(exp.date)}</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${categoryColor[exp.category] || 'bg-slate-100 text-slate-600'}`}>
                    {exp.category}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs text-slate-700">{exp.description}</td>
                <td className="px-5 py-3.5 text-right">
                  <span className="font-bold text-red-600 font-mono text-sm">Rs. {exp.amount.toLocaleString()}</span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setEditExp(exp)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all cursor-pointer"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(exp)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showAdd && (
        <ExpenseModal
          accounts={accounts}
          title="Record Expense"
          onClose={() => setShowAdd(false)}
          onSave={handleSaveNew}
        />
      )}
      {editExp && (
        <ExpenseModal
          initial={editExp}
          accounts={accounts}
          title="Edit Expense"
          onClose={() => setEditExp(null)}
          onSave={handleUpdate}
        />
      )}
    </div>
  );
};
