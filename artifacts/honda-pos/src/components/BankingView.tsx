import React, { useState, useMemo } from 'react';
import { useApp } from './AppContext';
import {
  Building2, ArrowUpCircle, ArrowDownCircle, Plus, X,
  Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft,
  Search, Trash2, CreditCard, PiggyBank, Pencil
} from 'lucide-react';

// ─── Add Bank Modal ────────────────────────────────────────────────────────────
interface AddBankModalProps {
  onClose: () => void;
  onCreate: (bankName: string, accountNumber: string, initialBalance: number) => Promise<boolean>;
}

const AddBankModal: React.FC<AddBankModalProps> = ({ onClose, onCreate }) => {
  const [bankName,    setBankName]    = useState('');
  const [accNumber,   setAccNumber]   = useState('');
  const [initBal,     setInitBal]     = useState('');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!bankName.trim())   { setError('Bank name is required.'); return; }
    if (!accNumber.trim())  { setError('Account number is required.'); return; }
    setSaving(true);
    const ok = await onCreate(bankName.trim(), accNumber.trim(), parseFloat(initBal) || 0);
    setSaving(false);
    if (ok) onClose();
    else setError('Failed to create account. Please try again.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <PiggyBank className="w-4 h-4 text-red-500" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Add New Bank Account</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Bank / Account Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={bankName}
              onChange={e => setBankName(e.target.value)}
              placeholder="e.g. HBL Main Account, Petty Cash Drawer"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Account Number / Reference <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={accNumber}
              onChange={e => setAccNumber(e.target.value)}
              placeholder="e.g. 0123-4567890-01 or CASH-PETTY"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Opening Balance (Rs.)
              <span className="ml-1.5 text-slate-400 font-normal">— leave blank for Rs. 0</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={initBal}
              onChange={e => setInitBal(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20"
            />
            {initBal && parseFloat(initBal) > 0 && (
              <p className="mt-1.5 text-[11px] text-emerald-600 font-medium">
                An opening-balance ledger entry of Rs. {parseFloat(initBal).toLocaleString()} will be recorded.
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition-all cursor-pointer"
            >
              {saving ? 'Creating...' : 'Add Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Edit Bank Modal ───────────────────────────────────────────────────────────
interface EditBankModalProps {
  account: { id: string; bankName: string; accountNumber: string };
  onClose: () => void;
  onSave: (id: string, bankName: string, accountNumber: string) => Promise<boolean>;
}

const EditBankModal: React.FC<EditBankModalProps> = ({ account, onClose, onSave }) => {
  const [bankName, setBankName] = useState(account.bankName);
  const [accNumber, setAccNumber] = useState(account.accountNumber);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!bankName.trim()) { setError('Bank name is required.'); return; }
    if (!accNumber.trim()) { setError('Account number is required.'); return; }
    setSaving(true);
    const ok = await onSave(account.id, bankName.trim(), accNumber.trim());
    setSaving(false);
    if (ok) onClose();
    else setError('Failed to update account. Please try again.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Pencil className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Edit Bank Account</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Bank / Account Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={bankName}
              onChange={e => setBankName(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Account Number / Reference <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={accNumber}
              onChange={e => setAccNumber(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20"
            />
          </div>
          <p className="text-[11px] text-slate-400">
            The current balance and transaction history will remain unchanged.
          </p>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-all cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition-all cursor-pointer">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Transaction Modal ─────────────────────────────────────────────────────────
interface TxnModalProps {
  accountId: string;
  onClose: () => void;
  onSave: (accountId: string, type: 'Credit' | 'Debit', amount: number, desc: string) => Promise<boolean>;
  accounts: { id: string; bankName: string; balance: number }[];
}

const TxnModal: React.FC<TxnModalProps> = ({ accountId: initId, onClose, onSave, accounts }) => {
  const [accountId, setAccountId] = useState(initId);
  const [type,      setType]      = useState<'Credit' | 'Debit'>('Credit');
  const [amount,    setAmount]    = useState('');
  const [desc,      setDesc]      = useState('');
  const [saving,    setSaving]    = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return alert('Enter a valid amount.');
    if (!desc.trim())    return alert('Description is required.');
    setSaving(true);
    const ok = await onSave(accountId, type, amt, desc.trim());
    setSaving(false);
    if (ok) onClose();
    else alert('Transaction failed. Please try again.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Record Transaction</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Bank Account</label>
            <select
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20"
            >
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.bankName} — Rs. {a.balance.toLocaleString()}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Transaction Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('Credit')}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  type === 'Credit'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-emerald-200'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" /> Deposit (Credit)
              </button>
              <button
                type="button"
                onClick={() => setType('Debit')}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  type === 'Debit'
                    ? 'bg-red-50 text-red-700 border-red-300'
                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-red-200'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" /> Withdraw (Debit)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Amount (Rs.) <span className="text-red-500">*</span></label>
            <input
              type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description <span className="text-red-500">*</span></label>
            <textarea
              rows={2} value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="e.g. Cash deposit from daily sales"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none resize-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-all cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition-all cursor-pointer">
              {saving ? 'Saving...' : 'Record Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────
interface DeleteBankModalProps {
  bankName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const DeleteBankModal: React.FC<DeleteBankModalProps> = ({ bankName, onClose, onConfirm }) => {
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-100 p-6 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mx-auto">
          <Trash2 className="w-5 h-5 text-red-600" />
        </div>
        <div className="text-center">
          <h3 className="font-bold text-slate-800 mb-1">Delete Account?</h3>
          <p className="text-sm text-slate-500">
            This will permanently remove <span className="font-semibold text-slate-700">{bankName}</span>. This cannot be undone.
          </p>
          <p className="text-xs text-amber-600 font-medium mt-2">The balance must be Rs. 0 before deletion.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold cursor-pointer">Cancel</button>
          <button
            onClick={async () => { setDeleting(true); await onConfirm(); setDeleting(false); }}
            disabled={deleting}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold cursor-pointer"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main BankingView ──────────────────────────────────────────────────────────
export const BankingView: React.FC = () => {
  const { db, saveBankTransaction, createBankAccount, updateBankAccount, deleteBankAccount } = useApp();

  const [search,       setSearch]       = useState('');
  const [filterAcct,   setFilterAcct]   = useState('all');
  const [filterType,   setFilterType]   = useState<'all' | 'Credit' | 'Debit'>('all');
  const [showTxn,      setShowTxn]      = useState(false);
  const [showAddBank,  setShowAddBank]  = useState(false);
  const [editTarget,   setEditTarget]   = useState<{ id: string; bankName: string; accountNumber: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; bankName: string } | null>(null);
  const [modalAcctId,  setModalAcctId]  = useState('');

  if (!db) return <div className="p-8 text-slate-400 text-sm">Loading banking...</div>;

  const { accounts, ledger } = db;

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const totalBalance  = accounts.reduce((s, a) => s + a.balance, 0);
  const totalCredits  = ledger.filter(e => e.type === 'Credit').reduce((s, e) => s + e.amount, 0);
  const totalDebits   = ledger.filter(e => e.type === 'Debit').reduce((s,  e) => s + e.amount, 0);

  // ─── Filtered ledger ───────────────────────────────────────────────────────
  const filtered = useMemo(() =>
    ledger.filter(e => {
      const matchAcct = filterAcct === 'all' || e.bankAccountId === filterAcct;
      const matchType = filterType === 'all' || e.type === filterType;
      const matchSrch = !search
        || e.description.toLowerCase().includes(search.toLowerCase())
        || e.bankName.toLowerCase().includes(search.toLowerCase());
      return matchAcct && matchType && matchSrch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [ledger, filterAcct, filterType, search]
  );

  const openTxn = (id: string) => { setModalAcctId(id); setShowTxn(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const ok = await deleteBankAccount(deleteTarget.id);
    if (!ok) alert('Could not delete. Make sure the balance is Rs. 0 before deleting.');
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <p className="text-sm text-slate-500">Manage bank accounts and transactions</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddBank(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-700 hover:text-red-700 rounded-lg text-sm font-semibold transition-all cursor-pointer shadow-sm"
          >
            <CreditCard className="w-4 h-4" /> Add New Bank
          </button>
          <button
            onClick={() => openTxn(accounts[0]?.id || '')}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> Record Transaction
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="border-t border-slate-200 pt-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-semibold">Total Vault Balance</p>
            <p className="text-lg font-bold text-slate-800 font-mono">Rs. {totalBalance.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-semibold">Total Credits (All Time)</p>
            <p className="text-lg font-bold text-emerald-600 font-mono">Rs. {totalCredits.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
            <TrendingDown className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-semibold">Total Debits (All Time)</p>
            <p className="text-lg font-bold text-rose-600 font-mono">Rs. {totalDebits.toLocaleString()}</p>
          </div>
        </div>
      </div>
      </div>

      {/* Account Cards */}
      <div className="border-t border-slate-200 pt-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {accounts.map(acc => (
          <div
            key={acc.id}
            className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:border-red-200 transition-all group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-700 truncate">{acc.bankName}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{acc.accountNumber}</p>
                </div>
              </div>
               <div className="flex items-center gap-1 shrink-0">
                 <button
                   onClick={() => setEditTarget({ id: acc.id, bankName: acc.bankName, accountNumber: acc.accountNumber })}
                   className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-300 hover:text-blue-600 transition-all cursor-pointer"
                   title="Edit account details"
                 >
                   <Pencil className="w-3.5 h-3.5" />
                 </button>
                 {!['cash_chest'].includes(acc.id) && (
                   <button
                     onClick={() => setDeleteTarget({ id: acc.id, bankName: acc.bankName })}
                     className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all cursor-pointer"
                     title="Delete account (balance must be 0)"
                   >
                     <Trash2 className="w-3.5 h-3.5" />
                   </button>
                 )}
               </div>
            </div>

            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-semibold">Balance</p>
                <p className="text-base font-bold font-mono text-slate-900">Rs. {acc.balance.toLocaleString()}</p>
              </div>
              <button
                onClick={() => openTxn(acc.id)}
                className="flex items-center gap-1 text-[10px] text-red-500 hover:text-red-700 font-bold cursor-pointer transition-colors"
              >
                <Plus className="w-3 h-3" /> Transact
              </button>
            </div>
          </div>
        ))}

        {/* Add New Bank shortcut card */}
        <button
          onClick={() => setShowAddBank(true)}
          className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-red-300 hover:bg-red-50/40 transition-all cursor-pointer group min-h-[96px]"
        >
          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 group-hover:border-red-300 flex items-center justify-center transition-all">
            <Plus className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors" />
          </div>
          <p className="text-xs font-semibold text-slate-400 group-hover:text-red-500 transition-colors">Add New Bank</p>
        </button>
      </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20 shadow-sm w-56"
          />
        </div>
        <select
          value={filterAcct}
          onChange={e => setFilterAcct(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400 shadow-sm cursor-pointer"
        >
          <option value="all">All Accounts</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.bankName}</option>)}
        </select>
        <div className="flex rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden text-xs font-semibold">
          {(['all', 'Credit', 'Debit'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-2 transition-colors cursor-pointer ${filterType === t ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {t === 'all' ? 'All' : t === 'Credit' ? '↑ Credits' : '↓ Debits'}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Account</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Description</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="px-5 py-3.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Amount</th>
              <th className="px-5 py-3.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bal After</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-16 text-center text-slate-400 text-sm">
                  {search || filterAcct !== 'all' || filterType !== 'all'
                    ? 'No transactions match your filters.'
                    : 'No transactions recorded yet.'}
                </td>
              </tr>
            )}
            {filtered.map(entry => {
              const isCredit = entry.type === 'Credit';
              return (
                <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5 text-xs text-slate-500 font-mono whitespace-nowrap">
                    {new Date(entry.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {entry.bankName}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600 max-w-xs truncate">{entry.description}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      isCredit ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {isCredit ? <ArrowUpCircle className="w-3 h-3" /> : <ArrowDownCircle className="w-3 h-3" />}
                      {entry.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`text-sm font-bold font-mono ${isCredit ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isCredit ? '+' : '-'}Rs. {entry.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-xs font-mono text-slate-500">
                    Rs. {entry.balanceAfter.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showTxn && (
        <TxnModal
          accountId={modalAcctId}
          accounts={accounts}
          onClose={() => setShowTxn(false)}
          onSave={saveBankTransaction}
        />
      )}
      {showAddBank && (
        <AddBankModal
          onClose={() => setShowAddBank(false)}
          onCreate={createBankAccount}
        />
      )}
      {editTarget && (
        <EditBankModal
          account={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={updateBankAccount}
        />
      )}
      {deleteTarget && (
        <DeleteBankModal
          bankName={deleteTarget.bankName}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
};
