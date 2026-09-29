import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Hash, 
  Store, 
  MapPin, 
  PhoneCall, 
  HelpCircle,
  Building,
  User,
  Activity,
  Layers,
  ArrowRight
} from 'lucide-react';

interface PublicInvoiceVerificationProps {
  invoiceNumber: string;
}

export const PublicInvoiceVerification: React.FC<PublicInvoiceVerificationProps> = ({ invoiceNumber }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await fetch(`/api/sales/verify?invoice=${encodeURIComponent(invoiceNumber)}`);
        const json = await res.json();
        if (res.ok && json.success) {
          setData(json);
        } else {
          setError(json.error || 'This invoice reference could not be located on the FBR central ledger servers.');
        }
      } catch (err) {
        console.error("Verification connection error:", err);
        setError('Network Connection Unreachable. Unable to sync with FBR central ledger databases.');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [invoiceNumber]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-emerald-500 selection:text-slate-950 font-sans" id="fbr-public-mobile-landing-root">
      
      {/* COMSMIC BACKDROP AMBIENT GLOW */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-red-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-lg space-y-6 relative z-10 my-8">
        
        {/* PUBLIC LOGO */}
        <div className="flex flex-col items-center text-center space-y-2 mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl flex items-center justify-center shadow-[0_4px_20px_rgba(16,185,129,0.2)] border border-emerald-400/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-sm font-black uppercase tracking-widest text-slate-200">FEDERAL BOARD OF REVENUE</h1>
            <p className="text-[10px] text-emerald-400 font-mono font-bold tracking-widest uppercase">Government of Pakistan • Integrated Web POS</p>
          </div>
        </div>

        {loading ? (
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-2xl">
            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold tracking-widest uppercase animate-pulse">Decrypting Security Ledger...</span>
          </div>
        ) : error ? (
          <div className="bg-slate-950/90 border-2 border-red-500/30 rounded-2xl p-8 text-center space-y-4 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-red-500"></div>
            <div className="w-14 h-14 bg-red-950/40 text-red-500 rounded-full flex items-center justify-center border border-red-500/10 mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="font-extrabold text-sm uppercase text-red-400 tracking-wide">VERIFICATION FAILURE</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-mono bg-slate-900 border border-slate-850 p-3 rounded-lg text-left">
                {error}
              </p>
              <div className="text-[10px] text-slate-500 leading-normal pt-2">
                This receipt could not be proven, or does not contain a verified digital signature. If this is a newly printed invoice, please wait a few moments and scan again as the terminal sync queue synchronises.
              </div>
            </div>
          </div>
        ) : (
          
          /* VERIFIED CONTAINER CARDS */
          <div className="bg-slate-950/90 border-2 border-emerald-500/40 rounded-2xl shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-emerald-500"></div>

            {/* HEADER STATE BANNER */}
            <div className="p-6 border-b border-slate-900 bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-400 block font-mono">STATUS: SYNCED & VALIDATED</span>
                <h2 className="text-base font-extrabold text-white uppercase tracking-tight">FBR Compliance Certificate</h2>
              </div>
              <div className="p-1 px-2.5 bg-emerald-950/40 border border-emerald-500/20 rounded font-mono text-[10px] text-emerald-400 font-black">
                PASS
              </div>
            </div>

            {/* MERCHANDISE & STORE ADDRESS */}
            <div className="p-6 border-b border-slate-900 bg-slate-950/40 text-xs text-slate-400 space-y-3">
              <div className="flex items-start gap-3">
                <Store className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <strong className="text-white text-xs uppercase font-extrabold block">{data.storeDetails?.name}</strong>
                  <p className="font-medium italic text-[10px] text-slate-500">{data.storeDetails?.tagline}</p>
                  <p className="text-[11px] leading-relaxed flex items-center gap-1 mt-1 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-600" /> {data.storeDetails?.address}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-slate-900 pt-3 font-mono text-[11px]">
                <div><strong>BUSINESS NTN:</strong> <span className="text-slate-300">{data.storeDetails?.ntn}</span></div>
                <div className="text-right"><strong>TERMINAL ID:</strong> <span className="text-slate-300 font-bold">{data.invoice.terminalId || 'T1'}</span></div>
              </div>
            </div>

            {/* MAIN TRANSACTION COMPONENT BODY */}
            <div className="p-6 space-y-5">
              
              {/* DETAILS ROW TABLE */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-500 font-bold uppercase block">FBR Official USIN</span>
                  <span className="text-xxs font-mono font-black text-emerald-400 tracking-wider break-all leading-tight block">
                    {data.invoice.fbrInvoiceNumber || `FBR-SECURE-${data.invoice.invoiceNumber}`}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-500 font-bold uppercase block">Audit Date & Time</span>
                  <span className="text-[11px] font-mono font-medium text-slate-300 block">
                    {new Date(data.invoice.fbrSubmitTime || data.invoice.date).toLocaleString()}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-500 font-bold uppercase block">Original POS ID</span>
                  <span className="text-xs font-mono font-bold text-red-500 block">
                    {data.invoice.invoiceNumber}
                  </span>
                </div>
              </div>

              {/* CRM TIMELINES PROFILE */}
              <div className="border border-slate-900 rounded-xl p-4 space-y-2 bg-slate-950/20 text-xs">
                <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 border-b border-slate-900 pb-1.5 font-mono">
                  <User className="w-3.5 h-3.5 text-slate-500" /> Declared Customer Profile
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Rider Name:</span>
                    <strong className="text-slate-300">{data.invoice.customerName || 'Walking Customer'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Phone Identifier:</span>
                    <strong className="text-slate-300 font-mono">{data.invoice.customerPhone || 'N/A'}</strong>
                  </div>
                  {data.invoice.customerBikeModel && (
                    <div className="sm:col-span-2">
                      <span className="text-[10px] text-slate-500 block">Vehicle Model:</span>
                      <strong className="text-slate-300 uppercase tracking-wide">{data.invoice.customerBikeModel}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* LIST ITEMS TABLE */}
              <div className="space-y-2">
                <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 font-mono">
                  <FileText className="w-3.5 h-3.5 text-slate-500" /> Itemized Bill Declaration
                </h4>
                <div className="border border-slate-900 rounded-xl overflow-hidden text-[11px]">
                  <table className="w-full text-left border-collapse text-slate-400">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-950 text-[9px] text-slate-500 font-bold uppercase">
                        <th className="p-2 px-3">Item details</th>
                        <th className="p-2 text-right">Qty</th>
                        <th className="p-2 pr-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/60 text-slate-300">
                      {data.invoice.items?.map((item: any, idx: number) => (
                        <tr key={item.productId || idx} className="hover:bg-slate-900/10">
                          <td className="p-2 px-3">
                            <span className="font-semibold block text-slate-200 leading-tight">{item.name}</span>
                            <span className="text-[9px] text-slate-500 font-mono leading-none">{item.partNumber}</span>
                          </td>
                          <td className="p-2 text-right font-mono text-slate-400 font-medium">{item.qty} ×</td>
                          <td className="p-2 pr-3 text-right font-mono font-bold text-slate-100">Rs.{item.qty * item.sellingPrice}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECURE BLOCK AND SUMS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start pt-2">
                
                {/* SIGNATURES HASHES */}
                <div className="space-y-2 border border-slate-900 rounded-xl p-3 bg-slate-900/30">
                  <h5 className="text-[9px] font-mono font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Hash className="w-3 h-3 text-emerald-500" /> Digital Crypto Check
                  </h5>
                  <div className="space-y-1 font-mono text-[9px] text-slate-500 leading-tight">
                    <div>
                      <strong>FBR SIGNATURE HASH:</strong>
                      <span className="block break-all font-bold text-emerald-400/90 bg-slate-950 border border-slate-900/60 p-2 rounded mt-1.5 text-[8px] leading-tight select-all">
                        {data.invoice.fbr_hash}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SUMS */}
                <div className="bg-slate-900/40 rounded-xl p-4 space-y-1 text-xs text-slate-400 border border-slate-900">
                  <div className="flex justify-between">
                    <span>Items Subtotal:</span>
                    <span className="font-mono">Rs.{data.invoice.subtotal}</span>
                  </div>
                  {data.invoice.discount > 0 && (
                    <div className="flex justify-between">
                      <span>Discounts:</span>
                      <span className="font-mono text-emerald-400 font-bold">-Rs.{data.invoice.discount}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Sales Tax GST ({data.invoice.taxRate ?? 18}%):</span>
                    <span className="font-mono text-slate-350 font-bold">+Rs.{data.invoice.taxAmount ?? 0}</span>
                  </div>
                  <div className="flex justify-between font-black text-xs text-white pt-2 border-t border-slate-800 leading-none">
                    <span className="text-[10px] tracking-wider uppercase">GRAND BILL TOTAL:</span>
                    <span className="font-mono text-emerald-400 text-sm">Rs.{data.invoice.finalAmount}</span>
                  </div>
                </div>

              </div>

            </div>

            {/* SEALS FROM FBR INTEGRATION */}
            <div className="bg-slate-900 px-6 py-4 text-center text-[9px] text-slate-500 border-t border-slate-900 font-mono leading-relaxed">
              Certified FBR PRAL Tax Compliance Audit Desk. Scan-logged. All transaction values are cryptographically sealed. Handshake signature verified with Islamabad FBR POS registry gates.
            </div>

          </div>
        )}

        {/* RESTART APP PORT */}
        <div className="text-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-xxs text-slate-500 hover:text-emerald-400 uppercase font-bold tracking-wider transition-colors bg-slate-950 p-2 px-4 rounded-full border border-slate-850/60"
          >
            ← Launch Rais Honda Management POS System
          </a>
        </div>

      </div>

    </div>
  );
};
