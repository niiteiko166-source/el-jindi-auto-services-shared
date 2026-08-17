import React, { useState } from 'react';
import { Settings, Save, Building2, Percent, FileText } from 'lucide-react';
import { db } from '../services/db';

export const SettingsView: React.FC = () => {
  const currentSettings = db.getSettings();

  const [companyName, setCompanyName] = useState(currentSettings.companyName);
  const [tagline, setTagline] = useState(currentSettings.tagline);
  const [address, setAddress] = useState(currentSettings.address);
  const [phone, setPhone] = useState(currentSettings.phone);
  const [email, setEmail] = useState(currentSettings.email);
  const [tinNumber, setTinNumber] = useState(currentSettings.tinNumber);
  const [vatRate, setVatRate] = useState(currentSettings.defaultVatRate);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    db.saveSettings({
      companyName,
      tagline,
      address,
      phone,
      email,
      tinNumber,
      defaultVatRate: vatRate
    });
    alert('Workshop Settings saved successfully!');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pt-2">
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Workshop & System Configuration</h1>
            <p className="text-xs text-slate-500">
              Configure El-Jindi Auto Services company profile, tax rates (VAT/NHIL/GETFund), TIN number, and invoices
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6 max-w-3xl">
        <div className="space-y-4 text-xs font-medium">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            Company & Workshop Profile
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-600 font-bold mb-1">Company / Workshop Name</label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1">Company Tagline / Slogan</label>
              <input
                type="text"
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1">Phone Number(s)</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-slate-800"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-600 font-bold mb-1">Physical Address / Location</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-slate-800"
              />
            </div>
          </div>

          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2 pt-4">
            <Percent className="w-4 h-4 text-emerald-600" />
            Taxation & Ghana Revenue Authority Setup
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-600 font-bold mb-1">GRA TIN Number</label>
              <input
                type="text"
                value={tinNumber}
                onChange={e => setTinNumber(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1">
                Default Combined Tax Rate (NHIL 2.5% + GETFund 2.5% + VAT 15% = 20%)
              </label>
              <input
                type="number"
                step="0.1"
                value={vatRate}
                onChange={e => setVatRate(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-xl font-bold text-blue-700"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Settings
          </button>
        </div>
      </form>
    </div>
  );
};
