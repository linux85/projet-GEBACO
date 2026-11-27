import React, { useState, useRef, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  MapPin,
  User,
  Bell,
  ShoppingCart,
  Globe,
  Plus,
  ShieldCheck,
  CheckCircle2,
  LogOut,
  Database,
  RefreshCw,
  HardDrive,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { NotificationsModal } from '../common/NotificationsModal';
import { FirestoreDatabaseModal } from '../common/FirestoreDatabaseModal';
import { isFirebaseAdminAccount } from '../../lib/firebase';
import gebacoLogo from '../../assets/images/logo_gebaco_1788877200494.jpg';

interface HeaderProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  openNewBusinessModal?: () => void;
  onOpenNotifications?: () => void;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab = 'dashboard',
  setActiveTab = (_tab: string) => {},
  openNewBusinessModal = () => {},
  isMobileMenuOpen = false,
  onToggleMobileMenu,
}) => {
  const {
    state,
    currentBusiness,
    currentLocation,
    currentUser,
    currentRole,
    paymentAlerts,
    lowStockAlerts,
    cloudSyncStatus,
    setBusinessId,
    setLocationId,
    setUserId,
    setLanguage,
    logout,
    hasPermission,
    isFirebaseAdmin,
  } = useERP();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showFirestoreModal, setShowFirestoreModal] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<'business' | 'location' | 'user' | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const totalAlertsCount = (paymentAlerts?.length || 0) + (lowStockAlerts?.length || 0);

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

  return (
    <>
      <header
        ref={headerRef}
        className="sticky top-0 z-30 flex items-center justify-between gap-2 bg-white text-slate-800 px-2.5 sm:px-4 py-2 border-b border-slate-200 shadow-xs min-h-[56px]"
      >
        {/* Left: Mobile Burger + Logo + Business/Location Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onToggleMobileMenu && (
            <button
              type="button"
              onClick={onToggleMobileMenu}
              aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={isMobileMenuOpen}
              className="lg:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors shrink-0"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          {/* Logo Officiel JEBACO */}
          <div className="flex items-center shrink-0">
            <img
              src={gebacoLogo}
              alt="Logo JEBACO Quincaillerie Générale"
              className="h-7 sm:h-8 w-auto max-w-[88px] sm:max-w-[150px] object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('logo-gebaco.png')) {
                  target.src = '/logo-gebaco.png';
                }
              }}
            />
          </div>

          {/* Business Selector (Click-toggle for touch & desktop) */}
          <div className="relative min-w-0">
            <button
              type="button"
              onClick={() => setOpenDropdown((prev) => (prev === 'business' ? null : 'business'))}
              className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 px-2 sm:px-3 min-h-[44px] lg:min-h-[36px] rounded-md border border-slate-200 text-xs font-medium cursor-pointer transition-colors text-slate-700"
              aria-expanded={openDropdown === 'business'}
            >
              <span className="hidden sm:inline text-slate-400 shrink-0">Commerce:</span>
              <span className="text-slate-800 font-semibold max-w-[78px] sm:max-w-[140px] truncate">
                {currentBusiness.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {openDropdown === 'business' && (
              <div className="absolute left-0 top-full mt-1.5 w-64 max-w-[calc(100vw-1.25rem)] bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-1.5">
                <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Vos Entreprises
                </div>
                {state.businesses.map((biz) => (
                  <button
                    key={biz.id}
                    type="button"
                    onClick={() => {
                      setBusinessId(biz.id);
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3 min-h-[44px] lg:min-h-[36px] rounded-md text-xs flex items-center justify-between ${
                      biz.id === currentBusiness.id
                        ? 'bg-blue-600 text-white font-medium'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="truncate">{biz.name}</span>
                    {biz.id === currentBusiness.id && <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />}
                  </button>
                ))}
                <div className="border-t border-slate-200 my-1"></div>
                <button
                  type="button"
                  onClick={() => {
                    openNewBusinessModal();
                    setOpenDropdown(null);
                  }}
                  className="w-full text-left px-3 min-h-[44px] lg:min-h-[36px] text-xs text-blue-600 hover:bg-slate-50 rounded-md flex items-center space-x-1.5 font-medium"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>Ajouter une entreprise</span>
                </button>
              </div>
            )}
          </div>

          {/* Location Selector */}
          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setOpenDropdown((prev) => (prev === 'location' ? null : 'location'))}
              className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 px-3 min-h-[44px] lg:min-h-[36px] rounded-md border border-slate-200 text-xs font-medium cursor-pointer transition-colors text-slate-700"
              aria-expanded={openDropdown === 'location'}
            >
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="hidden lg:inline text-slate-400">Lieu:</span>
              <span className="text-slate-800 font-semibold max-w-[130px] truncate">
                {currentLocation ? currentLocation.name : 'Tous les emplacements'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {openDropdown === 'location' && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-1.5">
                <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Emplacements de {currentBusiness.name}
                </div>
                {hasAllLocationsAccess && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocationId('all');
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3 min-h-[40px] rounded-md text-xs flex items-center justify-between ${
                      state.currentLocationId === 'all'
                        ? 'bg-blue-600 text-white font-medium'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span>Tous les emplacements</span>
                    {state.currentLocationId === 'all' && <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />}
                  </button>
                )}
                {currentLocationsForBiz.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      setLocationId(loc.id);
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3 min-h-[40px] rounded-md text-xs flex items-center justify-between ${
                      loc.id === state.currentLocationId
                        ? 'bg-blue-600 text-white font-medium'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="truncate">{loc.name}</span>
                    {loc.id === state.currentLocationId && <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick POS Button */}
          {hasPermission('access_pos') && (
            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 min-h-[44px] lg:min-h-[36px] rounded-md font-semibold text-xs transition-all shadow-sm whitespace-nowrap shrink-0 ${
                activeTab === 'pos'
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
              title="Ouvrir le Point de Vente (POS)"
            >
              <ShoppingCart className="w-4 h-4 text-white shrink-0" />
              <span className="sm:hidden">POS</span>
              <span className="hidden sm:inline">Point de Vente (POS)</span>
            </button>
          )}

          {/* Notifications Bell */}
          <button
            type="button"
            onClick={() => setShowNotifications(true)}
            className="relative inline-flex items-center justify-center min-w-[44px] min-h-[44px] lg:min-w-[36px] lg:min-h-[36px] p-2 bg-slate-50 hover:bg-slate-100 rounded-md border border-slate-200 text-slate-600 transition-colors shrink-0"
            title="Alertes & Notifications"
            aria-label="Alertes et notifications"
          >
            <Bell className="w-4 h-4" />
            {totalAlertsCount > 0 && (
              <span className="absolute top-1 right-1 lg:-top-1 lg:-right-1 bg-rose-500 text-white text-[10px] font-extrabold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                {totalAlertsCount}
              </span>
            )}
          </button>

          {/* Firebase Cloud Database Status Badge - Accessible uniquement par l'administrateur Firebase */}
          {isFirebaseAdmin && (
            <button
              type="button"
              onClick={() => setShowFirestoreModal(true)}
              className={`hidden xl:flex items-center space-x-1.5 px-2.5 min-h-[36px] rounded-md text-[11px] font-medium border transition-all whitespace-nowrap shrink-0 ${
                cloudSyncStatus === 'synced'
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                  : cloudSyncStatus === 'syncing'
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : cloudSyncStatus === 'error'
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300'
                  : 'bg-amber-50 text-amber-700 border-amber-300'
              }`}
              title="Ouvrir le gestionnaire de Base de Données Firebase Firestore"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-semibold">
                {cloudSyncStatus === 'synced' && 'Firebase BD'}
                {cloudSyncStatus === 'syncing' && 'Synchro Cloud...'}
                {cloudSyncStatus === 'error' && 'Sync Erreur'}
                {cloudSyncStatus === 'offline' && 'Hors Ligne'}
              </span>
              <RefreshCw
                className={`w-3 h-3 shrink-0 ${
                  cloudSyncStatus === 'syncing' ? 'animate-spin text-emerald-600' : 'text-slate-400'
                }`}
              />
            </button>
          )}

          {/* Firebase Storage Explorer Button */}
          <button
            type="button"
            onClick={() => setActiveTab('storage')}
            className={`hidden xl:flex items-center space-x-1 px-2.5 min-h-[36px] rounded-md text-[11px] font-semibold border transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'storage'
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="Ouvrir le gestionnaire de fichiers Firebase Storage"
          >
            <HardDrive className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Stockage Cloud</span>
          </button>

          {/* Language Switch */}
          <button
            type="button"
            onClick={() => setLanguage(state.language === 'fr' ? 'en' : 'fr')}
            className="hidden md:flex items-center space-x-1 px-2.5 min-h-[44px] lg:min-h-[36px] bg-slate-50 hover:bg-slate-100 rounded-md border border-slate-200 text-slate-700 text-xs font-semibold shrink-0"
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span>{state.language.toUpperCase()}</span>
          </button>

          {/* User & Role Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown((prev) => (prev === 'user' ? null : 'user'))}
              className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 px-2.5 min-h-[44px] lg:min-h-[36px] rounded-md border border-slate-200 cursor-pointer text-slate-700"
              aria-expanded={openDropdown === 'user'}
              aria-label="Profil utilisateur"
            >
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-6 h-6 rounded-full object-cover border border-slate-300 shrink-0"
                />
              ) : (
                <User className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              <div className="hidden md:block text-left leading-tight">
                <div className="text-xs font-bold text-slate-800 max-w-[100px] truncate">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-emerald-600 font-medium flex items-center space-x-0.5">
                  <ShieldCheck className="w-2.5 h-2.5 inline text-emerald-600 shrink-0" />
                  <span className="truncate max-w-[90px]">{currentRole.name}</span>
                </div>
              </div>
            </button>

            {openDropdown === 'user' && (
              <div className="absolute right-0 top-full mt-1.5 w-64 max-w-[calc(100vw-1.25rem)] bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-1.5">
                {hasPermission('manage_users') ? (
                  <>
                    <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                      Changer d’utilisateur actif
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-0.5">
                      {state.users
                        .filter(
                          (u) =>
                            !u.businessId ||
                            u.businessId === currentBusiness.id ||
                            isFirebaseAdminAccount({
                              uid: u.firebaseUid,
                              email: u.email,
                              userId: u.id,
                            })
                        )
                        .map((u) => {
                          const r = state.roles.find((role) => role.id === u.roleId);
                          const isUserAdmin = isFirebaseAdminAccount({
                            uid: u.firebaseUid,
                            email: u.email,
                            userId: u.id,
                          });
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setUserId(u.id);
                                setOpenDropdown(null);
                              }}
                              className={`w-full text-left px-3 py-2 min-h-[44px] lg:min-h-[36px] rounded-md text-xs flex items-center justify-between ${
                                u.id === currentUser.id
                                  ? 'bg-blue-600 text-white font-medium'
                                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              <div className="truncate pr-2">
                                <div className="flex items-center space-x-1.5 font-semibold">
                                  <span className="truncate">{u.name}</span>
                                  {isUserAdmin && (
                                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[9px] font-bold shrink-0">
                                      Admin Firebase
                                    </span>
                                  )}
                                </div>
                                <div
                                  className={`text-[10px] ${
                                    u.id === currentUser.id ? 'text-white/80' : 'text-slate-500'
                                  }`}
                                >
                                  {isUserAdmin ? 'Administrateur Firebase' : r?.name}
                                </div>
                              </div>
                              {u.id === currentUser.id && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                              )}
                            </button>
                          );
                        })}
                    </div>
                    <div className="border-t border-slate-200 my-1"></div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('users');
                        setOpenDropdown(null);
                      }}
                      className="w-full text-left px-3 min-h-[44px] lg:min-h-[36px] text-xs text-blue-600 hover:bg-slate-50 rounded-md font-medium"
                    >
                      Gérer les utilisateurs & rôles
                    </button>
                  </>
                ) : (
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <div className="text-xs font-bold text-slate-800 truncate">{currentUser.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                    <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                      {currentRole.name}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setOpenDropdown(null);
                    logout();
                  }}
                  className="w-full text-left px-3 min-h-[44px] lg:min-h-[36px] text-xs text-rose-600 hover:bg-rose-50 rounded-md font-bold flex items-center space-x-1.5"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>Se déconnecter</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Notifications Modal */}
      {showNotifications && (
        <NotificationsModal
          onClose={() => setShowNotifications(false)}
          onNavigateTab={setActiveTab}
        />
      )}

      {/* Firestore Database Management Modal - Réservé à l'administrateur Firebase */}
      {isFirebaseAdmin && (
        <FirestoreDatabaseModal
          isOpen={showFirestoreModal}
          onClose={() => setShowFirestoreModal(false)}
        />
      )}
    </>
  );
};
