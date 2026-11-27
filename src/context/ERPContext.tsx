import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  ERPState,
  getInitialERPState,
  saveERPState,
  resetERPState,
  computeAlerts,
  normalizeERPState,
} from '../lib/storage';
import {
  saveERPStateToCloud,
  loadERPStateFromCloud,
  subscribeToERPStateCloud,
  auth,
  firebaseSignOut,
  signInWithEmailAndPassword,
} from '../lib/firebase';
import {
  checkServerSession,
  createServerSession,
  DEFAULT_IDLE_TIMEOUT_MS,
  DEFAULT_WARNING_LEAD_MS,
  INACTIVITY_LOGOUT_MESSAGE,
  loginWithPasswordOnServer,
  revokeServerSession,
  subscribeSessionExpired,
  switchUserOnServer,
} from '../lib/sessionClient';
import {
  Business,
  BusinessLocation,
  Role,
  User,
  Category,
  SubCategory,
  Brand,
  Unit,
  VariationTemplate,
  Contact,
  Product,
  Purchase,
  Sale,
  ExpenseCategory,
  Expense,
  StockAdjustment,
  StockTransfer,
  StockInventory,
  StockInventoryItem,
  RegisterLog,
  BarcodeSetting,
  PaymentDueAlert,
  LowStockAlert,
} from '../types';

interface ERPContextType {
  state: ERPState;
  currentBusiness: Business;
  currentLocation: BusinessLocation | null;
  currentUser: User;
  currentRole: Role;
  paymentAlerts: PaymentDueAlert[];
  lowStockAlerts: LowStockAlert[];
  isOffline: boolean;
  cloudSyncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  lastCloudSyncTime: Date | null;
  forceCloudSync: () => Promise<boolean>;
  isFirebaseAdmin: boolean;
  logoutReason: string | null;
  clearLogoutReason: () => void;
  idleTimeoutMs: number;
  warningLeadMs: number;
  
  // Business & Location Actions
  setBusinessId: (id: string) => void;
  setLocationId: (id: string) => void;
  setUserId: (id: string) => void;
  setLanguage: (lang: 'fr' | 'en') => void;
  addBusiness: (business: Omit<Business, 'id' | 'createdAt'>) => void;
  updateBusiness: (business: Business) => void;
  addLocation: (location: Omit<BusinessLocation, 'id'>) => void;
  updateLocation: (location: BusinessLocation) => void;
  deleteLocation: (id: string) => void;

  // User & Role Actions
  addUser: (user: Omit<User, 'id'> & { id?: string }) => User;
  updateUser: (user: User) => void;
  deleteUser: (id: string) => void;
  addRole: (role: Omit<Role, 'id' | 'isPredefined'>) => void;
  updateRole: (role: Role) => void;
  deleteRole: (id: string) => void;

  // Contacts
  addContact: (contact: Omit<Contact, 'id' | 'currentBalance'>) => void;
  updateContact: (contact: Contact) => void;
  deleteContact: (id: string) => void;

  // Catalog
  addProduct: (product: Omit<Product, 'id'>) => void;
  bulkImportProducts: (
    items: {
      name: string;
      sku: string;
      barcode?: string;
      categoryName?: string;
      brandName?: string;
      unitShortName?: string;
      purchasePrice: number;
      profitMargin: number;
      sellingPrice: number;
      taxRate: number;
      stockQuantity: number;
      alertQuantity: number;
      description?: string;
    }[],
    options: {
      targetLocationId: string;
      duplicateStrategy: 'update' | 'skip' | 'create_unique';
    }
  ) => {
    inserted: number;
    updated: number;
    skipped: number;
    categoriesCreated: number;
    brandsCreated: number;
    unitsCreated: number;
  };
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  deleteProducts: (ids: string[]) => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  addSubCategory: (subCategory: Omit<SubCategory, 'id'>) => void;
  updateSubCategory: (subCategory: SubCategory) => void;
  deleteSubCategory: (id: string) => void;
  addBrand: (brand: Omit<Brand, 'id'>) => void;
  updateBrand: (brand: Brand) => void;
  deleteBrand: (id: string) => void;
  addUnit: (unit: Omit<Unit, 'id'>) => void;
  updateUnit: (unit: Unit) => void;
  deleteUnit: (id: string) => void;
  addVariationTemplate: (template: Omit<VariationTemplate, 'id'>) => void;
  updateVariationTemplate: (template: VariationTemplate) => void;
  deleteVariationTemplate: (id: string) => void;

  // Operations
  recordPurchase: (purchase: Omit<Purchase, 'id'>) => void;
  updatePurchase: (purchase: Purchase) => void;
  deletePurchase: (id: string) => void;
  recordSale: (sale: Omit<Sale, 'id'>) => void;
  updateSale: (sale: Sale) => void;
  deleteSale: (id: string) => void;
  updateSaleStatus: (saleId: string, status: Sale['status'], paymentStatus: Sale['paymentStatus']) => void;
  recordExpense: (expense: Omit<Expense, 'id'>) => void;
  addExpenseCategory: (cat: Omit<ExpenseCategory, 'id'>) => void;
  recordStockAdjustment: (adj: Omit<StockAdjustment, 'id'>) => void;
  updateStockAdjustment: (adj: StockAdjustment) => void;
  deleteStockAdjustment: (id: string) => void;
  recordStockTransfer: (transfer: Omit<StockTransfer, 'id'>) => void;
  updateStockTransfer: (transfer: StockTransfer) => void;
  deleteStockTransfer: (id: string) => void;
  
  // Stock Physical Inventory
  createStockInventory: (inventory: Omit<StockInventory, 'id'>) => StockInventory;
  updateStockInventory: (inventory: StockInventory) => void;
  reconcileStockInventory: (inventoryId: string) => void;
  cancelStockInventory: (inventoryId: string) => void;
  deleteStockInventory: (id: string) => void;
  
  // Cash Register
  openRegister: (initialCash: number) => void;
  closeRegister: (actualCash: number, notes?: string) => void;

