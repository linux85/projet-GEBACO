import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { Sale, SaleItem } from '../../types';
import {
  Calendar,
  Store,
  Layers,
  Package,
  BarChart3,
  TrendingUp,
  Filter,
  Printer,
  Download,
  Search,
  DollarSign,
  ShoppingCart,
  Receipt,
  Percent,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowUpDown,
  Building2,
  Tag,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  PieChart,
  Eye,
  GitBranch,
  X,
  FileText,
  CreditCard,
  Wallet,
  CheckCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart as RePieChart,
  Pie,
  Legend,
} from 'recharts';

interface DailySalesTrackerProps {
  onViewSale?: (sale: Sale) => void;
}

export const DailySalesTracker: React.FC<DailySalesTrackerProps> = ({ onViewSale }) => {
  const { state, currentBusiness } = useERP();

  // Determine available sales dates from state
  const availableDates = useMemo(() => {
    const datesSet = new Set<string>();
    (state.sales || [])
      .filter((s) => s.businessId === currentBusiness.id)
      .forEach((s) => {
        if (s.saleDate) datesSet.add(s.saleDate);
      });
    const sorted = Array.from(datesSet).sort((a, b) => b.localeCompare(a));
    const today = new Date().toISOString().split('T')[0];
    if (!sorted.includes(today)) {
      sorted.unshift(today);
    }
    return sorted;
  }, [state.sales, currentBusiness.id]);

  // Date selection state: Single Day vs Period
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [selectedDate, setSelectedDate] = useState<string>(
    availableDates[0] || new Date().toISOString().split('T')[0]
  );
  const [startDate, setStartDate] = useState<string>(
    availableDates[0] || new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    availableDates[0] || new Date().toISOString().split('T')[0]
  );

  // Dimension breakdown view: 'products' | 'categories' | 'stores' | 'journal'
  const [activeDimensionTab, setActiveDimensionTab] = useState<
    'products' | 'categories' | 'stores' | 'journal'
  >('products');

  // Filters
  const [filterLocationId, setFilterLocationId] = useState<string>('all');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [filterSubCategoryId, setFilterSubCategoryId] = useState<string>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('final'); // 'final' | 'all' | 'quotation'
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Table Sorting
  const [sortField, setSortField] = useState<'revenue' | 'quantity' | 'profit' | 'name'>('revenue');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Print Modal & Layout
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [printLayout, setPrintLayout] = useState<
    'full' | 'summary' | 'products' | 'categories' | 'stores' | 'journal'
  >('full');

  // Quick Date Navigation for single day
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleSetToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    setStartDate(today);
    setEndDate(today);
  };

  const handleSetYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = d.toISOString().split('T')[0];
    setSelectedDate(yesterday);
    setStartDate(yesterday);
    setEndDate(yesterday);
  };

  const handleSetLast7Days = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);
    setDateMode('range');
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const handleSetThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    setDateMode('range');
    setStartDate(firstDay);
    setEndDate(today);
  };

  // 1. FILTER RELEVANT SALES BY DATE & BUSINESS
  const dateFilteredSales = useMemo(() => {
    return (state.sales || []).filter((sale) => {
      if (sale.businessId !== currentBusiness.id) return false;

      // Status filter
      if (filterStatus !== 'all' && sale.status !== filterStatus) return false;

      // Location filter
      if (filterLocationId !== 'all' && sale.locationId !== filterLocationId) return false;

      // Payment method filter
      if (filterPaymentMethod !== 'all' && sale.paymentMethod !== filterPaymentMethod) return false;

      // Date match
      if (dateMode === 'single') {
        return sale.saleDate === selectedDate;
      } else {
        if (!startDate && !endDate) return true;
        if (startDate && sale.saleDate < startDate) return false;
        if (endDate && sale.saleDate > endDate) return false;
        return true;
      }
    });
  }, [
    state.sales,
    currentBusiness.id,
    filterStatus,
    filterLocationId,
    filterPaymentMethod,
    dateMode,
    selectedDate,
    startDate,
    endDate,
  ]);

  // 2. PRODUCT LEVEL SALES AGGREGATION
  const productAggregations = useMemo(() => {
    const productMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        sku: string;
        barcode: string;
        categoryId?: string;
        subCategoryId?: string;
        categoryName: string;
        subCategoryName: string;
        quantitySold: number;
        revenue: number;
        cost: number;
        profit: number;
        locations: Set<string>;
        ordersCount: number;
      }
    >();

    dateFilteredSales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        const prod = state.products.find((p) => p.id === item.productId);
        const cat = prod?.categoryId
          ? state.categories.find((c) => c.id === prod.categoryId)
          : undefined;
        const subCat = prod?.subCategoryId
          ? (state.subCategories || []).find((s) => s.id === prod.subCategoryId)
          : undefined;

        // Apply category filter if active
        if (filterCategoryId !== 'all' && prod?.categoryId !== filterCategoryId) return;
        if (filterSubCategoryId !== 'all' && prod?.subCategoryId !== filterSubCategoryId) return;

        // Text search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = (item.productName || prod?.name || '').toLowerCase().includes(q);
          const matchSku = (prod?.sku || '').toLowerCase().includes(q);
          const matchBarcode = (prod?.barcode || '').toLowerCase().includes(q);
          if (!matchName && !matchSku && !matchBarcode) return;
        }

        const existing = productMap.get(item.productId);
        const unitPurchasePrice = prod?.purchasePrice || 0;
        const itemCost = unitPurchasePrice * item.quantity;
        const itemRevenue = item.subtotal || item.unitPrice * item.quantity;
        const itemProfit = itemRevenue - itemCost;

        if (existing) {
          existing.quantitySold += item.quantity;
          existing.revenue += itemRevenue;
          existing.cost += itemCost;
          existing.profit += itemProfit;
          existing.locations.add(sale.locationId);
          existing.ordersCount += 1;
        } else {
          productMap.set(item.productId, {
            productId: item.productId,
            productName: item.productName || prod?.name || 'Produit Inconnu',
            sku: prod?.sku || 'N/A',
            barcode: prod?.barcode || '',
            categoryId: prod?.categoryId,
            subCategoryId: prod?.subCategoryId,
            categoryName: cat?.name || 'Sans Catégorie',
            subCategoryName: subCat?.name || '-',
            quantitySold: item.quantity,
            revenue: itemRevenue,
            cost: itemCost,
            profit: itemProfit,
            locations: new Set([sale.locationId]),
            ordersCount: 1,
          });
        }
      });
    });

    const result = Array.from(productMap.values());

    // Sorting
    return result.sort((a, b) => {
      let valA: number | string = a.revenue;
      let valB: number | string = b.revenue;
      if (sortField === 'quantity') {
        valA = a.quantitySold;
        valB = b.quantitySold;
      } else if (sortField === 'profit') {
        valA = a.profit;
        valB = b.profit;
      } else if (sortField === 'name') {
        valA = a.productName.toLowerCase();
        valB = b.productName.toLowerCase();
      }
      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB as string) : (valB as string).localeCompare(valA);
      }
      return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [
    dateFilteredSales,
    state.products,
    state.categories,
    state.subCategories,
    filterCategoryId,
    filterSubCategoryId,
    searchQuery,
    sortField,
    sortAsc,
  ]);

  // 3. CATEGORY LEVEL SALES AGGREGATION
  const categoryAggregations = useMemo(() => {
    const catMap = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        subCategories: Map<
          string,
          {
            subCategoryId: string;
            subCategoryName: string;
            quantity: number;
            revenue: number;
            profit: number;
          }
        >;
        quantitySold: number;
        revenue: number;
        profit: number;
        distinctProducts: Set<string>;
      }
    >();

    dateFilteredSales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        const prod = state.products.find((p) => p.id === item.productId);
        const catId = prod?.categoryId || 'uncategorized';
        const catObj = state.categories.find((c) => c.id === catId);
        const catName = catObj?.name || 'Sans Catégorie';

        const subCatId = prod?.subCategoryId || 'none';
        const subCatObj = (state.subCategories || []).find((s) => s.id === subCatId);
        const subCatName = subCatObj?.name || 'Général / Non spécifié';

        if (filterCategoryId !== 'all' && catId !== filterCategoryId) return;
        if (filterSubCategoryId !== 'all' && subCatId !== filterSubCategoryId) return;

        const unitCost = prod?.purchasePrice || 0;
        const itemCost = unitCost * item.quantity;
        const itemRevenue = item.subtotal || item.unitPrice * item.quantity;
        const itemProfit = itemRevenue - itemCost;

        if (!catMap.has(catId)) {
          catMap.set(catId, {
            categoryId: catId,
            categoryName: catName,
            subCategories: new Map(),
            quantitySold: 0,
            revenue: 0,
            profit: 0,
            distinctProducts: new Set(),
          });
        }

        const catEntry = catMap.get(catId)!;
        catEntry.quantitySold += item.quantity;
        catEntry.revenue += itemRevenue;
        catEntry.profit += itemProfit;
        catEntry.distinctProducts.add(item.productId);

        // Subcategory sub-mapping
        if (!catEntry.subCategories.has(subCatId)) {
          catEntry.subCategories.set(subCatId, {
            subCategoryId: subCatId,
            subCategoryName: subCatName,
            quantity: 0,
            revenue: 0,
            profit: 0,
          });
        }
        const subEntry = catEntry.subCategories.get(subCatId)!;
        subEntry.quantity += item.quantity;
        subEntry.revenue += itemRevenue;
        subEntry.profit += itemProfit;
      });
    });

    return Array.from(catMap.values())
      .map((entry) => ({
        ...entry,
        subCategoriesList: Array.from(entry.subCategories.values()).sort(
          (a, b) => b.revenue - a.revenue
        ),
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [
    dateFilteredSales,
    state.products,
    state.categories,
    state.subCategories,
    filterCategoryId,
    filterSubCategoryId,
  ]);

  // 4. STORE / LOCATION LEVEL SALES AGGREGATION
  const storeAggregations = useMemo(() => {
    const locMap = new Map<
      string,
      {
        locationId: string;
        locationName: string;
        city: string;
        address: string;
        salesCount: number;
        totalItemsSold: number;
        revenue: number;
        paidAmount: number;
        dueAmount: number;
        profit: number;
        topProducts: Map<string, number>;
        paymentMethods: Record<string, number>;
      }
    >();

    // Initialize with all locations of current business
    (state.locations || [])
      .filter((loc) => loc.businessId === currentBusiness.id)
      .forEach((loc) => {
        locMap.set(loc.id, {
          locationId: loc.id,
          locationName: loc.name,
          city: loc.city || '',
          address: loc.address || '',
          salesCount: 0,
          totalItemsSold: 0,
          revenue: 0,
          paidAmount: 0,
          dueAmount: 0,
          profit: 0,
          topProducts: new Map(),
          paymentMethods: {},
        });
      });

    dateFilteredSales.forEach((sale) => {
      let locEntry = locMap.get(sale.locationId);
      if (!locEntry) {
        locEntry = {
          locationId: sale.locationId,
          locationName: `Magasin ${sale.locationId}`,
          city: '',
          address: '',
          salesCount: 0,
          totalItemsSold: 0,
          revenue: 0,
          paidAmount: 0,
          dueAmount: 0,
          profit: 0,
          topProducts: new Map(),
          paymentMethods: {},
        };
        locMap.set(sale.locationId, locEntry);
      }

      locEntry.salesCount += 1;
      locEntry.revenue += sale.totalAmount;
      locEntry.paidAmount += sale.paidAmount;
      locEntry.dueAmount += sale.dueAmount;

      // Payment method breakdown
      locEntry.paymentMethods[sale.paymentMethod] =
        (locEntry.paymentMethods[sale.paymentMethod] || 0) + sale.totalAmount;

      (sale.items || []).forEach((item) => {
        locEntry!.totalItemsSold += item.quantity;
        const prod = state.products.find((p) => p.id === item.productId);
        const cost = (prod?.purchasePrice || 0) * item.quantity;
        const rev = item.subtotal || item.unitPrice * item.quantity;
        locEntry!.profit += rev - cost;

        locEntry!.topProducts.set(
          item.productName,
          (locEntry!.topProducts.get(item.productName) || 0) + item.quantity
        );
      });
    });

    return Array.from(locMap.values())
      .map((entry) => {
        const topProdSorted = Array.from(entry.topProducts.entries()).sort(
          (a, b) => b[1] - a[1]
        );
        return {
          ...entry,
          topProductName: topProdSorted[0] ? `${topProdSorted[0][0]} (${topProdSorted[0][1]})` : '-',
          avgTicket: entry.salesCount > 0 ? entry.revenue / entry.salesCount : 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [dateFilteredSales, state.locations, state.products, currentBusiness.id]);

  // Overall Global KPI Totals
  const totalRevenue = useMemo(
    () => dateFilteredSales.reduce((acc, s) => acc + s.totalAmount, 0),
    [dateFilteredSales]
  );
  const totalPaid = useMemo(
    () => dateFilteredSales.reduce((acc, s) => acc + s.paidAmount, 0),
    [dateFilteredSales]
  );
  const totalDue = useMemo(
    () => dateFilteredSales.reduce((acc, s) => acc + s.dueAmount, 0),
    [dateFilteredSales]
  );
  const totalOrders = dateFilteredSales.length;
  const totalItemsCount = useMemo(
    () =>
      dateFilteredSales.reduce(
        (acc, s) => acc + (s.items || []).reduce((sum, it) => sum + it.quantity, 0),
        0
      ),
    [dateFilteredSales]
  );
  const totalProfit = useMemo(() => {
    return dateFilteredSales.reduce((acc, s) => {
      const saleCost = (s.items || []).reduce((sum, it) => {
        const prod = state.products.find((p) => p.id === it.productId);
        return sum + (prod?.purchasePrice || 0) * it.quantity;
      }, 0);
      return acc + (s.totalAmount - saleCost);
    }, 0);
  }, [dateFilteredSales, state.products]);

  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const profitMarginRate = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Chart Data: Top 5 Products
  const topProductsChartData = useMemo(() => {
    return productAggregations.slice(0, 6).map((p) => ({
      name: p.productName.length > 18 ? `${p.productName.slice(0, 18)}...` : p.productName,
      fullName: p.productName,
      CA: p.revenue,
      Quantité: p.quantitySold,
      Bénéfice: p.profit,
    }));
  }, [productAggregations]);

  // Chart Data: Categories Breakdown
  const categoriesChartData = useMemo(() => {
    return categoryAggregations.map((c) => ({
      name: c.categoryName,
      CA: c.revenue,
      Articles: c.quantitySold,
    }));
  }, [categoryAggregations]);

  // Chart Data: Stores Comparison
  const storesChartData = useMemo(() => {
    return storeAggregations.map((s) => ({
      name: s.locationName,
      CA: s.revenue,
      Ventes: s.salesCount,
      Articles: s.totalItemsSold,
    }));
  }, [storeAggregations]);

  // Payment Methods Breakdown Summary for Reporting & Print
  const paymentMethodsSummary = useMemo(() => {
    const methods: Record<
      string,
      {
        count: number;
        total: number;
        paid: number;
        due: number;
        label: string;
      }
    > = {
      cash: { count: 0, total: 0, paid: 0, due: 0, label: 'Espèces' },
      mobile_money: { count: 0, total: 0, paid: 0, due: 0, label: 'Mobile Money (Wave / OM)' },
      card: { count: 0, total: 0, paid: 0, due: 0, label: 'Carte Bancaire' },
      bank_transfer: { count: 0, total: 0, paid: 0, due: 0, label: 'Virement Bancaire' },
      cheque: { count: 0, total: 0, paid: 0, due: 0, label: 'Chèque' },
      other: { count: 0, total: 0, paid: 0, due: 0, label: 'Autre' },
    };

    dateFilteredSales.forEach((s) => {
      const pm = s.paymentMethod || 'cash';
      if (!methods[pm]) {
        methods[pm] = {
          count: 0,
          total: 0,
          paid: 0,
          due: 0,
          label: pm,
        };
      }
      methods[pm].count += 1;
      methods[pm].total += s.totalAmount;
      methods[pm].paid += s.paidAmount;
      methods[pm].due += s.dueAmount;
    });

    return methods;
  }, [dateFilteredSales]);

  // CSV Export
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    const dateLabel = dateMode === 'single' ? selectedDate : `${startDate}_au_${endDate}`;

    if (activeDimensionTab === 'products') {
      csvContent += 'ID Produit,Nom Produit,SKU,Code-barres,Categorie,Sous-Categorie,Quantite Vendue,Chiffre Affaires,Cout Estime,Benefice Brut,Marge %\n';
      productAggregations.forEach((p) => {
        const marginPct = p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : '0';
        csvContent += `"${p.productId}","${p.productName.replace(/"/g, '""')}","${p.sku}","${p.barcode}","${p.categoryName}","${p.subCategoryName}",${p.quantitySold},${p.revenue},${p.cost},${p.profit},${marginPct}%\n`;
      });
    } else if (activeDimensionTab === 'categories') {
      csvContent += 'Categorie,Quantite Totale,Chiffre Affaires,Benefice Estime,Part CA %\n';
      categoryAggregations.forEach((c) => {
        const sharePct = totalRevenue > 0 ? ((c.revenue / totalRevenue) * 100).toFixed(1) : '0';
        csvContent += `"${c.categoryName}",${c.quantitySold},${c.revenue},${c.profit},${sharePct}%\n`;
      });
    } else if (activeDimensionTab === 'stores') {
      csvContent += 'Magasin,Ville,Nombre Ventes,Articles Vendus,Chiffre Affaires,Encaissé,Restant Dû,Panier Moyen\n';
      storeAggregations.forEach((s) => {
        csvContent += `"${s.locationName}","${s.city}",${s.salesCount},${s.totalItemsSold},${s.revenue},${s.paidAmount},${s.dueAmount},${s.avgTicket.toFixed(0)}\n`;
      });
    } else {
      csvContent += 'Date,N° Facture,Magasin,Client,Mode Paiement,Articles,Total,Payé,Reste Dû\n';
      dateFilteredSales.forEach((s) => {
        const loc = state.locations.find((l) => l.id === s.locationId);
        const cust = state.contacts.find((c) => c.id === s.customerId);
        csvContent += `"${s.saleDate}","${s.invoiceNo}","${loc?.name || s.locationId}","${cust?.name || s.customerId}","${s.paymentMethod}",${s.items.length},${s.totalAmount},${s.paidAmount},${s.dueAmount}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `suivi_ventes_${activeDimensionTab}_${dateLabel}_${currentBusiness.name.replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenPrintModal = () => {
    setShowPrintModal(true);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'];

  return (
    <div className="space-y-6 text-white print:text-black print:bg-white">
      {/* Header & Date Controls Banner */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm space-y-4 print:border-none print:p-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3 min-w-0">
            <div className="p-2.5 sm:p-3 bg-gradient-to-br from-emerald-600/30 to-blue-600/20 text-emerald-400 rounded-xl border border-emerald-500/30 shadow-inner shrink-0">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">Suivi Journalier des Ventes</h2>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[11px] font-semibold border border-emerald-500/30 whitespace-nowrap">
                  En direct
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Analyse quotidienne croisée par <strong>Produits</strong>, <strong>Catégories</strong> et <strong>Magasins</strong> de {currentBusiness.name}.
              </p>
            </div>
          </div>

          {/* Quick Actions (Print / CSV) */}
          <div className="flex flex-wrap items-center gap-2 print:hidden w-full lg:w-auto">
            <button
              onClick={handleOpenPrintModal}
              className="flex-1 sm:flex-initial px-3 py-2.5 min-h-[40px] bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg border border-emerald-500/40 flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-emerald-950/40 cursor-pointer whitespace-nowrap"
              title="Ouvrir l'aperçu et imprimer le journal de vente"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer Journal</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex-1 sm:flex-initial px-3 py-2.5 min-h-[40px] bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg border border-blue-500/40 flex items-center justify-center space-x-1.5 transition-colors shadow-sm whitespace-nowrap"
              title="Exporter les données en CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter CSV</span>
            </button>
          </div>
        </div>

        {/* Date Selector Row */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          {/* Mode Switcher (Jour Unique vs Plage) */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setDateMode('single')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dateMode === 'single'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Jour Unique
            </button>
            <button
              onClick={() => setDateMode('range')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dateMode === 'range'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Période (Plage)
            </button>
          </div>

          {/* Date Picker Controls */}
          {dateMode === 'single' ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={handlePrevDay}
                  className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                  title="Jour précédent"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700 px-2.5 sm:px-3 py-1.5 rounded-lg">
                  <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent text-white text-xs font-bold focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleNextDay}
                  className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                  title="Jour suivant"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={handleSetToday}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded border border-slate-700"
                >
                  Aujourd'hui
                </button>
                <button
                  onClick={handleSetYesterday}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded border border-slate-700"
                >
                  Hier
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg">
                <span className="text-slate-400 text-xs font-medium">Du:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-white text-xs font-bold focus:outline-none"
                />
              </div>
              <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg">
                <span className="text-slate-400 text-xs font-medium">Au:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-white text-xs font-bold focus:outline-none"
                />
              </div>
              <button
                onClick={handleSetLast7Days}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded border border-slate-700"
              >
                7 derniers jours
              </button>
              <button
                onClick={handleSetThisMonth}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded border border-slate-700"
              >
                Ce mois
              </button>
            </div>
          )}

          {/* Quick Date Presets Dropdown if many dates exist */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <span className="font-semibold">Historique :</span>
            <select
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setDateMode('single');
              }}
              className="bg-slate-800 border border-slate-700 text-white rounded p-1 text-xs font-semibold focus:outline-none"
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d === new Date().toISOString().split('T')[0] ? `Aujourd'hui (${d})` : d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards for the Selected Day */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
        {/* 1. CA TOTAL */}
        <div className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-xl space-y-1 min-w-0">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-400 font-bold uppercase gap-1">
            <span className="truncate">CA Total</span>
            <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>
          <div className="text-base sm:text-xl font-black text-emerald-400 tabular-nums truncate">
            {totalRevenue.toLocaleString('fr-FR')} <span className="text-[11px] sm:text-xs font-normal text-slate-400">{currentBusiness.currencySymbol}</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between gap-1 tabular-nums">
            <span>Encaissé:</span>
            <span className="font-bold text-slate-200 truncate">{totalPaid.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}</span>
          </div>
        </div>

        {/* 2. ARTICLES VENDUS */}
        <div className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-xl space-y-1 min-w-0">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-400 font-bold uppercase gap-1">
            <span className="truncate">Articles Vendus</span>
            <Package className="w-4 h-4 text-blue-400 shrink-0" />
          </div>
          <div className="text-base sm:text-xl font-black text-blue-400 tabular-nums truncate">
            {totalItemsCount} <span className="text-[11px] sm:text-xs font-normal text-slate-400">unités</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between gap-1 tabular-nums">
            <span>Réf. distinctes:</span>
            <span className="font-bold text-slate-200">{productAggregations.length}</span>
          </div>
        </div>

        {/* 3. NOMBRE DE TICKETS */}
        <div className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-xl space-y-1 min-w-0">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-400 font-bold uppercase gap-1">
            <span className="truncate">Transactions</span>
            <ShoppingCart className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
          <div className="text-base sm:text-xl font-black text-amber-400 tabular-nums truncate">
            {totalOrders} <span className="text-[11px] sm:text-xs font-normal text-slate-400">ventes</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between gap-1 tabular-nums">
            <span>Statut:</span>
            <span className="font-bold text-emerald-400">
              {dateFilteredSales.filter((s) => s.paymentStatus === 'paid').length} soldées
            </span>
          </div>
        </div>

        {/* 4. PANIER MOYEN */}
        <div className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-xl space-y-1 min-w-0">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-400 font-bold uppercase gap-1">
            <span className="truncate">Panier Moyen</span>
            <Receipt className="w-4 h-4 text-purple-400 shrink-0" />
          </div>
          <div className="text-base sm:text-xl font-black text-purple-400 tabular-nums truncate">
            {Math.round(avgTicket).toLocaleString('fr-FR')} <span className="text-[11px] sm:text-xs font-normal text-slate-400">{currentBusiness.currencySymbol}</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between gap-1 tabular-nums">
            <span>Art. / ticket:</span>
            <span className="font-bold text-slate-200">
              {totalOrders > 0 ? (totalItemsCount / totalOrders).toFixed(1) : 0}
            </span>
          </div>
        </div>

        {/* 5. MARGE BRUTE ESTIMEE */}
        <div className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-xl space-y-1 min-w-0">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-400 font-bold uppercase gap-1">
            <span className="truncate">Bénéfice Brut</span>
            <TrendingUp className="w-4 h-4 text-teal-400 shrink-0" />
          </div>
          <div className="text-base sm:text-xl font-black text-teal-400 tabular-nums truncate">
            {Math.round(totalProfit).toLocaleString('fr-FR')} <span className="text-[11px] sm:text-xs font-normal text-slate-400">{currentBusiness.currencySymbol}</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between gap-1 tabular-nums">
            <span>Taux Marge:</span>
            <span className="font-bold text-teal-300">{profitMarginRate.toFixed(1)}%</span>
          </div>
        </div>

        {/* 6. CRÉDITS / RESTANT DÛ */}
        <div className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-xl space-y-1 min-w-0">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-400 font-bold uppercase gap-1">
            <span className="truncate">Restant Dû</span>
            <Clock className="w-4 h-4 text-rose-400 shrink-0" />
          </div>
          <div className="text-base sm:text-xl font-black text-rose-400 tabular-nums truncate">
            {totalDue.toLocaleString('fr-FR')} <span className="text-[11px] sm:text-xs font-normal text-slate-400">{currentBusiness.currencySymbol}</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between gap-1 tabular-nums">
            <span>En attente:</span>
            <span className="font-bold text-rose-300">
              {dateFilteredSales.filter((s) => s.dueAmount > 0).length} facture(s)
            </span>
          </div>
        </div>
      </div>

      {/* Multi-Dimension Selector (Par Produit / Par Catégorie / Par Magasin / Journal) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-1.5 overflow-x-auto max-w-full p-1 bg-slate-900 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveDimensionTab('products')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all whitespace-nowrap shrink-0 ${
              activeDimensionTab === 'products'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Package className="w-4 h-4 shrink-0" />
            <span>1. Suivi par Produits ({productAggregations.length})</span>
          </button>

          <button
            onClick={() => setActiveDimensionTab('categories')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all whitespace-nowrap shrink-0 ${
              activeDimensionTab === 'categories'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>2. Suivi par Catégories ({categoryAggregations.length})</span>
          </button>

          <button
            onClick={() => setActiveDimensionTab('stores')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all whitespace-nowrap shrink-0 ${
              activeDimensionTab === 'stores'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Store className="w-4 h-4 shrink-0" />
            <span>3. Suivi par Magasins ({storeAggregations.length})</span>
          </button>

          <button
            onClick={() => setActiveDimensionTab('journal')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all whitespace-nowrap shrink-0 ${
              activeDimensionTab === 'journal'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Receipt className="w-4 h-4 shrink-0" />
            <span>4. Journal des Tickets ({dateFilteredSales.length})</span>
          </button>
        </div>

        {/* Global Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-center gap-2">
          {/* Store Filter */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs text-slate-400 font-semibold shrink-0">Magasin:</span>
            <select
              value={filterLocationId}
              onChange={(e) => setFilterLocationId(e.target.value)}
              className="min-w-0 flex-1 md:flex-initial bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-1.5 font-semibold focus:outline-none"
            >
              <option value="all">Tous les magasins</option>
              {state.locations
                .filter((l) => l.businessId === currentBusiness.id)
                .map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs text-slate-400 font-semibold shrink-0">Catégorie:</span>
            <select
              value={filterCategoryId}
              onChange={(e) => {
                setFilterCategoryId(e.target.value);
                setFilterSubCategoryId('all');
              }}
              className="min-w-0 flex-1 md:flex-initial bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-1.5 font-semibold focus:outline-none"
            >
              <option value="all">Toutes</option>
              {state.categories
                .filter((c) => c.businessId === currentBusiness.id)
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
          </div>

          {/* SubCategory Filter */}
          {filterCategoryId !== 'all' && (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs text-slate-400 font-semibold shrink-0">Sous-cat:</span>
              <select
                value={filterSubCategoryId}
                onChange={(e) => setFilterSubCategoryId(e.target.value)}
                className="min-w-0 flex-1 md:flex-initial bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-1.5 font-semibold focus:outline-none"
              >
                <option value="all">Toutes</option>
                {(state.subCategories || [])
                  .filter(
                    (s) =>
                      s.categoryId === filterCategoryId &&
                      (!s.businessId || s.businessId === currentBusiness.id)
                  )
                  .map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Payment Method Filter */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs text-slate-400 font-semibold shrink-0">Paiement:</span>
            <select
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value)}
              className="min-w-0 flex-1 md:flex-initial bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-1.5 font-semibold focus:outline-none"
            >
              <option value="all">Tous modes</option>
              <option value="cash">Espèces</option>
              <option value="mobile_money">Mobile Money (Wave/OM)</option>
              <option value="card">Carte Bancaire</option>
              <option value="bank_transfer">Virement</option>
              <option value="check">Chèque</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. PRODUITS TAB VIEW */}
      {/* ========================================================================= */}
      {activeDimensionTab === 'products' && (
        <div className="space-y-6">
          {/* Visual Top Products Chart & Search */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Chart */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-3 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  <h3 className="font-bold text-sm text-white">Top 6 Produits Vendus sur la Journée</h3>
                </div>
                <span className="text-xs text-slate-400">Classé par Chiffre d'Affaires</span>
              </div>

              {topProductsChartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-xs text-slate-500">
                  Aucune vente de produit enregistrée pour cette sélection de date/filtre.
                </div>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProductsChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} interval={0} angle={-15} textAnchor="end" />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                        formatter={(val: number) => [`${val.toLocaleString('fr-FR')} ${currentBusiness.currencySymbol}`, 'CA']}
                      />
                      <Bar dataKey="CA" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                        {topProductsChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Quick Search & Summary Widget */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-sm text-white">Recherche Produit Rapide</h3>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrer par nom, SKU, code-barres..."
                    className="w-full bg-slate-800 text-white pl-9 pr-3 py-2 rounded-lg border border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  {productAggregations.length} référence(s) correspondent aux critères.
                </p>
              </div>

              {/* Best performer highlight */}
              {productAggregations[0] && (
                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>N° 1 des ventes du jour :</span>
                  </div>
                  <div className="text-sm font-extrabold text-white truncate">
                    {productAggregations[0].productName}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>{productAggregations[0].quantitySold} vendus</span>
                    <span className="font-bold text-emerald-400">
                      {productAggregations[0].revenue.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-950 font-bold text-sm border-b border-slate-800 flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4 text-blue-400" />
                <span>Détail des Ventes par Produit ({productAggregations.length})</span>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-slate-400 font-normal">Trier par :</span>
                <button
                  onClick={() => {
                    if (sortField === 'revenue') setSortAsc(!sortAsc);
                    else {
                      setSortField('revenue');
                      setSortAsc(false);
                    }
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                    sortField === 'revenue' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  CA {sortField === 'revenue' ? (sortAsc ? '↑' : '↓') : ''}
                </button>
                <button
                  onClick={() => {
                    if (sortField === 'quantity') setSortAsc(!sortAsc);
                    else {
                      setSortField('quantity');
                      setSortAsc(false);
                    }
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                    sortField === 'quantity' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  Quantité {sortField === 'quantity' ? (sortAsc ? '↑' : '↓') : ''}
                </button>
                <button
                  onClick={() => {
                    if (sortField === 'profit') setSortAsc(!sortAsc);
                    else {
                      setSortField('profit');
                      setSortAsc(false);
                    }
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                    sortField === 'profit' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  Bénéfice {sortField === 'profit' ? (sortAsc ? '↑' : '↓') : ''}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[780px]">
                <thead className="bg-slate-950/70 border-b border-slate-800 uppercase text-[10px] font-bold text-slate-400">
                  <tr>
                    <th className="p-3">Produit & Référence</th>
                    <th className="p-3">Catégorie & Sous-Catégorie</th>
                    <th className="p-3">Magasin(s) Vendeurs</th>
                    <th className="p-3 text-center">Qté Vendue</th>
                    <th className="p-3 text-right">Prix Moyen</th>
                    <th className="p-3 text-right">Chiffre d'Affaires</th>
                    <th className="p-3 text-right">Marge Brute</th>
                    <th className="p-3 text-center">Part CA %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {productAggregations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 text-xs">
                        Aucun produit vendu pour la date ou les filtres sélectionnés.
                      </td>
                    </tr>
                  ) : (
                    productAggregations.map((prod) => {
                      const shareOfTotal = totalRevenue > 0 ? (prod.revenue / totalRevenue) * 100 : 0;
                      const marginPct = prod.revenue > 0 ? (prod.profit / prod.revenue) * 100 : 0;
                      const avgUnitPrice = prod.quantitySold > 0 ? prod.revenue / prod.quantitySold : 0;

                      return (
                        <tr key={prod.productId} className="hover:bg-slate-800/40 transition-colors">
                          {/* Product info */}
                          <td className="p-3">
                            <div className="font-bold text-white text-xs">{prod.productName}</div>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono mt-0.5">
                              <span>SKU: {prod.sku}</span>
                              {prod.barcode && <span>• Barcode: {prod.barcode}</span>}
                            </div>
                          </td>

                          {/* Category & SubCategory */}
                          <td className="p-3">
                            <div className="font-semibold text-slate-200">{prod.categoryName}</div>
                            {prod.subCategoryName && prod.subCategoryName !== '-' && (
                              <div className="text-[10px] text-blue-300 flex items-center space-x-1 mt-0.5">
                                <span className="text-slate-500">↳</span>
                                <span className="bg-blue-950/80 px-1 py-0.5 rounded border border-blue-800/40">
                                  {prod.subCategoryName}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Locations */}
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {Array.from(prod.locations).map((locId) => {
                                const loc = state.locations.find((l) => l.id === locId);
                                return (
                                  <span
                                    key={locId}
                                    className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] border border-slate-700"
                                  >
                                    {loc?.name || locId}
                                  </span>
                                );
                              })}
                            </div>
                          </td>

                          {/* Quantity */}
                          <td className="p-3 text-center">
                            <span className="px-2 py-1 bg-blue-600/20 text-blue-300 font-bold rounded-lg border border-blue-500/30 text-xs">
                              {prod.quantitySold}
                            </span>
                          </td>

                          {/* Avg Unit Price */}
                          <td className="p-3 text-right text-slate-300 font-medium">
                            {Math.round(avgUnitPrice).toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                          </td>

                          {/* Total Revenue */}
                          <td className="p-3 text-right font-black text-emerald-400 text-xs">
                            {prod.revenue.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                          </td>

                          {/* Profit & Margin */}
                          <td className="p-3 text-right">
                            <div className="font-bold text-teal-300">
                              {Math.round(prod.profit).toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {marginPct.toFixed(1)}% marge
                            </div>
                          </td>

                          {/* Share % */}
                          <td className="p-3 text-center">
                            <div className="w-16 mx-auto bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                              <div
                                className="bg-emerald-500 h-full rounded-full"
                                style={{ width: `${Math.min(100, shareOfTotal)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold mt-1 block">
                              {shareOfTotal.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {productAggregations.length > 0 && (
                  <tfoot className="bg-slate-950 font-bold text-xs border-t border-slate-700">
                    <tr>
                      <td colSpan={3} className="p-3 text-white uppercase text-[11px]">
                        Total Sélection ({productAggregations.length} produits)
                      </td>
                      <td className="p-3 text-center text-blue-400 text-sm">
                        {totalItemsCount}
                      </td>
                      <td className="p-3 text-right text-slate-400">-</td>
                      <td className="p-3 text-right text-emerald-400 text-sm font-black">
                        {totalRevenue.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                      </td>
                      <td className="p-3 text-right text-teal-400 text-sm font-black">
                        {Math.round(totalProfit).toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                      </td>
                      <td className="p-3 text-center text-white">100%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CATÉGORIES TAB VIEW */}
      {/* ========================================================================= */}
      {activeDimensionTab === 'categories' && (
        <div className="space-y-6">
          {/* Category Visual Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Bar Chart Categories */}
            <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-3 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
                  <h3 className="font-bold text-sm text-white">Chiffre d'Affaires par Catégorie</h3>
                </div>
                <span className="text-xs text-slate-400 tabular-nums">Total: {totalRevenue.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}</span>
              </div>

              {categoriesChartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-xs text-slate-500">
                  Aucune vente par catégorie enregistrée.
                </div>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoriesChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} interval={0} angle={-15} textAnchor="end" />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                        formatter={(val: number) => [`${val.toLocaleString('fr-FR')} ${currentBusiness.currencySymbol}`, 'CA']}
                      />
                      <Bar dataKey="CA" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Distribution Pie Chart */}
            <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-3 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <PieChart className="w-4 h-4 text-blue-400" />
                  <h3 className="font-bold text-sm text-white">Répartition % des Ventes par Catégorie</h3>
                </div>
              </div>

              {categoriesChartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-xs text-slate-500">
                  Aucune donnée disponible.
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={categoriesChartData}
                        dataKey="CA"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                        fontSize={10}
                      >
                        {categoriesChartData.map((_, index) => (
                          <Cell key={`cell-pie-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                        formatter={(val: number) => [`${val.toLocaleString('fr-FR')} ${currentBusiness.currencySymbol}`, 'CA']}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Categories & SubCategories Hierarchical Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-950 font-bold text-sm border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Performance Journalière par Catégorie & Sous-Catégorie ({categoryAggregations.length})</span>
              </div>
            </div>

            <div className="divide-y divide-slate-800">
              {categoryAggregations.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Aucune catégorie vendue pour la sélection courante.
                </div>
              ) : (
                categoryAggregations.map((cat) => {
                  const sharePct = totalRevenue > 0 ? (cat.revenue / totalRevenue) * 100 : 0;
                  const marginPct = cat.revenue > 0 ? (cat.profit / cat.revenue) * 100 : 0;

                  return (
                    <div key={cat.categoryId} className="p-4 space-y-3 hover:bg-slate-800/20 transition-colors">
                      {/* Main Category Row */}
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{cat.categoryName}</div>
                            <div className="text-[11px] text-slate-400">
                              {cat.distinctProducts.size} produit(s) vendu(s) • {cat.subCategoriesList.length} sous-catégorie(s)
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-3 sm:gap-6 text-xs w-full sm:w-auto">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase">Qté Vendue</span>
                            <span className="font-bold text-blue-300 text-sm tabular-nums">{cat.quantitySold} unités</span>
                          </div>

                          <div className="sm:text-right">
                            <span className="text-slate-400 block text-[10px] uppercase">Chiffre d'Affaires</span>
                            <span className="font-black text-emerald-400 text-sm tabular-nums">
                              {cat.revenue.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                            </span>
                          </div>

                          <div className="sm:text-right">
                            <span className="text-slate-400 block text-[10px] uppercase">Marge Bénéficiaire</span>
                            <span className="font-bold text-teal-300 text-sm tabular-nums">
                              {Math.round(cat.profit).toLocaleString('fr-FR')} {currentBusiness.currencySymbol} ({marginPct.toFixed(1)}%)
                            </span>
                          </div>

                          <div className="sm:text-right sm:w-20">
                            <span className="text-slate-400 block text-[10px] uppercase">Part CA</span>
                            <span className="font-extrabold text-amber-400 tabular-nums">{sharePct.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Sub-Categories Breakdown Grid */}
                      {cat.subCategoriesList.length > 0 && (
                        <div className="pl-6 border-l-2 border-slate-800 space-y-2">
                          <div className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1">
                            <GitBranch className="w-3 h-3 text-blue-400" />
                            <span>Sous-catégories vendues :</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {cat.subCategoriesList.map((sub) => {
                              const subShareInCat = cat.revenue > 0 ? (sub.revenue / cat.revenue) * 100 : 0;
                              return (
                                <div
                                  key={sub.subCategoryId}
                                  className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between text-xs hover:border-slate-700"
                                >
                                  <div className="space-y-0.5 min-w-0 pr-2">
                                    <div className="font-bold text-slate-200 truncate">{sub.subCategoryName}</div>
                                    <div className="text-[10px] text-slate-400">{sub.quantity} article(s)</div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <div className="font-bold text-emerald-400">
                                      {sub.revenue.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-medium">
                                      {subShareInCat.toFixed(1)}% du cat.
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MAGASINS TAB VIEW */}
      {/* ========================================================================= */}
      {activeDimensionTab === 'stores' && (
        <div className="space-y-6">
          {/* Store Comparison Chart */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Store className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">Comparatif du Chiffre d'Affaires par Magasin</h3>
              </div>
              <span className="text-xs text-slate-400">{storeAggregations.length} magasin(s) configuré(s)</span>
            </div>

            {storesChartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-slate-500">
                Aucune donnée magasin disponible.
              </div>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={storesChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                      formatter={(val: number) => [`${val.toLocaleString('fr-FR')} ${currentBusiness.currencySymbol}`, 'CA']}
                    />
                    <Bar dataKey="CA" fill="#f59e0b" radius={[6, 6, 0, 0]}>
                      {storesChartData.map((_, index) => (
                        <Cell key={`cell-store-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Stores Detailed Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {storeAggregations.map((st) => {
              const shareOfAll = totalRevenue > 0 ? (st.revenue / totalRevenue) * 100 : 0;

              return (
                <div
                  key={st.locationId}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm hover:border-slate-700 transition-all"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-amber-600/20 text-amber-400 rounded-xl border border-amber-500/30">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-white">{st.locationName}</h4>
                        <p className="text-xs text-slate-400">{st.city || st.address || 'Emplacement Principal'}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Part Globale</span>
                      <span className="text-sm font-extrabold text-amber-400">{shareOfAll.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* KPIs Mini Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">CA Réalisé</span>
                      <span className="font-black text-emerald-400 text-xs">
                        {st.revenue.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Transactions</span>
                      <span className="font-bold text-blue-300 text-xs">{st.salesCount} ventes</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Articles</span>
                      <span className="font-bold text-purple-300 text-xs">{st.totalItemsSold} unités</span>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Total Encaissé (Comptant/Wave) :</span>
                      <span className="font-bold text-emerald-400">
                        {st.paidAmount.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Restant Dû (Crédits clients) :</span>
                      <span className="font-bold text-rose-400">
                        {st.dueAmount.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Panier Moyen par Vente :</span>
                      <span className="font-bold text-slate-200">
                        {Math.round(st.avgTicket).toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400">Meilleur Article du Magasin :</span>
                      <span className="font-bold text-amber-300 truncate max-w-[200px]">
                        {st.topProductName}
                      </span>
                    </div>
                  </div>

                  {/* Filter this store button */}
                  <button
                    onClick={() => {
                      setFilterLocationId(st.locationId);
                      setActiveDimensionTab('products');
                    }}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <span>Voir tous les produits vendus dans ce magasin</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. JOURNAL DES TICKETS TAB VIEW */}
      {/* ========================================================================= */}
      {activeDimensionTab === 'journal' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-950 font-bold text-sm border-b border-slate-800 flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-purple-400" />
              <span>Journal Chronologique des Ventes ({dateFilteredSales.length})</span>
            </div>
            <span className="text-xs text-slate-400 font-normal tabular-nums">
              {totalRevenue.toLocaleString('fr-FR')} {currentBusiness.currencySymbol} au total
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[780px]">
              <thead className="bg-slate-950/70 border-b border-slate-800 uppercase text-[10px] font-bold text-slate-400">
                <tr>
                  <th className="p-3">Facture & Date</th>
                  <th className="p-3">Magasin</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Articles Achetés</th>
                  <th className="p-3">Mode Paiement</th>
                  <th className="p-3 text-right">Montant Total</th>
                  <th className="p-3 text-right">Encaissé</th>
                  <th className="p-3 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {dateFilteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 text-xs">
                      Aucune transaction pour la sélection courante.
                    </td>
                  </tr>
                ) : (
                  dateFilteredSales.map((sale) => {
                    const loc = state.locations.find((l) => l.id === sale.locationId);
                    const cust = state.contacts.find((c) => c.id === sale.customerId);
                    const itemsSummary = (sale.items || [])
                      .map((it) => `${it.productName} (x${it.quantity})`)
                      .join(', ');

                    return (
                      <tr key={sale.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono font-bold text-white">
                          <div>{sale.invoiceNo}</div>
                          <div className="text-[10px] text-slate-400 font-sans">{sale.saleDate}</div>
                        </td>

                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[11px] font-semibold border border-slate-700">
                            {loc?.name || sale.locationId}
                          </span>
                        </td>

                        <td className="p-3 font-medium text-slate-200">
                          {cust?.name || 'Client Comptoir'}
                        </td>

                        <td className="p-3 max-w-xs truncate text-slate-300" title={itemsSummary}>
                          {itemsSummary}
                        </td>

                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-slate-800/90 text-slate-300 rounded text-[10px] font-semibold uppercase">
                            {sale.paymentMethod === 'mobile_money'
                              ? 'Mobile Money'
                              : sale.paymentMethod === 'cash'
                              ? 'Espèces'
                              : sale.paymentMethod === 'card'
                              ? 'Carte CB'
                              : sale.paymentMethod}
                          </span>
                        </td>

                        <td className="p-3 text-right font-black text-emerald-400">
                          {sale.totalAmount.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                        </td>

                        <td className="p-3 text-right font-bold text-slate-200">
                          {sale.paidAmount.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                        </td>

                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              sale.paymentStatus === 'paid'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : sale.paymentStatus === 'partial'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {sale.paymentStatus === 'paid'
                              ? 'Payé'
                              : sale.paymentStatus === 'partial'
                              ? 'Partiel'
                              : 'Dû'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. PRINT MODAL & PREVIEW WITH DEDICATED PRINTABLE AREA */}
      {/* ========================================================================= */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-start bg-slate-950/85 backdrop-blur-sm p-2.5 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
          <div className="w-full max-w-5xl space-y-4 my-auto">
            {/* Modal Toolbar (hidden during print) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xl no-print text-white">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    Aperçu & Impression du Journal des Ventes
                  </h3>
                  <p className="text-xs text-slate-400">
                    {currentBusiness.name} • {dateMode === 'single' ? selectedDate : `Du ${startDate} au ${endDate}`}
                  </p>
                </div>
              </div>

              {/* Format selection */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setPrintLayout('full')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    printLayout === 'full' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Rapport Complet
                </button>
                <button
                  type="button"
                  onClick={() => setPrintLayout('summary')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    printLayout === 'summary' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Synthèse Caisse
                </button>
                <button
                  type="button"
                  onClick={() => setPrintLayout('products')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    printLayout === 'products' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Produits
                </button>
                <button
                  type="button"
                  onClick={() => setPrintLayout('categories')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    printLayout === 'categories' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Catégories
                </button>
                <button
                  type="button"
                  onClick={() => setPrintLayout('stores')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    printLayout === 'stores' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Magasins
                </button>
                <button
                  type="button"
                  onClick={() => setPrintLayout('journal')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    printLayout === 'journal' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tickets
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 md:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-950 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Lancer l'impression</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                  title="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Paper */}
            <div
              id="printable-area"
              className="bg-white text-slate-900 p-4 sm:p-8 lg:p-10 rounded-2xl shadow-2xl border border-slate-200 space-y-6 text-xs print:p-0 print:border-none print:shadow-none print:rounded-none"
            >
              {/* Document Header */}
              <div className="border-b-2 border-slate-900 pb-4">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                      {currentBusiness.name}
                    </h1>
                    {currentBusiness.taxNumber && (
                      <p className="text-[11px] font-mono text-slate-600">
                        N° CC / RCCM : <span className="font-bold">{currentBusiness.taxNumber}</span>
                      </p>
                    )}
                    <p className="text-[11px] text-slate-600">
                      Tél : {currentBusiness.phone || 'Non renseigné'} {currentBusiness.email && `• Email : ${currentBusiness.email}`}
                    </p>
                    {currentBusiness.address && (
                      <p className="text-[11px] text-slate-600">Adresse : {currentBusiness.address}</p>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="inline-block px-3 py-1 bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider rounded">
                      Document Officiel de Vente
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Édité le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Opérateur : <strong className="text-slate-800">{state.users.find(u => u.id === state.currentUserId)?.name || 'Administrateur'}</strong>
                    </p>
                  </div>
                </div>

                {/* Title */}
                <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight uppercase">
                      Journal Quotidien des Ventes & État de Caisse
                    </h2>
                    <p className="text-xs text-slate-700 font-semibold">
                      {dateMode === 'single'
                        ? `Journée du : ${new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
                        : `Période du ${startDate} au ${endDate}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 bg-slate-100 border border-slate-300 rounded font-bold text-slate-800 text-[11px]">
                      {filterLocationId === 'all'
                        ? 'Tous Magasins (Consolidé)'
                        : `Magasin : ${state.locations.find((l) => l.id === filterLocationId)?.name || filterLocationId}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* 1. Global KPIs Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="border-r border-slate-200 pr-2">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Chiffre d'Affaires Brut</div>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    {totalRevenue.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                  </div>
                  <div className="text-[10px] text-slate-600">{totalOrders} transaction(s)</div>
                </div>

                <div className="border-r border-slate-200 pr-2">
                  <div className="text-[10px] font-bold uppercase text-emerald-700">Total Encaissé</div>
                  <div className="text-base font-black text-emerald-800 mt-0.5">
                    {totalPaid.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                  </div>
                  <div className="text-[10px] text-slate-600">
                    {totalRevenue > 0 ? ((totalPaid / totalRevenue) * 100).toFixed(1) : 0}% du CA
                  </div>
                </div>

                <div className="border-r border-slate-200 pr-2">
                  <div className="text-[10px] font-bold uppercase text-rose-700">Crédits / Reste Dû</div>
                  <div className="text-base font-black text-rose-800 mt-0.5">
                    {totalDue.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                  </div>
                  <div className="text-[10px] text-slate-600">À recouvrer</div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase text-blue-700">Articles Vendus & Marge</div>
                  <div className="text-base font-black text-blue-900 mt-0.5">
                    {totalItemsCount} <span className="text-xs font-normal text-slate-600">unités</span>
                  </div>
                  <div className="text-[10px] text-teal-800 font-semibold">
                    Marge: {Math.round(totalProfit).toLocaleString('fr-FR')} {currentBusiness.currencySymbol} ({profitMarginRate.toFixed(1)}%)
                  </div>
                </div>
              </div>

              {/* 2. Payment Method Summary Table */}
              <div>
                <h3 className="font-bold text-xs uppercase text-slate-800 border-b border-slate-300 pb-1 mb-2 flex items-center space-x-1.5">
                  <span>1. Ventilation des Encaissements par Mode de Règlement</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs border border-slate-200 min-w-[540px] print:min-w-0">
                  <thead className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-700">
                    <tr>
                      <th className="p-2">Mode de Règlement</th>
                      <th className="p-2 text-center">Nbre Ventes</th>
                      <th className="p-2 text-right">Montant Total</th>
                      <th className="p-2 text-right">Montant Encaissé</th>
                      <th className="p-2 text-right">Reste Dû</th>
                      <th className="p-2 text-right">Part Encaissement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px]">
                    {Object.entries(paymentMethodsSummary)
                      .filter(([_, data]) => data.count > 0 || data.total > 0)
                      .map(([key, data]) => {
                        const share = totalPaid > 0 ? ((data.paid / totalPaid) * 100).toFixed(1) : '0';
                        return (
                          <tr key={key} className="even:bg-slate-50">
                            <td className="p-2 font-bold text-slate-800">{data.label}</td>
                            <td className="p-2 text-center">{data.count}</td>
                            <td className="p-2 text-right font-semibold">
                              {data.total.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                            </td>
                            <td className="p-2 text-right font-black text-emerald-800">
                              {data.paid.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                            </td>
                            <td className="p-2 text-right font-bold text-rose-700">
                              {data.due.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                            </td>
                            <td className="p-2 text-right font-bold">{share}%</td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs">
                    <tr>
                      <td className="p-2 text-slate-900 font-extrabold">TOTAL CONSOLIDÉ</td>
                      <td className="p-2 text-center font-extrabold">{totalOrders}</td>
                      <td className="p-2 text-right font-black text-slate-900">
                        {totalRevenue.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                      </td>
                      <td className="p-2 text-right font-black text-emerald-800">
                        {totalPaid.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                      </td>
                      <td className="p-2 text-right font-black text-rose-800">
                        {totalDue.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                      </td>
                      <td className="p-2 text-right font-extrabold">100%</td>
                    </tr>
                  </tfoot>
                  </table>
                </div>
              </div>

              {/* 3. Products Breakdown (if 'full' or 'products') */}
              {(printLayout === 'full' || printLayout === 'products') && (
                <div>
                  <h3 className="font-bold text-xs uppercase text-slate-800 border-b border-slate-300 pb-1 mb-2">
                    2. Détail des Ventes par Produit & Référence ({productAggregations.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs border border-slate-200 min-w-[680px] print:min-w-0">
                    <thead className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-700">
                      <tr>
                        <th className="p-2">N°</th>
                        <th className="p-2">Désignation Produit</th>
                        <th className="p-2">SKU / Code</th>
                        <th className="p-2">Catégorie</th>
                        <th className="p-2 text-center">Qté Vendue</th>
                        <th className="p-2 text-right">P.U Moyen</th>
                        <th className="p-2 text-right">Chiffre d'Affaires</th>
                        <th className="p-2 text-right">Marge Brute</th>
                        <th className="p-2 text-right">Part CA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-[11px]">
                      {productAggregations.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-4 text-center text-slate-500 italic">
                            Aucun produit vendu pour cette sélection.
                          </td>
                        </tr>
                      ) : (
                        productAggregations.map((p, idx) => {
                          const avgPrice = p.quantitySold > 0 ? p.revenue / p.quantitySold : 0;
                          const partCA = totalRevenue > 0 ? ((p.revenue / totalRevenue) * 100).toFixed(1) : '0';
                          return (
                            <tr key={p.productId} className="even:bg-slate-50">
                              <td className="p-2 text-slate-500 font-mono">{idx + 1}</td>
                              <td className="p-2 font-bold text-slate-900">{p.productName}</td>
                              <td className="p-2 font-mono text-[10px] text-slate-600">{p.sku || p.barcode || '-'}</td>
                              <td className="p-2 text-slate-600">{p.categoryName}</td>
                              <td className="p-2 text-center font-extrabold text-blue-950">{p.quantitySold}</td>
                              <td className="p-2 text-right font-medium">
                                {Math.round(avgPrice).toLocaleString('fr-FR')}
                              </td>
                              <td className="p-2 text-right font-black text-slate-900">
                                {p.revenue.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                              </td>
                              <td className="p-2 text-right font-bold text-emerald-800">
                                {Math.round(p.profit).toLocaleString('fr-FR')}
                              </td>
                              <td className="p-2 text-right font-bold text-slate-700">{partCA}%</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs">
                      <tr>
                        <td colSpan={4} className="p-2 text-slate-900 font-extrabold">TOTAL PRODUITS</td>
                        <td className="p-2 text-center font-black">{totalItemsCount}</td>
                        <td className="p-2 text-right">-</td>
                        <td className="p-2 text-right font-black text-slate-900">
                          {totalRevenue.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                        </td>
                        <td className="p-2 text-right font-black text-emerald-800">
                          {Math.round(totalProfit).toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                        </td>
                        <td className="p-2 text-right font-black">100%</td>
                      </tr>
                    </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. Categories Breakdown (if 'full' or 'categories') */}
              {(printLayout === 'full' || printLayout === 'categories') && (
                <div>
                  <h3 className="font-bold text-xs uppercase text-slate-800 border-b border-slate-300 pb-1 mb-2">
                    3. Ventilation par Catégories de Produits
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs border border-slate-200 min-w-[540px] print:min-w-0">
                    <thead className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-700">
                      <tr>
                        <th className="p-2">Catégorie</th>
                        <th className="p-2 text-center">Réf. Vendues</th>
                        <th className="p-2 text-center">Quantité Totale</th>
                        <th className="p-2 text-right">Chiffre d'Affaires</th>
                        <th className="p-2 text-right">Bénéfice Estimé</th>
                        <th className="p-2 text-right">Part du CA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-[11px]">
                      {categoryAggregations.map((c) => {
                        const partCA = totalRevenue > 0 ? ((c.revenue / totalRevenue) * 100).toFixed(1) : '0';
                        return (
                          <tr key={c.categoryId} className="even:bg-slate-50">
                            <td className="p-2 font-bold text-slate-900">{c.categoryName}</td>
                            <td className="p-2 text-center">{c.distinctProducts.size}</td>
                            <td className="p-2 text-center font-bold text-blue-950">{c.quantitySold}</td>
                            <td className="p-2 text-right font-black text-slate-900">
                              {c.revenue.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                            </td>
                            <td className="p-2 text-right font-bold text-emerald-800">
                              {Math.round(c.profit).toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                            </td>
                            <td className="p-2 text-right font-bold">{partCA}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 5. Stores Breakdown (if 'full' or 'stores') */}
              {(printLayout === 'full' || printLayout === 'stores') && (
                <div>
                  <h3 className="font-bold text-xs uppercase text-slate-800 border-b border-slate-300 pb-1 mb-2">
                    4. Performance par Magasin / Point de Vente
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs border border-slate-200 min-w-[640px] print:min-w-0">
                    <thead className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-700">
                      <tr>
                        <th className="p-2">Magasin</th>
                        <th className="p-2">Ville / Emplacement</th>
                        <th className="p-2 text-center">Nbre Ventes</th>
                        <th className="p-2 text-center">Articles</th>
                        <th className="p-2 text-right">CA Total</th>
                        <th className="p-2 text-right">Encaissé</th>
                        <th className="p-2 text-right">Reste Dû</th>
                        <th className="p-2 text-right">Panier Moyen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-[11px]">
                      {storeAggregations.map((s) => (
                        <tr key={s.locationId} className="even:bg-slate-50">
                          <td className="p-2 font-bold text-slate-900">{s.locationName}</td>
                          <td className="p-2 text-slate-600">{s.city || '-'}</td>
                          <td className="p-2 text-center font-semibold">{s.salesCount}</td>
                          <td className="p-2 text-center font-bold text-blue-950">{s.totalItemsSold}</td>
                          <td className="p-2 text-right font-black text-slate-900">
                            {s.revenue.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                          </td>
                          <td className="p-2 text-right font-bold text-emerald-800">
                            {s.paidAmount.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                          </td>
                          <td className="p-2 text-right font-bold text-rose-700">
                            {s.dueAmount.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                          </td>
                          <td className="p-2 text-right font-semibold">
                            {Math.round(s.avgTicket).toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 6. Journal of Tickets (if 'full' or 'journal') */}
              {(printLayout === 'full' || printLayout === 'journal') && (
                <div>
                  <h3 className="font-bold text-xs uppercase text-slate-800 border-b border-slate-300 pb-1 mb-2">
                    5. Journal Chronologique des Factures & Tickets ({dateFilteredSales.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[10px] border border-slate-200 min-w-[640px] print:min-w-0">
                    <thead className="bg-slate-100 border-b border-slate-200 uppercase font-bold text-slate-700">
                      <tr>
                        <th className="p-1.5">N° Facture</th>
                        <th className="p-1.5">Date</th>
                        <th className="p-1.5">Magasin</th>
                        <th className="p-1.5">Client</th>
                        <th className="p-1.5">Mode</th>
                        <th className="p-1.5 text-right">Total Net</th>
                        <th className="p-1.5 text-right">Encaissé</th>
                        <th className="p-1.5 text-right">Reste</th>
                        <th className="p-1.5 text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {dateFilteredSales.map((sale) => {
                        const loc = state.locations.find((l) => l.id === sale.locationId);
                        const cust = state.contacts.find((c) => c.id === sale.customerId);
                        return (
                          <tr key={sale.id} className="even:bg-slate-50">
                            <td className="p-1.5 font-mono font-bold text-slate-900">{sale.invoiceNo}</td>
                            <td className="p-1.5 text-slate-600">{sale.saleDate}</td>
                            <td className="p-1.5 text-slate-700">{loc?.name || sale.locationId}</td>
                            <td className="p-1.5 text-slate-800 font-medium">{cust?.name || 'Client Comptoir'}</td>
                            <td className="p-1.5 uppercase text-slate-600">{sale.paymentMethod}</td>
                            <td className="p-1.5 text-right font-black text-slate-900">
                              {sale.totalAmount.toLocaleString('fr-FR')}
                            </td>
                            <td className="p-1.5 text-right font-bold text-emerald-800">
                              {sale.paidAmount.toLocaleString('fr-FR')}
                            </td>
                            <td className="p-1.5 text-right font-bold text-rose-700">
                              {sale.dueAmount.toLocaleString('fr-FR')}
                            </td>
                            <td className="p-1.5 text-center font-bold uppercase">
                              {sale.paymentStatus === 'paid' ? 'Soldé' : sale.paymentStatus === 'partial' ? 'Partiel' : 'Dû'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Signatures & Certification Box */}
              <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 text-xs">
                <div className="border border-slate-300 rounded-xl p-4 h-28 flex flex-col justify-between">
                  <div className="font-bold text-slate-800 uppercase text-[11px]">
                    Visa & Signature du Caissier / Vendeur
                  </div>
                  <div className="text-[10px] text-slate-500 italic">
                    Nom : {state.users.find(u => u.id === state.currentUserId)?.name || '................................'}
                  </div>
                </div>

                <div className="border border-slate-300 rounded-xl p-4 h-28 flex flex-col justify-between">
                  <div className="font-bold text-slate-800 uppercase text-[11px]">
                    Visa de la Direction / Contrôle de Caisse
                  </div>
                  <div className="text-[10px] text-slate-500 italic">
                    Date et Signature : ................................
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-center text-[10px] text-slate-500 pt-2 border-t border-slate-200">
                Document certifié conforme issu du logiciel ERP Multi-Magasins • {currentBusiness.name}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
