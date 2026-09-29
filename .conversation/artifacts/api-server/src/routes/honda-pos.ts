import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import QRCode from "qrcode";
import { logger } from "../lib/logger";
import type {
  Product,
  SaleInvoice,
  SaleItem,
  PurchaseRecord,
  ServiceRecord,
  Expense,
  BankAccount,
  BankLedgerEntry,
  Customer,
  ActivityLog,
  BackupHistory,
  AppDatabase,
  User,
  StockAdjustmentRecord,
  StockAdjustmentType,
  AdjustmentResolution,
} from "../honda-types";

const router: IRouter = Router();

// ─── Data directory setup ───────────────────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const BACKUPS_DIR = path.join(DATA_DIR, "backups");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

// ─── Seed data ───────────────────────────────────────────────────────────────
const DEFAULT_DATABASE: AppDatabase = {
  stockAdjustments: [],
  users: [
    { id: "1", username: "admin", role: "Super Admin", name: "System Administrator", password: "admin", status: "Active", lastLogin: "2026-06-02T09:00:00.000Z" },
    { id: "2", username: "manager", role: "Manager", name: "Store Manager", password: "manager", status: "Active", lastLogin: "2026-06-02T08:45:00.000Z" },
    { id: "3", username: "cashier1", role: "Cashier", name: "Cashier One", password: "cashier", status: "Active", lastLogin: "2026-06-02T08:30:00.000Z" },
    { id: "4", username: "storekeeper", role: "Store Keeper", name: "Store Keeper", password: "keeper", status: "Active", lastLogin: "2026-06-02T08:15:00.000Z" },
  ],
  products: [
    { id: "prod_1", name: "Honda Genuine Spark Plug (NGK)", partNumber: "98056-10100", barcode: "9805610100", category: "Electrical", compatibility: "CD-70, CD-70 Dream, Pridor", purchasePrice: 180, sellingPrice: 250, stock: 45, minStock: 10, supplierName: "Honda Atlas Parts Ltd", location: "Rack A, Shelf 2" },
    { id: "prod_2", name: "Honda Genuine Engine Oil 4T 20W-50 (1L)", partNumber: "08C35-20W50", barcode: "08C3520W50", category: "Lubricants", compatibility: "CG-125, CG-125 Self, CB-150F", purchasePrice: 920, sellingPrice: 1100, stock: 35, minStock: 8, supplierName: "Honda Atlas Parts Ltd", location: "Pallet B, Floor" },
    { id: "prod_3", name: "Front Brake Shoe Set", partNumber: "43125-086-030", barcode: "43125086030", category: "Brakes", compatibility: "CD-70, CG-125", purchasePrice: 320, sellingPrice: 450, stock: 6, minStock: 10, supplierName: "Allied Auto Distributors", location: "Rack B, Shelf 1" },
    { id: "prod_4", name: "CG-125 Genuine Air Filter Element", partNumber: "17211-397-000", barcode: "17211397000", category: "Filters", compatibility: "CG-125, CG-125 Self", purchasePrice: 400, sellingPrice: 550, stock: 22, minStock: 5, supplierName: "Honda Atlas Parts Ltd", location: "Rack A, Shelf 3" },
    { id: "prod_5", name: "CD-70 Chain Sprocket Kit", partNumber: "40530-KCC-900", barcode: "40530KCC900", category: "Transmission", compatibility: "CD-70", purchasePrice: 1450, sellingPrice: 1950, stock: 9, minStock: 4, supplierName: "Zahid Auto Traders", location: "Rack C, Shelf 1" },
  ],
  invoices: [
    { id: "inv_1", invoiceNumber: "INV-2026-0001", date: "2026-05-28T10:15:00.000Z", customerId: "cust_1", customerName: "Muhammad Salman", customerPhone: "03001234567", customerAddress: "Gulberg III, Lahore", customerBikeModel: "CG-125", items: [{ productId: "prod_2", name: "Honda Genuine Engine Oil 4T 20W-50 (1L)", partNumber: "08C35-20W50", qty: 1, purchasePrice: 920, sellingPrice: 1100 }, { productId: "prod_4", name: "CG-125 Genuine Air Filter Element", partNumber: "17211-397-000", qty: 1, purchasePrice: 400, sellingPrice: 550 }], subtotal: 1650, discount: 50, finalAmount: 1600, paymentMethod: "Cash", profit: 280 },
    { id: "inv_2", invoiceNumber: "INV-2026-0002", date: "2026-05-30T15:30:00.000Z", customerId: "cust_2", customerName: "Sajid Mehmood", customerPhone: "03129876543", customerAddress: "DHA Phase 5, Lahore", customerBikeModel: "CD-70", items: [{ productId: "prod_1", name: "Honda Genuine Spark Plug (NGK)", partNumber: "98056-10100", qty: 1, purchasePrice: 180, sellingPrice: 250 }, { productId: "prod_5", name: "CD-70 Chain Sprocket Kit", partNumber: "40530-KCC-900", qty: 1, purchasePrice: 1450, sellingPrice: 1950 }], subtotal: 2200, discount: 100, finalAmount: 2100, paymentMethod: "Bank Transfer", bankAccountId: "bank_2", profit: 470 },
    { id: "inv_3", invoiceNumber: "INV-2026-0601-01", date: "2026-06-01T09:30:00.000Z", customerId: "cust_1", customerName: "Muhammad Salman", customerPhone: "03001234567", items: [{ productId: "prod_2", name: "Honda Genuine Engine Oil 4T 20W-50 (1L)", partNumber: "08C35-20W50", qty: 1, purchasePrice: 920, sellingPrice: 1100 }], subtotal: 1100, discount: 0, finalAmount: 1100, paymentMethod: "Cash", profit: 180 },
  ],
  purchases: [
    { id: "pur_1", invoiceRef: "HONDA-77192", date: "2026-05-20T11:00:00.000Z", supplierName: "Honda Atlas Parts Ltd", items: [{ productId: "prod_1", name: "Honda Genuine Spark Plug (NGK)", partNumber: "98056-10100", purchasePrice: 180, qty: 50 }, { productId: "prod_2", name: "Honda Genuine Engine Oil 4T 20W-50 (1L)", partNumber: "08C35-20W50", purchasePrice: 920, qty: 40 }], totalAmount: 45800, amountPaid: 45800, paymentMethod: "Bank Transfer", bankAccountId: "bank_1", status: "received" },
  ],
  services: [
    { id: "ser_1", invoiceNumber: "SRV-2026-0001", customerName: "Kashif Ali", customerPhone: "03457654321", bikeModel: "CD-70", serviceType: "Oil Change", price: 150, date: "2026-05-01T12:00:00.000Z", nextReminderDate: "2026-05-31T12:00:00.000Z", reminderStatus: "Sent", notes: "Oil changed. Recommended tuning next visit." },
    { id: "ser_2", invoiceNumber: "SRV-2026-0002", customerName: "Muhammad Salman", customerPhone: "03001234567", bikeModel: "CG-125", serviceType: "Bike Tuning", price: 800, date: "2026-05-28T10:15:00.000Z", notes: "Tappet adjustment and carburetor cleaning." },
    { id: "ser_3", invoiceNumber: "SRV-2026-0003", customerName: "Siddique Shah", customerPhone: "03334543210", bikeModel: "Pridor", serviceType: "Oil Change", price: 150, date: "2026-06-01T08:30:00.000Z", nextReminderDate: "2026-07-01T08:30:00.000Z", reminderStatus: "Pending", notes: "Honda 4T oil poured." },
    { id: "ser_4", invoiceNumber: "SRV-2026-0004", customerName: "Yasir Khan", customerPhone: "03215556677", bikeModel: "CB-150F", serviceType: "Oil Change", price: 200, date: "2026-04-30T14:00:00.000Z", nextReminderDate: "2026-05-30T14:00:00.000Z", reminderStatus: "Pending", notes: "Regular engine oil top up." },
  ],
  expenses: [
    { id: "exp_1", date: "2026-05-25T18:00:00.000Z", category: "Electricity", amount: 4500, description: "May Electricity Bill" },
    { id: "exp_2", date: "2026-05-01T09:00:00.000Z", category: "Rent", amount: 25000, description: "Monthly rent for May" },
    { id: "exp_3", date: "2026-06-01T11:00:00.000Z", category: "Miscellaneous", amount: 450, description: "Teas & Refreshments for workshop guests" },
  ],
  accounts: [
    { id: "bank_1", bankName: "Meezan Bank Shariah", accountNumber: "2014-030214-01", balance: 135000, isDefaultCash: false, isDefaultBank: true },
    { id: "bank_2", bankName: "Bank Alfalah POS", accountNumber: "5566-100234-88", balance: 74500, isDefaultCash: false, isDefaultBank: false },
    { id: "cash_chest", bankName: "Cash-in-Hand Drawer", accountNumber: "CASH-PRIMARY", balance: 24700, isDefaultCash: true, isDefaultBank: false },
  ],
  ledger: [
    { id: "led_1", bankAccountId: "bank_1", bankName: "Meezan Bank Shariah", date: "2026-05-20T11:05:00.000Z", type: "Debit", amount: 45800, description: "Paid supplier invoice HONDA-77192", balanceAfter: 135000, referenceId: "pur_1" },
    { id: "led_2", bankAccountId: "bank_2", bankName: "Bank Alfalah POS", date: "2026-05-30T15:30:00.000Z", type: "Credit", amount: 2100, description: "Sale Invoice INV-2026-0002 bank deposit", balanceAfter: 74500, referenceId: "inv_2" },
    { id: "led_3", bankAccountId: "cash_chest", bankName: "Cash-in-Hand Drawer", date: "2026-06-01T09:30:00.000Z", type: "Credit", amount: 1100, description: "Cash sale from Invoice INV-2026-0601-01", balanceAfter: 24700, referenceId: "inv_3" },
  ],
  customers: [
    { id: "cust_1", name: "Muhammad Salman", phone: "03001234567", address: "Gulberg III, Lahore", bikeModel: "CG-125" },
    { id: "cust_2", name: "Sajid Mehmood", phone: "03129876543", address: "DHA Phase 5, Lahore", bikeModel: "CD-70" },
    { id: "cust_3", name: "Kashif Ali", phone: "03457654321", address: "Model Town, Lahore", bikeModel: "CD-70" },
  ],
  suppliers: [
    { id: "sup_1", name: "Honda Atlas Parts Ltd", phone: "042111444777", address: "Queens Road, Lahore", balance: 15600 },
  ],
  activityLogs: [
    { id: "log_1", userId: "1", username: "admin", action: "Seeded system default database", timestamp: "2026-06-01T12:00:00.000Z" },
  ],
  backups: [],
  fbrSyncQueue: [],
  terminalSyncLogs: [],
  analyticsCache: { lastUpdated: new Date(0).toISOString(), preAggregated: null },
};

// ─── DB helpers ──────────────────────────────────────────────────────────────
type DefaultAccountKind = "cash" | "bank";

