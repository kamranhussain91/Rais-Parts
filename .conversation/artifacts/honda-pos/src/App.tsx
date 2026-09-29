import React from 'react';
import { AppProvider, useApp } from './components/AppContext';
import { DashboardView } from './components/DashboardView';
import { POSView } from './components/POSView';
import { InventoryView } from './components/InventoryView';
import { PurchaseView } from './components/PurchaseView';
import { WorkshopView } from './components/WorkshopView';
import { OilRemindersView } from './components/OilRemindersView';
import { ExpensesView } from './components/ExpensesView';
import { BankingView } from './components/BankingView';
import { CustomersView } from './components/CustomersView';
import { ReportingView } from './components/ReportingView';
import { BackupRestoreView } from './components/BackupRestoreView';
import { InvoiceVerificationView } from './components/InvoiceVerificationView';
import { PublicInvoiceVerification } from './components/PublicInvoiceVerification';
import { UsersView } from './components/UsersView';
import { LoginView } from './components/LoginView';
import { SalesHistoryView } from './components/SalesHistoryView';
import {
  LayoutDashboard,
  ShoppingBag,
  History,
  Wrench,
  Bell,
  Package,
  Coins,
  DollarSign,
  Building,
  Users,
  BarChart,
  CloudLightning,
  LogOut,
  UserCheck
} from 'lucide-react';

const hasAdminPrivileges = (role: string | null | undefined): boolean => {
  if (!role) return false;
  return role === 'Super Admin' || role === 'Admin' || role === 'Manager';
};

