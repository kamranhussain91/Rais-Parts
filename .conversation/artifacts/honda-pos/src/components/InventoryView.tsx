import React, { useState, useMemo } from 'react';
import { useApp } from './AppContext';
import { Product, StockAdjustmentRecord, StockAdjustmentType, AdjustmentResolution } from '../types';
import {
  Plus, Search, Edit3, Trash2, Package, X, Tag, AlertTriangle,
  ShieldAlert, RotateCcw, ArrowLeftRight, ClipboardList,
  CheckCircle2, Clock, ChevronDown, Filter, TrendingDown, TrendingUp,
} from 'lucide-react';

// ─── helpers ─────────────────────────────────────────────────────────────────
const DAMAGE_REASONS: Record<StockAdjustmentType, string[]> = {
  'Damage': ['Physical damage', 'Expiry / deterioration', 'Leakage / spill', 'Manufacturing defect', 'Storage damage', 'Other'],
  'Customer Return': ['Wrong part ordered', 'Duplicate purchase', 'Defective on arrival', 'Customer changed mind', 'Other'],
  'Supplier Return': ['Defective batch', 'Wrong item shipped', 'Overstock return', 'Price dispute', 'Other'],
  'Manual Adjustment': ['Stock count correction', 'System error fix', 'Initial stock entry', 'Audit correction', 'Other'],
};

const TYPE_CONFIG: Record<StockAdjustmentType, { label: string; color: string; bg: string; border: string; icon: React.ReactNode; stockLabel: string }> = {
  'Damage': {
    label: 'Damage', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200',
    icon: <ShieldAlert className="w-3.5 h-3.5" />, stockLabel: 'Stock ▼',
  },
  'Customer Return': {
    label: 'Customer Return', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200',
    icon: <RotateCcw className="w-3.5 h-3.5" />, stockLabel: 'Stock ▲',
  },
  'Supplier Return': {
    label: 'Supplier Return', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200',
    icon: <ArrowLeftRight className="w-3.5 h-3.5" />, stockLabel: 'Stock ▼',
  },
  'Manual Adjustment': {
    label: 'Adjustment', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200',
    icon: <ClipboardList className="w-3.5 h-3.5" />, stockLabel: 'Stock ±',
  },
};

const RESOLUTION_CONFIG: Record<AdjustmentResolution, { label: string; color: string; bg: string }> = {
  'Pending':              { label: 'Pending',              color: 'text-amber-600',  bg: 'bg-amber-50'  },
  'Returned to Supplier': { label: 'Returned to Supplier', color: 'text-blue-600',   bg: 'bg-blue-50'   },
  'Written Off':          { label: 'Written Off',          color: 'text-slate-500',  bg: 'bg-slate-100' },
  'Repaired & Restocked': { label: 'Repaired & Restocked', color: 'text-emerald-600',bg: 'bg-emerald-50'},
};

const inputCls = 'w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50 rounded-lg outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 focus:bg-white transition-all';
const labelCls = 'block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider';