function normalizeBankAccounts(accounts: BankAccount[]): { accounts: BankAccount[]; changed: boolean } {
  let changed = false;
  const normalized = accounts.map((account) => {
    const next = {
      ...account,
      isDefaultCash: account.isDefaultCash === true,
      isDefaultBank: account.isDefaultBank === true,
    };
    if (next.isDefaultCash !== account.isDefaultCash || next.isDefaultBank !== account.isDefaultBank) {
      changed = true;
    }
    return next;
  });

  // Existing JSON databases predate the flags. Migrate them by recognizing
  // the semantic cash account, then use the first remaining account as the
  // default bank. This is a one-time compatibility migration; transactions
  // never resolve defaults from a hardcoded account ID.
  if (!normalized.some((account) => account.isDefaultCash)) {
    const cashAccount = normalized.find((account) =>
      /cash/i.test(account.bankName) || /^cash(?:-|$)/i.test(account.accountNumber),
    );
    if (cashAccount) {
      cashAccount.isDefaultCash = true;
      changed = true;
    }
  }
  if (!normalized.some((account) => account.isDefaultBank)) {
    const bankAccount = normalized.find((account) => !account.isDefaultCash);
    if (bankAccount) {
      bankAccount.isDefaultBank = true;
      changed = true;
    }
  }

  return { accounts: normalized, changed };
}

function resolveAccount(
  db: AppDatabase,
  requestedAccountId: unknown,
  kind: DefaultAccountKind,
): BankAccount | undefined {
  const accountId = typeof requestedAccountId === "string" ? requestedAccountId.trim() : "";
  if (accountId) {
    return db.accounts.find((account) => account.id === accountId);
  }
  return db.accounts.find((account) =>
    kind === "cash" ? account.isDefaultCash === true : account.isDefaultBank === true,
  );
}

function resolvePaymentAccount(
  db: AppDatabase,
  paymentMethod: string | undefined,
  requestedAccountId: unknown,
): BankAccount | undefined {
  // Preserve the existing workflow: cash payments always use the configured
  // default cash account, while bank/wallet payments may select an account
  // and otherwise use the configured default bank account.
  if (paymentMethod === "Cash") return resolveAccount(db, undefined, "cash");
  return resolveAccount(db, requestedAccountId, "bank");
}

function missingAccountError(transaction: string, kind: DefaultAccountKind): string {
  const label = kind === "cash" ? "cash" : "bank";
  return `Cannot record ${transaction}: select a valid ${label} account or configure a default ${label} account first.`;
}

function readDB(): AppDatabase {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DATABASE, null, 2));
      return JSON.parse(JSON.stringify(DEFAULT_DATABASE));
    }
    const data = fs.readFileSync(DB_FILE, "utf8");
    const dbObj: AppDatabase = JSON.parse(data);
    const normalizedAccounts = normalizeBankAccounts(dbObj.accounts || []);
    dbObj.accounts = normalizedAccounts.accounts;
    if (normalizedAccounts.changed) {
      fs.writeFileSync(DB_FILE, JSON.stringify(dbObj, null, 2));
    }
    if (!dbObj.fbrSyncQueue) dbObj.fbrSyncQueue = [];
    if (!dbObj.terminalSyncLogs) dbObj.terminalSyncLogs = [];
    if (!dbObj.analyticsCache) dbObj.analyticsCache = { lastUpdated: new Date(0).toISOString(), preAggregated: null };
    if (!dbObj.users || dbObj.users.length === 0) dbObj.users = [...DEFAULT_DATABASE.users];
    return dbObj;
  } catch (err) {
    logger.error({ err }, "Error reading database file");
    return JSON.parse(JSON.stringify(DEFAULT_DATABASE));
  }
}

function writeDB(db: AppDatabase) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    logger.error({ err }, "Error writing database file");
  }
}

const REQUIRED_BACKUP_ARRAY_FIELDS = [
  "users",
  "products",
  "invoices",
  "purchases",
  "services",
  "expenses",
  "accounts",
  "ledger",
  "customers",
  "suppliers",
  "activityLogs",
  "backups",
] as const;

const OPTIONAL_BACKUP_ARRAY_FIELDS = [
  "stockAdjustments",
  "fbrSyncQueue",
  "terminalSyncLogs",
] as const;

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getBackupDatabasePayload(input: unknown): Record<string, any> | null {
  if (!isObject(input)) return null;
  // Accept both the current raw AppDatabase export and future/envelope
  // exports that wrap it under a `database` property.
  if (isObject(input.database)) return input.database;
  return input;
}

function validateBackupDatabase(input: unknown): { data: Record<string, any> | null; errors: string[] } {
  const data = getBackupDatabasePayload(input);
  if (!data) return { data: null, errors: ["The uploaded file must contain a JSON object."] };

  const errors: string[] = [];
  for (const field of REQUIRED_BACKUP_ARRAY_FIELDS) {
    if (!Array.isArray(data[field])) {
      errors.push(`${field} must be an array.`);
      continue;
    }
    if (!data[field].every((item: unknown) => isObject(item))) {
      errors.push(`${field} must contain JSON records.`);
    }
  }

  for (const field of OPTIONAL_BACKUP_ARRAY_FIELDS) {
    if (data[field] !== undefined && !Array.isArray(data[field])) {
      errors.push(`${field} must be an array when provided.`);
    } else if (Array.isArray(data[field]) && !data[field].every((item: unknown) => isObject(item))) {
      errors.push(`${field} must contain JSON records.`);
    }
  }

  if (data.analyticsCache !== undefined && data.analyticsCache !== null && !isObject(data.analyticsCache)) {
    errors.push("analyticsCache must be an object when provided.");
  }

  return { data, errors };
}

function prepareRestoredDatabase(data: Record<string, any>): AppDatabase {
  const restored = { ...data } as AppDatabase;
  for (const field of OPTIONAL_BACKUP_ARRAY_FIELDS) {
    if (!Array.isArray(restored[field])) restored[field] = [];
  }
  if (!restored.analyticsCache || !isObject(restored.analyticsCache)) {
    restored.analyticsCache = { lastUpdated: new Date(0).toISOString(), preAggregated: null };
  }
  restored.accounts = normalizeBankAccounts(restored.accounts).accounts;
  return restored;
}

function logActivity(userId: string, username: string, action: string) {
  const db = readDB();
  const log: ActivityLog = {
    id: "log_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    userId,
    username,
    action,
    timestamp: new Date().toISOString(),
  };
  db.activityLogs.unshift(log);
  if (db.activityLogs.length > 500) db.activityLogs = db.activityLogs.slice(0, 500);
  writeDB(db);
}

function invalidateAnalyticsCache() {
  try {
    const db = readDB();
    if (db.analyticsCache) {
      db.analyticsCache.lastUpdated = new Date(0).toISOString();
      db.analyticsCache.preAggregated = null;
    }
    writeDB(db);
  } catch (_) { /* ignore */ }
}

// ─── FBR helpers ─────────────────────────────────────────────────────────────
function generateInvoiceHash(invoice: Partial<SaleInvoice>): string {
  const payloadString = JSON.stringify({
    invoiceNumber: invoice.invoiceNumber,
    items: (invoice.items || []).map((item) => ({
      productId: item.productId,
      qty: item.qty,
      sellingPrice: item.sellingPrice,
    })),
    totalAmount: invoice.finalAmount,
    taxAmount: (invoice as any).taxAmount || 0,
    timestamp: invoice.date,
  });
  return crypto.createHash("sha256").update(payloadString).digest("hex");
}

async function updateInvoiceQRCodeAndHash(invoice: any, hostHeader?: string): Promise<any> {
  const hash = generateInvoiceHash(invoice);
  invoice.fbr_hash = hash;
  try {
    let domainUrl = "https://rais-honda.replit.app";
    if (hostHeader) {
      const isLocal = hostHeader.includes("localhost") || hostHeader.includes("127.0.0.1");
      domainUrl = (isLocal ? "http://" : "https://") + hostHeader;
    }
    const verifyUrl = `${domainUrl}?invoice=${encodeURIComponent(invoice.fbrInvoiceNumber || invoice.invoiceNumber)}`;
    const qrImageBase64 = await QRCode.toDataURL(verifyUrl, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 400,
      color: { dark: "#000000", light: "#ffffff" },
    });
    invoice.qr_image_path = qrImageBase64;
    invoice.fbr_verified_status = invoice.fbrStatus === "Approved" ? "Approved" : "Pending";
  } catch (err) {
    logger.warn({ err }, "QR code generation failed");
  }
  return invoice;
}

// ─── FBR config & terminals ──────────────────────────────────────────────────
const fbrConfig = {
  apiUrl: "https://api.fbr.gov.pk/invoice/submit",
  apiKey: "fbr_atlas_honda_api_key_pk_2026",
  apiSecret: "fbr_hmac_sec_0918x23a",
  internetStatus: "Online",
  fbrServerStatus: "Operational",
};

const MULTI_TERMINALS = [
  { id: "T1", name: "Billing Counter 1", location: "Main Gate Exit" },
  { id: "T2", name: "Billing Counter 2", location: "Spare Parts Lobby" },
  { id: "W1", name: "Workshop Mechanic Desk", location: "Bay 1 & Tuning" },
  { id: "A1", name: "Admin Manager Office", location: "Backoffice Cabin" },
];

const activePartsLocks: Record<string, { terminalId: string; lockTime: string }> = {};

// Background FBR queue processor
function runFbrBackgroundWorker() {
  setInterval(async () => {
    try {
      const db = readDB();
      if (!db.fbrSyncQueue || db.fbrSyncQueue.length === 0) return;
      let modified = false;
      const pending = db.fbrSyncQueue.filter((i: any) => i.status === "Pending");
      for (const item of pending) {
        if (fbrConfig.internetStatus === "Offline") continue;
        item.lastAttempt = new Date().toISOString();
        item.retryCount += 1;
        const invoice = db.invoices.find((inv) => inv.id === item.invoiceId);
        if (!invoice) { item.status = "Rejected"; item.errorMessage = "Invoice not found"; modified = true; continue; }
        if (fbrConfig.fbrServerStatus === "Downtime") { item.errorMessage = "FBR 503: Gateway timeout"; modified = true; continue; }
        const fbrUsin = "12" + Math.floor(1000000000 + Math.random() * 9000000000);
        item.status = "Approved"; item.errorMessage = undefined;
        (invoice as any).fbrStatus = "Approved";
        (invoice as any).fbrInvoiceNumber = fbrUsin;
        (invoice as any).fbrSubmitTime = new Date().toISOString();
        await updateInvoiceQRCodeAndHash(invoice);
        if (!db.terminalSyncLogs) db.terminalSyncLogs = [];
        db.terminalSyncLogs.unshift({ id: "ts_" + Date.now(), terminalId: (invoice as any).terminalId || "T1", actionType: "SALE", status: "SUCCESS", timestamp: new Date().toISOString(), details: `FBR auto-synced ${invoice.invoiceNumber}. Ref: ${fbrUsin}` });
        modified = true;
      }
      if (modified) writeDB(db);
    } catch (e) {
      logger.warn({ e }, "FBR background worker error");
    }
  }, 10000);
}
runFbrBackgroundWorker();

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET full database snapshot
router.get("/db", (req, res) => {
  res.json(readDB());
});

