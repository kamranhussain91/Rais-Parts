import React, { useCallback, useRef, useState } from 'react';
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
const THERMAL_PRINT_START_TIMEOUT_MS = 2_000;
const THERMAL_PRINT_DOCUMENT_MAX_WAIT_MS = 1_000;
const THERMAL_TEAR_OFF_MARGIN_MM = 2.5;
const THERMAL_PAGE_ROUNDING_SLACK_MM = 0.5;

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

const waitForPrintDocument = async (printDocument: Document) => {
  const documentReady = printDocument.readyState === 'complete'
    ? Promise.resolve()
    : new Promise<void>(resolve => {
        printDocument.defaultView?.addEventListener('load', () => resolve(), { once: true });
      });
  const fontsReady = printDocument.fonts?.ready.then(() => undefined, () => undefined) ?? Promise.resolve();
  const minimumLayoutDelay = new Promise<void>(resolve => window.setTimeout(resolve, 50));
  const maximumWait = new Promise<void>(resolve =>
    window.setTimeout(resolve, THERMAL_PRINT_DOCUMENT_MAX_WAIT_MS),
  );

  await Promise.race([
    Promise.all([documentReady, fontsReady, minimumLayoutDelay]),
    maximumWait,
  ]);
};

const prepareThermalPrintDocument = async (
  printDocument: Document,
  receiptElement: HTMLElement,
  paperWidth: ThermalPaperWidth,
) => {
  printDocument.open();
  printDocument.write(
    '<!doctype html><html><head><meta charset="utf-8"><title>Thermal Receipt</title></head><body></body></html>',
  );
  printDocument.close();

  const baseStyles = printDocument.createElement('style');
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
    .thermal-receipt-content { padding-bottom: 0 !important; }
    .thermal-receipt-content > :last-child {
      margin-bottom: 0 !important;
      padding-bottom: 0 !important;
    }
  `;
  printDocument.head.appendChild(baseStyles);

  const clonedReceipt = receiptElement.cloneNode(true) as HTMLElement;
  printDocument.body.appendChild(clonedReceipt);
  await waitForPrintDocument(printDocument);

  const pageStyles = printDocument.createElement('style');
  const refreshPageSize = () => {
    const renderedHeightPx = clonedReceipt.getBoundingClientRect().height;
    const receiptHeightPx = renderedHeightPx > 0 ? renderedHeightPx : clonedReceipt.scrollHeight;
    if (!Number.isFinite(receiptHeightPx) || receiptHeightPx <= 0) {
      throw new Error('The receipt has no measurable content in the print document.');
    }

    const receiptHeightMm = receiptHeightPx * 25.4 / 96;
    const pageHeightMm = Number((
      receiptHeightMm
      + THERMAL_TEAR_OFF_MARGIN_MM
      + THERMAL_PAGE_ROUNDING_SLACK_MM
    ).toFixed(3));
    pageStyles.textContent = `
      @page {
        size: ${paperWidth}mm ${pageHeightMm}mm;
        margin: 0;
      }
      @media print {
        html, body {
          width: ${paperWidth}mm !important;
          height: ${pageHeightMm}mm !important;
          min-height: 0 !important;
          max-height: ${pageHeightMm}mm !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }
        .thermal-receipt {
          margin: 0 !important;
          padding-bottom: 0 !important;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .thermal-receipt-content {
          padding-bottom: 0 !important;
        }
        .thermal-receipt-content > :last-child {
          margin-bottom: 0 !important;
          padding-bottom: 0 !important;
        }
      }
    `;
    return { receiptHeightPx, pageHeightMm };
  };

  printDocument.head.appendChild(pageStyles);
  return { refreshPageSize };
};

const openThermalFallbackWindow = () => {
  const fallbackWindow = window.open(
    '',
    '_blank',
    'popup=yes,width=480,height=720,resizable=yes,scrollbars=yes',
  );
  if (!fallbackWindow) return null;

  try {
    fallbackWindow.document.open();
    fallbackWindow.document.write(`<!doctype html>
      <html><head><meta charset="utf-8"><title>Preparing thermal receipt</title>
      <style>body{font:14px Arial,sans-serif;padding:24px;color:#111}</style></head>
      <body>Preparing receipt…</body></html>`);
    fallbackWindow.document.close();
  } catch (error) {
    console.warn('Could not show the thermal print fallback loading message.', error);
  }
  return fallbackWindow;
};

const requestPrintStart = (
  printWindow: Window,
  onStarted: () => void,
): Promise<{ started: boolean; error?: unknown }> => new Promise(resolve => {
  let settled = false;
  let timeoutId: number | undefined;
  const signalWindows = printWindow === window ? [printWindow] : [printWindow, window];
  const finish = (started: boolean, error?: unknown) => {
    if (settled) return;
    settled = true;
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    signalWindows.forEach(signalWindow => {
      signalWindow.removeEventListener('beforeprint', handlePrintSignal);
      signalWindow.removeEventListener('afterprint', handlePrintSignal);
    });
    if (started) {
      try {
        onStarted();
      } catch (error) {
        console.warn('Could not finish thermal print setup after the print signal.', error);
      }
    }
    resolve({ started, error });
  };
  const handlePrintSignal = () => finish(true);

  signalWindows.forEach(signalWindow => {
    signalWindow.addEventListener('beforeprint', handlePrintSignal);
    signalWindow.addEventListener('afterprint', handlePrintSignal);
  });
  timeoutId = window.setTimeout(
    () => finish(false),
    THERMAL_PRINT_START_TIMEOUT_MS,
  );

  try {
    printWindow.focus();
    printWindow.print();
  } catch (error) {
    finish(false, error);
  }
});

const watchAfterPrint = (printWindow: Window, cleanup: () => void) => {
  let cleanedUp = false;
  let timeoutId: number | undefined;
  const finish = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    printWindow.removeEventListener('afterprint', finish);
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    cleanup();
  };

  printWindow.addEventListener('afterprint', finish, { once: true });
  timeoutId = window.setTimeout(finish, 60_000);
  return finish;
};

let thermalPrintNoticeTimer: number | undefined;
const showThermalPrintNotice = (message: string) => {
  document.getElementById('thermal-print-notice')?.remove();
  if (thermalPrintNoticeTimer !== undefined) window.clearTimeout(thermalPrintNoticeTimer);

  const notice = document.createElement('div');
  notice.id = 'thermal-print-notice';
  notice.setAttribute('role', 'alert');
  notice.setAttribute('aria-live', 'assertive');
  notice.textContent = message;
  notice.style.cssText = [
    'position:fixed',
    'left:50%',
    'bottom:20px',
    'transform:translateX(-50%)',
    'z-index:2147483647',
    'max-width:calc(100vw - 32px)',
    'padding:12px 16px',
    'border-radius:10px',
    'background:#111827',
    'color:#fff',
    'font:600 14px/1.45 Arial,Helvetica,sans-serif',
    'box-shadow:0 8px 28px rgba(0,0,0,.28)',
    'text-align:center',
  ].join(';');
  document.body.appendChild(notice);
  thermalPrintNoticeTimer = window.setTimeout(() => notice.remove(), 12_000);
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error ?? 'Unknown browser error');

export const printThermalReceipt = async (
  receiptElement: HTMLElement | null,
  paperWidth: ThermalPaperWidth,
): Promise<void> => {
  let fallbackWindow: Window | null = null;
  let frame: HTMLIFrameElement | null = null;
  let framePrintStarted = false;
  let fallbackPrintStarted = false;
  let cleanupFrame = () => {};

  try {
    if (!receiptElement) {
      throw new Error('The receipt preview element was not found. Close and reopen the invoice, then try again.');
    }

    let frameFailure: unknown;
    let frameWindow: Window | null = null;
    try {
      frame = document.createElement('iframe');
      frame.title = 'Thermal receipt print document';
      frame.tabIndex = -1;
      frame.setAttribute('aria-hidden', 'true');
      frame.style.cssText = [
        'position:fixed',
        'left:0',
        'top:0',
        `width:${paperWidth}mm`,
        'height:1600px',
        'border:0',
        'opacity:0',
        'pointer-events:none',
        'z-index:-1',
      ].join(';');
      document.body.appendChild(frame);
      cleanupFrame = () => frame?.remove();

      const frameDocument = frame.contentDocument;
      frameWindow = frame.contentWindow;
      if (!frameDocument || !frameWindow) {
        throw new Error('The browser could not create the isolated print document.');
      }
      cleanupFrame = watchAfterPrint(frameWindow, () => frame?.remove());

      const frameReceipt = await prepareThermalPrintDocument(frameDocument, receiptElement, paperWidth);
      const { pageHeightMm } = frameReceipt.refreshPageSize();
      frame.style.height = `${Math.ceil(pageHeightMm * 96 / 25.4)}px`;
      await new Promise<void>(resolve => window.setTimeout(resolve, 35));
      frameReceipt.refreshPageSize();

      const frameResult = await requestPrintStart(frameWindow, () => {
        framePrintStarted = true;
      });
      if (frameResult.started) return;
      frameFailure = frameResult.error ?? new Error('The hidden-frame print dialog did not start within 2 seconds.');
    } catch (error) {
      frameFailure = error;
    }

    console.error('Thermal receipt iframe printing failed; opening the popup fallback.', frameFailure);
    cleanupFrame();

    try {
      fallbackWindow = openThermalFallbackWindow();
    } catch (error) {
      console.warn('The thermal print fallback window could not be opened after the iframe failed.', error);
    }

    if (!fallbackWindow || fallbackWindow.closed) {
      throw new Error(
        `The print dialog did not start (${errorMessage(frameFailure)}). This browser blocked the fallback pop-up. Allow pop-ups for this site in your browser settings and retry. If print dialogs are restricted by your device, enable printing or use an allowed browser.`,
      );
    }

    try {
      const fallbackDocument = fallbackWindow.document;
      const fallbackReceipt = await prepareThermalPrintDocument(
        fallbackDocument,
        receiptElement,
        paperWidth,
      );
      fallbackReceipt.refreshPageSize();
      const activeFallbackWindow = fallbackWindow;
      const cleanupPopup = watchAfterPrint(activeFallbackWindow, () => {
        if (!activeFallbackWindow.closed) activeFallbackWindow.close();
      });
      const fallbackResult = await requestPrintStart(activeFallbackWindow, () => {});
      if (fallbackResult.started) {
        fallbackPrintStarted = true;
        return;
      }
      cleanupPopup();
      throw fallbackResult.error ?? new Error('The fallback print dialog did not start within 2 seconds.');
    } catch (error) {
      throw new Error(
        `The print dialog did not start (${errorMessage(error)}). This browser may be blocking printing or pop-ups. Allow pop-ups for this site in your browser settings; if your device restricts printing, use a browser that permits print dialogs, then retry.`,
      );
    }
  } catch (error) {
    console.error('Thermal receipt printing failed.', error);
    showThermalPrintNotice(errorMessage(error));
  } finally {
    if (!framePrintStarted) cleanupFrame();
    if (!fallbackPrintStarted && fallbackWindow && !fallbackWindow.closed) {
      fallbackWindow.close();
    }
  }
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
  onPrint: () => void | Promise<void>;
  onClose: () => void;
  closeLabel?: string;
  format?: InvoicePrintFormat;
}> = ({ onPrint, onClose, closeLabel = 'Close', format }) => {
  const [isPreparing, setIsPreparing] = useState(false);
  const [printError, setPrintError] = useState('');
  const isPreparingRef = useRef(false);

  const handlePrint = async () => {
    if (isPreparingRef.current) return;
    isPreparingRef.current = true;
    setIsPreparing(true);
    setPrintError('');
    try {
      await onPrint();
    } catch (error) {
      console.error('Invoice printing failed.', error);
      setPrintError(error instanceof Error ? error.message : String(error));
    } finally {
      isPreparingRef.current = false;
      setIsPreparing(false);
    }
  };

  return (
    <div className="invoice-print-footer shrink-0 border-t border-neutral-200 bg-white rounded-b-2xl px-5 py-4 no-print">
      {printError && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {printError}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isPreparing}
          aria-busy={isPreparing}
          className={`flex-1 py-3 text-white rounded-xl text-sm font-bold shadow-md shadow-red-600/20 flex items-center justify-center gap-2 transition-all ${
            isPreparing
              ? 'bg-red-500 opacity-75 cursor-wait'
              : 'bg-red-600 hover:bg-red-700 active:scale-[0.98] cursor-pointer'
          }`}
          onClick={() => { void handlePrint(); }}
        >
          <Printer className="w-4 h-4" />
          {isPreparing ? 'Preparing...' : 'Print Invoice'}
        </button>
        <button
          type="button"
          className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
          {closeLabel}
        </button>
      </div>
      {format === 'Thermal' && (
        <p className="mt-1 -mx-5 text-center text-[clamp(7px,2vw,10px)] leading-3 text-neutral-400 whitespace-nowrap">
          In the print window: Margins None, Scale 100%, and choose your receipt/roll paper size.
        </p>
      )}
    </div>
  );
};