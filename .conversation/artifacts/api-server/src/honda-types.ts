/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'Super Admin' | 'Admin' | 'Manager' | 'Cashier' | 'Store Keeper' | 'Staff' | string;

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  password?: string;
  status?: 'Active' | 'Inactive';
  lastLogin?: string;
}

export interface Product {
  id: string;
  name: string;
  partNumber: string;
  barcode: string;
  category: string;
  compatibility: string; // e.g. "CD-70", "CG-125"
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  supplierName: string;
  location: string; // e.g. "Rack A, Shelf 2"
}

export interface SaleItem {
  productId: string;
  name: string;
  partNumber: string;
  qty: number;
  purchasePrice: number;
  sellingPrice: number;
}

export interface SaleInvoice {
  id: string;
  invoiceNumber: string;
  date: string; // ISO String
  customerId: string; // "Walk-in" or Customer.id
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerBikeModel?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  finalAmount: number;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Mobile Wallet' | 'Credit';
  bankAccountId?: string; // Optional links to bank
  profit: number;
  
  // FBR Tax Authority compliance updates
  fbrStatus?: 'Pending' | 'Synced' | 'Approved' | 'Rejected';
  fbrInvoiceNumber?: string;
  taxRate?: number; // e.g. 18 for 18% GST in Pakistan
  taxAmount?: number;
  terminalId?: string; // T1, T2 etc.
  fbrSubmitTime?: string;
  fbrError?: string;

  // FBR compliance database updates
  qr_code_data?: string;
  qr_image_path?: string;
  fbr_hash?: string;
  fbr_verified_status?: boolean | string;
  fbr_response_json?: string;

  // Credit / partial payment tracking
  amountPaid?: number;
  amountDue?: number;
  paymentStatus?: 'Paid' | 'Partial';
}

export interface PurchaseItem {
  productId: string;
  name: string;
  partNumber: string;
  purchasePrice: number;
  qty: number;
  qtyReceived?: number; // cumulative units received into stock so far
}

export interface PurchaseRecord {
  id: string;
  invoiceRef: string;
  date: string;
  supplierName: string;
  items: PurchaseItem[];
  totalAmount: number;
  amountPaid: number;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Mobile Wallet';
  bankAccountId?: string;
  status?: 'pending' | 'partial' | 'received';
  notes?: string;
}

export type ServiceType = 'Oil Change' | 'Bike Tuning' | 'Brake Service' | 'Engine Service';

export interface ServiceLine {
  serviceType: ServiceType | string;
  price: number;
}

export interface ServicePartLine {
  productId: string;
  name: string;
  partNumber: string;
  qty: number;
  purchasePrice: number;
  sellingPrice: number;
}

export interface ServiceRecord {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  bikeModel: string;
  serviceType: ServiceType | string; // primary service (Oil Change if present, else first line)
  price: number;                  // total of all service lines
  serviceLines?: ServiceLine[];   // multi-service support; undefined on legacy records
  parts?: ServicePartLine[];      // inventory parts used on this workshop bill
  profit?: number;                // labour revenue + parts margin
  bankAccountId?: string;         // account receiving the payment
  date: string; // ISO String
  nextReminderDate?: string; // ISO String (for Oil Change, default 30 days later)
  reminderStatus?: 'Pending' | 'Sent' | 'Confirmed';
  notes?: string;
}

export type ExpenseCategory = 'Rent' | 'Salary' | 'Electricity' | 'Utilities' | 'Marketing' | 'Miscellaneous' | 'Transportation' | 'Office Supplies';

export interface Expense {
  id: string;
  date: string; // ISO String
  category: ExpenseCategory;
  amount: number;
  description: string;
  bankAccountId?: string; // which account to debit (defaults to cash_chest)
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  balance: number;
  isDefaultCash?: boolean;
  isDefaultBank?: boolean;
}

export interface BankLedgerEntry {
  id: string;
  bankAccountId: string;
  bankName: string;
  date: string; // ISO String
  type: 'Credit' | 'Debit';
  amount: number;
  description: string;
  balanceAfter: number;
  referenceId?: string; // e.g., SaleInvoice.id, PurchaseRecord.id, Expense.id
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  bikeModel: string;
  creditBalance?: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  balance: number; // outstanding dues if any
}

export interface ActivityLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  timestamp: string; // ISO String
}

export interface BackupHistory {
  id: string;
  timestamp: string;
  filename: string;
  size: number; // in bytes
  type: 'Auto' | 'Manual';
}

export interface FbrQueueItem {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  status: 'Pending' | 'Synced' | 'Approved' | 'Rejected';
  retryCount: number;
  lastAttempt?: string;
  errorMessage?: string;
  payloadHash?: string;
}

export interface TerminalSyncLog {
  id: string;
  terminalId: string;
  actionType: 'SALE' | 'STOCK_DECREMENT' | 'CUSTOMER_SYNC' | 'PAYMENT';
  status: 'SUCCESS' | 'CONFLICT' | 'RESOLVED';
  timestamp: string;
  details: string;
}

// ─── Stock Adjustment (Damage & Returns) ─────────────────────────────────────

export type StockAdjustmentType = 'Damage' | 'Customer Return' | 'Supplier Return' | 'Manual Adjustment';
export type AdjustmentResolution = 'Pending' | 'Returned to Supplier' | 'Written Off' | 'Repaired & Restocked';

export interface StockAdjustmentRecord {
  id: string;
  date: string;
  productId: string;
  productName: string;
  partNumber: string;
  type: StockAdjustmentType;
  qty: number;                    // always positive
  direction?: 'Add' | 'Remove';  // only used for Manual Adjustment
  reason: string;
  notes?: string;
  referenceNo?: string;           // original invoice / purchase ref
  stockBefore: number;
  stockAfter: number;
  createdBy: string;
  createdById: string;
  resolution: AdjustmentResolution;
  resolvedAt?: string;
}

export interface AppDatabase {
  users: User[];
  products: Product[];
  invoices: SaleInvoice[];
  purchases: PurchaseRecord[];
  services: ServiceRecord[];
  expenses: Expense[];
  accounts: BankAccount[];
  ledger: BankLedgerEntry[];
  customers: Customer[];
  suppliers: Supplier[];
  activityLogs: ActivityLog[];
  backups: BackupHistory[];
  stockAdjustments?: StockAdjustmentRecord[];

  // New backend sync & analytics caching entities
  fbrSyncQueue?: FbrQueueItem[];
  terminalSyncLogs?: TerminalSyncLog[];
  analyticsCache?: {
    lastUpdated: string;
    preAggregated: any;
  };
}
