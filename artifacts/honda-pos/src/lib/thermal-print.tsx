import React from 'react';
import { Printer, X } from 'lucide-react';

export type InvoicePrintFormat = 'A4' | 'Thermal';

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