/**
 * Shared TypeScript types for the Honda POS frontend.
 * Mirror of artifacts/api-server/src/honda-types.ts
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
  compatibility: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  supplierName: string;
  location: string;
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
  date: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerBikeModel?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  finalAmount: number;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Mobile Wallet';
  bankAccountId?: string;
  profit: number;
  fbrStatus?: 'Pending' | 'Synced' | 'Approved' | 'Rejected';
  fbrInvoiceNumber?: string;
  taxRate?: number;
  taxAmount?: number;
  terminalId?: string;
  fbrSubmitTime?: string;
  fbrError?: string;
  qr_code_data?: string;
  qr_image_path?: string;
  fbr_hash?: string;
  fbr_verified_status?: boolean | string;
  fbr_response_json?: string;
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
  receivedQty?: number;
  qtyReceived?: number;
}

export interface PurchaseRecord {
  id: string;
  invoiceRef: string;
  date: string;
  supplierName: string;
  items: PurchaseItem[];
  totalAmount: number;
  amountPaid: number;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Mobile Wallet' | 'Credit';
  bankAccountId?: string;
  status: 'pending' | 'received' | 'partial';
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
  serviceType: ServiceType | string;
  serviceLines?: ServiceLine[];
  parts?: ServicePartLine[];
  price: number;
  profit?: number;
  bankAccountId?: string;
  date: string;
  nextReminderDate?: string;
  reminderStatus?: 'Pending' | 'Sent' | 'Confirmed';
  notes?: string;
}

export type ExpenseCategory = 'Rent' | 'Salary' | 'Electricity' | 'Utilities' | 'Marketing' | 'Miscellaneous' | 'Transportation' | 'Office Supplies';

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory | string;
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
  date: string;
  type: 'Credit' | 'Debit';
  amount: number;
  description: string;
  balanceAfter: number;
  referenceId?: string;
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
  balance: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  timestamp: string;
}

export interface BackupHistory {
  id: string;
  timestamp: string;
  filename: string;
  size: number;
  type: 'Auto' | 'Manual';
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

// ─── App Database ─────────────────────────────────────────────────────────────

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
  fbrSyncQueue?: any[];
  terminalSyncLogs?: any[];
  analyticsCache?: { lastUpdated: string; preAggregated: any };
}
