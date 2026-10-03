import React, { useCallback, useState } from 'react';
import { Printer, X } from 'lucide-react';

export type InvoicePrintFormat = 'A4' | 'Thermal';
export type ThermalPaperWidth = 80 | 58;

export interface ThermalInvoiceItem {
  id: string;
  name: string;
  qty: number;
  rate: number;
  amount: number;
  partNumber?: string;
}

export const THERMAL_SHOP_INFO = {
  name: 'RAIS HONDA PARTS',
  address: 'Allama Iqbal Road, Dharampura, Lahore',
  phone: '042-36814912',
  ntn: '7721590-3',
  footer: 'Genuine Honda parts guarantee engine safety.',
} as const;

const THERMAL_PAPER_WIDTH_STORAGE_KEY = 'rais-honda-thermal-paper-width';

const readSavedThermalPaperWidth = (): ThermalPaperWidth => {
  if (typeof window === 'undefined') return 80;
  try {
    return window.localStorage.getItem(THERMAL_PAPER_WIDTH_STORAGE_KEY) === '58' ? 58 : 80;
  } catch {
    return 80;
  }
};

export const useThermalPaperWidth = () => {
  const [paperWidth, setPaperWidthState] = useState<ThermalPaperWidth>(readSavedThermalPaperWidth);
  const setPaperWidth = useCallback((width: ThermalPaperWidth) => {
    setPaperWidthState(width);
    try {
      window.localStorage.setItem(THERMAL_PAPER_WIDTH_STORAGE_KEY, String(width));
    } catch {
      // Keep the selected width for this session when browser storage is unavailable.
    }
  }, []);
  return [paperWidth, setPaperWidth] as const;
};

export const THERMAL_RECEIPT_STYLES = `
  .thermal-receipt,
  .thermal-receipt * {
    box-sizing: border-box;
    color: #000 !important;
    background: #fff !important;
    box-shadow: none !important;
    text-shadow: none !important;
    font-family: Arial, Helvetica, sans-serif !important;
  }
  .thermal-receipt {
    display: block;
    width: var(--thermal-paper-width);
    min-width: var(--thermal-paper-width);
    max-width: var(--thermal-paper-width);
    margin: 0 auto;
    padding: 0;
    font-size: 10pt;
    font-weight: 400;
    line-height: 1.24;
    overflow: visible;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  .thermal-receipt-content {
    width: var(--thermal-printable-width);
    margin: 0 auto;
    padding: 2mm 2mm 0;
  }
  .thermal-receipt-header {
    text-align: center;
    font-size: 9pt;
    line-height: 1.24;
  }
  .thermal-receipt-shop-name {
    margin: 0 0 1mm;
    font-size: 14pt;
    line-height: 1.15;
    font-weight: 700;
    overflow-wrap: anywhere;
  }
  .thermal-receipt-header p {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .thermal-receipt-rule {
    height: 0;
    margin: 2mm 0;
    border: 0;
    border-top: 0.3mm dashed #000;
  }
  .thermal-receipt-meta {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    column-gap: 2mm;
    row-gap: 1mm;
    font-size: 10pt;
    line-height: 1.24;
  }
  .thermal-receipt-meta-label {
    font-weight: 700;
  }
  .thermal-receipt-meta-value {
    min-width: 0;
    text-align: right;
    overflow-wrap: anywhere;
  }
  .thermal-receipt-table-head,
  .thermal-receipt-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 8mm 14mm 18mm;
    column-gap: 1mm;
    align-items: start;
  }
  .thermal-receipt[data-paper-width="58"] .thermal-receipt-table-head,
  .thermal-receipt[data-paper-width="58"] .thermal-receipt-item {
    grid-template-columns: minmax(0, 1fr) 6mm 12mm 15mm;
    column-gap: 0.5mm;
  }
  .thermal-receipt-table-head {
    padding-bottom: 1mm;
    border-bottom: 0.3mm solid #000;
    font-size: 9pt;
    font-weight: 700;
  }
  .thermal-receipt-table-head > :not(:first-child),
  .thermal-receipt-number {
    text-align: right;
    white-space: nowrap;
    overflow-wrap: normal;
  }
  .thermal-receipt-table-head > :nth-child(2),
  .thermal-receipt-number-qty {
    text-align: center;
  }
  .thermal-receipt-items {
    margin: 0;
    padding: 1.5mm 0 0;
    list-style: none;
  }
  .thermal-receipt-item {
    padding: 1mm 0;
    border-bottom: 0.2mm dashed #000;
  }
  .thermal-receipt-item-name {
    min-width: 0;
    font-weight: 700;
    overflow-wrap: anywhere;
    word-break: normal;
  }
  .thermal-receipt-part-number {
    display: block;
    margin-top: 0.5mm;
    font-size: 9pt;
    font-weight: 400;
    line-height: 1.15;
    white-space: nowrap;
  }
  .thermal-receipt-totals {
    display: grid;
    row-gap: 1mm;
    padding-top: 1.5mm;
    font-size: 10pt;
  }
  .thermal-receipt-total-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 2mm;
  }
  .thermal-receipt-total-row > :first-child {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .thermal-receipt-total-row > :last-child {
    flex: 0 0 auto;
    text-align: right;
    white-space: nowrap;
  }
  .thermal-receipt-grand-total {
    margin-top: 1mm;
    padding-top: 1mm;
    border-top: 0.4mm solid #000;
    font-size: 12.5pt;
    font-weight: 700;
  }
  .thermal-receipt-payment,
  .thermal-receipt-credit {
    font-weight: 700;
  }
  .thermal-receipt-notes,
  .thermal-receipt-reminder {
    margin: 1.5mm 0 0;
    font-size: 9pt;
    overflow-wrap: anywhere;
  }
  .thermal-receipt-footer {
    margin: 2mm 0 0;
    text-align: center;
    font-size: 9pt;
    line-height: 1.2;
  }
  .thermal-receipt-footer strong {
    display: block;
    margin-bottom: 0.5mm;
    font-size: 10pt;
  }
`;

