import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ToastContainer } from './components/common/ToastContainer';
import { LoginModal } from './components/auth/LoginModal';
const ExecutiveDashboard = lazy(() => import('./components/dashboard/ExecutiveDashboard').then((mod) => ({ default: mod.ExecutiveDashboard })));
const InventoryModule = lazy(() => import('./components/inventory/InventoryModule').then((mod) => ({ default: mod.InventoryModule })));
const POSTerminal = lazy(() => import('./components/pos/POSTerminal').then((mod) => ({ default: mod.POSTerminal })));
const MySalesHistory = lazy(() => import('./components/pos/MySalesHistory').then((mod) => ({ default: mod.MySalesHistory })));
const PurchasingModule = lazy(() => import('./components/purchasing/PurchasingModule').then((mod) => ({ default: mod.PurchasingModule })));
const SuppliersModule = lazy(() => import('./components/suppliers/SuppliersModule').then((mod) => ({ default: mod.SuppliersModule })));
const DebtorsModule = lazy(() => import('./components/debtors/DebtorsModule').then((mod) => ({ default: mod.DebtorsModule })));
const CustomersModule = lazy(() => import('./components/customers/CustomersModule').then((mod) => ({ default: mod.CustomersModule })));
const AccountingModule = lazy(() => import('./components/accounting/AccountingModule').then((mod) => ({ default: mod.AccountingModule })));
const ReportsModule = lazy(() => import('./components/reports/ReportsModule').then((mod) => ({ default: mod.ReportsModule })));
const ImportExportModule = lazy(() => import('./components/import/ImportExportModule').then((mod) => ({ default: mod.ImportExportModule })));
const SettingsModule = lazy(() => import('./components/settings/SettingsModule').then((mod) => ({ default: mod.SettingsModule })));
const UserManagementModule = lazy(() => import('./components/auth/UserManagementModule').then((mod) => ({ default: mod.UserManagementModule })));
const AuditLogModule = lazy(() => import('./components/audit/AuditLogModule').then((mod) => ({ default: mod.AuditLogModule })));
const SystemGuide = lazy(() => import('./components/about/SystemGuide').then((mod) => ({ default: mod.SystemGuide })));
import { SheetCategory } from './types';
import { computeProductStats } from './utils/calculations';
import { Wrench, UserCheck, Lock } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { currentView, setCurrentView, products, showToast } = useApp();
  const { currentUser } = useAuth();

  // Track stock levels to trigger real-time low stock alerts when thresholds are reached
  const prevStockMap = useRef<Record<number, number>>({});
  const initialLoadDone = useRef<boolean>(false);

  useEffect(() => {
    if (!products || products.length === 0) return;

    if (!initialLoadDone.current) {
      // Record initial baseline stock levels
      products.forEach((p) => {
        const stats = computeProductStats(p);
        prevStockMap.current[p.id] = stats.currentStock;
      });
      initialLoadDone.current = true;
      return;
    }

    // Monitor for real-time stock drops below reorder point threshold
    products.forEach((p) => {
      const stats = computeProductStats(p);
      const prevStock = prevStockMap.current[p.id];

      if (prevStock !== undefined && prevStock !== stats.currentStock) {
        const codeText = p.code ? ` (${p.code})` : '';

        // Case 1: Stock completely depleted (Out of stock)
        if (stats.currentStock <= 0 && prevStock > 0) {
          showToast(
            `🚨 OUT OF STOCK: "${p.desc}"${codeText} is now OUT OF STOCK (0 remaining)!`,
            'error'
          );
        }
        // Case 2: Stock crossed below or reached reorder threshold
        else if (stats.currentStock <= p.reorder && prevStock > p.reorder) {
          showToast(
            `⚠️ REORDER ALERT: "${p.desc}"${codeText} stock dropped to ${stats.currentStock} (Reorder Point: ${p.reorder})`,
            'error'
          );
        }
        // Case 3: Stock further decreased while already below reorder point
        else if (stats.currentStock <= p.reorder && stats.currentStock < prevStock) {
          showToast(
            `⚠️ LOW STOCK: "${p.desc}"${codeText} balance decreased to ${stats.currentStock} (Threshold: ${p.reorder})`,
            'error'
          );
        }
      }

      prevStockMap.current[p.id] = stats.currentStock;
    });
  }, [products, showToast]);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden text-slate-900 font-sans">
      {/* Login Screen overlay when logged out */}
      {!currentUser && <LoginModal />}

      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Global Top Header */}
        <Header />

        {/* View Container */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-10 text-sm text-slate-500">
                  Loading module...
                </div>
              }
            >
              {currentView === 'dashboard' && <ExecutiveDashboard />}

              {(currentView === 'filters' || currentView === 'Filters') && <InventoryModule sheet="Filters" />}
              {(currentView === 'brakes' || currentView === 'Brakes') && <InventoryModule sheet="Brakes" />}
              {(currentView === 'accessories' || currentView === 'Accessories') && <InventoryModule sheet="Accessories" />}
              {(currentView === 'oil' || currentView === 'Oil & Fluids') && <InventoryModule sheet="Oil & Fluids" />}

              {currentView === 'pos' && <POSTerminal />}
              {(currentView === 'my-sales' || currentView === 'my_sales') && <MySalesHistory />}
              {currentView === 'purchasing' && <PurchasingModule />}
              {currentView === 'suppliers' && <SuppliersModule />}
              {currentView === 'debtors' && <DebtorsModule />}
              {currentView === 'customers' && <CustomersModule />}
              {currentView === 'accounting' && <AccountingModule />}
              {currentView === 'reports' && <ReportsModule />}
              {(currentView === 'import_export' || currentView === 'import-export') && <ImportExportModule />}
              {currentView === 'users' && <UserManagementModule />}
              {currentView === 'audit' && <AuditLogModule />}
              {currentView === 'settings' && <SettingsModule />}
              {(currentView === 'guide' || currentView === 'about') && <SystemGuide />}
            </Suspense>
          </div>
        </main>
      </div>

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
};


export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <MainAppContent />
      </AppProvider>
    </AuthProvider>
  );
}
