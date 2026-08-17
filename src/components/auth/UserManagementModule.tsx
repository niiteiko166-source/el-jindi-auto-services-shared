import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, UserRole } from '../../types';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Edit2,
  Trash2,
  KeyRound,
  CheckCircle,
  XCircle,
  Lock,
  Mail,
  User as UserIcon,
  Shield,
  Briefcase,
  Key,
  Info
} from 'lucide-react';

export const UserManagementModule: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, currentUser } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    role: 'SALES_REP' as UserRole,
    pin: '1234',
    active: true
  });

  const handleOpenNewUser = () => {
    setEditingUserId(null);
    setFormData({
      username: '',
      name: '',
      email: '',
      role: 'SALES_REP',
      pin: '1234',
      active: true
    });
    setIsEditing(true);
  };

  const handleOpenEditUser = (u: User & { pin?: string }) => {
    setEditingUserId(u.id);
    setFormData({
      username: u.username,
      name: u.name,
      email: u.email || '',
      role: u.role,
      pin: u.pin || '1234',
      active: u.active
    });
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUserId) {
        await updateUser(editingUserId, formData);
      } else {
        await addUser(formData);
      }
      setIsEditing(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save staff account.');
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove user "${name}"?`)) {
      deleteUser(id);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 bg-blue-500/20 px-3 py-1 rounded-full text-blue-300 text-xs font-bold border border-blue-400/30">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Staff Access Control & User Roles</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight uppercase">User & Staff Management</h1>
          <p className="text-xs text-slate-300 max-w-2xl">
            Add sales representatives, cashiers, inventory managers, and accountants. Set custom login credentials, security PINs, and control system permission scopes.
          </p>
        </div>

        <button
          onClick={handleOpenNewUser}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 shrink-0 text-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Staff / Sales Rep</span>
        </button>
      </div>

      {/* Add / Edit Form Card */}
      {isEditing && (
        <form onSubmit={handleSubmit} className="bg-white border-2 border-blue-500 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="font-extrabold text-blue-900 text-sm flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-2">
              <UserIcon className="w-5 h-5 text-blue-600" />
              <span>{editingUserId ? 'Edit Staff Credentials & Role' : 'Register New Staff Member / Sales Rep'}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-slate-500 hover:text-slate-800 text-xs font-bold bg-slate-100 px-3 py-1 rounded-lg"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Full Staff Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g. Kofi Mensah (Sales Rep)"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Login Username *</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                placeholder="e.g. sales1"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Assigned Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-blue-700 focus:ring-2 focus:ring-blue-500"
              >
                <option value="SALES_REP">SALES_REP (Sales Representative & Invoicing)</option>
                <option value="POS_CASHIER">POS_CASHIER (Point of Sale Checkout Terminal)</option>
                <option value="INVENTORY_MANAGER">INVENTORY_MANAGER (Stock & Purchase Orders)</option>
                <option value="ACCOUNTANT">ACCOUNTANT (Cashbook, Debtors & Financial Reports)</option>
                <option value="ADMIN">ADMIN (Full Unrestricted System Access)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Security PIN Code *</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  maxLength={6}
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                  required
                  placeholder="e.g. 1234"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold tracking-widest focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Email Address (Optional)</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. sales@eljindi.com"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center space-x-2 cursor-pointer font-extrabold text-slate-800">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 h-5 w-5"
                />
                <span>Account Active (Allowed to Login)</span>
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-xs transition-colors shadow-md"
            >
              Save Staff User Account
            </button>
          </div>
        </form>
      )}

      {/* Main Staff Directory Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">
              Registered System Staff Directory ({users.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">Default PIN for new accounts is 1234</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-3.5">Staff Name & Contact</th>
                <th className="p-3.5">Login Username</th>
                <th className="p-3.5">Assigned System Role</th>
                <th className="p-3.5">PIN Code</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isCurrent = currentUser?.id === u.id;
                return (
                  <tr key={u.id} className={isCurrent ? 'bg-blue-50/60' : 'hover:bg-slate-50/80'}>
                    <td className="p-3.5 font-bold text-slate-900">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span>{u.name}</span>
                            {isCurrent && (
                              <span className="bg-blue-600 text-white text-[9px] font-mono font-bold px-1.5 py-0.2 rounded">
                                ACTIVE SESSION
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal">{u.email || 'No email provided'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono font-extrabold text-slate-800">{u.username}</td>
                    <td className="p-3.5">
                      <span
                        className={`font-mono font-extrabold text-[11px] px-2.5 py-1 rounded-lg border inline-block ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : u.role === 'SALES_REP'
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            : u.role === 'POS_CASHIER'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : u.role === 'INVENTORY_MANAGER'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-400 font-bold">••••</td>
                    <td className="p-3.5">
                      {u.active ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          <XCircle className="w-3 h-3 text-slate-400" /> INACTIVE
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEditUser(u)}
                        className="px-2.5 py-1 text-slate-700 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors font-bold text-[11px]"
                      >
                        Edit
                      </button>
                      {u.username !== 'admin' && (
                        <button
                          onClick={() => handleDelete(u.id, u.name)}
                          className="px-2.5 py-1 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors font-bold text-[11px]"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Capabilities Reference Grid */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md space-y-3">
        <h3 className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-2 text-blue-400">
          <Lock className="w-4 h-4 text-amber-400" />
          <span>System Role Permission Scope Guide</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          <div className="bg-slate-800 p-3.5 rounded-xl border border-slate-700 space-y-1">
            <div className="font-extrabold text-blue-400">ADMIN</div>
            <p className="text-[11px] text-slate-300 leading-tight">
              Unrestricted access to all modules, system settings, database resets, and user management.
            </p>
          </div>
          <div className="bg-slate-800 p-3.5 rounded-xl border border-slate-700 space-y-1">
            <div className="font-extrabold text-indigo-400">SALES_REP</div>
            <p className="text-[11px] text-slate-300 leading-tight">
              Point of sale checkout, sales invoices, credit sales, debtor collections, stock lookups & customers.
            </p>
          </div>
          <div className="bg-slate-800 p-3.5 rounded-xl border border-slate-700 space-y-1">
            <div className="font-extrabold text-emerald-400">POS_CASHIER</div>
            <p className="text-[11px] text-slate-300 leading-tight">
              Fast barcode checkout terminal, sales receipt printing, customer directory, and stock balance checks.
            </p>
          </div>
          <div className="bg-slate-800 p-3.5 rounded-xl border border-slate-700 space-y-1">
            <div className="font-extrabold text-purple-400">INVENTORY_MGR</div>
            <p className="text-[11px] text-slate-300 leading-tight">
              Parts catalog editing, stock adjustments, purchase orders, supplier receipts, and valuation reports.
            </p>
          </div>
          <div className="bg-slate-800 p-3.5 rounded-xl border border-slate-700 space-y-1">
            <div className="font-extrabold text-amber-400">ACCOUNTANT</div>
            <p className="text-[11px] text-slate-300 leading-tight">
              Cashbook entries, expense tracking, debtors receivables, financial analytics, and profit & loss statements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
