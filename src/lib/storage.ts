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
  RegisterLog,
  BarcodeSetting,
  PaymentDueAlert,
  LowStockAlert,
} from '../types';

import {
  initialRoles,
  initialBusinesses,
  initialLocations,
  initialUsers,
  initialCategories,
  initialSubCategories,
  initialBrands,
  initialUnits,
  initialVariationTemplates,
  initialContacts,
  initialProducts,
  initialPurchases,
  initialSales,
  initialExpenseCategories,
  initialExpenses,
  initialAdjustments,
  initialTransfers,
  initialStockInventories,
  initialRegisterLogs,
  initialBarcodeSettings,
} from '../data/initialData';

const STORAGE_KEY = 'erp_app_state_v1';
const SESSION_STORAGE_KEY = 'erp_client_session_v1';

export interface ERPClientSession {
  currentBusinessId: string;
  currentLocationId: string; // 'all' or locationId
  currentUserId: string;
  isAuthenticated: boolean;
  language: 'fr' | 'en';
}

export interface ERPState {
  businesses: Business[];
  locations: BusinessLocation[];
  roles: Role[];
  users: User[];
  categories: Category[];
  subCategories: SubCategory[];
  brands: Brand[];
  units: Unit[];
  variationTemplates: VariationTemplate[];
  contacts: Contact[];
  products: Product[];
  purchases: Purchase[];
  sales: Sale[];
  expenseCategories: ExpenseCategory[];
  expenses: Expense[];
  stockAdjustments: StockAdjustment[];
  stockTransfers: StockTransfer[];
  stockInventories: StockInventory[];
  registerLogs: RegisterLog[];
  barcodeSettings: BarcodeSetting[];
  currentBusinessId: string;
  currentLocationId: string; // 'all' or locationId
  currentUserId: string;
  isAuthenticated: boolean;
  language: 'fr' | 'en';
}

export type ERPSharedData = Omit<
  ERPState,
  'currentBusinessId' | 'currentLocationId' | 'currentUserId' | 'isAuthenticated' | 'language'
>;

/**
 * Get client local session (device-specific authentication & active user)
 */
export function getClientSession(): ERPClientSession {
  try {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed.isAuthenticated === 'boolean') {
        return {
          currentBusinessId: parsed.currentBusinessId || 'biz-1',
          currentLocationId: parsed.currentLocationId || 'loc-1',
          currentUserId: parsed.currentUserId || 'usr-1',
          isAuthenticated: parsed.isAuthenticated,
          language: parsed.language || 'fr',
        };
      }
    }
  } catch (err) {
    console.error('Failed to load client session from localStorage:', err);
  }

  return {
    currentBusinessId: 'biz-1',
    currentLocationId: 'loc-1',
    currentUserId: 'usr-1',
    isAuthenticated: false,
    language: 'fr',
  };
}

/**
 * Save client local session (device-specific)
 */
