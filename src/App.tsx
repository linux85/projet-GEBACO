import React, { useState, useEffect } from 'react';
import { ERPProvider } from './context/ERPContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { POSInterface } from './components/sales/POSInterface';
import { ProductManager } from './components/products/ProductManager';
import { ContactManager } from './components/contacts/ContactManager';
import { PurchaseManager } from './components/purchases/PurchaseManager';
import { SaleManager } from './components/sales/SaleManager';
import { ExpenseManager } from './components/expenses/ExpenseManager';
import { ReportManager } from './components/reports/ReportManager';
import { DailySalesTracker } from './components/reports/DailySalesTracker';
import { BusinessManager } from './components/businesses/BusinessManager';
import { UserManager } from './components/users/UserManager';
import { DocumentationView } from './components/documentation/DocumentationView';
import { NotificationsModal } from './components/common/NotificationsModal';
import { StockAdjustmentModal } from './components/products/StockAdjustmentModal';
import { StockTransferModal } from './components/products/StockTransferModal';
import { StockMovementView } from './components/products/StockMovementView';
import { StockInventoryManager } from './components/inventory/StockInventoryManager';
import { BarcodeGeneratorModal } from './components/products/BarcodeGeneratorModal';
import { FirebaseStorageExplorer } from './components/common/FirebaseStorageExplorer';
import { FirestoreDatabaseView } from './components/database/FirestoreDatabaseView';
import { LoginPage } from './components/auth/LoginPage';
import { InactivityWarningModal } from './components/auth/InactivityWarningModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useERP } from './context/ERPContext';
import { useIdleTimeout } from './hooks/useIdleTimeout';