  // Authentication & Session
  loginWithFirebaseUser: (profile: {
    email: string;
    displayName?: string | null;
    photoURL?: string | null;
    firebaseIdToken?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  authenticateUserWithEmailPassword: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: (reasonMessage?: string) => void;

  // System
  resetAllData: () => void;
  exportDatabase: () => void;
  importDatabase: (jsonString: string) => boolean;
  hasPermission: (perm: Role['permissions'][number]) => boolean;
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

export const ERPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ERPState>(getInitialERPState);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>(
    navigator.onLine ? 'synced' : 'offline'
  );
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<Date | null>(null);
  const [logoutReason, setLogoutReason] = useState<string | null>(null);
  const [idleTimeoutMs, setIdleTimeoutMs] = useState<number>(DEFAULT_IDLE_TIMEOUT_MS);
  const [warningLeadMs, setWarningLeadMs] = useState<number>(DEFAULT_WARNING_LEAD_MS);
  const isInitialCloudLoadDone = useRef(false);
  const isSyncingFromCloud = useRef(false);

  const clearLogoutReason = () => setLogoutReason(null);

  // Initialize Cloud Sync with Firestore
  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    async function initCloudSync() {
      if (!navigator.onLine) {
        setCloudSyncStatus('offline');
        isInitialCloudLoadDone.current = true;
        return;
      }

      try {
        setCloudSyncStatus('syncing');
        const cloudData = await loadERPStateFromCloud();
        if (cloudData && cloudData.businesses && cloudData.businesses.length > 0) {
          isSyncingFromCloud.current = true;
          setState((prev) => {
            const userStillExists = cloudData.users?.some((u) => u.id === prev.currentUserId);
            const validUserId = userStillExists
              ? prev.currentUserId
              : cloudData.users?.[0]?.id || prev.currentUserId;
            const bizStillExists = cloudData.businesses?.some((b) => b.id === prev.currentBusinessId);
            const validBizId = bizStillExists
              ? prev.currentBusinessId
              : cloudData.businesses?.[0]?.id || prev.currentBusinessId;

            const merged = normalizeERPState(
              {
                ...prev,
                ...cloudData,
              },
              {
                currentUserId: validUserId,
                currentBusinessId: validBizId,
                currentLocationId: prev.currentLocationId,
                isAuthenticated: prev.isAuthenticated,
                language: prev.language,
              }
            );
            saveERPState(merged);
            return merged;
          });
          setLastCloudSyncTime(new Date());
          setCloudSyncStatus('synced');
        } else {
          // If no data exists in cloud yet, bootstrap initial state to Firestore
          await saveERPStateToCloud(state);
          setLastCloudSyncTime(new Date());
          setCloudSyncStatus('synced');
        }
      } catch (err) {
        console.error('Error initializing cloud sync with Firestore:', err);
        setCloudSyncStatus('error');
      } finally {
        isInitialCloudLoadDone.current = true;
      }

      // Real-time listener for multi-device / multi-tab live sync
      unsubscribeSnapshot = subscribeToERPStateCloud((incomingData) => {
        if (incomingData && incomingData.businesses && incomingData.businesses.length > 0) {
          isSyncingFromCloud.current = true;
          setState((prev) => {
            const userStillExists = incomingData.users?.some((u) => u.id === prev.currentUserId);
            const validUserId = userStillExists
              ? prev.currentUserId
              : incomingData.users?.[0]?.id || prev.currentUserId;
            const bizStillExists = incomingData.businesses?.some((b) => b.id === prev.currentBusinessId);
            const validBizId = bizStillExists
              ? prev.currentBusinessId
              : incomingData.businesses?.[0]?.id || prev.currentBusinessId;

            const merged = normalizeERPState(
              {
                ...prev,
                ...incomingData,
              },
              {
                currentUserId: validUserId,
                currentBusinessId: validBizId,
                currentLocationId: prev.currentLocationId,
                isAuthenticated: prev.isAuthenticated,
                language: prev.language,
              }
            );
            saveERPState(merged);
            return merged;
          });
          setLastCloudSyncTime(new Date());
          setCloudSyncStatus('synced');
        }
      });
    }

    initCloudSync();

    return () => {
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  // Save to localStorage immediately and sync to Firebase Firestore (debounced)
  useEffect(() => {
    saveERPState(state);

    if (!isInitialCloudLoadDone.current) return;

    if (isSyncingFromCloud.current) {
      isSyncingFromCloud.current = false;
      return;
    }

    if (!navigator.onLine) {
      setCloudSyncStatus('offline');
      return;
    }

    setCloudSyncStatus('syncing');
    const timer = setTimeout(async () => {
      try {
        const success = await saveERPStateToCloud(state);
        if (success) {
          setLastCloudSyncTime(new Date());
          setCloudSyncStatus('synced');
        } else {
          setCloudSyncStatus('error');
        }
      } catch {
        setCloudSyncStatus('error');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setCloudSyncStatus('syncing');
      saveERPStateToCloud(state)
        .then((ok) => {
          if (ok) {
            setLastCloudSyncTime(new Date());
            setCloudSyncStatus('synced');
          } else {
            setCloudSyncStatus('error');
          }
        })
        .catch(() => setCloudSyncStatus('error'));
    };
    const handleOffline = () => {
      setIsOffline(true);
      setCloudSyncStatus('offline');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [state]);

  // Force manual cloud sync
  const forceCloudSync = async (): Promise<boolean> => {
    if (!navigator.onLine) {
      setCloudSyncStatus('offline');
      return false;
    }
    setCloudSyncStatus('syncing');
    try {
      const success = await saveERPStateToCloud(state);
      if (success) {
        setLastCloudSyncTime(new Date());
        setCloudSyncStatus('synced');
        return true;
      } else {
        setCloudSyncStatus('error');
        return false;
      }
    } catch {
      setCloudSyncStatus('error');
      return false;
    }
  };

  // Active Business, Location, User with resilient fallbacks
  const currentBusiness: Business =
    (state.businesses && state.businesses.find((b) => b && b.id === state.currentBusinessId)) ||
    (state.businesses && state.businesses[0]) || {
      id: 'biz-1',
      name: 'Entreprise Principale',
      currency: 'XOF',
      currencyCode: 'XOF',
      currencySymbol: 'FCFA',
      timezone: 'Africa/Abidjan',
      financialYearStartMonth: 1,
      taxNumber: 'CI-ABJ-01',
      phone: '+225 07 00 00 00',
      email: 'contact@commerce.ci',
      address: 'Abidjan, Côte d’Ivoire',
      defaultProfitMargin: 25,
      skuPrefix: 'ART',
      createdAt: new Date().toISOString(),
    };

  const currentLocation =
    !state.currentLocationId || state.currentLocationId === 'all'
      ? null
      : (state.locations || []).find((l) => l && l.id === state.currentLocationId) || null;

  const currentUser: User =
    (state.users && state.users.find((u) => u && u.id === state.currentUserId)) ||
    (state.users && state.users[0]) || {
      id: 'usr-1',
      name: 'Administrateur',
      email: 'admin@commerce.ci',
      businessId: currentBusiness.id,
      roleId: 'role-admin',
      locationIds: ['all'],
      isActive: true,
      status: 'active' as const,
      phone: '+225 01 02 03 04',
    };

  const currentRole =
    (state.roles && state.roles.find((r) => r && r.id === currentUser.roleId)) ||
    (state.roles && state.roles[0]) || {
      id: 'role-admin',
      name: 'Administrateur',
      isPredefined: true,
      description: 'Accès complet à toutes les fonctionnalités',
      permissions: [
        'manage_businesses',
        'manage_locations',
        'manage_users',
        'manage_roles',
        'view_contacts',
        'manage_contacts',
        'view_products',
        'manage_products',
        'view_purchases',
        'manage_purchases',
        'access_pos',
        'view_sales',
        'manage_sales',
        'view_expenses',
        'manage_expenses',
        'view_reports',
        'adjust_stock',
        'print_barcodes',
        'manage_settings',
      ] as Role['permissions'],
    };

  const { paymentAlerts, lowStockAlerts } = computeAlerts(
    state,
    currentBusiness?.id || 'biz-1',
    state.currentLocationId || 'all'
  );

  const hasPermission = (perm: Role['permissions'][number]) => {
    if (!currentRole || !Array.isArray(currentRole.permissions)) return true;
    return currentRole.permissions.includes(perm);
  };

  // Determine if active session belongs to the Firebase administrator
  const isFirebaseAdmin = Boolean(
    currentUser?.email?.toLowerCase() === 'jnoufe@gmail.com' ||
    currentUser?.id === 'usr-firebase-admin' ||
    (auth.currentUser?.email?.toLowerCase() === 'jnoufe@gmail.com' && currentUser?.roleId === 'role-admin')
  );

  // State mutators (local client session & shared entities)
  const setBusinessId = (id: string) => {
    setState((prev) => {
      const next = { ...prev, currentBusinessId: id };
      saveERPState(next);
      return next;
    });
  };

  const setLocationId = (id: string) => {
    setState((prev) => {
      const next = { ...prev, currentLocationId: id };
      saveERPState(next);
      return next;
    });
  };

  const setUserId = (id: string) => {
    if (!hasPermission('manage_users')) return;
    void switchUserOnServer(id).then((res) => {
      if (res.ok || res.offline) {
        if (res.ok) {
          setIdleTimeoutMs(res.idleTimeoutMs);
          setWarningLeadMs(res.warningLeadMs);
        }
        setState((prev) => {
          const targetUser = prev.users.find((u) => u.id === id);
          const next = {
            ...prev,
            currentUserId: id,
            currentBusinessId: targetUser ? targetUser.businessId : prev.currentBusinessId,
          };
          saveERPState(next);
          return next;
        });
      }
    });
  };

  const resolveLocationForUser = (targetUser: User | undefined, fallbackLocationId: string): string => {
    if (
      targetUser &&
      Array.isArray(targetUser.locationIds) &&
      targetUser.locationIds.length > 0 &&
      !targetUser.locationIds.includes('all')
    ) {
      return targetUser.locationIds[0];
    }
    return fallbackLocationId || 'all';
  };

  const loginWithFirebaseUser = async (profile: {
    email: string;
    displayName?: string | null;
    photoURL?: string | null;
    firebaseIdToken?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const normalizedEmail = profile.email.trim().toLowerCase();
    const idToken =
      profile.firebaseIdToken || (await auth.currentUser?.getIdToken().catch(() => undefined));

    if (!idToken) {
      return {
        success: false,
        error: 'Échec de vérification du jeton d’authentification Firebase.',
      };
    }

    const sessionRes = await createServerSession({ firebaseIdToken: idToken });
    if (!sessionRes.ok && !sessionRes.offline) {
      return {
        success: false,
        error:
          sessionRes.message ||
          'Email ou mot de passe incorrect. Veuillez vérifier vos identifiants.',
      };
    }

    if (sessionRes.ok) {
      setIdleTimeoutMs(sessionRes.idleTimeoutMs);
      setWarningLeadMs(sessionRes.warningLeadMs);
    }

    setLogoutReason(null);

    const existing = state.users.find(
      (u) => u && u.email?.trim().toLowerCase() === normalizedEmail
    );

    if (existing && existing.isActive === false) {
      return {
        success: false,
        error: 'Email ou mot de passe incorrect. Veuillez vérifier vos identifiants.',
      };
    }

    const isAdminEmail = normalizedEmail === 'jnoufe@gmail.com';
    const resolvedUserId =
      existing?.id || sessionRes.userId || (isAdminEmail ? 'usr-firebase-admin' : `usr-${Date.now()}`);

    setState((prev) => {
      const targetUser = prev.users.find(
        (u) => u && u.email?.trim().toLowerCase() === normalizedEmail
      );

      if (targetUser) {
        const updatedUsers =
          profile.photoURL && !targetUser.avatar
            ? prev.users.map((u) =>
                u.id === targetUser.id ? { ...u, avatar: profile.photoURL || u.avatar } : u
              )
            : prev.users;
        const next: ERPState = {
          ...prev,
          users: updatedUsers,
          currentUserId: targetUser.id,
          currentBusinessId: targetUser.businessId || prev.currentBusinessId,
          currentLocationId: resolveLocationForUser(targetUser, prev.currentLocationId),
          isAuthenticated: true,
        };
        saveERPState(next);
        return next;
      }

      const defaultRole =
        (isAdminEmail
          ? prev.roles.find((r) => r.id === 'role-admin' || r.name.toLowerCase().includes('admin'))
          : prev.roles.find((r) => r.id !== 'role-admin')) || prev.roles[0];

      const newUser: User = {
        id: resolvedUserId,
        businessId: prev.businesses[0]?.id || 'biz-1',
        name: profile.displayName?.trim() || profile.email.split('@')[0] || 'Utilisateur',
        email: profile.email.trim(),
        roleId: sessionRes.roleId || defaultRole?.id || 'role-cashier',
        locationIds: ['all'],
        phone: '',
        isActive: true,
        status: 'active',
        avatar: profile.photoURL || undefined,
      };

      const next: ERPState = {
        ...prev,
        users: [...prev.users, newUser],
        currentUserId: newUser.id,
        currentBusinessId: newUser.businessId,
        currentLocationId: resolveLocationForUser(newUser, prev.currentLocationId),
        isAuthenticated: true,
      };
      saveERPState(next);
      return next;
    });

    return { success: true };
  };

  const authenticateUserWithEmailPassword = async (
    emailInput: string,
    passwordInput: string
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmedEmail = emailInput.trim();
    const normalizedEmail = trimmedEmail.toLowerCase();

    // Verify credentials on server (rate-limited, scrypt/PBKDF2, uniform anti-enumeration errors)
    const serverAuth = await loginWithPasswordOnServer(trimmedEmail, passwordInput);

    if (serverAuth.ok && serverAuth.userId) {
      setLogoutReason(null);
      setIdleTimeoutMs(serverAuth.idleTimeoutMs);
      setWarningLeadMs(serverAuth.warningLeadMs);

      if (auth.currentUser && auth.currentUser.email?.toLowerCase() !== normalizedEmail) {
        await firebaseSignOut(auth).catch(() => {});
      }

      setState((prev) => {
        const matched = prev.users.find(
          (u) => u && (u.id === serverAuth.userId || u.email?.trim().toLowerCase() === normalizedEmail)
        );
        const targetId = matched?.id || serverAuth.userId!;
        const next: ERPState = {
          ...prev,
          currentUserId: targetId,
          currentBusinessId: matched?.businessId || serverAuth.businessId || prev.currentBusinessId,
          currentLocationId: resolveLocationForUser(matched, prev.currentLocationId),
          isAuthenticated: true,
        };
        saveERPState(next);
        return next;
      });

      return { success: true };
    }

    if (!serverAuth.offline) {
      if (serverAuth.status === 429) {
        return {
          success: false,
          error:
            serverAuth.message ||
            'Trop de tentatives infructueuses. Veuillez patienter avant de réessayer.',
        };
      }

      return {
        success: false,
        error: 'Email ou mot de passe incorrect. Veuillez vérifier vos identifiants.',
      };
    }

    // Offline fallback via Firebase Auth SDK if server unreachable
    try {
      const credential = await signInWithEmailAndPassword(auth, trimmedEmail, passwordInput);
      const firebaseIdToken = await credential.user.getIdToken();
      return loginWithFirebaseUser({
        email: credential.user.email || trimmedEmail,
        displayName: credential.user.displayName,
        photoURL: credential.user.photoURL,
        firebaseIdToken,
      });
    } catch (error: any) {
      const code = error?.code || '';
      if (code === 'auth/too-many-requests') {
        return {
          success: false,
          error: 'Trop de tentatives infructueuses. Veuillez patienter avant de réessayer.',
        };
      }
      return {
        success: false,
        error: 'Email ou mot de passe incorrect. Veuillez vérifier vos identifiants.',
      };
    }
  };

  const logout = (reasonMessage?: string) => {
    void revokeServerSession();
    try {
      firebaseSignOut(auth).catch(() => {});
    } catch {}
    setLogoutReason(
      typeof reasonMessage === 'string' && reasonMessage.trim().length > 0 ? reasonMessage : null
    );
    setState((prev) => {
      const next: ERPState = {
        ...prev,
        isAuthenticated: false,
      };
      saveERPState(next);
      return next;
    });
  };

  // Listen for 401 SESSION_EXPIRED responses from any authenticated fetch call
  useEffect(() => {
    const unsubscribe = subscribeSessionExpired((message) => {
      logout(message || INACTIVITY_LOGOUT_MESSAGE);
    });
    return unsubscribe;
  }, []);

  // Validate existing server session on initial mount when local state indicates authenticated
  useEffect(() => {
    if (!state.isAuthenticated) return;
    let cancelled = false;

    void checkServerSession().then((res) => {
      if (cancelled) return;
      if (res.authenticated) {
        setIdleTimeoutMs(res.idleTimeoutMs);
        setWarningLeadMs(res.warningLeadMs);
        // Align client active user strictly with server-verified session identity
        if (res.userId) {
          setState((prev) => {
            if (prev.currentUserId === res.userId) return prev;
            const matched = prev.users.find((u) => u && u.id === res.userId);
            if (!matched) return prev;
            const next: ERPState = {
              ...prev,
              currentUserId: matched.id,
              currentBusinessId: matched.businessId || prev.currentBusinessId,
            };
            saveERPState(next);
            return next;
          });
        }
        return;
      }
      if (res.offline) {
        return;
      }
      if (res.code === 'SESSION_EXPIRED') {
        logout(res.message || INACTIVITY_LOGOUT_MESSAGE);
        return;
      }
      if (res.code === 'UNAUTHENTICATED' || res.code === 'SESSION_REVOKED') {
        logout();
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = (lang: 'fr' | 'en') => {
    setState((prev) => {
      const next = { ...prev, language: lang };
      saveERPState(next);
      return next;
    });
  };

  const addBusiness = (biz: Omit<Business, 'id' | 'createdAt'>) => {
    const newBiz: Business = {
      ...biz,
      id: `biz-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    // Also create default walk-in customer and default location for new business
    const defaultLoc: BusinessLocation = {
      id: `loc-${Date.now()}`,
      businessId: newBiz.id,
      name: 'Siège Principal',
      code: 'LOC-01',
      address: 'Adresse du siège',
      city: 'Ville',
      country: 'Pays',
      phone: '+225 00000000',
      email: `contact@${newBiz.name.toLowerCase().replace(/\s+/g, '')}.com`,
      invoiceLayout: {
        headerText: `${newBiz.name.toUpperCase()} - Facture Officielle`,
        footerText: 'Merci pour votre achat !',
        showLogo: true,
        invoicePrefix: 'FAC-',
        quotationPrefix: 'DEV-',
        primaryColor: '#1e40af',
        showTaxDetails: true,
        termsAndConditions: 'Paiement selon les conditions convenues.',
      },
    };
    const defaultWalkIn: Contact = {
      id: `cnt-walkin-${newBiz.id}`,
      businessId: newBiz.id,
      type: 'customer',
      name: 'Client de Passage',
      companyName: 'Particulier',
      phone: '+225 00000000',
      paymentTermsDays: 0,
      currentBalance: 0,
      isDefaultWalkIn: true,
    };

    setState((prev) => ({
      ...prev,
      businesses: [...prev.businesses, newBiz],
      locations: [...prev.locations, defaultLoc],
      contacts: [...prev.contacts, defaultWalkIn],
      currentBusinessId: newBiz.id,
      currentLocationId: defaultLoc.id,
    }));
  };

  const updateBusiness = (business: Business) => {
    setState((prev) => ({
      ...prev,
      businesses: prev.businesses.map((b) => (b.id === business.id ? business : b)),
    }));
  };

  const addLocation = (location: Omit<BusinessLocation, 'id'>) => {
    const newLoc: BusinessLocation = { ...location, id: `loc-${Date.now()}` };
    setState((prev) => ({ ...prev, locations: [...prev.locations, newLoc] }));
  };

  const updateLocation = (location: BusinessLocation) => {
    setState((prev) => ({
      ...prev,
      locations: prev.locations.map((l) => (l.id === location.id ? location : l)),
    }));
  };

  const deleteLocation = (locationId: string) => {
    setState((prev) => {
      const remainingLocations = prev.locations.filter((l) => l.id !== locationId);
      const newLocId = prev.currentLocationId === locationId
        ? (remainingLocations[0]?.id || 'all')
        : prev.currentLocationId;
      return {
        ...prev,
        locations: remainingLocations,
        currentLocationId: newLocId,
      };
    });
  };

  const addUser = (usr: Omit<User, 'id'> & { id?: string }): User => {
    const { passwordHash: _stripHash, ...safeUser } = usr;
    const newUser: User = { ...safeUser, id: usr.id || `usr-${Date.now()}` };
    setState((prev) => ({ ...prev, users: [...prev.users, newUser] }));
    return newUser;
  };

  const updateUser = (usr: User) => {
    const { passwordHash: _stripHash, ...safeUser } = usr;
    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === safeUser.id ? safeUser : u)),
    }));
  };

  const deleteUser = (userId: string) => {
    setState((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== userId),
    }));
  };

  const addRole = (role: Omit<Role, 'id' | 'isPredefined'>) => {
    const newRole: Role = { ...role, id: `role-${Date.now()}`, isPredefined: false };
    setState((prev) => ({ ...prev, roles: [...prev.roles, newRole] }));
  };

  const updateRole = (role: Role) => {
    setState((prev) => ({
      ...prev,
      roles: prev.roles.map((r) => (r.id === role.id ? role : r)),
    }));
  };

  const deleteRole = (roleId: string) => {
    setState((prev) => ({
      ...prev,
      roles: prev.roles.filter((r) => r.id !== roleId),
    }));
  };

  const addContact = (contact: Omit<Contact, 'id' | 'currentBalance'>) => {
    const newContact: Contact = {
      ...contact,
      id: `cnt-${Date.now()}`,
      currentBalance: 0,
    };
    setState((prev) => ({ ...prev, contacts: [...prev.contacts, newContact] }));
  };

  const updateContact = (contact: Contact) => {
    setState((prev) => ({
      ...prev,
      contacts: prev.contacts.map((c) => (c.id === contact.id ? contact : c)),
    }));
  };

  const deleteContact = (contactId: string) => {
    setState((prev) => ({
      ...prev,
      contacts: prev.contacts.filter((c) => c.id !== contactId),
    }));
  };

  const addProduct = (product: Omit<Product, 'id'>) => {
    const newProduct: Product = { ...product, id: `prd-${Date.now()}` };
    setState((prev) => ({ ...prev, products: [...prev.products, newProduct] }));
  };

  const bulkImportProducts = (
    items: {
      name: string;
      sku: string;
      barcode?: string;
      categoryName?: string;
      brandName?: string;
      unitShortName?: string;
      purchasePrice: number;
      profitMargin: number;
      sellingPrice: number;
      taxRate: number;
      stockQuantity: number;
      alertQuantity: number;
      description?: string;
    }[],
    options: {
      targetLocationId: string;
      duplicateStrategy: 'update' | 'skip' | 'create_unique';
    }
  ) => {
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let categoriesCreated = 0;
    let brandsCreated = 0;
    let unitsCreated = 0;

    setState((prev) => {
      const bizId = prev.currentBusinessId;
      const targetLocId =
        options.targetLocationId === 'all'
          ? prev.locations.find((l) => l.businessId === bizId)?.id || prev.locations[0]?.id || 'loc-1'
          : options.targetLocationId;

      const currentCategories = [...prev.categories];
      const currentBrands = [...prev.brands];
      const currentUnits = [...prev.units];
      let currentProducts = [...prev.products];

      // Helper to find or create category
      const getOrCreateCategoryId = (catName?: string): string => {
        if (!catName || !catName.trim()) {
          const defaultCat = currentCategories.find((c) => c.businessId === bizId) || currentCategories[0];
          return defaultCat?.id || 'cat-gen';
        }
        const trimmed = catName.trim();
        const existing = currentCategories.find(
          (c) => c.businessId === bizId && c.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (existing) return existing.id;

        const newCat: Category = {
          id: `cat-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          businessId: bizId,
          name: trimmed,
          code: `CAT-${trimmed.slice(0, 3).toUpperCase()}`,
        };
        currentCategories.push(newCat);
        categoriesCreated++;
        return newCat.id;
      };

      // Helper to find or create brand
      const getOrCreateBrandId = (brandName?: string): string | undefined => {
        if (!brandName || !brandName.trim()) return undefined;
        const trimmed = brandName.trim();
        const existing = currentBrands.find(
          (b) => b.businessId === bizId && b.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (existing) return existing.id;

        const newBrand: Brand = {
          id: `brd-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          businessId: bizId,
          name: trimmed,
          description: `Marque importée (${trimmed})`,
        };
        currentBrands.push(newBrand);
        brandsCreated++;
        return newBrand.id;
      };

      // Helper to find or create unit
      const getOrCreateUnitId = (unitName?: string): string => {
        if (!unitName || !unitName.trim()) {
          const defaultUnit = currentUnits.find((u) => u.businessId === bizId) || currentUnits[0];
          return defaultUnit?.id || 'unit-pcs';
        }
        const trimmed = unitName.trim();
        const existing = currentUnits.find(
          (u) =>
            u.businessId === bizId &&
            (u.shortName.toLowerCase() === trimmed.toLowerCase() ||
              u.name.toLowerCase() === trimmed.toLowerCase())
        );
        if (existing) return existing.id;

        const newUnit: Unit = {
          id: `unit-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          businessId: bizId,
          name: trimmed,
          shortName: trimmed.length > 5 ? trimmed.slice(0, 4) : trimmed,
          allowDecimal: true,
        };
        currentUnits.push(newUnit);
        unitsCreated++;
        return newUnit.id;
      };

      // Process product items
      items.forEach((item, index) => {
        if (!item.name || !item.name.trim()) {
          skipped++;
          return;
        }

        let sku = (item.sku || '').trim();
        if (!sku) {
          sku = `PRD-${Date.now().toString().slice(-6)}-${index + 1}`;
        }

        const categoryId = getOrCreateCategoryId(item.categoryName);
        const brandId = getOrCreateBrandId(item.brandName);
        const unitId = getOrCreateUnitId(item.unitShortName);

        const existingProdIndex = currentProducts.findIndex(
          (p) => p.businessId === bizId && p.sku.toLowerCase() === sku.toLowerCase()
        );

        if (existingProdIndex >= 0) {
          if (options.duplicateStrategy === 'skip') {
            skipped++;
            return;
          }

          if (options.duplicateStrategy === 'update') {
            const existing = currentProducts[existingProdIndex];
            const updatedStockMap = { ...(existing.locationStock || {}) };
            
            // Set or add stock to target location
            updatedStockMap[targetLocId] = item.stockQuantity;

            currentProducts[existingProdIndex] = {
              ...existing,
              name: item.name.trim(),
              barcode: item.barcode || existing.barcode,
              categoryId,
              brandId: brandId || existing.brandId,
              unitId,
              purchasePrice: item.purchasePrice > 0 ? item.purchasePrice : existing.purchasePrice,
              profitMargin: item.profitMargin > 0 ? item.profitMargin : existing.profitMargin,
              sellingPrice: item.sellingPrice > 0 ? item.sellingPrice : existing.sellingPrice,
              taxRate: item.taxRate !== undefined ? item.taxRate : existing.taxRate,
              alertQuantity: item.alertQuantity > 0 ? item.alertQuantity : existing.alertQuantity,
              locationStock: updatedStockMap,
            };
            updated++;
            return;
          }

          if (options.duplicateStrategy === 'create_unique') {
            sku = `${sku}-${Math.floor(100 + Math.random() * 900)}`;
          }
        }

        // Insert new product
        const newProduct: Product = {
          id: `prd-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
          businessId: bizId,
          name: item.name.trim(),
          type: 'single',
          sku,
          barcode: item.barcode || '',
          brandId,
          categoryId,
          unitId,
          image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&auto=format&fit=crop&q=80',
          alertQuantity: item.alertQuantity || 5,
          taxRate: item.taxRate !== undefined ? item.taxRate : 18,
          purchasePrice: item.purchasePrice || 0,
          profitMargin: item.profitMargin || 25,
          sellingPrice: item.sellingPrice || 0,
          locationStock: {
            [targetLocId]: item.stockQuantity || 0,
          },
        };

        currentProducts.push(newProduct);
        inserted++;
      });

      return {
        ...prev,
        categories: currentCategories,
        brands: currentBrands,
        units: currentUnits,
        products: currentProducts,
      };
    });

    return {
      inserted,
      updated,
      skipped,
      categoriesCreated,
      brandsCreated,
      unitsCreated,
    };
  };

  const updateProduct = (product: Product) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === product.id ? product : p)),
    }));
  };

  const deleteProduct = (id: string) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== id),
    }));
  };

  const deleteProducts = (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    setState((prev) => ({
      ...prev,
      products: prev.products.filter((p) => !idSet.has(p.id)),
    }));
  };

  const addCategory = (cat: Omit<Category, 'id'>) => {
    const newCat: Category = { ...cat, id: `cat-${Date.now()}` };
    setState((prev) => ({ ...prev, categories: [...prev.categories, newCat] }));
  };

  const updateCategory = (category: Category) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === category.id ? category : c)),
    }));
  };

  const deleteCategory = (id: string) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
      subCategories: (prev.subCategories || []).filter((s) => s.categoryId !== id),
    }));
  };

  const addSubCategory = (subCat: Omit<SubCategory, 'id'>) => {
    const newSubCat: SubCategory = { ...subCat, id: `subcat-${Date.now()}` };
    setState((prev) => ({
      ...prev,
      subCategories: [...(prev.subCategories || []), newSubCat],
    }));
  };

  const updateSubCategory = (subCat: SubCategory) => {
    setState((prev) => ({
      ...prev,
      subCategories: (prev.subCategories || []).map((s) => (s.id === subCat.id ? subCat : s)),
    }));
  };

  const deleteSubCategory = (id: string) => {
    setState((prev) => ({
      ...prev,
      subCategories: (prev.subCategories || []).filter((s) => s.id !== id),
    }));
  };

  const addBrand = (brd: Omit<Brand, 'id'>) => {
    const newBrd: Brand = { ...brd, id: `brd-${Date.now()}` };
    setState((prev) => ({ ...prev, brands: [...prev.brands, newBrd] }));
  };

  const updateBrand = (brand: Brand) => {
    setState((prev) => ({
      ...prev,
      brands: prev.brands.map((b) => (b.id === brand.id ? brand : b)),
    }));
  };

  const deleteBrand = (id: string) => {
    setState((prev) => ({
      ...prev,
      brands: prev.brands.filter((b) => b.id !== id),
    }));
  };

  const addUnit = (unit: Omit<Unit, 'id'>) => {
    const newUnit: Unit = { ...unit, id: `unit-${Date.now()}` };
    setState((prev) => ({ ...prev, units: [...prev.units, newUnit] }));
  };

  const updateUnit = (unit: Unit) => {
    setState((prev) => ({
      ...prev,
      units: prev.units.map((u) => (u.id === unit.id ? unit : u)),
    }));
  };

  const deleteUnit = (id: string) => {
    setState((prev) => ({
      ...prev,
      units: prev.units.filter((u) => u.id !== id),
    }));
  };

  const addVariationTemplate = (tpl: Omit<VariationTemplate, 'id'>) => {
    const newTpl: VariationTemplate = { ...tpl, id: `var-tpl-${Date.now()}` };
    setState((prev) => ({
      ...prev,
      variationTemplates: [...prev.variationTemplates, newTpl],
    }));
  };

  const updateVariationTemplate = (tpl: VariationTemplate) => {
    setState((prev) => ({
      ...prev,
      variationTemplates: prev.variationTemplates.map((v) => (v.id === tpl.id ? tpl : v)),
    }));
  };

  const deleteVariationTemplate = (id: string) => {
    setState((prev) => ({
      ...prev,
      variationTemplates: prev.variationTemplates.filter((v) => v.id !== id),
    }));
  };

  const recordPurchase = (purchase: Omit<Purchase, 'id'>) => {
    const newPurchase: Purchase = { ...purchase, id: `pur-${Date.now()}` };
    
    // Update supplier balance if due
    setState((prev) => {
      const updatedContacts = prev.contacts.map((c) => {
        if (c.id === newPurchase.supplierId) {
          return {
            ...c,
            currentBalance: c.currentBalance - newPurchase.dueAmount, // we owe supplier
          };
        }
        return c;
      });

      // Increase stock in location for received purchases
      const updatedProducts = prev.products.map((p) => {
        const item = newPurchase.items.find((i) => i.productId === p.id);
        if (item && newPurchase.status === 'received') {
          const currentQty = p.locationStock[newPurchase.locationId] ?? 0;
          return {
            ...p,
            locationStock: {
              ...p.locationStock,
              [newPurchase.locationId]: currentQty + item.quantity,
            },
          };
        }
        return p;
      });

      return {
        ...prev,
        purchases: [newPurchase, ...prev.purchases],
        contacts: updatedContacts,
        products: updatedProducts,
      };
    });
  };

  const updatePurchase = (updatedPurchase: Purchase) => {
    setState((prev) => {
      const oldPurchase = prev.purchases.find((p) => p.id === updatedPurchase.id);
      if (!oldPurchase) return prev;

      // Adjust supplier balance: revert old dueAmount, apply new dueAmount
      const updatedContacts = prev.contacts.map((c) => {
        if (c.id === updatedPurchase.supplierId) {
          const balanceWithoutOld = oldPurchase.supplierId === updatedPurchase.supplierId
            ? c.currentBalance + oldPurchase.dueAmount
            : c.currentBalance;
          return {
            ...c,
            currentBalance: balanceWithoutOld - updatedPurchase.dueAmount,
          };
        } else if (c.id === oldPurchase.supplierId && oldPurchase.supplierId !== updatedPurchase.supplierId) {
          return {
            ...c,
            currentBalance: c.currentBalance + oldPurchase.dueAmount,
          };
        }
        return c;
      });

      // Revert old stock if old was 'received', apply new stock if new is 'received'
      let updatedProducts = [...prev.products];
      if (oldPurchase.status === 'received') {
        updatedProducts = updatedProducts.map((p) => {
          const item = oldPurchase.items.find((i) => i.productId === p.id);
          if (item) {
            const currentQty = p.locationStock[oldPurchase.locationId] ?? 0;
            return {
              ...p,
              locationStock: {
                ...p.locationStock,
                [oldPurchase.locationId]: Math.max(0, currentQty - item.quantity),
              },
            };
          }
          return p;
        });
      }

      if (updatedPurchase.status === 'received') {
        updatedProducts = updatedProducts.map((p) => {
          const item = updatedPurchase.items.find((i) => i.productId === p.id);
          if (item) {
            const currentQty = p.locationStock[updatedPurchase.locationId] ?? 0;
            return {
              ...p,
              locationStock: {
                ...p.locationStock,
                [updatedPurchase.locationId]: currentQty + item.quantity,
              },
            };
          }
          return p;
        });
      }

      return {
        ...prev,
        purchases: prev.purchases.map((p) => (p.id === updatedPurchase.id ? updatedPurchase : p)),
        contacts: updatedContacts,
        products: updatedProducts,
      };
    });
  };

  const deletePurchase = (purchaseId: string) => {
    setState((prev) => {
      const purchase = prev.purchases.find((p) => p.id === purchaseId);
      if (!purchase) return prev;

      // Revert supplier balance
      const updatedContacts = prev.contacts.map((c) => {
        if (c.id === purchase.supplierId) {
          return {
            ...c,
            currentBalance: c.currentBalance + purchase.dueAmount,
          };
        }
        return c;
      });

      // Revert stock if received
      let updatedProducts = prev.products;
      if (purchase.status === 'received') {
        updatedProducts = prev.products.map((p) => {
          const item = purchase.items.find((i) => i.productId === p.id);
          if (item) {
            const currentQty = p.locationStock[purchase.locationId] ?? 0;
            return {
              ...p,
              locationStock: {
                ...p.locationStock,
                [purchase.locationId]: Math.max(0, currentQty - item.quantity),
              },
            };
          }
          return p;
        });
      }

      return {
        ...prev,
        purchases: prev.purchases.filter((p) => p.id !== purchaseId),
        contacts: updatedContacts,
        products: updatedProducts,
      };
    });
  };

  const recordSale = (sale: Omit<Sale, 'id'>) => {
    const newSale: Sale = { ...sale, id: `sal-${Date.now()}` };

    setState((prev) => {
      // Update customer balance if due
      const updatedContacts = prev.contacts.map((c) => {
        if (c.id === newSale.customerId) {
          return {
            ...c,
            currentBalance: c.currentBalance + newSale.dueAmount,
          };
        }
        return c;
      });

      // Deduct stock if sale is final
      const updatedProducts = prev.products.map((p) => {
        const item = newSale.items.find((i) => i.productId === p.id);
        if (item && newSale.status === 'final') {
          const currentQty = p.locationStock[newSale.locationId] ?? 0;
          return {
            ...p,
            locationStock: {
              ...p.locationStock,
              [newSale.locationId]: Math.max(0, currentQty - item.quantity),
            },
          };
        }
        return p;
      });

      return {
        ...prev,
        sales: [newSale, ...prev.sales],
        contacts: updatedContacts,
        products: updatedProducts,
      };
    });
  };

  const updateSale = (updatedSale: Sale) => {
    setState((prev) => {
      const oldSale = prev.sales.find((s) => s.id === updatedSale.id);
      if (!oldSale) return prev;

      // Adjust customer balance
      const updatedContacts = prev.contacts.map((c) => {
        if (c.id === updatedSale.customerId) {
          const balanceWithoutOld = oldSale.customerId === updatedSale.customerId
            ? c.currentBalance - oldSale.dueAmount
            : c.currentBalance;
          return {
            ...c,
            currentBalance: balanceWithoutOld + updatedSale.dueAmount,
          };
        } else if (c.id === oldSale.customerId && oldSale.customerId !== updatedSale.customerId) {
          return {
            ...c,
            currentBalance: c.currentBalance - oldSale.dueAmount,
          };
        }
        return c;
      });

      // Clone products list for stock calculation
      let updatedProducts = [...prev.products];

      // Revert old stock deduction if old sale was final
      if (oldSale.status === 'final') {
        const oldQtyByProduct: Record<string, number> = {};
        for (const item of oldSale.items) {
          oldQtyByProduct[item.productId] = (oldQtyByProduct[item.productId] || 0) + item.quantity;
        }

        updatedProducts = updatedProducts.map((p) => {
          const qtyToRestore = oldQtyByProduct[p.id];
          if (qtyToRestore && qtyToRestore > 0) {
            const currentQty = p.locationStock[oldSale.locationId] ?? 0;
            return {
              ...p,
              locationStock: {
                ...p.locationStock,
                [oldSale.locationId]: currentQty + qtyToRestore,
              },
            };
          }
          return p;
        });
      }

      // Apply new stock deduction if updated sale is final
      if (updatedSale.status === 'final') {
        const newQtyByProduct: Record<string, number> = {};
        for (const item of updatedSale.items) {
          newQtyByProduct[item.productId] = (newQtyByProduct[item.productId] || 0) + item.quantity;
        }

        updatedProducts = updatedProducts.map((p) => {
          const qtyToDeduct = newQtyByProduct[p.id];
          if (qtyToDeduct && qtyToDeduct > 0) {
            const currentQty = p.locationStock[updatedSale.locationId] ?? 0;
            return {
              ...p,
              locationStock: {
                ...p.locationStock,
                [updatedSale.locationId]: Math.max(0, currentQty - qtyToDeduct),
              },
            };
          }
          return p;
        });
      }

      return {
        ...prev,
        sales: prev.sales.map((s) => (s.id === updatedSale.id ? updatedSale : s)),
        contacts: updatedContacts,
        products: updatedProducts,
      };
    });
  };

  const deleteSale = (saleId: string) => {
    setState((prev) => {
      const sale = prev.sales.find((s) => s.id === saleId);
      if (!sale) return prev;

      // Revert customer balance
      const updatedContacts = prev.contacts.map((c) => {
        if (c.id === sale.customerId) {
          return {
            ...c,
            currentBalance: Math.max(0, c.currentBalance - sale.dueAmount),
          };
        }
        return c;
      });

      // Revert stock if sale was final
      let updatedProducts = prev.products;
      if (sale.status === 'final') {
        const qtyByProduct: Record<string, number> = {};
        for (const item of sale.items) {
          qtyByProduct[item.productId] = (qtyByProduct[item.productId] || 0) + item.quantity;
        }

        updatedProducts = prev.products.map((p) => {
          const qtyToRestore = qtyByProduct[p.id];
          if (qtyToRestore && qtyToRestore > 0) {
            const currentQty = p.locationStock[sale.locationId] ?? 0;
            return {
              ...p,
              locationStock: {
                ...p.locationStock,
                [sale.locationId]: currentQty + qtyToRestore,
              },
            };
          }
          return p;
        });
      }

      return {
        ...prev,
        sales: prev.sales.filter((s) => s.id !== saleId),
        contacts: updatedContacts,
        products: updatedProducts,
      };
    });
  };

  const updateSaleStatus = (
    saleId: string,
    status: Sale['status'],
    paymentStatus: Sale['paymentStatus']
  ) => {
    setState((prev) => {
      const existing = prev.sales.find((s) => s.id === saleId);
      if (!existing) return prev;

      const wasFinal = existing.status === 'final';
      const isNowFinal = status === 'final';

      let updatedProducts = prev.products;

      // If transitioning from non-final (quotation/draft) to final, deduct stock
      if (!wasFinal && isNowFinal) {
        const qtyByProduct: Record<string, number> = {};
        for (const item of existing.items) {
          qtyByProduct[item.productId] = (qtyByProduct[item.productId] || 0) + item.quantity;
        }

        updatedProducts = prev.products.map((p) => {
          const qtyToDeduct = qtyByProduct[p.id];
          if (qtyToDeduct && qtyToDeduct > 0) {
            const currentQty = p.locationStock[existing.locationId] ?? 0;
            return {
              ...p,
              locationStock: {
                ...p.locationStock,
                [existing.locationId]: Math.max(0, currentQty - qtyToDeduct),
              },
            };
          }
          return p;
        });
      } else if (wasFinal && !isNowFinal) {
        // If transitioning from final to quotation/draft, restore stock
        const qtyByProduct: Record<string, number> = {};
        for (const item of existing.items) {
          qtyByProduct[item.productId] = (qtyByProduct[item.productId] || 0) + item.quantity;
        }

        updatedProducts = prev.products.map((p) => {
          const qtyToRestore = qtyByProduct[p.id];
          if (qtyToRestore && qtyToRestore > 0) {
            const currentQty = p.locationStock[existing.locationId] ?? 0;
            return {
              ...p,
              locationStock: {
                ...p.locationStock,
                [existing.locationId]: currentQty + qtyToRestore,
              },
            };
          }
          return p;
        });
      }

      const updatedSales = prev.sales.map((s) =>
        s.id === saleId ? { ...s, status, paymentStatus } : s
      );

      return {
        ...prev,
        sales: updatedSales,
        products: updatedProducts,
      };
    });
  };

  const recordExpense = (expense: Omit<Expense, 'id'>) => {
    const newExp: Expense = { ...expense, id: `exp-${Date.now()}` };
    setState((prev) => ({ ...prev, expenses: [newExp, ...prev.expenses] }));
  };

  const addExpenseCategory = (cat: Omit<ExpenseCategory, 'id'>) => {
    const newCat: ExpenseCategory = { ...cat, id: `exp-cat-${Date.now()}` };
    setState((prev) => ({
      ...prev,
      expenseCategories: [...prev.expenseCategories, newCat],
    }));
  };

  const recordStockAdjustment = (adj: Omit<StockAdjustment, 'id'>) => {
    const newAdj: StockAdjustment = { ...adj, id: `adj-${Date.now()}` };

    setState((prev) => {
      const updatedProducts = prev.products.map((p) => {
        if (p.id === newAdj.productId) {
          const currentQty = p.locationStock[newAdj.locationId] ?? 0;
          let delta = 0;
          if (
            newAdj.type === 'loss' ||
            newAdj.type === 'damage' ||
            newAdj.type === 'expired' ||
            newAdj.type === 'theft' ||
            newAdj.type === 'correction_sub'
          ) {
            delta = -newAdj.quantity;
          } else {
            delta = newAdj.quantity;
          }

          return {
            ...p,
            locationStock: {
              ...p.locationStock,
              [newAdj.locationId]: Math.max(0, currentQty + delta),
            },
          };
        }
        return p;
      });

      return {
        ...prev,
        stockAdjustments: [newAdj, ...prev.stockAdjustments],
        products: updatedProducts,
      };
    });
  };

  const updateStockAdjustment = (updatedAdj: StockAdjustment) => {
    setState((prev) => {
      const oldAdj = prev.stockAdjustments.find((a) => a.id === updatedAdj.id);
      if (!oldAdj) return prev;

      const isOldDeduction =
        oldAdj.type === 'loss' ||
        oldAdj.type === 'damage' ||
        oldAdj.type === 'expired' ||
        oldAdj.type === 'theft' ||
        oldAdj.type === 'correction_sub';
      const oldDelta = isOldDeduction ? -oldAdj.quantity : oldAdj.quantity;

      const isNewDeduction =
        updatedAdj.type === 'loss' ||
        updatedAdj.type === 'damage' ||
        updatedAdj.type === 'expired' ||
        updatedAdj.type === 'theft' ||
        updatedAdj.type === 'correction_sub';
      const newDelta = isNewDeduction ? -updatedAdj.quantity : updatedAdj.quantity;

      const updatedProducts = prev.products.map((p) => {
        if (p.id === updatedAdj.productId) {
          const currentQty = p.locationStock[updatedAdj.locationId] ?? 0;
          const adjustedQty = currentQty - oldDelta + newDelta;
          return {
            ...p,
            locationStock: {
              ...p.locationStock,
              [updatedAdj.locationId]: Math.max(0, adjustedQty),
            },
          };
        }
        return p;
      });

      return {
        ...prev,
        stockAdjustments: prev.stockAdjustments.map((a) => (a.id === updatedAdj.id ? updatedAdj : a)),
        products: updatedProducts,
      };
    });
  };

  const deleteStockAdjustment = (adjId: string) => {
    setState((prev) => {
      const adj = prev.stockAdjustments.find((a) => a.id === adjId);
      if (!adj) return prev;

      const isDeduction =
        adj.type === 'loss' ||
        adj.type === 'damage' ||
        adj.type === 'expired' ||
        adj.type === 'theft' ||
        adj.type === 'correction_sub';
      const delta = isDeduction ? -adj.quantity : adj.quantity;

      const updatedProducts = prev.products.map((p) => {
        if (p.id === adj.productId) {
          const currentQty = p.locationStock[adj.locationId] ?? 0;
          return {
            ...p,
            locationStock: {
              ...p.locationStock,
              [adj.locationId]: Math.max(0, currentQty - delta),
            },
          };
        }
        return p;
      });

      return {
        ...prev,
        stockAdjustments: prev.stockAdjustments.filter((a) => a.id !== adjId),
        products: updatedProducts,
      };
    });
  };

  const recordStockTransfer = (transfer: Omit<StockTransfer, 'id'>) => {
    const newTrf: StockTransfer = { ...transfer, id: `trf-${Date.now()}` };

    setState((prev) => {
      let updatedProducts = prev.products;

      if (newTrf.status === 'completed') {
        updatedProducts = prev.products.map((p) => {
          if (p.id === newTrf.productId) {
            const sourceQty = p.locationStock[newTrf.fromLocationId] ?? 0;
            const destQty = p.locationStock[newTrf.toLocationId] ?? 0;

            const newSourceQty = Math.max(0, sourceQty - newTrf.quantity);
            const newDestQty = destQty + newTrf.quantity;

            return {
              ...p,
              locationStock: {
                ...p.locationStock,
                [newTrf.fromLocationId]: newSourceQty,
                [newTrf.toLocationId]: newDestQty,
              },
            };
          }
          return p;
        });
      }

      return {
        ...prev,
        stockTransfers: [newTrf, ...(prev.stockTransfers || [])],
        products: updatedProducts,
      };
    });
  };

  const updateStockTransfer = (updatedTrf: StockTransfer) => {
    setState((prev) => {
      const oldTrf = (prev.stockTransfers || []).find((t) => t.id === updatedTrf.id);
      if (!oldTrf) return prev;

      let updatedProducts = [...prev.products];
      // Revert old transfer if it was completed
      if (oldTrf.status === 'completed') {
        updatedProducts = updatedProducts.map((p) => {
          if (p.id === oldTrf.productId) {
            const sourceQty = p.locationStock[oldTrf.fromLocationId] ?? 0;
            const destQty = p.locationStock[oldTrf.toLocationId] ?? 0;
            return {
              ...p,
              locationStock: {
                ...p.locationStock,
                [oldTrf.fromLocationId]: sourceQty + oldTrf.quantity,
                [oldTrf.toLocationId]: Math.max(0, destQty - oldTrf.quantity),
              },
            };
          }
          return p;
        });
      }

      // Apply new transfer if completed
      if (updatedTrf.status === 'completed') {
        updatedProducts = updatedProducts.map((p) => {
          if (p.id === updatedTrf.productId) {
            const sourceQty = p.locationStock[updatedTrf.fromLocationId] ?? 0;
            const destQty = p.locationStock[updatedTrf.toLocationId] ?? 0;
            return {
              ...p,
              locationStock: {
                ...p.locationStock,
                [updatedTrf.fromLocationId]: Math.max(0, sourceQty - updatedTrf.quantity),
                [updatedTrf.toLocationId]: destQty + updatedTrf.quantity,
              },
            };
          }
          return p;
        });
      }

      return {
        ...prev,
        stockTransfers: (prev.stockTransfers || []).map((t) => (t.id === updatedTrf.id ? updatedTrf : t)),
        products: updatedProducts,
      };
    });
  };

  const deleteStockTransfer = (transferId: string) => {
    setState((prev) => {
      const trf = (prev.stockTransfers || []).find((t) => t.id === transferId);
      if (!trf) return prev;

      let updatedProducts = prev.products;
      if (trf.status === 'completed') {
        updatedProducts = prev.products.map((p) => {
          if (p.id === trf.productId) {
            const sourceQty = p.locationStock[trf.fromLocationId] ?? 0;
            const destQty = p.locationStock[trf.toLocationId] ?? 0;
            return {
              ...p,
              locationStock: {
                ...p.locationStock,
                [trf.fromLocationId]: sourceQty + trf.quantity,
                [trf.toLocationId]: Math.max(0, destQty - trf.quantity),
              },
            };
          }
          return p;
        });
      }

      return {
        ...prev,
        stockTransfers: (prev.stockTransfers || []).filter((t) => t.id !== transferId),
        products: updatedProducts,
      };
    });
  };

  // Stock Physical Inventory Management
  const createStockInventory = (invData: Omit<StockInventory, 'id'>): StockInventory => {
    const newId = `inv-${Date.now()}`;
    let items = invData.items || [];

    // If items not provided, automatically generate snapshot items for the location and target scope
    if (items.length === 0) {
      const locationId = invData.locationId;
      const targetCategoryIds = invData.categoryIds || [];

      state.products
        .filter((p) => p.businessId === invData.businessId)
        .filter((p) => {
          if (invData.type === 'partial' && targetCategoryIds.length > 0) {
            return p.categoryId && targetCategoryIds.includes(p.categoryId);
          }
          return true;
        })
        .forEach((p) => {
          const category = state.categories.find((c) => c.id === p.categoryId);
          const unit = state.units.find((u) => u.id === p.unitId);

          if (p.type === 'variable' && p.variations && p.variations.length > 0) {
            p.variations.forEach((v) => {
              const theoreticalQty = v.locationStock[locationId] ?? 0;
              items.push({
                id: `inv-item-${Date.now()}-${p.id}-${v.id}`,
                productId: p.id,
                variationId: v.id,
                productName: `${p.name} - ${v.name}`,
                sku: `${p.sku}${v.skuSuffix}`,
                categoryName: category?.name,
                unitName: unit?.shortName || unit?.name || 'pcs',
                purchasePrice: v.purchasePrice || p.purchasePrice,
                sellingPrice: v.sellingPrice || p.sellingPrice,
                theoreticalQty,
                physicalQty: null,
                varianceQty: 0,
                varianceCost: 0,
                isCounted: false,
              });
            });
          } else {
            const theoreticalQty = p.locationStock[locationId] ?? 0;
            items.push({
              id: `inv-item-${Date.now()}-${p.id}`,
              productId: p.id,
              productName: p.name,
              sku: p.sku,
              barcode: p.barcode,
              categoryName: category?.name,
              unitName: unit?.shortName || unit?.name || 'pcs',
              purchasePrice: p.purchasePrice,
              sellingPrice: p.sellingPrice,
              theoreticalQty,
              physicalQty: null,
              varianceQty: 0,
              varianceCost: 0,
              isCounted: false,
            });
          }
        });
    }

    const totalTheoreticalQty = items.reduce((acc, i) => acc + i.theoreticalQty, 0);

    const newInventory: StockInventory = {
      ...invData,
      id: newId,
      items,
      totalTheoreticalQty,
      totalPhysicalQty: 0,
      totalVarianceQty: 0,
      totalVarianceCost: 0,
      accuracyRate: 100,
    };

    setState((prev) => ({
      ...prev,
      stockInventories: [newInventory, ...(prev.stockInventories || [])],
    }));

    return newInventory;
  };

  const updateStockInventory = (updatedInv: StockInventory) => {
    // Recalculate item variances and aggregate inventory statistics
    const recalculatedItems = updatedInv.items.map((item) => {
      if (item.physicalQty !== null && item.physicalQty !== undefined) {
        const varianceQty = item.physicalQty - item.theoreticalQty;
        const varianceCost = varianceQty * item.purchasePrice;
        return {
          ...item,
          varianceQty,
          varianceCost,
          isCounted: true,
        };
      }
      return {
        ...item,
        varianceQty: 0,
        varianceCost: 0,
        isCounted: false,
      };
    });

    const countedItems = recalculatedItems.filter((i) => i.isCounted);
    const totalPhysicalQty = recalculatedItems.reduce(
      (acc, i) => acc + (i.physicalQty !== null ? (i.physicalQty ?? 0) : 0),
      0
    );
    const totalVarianceQty = recalculatedItems.reduce(
      (acc, i) => acc + (i.isCounted ? i.varianceQty : 0),
      0
    );
    const totalVarianceCost = recalculatedItems.reduce(
      (acc, i) => acc + (i.isCounted ? i.varianceCost : 0),
      0
    );

    const accurateCount = countedItems.filter((i) => i.varianceQty === 0).length;
    const accuracyRate =
      countedItems.length > 0
        ? Math.round((accurateCount / countedItems.length) * 1000) / 10
        : 100;

    const finalInv: StockInventory = {
      ...updatedInv,
      items: recalculatedItems,
      totalPhysicalQty,
      totalVarianceQty,
      totalVarianceCost,
      accuracyRate,
    };

    setState((prev) => ({
      ...prev,
      stockInventories: (prev.stockInventories || []).map((inv) =>
        inv.id === finalInv.id ? finalInv : inv
      ),
    }));
  };

  const reconcileStockInventory = (inventoryId: string) => {
    setState((prev) => {
      const inv = (prev.stockInventories || []).find((i) => i.id === inventoryId);
      if (!inv) return prev;

      const locationId = inv.locationId;
      let updatedProducts = [...prev.products];
      const newAdjustments: StockAdjustment[] = [];
      const now = new Date().toISOString().split('T')[0];

      // Reconcile product location stocks based on counted physical quantities
      inv.items.forEach((item) => {
        if (item.physicalQty !== null && item.physicalQty !== undefined) {
          updatedProducts = updatedProducts.map((p) => {
            if (p.id === item.productId) {
              if (item.variationId && p.variations) {
                const updatedVariations = p.variations.map((v) => {
                  if (v.id === item.variationId) {
                    return {
                      ...v,
                      locationStock: {
                        ...v.locationStock,
                        [locationId]: item.physicalQty!,
                      },
                    };
                  }
                  return v;
                });
                return { ...p, variations: updatedVariations };
              } else {
                return {
                  ...p,
                  locationStock: {
                    ...p.locationStock,
                    [locationId]: item.physicalQty!,
                  },
                };
              }
            }
            return p;
          });

          // If there is a stock discrepancy, generate a traceable StockAdjustment record
          if (item.varianceQty !== 0) {
            let adjType: StockAdjustment['type'] = 'correction_sub';
            if (item.varianceQty > 0) {
              adjType = 'correction_add';
            } else {
              const reasonLower = (item.varianceReason || '').toLowerCase();
              if (reasonLower.includes('casse') || reasonLower.includes('abîmé') || reasonLower.includes('défect')) {
                adjType = 'damage';
              } else if (reasonLower.includes('vol') || reasonLower.includes('perdu')) {
                adjType = 'theft';
              } else if (reasonLower.includes('périmé') || reasonLower.includes('expire')) {
                adjType = 'expired';
              } else {
                adjType = 'correction_sub';
              }
            }

            newAdjustments.push({
              id: `adj-inv-${Date.now()}-${item.id}`,
              businessId: inv.businessId,
              locationId: inv.locationId,
              referenceNo: `ADJ-${inv.referenceNo}`,
              date: now,
              type: adjType,
              productId: item.productId,
              variationId: item.variationId,
              quantity: Math.abs(item.varianceQty),
              reason: item.varianceReason || `Ajustement réconciliation inventaire physique (${inv.referenceNo})`,
            });
          }
        }
      });

      const completedInv: StockInventory = {
        ...inv,
        status: 'completed',
        completedDate: now,
      };

      return {
        ...prev,
        products: updatedProducts,
        stockAdjustments: [...newAdjustments, ...prev.stockAdjustments],
        stockInventories: (prev.stockInventories || []).map((i) =>
          i.id === inventoryId ? completedInv : i
        ),
      };
    });
  };

  const cancelStockInventory = (inventoryId: string) => {
    setState((prev) => ({
      ...prev,
      stockInventories: (prev.stockInventories || []).map((i) =>
        i.id === inventoryId ? { ...i, status: 'cancelled' } : i
      ),
    }));
  };

  const deleteStockInventory = (inventoryId: string) => {
    setState((prev) => ({
      ...prev,
      stockInventories: (prev.stockInventories || []).filter((i) => i.id !== inventoryId),
    }));
  };

  const openRegister = (initialCash: number) => {
    const newRegister: RegisterLog = {
      id: `reg-${Date.now()}`,
      businessId: currentBusiness.id,
      locationId: state.currentLocationId === 'all' ? state.locations[0].id : state.currentLocationId,
      userId: currentUser.id,
      openedAt: new Date().toISOString(),
      initialCash,
      totalCashSales: 0,
      totalCardSales: 0,
      totalMobileSales: 0,
      totalExpenses: 0,
      closingCashCalculated: initialCash,
      status: 'open',
    };

    setState((prev) => ({
      ...prev,
      registerLogs: [newRegister, ...prev.registerLogs],
    }));
  };

  const closeRegister = (actualCash: number, notes?: string) => {
    setState((prev) => {
      const openLog = prev.registerLogs.find(
        (r) => r.businessId === currentBusiness.id && r.status === 'open'
      );
      if (!openLog) return prev;

      const updatedLogs = prev.registerLogs.map((r) =>
        r.id === openLog.id
          ? {
              ...r,
              closedAt: new Date().toISOString(),
              closingCashActual: actualCash,
              notes,
              status: 'closed' as const,
            }
          : r
      );

      return { ...prev, registerLogs: updatedLogs };
    });
  };

  const resetAllData = () => {
    const fresh = resetERPState();
    setState(fresh);
  };

  const exportDatabase = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ERP_Sauvegarde_${currentBusiness.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importDatabase = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && parsed.businesses && parsed.products) {
        setState(parsed);
        saveERPState(parsed);
        return true;
      }
    } catch (e) {
      console.error('Import error:', e);
    }
    return false;
  };

  return (
    <ERPContext.Provider
      value={{
        state,
        currentBusiness,
        currentLocation,
        currentUser,
        currentRole,
        paymentAlerts,
        lowStockAlerts,
        isOffline,

        setBusinessId,
        setLocationId,
        setUserId,
        setLanguage,
        addBusiness,
        updateBusiness,
        addLocation,
        updateLocation,
        deleteLocation,

        addUser,
        updateUser,
        deleteUser,
        addRole,
        updateRole,
        deleteRole,

        addContact,
        updateContact,
        deleteContact,

        addProduct,
        bulkImportProducts,
        updateProduct,
        deleteProduct,
        deleteProducts,
        addCategory,
        updateCategory,
        deleteCategory,
        addSubCategory,
        updateSubCategory,
        deleteSubCategory,
        addBrand,
        updateBrand,
        deleteBrand,
        addUnit,
        updateUnit,
        deleteUnit,
        addVariationTemplate,
        updateVariationTemplate,
        deleteVariationTemplate,

        recordPurchase,
        updatePurchase,
        deletePurchase,
        recordSale,
        updateSale,
        deleteSale,
        updateSaleStatus,
        recordExpense,
        addExpenseCategory,
        recordStockAdjustment,
        updateStockAdjustment,
        deleteStockAdjustment,
        recordStockTransfer,
        updateStockTransfer,
        deleteStockTransfer,
        createStockInventory,
        updateStockInventory,
        reconcileStockInventory,
        cancelStockInventory,
        deleteStockInventory,

        openRegister,
        closeRegister,

        loginWithFirebaseUser,
        authenticateUserWithEmailPassword,
        logout,

        resetAllData,
        exportDatabase,
        importDatabase,
        hasPermission,

        cloudSyncStatus,
        lastCloudSyncTime,
        forceCloudSync,
        isFirebaseAdmin,
        logoutReason,
        clearLogoutReason,
        idleTimeoutMs,
        warningLeadMs,
      }}
    >
      {children}
    </ERPContext.Provider>
  );
};

export const useERP = () => {
  const context = useContext(ERPContext);
  if (!context) {
    throw new Error('useERP must be used within an ERPProvider');
  }
  return context;
};