export function saveClientSession(session: Partial<ERPClientSession>) {
  try {
    const current = getClientSession();
    const updated: ERPClientSession = {
      ...current,
      ...session,
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save client session to localStorage:', err);
  }
}

/**
 * Extract only shared database entities from ERPState
 */
export function extractSharedERPData(state: ERPState): ERPSharedData {
  return {
    businesses: state.businesses,
    locations: state.locations,
    roles: state.roles,
    users: state.users,
    categories: state.categories,
    subCategories: state.subCategories || [],
    brands: state.brands,
    units: state.units,
    variationTemplates: state.variationTemplates,
    contacts: state.contacts,
    products: state.products,
    purchases: state.purchases,
    sales: state.sales,
    expenseCategories: state.expenseCategories,
    expenses: state.expenses,
    stockAdjustments: state.stockAdjustments,
    stockTransfers: state.stockTransfers || [],
    stockInventories: state.stockInventories || [],
    registerLogs: state.registerLogs || [],
    barcodeSettings: state.barcodeSettings || [],
  };
}

export function normalizeERPState(raw: any, sessionOverrides?: Partial<ERPClientSession>): ERPState {
  const session = getClientSession();
  const rawObj = raw && typeof raw === 'object' ? raw : {};

  const businesses =
    Array.isArray(rawObj.businesses) && rawObj.businesses.length > 0
      ? rawObj.businesses
      : initialBusinesses;

  const rawUsers =
    Array.isArray(rawObj.users) && rawObj.users.length > 0
      ? [...rawObj.users]
      : [...initialUsers];

  const users = rawUsers.map((u: any) => {
    if (!u || typeof u !== 'object') return u;
    const { password: _legacyPlaintext, passwordHash, ...sanitized } = u;
    const isAdminByUid = sanitized.firebaseUid === 'wepPnaRsYuW3kHDuNBTQdjMZLNj1';
    return {
      ...sanitized,
      roleId: isAdminByUid ? 'role-admin' : sanitized.roleId,
      isActive: isAdminByUid ? true : sanitized.isActive,
      hasPassword: Boolean(passwordHash || sanitized.hasPassword),
    };
  });

  if (
    !users.some(
      (u: any) =>
        u &&
        (u.firebaseUid === 'wepPnaRsYuW3kHDuNBTQdjMZLNj1' ||
          u.email?.toLowerCase() === 'jnoufe@gmail.com' ||
          u.id === 'usr-firebase-admin')
    )
  ) {
    users.unshift({
      id: 'usr-firebase-admin',
      businessId: businesses[0]?.id || 'biz-1',
      name: 'Administrateur Firebase',
      email: 'jnoufe@gmail.com',
      roleId: 'role-admin',
      locationIds: [],
      phone: '+225 07 00 00 00 00',
      isActive: true,
      twoFactorEnabled: false,
    });
  }

  const roles =
    Array.isArray(rawObj.roles) && rawObj.roles.length > 0
      ? rawObj.roles
      : initialRoles;

  const currentBusinessId =
    sessionOverrides?.currentBusinessId ||
    rawObj.currentBusinessId ||
    session.currentBusinessId ||
    businesses[0]?.id ||
    'biz-1';

  const currentUserId =
    sessionOverrides?.currentUserId ||
    rawObj.currentUserId ||
    session.currentUserId ||
    users[0]?.id ||
    'usr-1';

  const currentLocationId =
    sessionOverrides?.currentLocationId ||
    rawObj.currentLocationId ||
    session.currentLocationId ||
    'loc-1';

  const isAuthenticated =
    typeof sessionOverrides?.isAuthenticated === 'boolean'
      ? sessionOverrides.isAuthenticated
      : typeof rawObj.isAuthenticated === 'boolean'
      ? rawObj.isAuthenticated
      : session.isAuthenticated;

  const language =
    sessionOverrides?.language ||
    rawObj.language ||
    session.language ||
    'fr';

  return {
    businesses,
    locations: Array.isArray(rawObj.locations) ? rawObj.locations : initialLocations,
    roles,
    users,
    categories: Array.isArray(rawObj.categories) ? rawObj.categories : initialCategories,
    subCategories: Array.isArray(rawObj.subCategories) ? rawObj.subCategories : initialSubCategories,
    brands: Array.isArray(rawObj.brands) ? rawObj.brands : initialBrands,
    units: Array.isArray(rawObj.units) ? rawObj.units : initialUnits,
    variationTemplates: Array.isArray(rawObj.variationTemplates) ? rawObj.variationTemplates : initialVariationTemplates,
    contacts: Array.isArray(rawObj.contacts) ? rawObj.contacts : initialContacts,
    products: Array.isArray(rawObj.products) ? rawObj.products : initialProducts,
    purchases: Array.isArray(rawObj.purchases) ? rawObj.purchases : initialPurchases,
    sales: Array.isArray(rawObj.sales) ? rawObj.sales : initialSales,
    expenseCategories: Array.isArray(rawObj.expenseCategories) ? rawObj.expenseCategories : initialExpenseCategories,
    expenses: Array.isArray(rawObj.expenses) ? rawObj.expenses : initialExpenses,
    stockAdjustments: Array.isArray(rawObj.stockAdjustments) ? rawObj.stockAdjustments : initialAdjustments,
    stockTransfers: Array.isArray(rawObj.stockTransfers) ? rawObj.stockTransfers : initialTransfers,
    stockInventories: Array.isArray(rawObj.stockInventories) ? rawObj.stockInventories : initialStockInventories,
    registerLogs: Array.isArray(rawObj.registerLogs) ? rawObj.registerLogs : initialRegisterLogs,
    barcodeSettings: Array.isArray(rawObj.barcodeSettings) ? rawObj.barcodeSettings : initialBarcodeSettings,
    currentBusinessId,
    currentLocationId,
    currentUserId,
    isAuthenticated,
    language,
  };
}

export function getInitialERPState(): ERPState {
  const session = getClientSession();

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return normalizeERPState(parsed, session);
      }
    }
  } catch (err) {
    console.error('Failed to load ERP state from localStorage:', err);
  }

  return normalizeERPState({}, session);
}