// POST save/update product
router.post("/products", (req, res) => {
  const db = readDB();
  const product: Product = req.body.product;
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  if (!product.id) {
    product.id = "prod_" + Date.now();
    db.products.push(product);
    logActivity(userId, username, `Added product: ${product.name}`);
  } else {
    const idx = db.products.findIndex((p) => p.id === product.id);
    if (idx !== -1) { db.products[idx] = product; logActivity(userId, username, `Updated product: ${product.name}`); }
    else { db.products.push(product); }
  }
  writeDB(db);
  res.json({ success: true, db });
});

// DELETE product
router.delete("/products/:id", (req, res) => {
  const db = readDB();
  const { userId, username } = req.body || { userId: "1", username: "admin" };
  const prod = db.products.find((p) => p.id === req.params.id);
  if (prod) {
    db.products = db.products.filter((p) => p.id !== req.params.id);
    logActivity(userId, username, `Deleted product: ${prod.name}`);
    writeDB(db);
  }
  res.json({ success: true, db });
});

// GET FBR queue & config
router.get("/fbr/queue", (req, res) => {
  const db = readDB();
  res.json({ queue: db.fbrSyncQueue || [], config: fbrConfig });
});

// POST FBR config update
router.post("/fbr/config", (req, res) => {
  const { internetStatus, fbrServerStatus, apiUrl, apiKey, apiSecret } = req.body;
  if (internetStatus) fbrConfig.internetStatus = internetStatus;
  if (fbrServerStatus) fbrConfig.fbrServerStatus = fbrServerStatus;
  if (apiUrl) fbrConfig.apiUrl = apiUrl;
  if (apiKey) fbrConfig.apiKey = apiKey;
  if (apiSecret) fbrConfig.apiSecret = apiSecret;
  res.json({ success: true, config: fbrConfig });
});

// POST manual FBR sync
router.post("/fbr/sync", async (req, res) => {
  const db = readDB();
  if (fbrConfig.internetStatus === "Offline") {
    res.status(400).json({ success: false, error: "Cannot sync: workstation in OFFLINE mode." }); return;
  }
  let successCount = 0;
  for (const item of (db.fbrSyncQueue || []).filter((q: any) => q.status === "Pending")) {
    if (fbrConfig.fbrServerStatus === "Downtime") { item.lastAttempt = new Date().toISOString(); item.errorMessage = "FBR servers down"; continue; }
    const invoice = db.invoices.find((i) => i.id === item.invoiceId);
    if (!invoice) { item.status = "Rejected"; continue; }
    const randCode = "12" + Math.floor(1000000000 + Math.random() * 9000000000);
    item.status = "Approved"; item.errorMessage = undefined; item.lastAttempt = new Date().toISOString();
    (invoice as any).fbrStatus = "Approved"; (invoice as any).fbrInvoiceNumber = randCode; (invoice as any).fbrSubmitTime = new Date().toISOString();
    await updateInvoiceQRCodeAndHash(invoice, req.get("host"));
    successCount++;
  }
  writeDB(db);
  invalidateAnalyticsCache();
  res.json({ success: true, db, syncedItems: successCount });
});

// GET terminals and locks
router.get("/sync/terminals", (_req, res) => {
  res.json({ terminals: MULTI_TERMINALS, locks: activePartsLocks });
});

// POST acquire/release stock lock
router.post("/sync/lock", (req, res) => {
  const { productId, terminalId, action } = req.body;
  if (!productId || !terminalId) return res.status(400).json({ error: "Missing productId or terminalId" });
  if (action === "acquire") {
    const existing = activePartsLocks[productId];
    if (existing && existing.terminalId !== terminalId) {
      return res.status(409).json({ success: false, error: `Item locked by terminal '${existing.terminalId}'` });
    }
    activePartsLocks[productId] = { terminalId, lockTime: new Date().toISOString() };
    return res.json({ success: true, message: "Lock acquired" });
  }
  delete activePartsLocks[productId];
  return res.json({ success: true, message: "Lock released" });
});

// GET terminal sync logs
router.get("/sync/logs", (_req, res) => {
  const db = readDB();
  res.json(db.terminalSyncLogs || []);
});

// GET analytics
router.get("/analytics", (req, res) => {
  const db = readDB();
  const sDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(0);
  const eDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

  const filtInv = db.invoices.filter((i) => { const d = new Date(i.date); return d >= sDate && d <= eDate; });
  const filtSrv = db.services.filter((s) => { const d = new Date(s.date); return d >= sDate && d <= eDate; });
  const filtExp = db.expenses.filter((e) => { const d = new Date(e.date); return d >= sDate && d <= eDate; });

  let grossProductSales = 0, totalDiscounts = 0, costOfGoodsSold = 0, totalTax = 0;
  filtInv.forEach((inv) => { grossProductSales += inv.subtotal; totalDiscounts += inv.discount; totalTax += (inv as any).taxAmount || 0; inv.items.forEach((item) => { costOfGoodsSold += item.purchasePrice * item.qty; }); });
  let grossWorkshopRevenue = 0; filtSrv.forEach((s) => { grossWorkshopRevenue += s.price; });
  let totalExpenses = 0; filtExp.forEach((e) => { totalExpenses += e.amount; });

  const grossRevenue = (grossProductSales - totalDiscounts) + grossWorkshopRevenue;
  const netProfit = grossRevenue - costOfGoodsSold - totalExpenses;
  const grossMargin = grossRevenue > 0 ? ((grossRevenue - costOfGoodsSold) / grossRevenue) * 100 : 0;
  const netMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

  const hourlyPattern: Record<string, { hour: string; sales: number; count: number }> = {};
  for (let i = 0; i < 24; i++) { const h = String(i).padStart(2, "0") + ":00"; hourlyPattern[h] = { hour: h, sales: 0, count: 0 }; }
  filtInv.forEach((inv) => { const h = String(new Date(inv.date).getHours()).padStart(2, "0") + ":00"; if (hourlyPattern[h]) { hourlyPattern[h].sales += inv.finalAmount; hourlyPattern[h].count++; } });

  const pmCounts: Record<string, { name: string; value: number; total: number }> = { Cash: { name: "Cash", value: 0, total: 0 }, "Bank Transfer": { name: "Bank EFT", value: 0, total: 0 }, "Mobile Wallet": { name: "Wallet", value: 0, total: 0 } };
  filtInv.forEach((inv) => { const pm = inv.paymentMethod || "Cash"; if (pmCounts[pm]) { pmCounts[pm].value++; pmCounts[pm].total += inv.finalAmount; } });

  const custFreq: Record<string, { name: string; phone: string; count: number; totalSales: number }> = {};
  filtInv.forEach((inv) => { const ph = inv.customerPhone || "Walk-in"; if (!custFreq[ph]) custFreq[ph] = { name: inv.customerName || "Anonymous", phone: ph, count: 0, totalSales: 0 }; custFreq[ph].count++; custFreq[ph].totalSales += inv.finalAmount; });

  const prodQty: Record<string, { name: string; partNumber: string; qty: number }> = {};
  filtInv.forEach((inv) => { inv.items.forEach((item) => { if (!prodQty[item.productId]) prodQty[item.productId] = { name: item.name, partNumber: item.partNumber, qty: 0 }; prodQty[item.productId].qty += item.qty; }); });

  const soldIds = new Set(filtInv.flatMap((inv) => inv.items.map((it) => it.productId)));
  const deadStock = db.products.filter((p) => p.stock > 0 && !soldIds.has(p.id)).map((p) => ({ name: p.name, partNumber: p.partNumber, stock: p.stock, category: p.category, assetValue: p.purchasePrice * p.stock })).slice(0, 10);

  const svcTypes: Record<string, { name: string; count: number; revenue: number }> = {};
  filtSrv.forEach((s) => { if (!svcTypes[s.serviceType]) svcTypes[s.serviceType] = { name: s.serviceType, count: 0, revenue: 0 }; svcTypes[s.serviceType].count++; svcTypes[s.serviceType].revenue += s.price; });

  const oilChanges = db.services.filter((s) => s.serviceType === "Oil Change");
  const sentReminders = oilChanges.filter((s) => s.reminderStatus === "Sent" || s.reminderStatus === "Confirmed");
  const oilComplianceRate = oilChanges.length > 0 ? (sentReminders.length / oilChanges.length) * 100 : 100;

  const totalInventoryValue = db.products.reduce((acc, p) => acc + p.purchasePrice * p.stock, 0);

  res.json({
    timeRange: { startDate: sDate, endDate: eDate },
    financials: { grossProductSales, grossWorkshopRevenue, totalDiscounts, totalTaxCollected: totalTax, totalExpenses, costOfGoodsSold, grossRevenue, netProfit, grossMargin, netMargin },
    hourlyPattern: Object.values(hourlyPattern),
    paymentRatios: Object.values(pmCounts),
    customerRatings: Object.values(custFreq).sort((a, b) => b.totalSales - a.totalSales).slice(0, 10),
    inventoryIntelligence: { fastMoving: Object.values(prodQty).sort((a, b) => b.qty - a.qty).slice(0, 10), deadStock, stockTurnover: costOfGoodsSold / (totalInventoryValue || 1), totalInventoryAssets: totalInventoryValue },
    workshopAnalytics: { servicesLog: Object.values(svcTypes), oilComplianceRate },
  });
});

