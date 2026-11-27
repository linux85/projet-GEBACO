import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { downloadCSV } from '../../lib/csvExport';
import {
  exportProductsStockToExcel,
  exportProductsStockToCSV,
  buildProductStockExportRows,
} from '../../lib/productStockExport';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Download,
  Package,
  ShoppingCart,
  Building2,
  Calendar,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ArrowDownToLine,
  Sliders,
  DollarSign,
  TrendingUp,
  Tag,
  CreditCard,
  User,
  Check,
  Upload,
  FileText,
} from 'lucide-react';
import { Product, Sale, SaleItem } from '../../types';
import { ProductImportModal } from '../products/ProductImportModal';
import { ProductExportModal } from '../products/ProductExportModal';

// Helper to safely calculate stock counts across locations
const getStockSum = (locationStock?: Record<string, number>, locFilter: string = 'all'): number => {
  if (!locationStock) return 0;
  if (locFilter === 'all') {
    return Object.values(locationStock).reduce((sum: number, qty) => sum + (Number(qty) || 0), 0);
  }
  return Number(locationStock[locFilter]) || 0;
};

const getProductTotalStock = (p: Product, locFilter: string = 'all'): number => {
  if (p.type === 'variable' && p.variations) {
    return p.variations.reduce((sum, v) => sum + getStockSum(v.locationStock, locFilter), 0);
  }
  return getStockSum(p.locationStock, locFilter);
};

interface InventoryDataExportViewProps {
  onBackToCampaigns?: () => void;
}

