import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, UserRole } from '../../types';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Edit2,
  Trash2,
  X,
  KeyRound,
  CheckCircle,
  XCircle,
  Lock,
  Mail,
  User as UserIcon,
  Check
} from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => {
  const { users, addUser, updateUser, deleteUser, currentUser } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    role: 'POS_CASHIER' as UserRole,
    pin: '1234',
    active: true
  });

  if (!isOpen) return null;

  const handleOpenNewUser = () => {
    setEditingUserId(null);
    setFormData({
      username: '',
      name: '',
      email: '',
      role: 'POS_CASHIER',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Staff User & Role Management</h3>
              <p className="text-xs text-slate-400">Configure system access permissions, roles, and security PINs</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <div className="text-slate-600 font-semibold">
              Total Registered Users: <span className="font-extrabold text-slate-900">{users.length}</span>
            </div>
            {!isEditing && (
              <button
                onClick={handleOpenNewUser}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add New Staff Account</span>
              </button>
            )}
          </div>

          {/* User Form (Add / Edit) */}
          {isEditing && (
            <form onSubmit={handleSubmit} className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl space-y-3">
              <div className="font-extrabold text-blue-900 text-xs flex items-center justify-between border-b border-blue-200 pb-2">
                <span>{editingUserId ? 'Edit Staff Account' : 'Create New Staff Account'}</span>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-slate-500 hover:text-slate-800 text-[11px] font-bold"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g. Kwame Mensah"
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    placeholder="e.g. kwame1"
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">System Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-blue-700"
                  >
                    <option value="ADMIN">ADMIN (Full System Control)</option>
                    <option value="POS_CASHIER">POS_CASHIER (Point of Sale Checkout & Billing)</option>
                    <option value="SALES_REP">SALES_REP (Sales Representative & Invoicing)</option>
                    <option value="INVENTORY_MANAGER">INVENTORY_MANAGER (Stock & Purchase Orders)</option>
                    <option value="ACCOUNTANT">ACCOUNTANT (Cashbook, Debtors & Reports)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. kwame@eljindi.com"
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">4-Digit PIN Code</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    required
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold tracking-widest"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>Account Active</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition-colors"
                >
                  Save User Account
                </button>
              </div>
            </form>
          )}

          {/* User List Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Staff Name</th>
                  <th className="p-3">Username</th>
                  <th className="p-3">Assigned Role</th>
                  <th className="p-3">PIN Code</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className={isCurrent ? 'bg-blue-50/50' : 'hover:bg-slate-50'}>
                      <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-blue-600" />
                        <div>
                          <div>{u.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{u.email}</div>
                        </div>
                        {isCurrent && (
                          <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                            YOU
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-700">{u.username}</td>
                      <td className="p-3 font-mono font-extrabold text-blue-700 text-[11px]">
                        {u.role}
                      </td>
                      <td className="p-3 font-mono text-slate-500">••••</td>
                      <td className="p-3">
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
                      <td className="p-3 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEditUser(u)}
                          className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit User"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {u.username !== 'admin' && (
                          <button
                            onClick={() => handleDelete(u.id, u.name)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Role Permissions Matrix Summary */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-blue-600" />
              <span>Role Permissions Matrix</span>
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px]">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                <div className="font-extrabold text-blue-900">ADMIN</div>
                <p className="text-[10px] text-slate-500">Unrestricted system access, user management, settings & data reset.</p>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                <div className="font-extrabold text-emerald-800">POS_CASHIER</div>
                <p className="text-[10px] text-slate-500">POS checkout terminal, cash sales receipts, debtor collections & customer lookups.</p>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                <div className="font-extrabold text-indigo-800">SALES_REP</div>
                <p className="text-[10px] text-slate-500">New sales, customer quotes, debtor records, stock inquiry & customer profiles.</p>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                <div className="font-extrabold text-purple-800">INVENTORY_MGR</div>
                <p className="text-[10px] text-slate-500">Stock updates, reorder thresholds, POs, supplier receipts & valuation reports.</p>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                <div className="font-extrabold text-amber-800">ACCOUNTANT</div>
                <p className="text-[10px] text-slate-500">Cashbook, expense logs, AR debtors receivables & financial reports.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