export const printThermalReceipt = async (
  receiptElement: HTMLElement | null,
  paperWidth: ThermalPaperWidth,
) => {
  if (!receiptElement) {
    throw new Error('Thermal receipt is not ready to print.');
  }

  const printableWidth = paperWidth === 80 ? 72 : 48;
  const frame = document.createElement('iframe');
  frame.title = 'Thermal receipt print document';
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    'width:1px',
    'height:1px',
    'border:0',
    'opacity:1',
    'pointer-events:none',
  ].join(';');
  document.body.appendChild(frame);

  const frameDocument = frame.contentDocument;
  const frameWindow = frame.contentWindow;
  if (!frameDocument || !frameWindow) {
    frame.remove();
    throw new Error('Could not create the isolated thermal print document.');
  }

  frameDocument.open();
  frameDocument.write(
    '<!doctype html><html><head><meta charset="utf-8"><title>Thermal Receipt</title></head><body></body></html>',
  );
  frameDocument.close();

  const baseStyles = frameDocument.createElement('style');
  baseStyles.textContent = `
    ${THERMAL_RECEIPT_STYLES}
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: ${paperWidth}mm !important;
      min-width: ${paperWidth}mm !important;
      background: #fff !important;
      color: #000 !important;
    }
    body { overflow: visible !important; }
  `;
  frameDocument.head.appendChild(baseStyles);

  const clonedReceipt = receiptElement.cloneNode(true) as HTMLElement;
  frameDocument.body.appendChild(clonedReceipt);

  await new Promise<void>(resolve => {
    frameWindow.requestAnimationFrame(() => frameWindow.requestAnimationFrame(() => resolve()));
  });

  const receiptHeightMm = clonedReceipt.getBoundingClientRect().height * 25.4 / 96;
  const pageHeightMm = Math.ceil((receiptHeightMm + 8) * 10) / 10;
  const pageStyles = frameDocument.createElement('style');
  pageStyles.textContent = `
    @page {
      size: ${paperWidth}mm ${pageHeightMm}mm;
      margin: 0;
    }
    @media print {
      html, body {
        width: ${paperWidth}mm !important;
        min-width: ${paperWidth}mm !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .thermal-receipt {
        margin: 0 auto !important;
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
  `;
  frameDocument.head.appendChild(pageStyles);

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    frame.remove();
  };
  frameWindow.addEventListener('afterprint', cleanup, { once: true });
  window.setTimeout(cleanup, 60_000);
  frameWindow.focus();
  frameWindow.print();
};

const canFitPartNumber = (partNumber: string | undefined, paperWidth: ThermalPaperWidth) => {
  if (!partNumber || typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return false;
  context.font = '9pt Arial';
  const availableWidthMm = paperWidth === 80 ? 25 : 9.5;
  const availableWidthPx = availableWidthMm * 96 / 25.4;
  return context.measureText(`P/N: ${partNumber}`).width <= availableWidthPx;
};

const formatReceiptAmount = (amount: number) =>
  Number(amount || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 });

