import React from 'react';
import { useApp } from './AppContext';
import { 
  TrendingUp, 
  TrendingDown, 
  ShoppingBag, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  Inbox,
  ChevronDown,
  Banknote,
  Activity,
  Package,
  Wrench
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';

export const DashboardView: React.FC = () => {
  const { db } = useApp();

  const [filterType, setFilterType] = React.useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('monthly');
  const todayStr = React.useMemo(() => {
    const d = new Date();
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${dy}`;
  }, []);
  const [customStart, setCustomStart] = React.useState(() => todayStr.slice(0, 7) + '-01');
  const [customEnd,   setCustomEnd]   = React.useState(() => todayStr);

  if (!db) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <div className="w-5 h-5 rounded-full border-2 border-t-red-600 border-slate-200 animate-spin" />
      <span className="text-sm text-slate-400 font-medium">Loading dashboard…</span>
    </div>
  );

  const { products, invoices, services, expenses, accounts } = db;

  const getRange = () => {
    const now = new Date();
    const yr  = now.getFullYear();
    const mo  = String(now.getMonth() + 1).padStart(2, '0');
    const dy  = String(now.getDate()).padStart(2, '0');
    const today = `${yr}-${mo}-${dy}`;
    if (filterType === 'daily')   return { start: today, end: today };
    if (filterType === 'weekly')  {
      const w = new Date(now); w.setDate(now.getDate() - 6);
      const wStr = `${w.getFullYear()}-${String(w.getMonth()+1).padStart(2,'0')}-${String(w.getDate()).padStart(2,'0')}`;
      return { start: wStr, end: today };
    }
    if (filterType === 'monthly') return { start: `${yr}-${mo}-01`, end: today };
    if (filterType === 'yearly')  return { start: `${yr}-01-01`, end: `${yr}-12-31` };
    return { start: customStart, end: customEnd };
  };

  const { start: startDate, end: endDate } = getRange();
  const isWithinRange = (dateStr: string) => { const d = dateStr.slice(0, 10); return d >= startDate && d <= endDate; };

  const filteredInvoices = invoices.filter(inv => isWithinRange(inv.date));
  const filteredServices  = services.filter(srv => isWithinRange(srv.date));
  const filteredExpenses  = expenses.filter(exp => isWithinRange(exp.date));

  const selectedRevenue  = filteredInvoices.reduce((sum, inv) => sum + inv.finalAmount, 0) + filteredServices.reduce((sum, srv) => sum + srv.price, 0);
  const productProfit    = filteredInvoices.reduce((sum, inv) => sum + inv.profit, 0);
  const serviceRevenue   = filteredServices.reduce((sum, srv) => sum + srv.price, 0);
  const serviceProfit    = filteredServices.reduce((sum, srv) => sum + (srv.profit ?? srv.price), 0);
  const totalProfit      = productProfit + serviceProfit;
  const totalExpenses    = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netProfit        = totalProfit - totalExpenses;

  const lowStockProducts   = products.filter(p => p.stock <= p.minStock);
  const pendingOilChanges  = services.filter(srv => srv.serviceType === 'Oil Change' && srv.reminderStatus === 'Pending');
  const totalBankBalance   = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  const getDateList = (start: string, end: string) => {
    const dates: string[] = [];
    const curr = new Date(start);
    const last = new Date(end);
    let count = 0;
    while (curr <= last && count < 150) {
      const yr = curr.getFullYear();
      const mo = String(curr.getMonth() + 1).padStart(2, '0');
      const dy = String(curr.getDate()).padStart(2, '0');
      dates.push(`${yr}-${mo}-${dy}`);
      curr.setDate(curr.getDate() + 1);
      count++;
    }
    return dates;
  };

  const dailySalesData = React.useMemo(() => {
    if (filterType === 'yearly') {
      const yr = new Date().getFullYear();
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return months.map((name, i) => {
        const key = String(i + 1).padStart(2, '0');
        const prefix = `${yr}-${key}`;
        const Sales    = invoices.filter(inv => inv.date.startsWith(prefix)).reduce((s, inv) => s + inv.finalAmount, 0);
        const Services = services.filter(srv => srv.date.startsWith(prefix)).reduce((s, srv) => s + srv.price, 0);
        return { name, Sales, Services, Total: Sales + Services };
      });
    }
    const rangeDates = getDateList(startDate, endDate);
    const displayDates = rangeDates.length > 31
      ? rangeDates.filter((_, idx) => idx % Math.ceil(rangeDates.length / 15) === 0)
      : rangeDates;
    return displayDates.map(dayStr => {
      const Sales    = invoices.filter(inv => inv.date.startsWith(dayStr)).reduce((s, inv) => s + inv.finalAmount, 0);
      const Services = services.filter(srv => srv.date.startsWith(dayStr)).reduce((s, srv) => s + srv.price, 0);
      const label    = new Date(dayStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
      return { name: label, Sales, Services, Total: Sales + Services };
    });
  }, [filterType, startDate, endDate, invoices, services]);

  const monthlyProfitData = React.useMemo(() => {
    const yr = new Date().getFullYear();
    if (filterType === 'yearly') {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return months.map((name, i) => {
        const prefix = `${yr}-${String(i + 1).padStart(2, '0')}`;
        const sp  = invoices.filter(inv => inv.date.startsWith(prefix)).reduce((s, inv) => s + inv.profit, 0);
        const sc  = services.filter(srv => srv.date.startsWith(prefix)).reduce((s, srv) => s + (srv.profit ?? srv.price), 0);
        const exp = expenses.filter(e => e.date.startsWith(prefix)).reduce((s, e) => s + e.amount, 0);
        const gm  = sp + sc;
        return { name, Expenses: exp, GrossMargin: gm, NetProfit: gm - exp };
      });
    }
    if (filterType === 'monthly') {
      // Show current month and previous month side-by-side
      const now  = new Date();
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const twoMonths = [
        { prefix: `${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}`, name: prev.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) },
        { prefix: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`,   name: now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) },
      ];
      return twoMonths.map(p => {
        const sp  = invoices.filter(inv => inv.date.startsWith(p.prefix)).reduce((s, inv) => s + inv.profit, 0);
        const sc  = services.filter(srv => srv.date.startsWith(p.prefix)).reduce((s, srv) => s + (srv.profit ?? srv.price), 0);
        const exp = expenses.filter(e => e.date.startsWith(p.prefix)).reduce((s, e) => s + e.amount, 0);
        const gm  = sp + sc;
        return { name: p.name, Expenses: exp, GrossMargin: gm, NetProfit: gm - exp };
      });
    }
    return [{ name: filterType === 'daily' ? 'Today' : filterType === 'weekly' ? 'This Week' : 'Period', Expenses: totalExpenses, GrossMargin: totalProfit, NetProfit: netProfit }];
  }, [filterType, invoices, services, expenses, totalExpenses, totalProfit, netProfit]);

  const expenseChartData = React.useMemo(() => {
    const cats: Record<string, number> = {};
    filteredExpenses.forEach(exp => { cats[exp.category] = (cats[exp.category] || 0) + exp.amount; });
    return Object.keys(cats).map(name => ({ name, value: cats[name] }));
  }, [filteredExpenses]);

  const topProducts = React.useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    filteredInvoices.forEach(inv => inv.items.forEach(item => {
      if (!map[item.productId]) map[item.productId] = { name: item.name, qty: 0, revenue: 0 };
      map[item.productId].qty += item.qty;
      map[item.productId].revenue += item.sellingPrice * item.qty;
    }));
    filteredServices.forEach(service => (service.parts || []).forEach(part => {
      if (!map[part.productId]) map[part.productId] = { name: part.name, qty: 0, revenue: 0 };
      map[part.productId].qty += part.qty;
      map[part.productId].revenue += part.sellingPrice * part.qty;
    }));
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 4);
  }, [filteredInvoices]);

  const COLORS = ['#D32F2F', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

  const filterLabel: Record<string, string> = {
    daily: 'Today', weekly: 'This Week', monthly: 'This Month', yearly: 'This Year', custom: 'Custom Range'
  };

  return (
    <div className="space-y-5">

      {/* ── TOP ROW: filter pill only, right-aligned ── */}
      <div className="flex items-center justify-end gap-2">
        {filterType === 'custom' && (
          <div className="flex items-center gap-1.5">
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-700 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 shadow-xs" />
            <span className="text-xs text-slate-400 font-semibold">–</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-700 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 shadow-xs" />
          </div>
        )}
        <div className="relative">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as typeof filterType)}
            className="appearance-none bg-white border border-slate-200 rounded-full pl-4 pr-8 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 shadow-sm cursor-pointer"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="custom">Custom</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* ── KPI SCORE CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Revenue */}
        <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-red-400" />
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-100">
                <ShoppingBag className="w-4.5 h-4.5 text-red-600" style={{ width: 18, height: 18 }} />
              </div>
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {filterLabel[filterType]}
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Revenue</p>
            <p className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              Rs.&nbsp;<span className="tabular-nums">{selectedRevenue.toLocaleString()}</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
              <Activity className="w-3 h-3 text-red-400" style={{ width: 12, height: 12 }} />
              {filteredInvoices.length + filteredServices.length} bill{filteredInvoices.length + filteredServices.length !== 1 ? 's' : ''} issued
            </p>
          </div>
        </div>

        {/* Gross Margin */}
        <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <TrendingUp className="w-4.5 h-4.5 text-emerald-600" style={{ width: 18, height: 18 }} />
              </div>
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Profit
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Gross Margin</p>
            <p className="text-2xl font-black text-emerald-600 tracking-tight leading-none">
              Rs.&nbsp;<span className="tabular-nums">{totalProfit.toLocaleString()}</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
              <Wrench className="w-3 h-3 text-emerald-400" style={{ width: 12, height: 12 }} />
              Incl. {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Expenses */}
        <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-400 to-pink-400" />
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
                <TrendingDown className="w-4.5 h-4.5 text-rose-600" style={{ width: 18, height: 18 }} />
              </div>
              <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Overhead
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Expenses</p>
            <p className="text-2xl font-black text-rose-600 tracking-tight leading-none">
              Rs.&nbsp;<span className="tabular-nums">{totalExpenses.toLocaleString()}</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
              <Package className="w-3 h-3 text-rose-400" style={{ width: 12, height: 12 }} />
              {filteredExpenses.length} expense entr{filteredExpenses.length !== 1 ? 'ies' : 'y'}
            </p>
          </div>
        </div>

        {/* Net Take-Home */}
        <div className={`relative bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${netProfit >= 0 ? 'border-slate-100' : 'border-red-100'}`}>
          <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${netProfit >= 0 ? 'from-blue-500 to-indigo-400' : 'from-red-500 to-rose-400'}`} />
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-xl border ${netProfit >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
                <DollarSign className={`w-4.5 h-4.5 ${netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`} style={{ width: 18, height: 18 }} />
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider border ${netProfit >= 0 ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-red-600 bg-red-50 border-red-100'}`}>
                Net
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Net Take-Home</p>
            <p className={`text-2xl font-black tracking-tight leading-none ${netProfit >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
              Rs.&nbsp;<span className="tabular-nums">{netProfit.toLocaleString()}</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
              <Banknote className={`w-3 h-3 ${netProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`} style={{ width: 12, height: 12 }} />
              After all overheads
            </p>
          </div>
        </div>
      </div>

      {/* ── CHARTS ROW 1: Area + Bank ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Revenue Area Chart */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Revenue Stream</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Parts sales + workshop services over selected range</p>
            </div>
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">Sales + Services</span>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailySalesData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D32F2F" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#D32F2F" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gServices" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis fontSize={10} stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 11, boxShadow: '0 4px 16px rgba(0,0,0,.08)' }}
                  formatter={(v) => [`Rs. ${Number(v).toLocaleString()}`, '']}
                />
                <Legend iconSize={7} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Area type="monotone" dataKey="Sales" stroke="#D32F2F" strokeWidth={2} fill="url(#gSales)" dot={false} />
                <Area type="monotone" dataKey="Services" stroke="#10B981" strokeWidth={2} fill="url(#gServices)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bank Ledger */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">Bank & Cash</h3>
            <span className="text-xs font-black text-slate-700 font-mono">Rs. {totalBankBalance.toLocaleString()}</span>
          </div>
          <div className="space-y-2.5">
            {accounts.map(acc => (
              <div key={acc.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-700">{acc.bankName}</h4>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">{acc.accountNumber}</p>
                </div>
                <span className="text-sm font-black text-slate-800 font-mono tabular-nums">Rs. {acc.balance.toLocaleString()}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-dashed border-slate-200 text-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Ledger Synced</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CHARTS ROW 2: Bar + Pie ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Cost vs Profit Bar */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-0.5">Cost vs Profit</h3>
          <p className="text-[11px] text-slate-400 mb-4">Gross margin vs operational expenses</p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyProfitData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis fontSize={10} stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 11, boxShadow: '0 4px 16px rgba(0,0,0,.08)' }}
                  formatter={(v) => [`Rs. ${Number(v).toLocaleString()}`, '']}
                />
                <Legend iconSize={7} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="Expenses" name="Expenses" fill="#F87171" radius={[4, 4, 0, 0]} />
                <Bar dataKey="GrossMargin" name="Gross Margin" fill="#60A5FA" radius={[4, 4, 0, 0]} />
                <Bar dataKey="NetProfit" name="Net Profit" fill="#34D399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Categories Pie */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 mb-0.5">Expense Breakdown</h3>
          <p className="text-[11px] text-slate-400 mb-4">Operational cost categories for selected range</p>
          {expenseChartData.length > 0 ? (
            <div className="flex-1 grid grid-cols-2 items-center gap-4">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseChartData} cx="50%" cy="50%" innerRadius={46} outerRadius={66} paddingAngle={4} dataKey="value">
                      {expenseChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 11 }} formatter={(v) => [`Rs. ${v}`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {expenseChartData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-slate-500 truncate flex-1">{entry.name}</span>
                    <span className="font-bold text-slate-800 font-mono tabular-nums text-[11px]">Rs.&nbsp;{entry.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                <Inbox className="w-5 h-5 text-slate-300" />
              </div>
              <p className="text-xs font-medium">No expenses in this range</p>
            </div>
          )}
        </div>
      </div>

      {/* ── ALERTS ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Low Stock */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Stock Alerts
            </h3>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
              {lowStockProducts.length} items
            </span>
          </div>
          {lowStockProducts.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {lowStockProducts.map(p => (
                <div key={p.id} className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 flex items-center justify-between">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-700 truncate">{p.name}</h4>
                    <span className="text-[10px] font-mono text-slate-400">#{p.partNumber}</span>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-xs font-black text-amber-600 font-mono block">{p.stock} left</span>
                    <span className="text-[10px] text-slate-400">min {p.minStock}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center gap-2 text-slate-400">
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <Inbox className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xs font-medium text-emerald-600">All parts fully stocked</p>
            </div>
          )}
        </div>

        {/* Oil Change Reminders */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-red-500" />
              Oil Reminders
            </h3>
            <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
              {pendingOilChanges.length} pending
            </span>
          </div>
          {pendingOilChanges.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {pendingOilChanges.map(c => (
                <div key={c.id} className="p-3 rounded-xl bg-red-50/40 border border-red-100 flex items-center justify-between">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-700">{c.customerName}</h4>
                    <span className="text-[10px] font-mono text-slate-400 truncate block">{c.bikeModel} · {c.customerPhone}</span>
                  </div>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ml-2">
                    Due
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center gap-2 text-slate-400">
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xs font-medium text-emerald-600">All reminders sent</p>
            </div>
          )}
        </div>

        {/* Top Selling Products */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              Top Parts
            </h3>
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
              {filterLabel[filterType]}
            </span>
          </div>
          {topProducts.length > 0 ? (
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${i === 0 ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-700 truncate">{p.name}</h4>
                    <span className="text-[10px] text-slate-400">{p.qty} sold</span>
                  </div>
                  <span className="text-xs font-black text-slate-800 font-mono tabular-nums">Rs.&nbsp;{p.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center gap-2 text-slate-400">
              <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-slate-300" />
              </div>
              <p className="text-xs font-medium">No sales in this range</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