// ─── Main component ───────────────────────────────────────────────────────────
export const InventoryView: React.FC = () => {
  const { db, saveProduct, deleteProduct, saveStockAdjustment, updateStockAdjustment, deleteStockAdjustment, currentUser } = useApp();
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin' || currentUser?.role === 'Manager';

  const [activeTab, setActiveTab] = useState<'products' | 'adjustments'>('products');

  // ── Products state ──
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low'>('all');
  const [isProductOpen, setIsProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pName, setPName] = useState('');
  const [pPartNumber, setPPartNumber] = useState('');
  const [pBarcode, setPBarcode] = useState('');
  const [pCategory, setPCategory] = useState('Engine Parts');
  const [pCompatibility, setPCompatibility] = useState('Honda');
  const [pPurchasePrice, setPPurchasePrice] = useState(0);
  const [pSellingPrice, setPSellingPrice] = useState(0);
  const [pStock, setPStock] = useState(0);
  const [pMinStock, setPMinStock] = useState(5);
  const [pSupplierName, setPSupplierName] = useState('');
  const [pLocation, setPLocation] = useState('');

  // ── Adjustment modal state ──
  const [isAdjOpen, setIsAdjOpen] = useState(false);
  const [adjProduct, setAdjProduct] = useState<Product | null>(null);
  const [adjProductSearch, setAdjProductSearch] = useState('');
  const [adjType, setAdjType] = useState<StockAdjustmentType>('Damage');
  const [adjQty, setAdjQty] = useState(1);
  const [adjDirection, setAdjDirection] = useState<'Add' | 'Remove'>('Remove');
  const [adjReason, setAdjReason] = useState('');
  const [adjRefNo, setAdjRefNo] = useState('');
  const [adjNotes, setAdjNotes] = useState('');
  const [adjSaving, setAdjSaving] = useState(false);

  // ── Adjustments list state ──
  const [adjSearch, setAdjSearch] = useState('');
  const [adjTypeFilter, setAdjTypeFilter] = useState<'all' | StockAdjustmentType>('all');
  const [adjResFilter, setAdjResFilter] = useState<'all' | AdjustmentResolution>('all');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [newResolution, setNewResolution] = useState<AdjustmentResolution>('Written Off');
  const [confirmAdjDeleteId, setConfirmAdjDeleteId] = useState<string | null>(null);

  if (!db) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <div className="w-5 h-5 rounded-full border-2 border-t-red-600 border-slate-200 animate-spin" />
      <span className="text-sm text-slate-400 font-medium">Loading catalog…</span>
    </div>
  );

  const { products } = db;
  const adjustments: StockAdjustmentRecord[] = db.stockAdjustments || [];

  // ── Product handlers ──
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setPName(''); setPPartNumber('');
    setPBarcode(String(Date.now()).substring(3, 13));
    setPCategory('Engine Parts'); setPCompatibility('Honda');
    setPPurchasePrice(0); setPSellingPrice(0);
    setPStock(0); setPMinStock(5);
    setPSupplierName('Honda Atlas Parts Ltd'); setPLocation('Rack A, Shelf 1');
    setIsProductOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setPName(p.name); setPPartNumber(p.partNumber); setPBarcode(p.barcode);
    setPCategory(p.category); setPCompatibility(p.compatibility);
    setPPurchasePrice(p.purchasePrice); setPSellingPrice(p.sellingPrice);
    setPStock(p.stock); setPMinStock(p.minStock);
    setPSupplierName(p.supplierName); setPLocation(p.location);
    setIsProductOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName || !pPartNumber || !pBarcode) { alert('Name, Part Number and Barcode are required.'); return; }
    const prod: Product = {
      id: editingProduct ? editingProduct.id : '',
      name: pName, partNumber: pPartNumber, barcode: pBarcode,
      category: pCategory, compatibility: pCompatibility,
      purchasePrice: Number(pPurchasePrice), sellingPrice: Number(pSellingPrice),
      stock: Number(pStock), minStock: Number(pMinStock), supplierName: pSupplierName, location: pLocation,
    };
    const ok = await saveProduct(prod);
    if (ok) { setIsProductOpen(false); setEditingProduct(null); }
    else alert('Error saving product.');
  };

  const handleDeleteProduct = async (id: string) => {
    if (!isAdmin) { alert('Only administrators can delete products.'); return; }
    const ok = await deleteProduct(id);
    if (ok) setConfirmDeleteId(null);
    else alert('Failed to delete.');
  };

  // ── Adjustment handlers ──
  const openAdjModal = (product?: Product) => {
    setAdjProduct(product || null);
    setAdjProductSearch('');
    setAdjType('Damage');
    setAdjQty(1);
    setAdjDirection('Remove');
    setAdjReason('');
    setAdjRefNo('');
    setAdjNotes('');
    setIsAdjOpen(true);
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjProduct) { alert('Please select a product.'); return; }
    if (!adjReason) { alert('Please select a reason.'); return; }
    if (adjQty <= 0) { alert('Quantity must be greater than 0.'); return; }
    setAdjSaving(true);
    const ok = await saveStockAdjustment({
      productId: adjProduct.id,
      type: adjType,
      qty: adjQty,
      direction: adjType === 'Manual Adjustment' ? adjDirection : undefined,
      reason: adjReason,
      notes: adjNotes || undefined,
      referenceNo: adjRefNo || undefined,
    });
    setAdjSaving(false);
    if (ok) { setIsAdjOpen(false); setActiveTab('adjustments'); }
    else alert('Failed to save adjustment.');
  };

  const handleResolve = async (id: string) => {
    const ok = await updateStockAdjustment(id, newResolution);
    if (ok) setResolvingId(null);
    else alert('Failed to update resolution.');
  };

  const handleDeleteAdj = async (id: string) => {
    const ok = await deleteStockAdjustment(id);
    if (ok) setConfirmAdjDeleteId(null);
    else alert('Failed to delete adjustment.');
  };

  // ── Filtered lists ──
  const filteredProducts = products.filter(p => {
    const q = searchTerm.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(q) || p.partNumber.toLowerCase().includes(q) || p.barcode.includes(q);
    const matchStock = stockFilter === 'all' || p.stock <= p.minStock;
    return matchSearch && matchStock;
  }).sort((a, b) => {
    const aTime = Number(a.id.replace(/\D/g, '')) || 0;
    const bTime = Number(b.id.replace(/\D/g, '')) || 0;
    return bTime - aTime;
  });

  const filteredAdj = useMemo(() => adjustments.filter(a => {
    const q = adjSearch.toLowerCase();
    const matchSearch = a.productName.toLowerCase().includes(q) || a.partNumber.toLowerCase().includes(q) || (a.referenceNo || '').toLowerCase().includes(q);
    const matchType = adjTypeFilter === 'all' || a.type === adjTypeFilter;
    const matchRes = adjResFilter === 'all' || a.resolution === adjResFilter;
    return matchSearch && matchType && matchRes;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [adjustments, adjSearch, adjTypeFilter, adjResFilter]);

  const adjStats = useMemo(() => ({
    totalDamage: adjustments.filter(a => a.type === 'Damage').reduce((s, a) => s + a.qty, 0),
    totalCustomerReturn: adjustments.filter(a => a.type === 'Customer Return').reduce((s, a) => s + a.qty, 0),
    totalSupplierReturn: adjustments.filter(a => a.type === 'Supplier Return').reduce((s, a) => s + a.qty, 0),
    pending: adjustments.filter(a => a.resolution === 'Pending').length,
  }), [adjustments]);

  const adjProductOptions = products.filter(p =>
    p.name.toLowerCase().includes(adjProductSearch.toLowerCase()) ||
    p.partNumber.toLowerCase().includes(adjProductSearch.toLowerCase())
  ).slice(0, 8);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* PAGE HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inventory</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage products, damage records, and returns</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openAdjModal()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-lg text-sm font-bold shadow-sm shadow-amber-500/20 cursor-pointer transition-all"
          >
            <ShieldAlert className="w-4 h-4" /> Log Damage / Return
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white rounded-lg text-sm font-bold shadow-sm shadow-red-600/20 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-0 bg-slate-100 rounded-xl p-1 border border-slate-200 w-fit">
        {([
          { key: 'products', label: 'Products', count: products.length },
          { key: 'adjustments', label: 'Damage & Returns', count: adjustments.length, alert: adjStats.pending > 0 },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === t.key ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-500'}`}>
              {t.count}
            </span>
            {(t as any).alert && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
          </button>
        ))}
      </div>

      {/* ═══════════ PRODUCTS TAB ═══════════ */}
      {activeTab === 'products' && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, part number or barcode..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200 text-xs font-semibold gap-0.5">
              <button
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${stockFilter === 'all' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setStockFilter('all')}
              >All</button>
              <button
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${stockFilter === 'low' ? 'bg-amber-50 text-amber-700 shadow-sm border border-amber-100' : 'text-slate-500 hover:text-amber-600'}`}
                onClick={() => setStockFilter('low')}
              >
                <AlertTriangle className="w-3 h-3" /> Low Stock
              </button>
            </div>
            <span className="text-xs text-slate-400 font-medium">{filteredProducts.length} products</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-[2fr_1.4fr_1.2fr_0.8fr_0.9fr_0.7fr_0.8fr_auto] gap-0 border-b border-slate-100 bg-slate-50 px-5 py-3">
              {['PRODUCT', 'PART NO / BARCODE', 'CATEGORY / BRAND', 'COST', 'SALE PRICE', 'STOCK', 'STATUS', 'ACTIONS'].map(h => (
                <span key={h} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</span>
              ))}
            </div>
            {filteredProducts.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
                <Package className="w-8 h-8 text-slate-200" />
                <p className="text-sm font-medium">No products found</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filteredProducts.map(p => {
                  const isLow = p.stock <= p.minStock;
                  const isOut = p.stock === 0;
                  return (
                    <div key={p.id} className="grid grid-cols-[2fr_1.4fr_1.2fr_0.8fr_0.9fr_0.7fr_0.8fr_auto] gap-0 items-center px-5 py-4 hover:bg-slate-50/70 transition-colors group">
                      <div className="pr-4">
                        <p className="font-bold text-slate-900 text-sm leading-tight">{p.name}</p>
                        {isLow && !isOut && <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 mt-0.5"><AlertTriangle className="w-2.5 h-2.5" /> Low Stock</span>}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700 font-mono">{p.partNumber}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.barcode}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-700">{p.category}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{p.compatibility || 'Honda'}</p>
                      </div>
                      <div><span className="text-sm text-slate-600 font-medium">Rs. {p.purchasePrice.toLocaleString()}</span></div>
                      <div><span className="text-sm font-bold text-red-600">Rs. {p.sellingPrice.toLocaleString()}</span></div>
                      <div>
                        <span className={`text-base font-black tabular-nums ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-teal-600'}`}>{p.stock}</span>
                      </div>
                      <div>
                        {isOut ? (
                          <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">Out of Stock</span>
                        ) : isLow ? (
                          <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">Low Stock</span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">In Stock</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 pl-2">
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openAdjModal(p)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all cursor-pointer"
                              title="Log damage / return"
                            ><ShieldAlert className="w-3.5 h-3.5" /></button>
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer"
                              title="Edit product"
                            ><Edit3 className="w-3.5 h-3.5" /></button>
                            {confirmDeleteId === p.id ? (
                              <button onClick={() => handleDeleteProduct(p.id)} className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg cursor-pointer">Sure?</button>
                            ) : (
                              <button
                                onClick={() => { setConfirmDeleteId(p.id); setTimeout(() => setConfirmDeleteId(null), 4000); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                                title="Delete product"
                              ><Trash2 className="w-3.5 h-3.5" /></button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════ DAMAGE & RETURNS TAB ═══════════ */}
      {activeTab === 'adjustments' && (
        <>
          {/* Summary stat cards */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Damaged Items', value: adjStats.totalDamage, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', icon: <ShieldAlert className="w-4 h-4" /> },
              { label: 'Customer Returns', value: adjStats.totalCustomerReturn, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', icon: <RotateCcw className="w-4 h-4" /> },
              { label: 'Supplier Returns', value: adjStats.totalSupplierReturn, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: <ArrowLeftRight className="w-4 h-4" /> },
              { label: 'Pending Resolution', value: adjStats.pending, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', icon: <Clock className="w-4 h-4" /> },
            ].map(s => (
              <div key={s.label} className={`${s.bg} ${s.border} border rounded-xl p-4 flex items-center gap-3`}>
                <div className={`${s.color} opacity-80`}>{s.icon}</div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{s.label}</p>
                  <p className={`text-2xl font-black ${s.color} tabular-nums`}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by product, part number or reference..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                value={adjSearch}
                onChange={e => setAdjSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                className="text-xs border border-slate-200 rounded-lg px-2 py-2 bg-white text-slate-700 outline-none focus:border-red-400 cursor-pointer"
                value={adjTypeFilter}
                onChange={e => setAdjTypeFilter(e.target.value as any)}
              >
                <option value="all">All Types</option>
                {(Object.keys(TYPE_CONFIG) as StockAdjustmentType[]).map(t => (
                  <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
                ))}
              </select>
              <select
                className="text-xs border border-slate-200 rounded-lg px-2 py-2 bg-white text-slate-700 outline-none focus:border-red-400 cursor-pointer"
                value={adjResFilter}
                onChange={e => setAdjResFilter(e.target.value as any)}
              >
                <option value="all">All Resolutions</option>
                {(Object.keys(RESOLUTION_CONFIG) as AdjustmentResolution[]).map(r => (
                  <option key={r} value={r}>{RESOLUTION_CONFIG[r].label}</option>
                ))}
              </select>
            </div>
            <span className="text-xs text-slate-400 font-medium">{filteredAdj.length} records</span>
          </div>

          {/* Adjustments table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-[1.8fr_1.1fr_1fr_0.6fr_1.1fr_1.1fr_1.1fr_auto] border-b border-slate-100 bg-slate-50 px-5 py-3 gap-0">
              {['PRODUCT', 'TYPE', 'REASON', 'QTY', 'STOCK CHANGE', 'RESOLUTION', 'DATE', 'ACTIONS'].map(h => (
                <span key={h} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</span>
              ))}
            </div>

            {filteredAdj.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
                <ShieldAlert className="w-8 h-8 text-slate-200" />
                <p className="text-sm font-medium">No damage or return records found</p>
                <p className="text-xs">Use "Log Damage / Return" to record an issue</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filteredAdj.map(a => {
                  const tc = TYPE_CONFIG[a.type];
                  const rc = RESOLUTION_CONFIG[a.resolution];
                  const delta = a.stockAfter - a.stockBefore;
                  return (
                    <div key={a.id} className="grid grid-cols-[1.8fr_1.1fr_1fr_0.6fr_1.1fr_1.1fr_1.1fr_auto] items-center px-5 py-4 hover:bg-slate-50/60 transition-colors gap-0">
                      {/* Product */}
                      <div className="pr-3">
                        <p className="font-bold text-slate-800 text-sm leading-tight">{a.productName}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{a.partNumber}</p>
                        {a.referenceNo && <p className="text-[10px] text-slate-400 mt-0.5">Ref: {a.referenceNo}</p>}
                      </div>
                      {/* Type badge */}
                      <div>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${tc.bg} ${tc.color} ${tc.border} border`}>
                          {tc.icon} {tc.label}
                        </span>
                      </div>
                      {/* Reason */}
                      <div>
                        <p className="text-xs text-slate-700 font-medium">{a.reason}</p>
                        {a.notes && <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]">{a.notes}</p>}
                      </div>
                      {/* Qty */}
                      <div>
                        <span className="text-base font-black text-slate-800 tabular-nums">{a.qty}</span>
                      </div>
                      {/* Stock change */}
                      <div className="flex items-center gap-1">
                        {delta > 0 ? (
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                        )}
                        <span className="text-xs font-mono text-slate-600">{a.stockBefore} → {a.stockAfter}</span>
                        <span className={`text-[10px] font-bold ${delta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          ({delta > 0 ? '+' : ''}{delta})
                        </span>
                      </div>
                      {/* Resolution */}
                      <div>
                        {resolvingId === a.id ? (
                          <div className="flex items-center gap-1">
                            <select
                              className="text-[10px] border border-slate-200 rounded px-1 py-1 bg-white outline-none cursor-pointer"
                              value={newResolution}
                              onChange={e => setNewResolution(e.target.value as AdjustmentResolution)}
                            >
                              {(Object.keys(RESOLUTION_CONFIG) as AdjustmentResolution[]).filter(r => r !== 'Pending').map(r => (
                                <option key={r} value={r}>{RESOLUTION_CONFIG[r].label}</option>
                              ))}
                            </select>
                            <button onClick={() => handleResolve(a.id)} className="p-1 rounded bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700">
                              <CheckCircle2 className="w-3 h-3" />
                            </button>
                            <button onClick={() => setResolvingId(null)} className="p-1 rounded bg-slate-200 text-slate-600 cursor-pointer hover:bg-slate-300">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span
                            onClick={() => a.resolution === 'Pending' && isAdmin ? (setResolvingId(a.id), setNewResolution('Written Off')) : null}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${rc.bg} ${rc.color} ${a.resolution === 'Pending' && isAdmin ? 'cursor-pointer hover:opacity-80' : ''}`}
                            title={a.resolution === 'Pending' && isAdmin ? 'Click to resolve' : undefined}
                          >
                            {a.resolution === 'Pending' ? <Clock className="w-2.5 h-2.5" /> : <CheckCircle2 className="w-2.5 h-2.5" />}
                            {rc.label}
                          </span>
                        )}
                      </div>
                      {/* Date */}
                      <div>
                        <p className="text-xs text-slate-600 font-medium">{new Date(a.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">by {a.createdBy}</p>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1 pl-2">
                        {isAdmin && (
                          <>
                            {a.resolution === 'Pending' && (
                              <button
                                onClick={() => { setResolvingId(a.id); setNewResolution('Written Off'); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer"
                                title="Mark as resolved"
                              ><CheckCircle2 className="w-3.5 h-3.5" /></button>
                            )}
                            {confirmAdjDeleteId === a.id ? (
                              <button onClick={() => handleDeleteAdj(a.id)} className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg cursor-pointer">Sure?</button>
                            ) : (
                              <button
                                onClick={() => { setConfirmAdjDeleteId(a.id); setTimeout(() => setConfirmAdjDeleteId(null), 4000); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                                title="Delete & reverse stock"
                              ><Trash2 className="w-3.5 h-3.5" /></button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════ PRODUCT ADD/EDIT MODAL ═══════════ */}
      {isProductOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-100 flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Tag className="w-4 h-4 text-red-600" />
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => setIsProductOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveProduct} className="overflow-y-auto flex-1">
              <div className="p-6 grid grid-cols-2 gap-4 text-xs">
                <div className="col-span-2">
                  <label className={labelCls}>Product Name</label>
                  <input type="text" required placeholder="e.g. Honda CD70 Brake Shoe Set" className={inputCls} value={pName} onChange={e => setPName(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Barcode (EAN)</label>
                  <input type="text" required placeholder="EAN-13 digits" className={`${inputCls} font-mono`} value={pBarcode} onChange={e => setPBarcode(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Category</label>
                  <select className={inputCls} value={pCategory} onChange={e => setPCategory(e.target.value)}>
                    {['Engine Parts', 'Lubricants', 'Electrical', 'Brakes', 'Transmission', 'Filters', 'Fuel System', 'Cables & Instruments', 'Body & Plastics'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Brand / Compatibility</label>
                  <input type="text" placeholder="e.g. Honda / CD-70, CG-125" className={inputCls} value={pCompatibility} onChange={e => setPCompatibility(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Cost Price (Rs.)</label>
                  <input type="number" required min={0} className={`${inputCls} font-mono`} value={pPurchasePrice} onChange={e => setPPurchasePrice(Math.max(0, Number(e.target.value)))} />
                </div>
                <div>
                  <label className={labelCls}>Sale Price (Rs.)</label>
                  <input type="number" required min={0} className={`${inputCls} font-mono`} value={pSellingPrice} onChange={e => setPSellingPrice(Math.max(0, Number(e.target.value)))} />
                </div>
                <div>
                  <label className={labelCls}>Stock Quantity</label>
                  <input type="number" required min={0} className={`${inputCls} font-mono`} value={pStock} onChange={e => setPStock(Math.max(0, Number(e.target.value)))} />
                </div>
                <div>
                  <label className={labelCls}>Min Stock Threshold</label>
                  <input type="number" required min={0} className={`${inputCls} font-mono`} value={pMinStock} onChange={e => setPMinStock(Math.max(0, Number(e.target.value)))} />
                </div>
                <div>
                  <label className={labelCls}>Supplier</label>
                  <input type="text" placeholder="e.g. Honda Atlas Parts Ltd" className={inputCls} value={pSupplierName} onChange={e => setPSupplierName(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Storage Location</label>
                  <input type="text" placeholder="e.g. Rack B, Shelf 2" className={inputCls} value={pLocation} onChange={e => setPLocation(e.target.value)} />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex items-center justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setIsProductOpen(false)} className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer transition-all">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-red-600/20 cursor-pointer transition-all">
                  {editingProduct ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════ DAMAGE / RETURN MODAL ═══════════ */}
      {isAdjOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-amber-50 rounded-t-2xl shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Log Damage / Return
              </h3>
              <button onClick={() => setIsAdjOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg cursor-pointer transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="overflow-y-auto flex-1">
              <div className="p-6 space-y-4 text-xs">

                {/* Product selector */}
                <div>
                  <label className={labelCls}>Product *</label>
                  {adjProduct ? (
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                      <div>
                        <p className="font-bold text-slate-800 text-xs">{adjProduct.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{adjProduct.partNumber} · Stock: {adjProduct.stock}</p>
                      </div>
                      <button type="button" onClick={() => setAdjProduct(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search product by name or part number..."
                        className={`${inputCls} pl-8`}
                        value={adjProductSearch}
                        onChange={e => setAdjProductSearch(e.target.value)}
                        autoFocus
                      />
                      {adjProductSearch && adjProductOptions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                          {adjProductOptions.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => { setAdjProduct(p); setAdjProductSearch(''); }}
                              className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-50 last:border-0"
                            >
                              <p className="font-semibold text-slate-800 text-xs">{p.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{p.partNumber} · Stock: {p.stock}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Type selector */}
                <div>
                  <label className={labelCls}>Adjustment Type *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(TYPE_CONFIG) as StockAdjustmentType[]).map(t => {
                      const tc = TYPE_CONFIG[t];
                      const isSelected = adjType === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => { setAdjType(t); setAdjReason(''); }}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${isSelected ? `${tc.bg} ${tc.color} ${tc.border} border-2` : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'}`}
                        >
                          {tc.icon} {tc.label}
                          {isSelected && <span className="ml-auto text-[9px] opacity-70">{t === 'Damage' || t === 'Supplier Return' ? '▼ stock' : t === 'Customer Return' ? '▲ stock' : '± stock'}</span>}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">
                    {adjType === 'Damage' && '⚠ Stock will decrease — item is lost or unusable.'}
                    {adjType === 'Customer Return' && '✓ Stock will increase — item returned to inventory.'}
                    {adjType === 'Supplier Return' && '↩ Stock will decrease — item sent back to supplier.'}
                    {adjType === 'Manual Adjustment' && '± Use for inventory count corrections.'}
                  </p>
                </div>

                {/* Manual adjustment direction */}
                {adjType === 'Manual Adjustment' && (
                  <div>
                    <label className={labelCls}>Direction *</label>
                    <div className="flex gap-2">
                      {(['Add', 'Remove'] as const).map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setAdjDirection(d)}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${adjDirection === d ? (d === 'Add' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 border-2' : 'bg-red-50 text-red-700 border-red-300 border-2') : 'border-slate-200 text-slate-600 bg-white'}`}
                        >
                          {d === 'Add' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          {d} to Stock
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div>
                  <label className={labelCls}>Quantity *</label>
                  <input
                    type="number"
                    min={1}
                    max={adjType !== 'Customer Return' && adjType !== 'Manual Adjustment' ? adjProduct?.stock || 9999 : 9999}
                    required
                    className={`${inputCls} font-mono`}
                    value={adjQty}
                    onChange={e => setAdjQty(Math.max(1, Number(e.target.value)))}
                  />
                  {adjProduct && adjType !== 'Customer Return' && !(adjType === 'Manual Adjustment' && adjDirection === 'Add') && adjQty > adjProduct.stock && (
                    <p className="text-[10px] text-red-500 mt-1">⚠ Exceeds current stock of {adjProduct.stock}</p>
                  )}
                </div>

                {/* Reason */}
                <div>
                  <label className={labelCls}>Reason *</label>
                  <select
                    required
                    className={inputCls}
                    value={adjReason}
                    onChange={e => setAdjReason(e.target.value)}
                  >
                    <option value="">Select reason…</option>
                    {DAMAGE_REASONS[adjType].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                {/* Reference No */}
                <div>
                  <label className={labelCls}>Reference No. <span className="text-slate-400 normal-case">(optional)</span></label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-0021 or PUR-77192"
                    className={inputCls}
                    value={adjRefNo}
                    onChange={e => setAdjRefNo(e.target.value)}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className={labelCls}>Notes <span className="text-slate-400 normal-case">(optional)</span></label>
                  <textarea
                    rows={2}
                    placeholder="Any additional details about the damage or return…"
                    className={`${inputCls} resize-none`}
                    value={adjNotes}
                    onChange={e => setAdjNotes(e.target.value)}
                  />
                </div>

                {/* Preview */}
                {adjProduct && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Stock Preview</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-slate-700">{adjProduct.stock}</span>
                      <span className="text-slate-400">→</span>
                      <span className={`text-sm font-black font-mono ${(() => {
                        const delta = adjType === 'Customer Return' ? adjQty : adjType === 'Manual Adjustment' && adjDirection === 'Add' ? adjQty : -adjQty;
                        const after = Math.max(0, adjProduct.stock + delta);
                        return after < adjProduct.stock ? 'text-red-600' : 'text-emerald-600';
                      })()}`}>
                        {(() => {
                          const delta = adjType === 'Customer Return' ? adjQty : adjType === 'Manual Adjustment' && adjDirection === 'Add' ? adjQty : -adjQty;
                          return Math.max(0, adjProduct.stock + delta);
                        })()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex items-center justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setIsAdjOpen(false)} className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer transition-all">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjSaving}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
                >
                  {adjSaving ? 'Saving…' : 'Log Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
