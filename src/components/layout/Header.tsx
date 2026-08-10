import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Product, UserRole } from '../../types';
import { computeProductStats, formatCurrency } from '../../utils/calculations';
import { QuickProductInspectorModal } from '../inventory/QuickProductInspectorModal';
import { UserManagementModal } from '../auth/UserManagementModal';
import { QuickSaleModal } from '../pos/QuickSaleModal';
import { SalesLogModal } from '../pos/SalesLogModal';
import {
  Search,
  Bell,
  UserCircle,
  RefreshCw,
  ShieldAlert,
  Store,
  Package,
  ArrowRight,
  LogOut,
  Users,
  X,
  ExternalLink,
  MapPin,
  Sparkles,
  Zap,
  BarChart2
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    searchTerm,
    setSearchTerm,
    products,
    settings,
    totalReorderCount,
    refreshData,
    loading
  } = useApp();

  const { currentUser, switchRole, users, logout } = useAuth();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showUserMgmtModal, setShowUserMgmtModal] = useState(false);
  const [showQuickSaleModal, setShowQuickSaleModal] = useState(false);
  const [showSalesLogModal, setShowSalesLogModal] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [inspectedProduct, setInspectedProduct] = useState<Product | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Filter global products for SKU search dropdown matches
  const searchMatches = React.useMemo(() => {
    if (!searchTerm || searchTerm.trim().length < 1) return [];
    const q = searchTerm.trim().toLowerCase();
    return (products || [])
      .filter((p) => {
        const code = (p.code || '').toLowerCase();
        const desc = (p.desc || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        const barcode = (p.barcode || '').toLowerCase();
        const location = (p.location || '').toLowerCase();
        const sheet = (p.sheet || '').toLowerCase();

        return (
          code.includes(q) ||
          desc.includes(q) ||
          cat.includes(q) ||
          barcode.includes(q) ||
          location.includes(q) ||
          sheet.includes(q)
        );
      })
      .slice(0, 8); // top 8 matches
  }, [searchTerm, products]);

  // Close search popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectProduct = (p: Product) => {
    setIsSearchFocused(false);
    setInspectedProduct(p);
  };

  const handleJumpToSheet = (sheet: string, codeOrDesc: string) => {
    setCurrentView(sheet);
    setSearchTerm(codeOrDesc);
    setIsSearchFocused(false);
  };

  const getPageTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return { title: 'Executive Dashboard', sub: 'Real-time Business Intelligence & Operations Overview' };
      case 'pos':
        return { title: 'Point of Sale (POS)', sub: 'Fast Barcode Checkout & Sale Terminal' };
      case 'Filters':
      case 'Brakes':
      case 'Accessories':
      case 'Oil & Fluids':
        return { title: `Inventory Schedule: ${currentView}`, sub: 'Comprehensive OEM Parts Catalog & Stock Levels' };
      case 'purchasing':
        return { title: 'Purchasing & Stock Inward', sub: 'Purchase Orders & Supplier Goods Receipts' };
      case 'suppliers':
        return { title: 'Supplier Directory', sub: 'Accounts Payable & Supplier Performance' };
      case 'debtors':
        return { title: 'Debtors & Accounts Receivable', sub: 'Customer Credit Invoices, Payment Tracking & Aging' };
      case 'customers':
        return { title: 'Customer Accounts', sub: 'Accounts Directory & Customer Statements' };
      case 'accounting':
        return { title: 'Cashbook & Financials', sub: 'Real-Time Expenses, Sales Ledger & Profit & Loss' };
      case 'reports':
        return { title: 'Reports & Analytics', sub: 'Sales Trends, Fast/Slow Movers & Valuation Reports' };
      case 'import-export':
        return { title: 'Bulk Import & Export', sub: 'Excel / CSV Product & Debtor Data Upload' };
      case 'settings':
        return { title: 'System Configuration', sub: 'Company Information, VAT & System Settings' };
      case 'about':
        return { title: 'System Documentation', sub: 'User Manual & Operational Guidelines' };
      default:
        return { title: 'El-Jindi Auto Services', sub: 'Enterprise Management System' };
    }
  };

  const pageInfo = getPageTitle();

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-xs sticky top-0 z-30">
        {/* Title & Subtitle */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            {pageInfo.title}
          </h2>
          <p className="text-xs text-slate-500 font-medium">{pageInfo.sub}</p>
        </div>

        {/* Global SKU / Product Search Bar */}
        <div ref={searchContainerRef} className="relative w-96 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-blue-600" />
            <input
              type="text"
              value={searchTerm}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsSearchFocused(true);
              }}
              placeholder="Global SKU, OEM code, part desc, location..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Real-time SKU Search Dropdown */}
          {isSearchFocused && searchTerm.trim().length > 0 && (
            <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-50 divide-y divide-slate-100 animate-in fade-in duration-150">
              <div className="bg-slate-100 px-3 py-1.5 text-[10px] font-extrabold uppercase text-slate-500 flex items-center justify-between">
                <span>Global SKU Matches ({searchMatches.length})</span>
                <span className="text-blue-700">Click row to inspect / jump</span>
              </div>

              {searchMatches.length > 0 ? (
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {searchMatches.map((p) => {
                    const stats = computeProductStats(p);
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelectProduct(p)}
                        className="p-2.5 hover:bg-blue-50/70 cursor-pointer transition-colors flex items-center justify-between group"
                      >
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-extrabold text-blue-700 text-xs group-hover:underline">
                              {p.code || 'NO SKU'}
                            </span>
                            <span className="bg-slate-100 text-slate-700 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase border border-slate-200">
                              {p.sheet}
                            </span>
                            {p.location && (
                              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5 text-blue-500" />
                                {p.location}
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-slate-900 truncate">{p.desc}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{p.category}</div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-emerald-700 font-mono">
                            {formatCurrency(p.sell)}
                          </div>
                          <div className="mt-0.5">
                            {stats.status === 'OK' ? (
                              <span className="bg-emerald-100 text-emerald-800 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full">
                                {stats.currentStock} in stock
                              </span>
                            ) : (
                              <span className="bg-red-100 text-red-800 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                                Low: {stats.currentStock}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-500">
                  No matching parts found for "<span className="font-bold">{searchTerm}</span>"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Actions & Profile */}
        <div className="flex items-center space-x-2.5">
          {/* Quick Sales Log Button */}
          <button
            onClick={() => setShowSalesLogModal(true)}
            className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-white font-extrabold px-2.5 py-1.5 rounded-lg text-xs shadow-xs transition-all border border-slate-700"
            title="Open Sales Rep Daily Sales Log"
          >
            <BarChart2 className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Sales Log</span>
          </button>

          {/* Quick Sale Express Button */}
          <button
            onClick={() => setShowQuickSaleModal(true)}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow-md transition-all animate-pulse hover:animate-none"
            title="Open Quick Sale Express Terminal"
          >
            <Zap className="w-3.5 h-3.5 fill-current text-amber-300" />
            <span>Quick Sale</span>
          </button>

          {/* Branch / Store Badge */}
          <div className="hidden lg:flex items-center space-x-1.5 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-semibold border border-slate-200">
            <Store className="w-3.5 h-3.5 text-blue-600" />
            <span>{settings.branch || 'Accra Main'}</span>
          </div>

          {/* Refresh Data Button */}
          <button
            onClick={() => refreshData()}
            disabled={loading}
            title="Refresh Data"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {/* Low Stock Alert Bell */}
          <div className="relative">
            <div className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors">
              <Bell className="w-4 h-4" />
              {totalReorderCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white font-mono text-[9px] font-bold px-1 py-0.2 rounded-full animate-bounce">
                  {totalReorderCount}
                </span>
              )}
            </div>
          </div>

          {/* User Profile & Role Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-800 transition-colors shadow-2xs"
            >
              <UserCircle className="w-4 h-4 text-blue-600" />
              <div className="text-left">
                <div className="font-bold text-slate-900 leading-tight">
                  {currentUser ? currentUser.name : 'Logged Out'}
                </div>
                <div className="text-[10px] text-blue-600 font-mono font-semibold">
                  {currentUser ? currentUser.role : 'GUEST'}
                </div>
              </div>
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl py-1.5 z-40 divide-y divide-slate-100">
                {/* Admin user management quick access */}
                {currentUser?.role === 'ADMIN' && (
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setShowRoleMenu(false);
                        setShowUserMgmtModal(true);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 rounded-lg flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span>Manage Staff Users & Roles</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Role Switcher */}
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Quick Role Switch:
                  </div>
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchRole(u.role as UserRole);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                        currentUser?.role === u.role ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{u.name}</div>
                        <div className="text-[10px] text-slate-400">{u.role}</div>
                      </div>
                      {currentUser?.role === u.role && <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                  ))}
                </div>

                {/* Sign Out / Lock Session */}
                <div className="p-1">
                  <button
                    onClick={() => {
                      setShowRoleMenu(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg flex items-center space-x-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-red-600" />
                    <span>Lock Session / Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Quick Product Inspector Modal */}
      <QuickProductInspectorModal
        product={inspectedProduct}
        isOpen={!!inspectedProduct}
        onClose={() => setInspectedProduct(null)}
        onJumpToSheet={handleJumpToSheet}
      />

      {/* Staff User & Role Management Modal */}
      <UserManagementModal
        isOpen={showUserMgmtModal}
        onClose={() => setShowUserMgmtModal(false)}
      />

      {/* Quick Sale Express Modal */}
      <QuickSaleModal
        isOpen={showQuickSaleModal}
        onClose={() => setShowQuickSaleModal(false)}
      />

      {/* Sales Rep Daily Sales Log Modal */}
      <SalesLogModal
        isOpen={showSalesLogModal}
        onClose={() => setShowSalesLogModal(false)}
      />
    </>
  );
};

