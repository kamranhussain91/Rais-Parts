// @refresh reset
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  AppDatabase, 
  User, 
  Product, 
  SaleInvoice, 
  PurchaseRecord, 
  ServiceRecord, 
  Expense, 
  BankAccount, 
  Customer, 
  Supplier,
  StockAdjustmentRecord,
  StockAdjustmentType,
  AdjustmentResolution,
} from '../types';

interface AppContextType {
  db: AppDatabase | null;
  loading: boolean;
  error: string | null;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  logout: () => void;
  refreshData: () => Promise<void>;
  saveProduct: (product: Product) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  saveSaleInvoice: (invoice: SaleInvoice) => Promise<SaleInvoice | null>;
  updateSaleInvoice: (id: string, updates: Partial<SaleInvoice> & { notes?: string }) => Promise<boolean>;
  savePurchase: (purchase: PurchaseRecord) => Promise<boolean>;
  editPurchase: (id: string, purchase: PurchaseRecord) => Promise<boolean>;
  receivePurchase: (id: string) => Promise<boolean>;
  partialReceivePurchase: (id: string, receipts: { productId: string; qtyToReceive: number }[]) => Promise<{ success: boolean; errors?: string[] }>;
  saveServiceRecord: (service: ServiceRecord) => Promise<boolean>;
  updateServiceRecord: (id: string, updates: Partial<ServiceRecord>) => Promise<boolean>;
  updateRemindersStatus: (ids: string[], status: 'Pending' | 'Sent' | 'Confirmed') => Promise<boolean>;
  saveExpense: (expense: Expense) => Promise<boolean>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<boolean>;
  deleteExpense: (id: string) => Promise<boolean>;
  saveBankTransaction: (id: string, type: 'Credit' | 'Debit', amount: number, description: string) => Promise<boolean>;
  createBankAccount: (bankName: string, accountNumber: string, initialBalance: number) => Promise<boolean>;
  updateBankAccount: (id: string, bankName: string, accountNumber: string) => Promise<boolean>;
  deleteBankAccount: (id: string) => Promise<boolean>;
  triggerBackup: (type: 'Auto' | 'Manual') => Promise<boolean>;
  triggerRestore: (backupData: unknown) => Promise<boolean>;
  saveCustomer: (customer: Customer) => Promise<boolean>;
  updateCustomer: (id: string, customer: Partial<Customer>) => Promise<boolean>;
  deleteCustomer: (id: string) => Promise<boolean>;
  recordCreditPayment: (customerId: string, amount: number, note: string, bankAccountId?: string) => Promise<boolean>;
  saveUser: (user: User) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;

  // Stock Adjustments (Damage & Returns)
  saveStockAdjustment: (params: {
    productId: string;
    type: StockAdjustmentType;
    qty: number;
    direction?: 'Add' | 'Remove';
    reason: string;
    notes?: string;
    referenceNo?: string;
  }) => Promise<boolean>;
  updateStockAdjustment: (id: string, resolution: AdjustmentResolution, notes?: string) => Promise<boolean>;
  deleteStockAdjustment: (id: string) => Promise<boolean>;
  
  // Terminal and Lan synchronization states
  terminalId: string;
  setTerminalId: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<AppDatabase | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [terminalId, setTerminalIdState] = useState<string>(() => {
    return localStorage.getItem('honda_terminal_id') || 'T1';
  });

  const setTerminalId = (id: string) => {
    localStorage.setItem('honda_terminal_id', id);
    setTerminalIdState(id);
  };

  // In offline mode or first-loading we load from our local express server
  const refreshData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/db');
      if (!res.ok) throw new Error('Failed to fetch POS database information.');
      const data: AppDatabase = await res.json();
      setDb(data);
      
