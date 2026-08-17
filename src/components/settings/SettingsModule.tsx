import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Settings, Save, CheckCircle2, RotateCcw, Building, Receipt, Database } from 'lucide-react';

export const SettingsModule: React.FC = () => {
  const { settings, updateSettings, resetToSeedData, setCurrentView } = useApp();

  const [formData, setFormData] = useState({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleReset = async () => {
    if (
      confirm(
        'Are you sure you want to reset system data to default EL-JINDI sample dataset? All changes will be reloaded.'
      )
    ) {
      await resetToSeedData();
      alert('System reset completed successfully!');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            Company Profile & POS System Configuration
          </h2>
          <p className="text-xs text-slate-500">
            Customize receipt header text, currency symbol, GRA TIN number, and tax options
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
        {/* Company Info */}
        <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-600" />
            <span>Business Profile & Receipt Header</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Company / Store Name</label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Slogan / Tagline</label>
              <input
                type="text"
                name="tagline"
                value={formData.tagline}
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Physical Store Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Store Contact Phone</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">GRA TIN Number</label>
              <input
                type="text"
                name="tinNumber"
                value={formData.tinNumber}
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Thermal Receipt Footer Note</label>
            <textarea
              name="receiptFooter"
              rows={2}
              value={formData.receiptFooter}
              onChange={handleChange}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save System Settings</span>
            </button>
          </div>
        </div>

        {/* Currency & Database Management */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Currency & Tax Options</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Currency Symbol</label>
              <input
                type="text"
                name="currencySymbol"
                value={formData.currencySymbol}
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold font-mono text-center text-lg"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Default VAT Rate (%)</label>
              <input
                type="number"
                step="0.1"
                name="vatRate"
                value={formData.vatRate}
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold font-mono"
              />
            </div>
          </div>

          <div className="bg-blue-50/80 p-5 rounded-xl border border-blue-200 shadow-xs space-y-3">
            <div className="font-extrabold text-blue-950 text-sm flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              <span>Staff Users & Roles</span>
            </div>
            <p className="text-blue-800 text-[11px]">
              Add sales reps, cashiers, inventory managers & accountants. Manage PIN codes and permissions.
            </p>

            <button
              type="button"
              onClick={() => setCurrentView('users')}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center space-x-1.5"
            >
              <span>Manage System Users</span>
            </button>
          </div>

          <div className="bg-red-50 p-5 rounded-xl border border-red-200 shadow-xs space-y-3">
            <div className="font-extrabold text-red-900 text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-red-600" />
              <span>System Reset & Seed Data</span>
            </div>
            <p className="text-red-700 text-[11px]">
              Reset application state to restore default sample filters, brake pads, oil categories, and sales logs.
            </p>

            <button
              type="button"
              onClick={handleReset}
              className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center space-x-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restore Sample Dataset</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
