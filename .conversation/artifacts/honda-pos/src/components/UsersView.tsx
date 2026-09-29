/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from './AppContext';
import { User, UserRole } from '../types';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  UserCheck, 
  ShieldAlert, 
  Shield, 
  Lock, 
  Key, 
  Sparkles, 
  Check, 
  X,
  BadgeAlert
} from 'lucide-react';

export const UsersView: React.FC = () => {
  const { db, saveUser, deleteUser, currentUser } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal Control States
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<User | null>(null);

  // Form Fields State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Cashier');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formError, setFormError] = useState('');

  if (!db) return <div className="p-8 text-neutral-500">Loading directory...</div>;

  const { users } = db;

  // Determine permissions
  const isSuperAdmin = currentUser?.role === 'Super Admin';
  const isAdminOrManager = currentUser?.role === 'Admin' || currentUser?.role === 'Manager' || currentUser?.role === 'Super Admin';
  const hasEditAccess = isSuperAdmin; // Only Super Admin can write/delete users

  // Calculate stats
  const totalUsers = users.length;
  const superAdminCount = users.filter(u => u.role === 'Super Admin').length;
  const managerCount = users.filter(u => u.role === 'Manager' || u.role === 'Admin').length;
  const cashierCount = users.filter(u => u.role === 'Cashier').length;
  const storeKeeperCount = users.filter(u => u.role === 'Store Keeper').length;

  // Handles starting user creation
  const handleAddClick = () => {
    if (!hasEditAccess) {
      alert("Access Prohibited: Only the Super Admin is authorized to create new staff accounts.");
      return;
    }
    setEditingUser(null);
    setName('');
    setUsername('');
    setPassword('');
    setRole('Cashier');
    setStatus('Active');
    setFormError('');
    setIsOpen(true);
  };

  // Handles starting user editing
  const handleEditClick = (u: User) => {
    if (!hasEditAccess) {
      alert("Access Prohibited: Only the Super Admin is authorized to edit staff profiles.");
      return;
    }
    setEditingUser(u);
    setName(u.name);
    setUsername(u.username);
    setPassword(u.password || '');
    setRole(u.role);
    setStatus(u.status || 'Active');
    setFormError('');
    setIsOpen(true);
  };

  // Handles starting user deletion
  const handleDeleteClick = (u: User) => {
    if (!hasEditAccess) {
      alert("Access Prohibited: Only the Super Admin is authorized to dismiss or delete staff accounts.");
      return;
    }
    if (u.id === currentUser?.id) {
      alert("Protection Lock: You cannot delete your own active administrator profile.");
      return;
    }
    setSelectedUserForDelete(u);
    setIsDeleteOpen(true);
  };

  // Form Submit Handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Staff Display Name is required');
      return;
    }
    if (!username.trim()) {
      setFormError('Unique Username is required');
      return;
    }
    if (!editingUser && !password.trim()) {
      setFormError('Account access Password is required for new users');
      return;
    }

    // Check duplicate username (except current editing user)
    const isDuplicate = users.some(u => u.username.toLowerCase() === username.trim().toLowerCase() && u.id !== editingUser?.id);
    if (isDuplicate) {
      setFormError(`Username "${username}" is already assigned to another staff member`);
      return;
    }

    const payload: User = {
      id: editingUser?.id || '',
      name: name.trim(),
      username: username.trim().toLowerCase(),
      password: password.trim() || undefined,
      role,
      status,
      lastLogin: editingUser?.lastLogin || new Date().toISOString()
    };

    const success = await saveUser(payload);
    if (success) {
      setIsOpen(false);
    } else {
      setFormError('Database API failed to synchronize changes. Check server logs.');
    }
  };

  // Delete Confirm Handler
  const handleConfirmDelete = async () => {
    if (!selectedUserForDelete) return;
    const success = await deleteUser(selectedUserForDelete.id);
    if (success) {
      setIsDeleteOpen(false);
      setSelectedUserForDelete(null);
    } else {
      alert('Database API failed to remove user account.');
    }
  };

  // Filtered dataset
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'All' || (u.status || 'Active') === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6" id="users-module-container">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-red-600" />
            User Management
          </h2>
          <p className="text-xxs text-slate-500 font-mono mt-1 uppercase tracking-wider">
            Configure system access control, staff credentials, and active business roles
          </p>
        </div>

        {hasEditAccess && (
          <button
            onClick={handleAddClick}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xxs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
            id="btn-add-new-user"
          >
            <Plus className="w-3.5 h-3.5" />
            Add New User
          </button>
        )}
      </div>

      {/* DASHBOARD STATISTICS COLLAGE */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* SUPER ADMIN CARD */}
        <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-rose-600 block">Super Admins</span>
            <span className="text-2xl font-black text-rose-900 mt-1 block">{superAdminCount}</span>
          </div>
          <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* MANAGERS CARD */}
        <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-purple-600 block">Managers</span>
            <span className="text-2xl font-black text-purple-900 mt-1 block">{managerCount}</span>
          </div>
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
            <Shield className="w-5 h-5" />
          </div>
        </div>

        {/* CASHIERS CARD */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-blue-600 block">Cashiers</span>
            <span className="text-2xl font-black text-blue-900 mt-1 block">{cashierCount}</span>
          </div>
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* STORE KEEPERS CARD */}
        <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-amber-600 block">Store Keepers</span>
            <span className="text-2xl font-black text-amber-900 mt-1 block">{storeKeeperCount}</span>
          </div>
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
            <BoxIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search staff by full name or login username..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white focus:outline-none pl-10 pr-4 py-2 text-xxs font-semibold rounded-lg text-slate-800 transition-all placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-row gap-3 w-full md:w-auto self-stretch md:self-auto justify-end">
          {/* Role Filter */}
          <select
            className="bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white focus:outline-none px-3 py-1.5 text-xxs font-bold text-slate-700 rounded-lg cursor-pointer"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="All">All Roles</option>
            <option value="Super Admin">Super Admin</option>
            <option value="Manager">Manager</option>
            <option value="Cashier">Cashier</option>
            <option value="Store Keeper">Store Keeper</option>
          </select>

          {/* Status Filter */}
          <select
            className="bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white focus:outline-none px-3 py-1.5 text-xxs font-bold text-slate-700 rounded-lg cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* READ ONLY NOTIFICATION FOR VIEW-ONLY ADMINS */}
      {!hasEditAccess && (
        <div className="bg-amber-50 border border-amber-250/50 rounded-lg p-3.5 flex items-start gap-3">
          <Shield className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <span className="text-xxs font-black text-amber-900 block uppercase font-mono">Supervisor Directory Access Mode</span>
            <p className="text-xxs text-amber-700/90 mt-0.5 font-medium">
              You are signed in as a **{currentUser?.role || 'Staff Member'}**. You have read-only access to view directory list and status metrics. Custom profile modifications are locked to Super Admin.
            </p>
          </div>
        </div>
      )}

      {/* STAFF DIRECTORY MAIN LIST */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-mono text-[9px] uppercase tracking-wider select-none">
                <th className="py-3 px-5 font-extrabold">Staff Participant & ID</th>
                <th className="py-3 px-5 font-extrabold">Username</th>
                <th className="py-3 px-5 font-extrabold">Access Role</th>
                <th className="py-3 px-5 font-extrabold">Account Status</th>
                <th className="py-3 px-5 font-extrabold">Last Engagement</th>
                <th className="py-3 px-5 text-right font-extrabold pr-6">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xxs font-semibold">
                    No matching staff members or user accounts found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleColors: { [key: string]: string } = {
                    'Super Admin': 'bg-rose-50 border-rose-200 text-rose-700',
                    'Manager': 'bg-purple-50 border-purple-200 text-purple-700',
                    'Admin': 'bg-purple-50 border-purple-200 text-purple-700',
                    'Cashier': 'bg-blue-50 border-blue-200 text-blue-700',
                    'Store Keeper': 'bg-amber-50 border-amber-200 text-amber-700'
                  };

                  const roleBadge = roleColors[u.role] || 'bg-slate-50 border-slate-200 text-slate-700';
                  const isCurrent = u.id === currentUser?.id;
                  const uStatus = u.status || 'Active';

                  return (
                    <tr 
                      key={u.id} 
                      className={`hover:bg-slate-50/50 transition-all ${isCurrent ? 'bg-red-50/10' : ''}`}
                    >
                      {/* Name & ID */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black select-none uppercase text-xs ${
                            u.role === 'Super Admin' ? 'bg-rose-100 text-rose-700' :
                            u.role === 'Manager' || u.role === 'Admin' ? 'bg-purple-100 text-purple-700' :
                            u.role === 'Cashier' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <span className="block font-bold text-slate-800 text-xxs flex items-center gap-1.5 leading-none">
                              {u.name}
                              {isCurrent && (
                                <span className="bg-red-600 text-white text-[7px] font-black uppercase font-mono px-1 rounded tracking-widest leading-normal">
                                  You
                                </span>
                              )}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono mt-0.5 block leading-none">ID: {u.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="py-4 px-5 font-mono text-xxs font-bold text-slate-600">
                        {u.username}
                      </td>

                      {/* Role */}
                      <td className="py-4 px-5">
                        <span className={`inline-block border rounded px-2 py-0.5 text-[9px] font-extrabold uppercase font-mono tracking-wider ${roleBadge}`}>
                          {u.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          uStatus === 'Active' ? 'bg-green-150 text-green-700' : 'bg-neutral-150 text-neutral-500'
                        }`}>
                          <span className={`w-1 h-1 rounded-full ${uStatus === 'Active' ? 'bg-green-500' : 'bg-neutral-400'}`} />
                          {uStatus}
                        </span>
                      </td>

                      {/* Last Engagement */}
                      <td className="py-4 px-5 text-xxs font-semibold text-slate-400 font-mono">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </td>

                      {/* Manage Actions */}
                      <td className="py-4 px-5 text-right font-semibold select-none pr-6 shrink-0">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(u)}
                            className={`p-1.5 rounded border border-slate-200 transition-colors ${
                              hasEditAccess 
                                ? 'text-slate-500 hover:text-red-600 hover:border-red-100 hover:bg-slate-50 cursor-pointer' 
                                : 'text-slate-300 border-slate-100 cursor-not-allowed'
                            }`}
                            title={hasEditAccess ? "Edit System Credentials" : "Super Admin rights required"}
                            disabled={!hasEditAccess}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteClick(u)}
                            className={`p-1.5 rounded border transition-colors ${
                              hasEditAccess && !isCurrent
                                ? 'text-slate-500 hover:text-white hover:bg-red-600 hover:border-red-600 cursor-pointer border-slate-200' 
                                : 'text-slate-300 border-slate-100 cursor-not-allowed'
                            }`}
                            title={isCurrent ? "Self Lockout Blocked" : hasEditAccess ? "Decommission Account" : "Super Admin rights required"}
                            disabled={!hasEditAccess || isCurrent}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE & EDIT USER MODAL OVERLAY */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-red-600" />
                {editingUser ? 'Edit User Credentials' : 'Add New Staff Account'}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xxs font-semibold text-red-600 flex items-start gap-2">
                  <BadgeAlert className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Display Name */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-400">
                  Staff Display Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Majid Hussain"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white focus:outline-none px-3.5 py-2 text-xxs font-bold text-slate-800 rounded-lg transition-all"
                />
              </div>

              {/* Login Username */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-400">
                  Unique Username *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. majid125"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white focus:outline-none px-3.5 py-2 text-xxs font-bold text-slate-800 rounded-lg transition-all font-mono"
                />
              </div>

              {/* Account Password */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-400">
                    System Password {editingUser ? '(Optional)' : '*'}
                  </label>
                  {editingUser && (
                    <span className="text-[8px] uppercase tracking-normal font-mono font-extrabold text-slate-400">
                      Leave blank to keep current
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                  <input
                    type="password"
                    placeholder={editingUser ? '••••••••' : 'Password hash key'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!editingUser}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white focus:outline-none pl-9 pr-3.5 py-2 text-xxs font-bold text-slate-800 rounded-lg transition-all"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-400">
                  Access Authorization Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white focus:outline-none px-3.5 py-2 text-xxs font-bold text-slate-700 rounded-lg transition-all cursor-pointer"
                >
                  <option value="Super Admin">Super Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Cashier">Cashier</option>
                  <option value="Store Keeper">Store Keeper</option>
                </select>
              </div>

              {/* Account Status Switcher */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-400">
                  Account Access Status
                </label>
                <div className="flex gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xxs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="account_status"
                      checked={status === 'Active'}
                      onChange={() => setStatus('Active')}
                      className="accent-red-600"
                    />
                    Active (Allowed Access)
                  </label>
                  <label className="flex items-center gap-2 text-xxs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="account_status"
                      checked={status === 'Inactive'}
                      onChange={() => setStatus('Inactive')}
                      className="accent-red-600"
                    />
                    Inactive (Locked Out)
                  </label>
                </div>
              </div>

              {/* Buttons Row */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 hover:bg-slate-50 text-slate-600 border border-slate-200 font-bold rounded-lg text-xxs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xxs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1"
                >
                  <Key className="w-3.5 h-3.5" />
                  Save Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL DISPLAY */}
      {isDeleteOpen && selectedUserForDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-xs overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 text-center">
              <div className="w-12 h-12 bg-red-50 text-red-600 mx-auto rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Decommission User Account?</h3>
              <p className="text-xxs text-slate-550 font-semibold mt-3 leading-relaxed">
                Are you sure you want to permanently revoke system access for <strong className="text-slate-800">{selectedUserForDelete.name}</strong>? 
              </p>
              <div className="mt-1 bg-slate-50 rounded-lg p-2 text-[10px] font-mono text-slate-500 font-bold border border-slate-100 uppercase">
                Username: {selectedUserForDelete.username}
              </div>
            </div>
            <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 flex gap-2 justify-stretch select-none">
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="w-full py-2 hover:bg-slate-200 text-slate-600 border border-slate-200 font-bold rounded-lg text-xxs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xxs transition-all shadow-md cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Simple Lucide Box icon fallback
const BoxIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);