const MainAppContent: React.FC = () => {
  const {
    state,
    currentBusiness,
    currentRole,
    hasPermission,
    isFirebaseAdmin,
    logout,
    idleTimeoutMs,
    warningLeadMs,
  } = useERP();

  const getDefaultTabForUser = (): string => {
    if (hasPermission('view_reports')) return 'dashboard';
    if (hasPermission('access_pos')) return 'pos';
    if (hasPermission('view_products')) return 'products';
    if (hasPermission('view_purchases')) return 'purchases';
    if (hasPermission('view_sales')) return 'sales';
    if (hasPermission('view_contacts')) return 'contacts';
    if (hasPermission('view_expenses')) return 'expenses';
    if (hasPermission('adjust_stock')) return 'stock_adjustments';
    if (hasPermission('print_barcodes')) return 'barcodes';
    if (hasPermission('manage_businesses')) return 'businesses';
    if (hasPermission('manage_users')) return 'users';
    if (hasPermission('manage_settings')) return 'settings';
    return 'documentation';
  };

  const canAccessTab = (tab: string): boolean => {
    switch (tab) {
      case 'dashboard':
      case 'reports':
        return hasPermission('view_reports');
      case 'pos':
        return hasPermission('access_pos');
      case 'products':
        return hasPermission('view_products');
      case 'inventory':
      case 'stock_adjustments':
        return hasPermission('adjust_stock');
      case 'barcodes':
        return hasPermission('print_barcodes');
      case 'purchases':
        return hasPermission('view_purchases');
      case 'sales':
      case 'daily_sales':
        return hasPermission('view_sales');
      case 'contacts':
        return hasPermission('view_contacts');
      case 'expenses':
        return hasPermission('view_expenses');
      case 'businesses':
        return hasPermission('manage_businesses');
      case 'users':
        return hasPermission('manage_users');
      case 'database':
        return isFirebaseAdmin && hasPermission('manage_settings');
      case 'settings':
        return hasPermission('manage_settings');
      case 'storage':
      case 'documentation':
        return true;
      default:
        return false;
    }
  };

  const [activeTab, setActiveTab] = useState<string>(() => getDefaultTabForUser());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [activeStockAdjProduct, setActiveStockAdjProduct] = useState<any>(null);
  const [activeBarcodeProduct, setActiveBarcodeProduct] = useState<any>(null);

  // Route user to their authorized landing page when logging in or switching user/role
  useEffect(() => {
    if (!state.isAuthenticated) return;
    setActiveTab(getDefaultTabForUser());
  }, [state.currentUserId, state.isAuthenticated]);

  // Guard against role permission changes while already authenticated
  useEffect(() => {
    if (!state.isAuthenticated) return;
    if (!canAccessTab(activeTab)) {
      setActiveTab(getDefaultTabForUser());
    }
  }, [activeTab, currentRole, isFirebaseAdmin, state.isAuthenticated]);

  const handleOpenStockAdj = () => {
    const firstProduct = (state.products || []).find((p) => p && p.businessId === currentBusiness?.id);
    if (firstProduct) {
      setActiveStockAdjProduct(firstProduct);
    } else {
      alert('Veuillez créer au moins un produit avant d’ajuster le stock.');
    }
  };

  const handleOpenBarcodeGen = () => {
    const firstProduct = (state.products || []).find((p) => p && p.businessId === currentBusiness?.id);
    if (firstProduct) {
      setActiveBarcodeProduct(firstProduct);
    } else {
      alert('Veuillez créer au moins un produit avant d’imprimer des codes-barres.');
    }
  };

  const {
    isWarningOpen,
    remainingSeconds,
    warningLeadSeconds,
    isRenewing,
    stayConnected,
  } = useIdleTimeout({
    enabled: state.isAuthenticated,
    idleTimeoutMs,
    warningLeadMs,
    onTimeout: (message) => logout(message),
  });

  // Synchronize SPA URL with /login when unauthenticated and / when authenticated
  useEffect(() => {
    if (!state.isAuthenticated) {
      if (window.location.pathname !== '/login') {
        window.history.pushState(null, '', '/login');
      }
    } else if (window.location.pathname === '/login') {
      window.history.replaceState(null, '', '/');
    }
  }, [state.isAuthenticated]);

  if (!state.isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white overflow-x-clip">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openNewBusinessModal={() => setActiveTab('businesses')}
        onOpenNotifications={() => setShowNotifications(true)}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
      />

      <div className="flex flex-1 min-w-0 relative">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-white">
          {activeTab === 'dashboard' && canAccessTab('dashboard') && (
            <DashboardOverview setActiveTab={setActiveTab} onNavigateTab={setActiveTab} />
          )}
          {activeTab === 'pos' && canAccessTab('pos') && <POSInterface />}
          {activeTab === 'products' && canAccessTab('products') && <ProductManager />}
          {activeTab === 'inventory' && canAccessTab('inventory') && <StockInventoryManager />}
          {activeTab === 'stock_adjustments' && canAccessTab('stock_adjustments') && <StockMovementView />}
          {activeTab === 'barcodes' && canAccessTab('barcodes') && (
            <div className="p-3 sm:p-6">
              <ProductManager />
            </div>
          )}
          {activeTab === 'purchases' && canAccessTab('purchases') && <PurchaseManager />}
          {activeTab === 'sales' && canAccessTab('sales') && <SaleManager />}
          {activeTab === 'daily_sales' && canAccessTab('daily_sales') && (
            <div className="p-3 sm:p-6">
              <DailySalesTracker />
            </div>
          )}
          {activeTab === 'contacts' && canAccessTab('contacts') && <ContactManager />}
          {activeTab === 'expenses' && canAccessTab('expenses') && <ExpenseManager />}
          {activeTab === 'reports' && canAccessTab('reports') && <ReportManager />}
          {activeTab === 'businesses' && canAccessTab('businesses') && <BusinessManager />}
          {activeTab === 'users' && canAccessTab('users') && <UserManager />}
          {activeTab === 'database' && canAccessTab('database') && <FirestoreDatabaseView />}
          {activeTab === 'storage' && <FirebaseStorageExplorer />}
          {activeTab === 'documentation' && <DocumentationView />}
          {activeTab === 'settings' && canAccessTab('settings') && <BusinessManager />}
        </main>
      </div>

      {showNotifications && (
        <NotificationsModal
          onClose={() => setShowNotifications(false)}
          onNavigateTab={setActiveTab}
        />
      )}

      {activeStockAdjProduct && (
        <StockAdjustmentModal
          product={activeStockAdjProduct}
          onClose={() => setActiveStockAdjProduct(null)}
        />
      )}

      {activeBarcodeProduct && (
        <BarcodeGeneratorModal
          product={activeBarcodeProduct}
          onClose={() => setActiveBarcodeProduct(null)}
        />
      )}

      <InactivityWarningModal
        isOpen={isWarningOpen}
        remainingSeconds={remainingSeconds}
        totalWarningSeconds={warningLeadSeconds}
        isRenewing={isRenewing}
        onStayConnected={stayConnected}
        onLogoutNow={() => logout()}
      />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ERPProvider>
        <MainAppContent />
      </ERPProvider>
    </ErrorBoundary>
  );
}
