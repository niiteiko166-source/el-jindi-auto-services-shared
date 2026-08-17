import React, { useState } from 'react';
import {
  Wrench,
  LayoutDashboard,
  ClipboardList,
  Users,
  Car,
  Calendar,
  FileText,
  Receipt,
  Package,
  Tag,
  FileCheck,
  CreditCard,
  TrendingDown,
  Truck,
  BarChart3,
  ShieldCheck,
  Settings,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles
} from 'lucide-react';
import { UserRole } from '../types';
import { BrandLogo } from './BrandLogo';

interface SidebarProps {
  currentTab?: string;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  setActiveTab?: (tab: string) => void;
  collapsed?: boolean;
  isOpen?: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
  userRole?: UserRole;
  onOpenImportModal?: () => void;
  onOpenExcelImport?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  activeTab,
  onSelectTab,
  setActiveTab,
  collapsed,
  isOpen,
  onToggleCollapse,
  onClose,
  userRole = 'Admin',
  onOpenImportModal,
  onOpenExcelImport,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = collapsed !== undefined ? collapsed : internalCollapsed;
  const handleToggle = onToggleCollapse || (() => setInternalCollapsed(prev => !prev));
  const isSidebarOpen = isOpen ?? false;

  const selectedTab = activeTab || currentTab || 'dashboard';
  const handleSelectTab = onSelectTab || setActiveTab || (() => {});
  const handleOpenImport = onOpenImportModal || onOpenExcelImport || (() => {});
  const menuGroups = [
    {
      title: 'OPERATIONS',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'daily-work', label: 'Daily Work', icon: ClipboardList, badge: 'Core' },
        { id: 'customers', label: 'Customers', icon: Users },
        { id: 'vehicles', label: 'Vehicles', icon: Car },
        { id: 'bookings', label: 'Bookings', icon: Calendar },
      ],
    },
    {
      title: 'DOCUMENTS',
      items: [
        { id: 'quotations', label: 'Quotations', icon: FileText },
        { id: 'invoices', label: 'Invoices', icon: Receipt },
      ],
    },
    {
      title: 'STOCK & PARTS',
      items: [
        { id: 'inventory', label: 'Inventory', icon: Package },
        { id: 'price-list', label: 'Price List', icon: Tag },
        { id: 'requisitions', label: 'Requisitions', icon: FileCheck },
      ],
    },
    {
      title: 'FINANCIALS',
      items: [
        { id: 'payments', label: 'Payments', icon: CreditCard },
        { id: 'debtors', label: 'Debtors', icon: AlertCircle },
        { id: 'expenses', label: 'Expenses', icon: TrendingDown },
        { id: 'suppliers', label: 'Suppliers', icon: Truck },
      ],
    },
    {
      title: 'INSIGHTS & SYSTEM',
      items: [
        { id: 'users', label: 'Users', icon: Users },
        { id: 'reports', label: 'Reports', icon: BarChart3 },
        { id: 'audit-log', label: 'Audit Log', icon: ShieldCheck },
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  const canShowItem = (itemId: string) => {
    // Admin sees everything; other roles have a reduced menu
    if (userRole === 'Admin') return true;
    // Always allow receptionist and accountant access to Payments, Invoices, and Debtors
    if (['payments', 'invoices', 'debtors'].includes(itemId)) return true;
    // Admin-only items (now includes 'users')
    const adminOnly = new Set(['users', 'reports', 'audit-log', 'settings', 'suppliers', 'expenses']);
    return !adminOnly.has(itemId);
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-900 text-slate-100 transition-transform duration-300 border-r border-slate-800 shrink-0 md:static md:h-screen ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        {/* Brand Header */}
        <div className="h-20 px-3 flex items-center justify-between border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center overflow-hidden w-full">
            {!isCollapsed && (
              <div className="w-full">
                <div className="flex items-center justify-center -mt-1">
                  <BrandLogo compact className="scale-[0.68] origin-left" />
                </div>
              </div>
            )}
            {isCollapsed && (
              <div className="w-full flex items-center justify-center">
                <div className="h-10 w-10 rounded-xl bg-red-600 flex items-center justify-center shrink-0 shadow-lg shadow-red-600/30">
                  <Wrench className="w-5 h-5 text-white" />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggle}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Close navigation"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
          {menuGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {!isCollapsed && (
                <h3 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {group.title}
                </h3>
              )}
              {group.items.filter(it => canShowItem(it.id)).map((item) => {
                const Icon = item.icon;
                const isActive = selectedTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                    {!isCollapsed && item.badge && (
                      <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Excel Importer Trigger Banner */}
          {userRole === 'Admin' && (
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={handleOpenImport}
                className={`w-full flex items-center justify-center gap-2 p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/50 hover:border-emerald-400 text-xs font-semibold transition-all ${
                  isCollapsed ? 'px-2' : ''
                }`}
                title="Import Excel records (Income.xlsx, Price List.xlsx, Customers, Invoices)"
              >
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                {!isCollapsed && <span>Import Excel Data</span>}
              </button>
            </div>
          )}
        </div>

        {/* User Role Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0">
              {userRole.substring(0, 2).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-slate-200 truncate">Role: {userRole}</span>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Workshop Active
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