export function saveERPState(state: ERPState) {
  try {
    saveClientSession({
      currentBusinessId: state.currentBusinessId,
      currentLocationId: state.currentLocationId,
      currentUserId: state.currentUserId,
      isAuthenticated: state.isAuthenticated,
      language: state.language,
    });
    const sanitizedState: ERPState = {
      ...state,
      users: (state.users || []).map((u) => {
        if (!u || typeof u !== 'object') return u;
        const { passwordHash, ...rest } = u;
        return {
          ...rest,
          hasPassword: Boolean(passwordHash || u.hasPassword),
        };
      }),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedState));
  } catch (err) {
    console.error('Failed to save ERP state to localStorage:', err);
  }
}

export function resetERPState(): ERPState {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SESSION_STORAGE_KEY);
  const fresh = getInitialERPState();
  saveERPState(fresh);
  return fresh;
}

// Compute alerts helper
export function computeAlerts(state: ERPState, businessId: string, locationId: string): {
  paymentAlerts: PaymentDueAlert[];
  lowStockAlerts: LowStockAlert[];
} {
  const paymentAlerts: PaymentDueAlert[] = [];
  const lowStockAlerts: LowStockAlert[] = [];

  if (!state) return { paymentAlerts, lowStockAlerts };

  const now = new Date();
  const purchases = (state.purchases || []).filter((p) => {
    if (!p) return false;
    if (p.businessId !== businessId) return false;
    if (locationId !== 'all' && p.locationId !== locationId) return false;
    return p.paymentStatus !== 'paid' && (p.dueAmount || 0) > 0;
  });

  purchases.forEach((p) => {
    if (!p.paymentDueDate) return;
    const dueDate = new Date(p.paymentDueDate);
    if (isNaN(dueDate.getTime())) return;
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) {
      const supplier = (state.contacts || []).find((c) => c.id === p.supplierId);
      const loc = (state.locations || []).find((l) => l.id === p.locationId);
      paymentAlerts.push({
        id: `alert-pur-${p.id}`,
        type: 'purchase_due',
        referenceNo: p.referenceNo || 'N/A',
        contactName: supplier ? supplier.name : 'Fournisseur Inconnu',
        dueDate: p.paymentDueDate,
        daysRemaining: diffDays,
        amountDue: p.dueAmount || 0,
        locationName: loc ? loc.name : 'Tous emplacements',
      });
    }
  });

  // 2. Customer payment due alerts (for customers with balance)
  const customers = (state.contacts || []).filter((c) => c && c.businessId === businessId && (c.currentBalance || 0) > 0);
  customers.forEach((c) => {
    // Find customer sales with due amounts
    const customerSales = (state.sales || []).filter((s) => s && s.businessId === businessId && s.customerId === c.id && (s.dueAmount || 0) > 0);
    customerSales.forEach((s) => {
      if (!s.saleDate) return;
      const saleDate = new Date(s.saleDate);
      if (isNaN(saleDate.getTime())) return;
      const dueDate = new Date(saleDate);
      dueDate.setDate(dueDate.getDate() + (c.paymentTermsDays || 30));
      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 7) {
        const loc = (state.locations || []).find((l) => l.id === s.locationId);
        paymentAlerts.push({
          id: `alert-cust-${s.id}`,
          type: 'customer_due',
          referenceNo: s.invoiceNo || 'N/A',
          contactName: c.name,
          dueDate: dueDate.toISOString().split('T')[0],
          daysRemaining: diffDays,
          amountDue: s.dueAmount || 0,
          locationName: loc ? loc.name : 'Tous emplacements',
        });
      }
    });
  });

  // 3. Low stock alerts per location
  const products = (state.products || []).filter((p) => p && p.businessId === businessId);
  products.forEach((p) => {
    if (!p.locationStock) return;
    const checkLocations = locationId === 'all'
      ? (state.locations || []).filter((l) => l.businessId === businessId)
      : (state.locations || []).filter((l) => l.id === locationId);

    checkLocations.forEach((loc) => {
      const qty = p.locationStock[loc.id] ?? 0;
      if (qty <= (p.alertQuantity ?? 0)) {
        lowStockAlerts.push({
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          currentStock: qty,
          alertQuantity: p.alertQuantity ?? 0,
          locationName: loc.name,
        });
      }
    });
  });

  return { paymentAlerts, lowStockAlerts };
}
