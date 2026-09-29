/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from './AppContext';
import { Lock, User as UserIcon, ShieldAlert } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { db, setCurrentUser, setCurrentTab } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!db) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const checkUsername = username.trim().toLowerCase();
    const foundUser = db.users.find(u => u.username.toLowerCase() === checkUsername);

    if (!foundUser) {
      setErrorMsg('Incorrect identifier credentials or account non-existent.');
      return;
    }

    if (foundUser.password !== password) {
      setErrorMsg('Unauthorized account password mismatch.');
      return;
    }

    if (foundUser.status === 'Inactive') {
      setErrorMsg('Access Retracted: This staff account has been de-certified or labeled as Inactive.');
      return;
    }

    // Success login — cashiers land on POS, all others on Dashboard
    setCurrentUser(foundUser);
    setCurrentTab(foundUser.role === 'Cashier' ? 'pos' : 'dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 font-sans text-slate-800" id="login-module-layout">
      
      {/* BRAND & HEADER PORTION */}
      <div className="flex flex-col items-center gap-3 mb-8 select-none text-center animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="w-12 h-12 bg-red-600 text-white rounded-xl flex items-center justify-center font-black italic text-2xl leading-none shadow-md">
          H
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Rais HONDA</h1>
          <span className="text-[10px] uppercase tracking-widest text-red-600 font-extrabold block mt-2 font-mono">Motorcycle Parts</span>
        </div>
      </div>

      {/* LOGIN CARD */}
      <div className="w-full max-w-sm bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden p-8 animate-in fade-in duration-500 scale-in-95">
        <div className="mb-6 text-center">
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono">Operator Authentication</h2>
          <p className="text-[10px] text-slate-400 font-sans mt-1">Please authenticate with your secure credentials to unlock system access.</p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-150 rounded-lg p-3 text-xxs font-extrabold text-red-600 flex items-start gap-2 mb-5 animate-shake">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* USERNAME INPUT */}
          <div className="space-y-1">
            <label className="block text-[9px] uppercase font-mono tracking-wider font-extrabold text-slate-400">
              Username
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="Enter Username"
                className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white focus:outline-none pl-9 pr-4 py-2 text-xxs font-bold text-slate-800 rounded-lg transition-all font-mono"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          {/* PASSWORD INPUT */}
          <div className="space-y-1">
            <label className="block text-[9px] uppercase font-mono tracking-wider font-extrabold text-slate-400">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="Enter Password"
                className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white focus:outline-none pl-9 pr-4 py-2 text-xxs font-bold text-slate-800 rounded-lg transition-all font-mono"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* SIGN IN BUTTON */}
          <button
            type="submit"
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xxs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider font-mono mt-4"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};