const Sidebar: React.FC = () => {
  const { currentTab, setCurrentTab, currentUser, db } = useApp();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, role: 'Admin' },
    { id: 'pos', label: 'POS', icon: ShoppingBag, role: 'Cashier' },
    { id: 'sales-history', label: 'Sales History', icon: History, role: 'Cashier' },
    { id: 'workshop', label: 'Workshop', icon: Wrench, role: 'Cashier' },
    { id: 'reminders', label: 'Reminders', icon: Bell, role: 'Cashier' },
    { id: 'inventory', label: 'Inventory', icon: Package, role: 'Cashier' },
    { id: 'purchase', label: 'Purchases', icon: Coins, role: 'Admin' },
    { id: 'expenses', label: 'Expenses', icon: DollarSign, role: 'Admin' },
    { id: 'banking', label: 'Banking', icon: Building, role: 'Admin' },
    { id: 'customers', label: 'Customers', icon: Users, role: 'Cashier' },
    { id: 'reporting', label: 'Reports', icon: BarChart, role: 'Admin' },
    { id: 'backup', label: 'Backup', icon: CloudLightning, role: 'Admin' },
    { id: 'users', label: 'Users', icon: UserCheck, role: 'Admin' },
  ];

  if (!db) return null;

  return (
    <div className="w-64 bg-white text-slate-700 flex flex-col justify-between shrink-0 no-print border-r border-slate-200" id="main-sidebar-body">
      <div className="p-5 bg-white border-b border-slate-200 flex items-center gap-3">
        <div className="w-9 h-9 bg-red-600 text-white rounded-lg flex items-center justify-center font-black italic text-xl leading-none shrink-0 shadow-sm">
          H
        </div>
        <div>
          <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none">Rais Honda</h1>
          <span className="text-[9px] uppercase tracking-wider text-red-600 font-extrabold block mt-1 font-mono">Motor Labs & Parts</span>
        </div>
      </div>

      <div className="flex-1 py-4 overflow-y-auto space-y-1.5 px-3">
        {menuItems.map(item => {
          const IconComp = item.icon;
          const isPermitted = item.role === 'Cashier' || hasAdminPrivileges(currentUser?.role);
          if (!isPermitted) return null;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 transition-all text-xs font-bold cursor-pointer duration-200 ${
                isActive
                  ? 'bg-red-600 text-white shadow-md rounded-lg'
                  : 'text-slate-600 hover:text-red-600 bg-white hover:bg-red-50/40 border border-slate-100 hover:border-red-100 rounded-lg'
              }`}
              onClick={() => setCurrentTab(item.id)}
            >
              <IconComp className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const HeaderBar: React.FC = () => {
  const { currentUser, currentTab, logout } = useApp();

  const getPageHeaderTitle = () => {
    switch (currentTab) {
      case 'dashboard': return 'Dashboard';
      case 'pos': return 'Point of Sale';
      case 'sales-history': return 'Sales History';
      case 'verify-invoice': return 'FBR Invoice Verifier';
      case 'workshop': return 'Workshop Tickets';
      case 'reminders': return 'Service Reminders';
      case 'inventory': return 'Parts Inventory';
      case 'purchase': return 'Purchases';
      case 'expenses': return 'Operating Expenses';
      case 'banking': return 'Banking & Ledger';
      case 'customers': return 'Customer CRM';
      case 'reporting': return 'Financial Reports';
      case 'backup': return 'Backup & Restore';
      case 'users': return 'User Accounts';
      default: return 'Console';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 no-print">
      <div className="space-y-0.5">
        <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">{getPageHeaderTitle()}</h2>
      </div>
      <div className="flex items-center gap-4">
        {currentUser && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 select-none border border-slate-200 bg-slate-50/50 p-2 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-red-50 text-red-700 font-bold flex items-center justify-center text-xs border border-red-200 uppercase">
                {currentUser.name[0]}
              </div>
              <div className="text-[10px] leading-tight">
                <strong className="block text-slate-700 font-semibold">{currentUser.name}</strong>
                <span className="text-[9px] text-slate-400 capitalize">{currentUser.role} Mode</span>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="px-3 py-2 border border-slate-200 hover:border-red-500 hover:bg-red-50 text-slate-500 hover:text-red-700 font-bold rounded-lg text-[10px] font-sans flex items-center gap-1.5 transition-all select-none cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

const ContentViewport: React.FC = () => {
  const { currentTab } = useApp();
  const isPOS = currentTab === 'pos';
  return (
    <main className={`flex-1 bg-slate-50 ${isPOS ? 'overflow-hidden' : 'overflow-y-auto p-6'}`} id="main-content-viewport-layout">
      {currentTab === 'dashboard' && <DashboardView />}
      {currentTab === 'pos' && <POSView />}
      {currentTab === 'sales-history' && <SalesHistoryView />}
      {currentTab === 'verify-invoice' && <InvoiceVerificationView />}
      {currentTab === 'inventory' && <InventoryView />}
      {currentTab === 'purchase' && <PurchaseView />}
      {currentTab === 'workshop' && <WorkshopView />}
      {currentTab === 'reminders' && <OilRemindersView />}
      {currentTab === 'expenses' && <ExpensesView />}
      {currentTab === 'banking' && <BankingView />}
      {currentTab === 'customers' && <CustomersView />}
      {currentTab === 'reporting' && <ReportingView />}
      {currentTab === 'backup' && <BackupRestoreView />}
      {currentTab === 'users' && <UsersView />}
    </main>
  );
};

const InnerApp: React.FC = () => {
  const { loading, currentUser } = useApp();

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-50 text-slate-800 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-4 border-t-red-600 border-slate-200 animate-spin" />
        <span className="text-[11px] font-mono font-bold tracking-widest text-slate-500 uppercase">Synchronising Systems...</span>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen bg-neutral-100 font-sans text-neutral-700 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <HeaderBar />
        <ContentViewport />
      </div>
    </div>
  );
};

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const verifyInvoiceNum = params.get('invoice') || params.get('verify');

  if (verifyInvoiceNum) {
    return <PublicInvoiceVerification invoiceNumber={verifyInvoiceNum} />;
  }

  return (
    <AppProvider>
      <InnerApp />
    </AppProvider>
  );
}