// POST create sale invoice
router.post("/sales", async (req, res) => {
  const db = readDB();
  const invoice: SaleInvoice = req.body.invoice;
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  const terminalId = (invoice as any).terminalId || "T1";

  const taxRate = (invoice as any).taxRate !== undefined ? (invoice as any).taxRate : 18;
  const taxableSubtotal = Math.max(0, invoice.subtotal - invoice.discount);
  const taxAmount = Math.round(taxableSubtotal * (taxRate / 100));
  (invoice as any).taxRate = taxRate;
  (invoice as any).taxAmount = taxAmount;
  invoice.finalAmount = taxableSubtotal + taxAmount;

  // Resolve the payment account before changing stock, customers, or invoice
  // state. A paid transaction must never be persisted without its money
  // movement.
  const requestedPaid = (invoice as any).amountPaid !== undefined
    ? Number((invoice as any).amountPaid)
    : invoice.finalAmount;
  const effectiveAmountPaid = Math.min(Math.max(0, requestedPaid), invoice.finalAmount);
  const amountDue = Math.round(invoice.finalAmount - effectiveAmountPaid);
  const paymentAccount = effectiveAmountPaid > 0
    ? resolvePaymentAccount(db, invoice.paymentMethod, invoice.bankAccountId)
    : undefined;
  if (effectiveAmountPaid > 0 && !paymentAccount) {
    const accountKind = invoice.paymentMethod === "Cash" ? "cash" : "bank";
    res.status(400).json({ success: false, error: missingAccountError("this sale", accountKind) });
    return;
  }
  if (paymentAccount) invoice.bankAccountId = paymentAccount.id;

  // Check concurrency locks
  for (const item of invoice.items) {
    const lock = activePartsLocks[item.productId];
    if (lock && lock.terminalId !== terminalId) {
      res.status(409).json({ error: `Product locked by terminal '${lock.terminalId}'` }); return;
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const todayCount = db.invoices.filter((inv) => inv.date.startsWith(new Date().toISOString().slice(0, 10)) && (inv as any).terminalId === terminalId).length;
  invoice.invoiceNumber = `${terminalId}-INV-${todayStr}-${String(todayCount + 1).padStart(3, "0")}`;
  invoice.id = "inv_" + Date.now();
  invoice.date = new Date().toISOString();
  (invoice as any).fbrStatus = "Pending";
  (invoice as any).terminalId = terminalId;

  let profit = 0;
  invoice.items.forEach((item) => {
    const pIdx = db.products.findIndex((p) => p.id === item.productId);
    if (pIdx !== -1) { db.products[pIdx].stock = Math.max(0, db.products[pIdx].stock - item.qty); profit += (item.sellingPrice - item.purchasePrice) * item.qty; delete activePartsLocks[item.productId]; }
  });
  invoice.profit = Math.max(0, profit - invoice.discount);

  // ── Credit / partial payment handling ────────────────────────────────────
  (invoice as any).amountPaid    = effectiveAmountPaid;
  (invoice as any).amountDue     = amountDue;
  (invoice as any).paymentStatus = amountDue <= 0 ? "Paid" : "Partial";

  // Upsert customer
  if (invoice.customerPhone && invoice.customerId === "Walk-in") {
    const existing = db.customers.find((c) => c.phone === invoice.customerPhone);
    if (existing) { invoice.customerId = existing.id; }
    else {
      const nc: Customer = { id: "cust_" + Date.now(), name: invoice.customerName || "Walk-in", phone: invoice.customerPhone, address: invoice.customerAddress || "", bikeModel: invoice.customerBikeModel || "" };
      db.customers.push(nc);
      invoice.customerId = nc.id;
    }
  }

  // Add outstanding due to customer's credit balance
  if (amountDue > 0 && invoice.customerId && invoice.customerId !== "Walk-in") {
    const custIdx = db.customers.findIndex((c) => c.id === invoice.customerId);
    if (custIdx !== -1) {
      db.customers[custIdx].creditBalance = (db.customers[custIdx].creditBalance ?? 0) + amountDue;
    }
  }

  await updateInvoiceQRCodeAndHash(invoice, req.get("host"));
  db.invoices.push(invoice);

  if (!db.fbrSyncQueue) db.fbrSyncQueue = [];
  db.fbrSyncQueue.push({ id: "q_" + Date.now(), invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, status: "Pending", retryCount: 0 });
  if (!db.terminalSyncLogs) db.terminalSyncLogs = [];
  db.terminalSyncLogs.push({ id: "ts_" + Date.now(), terminalId, actionType: "SALE", status: "SUCCESS", timestamp: new Date().toISOString(), details: `Receipt ${invoice.invoiceNumber}. Total: Rs. ${invoice.finalAmount}${amountDue > 0 ? ` | Paid: Rs. ${effectiveAmountPaid} | Due: Rs. ${amountDue}` : ""}` });

  // Credit only the amount actually received into the bank account
  if (paymentAccount && effectiveAmountPaid > 0) {
    const targetAccId = paymentAccount.id;
    const accIdx = db.accounts.findIndex((a) => a.id === targetAccId);
    db.accounts[accIdx].balance += effectiveAmountPaid;
    const ledgerNote = amountDue > 0
      ? `Credit Sale [${terminalId}] ${invoice.invoiceNumber} (${invoice.customerName}) — Paid Rs.${effectiveAmountPaid}, Due Rs.${amountDue}`
      : `Sale [${terminalId}] ${invoice.invoiceNumber} (${invoice.customerName})`;
    const entry: BankLedgerEntry = { id: "led_" + Date.now(), bankAccountId: targetAccId, bankName: db.accounts[accIdx].bankName, date: invoice.date, type: "Credit", amount: effectiveAmountPaid, description: ledgerNote, balanceAfter: db.accounts[accIdx].balance, referenceId: invoice.id };
    db.ledger.unshift(entry);
  }

  const creditNote = amountDue > 0 ? ` | Credit: Rs. ${amountDue} added to customer` : "";
  logActivity(userId, username, `Created invoice ${invoice.invoiceNumber} on ${terminalId}. Total: Rs. ${invoice.finalAmount}${creditNote}`);
  writeDB(db);
  invalidateAnalyticsCache();
  res.json({ success: true, db, invoice });
});

// PUT update invoice (edit customer info, payment, discount, and/or items)
router.put("/sales/:id", async (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const { updates, auth } = req.body;
  const { userId, username } = auth || { userId: "1", username: "admin" };

  const invIdx = db.invoices.findIndex((inv) => inv.id === id);
  if (invIdx === -1) { res.status(404).json({ success: false, error: "Invoice not found" }); return; }

  const original = db.invoices[invIdx];
  const newDiscount = updates.discount !== undefined ? Number(updates.discount) : original.discount;

  const updatedInvoice = {
    ...original,
    customerName:     updates.customerName     ?? original.customerName,
    customerPhone:    updates.customerPhone     ?? original.customerPhone,
    customerAddress:  updates.customerAddress   ?? original.customerAddress,
    customerBikeModel: updates.customerBikeModel ?? original.customerBikeModel,
    paymentMethod:    updates.paymentMethod     ?? original.paymentMethod,
    bankAccountId:    updates.bankAccountId     ?? original.bankAccountId,
    discount:         newDiscount,
    notes:            updates.notes             ?? (original as any).notes,
  } as SaleInvoice;
  const originalAmountPaid = Math.max(0, Number((original as any).amountPaid ?? original.finalAmount) || 0);
  const originalPaymentAccount = originalAmountPaid > 0
    ? resolvePaymentAccount(db, original.paymentMethod, original.bankAccountId)
    : undefined;
  const requestedPaymentAccount = originalAmountPaid > 0
    ? resolvePaymentAccount(db, updatedInvoice.paymentMethod, updatedInvoice.bankAccountId)
    : undefined;
  if (originalAmountPaid > 0 && !originalPaymentAccount) {
    const accountKind = original.paymentMethod === "Cash" ? "cash" : "bank";
    res.status(400).json({ success: false, error: missingAccountError("this invoice edit", accountKind) });
    return;
  }
  if (originalAmountPaid > 0 && !requestedPaymentAccount) {
    const accountKind = updatedInvoice.paymentMethod === "Cash" ? "cash" : "bank";
    res.status(400).json({ success: false, error: missingAccountError("this invoice edit", accountKind) });
    return;
  }
  if (requestedPaymentAccount) updatedInvoice.bankAccountId = requestedPaymentAccount.id;

  // ── Item editing: restore old stock, apply new stock, recalculate totals ──
  if (updates.items && Array.isArray(updates.items)) {
    // Step 1: restore stock from original items
    original.items.forEach((oldItem) => {
      const pIdx = db.products.findIndex((p) => p.id === oldItem.productId);
      if (pIdx !== -1) db.products[pIdx].stock += oldItem.qty;
    });

    // Step 2: deduct stock for new items (floor at 0)
    updates.items.forEach((newItem: SaleItem) => {
      const pIdx = db.products.findIndex((p) => p.id === newItem.productId);
      if (pIdx !== -1) db.products[pIdx].stock = Math.max(0, db.products[pIdx].stock - newItem.qty);
    });

    updatedInvoice.items = updates.items;

    // Step 3: recalculate financials
    const newSubtotal = updates.items.reduce((s: number, i: SaleItem) => s + i.sellingPrice * i.qty, 0);
    const taxRate = (original as any).taxRate ?? 18;
    const taxableSubtotal = Math.max(0, newSubtotal - newDiscount);
    const taxAmount = Math.round(taxableSubtotal * (taxRate / 100));
    const newProfit = updates.items.reduce((s: number, i: SaleItem) => s + (i.sellingPrice - i.purchasePrice) * i.qty, 0) - newDiscount;

    updatedInvoice.subtotal     = newSubtotal;
    updatedInvoice.finalAmount  = taxableSubtotal + taxAmount;
    updatedInvoice.profit       = Math.max(0, newProfit);
    (updatedInvoice as any).taxRate   = taxRate;
    (updatedInvoice as any).taxAmount = taxAmount;

  } else if (updates.discount !== undefined && Number(updates.discount) !== original.discount) {
    // No item change — just discount changed
    const taxRate = (original as any).taxRate ?? 18;
    const taxableSubtotal = Math.max(0, original.subtotal - newDiscount);
    const taxAmount = Math.round(taxableSubtotal * (taxRate / 100));
    (updatedInvoice as any).taxRate   = taxRate;
    (updatedInvoice as any).taxAmount = taxAmount;
    updatedInvoice.finalAmount = taxableSubtotal + taxAmount;
    updatedInvoice.profit = Math.max(0, (original.profit ?? 0) + (original.discount - newDiscount));
  }

  // ── Recalculate amountDue and sync customer credit balance + banking ────────
  const oldAmountPaid = originalAmountPaid;
  const oldAmountDue  = (original as any).amountDue  ?? 0;
  const newFinalAmount = updatedInvoice.finalAmount;
  // Paid cannot exceed new final; if we reduced total below what was paid, refund the overage
  const newAmountPaid = Math.min(oldAmountPaid, newFinalAmount);
  const newAmountDue  = Math.max(0, Math.round(newFinalAmount - newAmountPaid));

  (updatedInvoice as any).amountPaid    = newAmountPaid;
  (updatedInvoice as any).amountDue     = newAmountDue;
  (updatedInvoice as any).paymentStatus = newAmountDue <= 0 ? "Paid" : "Partial";

  // Adjust customer credit balance by the change in outstanding amount
  const creditDelta = newAmountDue - oldAmountDue;
  if (creditDelta !== 0 && updatedInvoice.customerId && updatedInvoice.customerId !== "Walk-in") {
    const custIdx = db.customers.findIndex((c) => c.id === updatedInvoice.customerId);
    if (custIdx !== -1) {
      db.customers[custIdx].creditBalance = Math.max(0, (db.customers[custIdx].creditBalance ?? 0) + creditDelta);
    }
  }

  // Adjust banking if the effective amount received changed or the selected
  // account changed. Both sides are validated before any invoice mutations.
  const bankingDelta = newAmountPaid - oldAmountPaid;
  const oldAccId = originalPaymentAccount?.id;
  const newAccId = newAmountPaid > 0 ? requestedPaymentAccount?.id : undefined;
  if (oldAccId !== newAccId) {
    if (originalPaymentAccount && oldAmountPaid > 0) {
      const oldAccIdx = db.accounts.findIndex((a) => a.id === oldAccId);
      db.accounts[oldAccIdx].balance -= oldAmountPaid;
      db.ledger.unshift({
        id: "led_" + Date.now(), bankAccountId: oldAccId!, bankName: db.accounts[oldAccIdx].bankName,
        date: new Date().toISOString(),
        type: "Debit",
        amount: oldAmountPaid,
        description: `Invoice edit adjustment: moved payment from ${original.invoiceNumber}`,
        balanceAfter: db.accounts[oldAccIdx].balance, referenceId: original.id,
      });
    }
    if (requestedPaymentAccount && newAmountPaid > 0) {
      const newAccIdx = db.accounts.findIndex((a) => a.id === newAccId);
      db.accounts[newAccIdx].balance += newAmountPaid;
      db.ledger.unshift({
        id: "led_" + Date.now(), bankAccountId: newAccId!, bankName: db.accounts[newAccIdx].bankName,
        date: new Date().toISOString(),
        type: "Credit",
        amount: newAmountPaid,
        description: `Invoice edit adjustment: moved payment to ${original.invoiceNumber}`,
        balanceAfter: db.accounts[newAccIdx].balance, referenceId: original.id,
      });
    }
  } else if (bankingDelta !== 0) {
    if (!requestedPaymentAccount) {
      const accountKind = updatedInvoice.paymentMethod === "Cash" ? "cash" : "bank";
      res.status(400).json({ success: false, error: missingAccountError("this invoice edit", accountKind) });
      return;
    }
    const accIdx = db.accounts.findIndex((a) => a.id === requestedPaymentAccount.id);
    db.accounts[accIdx].balance += bankingDelta;
    db.ledger.unshift({
      id: "led_" + Date.now(), bankAccountId: requestedPaymentAccount.id, bankName: db.accounts[accIdx].bankName,
      date: new Date().toISOString(),
      type: bankingDelta > 0 ? "Credit" : "Debit",
      amount: Math.abs(bankingDelta),
      description: `Invoice edit adjustment: ${original.invoiceNumber} (${bankingDelta > 0 ? '+' : ''}Rs. ${bankingDelta})`,
      balanceAfter: db.accounts[accIdx].balance, referenceId: original.id,
    });
  }

  await updateInvoiceQRCodeAndHash(updatedInvoice, req.get("host"));
  db.invoices[invIdx] = updatedInvoice;

  logActivity(userId, username, `Edited invoice ${original.invoiceNumber} (${updates.items ? 'items+' : ''}${creditDelta !== 0 ? `credit Δ${creditDelta > 0 ? '+' : ''}${creditDelta} ` : ''}customer/payment)`);
  writeDB(db);
  invalidateAnalyticsCache();
  res.json({ success: true, db, invoice: updatedInvoice });
});

// GET verify invoice
router.get("/sales/verify", (req, res) => {
  const invoiceNumber = req.query.invoice as string;
  if (!invoiceNumber) { res.status(400).json({ success: false, error: "Invoice number required." }); return; }
  const db = readDB();
  const invoice = db.invoices.find((inv) =>
    inv.invoiceNumber === invoiceNumber ||
    inv.id === invoiceNumber ||
    (inv as any).fbrInvoiceNumber === invoiceNumber
  );
  if (!invoice) { res.status(404).json({ success: false, error: `Invoice '${invoiceNumber}' not found.` }); return; }
  if (!db.terminalSyncLogs) db.terminalSyncLogs = [];
  db.terminalSyncLogs.unshift({ id: "ts_verify_" + Date.now(), terminalId: (invoice as any).terminalId || "T1", actionType: "SALE", status: "SUCCESS", timestamp: new Date().toISOString(), details: `Audit query for ${invoice.invoiceNumber}. Verified.` });
  writeDB(db);
  res.json({ success: true, invoice, storeDetails: { name: "Rais Honda Motor Labs & Parts", ntn: "8125439-0", address: "Main Chowk Road, Multan, Pakistan", phone: "+92-300-9805610", tagline: "Premium Automotive Honda Parts & Mechanical SLA Labs" } });
});

// POST record purchase — creates order as PENDING; stock is NOT updated here.
// Stock is only updated when the order is marked as received via PATCH below.
router.post("/purchases", (req, res) => {
  const db = readDB();
  const purchase: PurchaseRecord = req.body.purchase;
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };

  purchase.id = "pur_" + Date.now();
  purchase.date = new Date().toISOString();
  purchase.status = 'pending';
  purchase.amountPaid = Math.max(0, Number(purchase.amountPaid) || 0);
  const paymentAccount = purchase.amountPaid > 0
    ? resolvePaymentAccount(db, purchase.paymentMethod, purchase.bankAccountId)
    : undefined;
  if (purchase.amountPaid > 0 && !paymentAccount) {
    const accountKind = purchase.paymentMethod === "Cash" ? "cash" : "bank";
    res.status(400).json({ success: false, error: missingAccountError("this purchase", accountKind) });
    return;
  }
  if (paymentAccount) purchase.bankAccountId = paymentAccount.id;

  // Auto-create supplier if new
  if (purchase.supplierName && !db.suppliers.find((s) => s.name.toLowerCase() === purchase.supplierName.toLowerCase())) {
    db.suppliers.push({ id: "sup_" + Date.now(), name: purchase.supplierName, phone: "", address: "", balance: 0 });
  }
  db.purchases.unshift(purchase);

  // Record bank/cash debit if amount was paid upfront
  const paid = purchase.amountPaid;
  if (paymentAccount && paid > 0) {
    const targetAccId = paymentAccount.id;
    const accIdx = db.accounts.findIndex((a) => a.id === targetAccId);
      db.accounts[accIdx].balance -= paid;
      db.ledger.unshift({ id: "led_" + Date.now(), bankAccountId: targetAccId, bankName: db.accounts[accIdx].bankName, date: purchase.date, type: "Debit", amount: paid, description: `Purchase ${purchase.invoiceRef} (${purchase.supplierName})`, balanceAfter: db.accounts[accIdx].balance, referenceId: purchase.id });
  }

  logActivity(userId, username, `Purchase Order ${purchase.invoiceRef} created (pending). Total: Rs. ${purchase.totalAmount}, Paid: Rs. ${paid}`);
  writeDB(db);
  res.json({ success: true, db });
});

// PUT update purchase order (edit prices, quantities, items, payment)
router.put("/purchases/:id", (req, res) => {
  const db = readDB();
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  const idx = db.purchases.findIndex((p) => p.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Purchase not found" }); return; }

  const existing = db.purchases[idx];
  const updates: PurchaseRecord = req.body.purchase;
  const oldPaid = Math.max(0, Number(existing.amountPaid) || 0);
  const newPaid = updates.amountPaid != null ? Math.max(0, Number(updates.amountPaid) || 0) : oldPaid;
  const payMethod = updates.paymentMethod || existing.paymentMethod;
  const paymentAccount = newPaid > 0
    ? resolvePaymentAccount(db, payMethod, updates.bankAccountId ?? existing.bankAccountId)
    : undefined;
  if (newPaid > 0 && !paymentAccount) {
    const accountKind = payMethod === "Cash" ? "cash" : "bank";
    res.status(400).json({ success: false, error: missingAccountError("this purchase edit", accountKind) });
    return;
  }

  // If already received, reverse old inventory effect then apply updated items
  if (existing.status === 'received') {
    // Step 1: subtract old quantities from inventory
    existing.items.forEach((oldItem) => {
      const pIdx = db.products.findIndex((p) => p.id === oldItem.productId);
      if (pIdx !== -1) {
        db.products[pIdx].stock = Math.max(0, db.products[pIdx].stock - oldItem.qty);
      }
    });

    // Step 2: apply new quantities + recalculate weighted avg purchase price
    updates.items.forEach((newItem) => {
      const pIdx = db.products.findIndex((p) => p.id === newItem.productId);
      if (pIdx !== -1) {
        const curStock = db.products[pIdx].stock;
        const curPrice = db.products[pIdx].purchasePrice;
        if (curStock + newItem.qty > 0) {
          db.products[pIdx].purchasePrice = Math.round(
            ((curStock * curPrice) + (newItem.qty * newItem.purchasePrice)) / (curStock + newItem.qty)
          );
        } else {
          db.products[pIdx].purchasePrice = newItem.purchasePrice;
        }
        db.products[pIdx].stock += newItem.qty;
      }
    });
  }

  // ── Banking adjustment when amountPaid changes ──────────────────────────────
  const payDiff = newPaid - oldPaid;
  if (payDiff !== 0) {
    if (paymentAccount) {
      const targetAccId = paymentAccount.id;
      const accIdx = db.accounts.findIndex((a) => a.id === targetAccId);
      db.accounts[accIdx].balance -= payDiff; // positive diff = more money out (debit)
      db.ledger.unshift({
        id: "led_" + Date.now(), bankAccountId: targetAccId, bankName: db.accounts[accIdx].bankName,
        date: new Date().toISOString(),
        type: payDiff > 0 ? "Debit" : "Credit",
        amount: Math.abs(payDiff),
        description: `Purchase payment update: ${existing.invoiceRef} (${existing.supplierName}) — ${payDiff > 0 ? 'Additional' : 'Refund'} Rs.${Math.abs(payDiff)}`,
        balanceAfter: db.accounts[accIdx].balance,
        referenceId: existing.id,
      });
    }
  }

  // Update the purchase record (keep status + id + invoiceRef)
  db.purchases[idx] = {
    ...existing,
    supplierName:  updates.supplierName  || existing.supplierName,
    date:          updates.date          || existing.date,
    items:         updates.items,
    totalAmount:   updates.totalAmount,
    amountPaid:    newPaid,
    paymentMethod: updates.paymentMethod || existing.paymentMethod,
    bankAccountId: paymentAccount?.id ?? updates.bankAccountId ?? existing.bankAccountId,
    notes:         updates.notes,
  };

  logActivity(userId, username, `Purchase ${existing.invoiceRef} updated — Total: Rs. ${updates.totalAmount}, Paid: Rs. ${newPaid}${payDiff !== 0 ? ` (Δ${payDiff > 0 ? '+' : ''}${payDiff})` : ''}`);
  writeDB(db);
  res.json({ success: true, db });
});

// PATCH mark purchase as received — this is where stock is updated (receive ALL remaining)
router.patch("/purchases/:id/receive", (req, res) => {
  const db = readDB();
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  const idx = db.purchases.findIndex((p) => p.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Purchase not found" }); return; }
  if (db.purchases[idx].status === 'received') { res.status(400).json({ error: "Purchase already received" }); return; }

  let totalAdded = 0;
  // Update inventory stock and recalculate weighted average purchase price for remaining qty
  db.purchases[idx].items.forEach((item) => {
    const alreadyReceived = item.qtyReceived || 0;
    const remaining = item.qty - alreadyReceived;
    if (remaining <= 0) return;
    item.qtyReceived = item.qty; // mark item fully received

    const pIdx = db.products.findIndex((p) => p.id === item.productId);
    if (pIdx !== -1) {
      const oldStock = db.products[pIdx].stock;
      const oldPrice = db.products[pIdx].purchasePrice;
      if (oldStock + remaining > 0) {
        db.products[pIdx].purchasePrice = Math.round(
          ((oldStock * oldPrice) + (remaining * item.purchasePrice)) / (oldStock + remaining)
        );
      } else {
        db.products[pIdx].purchasePrice = item.purchasePrice;
      }
      db.products[pIdx].stock += remaining;
      totalAdded += remaining;
    }
  });

  db.purchases[idx].status = 'received';
  logActivity(userId, username, `Purchase ${db.purchases[idx].invoiceRef} fully received — inventory updated (+${totalAdded} units)`);
  writeDB(db);
  res.json({ success: true, db });
});

// PATCH partial receive — receive specific quantities per item, update stock incrementally
router.patch("/purchases/:id/partial-receive", (req, res) => {
  const db = readDB();
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  const idx = db.purchases.findIndex((p) => p.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Purchase not found" }); return; }
  if (db.purchases[idx].status === 'received') { res.status(400).json({ error: "Purchase already fully received" }); return; }

  // receipts: [{ productId, qtyToReceive }]
  const receipts: { productId: string; qtyToReceive: number }[] = req.body.receipts || [];
  if (!receipts.length) { res.status(400).json({ error: "No receipt quantities provided" }); return; }

  let totalAdded = 0;
  const errors: string[] = [];

  receipts.forEach(({ productId, qtyToReceive }) => {
    if (qtyToReceive <= 0) return;
    const itemIdx = db.purchases[idx].items.findIndex((i) => i.productId === productId);
    if (itemIdx === -1) { errors.push(`Product ${productId} not in this order`); return; }

    const item = db.purchases[idx].items[itemIdx];
    const alreadyReceived = item.qtyReceived || 0;
    const remaining = item.qty - alreadyReceived;
    if (remaining <= 0) { errors.push(`${item.name} is already fully received`); return; }

    const actualQty = Math.min(qtyToReceive, remaining); // cannot exceed ordered qty
    item.qtyReceived = alreadyReceived + actualQty;

    // Update product stock + weighted average cost
    const pIdx = db.products.findIndex((p) => p.id === productId);
    if (pIdx !== -1) {
      const oldStock = db.products[pIdx].stock;
      const oldPrice = db.products[pIdx].purchasePrice;
      if (oldStock + actualQty > 0) {
        db.products[pIdx].purchasePrice = Math.round(
          ((oldStock * oldPrice) + (actualQty * item.purchasePrice)) / (oldStock + actualQty)
        );
      } else {
        db.products[pIdx].purchasePrice = item.purchasePrice;
      }
      db.products[pIdx].stock += actualQty;
      totalAdded += actualQty;
    }
  });

  // Determine new status: fully received if every item's qtyReceived === qty
  const allReceived = db.purchases[idx].items.every((i) => (i.qtyReceived || 0) >= i.qty);
  db.purchases[idx].status = allReceived ? 'received' : 'partial';

  logActivity(
    userId, username,
    `Purchase ${db.purchases[idx].invoiceRef} partial receipt — +${totalAdded} units added. Status: ${db.purchases[idx].status}`
  );
  writeDB(db);
  res.json({ success: true, db, errors: errors.length ? errors : undefined });
});

// POST record workshop service
router.post("/services", (req, res) => {
  const db = readDB();
  const service: ServiceRecord = req.body.service;
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };

  // Resolve parts against the live inventory so the bill uses current prices
  // and cannot sell more stock than is available.
  const partsByProduct = new Map<string, any>();
  for (const rawPart of Array.isArray((service as any).parts) ? (service as any).parts : []) {
    const qty = Math.floor(Number(rawPart.qty) || 0);
    if (!rawPart.productId || qty < 1) {
      res.status(400).json({ error: "Each service part must have a product and quantity of at least 1" });
      return;
    }
    const product = db.products.find((p) => p.id === rawPart.productId);
    if (!product) {
      res.status(400).json({ error: `Part not found: ${rawPart.name || rawPart.productId}` });
      return;
    }
    const previous = partsByProduct.get(product.id);
    const totalQty = (previous?.qty || 0) + qty;
    if (product.stock < totalQty) {
      res.status(400).json({ error: `Insufficient stock for ${product.name}. Available: ${product.stock}, requested: ${totalQty}` });
      return;
    }
    partsByProduct.set(product.id, {
      productId: product.id,
      name: product.name,
      partNumber: product.partNumber || "",
      qty: totalQty,
      purchasePrice: Number(product.purchasePrice) || 0,
      sellingPrice: Number(product.sellingPrice) || 0,
    });
  }
  service.parts = Array.from(partsByProduct.values());

  // Multi-service: compute total price and primary service type from serviceLines
  const labourTotal = service.serviceLines && service.serviceLines.length > 0
    ? service.serviceLines.reduce((sum, l) => sum + (Number(l.price) || 0), 0)
    : 0;
  const partsTotal = service.parts.reduce((sum, part) => sum + part.qty * part.sellingPrice, 0);
  service.price = labourTotal + partsTotal;
  service.profit = labourTotal + service.parts.reduce((sum, part) => sum + part.qty * (part.sellingPrice - part.purchasePrice), 0);
  if (service.serviceLines && service.serviceLines.length > 0) {
    const hasOilChange = service.serviceLines.some((l) => l.serviceType === "Oil Change");
    service.serviceType = hasOilChange ? "Oil Change" : service.serviceLines[0].serviceType;
  }

  if (!service.invoiceNumber) {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const cnt = db.services.filter((s) => s.date.startsWith(new Date().toISOString().slice(0, 10))).length;
    service.invoiceNumber = `SRV-${todayStr}-${String(cnt + 1).padStart(3, "0")}`;
  }
  service.id = "srv_" + Date.now();
  service.date = new Date().toISOString();

  if (service.serviceType === "Oil Change") {
    const rd = new Date(); rd.setDate(rd.getDate() + 30);
    service.nextReminderDate = rd.toISOString();
    service.reminderStatus = "Pending";
  }

  if (service.customerPhone && !db.customers.find((c) => c.phone === service.customerPhone)) {
    db.customers.push({ id: "cust_" + Date.now(), name: service.customerName, phone: service.customerPhone, address: "", bikeModel: service.bikeModel, creditBalance: 0 });
  }

  const paymentAccount = resolveAccount(db, service.bankAccountId, "cash");
  if (!paymentAccount) {
    res.status(400).json({ success: false, error: missingAccountError("this workshop service", "cash") });
    return;
  }
  service.bankAccountId = paymentAccount.id;

  service.parts.forEach((part) => {
    const product = db.products.find((p) => p.id === part.productId);
    if (product) product.stock -= part.qty;
  });
  db.services.push(service);

  const targetAccId = paymentAccount.id;
  const accountIdx = db.accounts.findIndex((a) => a.id === targetAccId);
  db.accounts[accountIdx].balance += service.price;
  const svcLabel = service.serviceLines && service.serviceLines.length > 1
    ? `${service.serviceLines.length} services`
    : service.serviceType;
  const partLabel = service.parts.length > 0 ? ` + ${service.parts.length} part${service.parts.length > 1 ? "s" : ""}` : "";
  db.ledger.unshift({ id: "led_" + Date.now(), bankAccountId: targetAccId, bankName: db.accounts[accountIdx].bankName, date: service.date, type: "Credit", amount: service.price, description: `Workshop: ${svcLabel}${partLabel} — ${service.invoiceNumber}`, balanceAfter: db.accounts[accountIdx].balance, referenceId: service.id });

  logActivity(userId, username, `Workshop service ${service.invoiceNumber}. Earned: Rs. ${service.price}`);
  writeDB(db);
  res.json({ success: true, db });
});

// PUT update service record
router.put("/services/:id", (req, res) => {
  const db = readDB();
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  const idx = db.services.findIndex((s) => s.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Service record not found" }); return; }

  const existing = db.services[idx];
  const updates: Partial<ServiceRecord> = req.body.updates;
  const oldPaymentAccount = resolveAccount(db, existing.bankAccountId, "cash");
  const newPaymentAccount = resolveAccount(db, updates.bankAccountId ?? existing.bankAccountId, "cash");
  if (!oldPaymentAccount || !newPaymentAccount) {
    res.status(400).json({ success: false, error: missingAccountError("this workshop service edit", "cash") });
    return;
  }

  // Return the old parts to stock before applying the edited bill.
  for (const oldPart of existing.parts || []) {
    const product = db.products.find((p) => p.id === oldPart.productId);
    if (product) product.stock += oldPart.qty;
  }

  // Resolve edited parts against the live inventory.
  const partsByProduct = new Map<string, any>();
  for (const rawPart of (updates.parts !== undefined ? updates.parts : existing.parts) || []) {
    const qty = Math.floor(Number(rawPart.qty) || 0);
    const product = db.products.find((p) => p.id === rawPart.productId);
    if (!product || qty < 1) {
      res.status(400).json({ error: `Invalid service part: ${rawPart.name || rawPart.productId}` });
      return;
    }
    const previous = partsByProduct.get(product.id);
    const totalQty = (previous?.qty || 0) + qty;
    if (product.stock < totalQty) {
      res.status(400).json({ error: `Insufficient stock for ${product.name}. Available after reversal: ${product.stock}, requested: ${totalQty}` });
      return;
    }
    partsByProduct.set(product.id, {
      productId: product.id,
      name: product.name,
      partNumber: product.partNumber || "",
      qty: totalQty,
      purchasePrice: Number(product.purchasePrice) || 0,
      sellingPrice: Number(product.sellingPrice) || 0,
    });
  }
  const newParts = Array.from(partsByProduct.values());
  newParts.forEach((part) => {
    const product = db.products.find((p) => p.id === part.productId);
    if (product) product.stock -= part.qty;
  });

  // Multi-service: if serviceLines provided, recompute price and primary type
  const newLines = updates.serviceLines ?? existing.serviceLines;
  let newPrice: number;
  let newType: ServiceRecord["serviceType"];
  if (newLines && newLines.length > 0) {
    newPrice = newLines.reduce((sum, l) => sum + (Number(l.price) || 0), 0);
    const hasOilChange = newLines.some((l) => l.serviceType === "Oil Change");
    newType = hasOilChange ? "Oil Change" : newLines[0].serviceType;
  } else {
    newPrice = updates.price !== undefined ? Number(updates.price) : existing.price;
    newType = (updates.serviceType ?? existing.serviceType) as ServiceRecord["serviceType"];
  }

  const partsPrice = newParts.reduce((sum, part) => sum + part.qty * part.sellingPrice, 0);
  const labourPrice = newPrice;
  newPrice = labourPrice + partsPrice;
  const newProfit = labourPrice + newParts.reduce((sum, part) => sum + part.qty * (part.sellingPrice - part.purchasePrice), 0);

  // Adjust the correct account for price and account changes.
  const oldPrice = existing.price;
  const oldAccId = oldPaymentAccount.id;
  const newAccId = newPaymentAccount.id;
  if (oldAccId === newAccId) {
    const priceDiff = newPrice - oldPrice;
    const accIdx = db.accounts.findIndex((a) => a.id === newAccId);
    if (priceDiff !== 0) {
      db.accounts[accIdx].balance += priceDiff;
      db.ledger.unshift({
        id: "led_" + Date.now(), bankAccountId: newAccId,
        bankName: db.accounts[accIdx].bankName, date: new Date().toISOString(),
        type: priceDiff > 0 ? "Credit" : "Debit",
        amount: Math.abs(priceDiff),
        description: `Workshop edit adjustment: ${existing.invoiceNumber} (${priceDiff > 0 ? '+' : ''}Rs. ${priceDiff})`,
        balanceAfter: db.accounts[accIdx].balance,
        referenceId: existing.id,
      });
    }
  } else {
    const oldAccIdx = db.accounts.findIndex((a) => a.id === oldAccId);
    const newAccIdx = db.accounts.findIndex((a) => a.id === newAccId);
    db.accounts[oldAccIdx].balance -= oldPrice;
    db.ledger.unshift({ id: "led_" + Date.now(), bankAccountId: oldAccId, bankName: db.accounts[oldAccIdx].bankName, date: new Date().toISOString(), type: "Debit", amount: oldPrice, description: `Workshop payment moved from ${existing.invoiceNumber}`, balanceAfter: db.accounts[oldAccIdx].balance, referenceId: existing.id });
    db.accounts[newAccIdx].balance += newPrice;
    db.ledger.unshift({ id: "led_" + Date.now(), bankAccountId: newAccId, bankName: db.accounts[newAccIdx].bankName, date: new Date().toISOString(), type: "Credit", amount: newPrice, description: `Workshop payment moved to ${existing.invoiceNumber}`, balanceAfter: db.accounts[newAccIdx].balance, referenceId: existing.id });
  }

  // Rebuild reminder fields based on whether Oil Change is in the service lines
  let nextReminderDate = existing.nextReminderDate;
  let reminderStatus = existing.reminderStatus;
  if (newType === "Oil Change" && existing.serviceType !== "Oil Change") {
    const rd = new Date(); rd.setDate(rd.getDate() + 30);
    nextReminderDate = rd.toISOString();
    reminderStatus = "Pending";
  } else if (newType !== "Oil Change") {
    nextReminderDate = undefined;
    reminderStatus = undefined;
  }

  db.services[idx] = {
    ...existing,
    customerName:     updates.customerName     ?? existing.customerName,
    customerPhone:    updates.customerPhone     ?? existing.customerPhone,
    bikeModel:        updates.bikeModel         ?? existing.bikeModel,
    serviceType:      newType,
    price:            newPrice,
    profit:           newProfit,
    parts:            newParts,
    bankAccountId:    newAccId,
    serviceLines:     newLines,
    notes:            updates.notes             ?? existing.notes,
    nextReminderDate,
    reminderStatus:   (updates.reminderStatus   ?? reminderStatus) as ServiceRecord["reminderStatus"],
  };

  logActivity(userId, username, `Workshop service ${existing.invoiceNumber} updated — Price: Rs. ${newPrice}`);
  writeDB(db);
  invalidateAnalyticsCache();
  res.json({ success: true, db });
});

// POST bulk update reminder status
router.post("/reminders/status", (req, res) => {
  const db = readDB();
  const { ids, status } = req.body;
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  let count = 0;
  db.services = db.services.map((srv) => { if (ids.includes(srv.id)) { srv.reminderStatus = status; count++; } return srv; });
  logActivity(userId, username, `Updated ${count} reminders to "${status}"`);
  writeDB(db);
  res.json({ success: true, db });
});

// POST record expense
router.post("/expenses", (req, res) => {
  const db = readDB();
  const expense: Expense = req.body.expense;
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  const paymentAccount = resolveAccount(db, expense.bankAccountId, "cash");
  if (!paymentAccount) {
    res.status(400).json({ success: false, error: missingAccountError("this expense", "cash") });
    return;
  }
  expense.id = "exp_" + Date.now();
  expense.date = new Date().toISOString();
  expense.bankAccountId = paymentAccount.id;
  db.expenses.unshift(expense);

  const expAccId = paymentAccount.id;
  const expAccIdx = db.accounts.findIndex((a) => a.id === expAccId);
  db.accounts[expAccIdx].balance -= expense.amount;
  db.ledger.unshift({ id: "led_" + Date.now(), bankAccountId: expAccId, bankName: db.accounts[expAccIdx].bankName, date: expense.date, type: "Debit", amount: expense.amount, description: `Expense: ${expense.category} - ${expense.description}`, balanceAfter: db.accounts[expAccIdx].balance, referenceId: expense.id });

  logActivity(userId, username, `Expense [${expense.category}]: Rs. ${expense.amount} debited from ${(db.accounts[expAccIdx] || {}).bankName || expAccId}`);
  writeDB(db);
  res.json({ success: true, db });
});

// PUT update expense
router.put("/expenses/:id", (req, res) => {
  const db = readDB();
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  const idx = db.expenses.findIndex((e) => e.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Expense not found" }); return; }

  const old = db.expenses[idx];
  const { category, amount, description, date } = req.body;
  const newAmount = Number(amount) || old.amount;
  const diff = newAmount - old.amount;
  const oldPaymentAccount = resolveAccount(db, old.bankAccountId, "cash");
  const newPaymentAccount = resolveAccount(db, req.body.bankAccountId ?? old.bankAccountId, "cash");
  if (!oldPaymentAccount || !newPaymentAccount) {
    res.status(400).json({ success: false, error: missingAccountError("this expense edit", "cash") });
    return;
  }

  db.expenses[idx] = { ...old, category: category || old.category, amount: newAmount, description: description || old.description, date: date || old.date, bankAccountId: newPaymentAccount.id };

  // Adjust ledger if amount changed
  if (oldPaymentAccount.id !== newPaymentAccount.id) {
    const oldAccIdx = db.accounts.findIndex((a) => a.id === oldPaymentAccount.id);
    const newAccIdx = db.accounts.findIndex((a) => a.id === newPaymentAccount.id);
    db.accounts[oldAccIdx].balance += old.amount;
    db.ledger.unshift({ id: "led_" + Date.now(), bankAccountId: oldPaymentAccount.id, bankName: db.accounts[oldAccIdx].bankName, date: new Date().toISOString(), type: "Credit", amount: old.amount, description: `Expense moved from ${db.expenses[idx].description}`, balanceAfter: db.accounts[oldAccIdx].balance, referenceId: old.id });
    db.accounts[newAccIdx].balance -= newAmount;
    db.ledger.unshift({ id: "led_" + Date.now(), bankAccountId: newPaymentAccount.id, bankName: db.accounts[newAccIdx].bankName, date: new Date().toISOString(), type: "Debit", amount: newAmount, description: `Expense moved to ${db.expenses[idx].description}`, balanceAfter: db.accounts[newAccIdx].balance, referenceId: old.id });
  } else if (diff !== 0) {
    const accIdx = db.accounts.findIndex((a) => a.id === newPaymentAccount.id);
    db.accounts[accIdx].balance -= diff;
    db.ledger.unshift({ id: "led_" + Date.now(), bankAccountId: newPaymentAccount.id, bankName: db.accounts[accIdx].bankName, date: new Date().toISOString(), type: diff > 0 ? "Debit" : "Credit", amount: Math.abs(diff), description: `Expense correction: ${db.expenses[idx].category} - ${db.expenses[idx].description}`, balanceAfter: db.accounts[accIdx].balance, referenceId: old.id });
  }

  logActivity(userId, username, `Expense updated [${db.expenses[idx].category}]: Rs. ${newAmount}`);
  writeDB(db);
  res.json({ success: true, db });
});

// DELETE expense
router.delete("/expenses/:id", (req, res) => {
  const db = readDB();
  const { userId, username } = req.body?.auth || { userId: "1", username: "admin" };
  const idx = db.expenses.findIndex((e) => e.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Expense not found" }); return; }

  const exp = db.expenses[idx];
  // Reverse the debit from the account
  const paymentAccount = resolveAccount(db, exp.bankAccountId, "cash");
  if (!paymentAccount) {
    res.status(400).json({ success: false, error: missingAccountError("this expense deletion", "cash") });
    return;
  }
  const accIdx = db.accounts.findIndex((a) => a.id === paymentAccount.id);
  db.accounts[accIdx].balance += exp.amount;
  db.ledger.unshift({ id: "led_" + Date.now(), bankAccountId: paymentAccount.id, bankName: db.accounts[accIdx].bankName, date: new Date().toISOString(), type: "Credit", amount: exp.amount, description: `Expense reversal: ${exp.category} - ${exp.description}`, balanceAfter: db.accounts[accIdx].balance, referenceId: exp.id });

  db.expenses.splice(idx, 1);
  logActivity(userId, username, `Expense deleted [${exp.category}]: Rs. ${exp.amount}`);
  writeDB(db);
  res.json({ success: true, db });
});

// POST bank account transaction
router.post("/bank-accounts/transaction", (req, res) => {
  const db = readDB();
  const { id, type, amount, description } = req.body;
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  const accIdx = db.accounts.findIndex((a) => a.id === id);
  if (accIdx === -1) { res.status(404).json({ error: "Account not found" }); return; }
  const acc = db.accounts[accIdx];
  if (type === "Credit") acc.balance += amount; else acc.balance -= amount;
  db.ledger.unshift({ id: "led_" + Date.now(), bankAccountId: id, bankName: acc.bankName, date: new Date().toISOString(), type, amount, description, balanceAfter: acc.balance });
  logActivity(userId, username, `Manual ${type} on ${acc.bankName}: Rs. ${amount}`);
  writeDB(db);
  res.json({ success: true, db });
});

// POST create bank account
router.post("/bank-accounts", (req, res) => {
  const db = readDB();
  const { bankName, accountNumber, initialBalance } = req.body;
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  if (!bankName?.trim() || !accountNumber?.trim()) {
    res.status(400).json({ error: "Bank name and account number are required" });
    return;
  }
  const id = "bank_" + Date.now();
  const startBalance = Math.max(0, parseFloat(initialBalance) || 0);
  db.accounts.push({ id, bankName: bankName.trim(), accountNumber: accountNumber.trim(), balance: startBalance });
  if (startBalance > 0) {
    db.ledger.unshift({
      id: "led_" + Date.now(),
      bankAccountId: id,
      bankName: bankName.trim(),
      date: new Date().toISOString(),
      type: "Credit",
      amount: startBalance,
      description: `Opening balance for ${bankName.trim()}`,
      balanceAfter: startBalance,
    });
  }
  logActivity(userId, username, `Bank account added: ${bankName.trim()} (${accountNumber.trim()})`);
  writeDB(db);
  res.json({ success: true, db });
});

// PUT update bank account details (balance and account ID remain unchanged)
router.put("/bank-accounts/:id", (req, res) => {
  const db = readDB();
  const { bankName, accountNumber } = req.body;
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  const idx = db.accounts.findIndex((a) => a.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Account not found" }); return; }
  if (!bankName?.trim() || !accountNumber?.trim()) {
    res.status(400).json({ error: "Bank name and account number are required" });
    return;
  }

  const account = db.accounts[idx];
  const previousName = account.bankName;
  account.bankName = bankName.trim();
  account.accountNumber = accountNumber.trim();
  db.ledger.forEach(entry => {
    if (entry.bankAccountId === account.id) entry.bankName = account.bankName;
  });

  logActivity(userId, username, `Bank account updated: ${previousName} → ${account.bankName} (${account.accountNumber})`);
  writeDB(db);
  res.json({ success: true, db });
});

// DELETE bank account
router.delete("/bank-accounts/:id", (req, res) => {
  const db = readDB();
  const { userId, username } = (req as any).body?.auth || { userId: "1", username: "admin" };
  const idx = db.accounts.findIndex((a) => a.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Account not found" }); return; }
  if (db.accounts[idx].balance !== 0) {
    res.status(400).json({ error: "Cannot delete an account with a non-zero balance. Transfer or clear the balance first." });
    return;
  }
  const name = db.accounts[idx].bankName;
  db.accounts.splice(idx, 1);
  logActivity(userId, username, `Bank account deleted: ${name}`);
  writeDB(db);
  res.json({ success: true, db });
});

// POST create customer
router.post("/customers", (req, res) => {
  const db = readDB();
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  const customer: Customer = req.body.customer;
  customer.id = "cust_" + Date.now();
  customer.creditBalance = customer.creditBalance || 0;
  db.customers.push(customer);
  logActivity(userId, username, `Customer added: ${customer.name}`);
  writeDB(db);
  res.json({ success: true, db });
});

// PUT update customer
router.put("/customers/:id", (req, res) => {
  const db = readDB();
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  const idx = db.customers.findIndex((c) => c.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Customer not found" }); return; }
  db.customers[idx] = { ...db.customers[idx], ...req.body.customer };
  logActivity(userId, username, `Customer updated: ${db.customers[idx].name}`);
  writeDB(db);
  res.json({ success: true, db });
});

// DELETE customer
router.delete("/customers/:id", (req, res) => {
  const db = readDB();
  const { userId, username } = req.body?.auth || { userId: "1", username: "admin" };
  const idx = db.customers.findIndex((c) => c.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Customer not found" }); return; }
  const name = db.customers[idx].name;
  db.customers.splice(idx, 1);
  logActivity(userId, username, `Customer deleted: ${name}`);
  writeDB(db);
  res.json({ success: true, db });
});

// POST record credit payment against a customer (reduces their creditBalance)
router.post("/customers/:id/payment", (req, res) => {
  const db = readDB();
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  const idx = db.customers.findIndex((c) => c.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Customer not found" }); return; }
  const amount = Math.max(0, Number(req.body.amount) || 0);
  const note   = req.body.note || "Manual credit payment";
  if (amount <= 0) { res.status(400).json({ error: "Amount must be greater than 0" }); return; }
  const paymentAccount = resolveAccount(db, req.body.bankAccountId, "cash");
  if (!paymentAccount) {
    res.status(400).json({ success: false, error: missingAccountError("this customer payment", "cash") });
    return;
  }
  const prev = db.customers[idx].creditBalance ?? 0;
  db.customers[idx].creditBalance = Math.max(0, prev - amount);

  // Credit the bank/cash account with the received amount
  const bankAccountId = paymentAccount.id;
  const accIdx = db.accounts.findIndex((a) => a.id === bankAccountId);
  db.accounts[accIdx].balance += amount;
  const entry: BankLedgerEntry = {
    id: "led_" + Date.now(),
    bankAccountId,
    bankName: db.accounts[accIdx].bankName,
    date: new Date().toISOString(),
    type: "Credit",
    amount,
    description: `Credit payment from ${db.customers[idx].name} — ${note}`,
    balanceAfter: db.accounts[accIdx].balance,
    referenceId: db.customers[idx].id,
  };
  db.ledger.unshift(entry);

  logActivity(userId, username, `Credit payment Rs.${amount} from customer ${db.customers[idx].name}. Prev balance: Rs.${prev} → Rs.${db.customers[idx].creditBalance}`);
  writeDB(db);
  res.json({ success: true, db });
});

// POST create backup
router.post("/backup/create", (req, res) => {
  const db = readDB();
  const { userId, username, type } = req.body || { userId: "1", username: "admin", type: "Manual" };
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `honda_backup_${timestamp}.json`;
  const backupPath = path.join(BACKUPS_DIR, filename);
  try {
    fs.writeFileSync(backupPath, JSON.stringify(db, null, 2));
    const size = fs.statSync(backupPath).size;
    const record: BackupHistory = { id: "bk_" + Date.now(), timestamp: new Date().toISOString(), filename, size, type: type || "Manual" };
    db.backups.unshift(record);
    logActivity(userId, username, `Backup created: ${filename} (${Math.round(size / 1024)} KB)`);
    writeDB(db);
    res.json({ success: true, db, backupRecord: record });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET a fresh, complete database snapshot for portable export
router.get("/backup/export", (_req, res) => {
  try {
    const db = readDB();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="rais_honda_parts_db_${timestamp}.json"`);
    res.send(JSON.stringify(db, null, 2));
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Unable to export the database." });
  }
});

// POST restore from backup
router.post("/backup/restore", (req, res) => {
  const { backupData, auth } = req.body;
  const { userId, username } = auth || { userId: "1", username: "admin" };
  const validation = validateBackupDatabase(backupData);
  if (validation.errors.length > 0 || !validation.data) {
    res.status(400).json({
      success: false,
      error: "Backup validation failed.",
      details: validation.errors,
    });
    return;
  }

  try {
    const restored = prepareRestoredDatabase(validation.data);
    const restoreLog: ActivityLog = {
      id: "log_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      userId,
      username,
      action: `Database restored with ${restored.products.length} products, ${restored.invoices.length} invoices, ${restored.services.length} services`,
      timestamp: new Date().toISOString(),
    };
    restored.activityLogs.unshift(restoreLog);
    if (restored.activityLogs.length > 500) restored.activityLogs = restored.activityLogs.slice(0, 500);

    // Replace the database atomically so a failed write cannot leave a
    // partially-written JSON file behind.
    const restoreTempPath = `${DB_FILE}.restore-${process.pid}-${Date.now()}.tmp`;
    const serialized = JSON.stringify(restored, null, 2);
    fs.writeFileSync(restoreTempPath, serialized, "utf8");
    fs.renameSync(restoreTempPath, DB_FILE);
    res.json({ success: true, db: restored });
  } catch (err: any) {
    try {
      const tempFiles = fs.readdirSync(DATA_DIR).filter((name) => name.startsWith("db.json.restore-"));
      for (const file of tempFiles) fs.unlinkSync(path.join(DATA_DIR, file));
    } catch (_) { /* preserve the original restore error */ }
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Stock Adjustments (Damage & Returns) ────────────────────────────────────

function computeStockDelta(type: StockAdjustmentType, qty: number, direction?: 'Add' | 'Remove'): number {
  switch (type) {
    case 'Damage': return -qty;
    case 'Customer Return': return +qty;
    case 'Supplier Return': return -qty;
    case 'Manual Adjustment': return direction === 'Add' ? +qty : -qty;
    default: return 0;
  }
}

// GET list all stock adjustments
router.get("/stock-adjustments", (req, res) => {
  const db = readDB();
  res.json({ success: true, stockAdjustments: db.stockAdjustments || [] });
});

// POST create stock adjustment (updates product stock in place)
router.post("/stock-adjustments", (req, res) => {
  const db = readDB();
  const { productId, type, qty, direction, reason, notes, referenceNo, auth } = req.body;
  const { userId, username } = auth || { userId: "1", username: "admin" };

  if (!productId || !type || !qty || !reason) {
    res.status(400).json({ success: false, error: "productId, type, qty and reason are required." });
    return;
  }

  const prodIdx = db.products.findIndex((p) => p.id === productId);
  if (prodIdx === -1) { res.status(404).json({ success: false, error: "Product not found." }); return; }

  const product = db.products[prodIdx];
  const delta = computeStockDelta(type as StockAdjustmentType, Number(qty), direction);
  const stockBefore = product.stock;
  const stockAfter = Math.max(0, stockBefore + delta);

  db.products[prodIdx].stock = stockAfter;

  const record: StockAdjustmentRecord = {
    id: "adj_" + Date.now(),
    date: new Date().toISOString(),
    productId,
    productName: product.name,
    partNumber: product.partNumber,
    type: type as StockAdjustmentType,
    qty: Number(qty),
    direction,
    reason,
    notes,
    referenceNo,
    stockBefore,
    stockAfter,
    createdBy: username,
    createdById: userId,
    resolution: "Pending",
  };

  if (!db.stockAdjustments) db.stockAdjustments = [];
  db.stockAdjustments.unshift(record);

  logActivity(userId, username, `Stock adjustment [${type}] for "${product.name}": qty ${qty}, stock ${stockBefore}→${stockAfter}`);
  writeDB(db);
  res.json({ success: true, db, record });
});

// PUT update resolution status of a stock adjustment
router.put("/stock-adjustments/:id", (req, res) => {
  const db = readDB();
  const { resolution, notes, auth } = req.body;
  const { userId, username } = auth || { userId: "1", username: "admin" };

  if (!db.stockAdjustments) db.stockAdjustments = [];
  const idx = db.stockAdjustments.findIndex((a) => a.id === req.params.id);
  if (idx === -1) { res.status(404).json({ success: false, error: "Adjustment not found." }); return; }

  if (resolution) db.stockAdjustments[idx].resolution = resolution as AdjustmentResolution;
  if (notes !== undefined) db.stockAdjustments[idx].notes = notes;
  if (resolution && resolution !== 'Pending') db.stockAdjustments[idx].resolvedAt = new Date().toISOString();

  logActivity(userId, username, `Stock adjustment ${req.params.id} marked as "${resolution}"`);
  writeDB(db);
  res.json({ success: true, db, record: db.stockAdjustments[idx] });
});

// DELETE a stock adjustment — reverses the stock change
router.delete("/stock-adjustments/:id", (req, res) => {
  const db = readDB();
  const { userId, username } = req.body?.auth || { userId: "1", username: "admin" };

  if (!db.stockAdjustments) db.stockAdjustments = [];
  const idx = db.stockAdjustments.findIndex((a) => a.id === req.params.id);
  if (idx === -1) { res.status(404).json({ success: false, error: "Adjustment not found." }); return; }

  const record = db.stockAdjustments[idx];
  const prodIdx = db.products.findIndex((p) => p.id === record.productId);

  // Reverse the stock delta
  if (prodIdx !== -1) {
    const reverseDelta = record.stockAfter - record.stockBefore; // positive or negative
    db.products[prodIdx].stock = Math.max(0, db.products[prodIdx].stock - reverseDelta);
  }

  db.stockAdjustments.splice(idx, 1);
  logActivity(userId, username, `Deleted stock adjustment for "${record.productName}" — stock reversed`);
  writeDB(db);
  res.json({ success: true, db });
});

// POST save/update user
router.post("/users", (req, res) => {
  const db = readDB();
  const user: User = req.body.user;
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  if (!user.id) {
    user.id = "user_" + Date.now();
    if (!user.status) user.status = "Active";
    db.users.push(user);
    logActivity(userId, username, `Added user: ${user.name} (${user.role})`);
  } else {
    const idx = db.users.findIndex((u) => u.id === user.id);
    if (idx !== -1) { db.users[idx] = { ...db.users[idx], ...user }; logActivity(userId, username, `Updated user: ${user.name}`); }
    else db.users.push(user);
  }
  writeDB(db);
  res.json({ success: true, db });
});

// DELETE user
router.delete("/users/:id", (req, res) => {
  const db = readDB();
  const { userId, username } = req.body || { userId: "1", username: "admin" };
  const user = db.users.find((u) => u.id === req.params.id);
  if (user) {
    db.users = db.users.filter((u) => u.id !== req.params.id);
    logActivity(userId, username, `Deleted user: ${user.name}`);
    writeDB(db);
  }
  res.json({ success: true, db });
});

export default router;
