import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { User, UserRole } from '../types';

export const UsersView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'Receptionist', phone: '', password: '' });

  useEffect(() => {
    setUsers(db.getUsers());
  }, []);

  const refresh = () => setUsers(db.getUsers());

  const resetForm = () => setForm({ name: '', email: '', role: 'Receptionist', phone: '', password: '' });

  const startAdd = () => {
    setEditing(null);
    resetForm();
  };

  const startEdit = (u: User) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email || '', role: u.role, phone: u.phone || '', password: u.password || '' });
  };

  const save = () => {
    if (!form.name.trim()) return alert('Name is required');
    if (!editing && !form.password.trim()) return alert('Password is required for new users');

    const toSave: any = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      password: editing ? (form.password.trim() || undefined) : form.password.trim(),
    };

    if (editing) toSave.id = editing.id;
    db.saveUser(toSave);
    refresh();
    setEditing(null);
    resetForm();
  };

  const remove = (id: string) => {
    if (!confirm('Delete this user?')) return;
    db.deleteUser(id);
    refresh();
  };

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center justify-between gap-3 mt-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800">User Management</h2>
          <p className="text-sm text-slate-500 mt-1">Add, edit or remove system users and assign access roles.</p>
        </div>
        <button onClick={startAdd} className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold shadow-sm hover:bg-slate-800 transition-colors mt-2">
          Add User
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2.4fr_1fr] gap-5">
        <div className="bg-white rounded-[22px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-180 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wide text-[11px]">
                <tr>
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold">Role</th>
                  <th className="p-4 font-semibold">Email</th>
                  <th className="p-4 font-semibold">Phone</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-t border-slate-200 hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-semibold text-slate-800">{u.name}</td>
                    <td className="p-4 text-slate-600">{u.role}</td>
                    <td className="p-4 text-slate-600">{u.email}</td>
                    <td className="p-4 text-slate-600">{u.phone}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => startEdit(u)} className="text-xs font-semibold text-blue-600 mr-3 hover:text-blue-700">Edit</button>
                      <button onClick={() => remove(u.id)} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-[22px] border border-slate-200 shadow-sm p-5">
          <h3 className="text-2xl font-black text-slate-800 mb-4">{editing ? 'Edit User' : 'Add User'}</h3>
          <div className="space-y-3">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="w-full px-3.5 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300" />
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" className="w-full px-3.5 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300" />
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="w-full px-3.5 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300" />
            <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} type="password" placeholder={editing ? 'New password (optional)' : 'Password'} className="w-full px-3.5 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300" />
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as User['role'] })} className="w-full px-3.5 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300">
              <option value="Receptionist">Receptionist</option>
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="Accountant">Accountant</option>
              <option value="Technician">Technician</option>
              <option value="Storekeeper">Storekeeper</option>
            </select>
            <div className="flex gap-3 pt-2">
              <button onClick={save} className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-sm transition-colors">Save</button>
              <button onClick={() => { setEditing(null); resetForm(); }} className="flex-1 px-4 py-3 border border-slate-300 bg-white text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersView;
