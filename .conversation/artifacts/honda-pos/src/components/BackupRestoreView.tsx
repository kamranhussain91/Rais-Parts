/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useApp } from './AppContext';
import { 
  Cloud, 
  CloudLightning, 
  RefreshCw, 
  Download, 
  Upload, 
  Calendar, 
  CheckCircle, 
  Check, 
  FileCode,
  ShieldAlert,
  Database,
  AlertTriangle
} from 'lucide-react';

const REQUIRED_BACKUP_COLLECTIONS = [
  'users', 'products', 'invoices', 'purchases', 'services', 'expenses',
  'accounts', 'ledger', 'customers', 'suppliers', 'activityLogs', 'backups',
] as const;

const OPTIONAL_BACKUP_COLLECTIONS = ['stockAdjustments', 'fbrSyncQueue', 'terminalSyncLogs'] as const;

const BACKUP_DATA_SECTIONS = [
  { key: 'users', label: 'Users' },
  { key: 'products', label: 'Products' },
  { key: 'invoices', label: 'Sales invoices' },
  { key: 'purchases', label: 'Purchases' },
  { key: 'services', label: 'Workshop services' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'accounts', label: 'Bank accounts' },
  { key: 'ledger', label: 'Account ledger' },
  { key: 'customers', label: 'Customers' },
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'activityLogs', label: 'Activity logs' },
  { key: 'backups', label: 'Backup registry' },
  { key: 'stockAdjustments', label: 'Damage & returns' },
  { key: 'fbrSyncQueue', label: 'FBR sync queue' },
  { key: 'terminalSyncLogs', label: 'Terminal sync logs' },
  { key: 'analyticsCache', label: 'Analytics cache' },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function inspectBackupFile(input: unknown): { data: unknown; errors: string[]; counts: string } {
  const data = isRecord(input) && isRecord(input.database) ? input.database : input;
  const errors: string[] = [];
  if (!isRecord(data)) return { data, errors: ['The file must contain a JSON object.'], counts: '' };

  for (const field of REQUIRED_BACKUP_COLLECTIONS) {
    if (!Array.isArray(data[field])) errors.push(`${field} is missing or is not an array`);
    else if (!data[field].every(isRecord)) errors.push(`${field} must contain JSON records`);
  }
  for (const field of OPTIONAL_BACKUP_COLLECTIONS) {
    if (data[field] !== undefined && (!Array.isArray(data[field]) || !data[field].every(isRecord))) {
      errors.push(`${field} must be an array of JSON records when provided`);
    }
  }
  if (data.analyticsCache !== undefined && data.analyticsCache !== null && !isRecord(data.analyticsCache)) {
    errors.push('analyticsCache must be an object when provided');
  }

  const counts = REQUIRED_BACKUP_COLLECTIONS
    .map(field => `${field}: ${(data[field] as unknown[] | undefined)?.length ?? 0}`)
    .join(' · ');
  return { data, errors, counts };
}

