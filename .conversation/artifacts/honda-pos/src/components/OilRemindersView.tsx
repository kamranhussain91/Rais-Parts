import React, { useState } from 'react';
import { useApp } from './AppContext';
import { ServiceRecord } from '../types';
import {
  Bell, MessageCircle, Check, Calendar,
  CheckCircle, Send, AlertTriangle, Clock, Inbox
} from 'lucide-react';

export const OilRemindersView: React.FC = () => {
  const { db, updateRemindersStatus } = useApp();
  const [filterTab, setFilterTab] = useState<'All' | 'Today' | 'Overdue' | 'Upcoming' | 'Sent'>('Today');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  if (!db) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <div className="w-5 h-5 rounded-full border-2 border-t-red-600 border-slate-200 animate-spin" />
      <span className="text-sm text-slate-400 font-medium">Loading schedules…</span>
    </div>
  );

  const { services } = db;
  const oilServices = services.filter(srv => srv.serviceType === 'Oil Change');
  const todayDateStr = '2026-06-01';

  const getSubcategory = (srv: ServiceRecord) => {
    if (srv.reminderStatus !== 'Pending') return 'Sent';
    if (!srv.nextReminderDate) return 'Upcoming';
    const reminderDate = new Date(srv.nextReminderDate.substring(0, 10));
    const todayDate = new Date(todayDateStr);
    if (reminderDate.getTime() === todayDate.getTime()) return 'Today';
    if (reminderDate.getTime() < todayDate.getTime()) return 'Overdue';
    return 'Upcoming';
  };

  const displayRecords = oilServices.filter(srv => {
    const bracket = getSubcategory(srv);
    if (filterTab === 'All') return true;
    if (filterTab === 'Today') return bracket === 'Today';
    if (filterTab === 'Overdue') return bracket === 'Overdue';
    if (filterTab === 'Upcoming') return bracket === 'Upcoming';
    if (filterTab === 'Sent') return srv.reminderStatus === 'Sent' || srv.reminderStatus === 'Confirmed';
    return true;
  });

  const handleToggleSelect = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSelectAll = (checked: boolean) =>
    setSelectedIds(checked ? displayRecords.map(r => r.id) : []);

  const handleOpenWhatsApp = (srv: ServiceRecord) => {
    const message = `Assalam-o-Alaikum, your Honda bike is due for engine oil change at Rais Parts. Please visit our shop for best performance and engine safety.`;
    let phone = srv.customerPhone.trim();
    if (phone.startsWith('0')) phone = '92' + phone.substring(1);
    else if (!phone.startsWith('92') && !phone.startsWith('+')) phone = '92' + phone;
    updateRemindersStatus([srv.id], 'Sent');
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleBulkStatusUpdate = async (status: 'Pending' | 'Sent' | 'Confirmed', target: 'Selected' | 'AllToday') => {
    let ids: string[] = [];
    if (target === 'Selected') {
      if (!selectedIds.length) { alert('Select at least one reminder first.'); return; }
      ids = selectedIds;
    } else {
      ids = oilServices.filter(s => getSubcategory(s) === 'Today').map(s => s.id);
      if (!ids.length) { alert('No reminders due today.'); return; }
    }
    const ok = await updateRemindersStatus(ids, status);
    if (ok) { setSelectedIds([]); alert(`Marked ${ids.length} reminder(s) as ${status}.`); }
    else alert('Error saving changes.');
  };

  const handleBulkSendSelected = () => {
    if (!selectedIds.length) { alert('Select reminder rows first.'); return; }
    const records = displayRecords.filter(r => selectedIds.includes(r.id));
    if (window.confirm(`Open ${records.length} WhatsApp chat(s)? Allow popups in your browser.`))
      records.forEach((srv, i) => setTimeout(() => handleOpenWhatsApp(srv), i * 800));
  };

  const dueTodayCount = oilServices.filter(s => getSubcategory(s) === 'Today').length;
  const overdueCount  = oilServices.filter(s => getSubcategory(s) === 'Overdue').length;
  const upcomingCount = oilServices.filter(s => getSubcategory(s) === 'Upcoming').length;
  const sentCount     = oilServices.filter(s => s.reminderStatus === 'Sent' || s.reminderStatus === 'Confirmed').length;

  const tabs: { key: typeof filterTab; label: string; count: number; color: string }[] = [
    { key: 'Today',    label: 'Due Today',   count: dueTodayCount, color: 'text-red-600' },
    { key: 'Overdue',  label: 'Overdue',     count: overdueCount,  color: 'text-rose-600' },
    { key: 'Upcoming', label: 'Upcoming',    count: upcomingCount, color: 'text-amber-600' },
    { key: 'Sent',     label: 'Sent Logs',   count: sentCount,     color: 'text-emerald-600' },
    { key: 'All',      label: 'All',         count: oilServices.length, color: 'text-slate-700' },
  ];

  return (
    <div className="space-y-5">

      {/* ── KPI STAT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Due Today',     value: `${dueTodayCount} riders`,    sub: 'Scheduled for today',   icon: Bell,        iconBg: 'bg-red-50',     iconColor: 'text-red-600',     valueCls: 'text-red-600' },
          { label: 'Overdue',       value: `${overdueCount} cycles`,     sub: 'Pending action',        icon: AlertTriangle, iconBg: 'bg-rose-50',  iconColor: 'text-rose-600',    valueCls: 'text-rose-600' },
          { label: 'Upcoming',      value: `${upcomingCount} riders`,    sub: 'Next 30 days',          icon: Calendar,    iconBg: 'bg-amber-50',   iconColor: 'text-amber-600',   valueCls: 'text-amber-600' },
          { label: 'Sent Logs',     value: `${sentCount} completed`,     sub: 'Contacted clients',     icon: CheckCircle, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', valueCls: 'text-emerald-600' },
        ].map(({ label, value, sub, icon: Icon, iconBg, iconColor, valueCls }) => (
          <div key={label} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">{label}</span>
              <span className={`text-xl font-bold leading-none block ${valueCls}`}>{value}</span>
              <span className="text-xs text-slate-400 block mt-1">{sub}</span>
            </div>
            <div className={`p-3 ${iconBg} ${iconColor} rounded-xl shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* ── FILTER TABS + BULK ACTIONS ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row flex-wrap items-center justify-between gap-3">

        {/* Tab filter */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-0.5 flex-wrap">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setFilterTab(t.key); setSelectedIds([]); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterTab === t.key
                  ? `bg-white shadow-sm ${t.color}`
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {/* Bulk buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Bulk:</span>
          <button
            onClick={handleBulkSendSelected}
            disabled={!selectedIds.length}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <Send className="w-3 h-3" /> Send Selected
          </button>
          <button
            onClick={() => handleBulkStatusUpdate('Sent', 'Selected')}
            disabled={!selectedIds.length}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <Check className="w-3 h-3" /> Mark Sent
          </button>
          <button
            onClick={() => handleBulkStatusUpdate('Confirmed', 'Selected')}
            disabled={!selectedIds.length}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 disabled:opacity-40 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <CheckCircle className="w-3 h-3" /> Mark Confirmed
          </button>
          <button
            onClick={() => handleBulkStatusUpdate('Sent', 'AllToday')}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <Clock className="w-3 h-3" /> All Today → Sent
          </button>
        </div>
      </div>

      {/* ── REMINDERS TABLE ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                    checked={displayRecords.length > 0 && selectedIds.length === displayRecords.length}
                    onChange={e => handleSelectAll(e.target.checked)}
                  />
                </th>
                {['Client', 'Bike', 'Last Service', 'Next Service', 'Status', 'Update', 'Action'].map(h => (
                  <th key={h} className="py-3 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayRecords.length > 0 ? displayRecords.map(srv => {
                const subCat = getSubcategory(srv);
                const isChecked = selectedIds.includes(srv.id);
                return (
                  <tr key={srv.id} className={`transition-colors hover:bg-slate-50/60 ${isChecked ? 'bg-red-50/30' : ''}`}>

                    {/* Checkbox */}
                    <td className="py-3.5 px-4 align-middle">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                        checked={isChecked}
                        onChange={() => handleToggleSelect(srv.id)}
                      />
                    </td>

                    {/* Client */}
                    <td className="py-3.5 px-4">
                      <span className="text-sm font-semibold text-slate-800 block">{srv.customerName}</span>
                      <span className="text-xs text-slate-400 font-mono">{srv.customerPhone}</span>
                    </td>

                    {/* Bike */}
                    <td className="py-3.5 px-4">
                      <span className="text-sm text-slate-700 font-medium">Honda {srv.bikeModel}</span>
                    </td>

                    {/* Last Service */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-xs text-slate-500">{new Date(srv.date).toLocaleDateString()}</span>
                    </td>

                    {/* Next Service */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-xs font-semibold text-slate-800">
                        {srv.nextReminderDate ? new Date(srv.nextReminderDate).toLocaleDateString() : '—'}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="py-3.5 px-4">
                      {subCat === 'Today' && (
                        <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-100">Due Today</span>
                      )}
                      {subCat === 'Overdue' && (
                        <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-100">Overdue</span>
                      )}
                      {subCat === 'Sent' && (
                        <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">Sent</span>
                      )}
                      {subCat === 'Upcoming' && (
                        <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          {srv.nextReminderDate ? 'Upcoming' : 'Pending'}
                        </span>
                      )}
                    </td>

                    {/* Status dropdown */}
                    <td className="py-3.5 px-4">
                      <select
                        className="px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-slate-50 cursor-pointer hover:bg-white focus:outline-none focus:border-red-300 transition-all"
                        value={srv.reminderStatus}
                        onChange={e => updateRemindersStatus([srv.id], e.target.value as any)}
                      >
                        <option value="Pending">🕒 Pending</option>
                        <option value="Sent">💬 Sent</option>
                        <option value="Confirmed">✅ Confirmed</option>
                      </select>
                    </td>

                    {/* WhatsApp button */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleOpenWhatsApp(srv)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white text-xs font-semibold rounded-lg cursor-pointer inline-flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> Send
                      </button>
                    </td>

                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                        <Inbox className="w-5 h-5 text-slate-300" />
                      </div>
                      <p className="text-sm font-medium">No reminders in this category</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
