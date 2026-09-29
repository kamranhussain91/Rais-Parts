import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from './AppContext';
import { Product, SaleItem, SaleInvoice, Customer } from '../types';
import {
  Search,
  Trash2,
  User,
  CreditCard,
  Printer,
  ShoppingCart,
  ChevronDown,
  Minus,
  Plus,
  X,
  AlertCircle,
} from 'lucide-react';

export const POSView: React.FC = () => {
  const { db, saveSaleInvoice, terminalId, setTerminalId } = useApp();
  const [taxRate, setTaxRate] = useState<number>(18);

  const [cartItems, setCartItems] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Mobile Wallet'>('Cash');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('cash_chest');
  const [amountPaid, setAmountPaid] = useState<number>(0);

  // Customer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [customerBikeModel, setCustomerBikeModel] = useState<string>('');
  const [showCustomerForm, setShowCustomerForm] = useState<boolean>(false);
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);

  const [manualSearch, setManualSearch] = useState<string>('');
  const [activeReceipt, setActiveReceipt] = useState<SaleInvoice | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [printFormat, setPrintFormat] = useState<'A4' | 'Thermal'>('Thermal');

  const searchRef = useRef<HTMLInputElement>(null);
  const customerSearchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { searchRef.current?.focus(); }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!db) return <div className="p-8 text-neutral-500">Loading terminal...</div>;

  const { products, accounts, customers } = db;

  const getPaymentAccountLabel = (accountId?: string, fallback = paymentMethod) => {
    const account = accounts.find(a => a.id === accountId);
    if (account?.id === 'cash_chest' || accountId === 'cash_chest') return 'Cash';
    return account?.bankName || fallback;
  };

  // Customer search results
  const customerResults = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const q = customerSearch.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) || c.phone.includes(customerSearch)
    ).slice(0, 6);
  }, [customers, customerSearch]);

  const selectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setCustomerAddress(c.address || '');
    setCustomerBikeModel(c.bikeModel || '');
    setCustomerSearch('');
    setShowCustomerDropdown(false);
  };

  const clearCustomer = () => {
    setSelectedCustomerId('');
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerBikeModel('');
    setCustomerSearch('');
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert(`"${product.name}" is out of stock.`);
      return;
    }
    setCartItems(prev => {
      const idx = prev.findIndex(i => i.productId === product.id);
      if (idx !== -1) {
        if (prev[idx].qty >= product.stock) {
          alert(`Max stock is ${product.stock}.`);
          return prev;
        }
        const updated = [...prev];
        updated[idx] = { ...updated[idx], qty: updated[idx].qty + 1 };
        return updated;
      }
      return [...prev, { productId: product.id, name: product.name, partNumber: product.partNumber, qty: 1, purchasePrice: product.purchasePrice, sellingPrice: product.sellingPrice }];
    });
  };

  const updateQty = (productId: string, newQty: number) => {
    const orig = products.find(p => p.id === productId);
    if (!orig) return;
    if (newQty > orig.stock) { alert(`Only ${orig.stock} in stock.`); return; }
    if (newQty <= 0) { removeFromCart(productId); return; }
    setCartItems(prev => prev.map(i => i.productId === productId ? { ...i, qty: newQty } : i));
  };

  const removeFromCart = (productId: string) =>
    setCartItems(prev => prev.filter(i => i.productId !== productId));

  const cartSubtotal = cartItems.reduce((s, i) => s + i.sellingPrice * i.qty, 0);
  const cartTaxable = Math.max(0, cartSubtotal - discount);
  const cartTaxAmount = Math.round(cartTaxable * (taxRate / 100));
  const cartFinal = cartTaxable + cartTaxAmount;
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);
  const change = amountPaid > cartFinal ? amountPaid - cartFinal : 0;

  // Credit sale calculations
  const effectivePaid = amountPaid > 0 ? Math.min(amountPaid, cartFinal) : cartFinal;
  const creditDue = cartFinal > 0 && amountPaid > 0 && amountPaid < cartFinal
    ? cartFinal - amountPaid
    : 0;
  const isCreditSale = creditDue > 0;
  const isFullCredit = cartFinal > 0 && amountPaid === 0 && cartItems.length > 0 && !!customerPhone;

  const handleCheckout = async () => {
    if (cartItems.length === 0) { alert('Cart is empty.'); return; }
    if ((isCreditSale || isFullCredit) && !customerPhone.trim()) {
      alert('A phone number is required for credit / partial-payment sales.\nPlease enter the customer\'s phone number.');
      return;
    }

    const resolvedAmountPaid = isFullCredit ? 0 : (amountPaid > 0 ? amountPaid : cartFinal);

    const invoice: SaleInvoice = {
      id: '', invoiceNumber: '', date: new Date().toISOString(),
      customerId: selectedCustomerId || 'Walk-in',
      customerName: customerName || 'Walk-in Customer',
      customerPhone: customerPhone || 'N/A',
      customerAddress, customerBikeModel,
      items: cartItems, subtotal: cartSubtotal, discount, finalAmount: cartFinal,
      paymentMethod, bankAccountId: selectedBankAccountId, profit: 0,
      terminalId, taxRate, taxAmount: cartTaxAmount,
      amountPaid: resolvedAmountPaid,
      amountDue: Math.max(0, cartFinal - resolvedAmountPaid),
      paymentStatus: resolvedAmountPaid >= cartFinal ? 'Paid' : 'Partial',
    } as SaleInvoice;

    const saved = await saveSaleInvoice(invoice);
    if (saved) {
      setActiveReceipt(saved);
      setIsReceiptModalOpen(true);
      setCartItems([]); setDiscount(0); setAmountPaid(0);
      clearCustomer();
      setShowCustomerForm(false);
    } else {
      alert('Error completing sale.');
    }
  };

  const searchedCatalog = products.filter(p => {
    if (!manualSearch.trim()) return true;
    const q = manualSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.partNumber.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q) || p.compatibility.toLowerCase().includes(q);
  });

  const isWalkIn = !customerPhone.trim() && customerName === 'Walk-in Customer';

  return (
    <div className="flex h-full" id="pos-view-container">

      {/* ── LEFT: PRODUCT CATALOG ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="px-5 pt-4 pb-3 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search by barcode, name or part number..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm outline-none transition-all focus:border-red-500 focus:ring-2 focus:ring-red-500/15 placeholder:text-slate-400"
              value={manualSearch}
              onChange={e => setManualSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {searchedCatalog.map(p => {
              const isOut = p.stock <= 0;
              const isLow = !isOut && p.stock <= p.minStock;
              const inCart = cartItems.some(i => i.productId === p.id);
              return (
                <button
                  key={p.id}
                  disabled={isOut}
                  onClick={() => addToCart(p)}
                  className={`
                    text-left p-3 rounded-xl border select-none transition-all duration-150
                    flex flex-col justify-between h-[120px]
                    ${isOut
                      ? 'bg-slate-50 border-slate-100 opacity-40 cursor-not-allowed'
                      : inCart
                        ? 'bg-white border-red-500 ring-2 ring-red-500/20 shadow-sm cursor-pointer'
                        : 'bg-white border-slate-200 hover:border-red-300 hover:shadow-sm cursor-pointer active:scale-[0.98]'
                    }
                  `}
                >
                  <div>
                    <p className={`font-semibold text-[12px] leading-snug line-clamp-2 ${inCart ? 'text-slate-900' : 'text-slate-800'}`}>
                      {p.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{p.partNumber}</p>
                  </div>
                  <div className="flex items-end justify-between mt-1">
                    <span className={`font-bold text-[13px] font-mono ${isOut ? 'text-slate-400' : 'text-red-600'}`}>
                      Rs. {p.sellingPrice.toLocaleString()}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded font-mono
                      ${isOut ? 'bg-red-50 text-red-500' : isLow ? 'bg-amber-50 text-amber-600' : 'text-slate-400'}`}>
                      {isOut ? 'Out' : `Qty: ${p.stock}`}
                    </span>
                  </div>
                </button>
              );
            })}
            {searchedCatalog.length === 0 && (
              <div className="col-span-full py-20 text-center text-sm text-slate-400">
                No products match your search.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT: CHECKOUT PANEL ── */}
      <div className="w-[420px] xl:w-[460px] shrink-0 flex flex-col bg-white border-l border-slate-200 overflow-hidden">

        {/* Customer selector */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-100 shrink-0">
          <button
            className={`w-full flex items-center gap-2 px-3 py-2 border rounded-xl text-sm transition-all
              ${showCustomerForm
                ? 'border-red-400 bg-red-50/40 text-slate-700'
                : 'border-slate-200 text-slate-600 hover:border-red-300 hover:bg-red-50/30'
              }`}
            onClick={() => setShowCustomerForm(v => !v)}
          >
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="flex-1 text-left font-medium truncate text-[13px]">
              {customerName}
              {(isCreditSale || isFullCredit) && !isWalkIn && (
                <span className="ml-1.5 text-[10px] text-amber-600 font-bold uppercase tracking-wide">Credit</span>
              )}
            </span>
            {!isWalkIn && (
              <button
                onClick={e => { e.stopPropagation(); clearCustomer(); setShowCustomerForm(false); }}
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${showCustomerForm ? 'rotate-180' : ''}`} />
          </button>

          {showCustomerForm && (
            <div className="mt-2 space-y-2">
              {/* Customer search dropdown */}
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    ref={customerSearchRef}
                    type="text"
                    placeholder="Search existing customer..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20 bg-white"
                    value={customerSearch}
                    onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                    onFocus={() => customerSearch && setShowCustomerDropdown(true)}
                  />
                </div>
                {showCustomerDropdown && customerResults.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                    {customerResults.map(c => (
                      <button
                        key={c.id}
                        className="w-full text-left px-3 py-2 hover:bg-red-50 transition-colors border-b border-slate-50 last:border-0"
                        onMouseDown={() => selectCustomer(c)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[12px] font-semibold text-slate-800">{c.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{c.phone}</p>
                          </div>
                          <div className="text-right">
                            {c.bikeModel && <p className="text-[10px] text-slate-500">{c.bikeModel}</p>}
                            {(c.creditBalance ?? 0) > 0 && (
                              <p className="text-[10px] text-amber-600 font-bold font-mono">Due: Rs.{(c.creditBalance ?? 0).toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Manual fields */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { ph: 'Name *', val: customerName === 'Walk-in Customer' ? '' : customerName, set: (v: string) => setCustomerName(v || 'Walk-in Customer') },
                  { ph: 'Phone *', val: customerPhone, set: setCustomerPhone },
                  { ph: 'Bike Model', val: customerBikeModel, set: setCustomerBikeModel },
                  { ph: 'Address', val: customerAddress, set: setCustomerAddress },
                ].map(f => (
                  <input key={f.ph} type="text" placeholder={f.ph} value={f.val}
                    onChange={e => { f.set(e.target.value); setSelectedCustomerId(''); }}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20 bg-slate-50 col-span-1"
                  />
                ))}
              </div>

              {/* Show existing customer's credit balance if selected */}
              {selectedCustomerId && (() => {
                const c = customers.find(x => x.id === selectedCustomerId);
                return c && (c.creditBalance ?? 0) > 0 ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                    <p className="text-[11px] text-amber-700 font-semibold">
                      Existing credit due: <span className="font-mono">Rs. {(c.creditBalance ?? 0).toLocaleString()}</span>
                    </p>
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </div>

        {/* Cart header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-sm text-slate-700">Current Sale</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {cartCount} {cartCount === 1 ? 'item' : 'items'}
            </span>
            {cartItems.length > 0 && (
              <button onClick={() => setCartItems([])}
                className="text-[10px] text-slate-400 hover:text-red-500 font-semibold transition-colors">
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 select-none px-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                <ShoppingCart className="w-7 h-7 text-slate-300" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-400">Cart is empty</p>
                <p className="text-xs text-slate-300 mt-1">Click a product to add it</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {cartItems.map(item => (
                <div key={item.productId} className="px-4 py-2.5 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-slate-800 leading-tight truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Rs. {item.sellingPrice.toLocaleString()} ea</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => updateQty(item.productId, item.qty - 1)}
                      className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-100 text-slate-500 transition-colors">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-slate-800 font-mono">{item.qty}</span>
                    <button onClick={() => updateQty(item.productId, item.qty + 1)}
                      className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-100 text-slate-500 transition-colors">
                      <Plus className="w-3 h-3" />
                    </button>
                    <span className="w-14 text-right text-xs font-bold font-mono text-slate-700">
                      Rs.{(item.sellingPrice * item.qty).toLocaleString()}
                    </span>
                    <button onClick={() => removeFromCart(item.productId)}
                      className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors ml-0.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout footer */}
        <div className="shrink-0 border-t border-slate-100 bg-white">

          {/* Totals */}
          <div className="px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Subtotal</span>
              <span className="font-mono">Rs. {cartSubtotal.toLocaleString()}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-xs text-rose-500">
                <span>Discount</span>
                <span className="font-mono">-Rs. {discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-slate-500">
              <span>GST ({taxRate}%)</span>
              <span className="font-mono">+Rs. {cartTaxAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-baseline pt-1 border-t border-slate-100">
              <span className="text-sm font-semibold text-slate-700">Total</span>
              <span className="text-xl font-black font-mono text-red-600">Rs. {cartFinal.toLocaleString()}</span>
            </div>

            {/* Credit / partial breakdown */}
            {isCreditSale && (
              <>
                <div className="flex justify-between text-xs text-emerald-600 font-semibold">
                  <span>Paid Now</span>
                  <span className="font-mono">Rs. {amountPaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-amber-600 font-bold">
                  <span>Credit Due</span>
                  <span className="font-mono">Rs. {creditDue.toLocaleString()}</span>
                </div>
              </>
            )}
            {isFullCredit && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Full credit — Rs. {cartFinal.toLocaleString()} goes on customer tab</span>
              </div>
            )}
            {change > 0 && (
              <div className="flex justify-between text-xs text-emerald-600 font-semibold">
                <span>Change</span>
                <span className="font-mono">Rs. {change.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Payment fields */}
          <div className="px-4 pb-3 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Payment Method</label>
              <select
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-red-400 font-medium"
                value={selectedBankAccountId}
                onChange={e => {
                  const accountId = e.target.value;
                  setSelectedBankAccountId(accountId);
                  setPaymentMethod(accountId === 'cash_chest' ? 'Cash' : 'Bank Transfer');
                }}
              >
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.id === 'cash_chest' ? 'Cash' : account.bankName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Amount Paid {isWalkIn ? '' : <span className="text-slate-300">(0 = full credit)</span>}
              </label>
              <input
                type="number"
                className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-mono outline-none focus:ring-1 transition-colors
                  ${isCreditSale
                    ? 'bg-amber-50 border-amber-300 text-amber-800 focus:border-amber-400 focus:ring-amber-400/20'
                    : 'bg-slate-50 border-slate-200 focus:border-red-400 focus:ring-red-400/20'
                  }`}
                placeholder={`Full: ${cartFinal.toLocaleString()}`}
                value={amountPaid === 0 ? '' : amountPaid}
                onChange={e => setAmountPaid(Math.max(0, Number(e.target.value)))}
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Terminal</label>
              <select
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-red-400"
                value={terminalId}
                onChange={e => setTerminalId(e.target.value)}
              >
                <option value="T1">Counter 1</option>
                <option value="T2">Counter 2</option>
                <option value="W1">Workshop PC</option>
                <option value="A1">Admin Cabin</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Sales Tax</label>
              <select
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-red-400"
                value={taxRate}
                onChange={e => setTaxRate(Number(e.target.value))}
              >
                <option value={18}>18% standard</option>
                <option value={15}>15% regional</option>
                <option value={5}>5% concession</option>
                <option value={0}>0% exempt</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Discount (Rs.)</label>
              <input
                type="number"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20"
                placeholder="0"
                value={discount === 0 ? '' : discount}
                onChange={e => setDiscount(Math.max(0, Number(e.target.value)))}
              />
            </div>
          </div>

          {/* Complete Sale CTA */}
          <div className="px-4 pb-4">
            <button
              onClick={handleCheckout}
              className={`w-full py-3 active:scale-[0.99] text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer
                ${(isCreditSale || isFullCredit)
                  ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25'
                  : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                }`}
            >
              {(isCreditSale || isFullCredit)
                ? <AlertCircle className="w-4 h-4" />
                : <CreditCard className="w-4 h-4" />
              }
              {isFullCredit
                ? 'Complete — Full Credit Sale'
                : isCreditSale
                  ? `Complete — Rs.${amountPaid.toLocaleString()} Paid`
                  : 'Complete Sale'
              }
            </button>
          </div>
        </div>
      </div>

      {/* ── RECEIPT MODAL ── */}
      {isReceiptModalOpen && activeReceipt && (
        <div className="fixed inset-0 bg-neutral-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`bg-white rounded-2xl shadow-2xl w-full ${printFormat === 'A4' ? 'max-w-4xl' : 'max-w-lg'} border border-neutral-100 flex flex-col`}
            style={{ maxHeight: 'calc(100vh - 2rem)' }}>

            {/* TOP BAR */}
            <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50 rounded-t-2xl flex items-center gap-2 shrink-0 no-print">
              <span className="text-xs font-semibold text-neutral-400 mr-1">Format:</span>
              {(['Thermal', 'A4'] as const).map(fmt => (
                <button key={fmt}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-all ${printFormat === fmt ? 'bg-red-600 text-white border-red-600 shadow-sm' : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-300'}`}
                  onClick={() => setPrintFormat(fmt)}>
                  {fmt === 'Thermal' ? '🧾 Thermal (3″)' : '📄 A4 Invoice'}
                </button>
              ))}
              <div className="ml-auto text-xs text-neutral-400 font-mono font-semibold">
                #{activeReceipt.invoiceNumber}
              </div>
              {(activeReceipt.paymentStatus === 'Partial' || (activeReceipt as any).amountDue > 0) && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase">Credit</span>
              )}
            </div>

            {/* SCROLLABLE RECEIPT */}
            <div className="overflow-y-auto flex-1 print-area bg-white">
              {printFormat === 'Thermal' ? (
                <div className="mx-auto text-neutral-800 text-[11px] font-mono leading-relaxed" style={{ maxWidth: '300px' }}>
                  <div className="text-center font-bold">
                    <h2 className="text-sm uppercase tracking-wide">RAIS HONDA PARTS</h2>
                    <p className="text-[10px] text-neutral-500 font-sans mt-0.5">Allama Iqbal Road, Dharampura, Lahore</p>
                    <p className="text-[10px] text-neutral-500 font-sans">Phone: 042-36814912 | NTN: 7721590-3</p>
                    <div className="border-b border-dashed border-neutral-300 my-2" />
                  </div>
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between"><span>Receipt:</span><span className="font-bold">{activeReceipt.invoiceNumber}</span></div>
                    <div className="flex justify-between"><span>Date:</span><span>{new Date(activeReceipt.date).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Customer:</span><span className="font-bold">{activeReceipt.customerName}</span></div>
                    {activeReceipt.customerPhone !== 'N/A' && <div className="flex justify-between"><span>Phone:</span><span>{activeReceipt.customerPhone}</span></div>}
                    {activeReceipt.customerBikeModel && <div className="flex justify-between"><span>Bike:</span><span>{activeReceipt.customerBikeModel}</span></div>}
                  </div>
                  <div className="border-b border-dashed border-neutral-300 my-2" />
                  <div className="font-bold grid grid-cols-12 gap-1 text-[10px] uppercase pb-1 border-b border-neutral-100">
                    <span className="col-span-6">Item</span><span className="col-span-2 text-center">Qty</span><span className="col-span-4 text-right">Amt</span>
                  </div>
                  <div className="divide-y divide-neutral-100/30 text-[10px] py-1.5 space-y-1.5">
                    {activeReceipt.items.map(item => (
                      <div key={item.productId} className="grid grid-cols-12 gap-1">
                        <div className="col-span-6"><span className="font-bold block leading-tight">{item.name}</span><span className="text-[9px] text-neutral-400">P/N: {item.partNumber}</span></div>
                        <span className="col-span-2 text-center font-mono">{item.qty}</span>
                        <span className="col-span-4 text-right font-mono">Rs.{item.sellingPrice * item.qty}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-b border-dashed border-neutral-300 my-2" />
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between"><span>Subtotal:</span><span>Rs.{activeReceipt.subtotal}</span></div>
                    {activeReceipt.discount > 0 && <div className="flex justify-between text-rose-600"><span>Discount:</span><span>-Rs.{activeReceipt.discount}</span></div>}
                    <div className="flex justify-between"><span>GST ({activeReceipt.taxRate ?? 18}%):</span><span>+Rs.{activeReceipt.taxAmount ?? 0}</span></div>
                    <div className="flex justify-between font-bold text-xs pt-1 border-t border-neutral-100"><span>TOTAL:</span><span>Rs.{activeReceipt.finalAmount}</span></div>
                    {/* Payment breakdown */}
                    {(activeReceipt.paymentStatus === 'Partial' || ((activeReceipt as any).amountDue ?? 0) > 0) ? (
                      <>
                        <div className="flex justify-between text-emerald-700 font-bold"><span>PAID NOW:</span><span>Rs.{(activeReceipt as any).amountPaid ?? activeReceipt.finalAmount}</span></div>
                        <div className="flex justify-between text-amber-700 font-bold border border-dashed border-amber-400 px-1 py-0.5 rounded"><span>CREDIT DUE:</span><span>Rs.{(activeReceipt as any).amountDue ?? 0}</span></div>
                      </>
                    ) : (
                      <div className="flex justify-between italic text-[9px] text-neutral-500 mt-1"><span>Method:</span><span>{getPaymentAccountLabel(activeReceipt.bankAccountId, activeReceipt.paymentMethod)}</span></div>
                    )}
                  </div>
                  <div className="border-b border-dashed border-neutral-300 my-3" />
                  <div className="text-center text-[10px] space-y-1">
                    <p className="font-bold">Thank You for visiting!</p>
                    <p className="text-neutral-400 text-[9px] font-sans">Genuine Honda parts guarantee engine safety.</p>
                  </div>
                </div>
              ) : (
                <div className="text-neutral-800 text-xs font-sans leading-relaxed p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-xl font-black text-red-600 uppercase tracking-widest">RAIS MOTOR LABS & PARTS</h1>
                      <p className="text-neutral-500 font-mono text-xs">Automotive Workshop, Tuning & Wholesalers</p>
                      <p className="text-neutral-400 mt-2 text-xs">Allama Iqbal Road, Dharampura, Lahore<br />Tel: 042-36814912 | NTN: 7721590-3</p>
                    </div>
                    <div className="text-right">
                      <div className={`px-3 py-1 inline-block rounded font-extrabold uppercase text-xs border ${(activeReceipt.paymentStatus === 'Partial' || ((activeReceipt as any).amountDue ?? 0) > 0) ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-100'}`}>
                        {(activeReceipt.paymentStatus === 'Partial' || ((activeReceipt as any).amountDue ?? 0) > 0) ? 'CREDIT SALE SLIP' : 'CASH TRANSACTION SLIP'}
                      </div>
                      <p className="text-neutral-500 mt-3 font-mono text-[10px]">
                        <strong>Invoice #:</strong> {activeReceipt.invoiceNumber}<br />
                        <strong>Date:</strong> {new Date(activeReceipt.date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="border-b border-neutral-200 my-4" />
                  <div className="grid grid-cols-2 gap-4 mb-6 bg-neutral-50 p-3.5 rounded-lg border border-neutral-100 text-[11px]">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-neutral-400 block font-bold">Customer</span>
                      <strong className="text-neutral-800 block text-xs mt-1">{activeReceipt.customerName}</strong>
                      {activeReceipt.customerPhone !== 'N/A' && <p className="text-neutral-600 mt-0.5">Phone: {activeReceipt.customerPhone}</p>}
                      {activeReceipt.customerAddress && <p className="text-neutral-600">Address: {activeReceipt.customerAddress}</p>}
                    </div>
                    {activeReceipt.customerBikeModel && (
                      <div className="border-l border-neutral-200 pl-4">
                        <span className="text-xs uppercase tracking-wider text-neutral-400 block font-bold">Motorcycle</span>
                        <p className="text-neutral-700 mt-1"><strong>Model:</strong> Honda {activeReceipt.customerBikeModel}</p>
                      </div>
                    )}
                  </div>
                  <div className="border border-neutral-100 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="bg-neutral-50 border-b border-neutral-100 font-bold uppercase text-neutral-500 text-xs">
                          <th className="py-2.5 px-3">Part #</th><th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3 text-center">Price</th><th className="py-2.5 px-3 text-center">Qty</th>
                          <th className="py-2.5 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {activeReceipt.items.map(item => (
                          <tr key={item.productId} className="hover:bg-neutral-50/50">
                            <td className="py-2.5 px-3 font-mono">{item.partNumber}</td>
                            <td className="py-2.5 px-3 font-bold">{item.name}</td>
                            <td className="py-2.5 px-3 text-center font-mono">Rs.{item.sellingPrice}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold">{item.qty}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold">Rs.{item.sellingPrice * item.qty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 items-start border-t border-neutral-100 pt-4">
                    <div className="space-y-1.5 text-[11px] justify-self-end w-64">
                      <div className="flex justify-between text-neutral-500"><span>Subtotal:</span><span className="font-mono font-bold">Rs.{activeReceipt.subtotal}</span></div>
                      {activeReceipt.discount > 0 && <div className="flex justify-between text-rose-500"><span>Discount:</span><span className="font-mono font-bold">-Rs.{activeReceipt.discount}</span></div>}
                      <div className="flex justify-between text-neutral-500"><span>Taxable:</span><span className="font-mono">Rs.{Math.max(0, activeReceipt.subtotal - activeReceipt.discount)}</span></div>
                      <div className="flex justify-between text-neutral-500 font-bold"><span>GST ({activeReceipt.taxRate ?? 18}%):</span><span className="font-mono">+Rs.{activeReceipt.taxAmount ?? 0}</span></div>
                      <div className="flex justify-between font-bold text-sm text-neutral-800 pt-2 border-t border-neutral-200"><span>GRAND TOTAL:</span><span className="font-mono text-red-600 text-base">Rs.{activeReceipt.finalAmount}</span></div>
                      {/* Credit breakdown */}
                      {((activeReceipt as any).amountDue ?? 0) > 0 ? (
                        <>
                          <div className="flex justify-between text-emerald-600 font-semibold pt-1 border-t border-neutral-100">
                            <span>Paid Now ({getPaymentAccountLabel(activeReceipt.bankAccountId, activeReceipt.paymentMethod)}):</span>
                            <span className="font-mono font-bold">Rs.{(activeReceipt as any).amountPaid}</span>
                          </div>
                          <div className="flex justify-between bg-amber-50 border border-amber-200 rounded px-2 py-1 text-amber-700 font-bold">
                            <span>CREDIT DUE:</span>
                            <span className="font-mono">Rs.{(activeReceipt as any).amountDue}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between text-neutral-400 text-[10px]"><span>Payment:</span><span className="font-mono">{getPaymentAccountLabel(activeReceipt.bankAccountId, activeReceipt.paymentMethod)}</span></div>
                      )}
                    </div>
                  </div>
                  <div className="border-b border-neutral-200 my-6" />
                  <div className="grid grid-cols-2 text-[10px] text-neutral-400 mt-12">
                    <div>
                      <p>Terms: Sold parts are subject to Honda Atlas Pakistan warranty policies.</p>
                      <p className="mt-1 font-bold text-neutral-500">Rais Motor Labs — Certified Workshop Center</p>
                    </div>
                    <div className="text-right flex flex-col justify-end items-end gap-1">
                      <div className="w-32 border-b border-neutral-200 h-10" />
                      <span className="font-bold text-neutral-500 uppercase tracking-wider text-[9px] mr-4">Authorized Signature</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* STICKY BOTTOM */}
            <div className="shrink-0 border-t border-neutral-200 bg-white rounded-b-2xl px-5 py-4 flex items-center gap-3 no-print">
              <button
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white rounded-xl text-sm font-bold shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                onClick={() => window.print()}
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </button>
              <button
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                onClick={() => { setIsReceiptModalOpen(false); setActiveReceipt(null); }}
              >
                <X className="w-4 h-4" />
                Close & New Sale
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
