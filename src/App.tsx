import React, { useState, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { JobCardModal } from './components/JobCardModal';
import { JobDetailsView } from './components/JobDetailsView';
import { PrintableInvoiceModal } from './components/PrintableInvoiceModal';
import { PrintableQuotationModal } from './components/PrintableQuotationModal';
import { PrintableJobCardModal } from './components/PrintableJobCardModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { QuickAddModal } from './components/QuickAddModal';
import { QuotationApprovalView } from './components/QuotationApprovalView';

// Views
import { DashboardView } from './views/DashboardView';
import { QuotationsView } from './views/QuotationsView';
import { DailyWorkView } from './views/DailyWorkView';
import { CustomersView } from './views/CustomersView';
import { VehiclesView } from './views/VehiclesView';
import { InvoicesView } from './views/InvoicesView';
import { DebtorsView } from './views/DebtorsView';
import { InventoryView } from './views/InventoryView';
import { PriceListView } from './views/PriceListView';
import { RequisitionsView } from './views/RequisitionsView';
import { PaymentsView } from './views/PaymentsView';
import { ExpensesView } from './views/ExpensesView';
import { SuppliersView } from './views/SuppliersView';
import { ReportsView } from './views/ReportsView';
import { AuditLogView } from './views/AuditLogView';
import { SettingsView } from './views/SettingsView';
import { UsersView } from './views/UsersView';

import { UserRole, JobCard, Customer } from './types';
import { db, hydrateSharedData } from './services/db';
import { Login } from './components/Login';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [userRole, setUserRole] = useState<UserRole>('Admin');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Modal States
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [jobToEdit, setJobToEdit] = useState<JobCard | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const [printableInvoiceId, setPrintableInvoiceId] = useState<string | null>(null);
  const [printableQuotationId, setPrintableQuotationId] = useState<string | null>(null);
  const [printableJobCard, setPrintableJobCard] = useState<JobCard | null>(null);
  const [approvalQuotationId, setApprovalQuotationId] = useState<string | null>(null);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<string | null>(null);
  const [vehicleToEditId, setVehicleToEditId] = useState<string | null>(null);
  const [priceListItemToEdit, setPriceListItemToEdit] = useState<any | null>(null);

  // Force re-render state
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshApp = () => setRefreshKey(prev => prev + 1);

  React.useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (!response.ok) return;
        const data = await response.json();
        if (data.user) {
          db.setCurrentUser(data.user);
          await hydrateSharedData();
          setUserRole(data.user.role);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.warn('No active server session.', error);
      }
    };
    restoreSession();
  }, []);

  // Quick Job Open
  const handleOpenNewJobModal = () => {
    setJobToEdit(null);
    setIsJobModalOpen(true);
  };

  const handleEditJobModal = (job: JobCard) => {
    setJobToEdit(job);
    setIsJobModalOpen(true);
  };

  const handleViewJobDetails = (jobId: string) => {
    setSelectedJobId(jobId);
    setActiveTab('job-details');
  };

  const handleGenerateInvoiceFromJob = (jobId: string) => {
    const inv = db.createInvoiceFromJob(jobId);
    if (inv) {
      setPrintableInvoiceId(inv.id);
      refreshApp();
    }
  };

  const handleEditVehicle = (vehicleId: string) => {
    setVehicleToEditId(vehicleId);
    setQuickAddType('vehicle');
  };

  const handleOpenNewVehicle = () => {
    setVehicleToEditId(null);
    setQuickAddType('vehicle');
  };

  const openVehicleEdit = useMemo(() => {
    return vehicleToEditId ? db.getVehicleById(vehicleToEditId) : null;
  }, [vehicleToEditId]);

  const currentUser = db.getCurrentUser();
  const isAdmin = currentUser?.role === 'Admin';

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const quoteId = params.get('approval');
    if (quoteId) {
      setApprovalQuotationId(quoteId);
      setActiveTab('quotations');
    }
  }, []);

  return (
    <div className="app-shell min-h-screen bg-slate-100 flex text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'job-details') setSelectedJobId(null);
          setIsSidebarOpen(false);
        }}
        userRole={userRole}
        onOpenExcelImport={() => {
          setIsExcelImportOpen(true);
          setIsSidebarOpen(false);
        }}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Bar */}
        <Header
          userRole={userRole}
          setUserRole={setUserRole}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenQuickAdd={(type) => setQuickAddType(type)}
          onOpenMobileMenu={() => setIsSidebarOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
          onSignOut={async () => {
            try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch {}
            localStorage.removeItem('eljindi_current_user_v1');
            setIsAuthenticated(false);
          }}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 pt-20 overflow-y-auto">
          {!isAuthenticated && (
            <Login onLogin={async (role: UserRole) => {
              await hydrateSharedData();
              const user = db.getCurrentUser();
              setUserRole(user.role);
              setIsAuthenticated(true);
              refreshApp();
            }} />
          )}
          {isAuthenticated && (
            <>
          {activeTab === 'dashboard' && (
            <DashboardView
              onOpenNewJobModal={handleOpenNewJobModal}
              onViewJobDetails={handleViewJobDetails}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'daily-work' && (
            <DailyWorkView
              onOpenNewJobModal={handleOpenNewJobModal}
              onOpenEditModal={handleEditJobModal}
              onViewJobDetails={handleViewJobDetails}
              onOpenPrintJobCard={(job) => setPrintableJobCard(job)}
              onGenerateInvoice={handleGenerateInvoiceFromJob}
            />
          )}

          {activeTab === 'job-details' && selectedJobId && (
            <JobDetailsView
              jobId={selectedJobId}
              onBack={() => setActiveTab('daily-work')}
              onOpenEditModal={handleEditJobModal}
              onOpenPrintInvoice={(invId) => setPrintableInvoiceId(invId)}
              onOpenPrintJobCard={(job) => setPrintableJobCard(job)}
              userRole={userRole}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersView
              onOpenQuickAdd={(type, customer) => {
                setCustomerToEdit(customer || null);
                setQuickAddType(type);
              }}
              onEditVehicle={handleEditVehicle}
            />
          )}

          {activeTab === 'vehicles' && (
            <VehiclesView
              onOpenQuickAdd={(type) => setQuickAddType(type)}
              onViewJobDetails={handleViewJobDetails}
            />
          )}

          {activeTab === 'quotations' && (
            <QuotationsView
              onOpenPrintQuotation={(qtId) => setPrintableQuotationId(qtId)}
              onViewJobDetails={handleViewJobDetails}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoicesView
              onOpenPrintInvoice={(invId) => setPrintableInvoiceId(invId)}
              onOpenQuickAdd={(type) => setQuickAddType(type)}
            />
          )}

          {activeTab === 'debtors' && (
            <DebtorsView
              onOpenQuickAdd={(type) => setQuickAddType(type)}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView onOpenQuickAdd={(type) => setQuickAddType(type)} />
          )}

          {activeTab === 'price-list' && (
            <PriceListView
              refreshKey={refreshKey}
              onOpenQuickAdd={(type, item) => {
                setQuickAddType(type);
                if (item) setPriceListItemToEdit(item);
              }}
            />
          )}

          {activeTab === 'requisitions' && <RequisitionsView />}

          {activeTab === 'payments' && (
            <PaymentsView
              onOpenQuickAdd={(type) => setQuickAddType(type)}
              refreshKey={refreshKey}
            />
          )}

          {activeTab === 'expenses' && isAdmin && (
            <ExpensesView onOpenQuickAdd={(type) => setQuickAddType(type)} />
          )}

          {activeTab === 'suppliers' && isAdmin && <SuppliersView />}

          {activeTab === 'reports' && isAdmin && <ReportsView />}

          {activeTab === 'audit-log' && isAdmin && <AuditLogView />}

          {activeTab === 'settings' && isAdmin && <SettingsView />}
          {activeTab === 'users' && isAdmin && <UsersView />}
            </>
          )}
        </main>
      </div>

      {/* MODALS */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectJob={(jobId) => {
          setSelectedJobId(jobId);
          setActiveTab('job-details');
        }}
        onSelectCustomer={() => setActiveTab('customers')}
      />

      <JobCardModal
        isOpen={isJobModalOpen}
        onClose={() => setIsJobModalOpen(false)}
        jobToEdit={jobToEdit}
        onSaved={() => refreshApp()}
      />

      {printableInvoiceId && (
        <PrintableInvoiceModal
          invoiceId={printableInvoiceId}
          onClose={() => setPrintableInvoiceId(null)}
        />
      )}

      {printableQuotationId && (
        <PrintableQuotationModal
          quotationId={printableQuotationId}
          onClose={() => setPrintableQuotationId(null)}
        />
      )}

      {approvalQuotationId && (
        <QuotationApprovalView
          quotationId={approvalQuotationId}
          onClose={() => setApprovalQuotationId(null)}
        />
      )}

      {printableJobCard && (
        <PrintableJobCardModal
          job={printableJobCard}
          onClose={() => setPrintableJobCard(null)}
        />
      )}

      <ExcelImportModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        onImportDone={() => refreshApp()}
      />

      {quickAddType && (
        <QuickAddModal
          type={quickAddType}
          isOpen={true}
          onClose={() => {
            setQuickAddType(null);
            setVehicleToEditId(null);
            setCustomerToEdit(null);
            setPriceListItemToEdit(null);
          }}
          onRefresh={() => {
            refreshApp();
            setVehicleToEditId(null);
            setCustomerToEdit(null);
            setPriceListItemToEdit(null);
          }}
          vehicleToEdit={openVehicleEdit}
          customerToEdit={customerToEdit}
          priceListItemToEdit={priceListItemToEdit}
        />
      )}
    </div>
  );
}

export default App;