      const savedUserId = localStorage.getItem('rais_honda_current_user_id');
      if (savedUserId && data.users) {
        const found = data.users.find(u => u.id === savedUserId && u.status !== 'Inactive');
        if (found) {
          setCurrentUser(found);
          setCurrentTab(found.role === 'Cashier' ? 'pos' : 'dashboard');
        } else {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Cannot connect to backend server. Running in limited local mode.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('rais_honda_current_user_id', currentUser.id);
    } else {
      localStorage.removeItem('rais_honda_current_user_id');
    }
  }, [currentUser]);

  const logout = () => {
    setCurrentUser(null);
  };

  const saveProduct = async (product: Product): Promise<boolean> => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product,
          auth: { userId: currentUser?.id, username: currentUser?.username }
        })
      });
      if (!res.ok) throw new Error('API failed to store product details');
      const result = await res.json();
      if (result.success) {
        setDb(result.db);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          username: currentUser?.username
        })
      });
      if (!res.ok) throw new Error('API failed to delete product');
      const result = await res.json();
      if (result.success) {
        setDb(result.db);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const saveUser = async (user: User): Promise<boolean> => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          auth: { userId: currentUser?.id, username: currentUser?.username }
        })
      });
      if (!res.ok) throw new Error('API failed to store user details');
      const result = await res.json();
      if (result.success) {
        setDb(result.db);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const deleteUser = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          username: currentUser?.username
        })
      });
      if (!res.ok) throw new Error('API failed to delete user');
      const result = await res.json();
      if (result.success) {
        setDb(result.db);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const saveSaleInvoice = async (invoice: SaleInvoice): Promise<SaleInvoice | null> => {
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice,
          auth: { userId: currentUser?.id, username: currentUser?.username }
        })
      });
      if (!res.ok) throw new Error('API failed to commit sale receipt');
      const result = await res.json();
      if (result.success) {
        setDb(result.db);
        return result.invoice; // Returns the full auto-generated complete invoice
      }
      return null;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const updateSaleInvoice = async (id: string, updates: Partial<SaleInvoice> & { notes?: string }): Promise<boolean> => {
    try {
      const res = await fetch(`/api/sales/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates,
          auth: { userId: currentUser?.id, username: currentUser?.username }
        })
      });
      if (!res.ok) throw new Error('API failed to update invoice');
      const result = await res.json();
      if (result.success) {
        setDb(result.db);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const savePurchase = async (purchase: PurchaseRecord): Promise<boolean> => {
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase,
          auth: { userId: currentUser?.id, username: currentUser?.username }
        })
      });
      if (!res.ok) throw new Error('API failed to save purchase bill');
      const result = await res.json();
      if (result.success) {
        setDb(result.db);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const editPurchase = async (id: string, purchase: PurchaseRecord): Promise<boolean> => {
    try {
      const res = await fetch(`/api/purchases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase,
          auth: { userId: currentUser?.id, username: currentUser?.username }
        })
      });
      if (!res.ok) throw new Error('Failed to update purchase');
      const result = await res.json();
      if (result.success) { setDb(result.db); return true; }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const receivePurchase = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/purchases/${id}/receive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth: { userId: currentUser?.id, username: currentUser?.username } })
      });
      if (!res.ok) throw new Error('Failed to mark purchase as received');
      const result = await res.json();
      if (result.success) { setDb(result.db); return true; }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const partialReceivePurchase = async (
    id: string,
    receipts: { productId: string; qtyToReceive: number }[]
  ): Promise<{ success: boolean; errors?: string[] }> => {
    try {
      const res = await fetch(`/api/purchases/${id}/partial-receive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipts, auth: { userId: currentUser?.id, username: currentUser?.username } })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
      const result = await res.json();
      if (result.success) { setDb(result.db); return { success: true, errors: result.errors }; }
      return { success: false };
    } catch (err) {
      console.error(err);
      return { success: false };
    }
  };

  const saveServiceRecord = async (service: ServiceRecord): Promise<boolean> => {
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service,
          auth: { userId: currentUser?.id, username: currentUser?.username }
        })
      });
      if (!res.ok) throw new Error('API failed to book workshop service');
      const result = await res.json();
      if (result.success) {
        setDb(result.db);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const updateServiceRecord = async (id: string, updates: Partial<ServiceRecord>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates,
          auth: { userId: currentUser?.id, username: currentUser?.username }
        })
      });
      if (!res.ok) throw new Error('API failed to update service record');
      const result = await res.json();
      if (result.success) { setDb(result.db); return true; }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const updateRemindersStatus = async (ids: string[], status: 'Pending' | 'Sent' | 'Confirmed'): Promise<boolean> => {
    try {
      const res = await fetch('/api/reminders/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids,
          status,
          auth: { userId: currentUser?.id, username: currentUser?.username }
        })
      });
      if (!res.ok) throw new Error('API failed to update oil service reminders');
      const result = await res.json();
      if (result.success) {
        setDb(result.db);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const saveExpense = async (expense: Expense): Promise<boolean> => {
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense,
          auth: { userId: currentUser?.id, username: currentUser?.username }
        })
      });
      if (!res.ok) throw new Error('API failed to post expense');
      const result = await res.json();
      if (result.success) {
        setDb(result.db);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const updateExpense = async (id: string, updates: Partial<Expense>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, auth: { userId: currentUser?.id, username: currentUser?.username } })
      });
      if (!res.ok) throw new Error('Failed to update expense');
      const result = await res.json();
      if (result.success) { setDb(result.db); return true; }
      return false;
    } catch (err) { console.error(err); return false; }
  };

  const deleteExpense = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth: { userId: currentUser?.id, username: currentUser?.username } })
      });
      if (!res.ok) throw new Error('Failed to delete expense');
      const result = await res.json();
      if (result.success) { setDb(result.db); return true; }
      return false;
    } catch (err) { console.error(err); return false; }
  };

  const saveBankTransaction = async (id: string, type: 'Credit' | 'Debit', amount: number, description: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/bank-accounts/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          type,
          amount,
          description,
          auth: { userId: currentUser?.id, username: currentUser?.username }
        })
      });
      if (!res.ok) throw new Error('API failed to execute ledger book movement');
      const result = await res.json();
      if (result.success) {
        setDb(result.db);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const createBankAccount = async (bankName: string, accountNumber: string, initialBalance: number): Promise<boolean> => {
    try {
      const res = await fetch('/api/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankName, accountNumber, initialBalance, auth: { userId: currentUser?.id, username: currentUser?.username } })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
      const result = await res.json();
      if (result.success) { setDb(result.db); return true; }
      return false;
    } catch (err) { console.error(err); return false; }
  };

  const updateBankAccount = async (id: string, bankName: string, accountNumber: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/bank-accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankName, accountNumber, auth: { userId: currentUser?.id, username: currentUser?.username } })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
      const result = await res.json();
      if (result.success) { setDb(result.db); return true; }
      return false;
    } catch (err) { console.error(err); return false; }
  };

  const deleteBankAccount = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/bank-accounts/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth: { userId: currentUser?.id, username: currentUser?.username } })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
      const result = await res.json();
      if (result.success) { setDb(result.db); return true; }
      return false;
    } catch (err) { console.error(err); return false; }
  };

  const triggerBackup = async (type: 'Auto' | 'Manual'): Promise<boolean> => {
    try {
      const res = await fetch('/api/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id, 
          username: currentUser?.username,
          type
        })
      });
      if (!res.ok) throw new Error('API failed to create database archive');
      const result = await res.json();
      if (result.success) {
        setDb(result.db);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const triggerRestore = async (backupData: unknown): Promise<boolean> => {
    try {
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backupData,
          auth: { userId: currentUser?.id, username: currentUser?.username }
        })
      });
      if (!res.ok) throw new Error('API failed to restore master layout databases');
      const result = await res.json();
      if (result.success) {
        setDb(result.db);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const saveCustomer = async (customer: Customer): Promise<boolean> => {
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer, auth: { userId: currentUser?.id, username: currentUser?.username } })
      });
      if (!res.ok) throw new Error('Failed to save customer');
      const result = await res.json();
      if (result.success) { setDb(result.db); return true; }
      return false;
    } catch (err) { console.error(err); return false; }
  };

  const updateCustomer = async (id: string, customer: Partial<Customer>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer, auth: { userId: currentUser?.id, username: currentUser?.username } })
      });
      if (!res.ok) throw new Error('Failed to update customer');
      const result = await res.json();
      if (result.success) { setDb(result.db); return true; }
      return false;
    } catch (err) { console.error(err); return false; }
  };

  const deleteCustomer = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth: { userId: currentUser?.id, username: currentUser?.username } })
      });
      if (!res.ok) throw new Error('Failed to delete customer');
      const result = await res.json();
      if (result.success) { setDb(result.db); return true; }
      return false;
    } catch (err) { console.error(err); return false; }
  };

  const saveStockAdjustment = async (params: {
    productId: string;
    type: StockAdjustmentType;
    qty: number;
    direction?: 'Add' | 'Remove';
    reason: string;
    notes?: string;
    referenceNo?: string;
  }): Promise<boolean> => {
    try {
      const res = await fetch('/api/stock-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, auth: { userId: currentUser?.id, username: currentUser?.username } })
      });
      if (!res.ok) throw new Error('Failed to save stock adjustment');
      const result = await res.json();
      if (result.success) { setDb(result.db); return true; }
      return false;
    } catch (err) { console.error(err); return false; }
  };

  const updateStockAdjustment = async (id: string, resolution: AdjustmentResolution, notes?: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/stock-adjustments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution, notes, auth: { userId: currentUser?.id, username: currentUser?.username } })
      });
      if (!res.ok) throw new Error('Failed to update stock adjustment');
      const result = await res.json();
      if (result.success) { setDb(result.db); return true; }
      return false;
    } catch (err) { console.error(err); return false; }
  };

  const deleteStockAdjustment = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/stock-adjustments/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth: { userId: currentUser?.id, username: currentUser?.username } })
      });
      if (!res.ok) throw new Error('Failed to delete stock adjustment');
      const result = await res.json();
      if (result.success) { setDb(result.db); return true; }
      return false;
    } catch (err) { console.error(err); return false; }
  };

  const recordCreditPayment = async (customerId: string, amount: number, note: string, bankAccountId?: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/customers/${customerId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          note,
          bankAccountId: bankAccountId || 'cash_chest',
          auth: { userId: currentUser?.id, username: currentUser?.username }
        })
      });
      if (!res.ok) throw new Error('Failed to record credit payment');
      const result = await res.json();
      if (result.success) { setDb(result.db); return true; }
      return false;
    } catch (err) { console.error(err); return false; }
  };

  return (
    <AppContext.Provider value={{
      db,
      loading,
      error,
      currentTab,
      setCurrentTab,
      currentUser,
      setCurrentUser,
      logout,
      refreshData,
      saveProduct,
      deleteProduct,
      saveSaleInvoice,
      updateSaleInvoice,
      savePurchase,
      editPurchase,
      receivePurchase,
      partialReceivePurchase,
      saveServiceRecord,
      updateServiceRecord,
      updateRemindersStatus,
      saveExpense,
      updateExpense,
      deleteExpense,
      saveBankTransaction,
      createBankAccount,
      updateBankAccount,
      deleteBankAccount,
      triggerBackup,
      triggerRestore,
      saveCustomer,
      updateCustomer,
      deleteCustomer,
      recordCreditPayment,
      saveUser,
      deleteUser,
      saveStockAdjustment,
      updateStockAdjustment,
      deleteStockAdjustment,
      terminalId,
      setTerminalId
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used inside an AppProvider');
  }
  return context;
};