export const ThermalInvoice: React.FC<{
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  customerBikeModel?: string;
  items: ThermalInvoiceItem[];
  paperWidth: ThermalPaperWidth;
  receiptRef?: React.Ref<HTMLElement>;
  subtotal: number;
  discount?: number;
  taxRate?: number;
  taxAmount?: number;
  finalAmount: number;
  paymentLabel: string;
  amountPaid?: number;
  amountDue?: number;
  notes?: string;
  reminder?: string;
}> = ({
  invoiceNumber,
  date,
  customerName,
  customerPhone,
  customerBikeModel,
  items,
  paperWidth,
  receiptRef,
  subtotal,
  discount = 0,
  taxRate = 18,
  taxAmount = 0,
  finalAmount,
  paymentLabel,
  amountPaid,
  amountDue,
  notes,
  reminder,
}) => {
  const isCredit = (amountDue ?? 0) > 0;
  const printableWidth = paperWidth === 80 ? 72 : 48;

  return (
    <>
      <style>{THERMAL_RECEIPT_STYLES}</style>
      <article
        ref={receiptRef}
        className="thermal-receipt"
        data-paper-width={paperWidth}
        style={{
          '--thermal-paper-width': `${paperWidth}mm`,
          '--thermal-printable-width': `${printableWidth}mm`,
        } as React.CSSProperties}
      >
        <div className="thermal-receipt-content">
          <header className="thermal-receipt-header">
            <h2 className="thermal-receipt-shop-name">{THERMAL_SHOP_INFO.name}</h2>
            <p>{THERMAL_SHOP_INFO.address}</p>
            <p>Phone: {THERMAL_SHOP_INFO.phone} | NTN: {THERMAL_SHOP_INFO.ntn}</p>
          </header>
          <hr className="thermal-receipt-rule" />
          <section className="thermal-receipt-meta" aria-label="Receipt details">
            <span className="thermal-receipt-meta-label">Receipt:</span>
            <span className="thermal-receipt-meta-value">{invoiceNumber}</span>
            <span className="thermal-receipt-meta-label">Date:</span>
            <span className="thermal-receipt-meta-value">{new Date(date).toLocaleString()}</span>
            <span className="thermal-receipt-meta-label">Customer:</span>
            <span className="thermal-receipt-meta-value">{customerName}</span>
            {customerPhone && customerPhone !== 'N/A' && (
              <>
                <span className="thermal-receipt-meta-label">Phone:</span>
                <span className="thermal-receipt-meta-value">{customerPhone}</span>
              </>
            )}
            {customerBikeModel && (
              <>
                <span className="thermal-receipt-meta-label">Bike:</span>
                <span className="thermal-receipt-meta-value">{customerBikeModel}</span>
              </>
            )}
          </section>
          <hr className="thermal-receipt-rule" />
          <div className="thermal-receipt-table-head" aria-hidden="true">
            <span>Item</span><span>Qty</span><span>Rate</span><span>Amount</span>
          </div>
          <ul className="thermal-receipt-items">
            {items.map(item => (
              <li key={item.id} className="thermal-receipt-item">
                <span className="thermal-receipt-item-name">
                  {item.name}
                  {canFitPartNumber(item.partNumber, paperWidth) && (
                    <span className="thermal-receipt-part-number">P/N: {item.partNumber}</span>
                  )}
                </span>
                <span className="thermal-receipt-number thermal-receipt-number-qty">{item.qty}</span>
                <span className="thermal-receipt-number">Rs.{formatReceiptAmount(item.rate)}</span>
                <span className="thermal-receipt-number">Rs.{formatReceiptAmount(item.amount)}</span>
              </li>
            ))}
          </ul>
          <hr className="thermal-receipt-rule" />
          <section className="thermal-receipt-totals" aria-label="Invoice totals">
            <div className="thermal-receipt-total-row">
              <span>Subtotal:</span><span>Rs.{formatReceiptAmount(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="thermal-receipt-total-row">
                <span>Discount:</span><span>-Rs.{formatReceiptAmount(discount)}</span>
              </div>
            )}
            <div className="thermal-receipt-total-row">
              <span>GST ({taxRate}%):</span><span>Rs.{formatReceiptAmount(taxAmount)}</span>
            </div>
            <div className="thermal-receipt-total-row thermal-receipt-grand-total">
              <span>GRAND TOTAL:</span><span>Rs.{formatReceiptAmount(finalAmount)}</span>
            </div>
            <div className="thermal-receipt-total-row thermal-receipt-payment">
              <span>Payment:</span><span>{paymentLabel}</span>
            </div>
            {isCredit && (
              <>
                <div className="thermal-receipt-total-row thermal-receipt-credit">
                  <span>AMOUNT PAID:</span><span>Rs.{formatReceiptAmount(amountPaid ?? finalAmount)}</span>
                </div>
                <div className="thermal-receipt-total-row thermal-receipt-credit">
                  <span>CREDIT DUE:</span><span>Rs.{formatReceiptAmount(amountDue ?? 0)}</span>
                </div>
              </>
            )}
          </section>
          {notes && <p className="thermal-receipt-notes">Note: {notes}</p>}
          {reminder && <p className="thermal-receipt-reminder">{reminder}</p>}
          <footer className="thermal-receipt-footer">
            <strong>Thank You for visiting!</strong>
            <span>{THERMAL_SHOP_INFO.footer}</span>
          </footer>
        </div>
      </article>
    </>
  );
};

