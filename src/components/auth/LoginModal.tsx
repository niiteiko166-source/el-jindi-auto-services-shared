import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, AlertCircle, KeyRound, ArrowRight } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { login } = useAuth();
  const [selectedUsername, setSelectedUsername] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      const success = await login(selectedUsername, pin);
      if (!success) {
        setErrorMsg('Invalid username or PIN code. Please try again.');
      }
    } catch (error) {
      setErrorMsg('Authentication failed. Please check your credentials.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-6 text-white text-center relative">
          <div className="inline-block bg-amber-400 text-slate-950 font-mono font-black text-[10px] px-2.5 py-0.5 rounded tracking-widest uppercase mb-2">
            GH · ACCRA MAIN
          </div>
          <h1 className="text-xl font-extrabold tracking-tight uppercase">El-Jindi Auto Services</h1>
          <p className="text-xs text-slate-300 font-medium mt-0.5">Enterprise Operations System Authentication</p>
          <div className="mt-3 inline-flex items-center space-x-1.5 bg-white/10 px-3 py-1 rounded-full text-xs text-blue-200">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Secure System Sign In</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={selectedUsername}
                onChange={(e) => setSelectedUsername(e.target.value)}
                required
                className="w-full p-2.5 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1 flex justify-between">
                <span>Security PIN Code</span>
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter 4-digit PIN..."
                  maxLength={6}
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-xs font-mono font-bold tracking-widest bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-xs transition-colors shadow-md flex items-center justify-center space-x-2"
            >
              <span>Authenticate & Access Terminal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-[11px] text-slate-400 text-center border-t border-slate-100 pt-3">
            Logged-in session is restricted by role permissions (`ADMIN`, `POS`, `INVENTORY`, `ACCOUNTING`).
          </div>
        </div>
      </div>
    </div>
  );
};
