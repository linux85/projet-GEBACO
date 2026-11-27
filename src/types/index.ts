export type Permission =
  | 'manage_businesses'
  | 'manage_locations'
  | 'manage_users'
  | 'manage_roles'
  | 'view_contacts'
  | 'manage_contacts'
  | 'view_products'
  | 'manage_products'
  | 'view_purchases'
  | 'manage_purchases'
  | 'access_pos'
  | 'view_sales'
  | 'manage_sales'
  | 'view_expenses'
  | 'manage_expenses'
  | 'view_reports'
  | 'adjust_stock'
  | 'print_barcodes'
  | 'manage_settings';

export interface Role {
  id: string;
  businessId?: string;
  name: string;
  isPredefined: boolean;
  description?: string;
  permissions: Permission[];
}

export interface User {
  id: string;
  businessId: string;
  name: string;
  email: string;
  passwordHash?: string;
  hasPassword?: boolean;
  passwordUpdatedAt?: string;
  roleId: string;
  locationIds: string[]; // Access to locations (empty = all)
  phone?: string;
  isActive: boolean;
  status?: 'active' | 'inactive';
  avatar?: string;
  twoFactorEnabled?: boolean;
}

export interface InvoiceLayout {
  headerText: string;
  footerText: string;
  showLogo: boolean;
  logoUrl?: string;
  invoicePrefix: string;
  quotationPrefix: string;
  primaryColor: string;
  showTaxDetails: boolean;
  termsAndConditions: string;
}

export interface BusinessLocation {
  id: string;
  businessId: string;
  name: string; // e.g., "Siège Principal", "Boutique Centre-Ville", "Entrepôt Nord"
  code: string; // e.g., "LOC-01"
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  invoiceLayout: InvoiceLayout;
  isDefault?: boolean;
}

export interface Business {
  id: string;
  name: string;
  logo?: string;
  currencySymbol: string; // e.g., "FCFA", "€", "$", "MAD"
  currencyCode: string; // "XOF", "EUR", "USD", "MAD"
  currency?: string;
  timezone: string; // e.g., "Africa/Abidjan", "Europe/Paris"
  financialYearStartMonth: number; // 1 to 12
  defaultProfitMargin: number; // e.g., 25%
  taxNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  skuPrefix?: string;
  createdAt: string;
}

export type ContactType = 'customer' | 'supplier' | 'both';

export interface Contact {
  id: string;
  businessId: string;
  type: ContactType;
  name: string;
  companyName?: string;
  email?: string;
  phone: string;
  address?: string;
  taxNumber?: string;
  creditLimit?: number;
  paymentTermsDays: number; // e.g., 7, 14, 30
  currentBalance: number; // positive = customer owes us (debit), negative = we owe supplier (credit)
  isDefaultWalkIn?: boolean;
}

export interface Brand {
  id: string;
  businessId: string;
  name: string;
  description?: string;
}

export interface Category {
  id: string;
  businessId: string;
  name: string;
  code?: string;
}

export interface SubCategory {
  id: string;
  businessId?: string;
  categoryId: string;
  name: string;
  code?: string;
}

export interface Unit {
  id: string;
  businessId: string;
  name: string; // e.g. "Pièce", "Kilogramme", "Carton", "Litre"
  shortName: string; // "pcs", "kg", "ctn", "L"
  allowDecimal: boolean;
}

export interface VariationValue {
  id: string;
  name: string; // e.g. "Rouge", "Taille L", "500g"
  skuSuffix: string; // e.g. "-RED"
  purchasePrice: number;
  profitMargin: number; // %
  sellingPrice: number;
  locationStock: Record<string, number>; // locationId -> stock count
}

export interface VariationTemplate {
  id: string;
  businessId: string;
  name: string; // e.g. "Couleurs & Tailles", "Pointures"
  values: string[]; // e.g. ["S", "M", "L", "XL"] or ["Rouge", "Bleu", "Vert"]
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  type: 'single' | 'variable';
  sku: string;
  barcode?: string;
  brandId?: string;
  categoryId?: string;
  subCategoryId?: string;
  unitId: string;
  image?: string;
  alertQuantity: number; // Low stock alert threshold
  taxRate: number; // e.g., 18% VAT or 0%
  // Single product attributes:
  purchasePrice: number;
  profitMargin: number; // %
  sellingPrice: number; // Auto calculated: purchasePrice * (1 + margin/100) + tax
  locationStock: Record<string, number>; // locationId -> quantity
  // Variable product attributes:
  variations?: VariationValue[];
  variationTemplateId?: string;
}

