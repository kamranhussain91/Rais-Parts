import React from 'react';
import { Printer, X } from 'lucide-react';

export type InvoicePrintFormat = 'A4' | 'Thermal';

export interface ThermalInvoiceItem {
  id: string;
  name: string;
  qty: number;
  amount: number;
}

export const ThermalInvoice: React.FC<{
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  customerBikeModel?: string;
  items: ThermalInvoiceItem[];
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

  return (
    <div className="thermal-paper thermal-invoice mx-auto text-neutral-800 text-[11px] leading-relaxed" style={{ maxWidth: '300px' }}>
      <div className="text-center font-bold">
        <h2 className="text-[18px] uppercase tracking-wide">RAIS HONDA PARTS</h2>
        <p className="text-[10px] text-neutral-500 font-sans mt-0.5">Allama Iqbal Road, Dharampura, Lahore</p>
        <p className="text-[10px] text-neutral-500 font-sans">Phone: 042-36814912 | NTN: 7721590-3</p>
        <div className="border-b border-dashed border-neutral-300 my-2" />
      </div>
      <div className="space-y-1 text-[10px]">
        <div className="flex justify-between"><span>Receipt:</span><span className="font-bold">{invoiceNumber}</span></div>
        <div className="flex justify-between"><span>Date:</span><span>{new Date(date).toLocaleString()}</span></div>
        <div className="flex justify-between"><span>Customer:</span><span className="font-bold">{customerName}</span></div>
        {customerPhone && customerPhone !== 'N/A' && (
          <div className="flex justify-between"><span>Phone:</span><span>{customerPhone}</span></div>
        )}
        {customerBikeModel && (
          <div className="flex justify-between"><span>Bike:</span><span>{customerBikeModel}</span></div>
        )}
      </div>
      <div className="border-b border-dashed border-neutral-300 my-2" />
      <div className="font-bold grid grid-cols-12 gap-1 text-[10px] uppercase pb-1 border-b border-neutral-100">
        <span className="col-span-6">Item</span>
        <span className="col-span-2 text-center">Qty</span>
        <span className="col-span-4 text-right">Amt</span>
      </div>
      <div className="divide-y divide-neutral-100/30 text-[10px] py-1.5 space-y-1.5">
        {items.map(item => (
          <div key={item.id} className="grid grid-cols-12 gap-1">
            <div className="col-span-6">
              <span className="font-bold block leading-tight">{item.name}</span>
            </div>
            <span className="col-span-2 text-center font-mono">{item.qty}</span>
            <span className="col-span-4 text-right font-mono">Rs.{item.amount}</span>
          </div>
        ))}
      </div>
      {notes && (
        <p className="text-[9px] text-neutral-500 mt-1">Note: {notes}</p>
      )}
      <div className="border-b border-dashed border-neutral-300 my-2" />
      <div className="space-y-1 text-[10px]">
        <div className="flex justify-between"><span>Subtotal:</span><span>Rs.{subtotal}</span></div>
        {discount > 0 && (
          <div className="flex justify-between text-rose-600"><span>Discount:</span><span>-Rs.{discount}</span></div>
        )}
        <div className="flex justify-between"><span>GST ({taxRate}%):</span><span>+Rs.{taxAmount}</span></div>
        <div className="flex justify-between font-bold text-xs pt-1 border-t border-neutral-100">
          <span>TOTAL:</span><span>Rs.{finalAmount}</span>
        </div>
        {isCredit ? (
          <>
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>PAID NOW:</span><span>Rs.{amountPaid ?? finalAmount}</span>
            </div>
            <div className="flex justify-between text-amber-700 font-bold border border-dashed border-amber-400 px-1 py-0.5 rounded">
              <span>CREDIT DUE:</span><span>Rs.{amountDue}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between italic text-[9px] text-neutral-500 mt-1">
            <span>Method:</span><span>{paymentLabel}</span>
          </div>
        )}
      </div>
      <div className="border-b border-dashed border-neutral-300 my-3" />
      <div className="text-center text-[10px] space-y-1">
        <p className="font-bold">Thank You for visiting!</p>
        <p className="text-neutral-400 text-[9px] font-sans">Genuine Honda parts guarantee engine safety.</p>
        {reminder && <p className="text-[9px] text-red-600 font-bold">{reminder}</p>}
      </div>
    </div>
  );
};

export const InvoicePrintHeader: React.FC<{
  format: InvoicePrintFormat;
  onFormatChange: (format: InvoicePrintFormat) => void;
  invoiceNumber?: string;
  credit?: boolean;
  title?: string;
  showFormatToggle?: boolean;
  onClose: () => void;
}> = ({
  format,
  onFormatChange,
  invoiceNumber,
  credit = false,
  title,
  showFormatToggle = true,
  onClose,
}) => (
  <div className="invoice-print-header px-5 py-3 border-b border-neutral-100 bg-neutral-50 rounded-t-2xl flex items-center gap-2 shrink-0 no-print">
    <div className="flex items-center gap-2 min-w-0">
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