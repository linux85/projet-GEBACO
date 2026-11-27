import React, { useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  Contact,
  Package,
  ArrowRightLeft,
  Barcode,
  ShoppingBag,
  ShoppingCart,
  FileText,
  Receipt,
  BarChart3,
  BookOpen,
  Settings,
  AlertCircle,
  ClipboardCheck,
  HardDrive,
  Database,
  CalendarDays,
  X,
  MapPin,
  Globe,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen = false,
  onClose = () => {},
}) => {
  const {
    state,
    currentBusiness,
    currentUser,
    paymentAlerts,
    lowStockAlerts,
    hasPermission,
    isFirebaseAdmin,
    setLocationId,
    setLanguage,
  } = useERP();

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const hasAllLocationsAccess =
    !currentUser?.locationIds ||
    currentUser.locationIds.length === 0 ||
    currentUser.locationIds.includes('all');

  const currentLocationsForBiz = (state.locations || []).filter(
    (l) =>
      l &&
      l.businessId === currentBusiness?.id &&
      (hasAllLocationsAccess || currentUser.locationIds.includes(l.id))
  );

  const activeInventoriesCount = (state.stockInventories || []).filter(
    (i) => i.businessId === currentBusiness.id && i.status === 'in_progress'
  ).length;

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: LayoutDashboard,
      perm: 'view_reports' as const,
    },
    {
      id: 'pos',
      label: 'Point de Vente (POS)',
      icon: ShoppingCart,
      perm: 'access_pos' as const,
      badge: 'POS',
      badgeColor: 'bg-emerald-600 text-white',
    },
    {
      id: 'products',
      label: 'Produits & Stocks',
      icon: Package,
      perm: 'view_products' as const,
      badge: lowStockAlerts.length > 0 ? `${lowStockAlerts.length}` : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'inventory',
      label: 'Inventaires Physiques',
      icon: ClipboardCheck,
      perm: 'adjust_stock' as const,
      badge: activeInventoriesCount > 0 ? `${activeInventoriesCount}` : undefined,
      badgeColor: 'bg-emerald-600 text-white',
    },
    {
      id: 'stock_adjustments',
      label: 'Transferts & Suivi Stock',
      icon: ArrowRightLeft,
      perm: 'adjust_stock' as const,
    },
    {
      id: 'barcodes',
      label: 'Étiquettes Code-barres',
      icon: Barcode,
      perm: 'print_barcodes' as const,
    },
    {
      id: 'purchases',
      label: 'Achats & Fournisseurs',
      icon: ShoppingBag,
      perm: 'view_purchases' as const,
      badge: paymentAlerts.filter((a) => a.type === 'purchase_due').length > 0 ? 'Alerte' : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'sales',
      label: 'Ventes & Devis',
      icon: FileText,
      perm: 'view_sales' as const,
    },
    {
      id: 'daily_sales',
      label: 'Suivi Journalier Ventes',
      icon: CalendarDays,
      perm: 'view_sales' as const,
      badge: 'Jour',
      badgeColor: 'bg-emerald-950 text-emerald-300 border border-emerald-800',
    },
    {
      id: 'contacts',
      label: 'Contacts & Clientèle',
      icon: Contact,
      perm: 'view_contacts' as const,
    },
    {
      id: 'expenses',
      label: 'Gestion des Dépenses',
      icon: Receipt,
      perm: 'view_expenses' as const,
    },
    {
      id: 'reports',
      label: 'Rapports & Analyses',
      icon: BarChart3,
      perm: 'view_reports' as const,
    },
    {
      id: 'businesses',
      label: 'Magasins & Locaux',
      icon: Building2,
      perm: 'manage_businesses' as const,
    },
    {
      id: 'users',
      label: 'Utilisateurs & Rôles',
      icon: Users,
      perm: 'manage_users' as const,
    },
    {
      id: 'database',
      label: 'Base de Données Firestore',
      icon: Database,
      perm: 'manage_settings' as const,
      firebaseAdminOnly: true,
      badge: 'Cloud',
      badgeColor: 'bg-emerald-950 text-emerald-300 border border-emerald-800',
    },
    {
      id: 'storage',
      label: 'Fichiers & Cloud Storage',
      icon: HardDrive,
      perm: undefined,
      badge: 'Firebase',
      badgeColor: 'bg-amber-950 text-amber-400 border border-amber-800',
    },
    {
      id: 'documentation',
      label: 'Guide & Doc ERP',
      icon: BookOpen,
      perm: undefined,
    },
    {
      id: 'settings',
      label: 'Paramètres Système',
      icon: Settings,
      perm: 'manage_settings' as const,
    },
  ];

  const handleSelectTab = (id: string) => {
    setActiveTab(id);
    onClose();
  };

  return (
    <>
      {/* Mobile / Tablet Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white border-r border-slate-200 flex flex-col justify-between select-none shrink-0 shadow-xl lg:shadow-xs transform transition-transform duration-200 ease-out lg:static lg:translate-x-0 lg:w-64 lg:min-h-[calc(100vh-57px)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Navigation principale"
      >
        {/* Mobile Drawer Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 lg:hidden">
          <div className="min-w-0">
            <div className="text-xs font-extrabold text-slate-900 truncate">
              {currentBusiness.name}
            </div>
            <div className="text-[11px] text-slate-500">Navigation ERP</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Mobile/Tablet Quick Switchers (Location & Language) */}
          <div className="lg:hidden mb-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div>
              <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                <MapPin className="w-3 h-3 text-blue-600" />
                <span>Emplacement actif</span>
              </label>
              <select
                value={state.currentLocationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full min-h-[44px] bg-white border border-slate-300 text-slate-800 rounded-lg px-2.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {hasAllLocationsAccess && (
                  <option value="all">Tous les emplacements</option>
                )}
                {currentLocationsForBiz.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setLanguage(state.language === 'fr' ? 'en' : 'fr')}
              className="w-full min-h-[44px] flex items-center justify-between px-3 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold"
            >
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-500" />
                <span>Langue de l’interface</span>
              </span>
              <span className="font-bold text-blue-600">{state.language.toUpperCase()}</span>
            </button>
          </div>

          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Menu Principal ERP
          </div>

          {menuItems.map((item) => {
            if ((item as any).firebaseAdminOnly && !isFirebaseAdmin) {
              return null;
            }
            if (item.perm && !hasPermission(item.perm)) {
              return null;
            }

            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 min-h-[44px] py-2.5 rounded-lg text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm font-bold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center space-x-2 text-[11px] text-slate-500">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">GEBACO ERP v2.0</span>
          </div>
        </div>
      </aside>
    </>
  );
};