export type PurchaseStatus = 'received' | 'pending' | 'ordered';
export type PaymentStatus = 'paid' | 'due' | 'partial';

export interface PurchaseItem {
  productId: string;
  variationId?: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface Purchase {
  id: string;
  businessId: string;
  locationId: string;
  supplierId: string;
  referenceNo: string;
  purchaseDate: string;
  paymentDueDate: string; // Used for 7-day payment due alert
  status: PurchaseStatus;
  paymentStatus: PaymentStatus;
  items: PurchaseItem[];
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  notes?: string;
}

export type SaleStatus = 'final' | 'draft' | 'quotation';
export type PaymentMethod = 'cash' | 'card' | 'mobile_money' | 'check' | 'bank_transfer';

export interface SaleItem {
  productId: string;
  variationId?: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  taxAmount: number;
  discountAmount: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  businessId: string;
  locationId: string;
  customerId: string;
  userId: string; // Cashier / Sales rep
  invoiceNo: string;
  saleDate: string;
  status: SaleStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  items: SaleItem[];
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  notes?: string;
  isExpress?: boolean;
}

export interface ExpenseCategory {
  id: string;
  businessId: string;
  name: string; // e.g., "Loyer", "Électricité", "Transport", "Marketing", "Fournitures"
  code?: string;
}

export interface Expense {
  id: string;
  businessId: string;
  locationId: string;
  categoryId: string;
  referenceNo: string;
  expenseDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  note?: string;
  attachmentUrl?: string;
}

export type AdjustmentType = 'loss' | 'damage' | 'expired' | 'theft' | 'correction_add' | 'correction_sub';

export interface StockAdjustment {
  id: string;
  businessId: string;
  locationId: string;
  referenceNo: string;
  date: string;
  type: AdjustmentType;
  productId: string;
  variationId?: string;
  quantity: number; // positive number adjusted
  reason: string;
}

export type TransferStatus = 'completed' | 'pending' | 'cancelled' | 'in_transit';

export type InventoryStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';
export type InventoryType = 'full' | 'partial';

export interface StockInventoryItem {
  id: string;
  productId: string;
  variationId?: string;
  productName: string;
  sku: string;
  barcode?: string;
  categoryName?: string;
  unitName: string;
  purchasePrice: number;
  sellingPrice: number;
  theoreticalQty: number;
  physicalQty: number | null;
  varianceQty: number;
  varianceCost: number;
  varianceReason?: string;
  isCounted: boolean;
  notes?: string;
}

export interface StockInventory {
  id: string;
  businessId: string;
  locationId: string;
  referenceNo: string;
  title: string;
  type: InventoryType;
  categoryIds?: string[];
  status: InventoryStatus;
  startDate: string;
  completedDate?: string;
  countedBy: string;
  supervisedBy?: string;
  notes?: string;
  isBlindCount: boolean;
  items: StockInventoryItem[];
  totalTheoreticalQty: number;
  totalPhysicalQty: number;
  totalVarianceQty: number;
  totalVarianceCost: number;
  accuracyRate: number;
}

export interface StockTransfer {
  id: string;
  businessId: string;
  referenceNo: string;
  date: string;
  fromLocationId: string;
  toLocationId: string;
  productId: string;
  variationId?: string;
  quantity: number;
  status: TransferStatus;
  notes?: string;
  createdBy?: string;
}

export interface RegisterLog {
  id: string;
  businessId: string;
  locationId: string;
  userId: string;
  openedAt: string;
  closedAt?: string;
  initialCash: number;
  totalCashSales: number;
  totalCardSales: number;
  totalMobileSales: number;
  totalExpenses: number;
  closingCashCalculated: number;
  closingCashActual?: number;
  notes?: string;
  status: 'open' | 'closed';
}

export interface BarcodeSetting {
  id: string;
  businessId: string;
  name: string;
  paperWidthMm: number; // e.g. 50mm
  paperHeightMm: number; // e.g. 30mm
  labelsPerRow: number;
  showProductName: boolean;
  showPrice: boolean;
  showSku: boolean;
  showBusinessName: boolean;
}

export interface PaymentDueAlert {
  id: string;
  type: 'purchase_due' | 'customer_due';
  referenceNo: string;
  contactName: string;
  dueDate: string;
  daysRemaining: number;
  amountDue: number;
  locationName: string;
}

export interface LowStockAlert {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  alertQuantity: number;
  locationName: string;
}
