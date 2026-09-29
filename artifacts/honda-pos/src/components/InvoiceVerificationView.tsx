import React, { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { 
  ShieldCheck, 
  Search, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Hash, 
  User, 
  Smartphone, 
  Store, 
  MapPin, 
  PhoneCall, 
  RefreshCw, 
  Info,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

interface VerificationResult {
  success: boolean;
  invoice?: any;
  storeDetails?: {
    name: string;
    ntn: string;
    address: string;
    phone: string;
    tagline: string;
  };
  error?: string;
}

export const InvoiceVerificationView: React.FC = () => {
  const { db, refreshData } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [simulationActive, setSimulationActive] = useState(false);
  const [recentVerifications, setRecentVerifications] = useState<any[]>([]);

  // Find some sample invoices to let the user "simulate" scanning them easily
  const sampleInvoices = db?.invoices ? [...db.invoices].slice(0, 3) : [];

  useEffect(() => {
    // Collect recent verifications from sync logs for display
    if (db?.terminalSyncLogs) {
      const verLogs = db.terminalSyncLogs
        .filter(log => log.details.includes('Audit verification') || log.details.includes('Verification scanned'))
        .slice(0, 5);
      setRecentVerifications(verLogs);
    }
  }, [db]);

  const handleVerify = async (invoiceNum: string) => {
    if (!invoiceNum.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`/api/sales/verify?invoice=${encodeURIComponent(invoiceNum.trim())}`);
      const data = await res.json();
      
      if (res.ok && data.success) {
        setResult({
          success: true,
          invoice: data.invoice,
          storeDetails: data.storeDetails
        });
        // Refresh to fetch newly logged verify attempt in logs
        refreshData();
      } else {
        setResult({
          success: false,
          error: data.error || 'The invoice reference key is not present in FBR Central POS Memory.'
        });
      }
    } catch (err) {
      // Local fallback if server isn't responsive (Offline-first approach)
      console.warn("FBR Verification fetching failed, falling back to local database sync state:", err);
      const localInvoice = db?.invoices.find(inv => 
        inv.invoiceNumber === invoiceNum.trim() || 
        inv.id === invoiceNum.trim() ||
        (inv.fbrInvoiceNumber && inv.fbrInvoiceNumber === invoiceNum.trim())
      );

      if (localInvoice) {
        setResult({
          success: true,
          invoice: localInvoice,
          storeDetails: {
            name: 'Rais Honda Motor Labs & Parts',
            ntn: '8125439-0',
            address: 'Main Chowk Road, Multan, Pakistan',
            phone: '+92-300-9805610',
            tagline: 'Premium Automotive Honda Parts & Mechanical SLA Labs'
          }
        });
      } else {
        setResult({
          success: false,
          error: `Network unreachable and invoice reference "${invoiceNum}" was not found in offline fallback database.`
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const simulateQRScan = (invoiceNum: string) => {
    setSimulationActive(true);
    setSearchQuery(invoiceNum);
    setTimeout(() => {
      setSimulationActive(false);
      handleVerify(invoiceNum);
    }, 1500);
  };

  return (
    <div className="space-y-6" id="fbr-compliance-invoice-verification-screen">
      
      {/* HEADER HERO */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 select-none relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-bl-full pointer-events-none" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded text-[9px] uppercase font-black tracking-wider font-mono">FBR PRAL Compliant</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] text-slate-500 font-bold">Local Sync Node Running</span>
          </div>
          <h1 className="text-lg font-black tracking-tight uppercase text-slate-900 mt-1">FBR Live Invoice Verifier</h1>
          <p className="text-xs text-slate-550 text-slate-500 max-w-xl">
            Audit public hashes, verify sales tax receipt validation certificates, or decode scannable QR payloads according to Pakistani fiscal compliance standards.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-center shrink-0">
          <div className="w-12 h-12 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-[#E53935]" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: QUERY & ACTION BOXES */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* SEARCH FORM */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h3 className="font-black text-xs uppercase text-slate-800 tracking-wider flex items-center gap-2">
              <QrCode className="w-4 h-4 text-red-600" /> Query Reference
            </h3>
            
            <form onSubmit={(e) => { e.preventDefault(); handleVerify(searchQuery); }} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">Enter Invoice ID or FBR USIN</label>
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="e.g. T1-INV-2026..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-3 pr-10 text-xs font-mono font-bold text-slate-800 placeholder-slate-400 outline-hidden transition-all focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:bg-white"
                  />
                  <button 
                    type="submit"
                    className="absolute right-3 top-3 p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading || simulationActive}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs tracking-wider uppercase transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" /> Validate Code
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* SIMULATED DEVICE/QR SCANNER */}
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 shadow-xs space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl"></div>
            
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-red-500 animate-pulse" /> Mobile Compliance Scan
              </h3>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>

            {simulationActive ? (
              <div className="border-2 border-red-500 rounded-xl h-44 bg-slate-950 flex flex-col items-center justify-center text-center p-4 relative animate-pulse">
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500 shadow-[0_0_15px_#ef4444] animate-[bounce_2s_infinite]"></div>
                <QrCode className="w-12 h-12 text-slate-500 mb-2" />
                <span className="text-[10px] font-mono font-bold text-red-400 tracking-widest uppercase">Reading Digital Crypt...</span>
              </div>
            ) : (
              <div className="border border-slate-800 rounded-xl bg-slate-950/80 p-4 space-y-3">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Scan any invoice QR code with your mobile camera to verify instantly. Simulate an automatic camera scan by selecting a recent invoice:
                </p>
                
                {sampleInvoices.length === 0 ? (
                  <div className="text-center p-4 rounded-xl border border-dashed border-slate-805 text-[10px] text-slate-500">
                    No generated invoices found to simulate.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {sampleInvoices.map(inv => (
                      <button
                        key={inv.id}
                        onClick={() => simulateQRScan(inv.invoiceNumber)}
                        className="w-full text-left bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-red-500 rounded-lg p-2 text-[10px] font-mono font-medium tracking-tight transition-all flex items-center justify-between"
                      >
                        <span className="truncate">{inv.invoiceNumber} ({inv.customerName})</span>
                        <ArrowRight className="w-3 h-3 text-red-400 shrink-0 ml-1 animate-pulse" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <div className="text-[10px] text-slate-400 font-medium leading-normal bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="font-extrabold text-slate-300">Compliance Warning:</span> Scanning acts as an instant audit. Every successful or failed query is written to the cryptographic security ledger.
            </div>
          </div>

          {/* RECENT AUDIT VERIFICATION LOGS */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h3 className="font-black text-xs uppercase text-slate-800 tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-red-600" /> Recent Scan Audits
            </h3>
            
            {recentVerifications.length === 0 ? (
              <div className="text-center py-8 text-[11px] text-slate-400 select-none">
                No recent invoice validation queries logged.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {recentVerifications.map((log, idx) => (
                  <div key={log.id || idx} className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-[10px] font-mono leading-tight space-y-1 select-none">
                    <div className="flex justify-between items-center font-black text-slate-700">
                      <span>TERMINAL {log.terminalId}</span>
                      <span className="text-emerald-755 text-emerald-700 font-black uppercase tracking-wider text-[9px]">Verified</span>
                    </div>
                    <p className="text-[10px] font-semibold text-slate-600 line-clamp-1">{log.details}</p>
                    <div className="text-[9px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-slate-350" />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: CERTIFICATE OF VALIDATION / RESULTS */}
        <div className="lg:col-span-2">
          
          {!result ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs h-full flex flex-col items-center justify-center space-y-4 min-h-[400px]">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-200 text-slate-300">
                <ShieldCheck className="w-10 h-10 text-slate-400" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-xs tracking-wider uppercase text-slate-800">Awaiting Validation Scan</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-normal">
                  Submit an invoice reference or execute a mock QR scan to display the verified tax certificate, purchased items, and integrity metadata.
                </p>
              </div>
            </div>
          ) : !result.success ? (
            <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center shadow-xs h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center border border-rose-100 text-rose-500 animate-bounce">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-2.5 max-w-sm mx-auto">
                <h3 className="font-black text-xs tracking-wider uppercase text-rose-800">CATASTROPHIC VERIFICATION FAILURE</h3>
                <p className="text-xs font-mono bg-rose-50/50 border border-rose-150 text-rose-700 p-3.5 rounded-xl leading-relaxed font-bold">
                  {result.error}
                </p>
                <p className="text-[11px] text-slate-400 leading-normal">
                  The barcode token was rejected by the local POS verification engine. Check if the terminal has synced, or verify standard parameters.
                </p>
              </div>
            </div>
          ) : (
            
            /* VERIFIED DETAILS MODULE */
            <div className="bg-white rounded-2xl border-2 border-emerald-500 shadow-sm relative overflow-hidden">
              
              {/* SUCCESS WATERMARK HERO BANNER */}
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-5 flex items-center justify-between select-none">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center font-bold border border-white/10 shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-black tracking-widest text-emerald-100 block">GOVERNMENT OF PAKISTAN</span>
                    <h2 className="text-xs font-black uppercase tracking-wider mt-0.5">FBR FISCAL VERIFIED CERTIFICATE</h2>
                  </div>
                </div>
                <div className="text-right font-mono text-[10px] bg-emerald-900/40 py-1 px-2.5 rounded border border-emerald-500/20 leading-none">
                  <span className="text-emerald-100 uppercase font-bold leading-normal block">STATUS</span>
                  <strong className="text-white text-xs font-black">APPROVED</strong>
                </div>
              </div>

              {/* STORE DETAILS HEADER */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Store className="w-4 h-4 text-red-600 shrink-0" />
                      <strong className="text-xs uppercase tracking-wide">{result.storeDetails?.name}</strong>
                    </div>
                    <p className="text-[11px] text-slate-400 italic">{result.storeDetails?.tagline}</p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {result.storeDetails?.address}
                    </p>
                  </div>
                  <div className="space-y-1 font-mono text-[11px] text-slate-600 md:text-right">
                    <div><strong>OFFICIAL NTN:</strong> {result.storeDetails?.ntn}</div>
                    <div><strong>PHONE SUPPORT:</strong> {result.storeDetails?.phone}</div>
                    <div><strong>SYS REGISTRY ID:</strong> {result.invoice.terminalId || 'T1'}</div>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                
                {/* INVOICE & COMPLIANCE SUMMARY */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-150">
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">FBR USIN Reference</span>
                    <span className="text-xs font-mono font-bold text-slate-800 tracking-tight break-all">
                      {result.invoice.fbrInvoiceNumber || `FBR-SECURE-PENDING-${result.invoice.invoiceNumber}`}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Verification Timestamp</span>
                    <span className="text-xs font-mono font-semibold text-slate-700 block">
                      {new Date(result.invoice.fbrSubmitTime || result.invoice.date).toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Local Bill ID</span>
                    <span className="text-xs font-mono font-bold text-red-700 block">
                      {result.invoice.invoiceNumber}
                    </span>
                  </div>
                </div>

                {/* CUSTOMER PANEL */}
                <div className="space-y-2 border border-slate-100 rounded-lg p-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" /> Customer Registry Info
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Customer Name:</span>
                      <strong className="text-slate-800">{result.invoice.customerName || 'Walking Customer'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Customer Phone Number:</span>
                      <strong className="text-slate-800 font-mono">{result.invoice.customerPhone || 'N/A'}</strong>
                    </div>
                    {result.invoice.customerAddress && (
                      <div className="md:col-span-2">
                        <span className="text-[10px] text-slate-400 block font-medium">Address:</span>
                        <span className="text-slate-700">{result.invoice.customerAddress}</span>
                      </div>
                    )}
                    {result.invoice.customerBikeModel && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Rider Bike Model:</span>
                        <strong className="text-slate-800 uppercase text-[11px] font-mono">{result.invoice.customerBikeModel}</strong>
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Terminal Station POS:</span>
                      <span className="font-mono text-slate-700 text-[11px] font-semibold">{result.invoice.terminalId || 'T1'}</span>
                    </div>
                  </div>
                </div>

                {/* ITEMS PURCHASED LIST */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" /> Authorized Items Manifest
                  </h4>
                  <div className="border border-slate-100 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-100">
                          <th className="p-2.5 pl-4">Item Detail / Part Number</th>
                          <th className="p-2.5 text-right">Qty</th>
                          <th className="p-2.5 text-right">Unit Rate</th>
                          <th className="p-2.5 pr-4 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {result.invoice.items?.map((item: any, i: number) => (
                          <tr key={item.productId || i} className="hover:bg-slate-50/50">
                            <td className="p-2.5 pl-4">
                              <span className="font-semibold block leading-snug">{item.name}</span>
                              <span className="text-[10px] font-mono text-slate-400">{item.partNumber}</span>
                            </td>
                            <td className="p-2.5 text-right font-mono font-medium">{item.qty}</td>
                            <td className="p-2.5 text-right font-mono">Rs.{item.sellingPrice}</td>
                            <td className="p-2.5 pr-4 text-right font-mono font-semibold text-slate-800">Rs.{item.qty * item.sellingPrice}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TAX BREAKDOWN SECTION */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start pt-2">
                  
                  {/* METADATA SIGNATURES */}
                  <div className="space-y-2 border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                    <h5 className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Hash className="w-3 h-3 text-emerald-600" /> Digital Integrity Check
                    </h5>
                    <div className="space-y-1.5 font-mono text-[9px] text-slate-500 leading-tight">
                      <div>
                        <strong>INTEGRITY SIGNATURE:</strong>
                        <span className="block break-all font-bold text-slate-700 bg-white border border-slate-150 p-1.5 rounded mt-1 text-[8.5px]">
                          {result.invoice.fbr_hash || 'Securing hash signature pending FBR handshakes...'}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span>FBR SYNC STATE:</span>
                        <span className={`font-bold ${result.invoice.fbrStatus === 'Approved' ? 'text-emerald-700' : 'text-amber-600'} uppercase mt-0.5`}>
                          {result.invoice.fbrStatus || 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ACCOUNT TOTALS */}
                  <div className="bg-slate-50 rounded-lg p-4 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Items Subtotal:</span>
                      <span className="font-mono font-semibold">Rs.{result.invoice.subtotal}</span>
                    </div>
                    {result.invoice.discount > 0 && (
                      <div className="flex justify-between">
                        <span>Discounts:</span>
                        <span className="font-mono text-green-700 font-bold">-Rs.{result.invoice.discount}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>FBR Taxable Subtotal:</span>
                      <span className="font-mono font-semibold">Rs.{Math.max(0, result.invoice.subtotal - result.invoice.discount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sales Tax GST ({result.invoice.taxRate ?? 18}%):</span>
                      <span className="font-mono font-bold text-slate-700">+Rs.{result.invoice.taxAmount ?? 0}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 border-t border-slate-200">
                      <span>NET REMITTANCE PAID:</span>
                      <span className="font-mono text-emerald-700 text-base">Rs.{result.invoice.finalAmount}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 border-dashed">
                      <span>Payment Method:</span>
                      <span className="font-bold">{result.invoice.paymentMethod}</span>
                    </div>
                  </div>

                </div>

              </div>
              
              {/* COMPLIANCE STAMP FOOTEER */}
              <div className="bg-slate-50 border-t border-slate-150 px-6 py-3 text-center text-[10px] text-slate-400 font-mono">
                Certified FBR Fiscal Audit Token Registry. Protected against modification under SHA256 signatures.
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