export const BackupRestoreView: React.FC = () => {
  const { db, triggerBackup, triggerRestore, refreshData, currentUser } = useApp();
  const isUserAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin' || currentUser?.role === 'Manager';

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!db) return <div className="p-8 text-slate-500">Loading replication desks...</div>;

  const { backups } = db;

  // Trigger server-side manual file replication
  const handleCreateServerBackup = async () => {
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    const success = await triggerBackup('Manual');
    setLoading(false);
    if (success) {
      setSuccessMsg('Successfully created backup mirror archive on local server disk');
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg('Error writing the JSON database replica to the server.');
    }
  };

  // Download a fresh server snapshot so no browser-stale collection is exported.
  const handleDownloadOfflineDBFile = async () => {
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/backup/export');
      if (!response.ok) throw new Error('The server could not create a complete export.');
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      const filenameMatch = disposition.match(/filename="([^"]+)"/i);
      const filename = filenameMatch?.[1] || `rais_honda_parts_db_${new Date().toISOString().substring(0, 10)}.json`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setSuccessMsg('Complete database export downloaded from the server.');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Database export failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handle uploaded JSON file selection to restore DB
  const handleUploadRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!isUserAdmin) {
      setErrorMsg('Secured restore: Administrator permissions are required to overwrite the database.');
      return;
    }

    const file = files[0];
    setSelectedFileName(file.name);
    setSuccessMsg(null);
    setErrorMsg(null);
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const textStr = event.target?.result as string;
        const parsedDBObj: unknown = JSON.parse(textStr);
        const inspection = inspectBackupFile(parsedDBObj);
        if (inspection.errors.length > 0) {
          setErrorMsg(`Import rejected: ${inspection.errors.join('; ')}.`);
          return;
        }

        const confirmed = window.confirm(
          `This will replace all current application data with the uploaded backup.\n\n${inspection.counts}\n\nContinue?`,
        );
        if (!confirmed) return;

        setLoading(true);
        const success = await triggerRestore(parsedDBObj);
        setLoading(false);

        if (success) {
          setErrorMsg(null);
          setSuccessMsg('Complete database restored successfully. All application data has been reloaded.');
          setTimeout(() => setSuccessMsg(null), 5000);
          await refreshData();
        } else {
          setErrorMsg('Import failed. The server rejected the backup and current data was not replaced.');
        }
      } catch (err) {
        setErrorMsg(err instanceof Error ? `Import failed: ${err.message}` : 'Import failed. Verify the JSON file is not corrupted.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="backup-restore-view-container">
      
      {/* MAIN TRIGGERS CONTAINER MODULE K */}
      <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        <div>
          <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Cloud className="w-4 h-4 text-red-600 animate-pulse" /> Replications & Offsite Backups
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-normal">Dual backup structures: offline portable downloads or persistent server mirrors</p>
        </div>

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200/70 flex items-center gap-2 text-[10px] font-sans">
            <Check className="w-4 h-4 shrink-0" />
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 text-rose-700 font-bold border border-rose-200/70 flex items-start gap-2 text-[10px] font-sans">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-xs font-black text-slate-800 flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-red-600" /> Complete application snapshot
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Export and import cover every persisted collection used by the POS, workshop, inventory, banking, FBR, reports, and user-management tabs.
              </p>
            </div>
            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1 whitespace-nowrap">
              {BACKUP_DATA_SECTIONS.length} data areas
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {BACKUP_DATA_SECTIONS.map(section => {
              const value = db[section.key];
              const count = Array.isArray(value) ? value.length : value ? 1 : 0;
              return (
                <div key={section.key} className="rounded-lg bg-white border border-slate-100 px-2.5 py-2">
                  <p className="text-[9px] text-slate-400 truncate" title={section.label}>{section.label}</p>
                  <p className="text-xs font-black text-slate-700 tabular-nums">{count.toLocaleString()}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
          
          {/* server replica */}
          <div className="p-4 rounded-xl border border-slate-250 bg-slate-50/50 flex flex-col justify-between hover:border-red-200 transition-all">
            <div className="space-y-1">
              <span className="font-extrabold text-slate-800 block text-xs">Create Server Mirror</span>
              <p className="text-slate-400 text-[10px] leading-normal mt-0.5">Saves a timestamped backup in the server directories for fast recovery</p>
            </div>
            <button 
              className="mt-4 w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xxs rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors uppercase tracking-wider"
              onClick={handleCreateServerBackup}
              disabled={loading}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Write Server Backup
            </button>
          </div>

          {/* offline file download */}
          <div className="p-4 rounded-xl border border-slate-250 bg-slate-50/50 flex flex-col justify-between hover:border-emerald-200 transition-all">
            <div className="space-y-1">
              <span className="font-extrabold text-slate-800 block text-xs">Download Database JSON</span>
              <p className="text-slate-400 text-[10px] leading-normal mt-0.5">Exports the full shop database as a local download file for complete safety</p>
            </div>
            <button 
              className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xxs rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors uppercase tracking-wider"
              onClick={handleDownloadOfflineDBFile}
            >
              <Download className="w-3 h-3" /> Export Portable JSON
            </button>
          </div>

          {/* overwrite loader */}
          <div className="p-5 rounded-2xl border border-dashed border-red-200 bg-red-50/15 sm:col-span-2 space-y-4">
            <div className="space-y-1.5">
                 <span className="font-black text-rose-800 flex items-center gap-2 text-xs">
                <ShieldAlert className="w-4 h-4 text-red-600" /> Administrative Database Recovery
              </span>
               <p className="text-xxs text-slate-500 leading-normal">
                 Upload a complete database export (`rais_honda_parts_db_*.json`) to replace the active environment.
                <strong className="text-rose-600 block mt-1">Warning: This operation overrides all current lists and ledger books!</strong>
              </p>
            </div>

            <div className="flex justify-center items-center">
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".json"
                className="hidden"
                onChange={handleUploadRestoreFile}
              />
              <button 
                className={`py-2 w-full px-5 bg-red-600 hover:bg-red-700 text-white font-black rounded-lg text-xxs shadow-md cursor-pointer flex items-center justify-center gap-1.5 ${!isUserAdmin ? 'opacity-30 cursor-not-allowed' : ''}`}
                onClick={() => isUserAdmin ? fileInputRef.current?.click() : alert('Administrator permissions required')}
                disabled={!isUserAdmin}
              >
                <Upload className="w-3.5 h-3.5" /> Upload Backup File & Restore DB
              </button>
            </div>
             {selectedFileName && (
               <p className="text-[10px] text-slate-500 text-center">
                 Selected file: <span className="font-bold text-slate-700">{selectedFileName}</span>
               </p>
             )}
          </div>

        </div>
      </div>

      {/* REPLICAS HISTORY LOG LISTS */}
      <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        <div>
          <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-slate-705 text-slate-800" /> Server Backup Registry
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-normal">Displays previous backup archives written on server storage files</p>
        </div>

        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 text-xs">
          {backups && backups.length > 0 ? (
            backups.map(bk => (
              <div key={bk.id} className="p-3.5 rounded-xl border border-slate-150 bg-slate-50/50 flex items-center justify-between gap-4">
                <div className="space-y-1.5 text-xxs">
                  <span className="font-extrabold text-slate-805 text-slate-800 text-xs block truncate max-w-[200px]" title={bk.filename}>
                    {bk.filename}
                  </span>
                  <p className="text-slate-400 flex items-center gap-1 font-mono">
                    <Calendar className="w-3 h-3 text-slate-350" /> {new Date(bk.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <span className="font-mono text-xxs font-black text-slate-500 bg-white border border-slate-200 rounded-lg px-2 py-0.5 shrink-0">
                    {Math.round(bk.size / 1024)} KB
                  </span>
                  <span className="inline-block px-2 py-0.5 rounded-lg text-[9px] bg-red-50 text-red-700 border border-red-100 font-black uppercase tracking-wider">
                    {bk.type}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
              No server-side backup archives registered yet. Hit "Write Server Backup" on the left to create your first replica mirror.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
