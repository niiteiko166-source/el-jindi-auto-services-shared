import React from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Filter,
  Disc3,
  Boxes,
  Droplets,
  CreditCard,
  Users,
  Truck,
  Building2,
  Receipt,
  BarChart3,
  BarChart2,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { currentView, setCurrentView, reorderCountsBySheet, totalReorderCount } = useApp();
  const { canAccessModule } = useAuth();

  const navItems = [
    { section: 'Overview' },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: 0, module: 'dashboard' },

    { section: 'Point of Sale' },
    { id: 'pos', label: 'New Sale (POS)', icon: ShoppingCart, badge: 0, module: 'pos' },
    { id: 'my-sales', label: 'My Sales History', icon: BarChart2, badge: 0, module: 'pos' },

    { section: 'Inventory Management' },
    { id: 'Filters', label: 'Filters', icon: Filter, badge: reorderCountsBySheet['Filters'] || 0, module: 'filters' },
    { id: 'Brakes', label: 'Brakes', icon: Disc3, badge: reorderCountsBySheet['Brakes'] || 0, module: 'brakes' },
    { id: 'Accessories', label: 'Accessories', icon: Boxes, badge: reorderCountsBySheet['Accessories'] || 0, module: 'accessories' },
    { id: 'Oil & Fluids', label: 'Oil & Fluids', icon: Droplets, badge: reorderCountsBySheet['Oil & Fluids'] || 0, module: 'oil' },

    { section: 'Procurement & Supply' },
    { id: 'purchasing', label: 'Purchasing (PO)', icon: Truck, badge: 0, module: 'purchasing' },
    { id: 'suppliers', label: 'Suppliers', icon: Building2, badge: 0, module: 'suppliers' },

    { section: 'Sales & Accounts' },
    { id: 'debtors', label: 'Debtors (AR)', icon: CreditCard, badge: 0, module: 'debtors' },
    { id: 'customers', label: 'Customers', icon: Users, badge: 0, module: 'customers' },
    { id: 'accounting', label: 'Cashbook & P&L', icon: Receipt, badge: 0, module: 'accounting' },

    { section: 'Intelligence & Tools' },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, badge: 0, module: 'reports' },
    { id: 'import-export', label: 'Import / Export', icon: FileSpreadsheet, badge: 0, module: 'reports' },
    { id: 'users', label: 'User & Staff Roles', icon: ShieldCheck, badge: 0, module: 'users' },
    { id: 'audit', label: 'Audit Log & Security', icon: ShieldAlert, badge: 0, module: 'audit' },
    { id: 'settings', label: 'System Settings', icon: Settings, badge: 0, module: 'settings' },

    { section: 'Help' },
    { id: 'about', label: 'System Guide', icon: HelpCircle, badge: 0, module: 'dashboard' }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col flex-shrink-0 h-screen select-none border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="inline-block bg-amber-400 text-slate-950 font-mono font-bold text-xs px-2 py-0.5 rounded tracking-wider mb-2">
          GH · ACCRA
        </div>
        <h1 className="font-extrabold text-lg text-white uppercase tracking-wide leading-tight font-sans">
          El-Jindi Auto
        </h1>
        <p className="text-xs text-slate-400 font-medium">Enterprise Management System</p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
        {navItems.map((item, index) => {
          if (item.section) {
            return (
              <div key={`sec-${index}`} className="px-3 pt-4 pb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                {item.section}
              </div>
            );
          }

          if (!canAccessModule(item.module || '')) return null;

          const Icon = item.icon!;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id!)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge! > 0 && (
                <span className="bg-red-500 text-white font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 leading-tight">
        <div className="flex items-center space-x-1.5 mb-1 text-slate-300 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>System Online</span>
        </div>
        <p className="text-[10px] text-slate-500">Auto-saved to cloud & local state.</p>
      </div>
    </aside>
  );
};