export const InventoryDataExportView: React.FC<InventoryDataExportViewProps> = ({ onBackToCampaigns }) => {
  const { state, currentBusiness, currentLocation } = useERP();

  // Active export section: products or sales
  const [activeExportType, setActiveExportType] = useState<'products' | 'sales'>('products');

  // Success download toast state
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // -------------------------------------------------------------
  // 1. PRODUCT EXPORT STATE & FILTERS
  // -------------------------------------------------------------
  const [productLocationFilter, setProductLocationFilter] = useState<string>(
    state.currentLocationId === 'all' ? 'all' : state.currentLocationId
  );
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');
  const [productBrandFilter, setProductBrandFilter] = useState<string>('all');
  const [productStockStatusFilter, setProductStockStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [productSearch, setProductSearch] = useState('');
  const [includeVariationsAsSeparateRows, setIncludeVariationsAsSeparateRows] = useState(true);

  // Filtered Products for current business
  const filteredProducts = useMemo(() => {
    return state.products
      .filter((p) => p.businessId === currentBusiness.id)
      .filter((p) => (productCategoryFilter === 'all' ? true : p.categoryId === productCategoryFilter))
      .filter((p) => (productBrandFilter === 'all' ? true : p.brandId === productBrandFilter))
      .filter((p) => {
        if (!productSearch.trim()) return true;
        const q = productSearch.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchBarcode = p.barcode ? p.barcode.toLowerCase().includes(q) : false;
        return matchName || matchSku || matchBarcode;
      })
      .filter((p) => {
        const totalStock = getProductTotalStock(p, productLocationFilter);

        if (productStockStatusFilter === 'out_of_stock') {
          return totalStock <= 0;
        }
        if (productStockStatusFilter === 'low_stock') {
          return totalStock > 0 && totalStock <= p.alertQuantity;
        }
        if (productStockStatusFilter === 'in_stock') {
          return totalStock > 0;
        }
        return true;
      });
  }, [
    state.products,
    currentBusiness.id,
    productLocationFilter,
    productCategoryFilter,
    productBrandFilter,
    productSearch,
    productStockStatusFilter,
  ]);

  // Product KPI metrics
  const productMetrics = useMemo(() => {
    let totalItemsCount = 0;
    let totalQuantity = 0;
    let totalPurchaseValuation = 0;
    let totalSellingValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    filteredProducts.forEach((p) => {
      if (p.type === 'variable' && p.variations && includeVariationsAsSeparateRows) {
        p.variations.forEach((v) => {
          totalItemsCount++;
          const stock = getStockSum(v.locationStock, productLocationFilter);
          totalQuantity += stock;
          totalPurchaseValuation += stock * (v.purchasePrice || p.purchasePrice);
          totalSellingValuation += stock * (v.sellingPrice || p.sellingPrice);
          if (stock <= 0) outOfStockCount++;
          else if (stock <= p.alertQuantity) lowStockCount++;
        });
      } else {
        totalItemsCount++;
        const stock = getProductTotalStock(p, productLocationFilter);
        totalQuantity += stock;
        totalPurchaseValuation += stock * p.purchasePrice;
        totalSellingValuation += stock * p.sellingPrice;
        if (stock <= 0) outOfStockCount++;
        else if (stock <= p.alertQuantity) lowStockCount++;
      }
    });

    return {
      totalItemsCount,
      totalQuantity,
      totalPurchaseValuation,
      totalSellingValuation,
      lowStockCount,
      outOfStockCount,
    };
  }, [filteredProducts, productLocationFilter, includeVariationsAsSeparateRows]);

  // -------------------------------------------------------------
  // 2. SALES EXPORT STATE & FILTERS
  // -------------------------------------------------------------
  const [salesDatePreset, setSalesDatePreset] = useState<'all' | 'today' | 'last_7_days' | 'this_month' | 'last_month' | 'this_year' | 'custom'>('this_month');
  const [salesStartDate, setSalesStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [salesEndDate, setSalesEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [salesLocationFilter, setSalesLocationFilter] = useState<string>(
    state.currentLocationId === 'all' ? 'all' : state.currentLocationId
  );
  const [salesPaymentStatusFilter, setSalesPaymentStatusFilter] = useState<'all' | 'paid' | 'partial' | 'due'>('all');
  const [salesPaymentMethodFilter, setSalesPaymentMethodFilter] = useState<string>('all');
  const [salesSaleStatusFilter, setSalesSaleStatusFilter] = useState<string>('all');
  const [salesCustomerFilter, setSalesCustomerFilter] = useState<string>('all');
  const [salesSearch, setSalesSearch] = useState('');
  const [salesExportMode, setSalesExportMode] = useState<'invoices' | 'items'>('invoices');

  // Helper date preset updater
  const handleDatePresetChange = (preset: typeof salesDatePreset) => {
    setSalesDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'today') {
      setSalesStartDate(todayStr);
      setSalesEndDate(todayStr);
    } else if (preset === 'last_7_days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setSalesStartDate(d.toISOString().split('T')[0]);
      setSalesEndDate(todayStr);
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setSalesStartDate(firstDay.toISOString().split('T')[0]);
      setSalesEndDate(todayStr);
    } else if (preset === 'last_month') {
      const firstDayLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLast = new Date(now.getFullYear(), now.getMonth(), 0);
      setSalesStartDate(firstDayLast.toISOString().split('T')[0]);
      setSalesEndDate(lastDayLast.toISOString().split('T')[0]);
    } else if (preset === 'this_year') {
      const firstDayYear = new Date(now.getFullYear(), 0, 1);
      setSalesStartDate(firstDayYear.toISOString().split('T')[0]);
      setSalesEndDate(todayStr);
    } else if (preset === 'all') {
      setSalesStartDate('2020-01-01');
      setSalesEndDate(todayStr);
    }
  };

  // Filtered Sales for current business
  const filteredSales = useMemo(() => {
    return state.sales
      .filter((s) => s.businessId === currentBusiness.id)
      .filter((s) => (salesLocationFilter === 'all' ? true : s.locationId === salesLocationFilter))
      .filter((s) => (salesPaymentStatusFilter === 'all' ? true : s.paymentStatus === salesPaymentStatusFilter))
      .filter((s) => (salesPaymentMethodFilter === 'all' ? true : s.paymentMethod === salesPaymentMethodFilter))
      .filter((s) => (salesSaleStatusFilter === 'all' ? true : s.status === salesSaleStatusFilter))
      .filter((s) => (salesCustomerFilter === 'all' ? true : s.customerId === salesCustomerFilter))
      .filter((s) => {
        if (salesDatePreset === 'all') return true;
        if (!s.saleDate) return true;
        return s.saleDate >= salesStartDate && s.saleDate <= salesEndDate;
      })
      .filter((s) => {
        if (!salesSearch.trim()) return true;
        const q = salesSearch.toLowerCase();
        const customer = state.contacts.find((c) => c.id === s.customerId);
        const matchInvoice = s.invoiceNo.toLowerCase().includes(q);
        const matchCustomer = customer ? customer.name.toLowerCase().includes(q) : false;
        const matchNotes = s.notes ? s.notes.toLowerCase().includes(q) : false;
        return matchInvoice || matchCustomer || matchNotes;
      })
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [
    state.sales,
    state.contacts,
    currentBusiness.id,
    salesLocationFilter,
    salesPaymentStatusFilter,
    salesPaymentMethodFilter,
    salesSaleStatusFilter,
    salesCustomerFilter,
    salesDatePreset,
    salesStartDate,
    salesEndDate,
    salesSearch,
  ]);

  // Sales KPI metrics
  const salesMetrics = useMemo(() => {
    const totalTransactions = filteredSales.length;
    const totalTurnoverTTC = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
    const totalPaidAmount = filteredSales.reduce((acc, s) => acc + s.paidAmount, 0);
    const totalDueAmount = filteredSales.reduce((acc, s) => acc + s.dueAmount, 0);
    const totalItemsSold = filteredSales.reduce(
      (acc, s) => acc + s.items.reduce((sum, item) => sum + item.quantity, 0),
      0
    );

    return {
      totalTransactions,
      totalTurnoverTTC,
      totalPaidAmount,
      totalDueAmount,
      totalItemsSold,
    };
  }, [filteredSales]);

  // Currency helper
  const formatMoney = (amount: number) => {
    return `${amount.toLocaleString()} ${currentBusiness.currencySymbol}`;
  };

  // -------------------------------------------------------------
  // TRIGGER EXPORT: PRODUCTS EXCEL (.xlsx)
  // -------------------------------------------------------------
  const handleExportProductsExcel = () => {
    exportProductsStockToExcel(
      state.products.filter((p) => p.businessId === currentBusiness.id),
      state.categories,
      state.brands,
      state.units,
      state.locations,
      {
        locationId: productLocationFilter,
        categoryId: productCategoryFilter,
        brandId: productBrandFilter,
        stockStatusFilter: productStockStatusFilter,
        searchQuery: productSearch,
        includeVariations: includeVariationsAsSeparateRows,
        currencySymbol: currentBusiness.currencySymbol,
        businessName: currentBusiness.name,
      }
    );

    setDownloadSuccessMessage(`Fichier Excel (.xlsx) généré avec succès (${filteredProducts.length} articles exportés)`);
    setTimeout(() => setDownloadSuccessMessage(null), 4000);
  };

  // -------------------------------------------------------------
  // TRIGGER EXPORT: PRODUCTS CSV
  // -------------------------------------------------------------
  const handleExportProductsCSV = () => {
    exportProductsStockToCSV(
      state.products.filter((p) => p.businessId === currentBusiness.id),
      state.categories,
      state.brands,
      state.units,
      state.locations,
      {
        locationId: productLocationFilter,
        categoryId: productCategoryFilter,
        brandId: productBrandFilter,
        stockStatusFilter: productStockStatusFilter,
        searchQuery: productSearch,
        includeVariations: includeVariationsAsSeparateRows,
        currencySymbol: currentBusiness.currencySymbol,
        businessName: currentBusiness.name,
      }
    );

    setDownloadSuccessMessage(`Fichier CSV (.csv) téléchargé avec succès (${filteredProducts.length} articles exportés)`);
    setTimeout(() => setDownloadSuccessMessage(null), 4000);
  };

  // -------------------------------------------------------------
  // TRIGGER EXPORT: SALES EXCEL (.xlsx)
  // -------------------------------------------------------------
  const handleExportSalesExcel = () => {
    const locName =
      salesLocationFilter === 'all'
        ? 'Tous_Magasins'
        : (state.locations.find((l) => l.id === salesLocationFilter)?.name || 'Magasin').replace(/\s+/g, '_');

    const todayStr = new Date().toISOString().split('T')[0];
    const filename =
      salesExportMode === 'invoices'
        ? `inventaire_ventes_factures_${locName}_${todayStr}`
        : `inventaire_ventes_articles_details_${locName}_${todayStr}`;

    const wb = XLSX.utils.book_new();

    if (salesExportMode === 'invoices') {
      const data = filteredSales.map((s) => {
        const loc = state.locations.find((l) => l.id === s.locationId)?.name || 'Magasin';
        const customer = state.contacts.find((c) => c.id === s.customerId);
        const user = state.users.find((u) => u.id === s.userId)?.name || 'Système';
        const totalQty = s.items.reduce((sum, i) => sum + i.quantity, 0);

        return {
          'N° Facture': s.invoiceNo,
          'Date Vente': s.saleDate,
          'Magasin': loc,
          'Client': customer?.name || 'Client de passage',
          'Téléphone Client': customer?.phone || '',
          'Vendeur': user,
          'Statut Vente': s.status === 'final' ? 'Finalisée' : s.status,
          'Statut Paiement': s.paymentStatus === 'paid' ? 'Payé' : s.paymentStatus === 'partial' ? 'Partiel' : 'Impayé',
          'Mode Règlement': s.paymentMethod,
          'Articles Distincts': s.items.length,
          'Quantité Totale': totalQty,
          [`Remise (${currentBusiness.currencySymbol})`]: s.discountAmount,
          [`TVA (${currentBusiness.currencySymbol})`]: s.taxAmount,
          [`Total TTC (${currentBusiness.currencySymbol})`]: s.totalAmount,
          [`Montant Payé (${currentBusiness.currencySymbol})`]: s.paidAmount,
          [`Reste Dû (${currentBusiness.currencySymbol})`]: s.dueAmount,
          'Notes': s.notes || '',
        };
      });

      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [
        { wch: 16 }, { wch: 14 }, { wch: 20 }, { wch: 22 }, { wch: 16 },
        { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
        { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
        { wch: 16 }, { wch: 25 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Factures Ventes');
    } else {
      const data: any[] = [];
      filteredSales.forEach((s) => {
        const loc = state.locations.find((l) => l.id === s.locationId)?.name || 'Magasin';
        const customer = state.contacts.find((c) => c.id === s.customerId)?.name || 'Client de passage';
        const user = state.users.find((u) => u.id === s.userId)?.name || 'Caissier';

        s.items.forEach((item) => {
          const product = state.products.find((p) => p.id === item.productId);
          data.push({
            'N° Facture': s.invoiceNo,
            'Date': s.saleDate,
            'Magasin': loc,
            'Client': customer,
            'Vendeur': user,
            'SKU': product?.sku || '',
            'Article Vendu': item.productName,
            'Quantité': item.quantity,
            [`Prix Unitaire (${currentBusiness.currencySymbol})`]: item.unitPrice,
            [`Remise (${currentBusiness.currencySymbol})`]: item.discountAmount,
            [`Taxe (${currentBusiness.currencySymbol})`]: item.taxAmount,
            [`Sous-total TTC (${currentBusiness.currencySymbol})`]: item.subtotal,
            'Mode Paiement': s.paymentMethod,
            'Statut Paiement': s.paymentStatus,
          });
        });
      });

      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [
        { wch: 16 }, { wch: 14 }, { wch: 20 }, { wch: 22 }, { wch: 16 },
        { wch: 16 }, { wch: 30 }, { wch: 10 }, { wch: 16 }, { wch: 14 },
        { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Lignes Articles Vendus');
    }

    XLSX.writeFile(wb, `${filename}.xlsx`);
    setDownloadSuccessMessage(`Fichier Excel "${filename}.xlsx" généré avec succès`);
    setTimeout(() => setDownloadSuccessMessage(null), 4000);
  };

  // -------------------------------------------------------------
  // TRIGGER EXPORT: SALES CSV
  // -------------------------------------------------------------
  const handleExportSalesCSV = () => {
    const locName =
      salesLocationFilter === 'all'
        ? 'Tous_Magasins'
        : (state.locations.find((l) => l.id === salesLocationFilter)?.name || 'Magasin').replace(/\s+/g, '_');

    const todayStr = new Date().toISOString().split('T')[0];
    const filename =
      salesExportMode === 'invoices'
        ? `inventaire_ventes_factures_${locName}_${todayStr}`
        : `inventaire_ventes_articles_details_${locName}_${todayStr}`;

    const rows: (string | number | null | undefined)[][] = [];

    if (salesExportMode === 'invoices') {
      const headers = [
        'N° Facture',
        'Date Vente',
        'Magasin / Emplacement',
        'Nom Client',
        'Téléphone Client',
        'Caissier / Vendeur',
        'Statut Vente',
        'Statut Paiement',
        'Mode de Règlement',
        'Nb Articles Distincts',
        'Quantité Totale Articles',
        'Montant Remise (' + currentBusiness.currencySymbol + ')',
        'Montant Taxe TVA (' + currentBusiness.currencySymbol + ')',
        'Total TTC (' + currentBusiness.currencySymbol + ')',
        'Montant Payé (' + currentBusiness.currencySymbol + ')',
        'Reste Dû (' + currentBusiness.currencySymbol + ')',
        'Notes / Remarques',
      ];
      rows.push(headers);

      filteredSales.forEach((s) => {
        const loc = state.locations.find((l) => l.id === s.locationId)?.name || 'Magasin Inconnu';
        const customer = state.contacts.find((c) => c.id === s.customerId);
        const user = state.users.find((u) => u.id === s.userId)?.name || 'Système / Caissier';
        const totalQty = s.items.reduce((sum, i) => sum + i.quantity, 0);

        let payMethodLabel: string = s.paymentMethod;
        if (s.paymentMethod === 'cash') payMethodLabel = 'Espèces';
        else if (s.paymentMethod === 'card') payMethodLabel = 'Carte Bancaire';
        else if (s.paymentMethod === 'mobile_money') payMethodLabel = 'Mobile Money';
        else if (s.paymentMethod === 'bank_transfer') payMethodLabel = 'Virement';
        else if (s.paymentMethod === 'check') payMethodLabel = 'Chèque';

        let payStatusLabel: string = s.paymentStatus;
        if (s.paymentStatus === 'paid') payStatusLabel = 'Payé';
        else if (s.paymentStatus === 'partial') payStatusLabel = 'Partiel';
        else if (s.paymentStatus === 'due') payStatusLabel = 'Impayé (Dû)';

        let saleStatusLabel: string = s.status;
        if (s.status === 'final') saleStatusLabel = 'Finalisée';
        else if (s.status === 'quotation') saleStatusLabel = 'Devis / Proforma';
        else if (s.status === 'draft') saleStatusLabel = 'Brouillon';

        rows.push([
          s.invoiceNo,
          s.saleDate,
          loc,
          customer?.name || 'Client de passage',
          customer?.phone || '',
          user,
          saleStatusLabel,
          payStatusLabel,
          payMethodLabel,
          s.items.length,
          totalQty,
          s.discountAmount,
          s.taxAmount,
          s.totalAmount,
          s.paidAmount,
          s.dueAmount,
          s.notes || '',
        ]);
      });
    } else {
      // Export line-by-line item details
      const headers = [
        'N° Facture',
        'Date Vente',
        'Magasin',
        'Client',
        'Vendeur',
        'ID Produit',
        'SKU Produit',
        'Nom Article Vendu',
        'Quantité Vendue',
        'Prix Unitaire (' + currentBusiness.currencySymbol + ')',
        'Remise Ligne (' + currentBusiness.currencySymbol + ')',
        'Taxe Ligne (' + currentBusiness.currencySymbol + ')',
        'Sous-total Ligne TTC (' + currentBusiness.currencySymbol + ')',
        'Mode Paiement Facture',
        'Statut Paiement Facture',
      ];
      rows.push(headers);

      filteredSales.forEach((s) => {
        const loc = state.locations.find((l) => l.id === s.locationId)?.name || 'Magasin';
        const customer = state.contacts.find((c) => c.id === s.customerId)?.name || 'Client de passage';
        const user = state.users.find((u) => u.id === s.userId)?.name || 'Caissier';

        s.items.forEach((item) => {
          const product = state.products.find((p) => p.id === item.productId);
          rows.push([
            s.invoiceNo,
            s.saleDate,
            loc,
            customer,
            user,
            item.productId,
            product?.sku || '',
            item.productName,
            item.quantity,
            item.unitPrice,
            item.discountAmount,
            item.taxAmount,
            item.subtotal,
            s.paymentMethod,
            s.paymentStatus,
          ]);
        });
      });
    }

    downloadCSV(filename, rows);
    setDownloadSuccessMessage(`Fichier "${filename}.csv" téléchargé avec succès (${rows.length - 1} lignes exportées)`);
    setTimeout(() => setDownloadSuccessMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* SUCCESS TOAST NOTIFICATION */}
      {downloadSuccessMessage && (
        <div className="bg-emerald-600 text-white p-3.5 rounded-xl shadow-xl flex items-center justify-between animate-fadeIn border border-emerald-400/40 text-xs font-semibold">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            <span>{downloadSuccessMessage}</span>
          </div>
          <button
            onClick={() => setDownloadSuccessMessage(null)}
            className="text-emerald-100 hover:text-white ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* EXPORT DATA TYPE SELECTOR TABS */}
      <div className="bg-slate-900 p-2 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveExportType('products')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeExportType === 'products'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Catalogue & Stocks Produits ({filteredProducts.length})</span>
          </button>

          <button
            onClick={() => setActiveExportType('sales')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeExportType === 'sales'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Historique des Ventes & Flux ({filteredSales.length})</span>
          </button>
        </div>

        <div className="flex items-center flex-wrap gap-2 px-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="w-full sm:w-auto px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 border border-emerald-500/30 transition-all"
            title="Importer de nouveaux articles et initialiser les stocks"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Importer Produits</span>
          </button>

          {activeExportType === 'products' ? (
            <>
              <button
                onClick={() => setShowExportModal(true)}
                className="w-full sm:w-auto px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 border border-slate-700 transition-all"
                title="Ouvrir l'assistant avec options avancées de filtrage"
              >
                <Sliders className="w-4 h-4 text-slate-400" />
                <span>Options d'Export</span>
              </button>

              <button
                onClick={handleExportProductsCSV}
                className="w-full sm:w-auto px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 border border-blue-500/30 transition-all"
                title="Télécharger l'état des stocks au format CSV"
              >
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={handleExportProductsExcel}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950 transition-all hover:scale-[1.02] active:scale-[0.98]"
                title="Télécharger l'état des stocks au format Excel (.xlsx)"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger Excel (.xlsx)</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleExportSalesCSV}
                className="w-full sm:w-auto px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 border border-blue-500/30 transition-all"
              >
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Export CSV Ventes</span>
              </button>

              <button
                onClick={handleExportSalesExcel}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger Excel Ventes</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 1: PRODUCT LIST EXPORT                            */}
      {/* ========================================================= */}
      {activeExportType === 'products' && (
        <div className="space-y-5">
          {/* PRODUCT METRICS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Références Sélectionnées</span>
                <Package className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-black text-white">{productMetrics.totalItemsCount}</div>
              <p className="text-[11px] text-slate-500">
                {productMetrics.totalQuantity.toLocaleString()} unités en stock
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Valeur Achat Totale</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400">
                {formatMoney(productMetrics.totalPurchaseValuation)}
              </div>
              <p className="text-[11px] text-slate-500">Coût d'acquisition du stock filtré</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Valeur Vente Estimée</span>
                <TrendingUp className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-blue-400">
                {formatMoney(productMetrics.totalSellingValuation)}
              </div>
              <p className="text-[11px] text-slate-500">Potentiel de chiffre d'affaires</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Alertes & Ruptures</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400">
                {productMetrics.lowStockCount + productMetrics.outOfStockCount}{' '}
                <span className="text-xs text-slate-500 font-normal">
                  ({productMetrics.outOfStockCount} ruptures)
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Niveaux de stock critiques</p>
            </div>
          </div>

          {/* PRODUCT FILTERS BAR */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <Filter className="w-3.5 h-3.5 text-blue-400" />
                <span>Paramètres & Filtres d'Exportation Produits</span>
              </div>
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-1.5 cursor-pointer text-slate-400 hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={includeVariationsAsSeparateRows}
                    onChange={(e) => setIncludeVariationsAsSeparateRows(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span className="text-[11px]">Détailler les déclinaisons (variantes)</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher nom, SKU, code-barres..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full bg-slate-800 text-white pl-8 pr-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Location filter */}
              <div>
                <select
                  value={productLocationFilter}
                  onChange={(e) => setProductLocationFilter(e.target.value)}
                  className="w-full bg-slate-800 text-white px-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="all">Tous les Magasins / Dépôts</option>
                  {state.locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category filter */}
              <div>
                <select
                  value={productCategoryFilter}
                  onChange={(e) => setProductCategoryFilter(e.target.value)}
                  className="w-full bg-slate-800 text-white px-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="all">Toutes les Catégories</option>
                  {state.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stock Status filter */}
              <div>
                <select
                  value={productStockStatusFilter}
                  onChange={(e) => setProductStockStatusFilter(e.target.value as any)}
                  className="w-full bg-slate-800 text-white px-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="all">Tous les États de Stock</option>
                  <option value="in_stock">En Stock (&gt; 0)</option>
                  <option value="low_stock">Stock Faible / Alerte</option>
                  <option value="out_of_stock">Rupture de Stock (≤ 0)</option>
                </select>
              </div>
            </div>
          </div>

          {/* PRODUCT PREVIEW TABLE */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="p-3 bg-slate-950/70 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-300 flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Aperçu des données prêtes à l'exportation ({filteredProducts.length} articles)</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportProductsCSV}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors border border-slate-700"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={handleExportProductsExcel}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Excel (.xlsx)</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[10px] sticky top-0">
                  <tr>
                    <th className="p-3">Article</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Catégorie</th>
                    <th className="p-3 text-right">Prix Achat</th>
                    <th className="p-3 text-right">Prix Vente</th>
                    <th className="p-3 text-center">Stock</th>
                    <th className="p-3 text-right">Valorisation Achat</th>
                    <th className="p-3 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredProducts.slice(0, 15).map((p) => {
                    const category = state.categories.find((c) => c.id === p.categoryId)?.name || 'Général';
                    const stock = getProductTotalStock(p, productLocationFilter);
                    const valAchat = stock * p.purchasePrice;

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40">
                        <td className="p-3">
                          <div className="font-bold text-white">{p.name}</div>
                          {p.type === 'variable' && (
                            <div className="text-[10px] text-blue-400">
                              {p.variations?.length || 0} déclinaison(s)
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-300">{p.sku}</td>
                        <td className="p-3 text-slate-400">{category}</td>
                        <td className="p-3 text-right font-mono text-slate-300">
                          {formatMoney(p.purchasePrice)}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-white">
                          {formatMoney(p.sellingPrice)}
                        </td>
                        <td className="p-3 text-center font-bold font-mono text-blue-300">{stock}</td>
                        <td className="p-3 text-right font-mono font-semibold text-emerald-400">
                          {formatMoney(valAchat)}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              stock <= 0
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : stock <= p.alertQuantity
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            {stock <= 0 ? 'Rupture' : stock <= p.alertQuantity ? 'Alerte' : 'Ok'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredProducts.length > 15 && (
              <div className="p-2.5 bg-slate-950 text-center text-slate-500 text-[11px] border-t border-slate-800">
                Affichage des 15 premières lignes (sur un total de {filteredProducts.length} articles à exporter dans le fichier CSV).
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 2: SALES HISTORY EXPORT                           */}
      {/* ========================================================= */}
      {activeExportType === 'sales' && (
        <div className="space-y-5">
          {/* SALES METRICS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Transactions Filtrées</span>
                <ShoppingCart className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-black text-white">{salesMetrics.totalTransactions}</div>
              <p className="text-[11px] text-slate-500">
                {salesMetrics.totalItemsSold.toLocaleString()} articles vendus
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Chiffre d'Affaires Total</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400">
                {formatMoney(salesMetrics.totalTurnoverTTC)}
              </div>
              <p className="text-[11px] text-slate-500">Montant brut facturé TTC</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Total Encaissé</span>
                <CreditCard className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-blue-400">
                {formatMoney(salesMetrics.totalPaidAmount)}
              </div>
              <p className="text-[11px] text-slate-500">Règlements reçus en caisse</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Reste à Recouvrer</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-rose-400">
                {formatMoney(salesMetrics.totalDueAmount)}
              </div>
              <p className="text-[11px] text-slate-500">Créances clients sur la période</p>
            </div>
          </div>

          {/* SALES FILTERS & EXPORT CONFIG */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
                <Filter className="w-3.5 h-3.5 text-blue-400" />
                <span>Paramètres & Filtres d'Exportation des Ventes</span>
              </div>

              {/* Format selection */}
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-400 font-semibold">Format du CSV :</span>
                <div className="flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
                  <button
                    onClick={() => setSalesExportMode('invoices')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                      salesExportMode === 'invoices'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Synthèse par Facture
                  </button>
                  <button
                    onClick={() => setSalesExportMode('items')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                      salesExportMode === 'items'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Détail par Ligne d'Article
                  </button>
                </div>
              </div>
            </div>

            {/* Date Preset Buttons */}
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">Période :</span>
              {[
                { id: 'today', label: "Aujourd'hui" },
                { id: 'last_7_days', label: '7 derniers jours' },
                { id: 'this_month', label: 'Ce mois-ci' },
                { id: 'last_month', label: 'Mois dernier' },
                { id: 'this_year', label: 'Cette année' },
                { id: 'all', label: 'Tout l\'historique' },
                { id: 'custom', label: 'Personnalisée' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleDatePresetChange(p.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    salesDatePreset === p.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Dates & Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {salesDatePreset === 'custom' && (
                <>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                      Date Début
                    </label>
                    <input
                      type="date"
                      value={salesStartDate}
                      onChange={(e) => setSalesStartDate(e.target.value)}
                      className="w-full bg-slate-800 text-white px-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                      Date Fin
                    </label>
                    <input
                      type="date"
                      value={salesEndDate}
                      onChange={(e) => setSalesEndDate(e.target.value)}
                      className="w-full bg-slate-800 text-white px-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* Location filter */}
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                  Magasin / Caisse
                </label>
                <select
                  value={salesLocationFilter}
                  onChange={(e) => setSalesLocationFilter(e.target.value)}
                  className="w-full bg-slate-800 text-white px-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="all">Tous les Magasins</option>
                  {state.locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment status filter */}
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                  Statut Paiement
                </label>
                <select
                  value={salesPaymentStatusFilter}
                  onChange={(e) => setSalesPaymentStatusFilter(e.target.value as any)}
                  className="w-full bg-slate-800 text-white px-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="all">Tous les Règlements</option>
                  <option value="paid">Payé Intégralement</option>
                  <option value="partial">Paiement Partiel</option>
                  <option value="due">Impayé / Reste Dû</option>
                </select>
              </div>

              {/* Payment method filter */}
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                  Mode de Paiement
                </label>
                <select
                  value={salesPaymentMethodFilter}
                  onChange={(e) => setSalesPaymentMethodFilter(e.target.value)}
                  className="w-full bg-slate-800 text-white px-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="all">Tous les Modes</option>
                  <option value="cash">Espèces</option>
                  <option value="card">Carte Bancaire</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank_transfer">Virement Bancaire</option>
                  <option value="check">Chèque</option>
                </select>
              </div>

              {/* Keyword search */}
              <div className="relative">
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                  Recherche Facture / Client
                </label>
                <Search className="w-3.5 h-3.5 absolute left-3 top-7 text-slate-400" />
                <input
                  type="text"
                  placeholder="N° Facture, nom client..."
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                  className="w-full bg-slate-800 text-white pl-8 pr-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SALES PREVIEW TABLE */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="p-3 bg-slate-950/70 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-300 flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>
                  Aperçu des ventes ({filteredSales.length} facture(s) sélectionnée(s))
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportSalesCSV}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors border border-slate-700"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={handleExportSalesExcel}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Excel (.xlsx)</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[10px] sticky top-0">
                  <tr>
                    <th className="p-3">Facture & Date</th>
                    <th className="p-3">Magasin</th>
                    <th className="p-3">Client</th>
                    <th className="p-3 text-center">Articles</th>
                    <th className="p-3 text-right">Total TTC</th>
                    <th className="p-3 text-right">Payé</th>
                    <th className="p-3 text-right">Reste Dû</th>
                    <th className="p-3 text-center">Mode</th>
                    <th className="p-3 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredSales.slice(0, 15).map((s) => {
                    const loc = state.locations.find((l) => l.id === s.locationId)?.name || 'Magasin';
                    const customer = state.contacts.find((c) => c.id === s.customerId)?.name || 'Client de passage';
                    const totalQty = s.items.reduce((sum, i) => sum + i.quantity, 0);

                    return (
                      <tr key={s.id} className="hover:bg-slate-800/40">
                        <td className="p-3">
                          <div className="font-mono font-bold text-blue-400">{s.invoiceNo}</div>
                          <div className="text-[10px] text-slate-500">{s.saleDate}</div>
                        </td>
                        <td className="p-3 text-slate-300">{loc}</td>
                        <td className="p-3 text-slate-200 font-medium">{customer}</td>
                        <td className="p-3 text-center font-mono text-slate-400">
                          {s.items.length} ({totalQty} pcs)
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-white">
                          {formatMoney(s.totalAmount)}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-400">
                          {formatMoney(s.paidAmount)}
                        </td>
                        <td className="p-3 text-right font-mono text-rose-400 font-bold">
                          {s.dueAmount > 0 ? formatMoney(s.dueAmount) : '-'}
                        </td>
                        <td className="p-3 text-center">
                          <span className="capitalize text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">
                            {s.paymentMethod}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.paymentStatus === 'paid'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : s.paymentStatus === 'partial'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-rose-950 text-rose-300 border border-rose-800'
                            }`}
                          >
                            {s.paymentStatus === 'paid' ? 'Payé' : s.paymentStatus === 'partial' ? 'Partiel' : 'Impayé'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredSales.length > 15 && (
              <div className="p-2.5 bg-slate-950 text-center text-slate-500 text-[11px] border-t border-slate-800">
                Affichage des 15 premières factures (sur un total de {filteredSales.length} ventes à exporter dans le fichier CSV).
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRODUCT IMPORT MODAL (CSV & XLS/XLSX) */}
      <ProductImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />

      {/* PRODUCT EXPORT MODAL (CSV & XLS/XLSX WITH CUSTOM CONFIG) */}
      <ProductExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        initialLocationId={productLocationFilter}
        initialCategoryId={productCategoryFilter}
        initialBrandId={productBrandFilter}
        initialStockFilter={productStockStatusFilter}
      />
    </div>
  );
};