export const InvoicePrintHeader: React.FC<{
  format: InvoicePrintFormat;
  onFormatChange: (format: InvoicePrintFormat) => void;
  paperWidth?: ThermalPaperWidth;
  onPaperWidthChange?: (width: ThermalPaperWidth) => void;
  invoiceNumber?: string;
  credit?: boolean;
  title?: string;
  showFormatToggle?: boolean;
  onClose: () => void;
}> = ({
  format,
  onFormatChange,
  paperWidth = 80,
  onPaperWidthChange,
  invoiceNumber,
  credit = false,
  title,
  showFormatToggle = true,
  onClose,
}) => (
  <div className="invoice-print-header px-5 py-3 border-b border-neutral-100 bg-neutral-50 rounded-t-2xl flex flex-wrap items-center gap-2 shrink-0 no-print">
    <div className="flex flex-wrap items-center gap-2 min-w-0">
      {title ? (
        <span className="text-xs font-bold text-neutral-700 truncate">{title}</span>
      ) : (
        <>
          <span className="text-xs font-semibold text-neutral-400 mr-1">Format:</span>
          {(showFormatToggle ? (['Thermal', 'A4'] as const) : (['Thermal'] as const)).map(option => (
            <button
              key={option}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-all ${
                format === option
                  ? 'bg-red-600 text-white border-red-600 shadow-sm'
                  : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-300'
              }`}
              onClick={() => onFormatChange(option)}
            >
              {option === 'Thermal' ? '🧾 Thermal' : '📄 A4 Invoice'}
            </button>
          ))}
          {format === 'Thermal' && onPaperWidthChange && (
            <label className="ml-1 flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
              <span>Paper</span>
              <select
                value={paperWidth}
                onChange={event => onPaperWidthChange(Number(event.target.value) as ThermalPaperWidth)}
                aria-label="Thermal paper width"
                className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs font-bold text-neutral-700 outline-none focus:border-red-500"
              >
                <option value={80}>80 mm</option>
                <option value={58}>58 mm</option>
              </select>
            </label>
          )}
        </>
      )}
    </div>
    <div className="ml-auto flex items-center gap-2 shrink-0">
      {invoiceNumber && (
        <span className="text-xs text-neutral-400 font-mono font-semibold">#{invoiceNumber}</span>
      )}
      {credit && (
        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase">
          Credit
        </span>
      )}
      <button
        onClick={onClose}
        aria-label="Close invoice"
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-400 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
);

export const InvoicePrintFooter: React.FC<{
  onPrint: () => void;
  onClose: () => void;
  closeLabel?: string;
}> = ({ onPrint, onClose, closeLabel = 'Close' }) => (
  <div className="invoice-print-footer shrink-0 border-t border-neutral-200 bg-white rounded-b-2xl px-5 py-4 flex items-center gap-3 no-print">
    <button
      className="flex-1 py-3 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white rounded-xl text-sm font-bold shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
      onClick={onPrint}
    >
      <Printer className="w-4 h-4" />
      Print Invoice
    </button>
    <button
      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
      onClick={onClose}
    >
      <X className="w-4 h-4" />
      {closeLabel}
    </button>
  </div>
);