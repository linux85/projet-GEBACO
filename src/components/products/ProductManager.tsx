import React, { useState, useEffect, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { Product, Category, SubCategory, Brand, Unit, VariationTemplate } from '../../types';
import {
  Package,
  Plus,
  Sliders,
  ArrowRightLeft,
  Barcode,
  Search,
  Check,
  AlertTriangle,
  X,
  Sparkles,
  Layers,
  Tag,
  Scale,
  Settings2,
  Edit2,
  Trash2,
  AlertCircle,
  Upload,
  FileSpreadsheet,
  Download,
  FileText,
  Coins,
  TrendingUp,
  Percent,
  CheckCircle2,
  Bell,
  FolderTree,
  GitBranch,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { StockTransferModal } from './StockTransferModal';
import { BarcodeGeneratorModal } from './BarcodeGeneratorModal';
import { ProductImportModal } from './ProductImportModal';
import { ProductExportModal } from './ProductExportModal';
import { exportProductsStockToCSV } from '../../lib/productStockExport';
import { uploadFileToFirebaseStorage } from '../../lib/firebase';

export const ProductManager: React.FC = () => {
  const {
    state,
    currentBusiness,
    addProduct,
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
  } = useERP();

  const [activeSubTab, setActiveSubTab] = useState<
    'catalog' | 'categories' | 'brands' | 'units' | 'variations'
  >('catalog');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>(
    state.currentLocationId !== 'all' ? state.currentLocationId : 'all'
  );
  const [stockFilterMode, setStockFilterMode] = useState<'all' | 'in_stock' | 'out_of_stock' | 'low_stock'>('all');

  // Pagination (20 items per page)
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedSubCategory, selectedLocationFilter, stockFilterMode]);

  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportModalFormat, setExportModalFormat] = useState<'xlsx' | 'csv'>('csv');
  const [exportProductIds, setExportProductIds] = useState<string[] | undefined>(undefined);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Bulk Selection & Deletion States
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkActionToast, setBulkActionToast] = useState<string | null>(null);

  // Category Edit / Delete States
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatCode, setEditCatCode] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // SubCategory Edit / Delete States
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);
  const [editSubCatName, setEditSubCatName] = useState('');
  const [editSubCatCode, setEditSubCatCode] = useState('');
  const [editSubCatParentId, setEditSubCatParentId] = useState('');
  const [subCategoryToDelete, setSubCategoryToDelete] = useState<SubCategory | null>(null);

  // Quick Add SubCategory from Product Form Modal
  const [showQuickAddSubCatModal, setShowQuickAddSubCatModal] = useState(false);
  const [quickSubCatName, setQuickSubCatName] = useState('');
  const [quickSubCatCode, setQuickSubCatCode] = useState('');

  // Brand Edit / Delete States
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editBrandName, setEditBrandName] = useState('');
  const [editBrandDesc, setEditBrandDesc] = useState('');
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);

  // Unit Edit / Delete States
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [editUnitName, setEditUnitName] = useState('');
  const [editUnitShort, setEditUnitShort] = useState('');
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);

  // Variation Template Edit / Delete States
  const [editingVariationTemplate, setEditingVariationTemplate] = useState<VariationTemplate | null>(null);
  const [editVarTplName, setEditVarTplName] = useState('');
  const [editVarTplValues, setEditVarTplValues] = useState('');
  const [variationTemplateToDelete, setVariationTemplateToDelete] = useState<VariationTemplate | null>(null);

  // Modals for Stock Adjustment, Transfers & Barcodes
  const [stockAdjProduct, setStockAdjProduct] = useState<Product | null>(null);
  const [stockTransferProduct, setStockTransferProduct] = useState<Product | null>(null);
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);

  // New Product Form State
  const [pName, setPName] = useState('');
  const [pType, setPType] = useState<'single' | 'variable'>('single');
  const [pSku, setPSku] = useState('');
  const [pBarcode, setPBarcode] = useState('');
  const [pBrandId, setPBrandId] = useState('');
  const [pCategoryId, setPCategoryId] = useState('');
  const [pSubCategoryId, setPSubCategoryId] = useState('');
  const [pUnitId, setPUnitId] = useState(state.units[0]?.id || '');
  const [pImage, setPImage] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [pAlertQty, setPAlertQty] = useState<number>(5);
  const [pTaxRate, setPTaxRate] = useState<number>(18);
  const [pPurchasePrice, setPPurchasePrice] = useState<number>(10000);
  const [pProfitMargin, setPProfitMargin] = useState<number>(
    currentBusiness.defaultProfitMargin || 25
  );
  const [pSellingPrice, setPSellingPrice] = useState<number>(14750);

  // Quick Price Modal States
  const [quickPriceProduct, setQuickPriceProduct] = useState<Product | null>(null);
  const [quickSellingPrice, setQuickSellingPrice] = useState<number>(0);
  const [quickPurchasePrice, setQuickPurchasePrice] = useState<number>(0);
  const [quickProfitMargin, setQuickProfitMargin] = useState<number>(0);
  const [quickTaxRate, setQuickTaxRate] = useState<number>(18);
  const [priceToast, setPriceToast] = useState<string | null>(null);

  // Quick Alert Threshold Modal States
  const [quickAlertProduct, setQuickAlertProduct] = useState<Product | null>(null);
  const [quickAlertThreshold, setQuickAlertThreshold] = useState<number>(5);

  // Price Calculation Helpers for Main Modal
  const handlePurchasePriceChange = (cost: number) => {
    const val = Math.max(0, cost);
    setPPurchasePrice(val);
    const newSelling = Math.round(val * (1 + pProfitMargin / 100) * (1 + pTaxRate / 100));
    setPSellingPrice(newSelling);
  };

  const handleProfitMarginChange = (margin: number) => {
    setPProfitMargin(margin);
    const newSelling = Math.round(pPurchasePrice * (1 + margin / 100) * (1 + pTaxRate / 100));
    setPSellingPrice(newSelling);
  };

  const handleTaxRateChange = (tax: number) => {
    const val = Math.max(0, tax);
    setPTaxRate(val);
    const newSelling = Math.round(pPurchasePrice * (1 + pProfitMargin / 100) * (1 + val / 100));
    setPSellingPrice(newSelling);
  };

  const handleSellingPriceChange = (selling: number) => {
    const val = Math.max(0, selling);
    setPSellingPrice(val);
    if (pPurchasePrice > 0) {
      const priceExTax = val / (1 + pTaxRate / 100);
      const computedMargin = Math.round(((priceExTax - pPurchasePrice) / pPurchasePrice) * 100 * 10) / 10;
      setPProfitMargin(computedMargin);
    }
  };

  // Quick Price Modal Handlers
  const handleOpenQuickPrice = (prd: Product) => {
    setQuickPriceProduct(prd);
    setQuickSellingPrice(prd.sellingPrice);
    setQuickPurchasePrice(prd.purchasePrice);
    setQuickProfitMargin(prd.profitMargin);
    setQuickTaxRate(prd.taxRate || 0);
  };

  const handleQuickSellingChange = (selling: number) => {
    const val = Math.max(0, selling);
    setQuickSellingPrice(val);
    if (quickPurchasePrice > 0) {
      const priceExTax = val / (1 + quickTaxRate / 100);
      const computedMargin = Math.round(((priceExTax - quickPurchasePrice) / quickPurchasePrice) * 100 * 10) / 10;
      setQuickProfitMargin(computedMargin);
    }
  };

  const handleSaveQuickPrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPriceProduct) return;

    updateProduct({
      ...quickPriceProduct,
      sellingPrice: quickSellingPrice,
      profitMargin: quickProfitMargin,
      purchasePrice: quickPurchasePrice,
    });

    setPriceToast(`Prix du produit "${quickPriceProduct.name}" mis à jour : ${quickSellingPrice.toLocaleString('fr-FR')} ${currentBusiness.currencySymbol}`);
    setQuickPriceProduct(null);
    setTimeout(() => {
      setPriceToast(null);
    }, 3500);
  };

  // Quick Threshold Modal Handlers
  const handleOpenQuickAlertThreshold = (prd: Product) => {
    setQuickAlertProduct(prd);
    setQuickAlertThreshold(prd.alertQuantity ?? 5);
  };

  const handleSaveQuickAlertThreshold = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAlertProduct) return;

    const thresholdVal = Math.max(0, Number(quickAlertThreshold));
    updateProduct({
      ...quickAlertProduct,
      alertQuantity: thresholdVal,
    });

    setPriceToast(`Seuil d'alerte stock pour "${quickAlertProduct.name}" défini à ${thresholdVal} unité(s). Une alerte se déclenchera dès ce palier.`);
    setQuickAlertProduct(null);
    setTimeout(() => {
      setPriceToast(null);
    }, 4000);
  };

  // Initial Location Stock State
  const businessLocations = state.locations.filter(
    (l) => l.businessId === currentBusiness.id
  );
  const [locationStockMap, setLocationStockMap] = useState<Record<string, number>>({});

  // Sub-tab creation forms
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('');
  const [newSubCatName, setNewSubCatName] = useState('');
  const [newSubCatCode, setNewSubCatCode] = useState('');
  const [newSubCatParentId, setNewSubCatParentId] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandDesc, setNewBrandDesc] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitShort, setNewUnitShort] = useState('');
  const [newVarTplName, setNewVarTplName] = useState('');
  const [newVarTplValues, setNewVarTplValues] = useState('');

  const handleAutoGenerateSku = () => {
    setPSku(`PRD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setPName('');
    setPType('single');
    handleAutoGenerateSku();
    setPBarcode('');
    setPBrandId(state.brands[0]?.id || '');
    const firstCat = state.categories.find((c) => c.businessId === currentBusiness.id) || state.categories[0];
    const initialCatId = firstCat?.id || '';
    setPCategoryId(initialCatId);
    const matchingSubCats = (state.subCategories || []).filter(
      (s) => s.categoryId === initialCatId && (!s.businessId || s.businessId === currentBusiness.id)
    );
    setPSubCategoryId(matchingSubCats[0]?.id || '');
    setPUnitId(state.units[0]?.id || '');
    setPImage('https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&auto=format&fit=crop&q=80');
    setPAlertQty(5);
    setPTaxRate(18);
    setPPurchasePrice(10000);
    const defMargin = currentBusiness.defaultProfitMargin || 25;
    setPProfitMargin(defMargin);
    setPSellingPrice(Math.round(10000 * (1 + defMargin / 100) * (1 + 18 / 100)));
    const initialMap: Record<string, number> = {};
    businessLocations.forEach((loc) => {
      initialMap[loc.id] = 10;
    });
    setLocationStockMap(initialMap);
    setShowAddProductModal(true);
  };

  const handleOpenEditProduct = (prd: Product) => {
    setEditingProduct(prd);
    setPName(prd.name);
    setPType(prd.type || 'single');
    setPSku(prd.sku);
    setPBarcode(prd.barcode || '');
    setPBrandId(prd.brandId || '');
    setPCategoryId(prd.categoryId || '');
    setPSubCategoryId(prd.subCategoryId || '');
    setPUnitId(prd.unitId || '');
    setPImage(prd.image || '');
    setPAlertQty(prd.alertQuantity);
    setPTaxRate(prd.taxRate);
    setPPurchasePrice(prd.purchasePrice);
    setPProfitMargin(prd.profitMargin);
    setPSellingPrice(prd.sellingPrice);
    setLocationStockMap(prd.locationStock || {});
    setShowAddProductModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName || !pSku) return;

    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        name: pName,
        type: pType,
        sku: pSku,
        barcode: pBarcode,
        brandId: pBrandId,
        categoryId: pCategoryId,
        subCategoryId: pSubCategoryId || undefined,
        unitId: pUnitId,
        image: pImage,
        alertQuantity: pAlertQty,
        taxRate: pTaxRate,
        purchasePrice: pPurchasePrice,
        profitMargin: pProfitMargin,
        sellingPrice: pSellingPrice,
        locationStock: locationStockMap,
      });
    } else {
      addProduct({
        businessId: currentBusiness.id,
        name: pName,
        type: pType,
        sku: pSku,
        barcode: pBarcode,
        brandId: pBrandId,
        categoryId: pCategoryId,
        subCategoryId: pSubCategoryId || undefined,
        unitId: pUnitId,
        image: pImage,
        alertQuantity: pAlertQty,
        taxRate: pTaxRate,
        purchasePrice: pPurchasePrice,
        profitMargin: pProfitMargin,
        sellingPrice: pSellingPrice,
        locationStock: locationStockMap,
      });
    }

    setShowAddProductModal(false);
  };

  // Helper to compute stock of a product in a given store or globally
  const getProductStockForCatalog = (p: Product, locId?: string): number => {
    if (!locId || locId === 'all') {
      if (p.type === 'variable' && p.variations && p.variations.length > 0) {
        return p.variations.reduce((sum, v) => {
          return sum + (Object.values(v.locationStock || {}) as number[]).reduce((a, b) => a + (Number(b) || 0), 0);
        }, 0);
      }
      return (Object.values(p.locationStock || {}) as number[]).reduce((a, b) => a + (Number(b) || 0), 0);
    }
    if (p.type === 'variable' && p.variations && p.variations.length > 0) {
      return p.variations.reduce((sum, v) => {
        return sum + (Number(v.locationStock?.[locId]) || 0);
      }, 0);
    }
    return Number(p.locationStock?.[locId]) || 0;
  };

  // Filtered Products List
  const filteredProducts = state.products.filter((p) => {
    if (p.businessId !== currentBusiness.id) return false;
    if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) return false;
    if (selectedSubCategory !== 'all' && p.subCategoryId !== selectedSubCategory) return false;
    
    // Store Stock Visibility Filter
    if (selectedLocationFilter !== 'all') {
      const stockInStore = getProductStockForCatalog(p, selectedLocationFilter);
      if (stockFilterMode === 'in_stock' && stockInStore <= 0) return false;
      if (stockFilterMode === 'out_of_stock' && stockInStore > 0) return false;
      if (stockFilterMode === 'low_stock' && stockInStore > (p.alertQuantity ?? 0)) return false;
    } else {
      const totalStock = getProductStockForCatalog(p, 'all');
      if (stockFilterMode === 'in_stock' && totalStock <= 0) return false;
      if (stockFilterMode === 'out_of_stock' && totalStock > 0) return false;
      if (stockFilterMode === 'low_stock' && totalStock > (p.alertQuantity ?? 0)) return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Pagination Calculations (20 items per page)
  const totalProducts = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalProducts / ITEMS_PER_PAGE));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalProducts);
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Generate page numbers with ellipses
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (validCurrentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (validCurrentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', validCurrentPage - 1, validCurrentPage, validCurrentPage + 1, '...', totalPages);
      }
    }
    return pages;
  }, [totalPages, validCurrentPage]);

  // Bulk Selection Logic
  const isAllCurrentPageSelected =
    paginatedProducts.length > 0 &&
    paginatedProducts.every((p) => selectedProductIds.includes(p.id));

  const isSomeCurrentPageSelected =
    paginatedProducts.some((p) => selectedProductIds.includes(p.id)) &&
    !isAllCurrentPageSelected;

  const handleToggleSelectAllCurrentPage = () => {
    if (isAllCurrentPageSelected) {
      const pageIds = new Set(paginatedProducts.map((p) => p.id));
      setSelectedProductIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const newSelected = new Set(selectedProductIds);
      paginatedProducts.forEach((p) => newSelected.add(p.id));
      setSelectedProductIds(Array.from(newSelected));
    }
  };

  const handleToggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    setSelectedProductIds(filteredProducts.map((p) => p.id));
  };

  const handleClearSelection = () => {
    setSelectedProductIds([]);
  };

  const handleConfirmBulkDelete = () => {
    const count = selectedProductIds.length;
    if (count === 0) return;
    deleteProducts(selectedProductIds);
    setSelectedProductIds([]);
    setShowBulkDeleteModal(false);
    setBulkActionToast(
      `${count} produit${count > 1 ? 's ont été définitivement supprimés' : ' a été définitivement supprimé'}.`
    );
    setTimeout(() => setBulkActionToast(null), 4000);
  };

  // Selected products objects for bulk modal review
  const selectedProductsList = useMemo(() => {
    const idSet = new Set(selectedProductIds);
    return state.products.filter((p) => idSet.has(p.id));
  }, [state.products, selectedProductIds]);

  // Open Export Modal with chosen format and optionally pre-filtered product IDs
  const handleOpenExportModal = (format: 'xlsx' | 'csv' = 'csv', productIds?: string[]) => {
    setExportModalFormat(format);
    setExportProductIds(productIds);
    setShowExportModal(true);
  };

  // Direct 1-Click CSV Export of the currently filtered catalog view
  const handleDirectExportCatalogCSV = () => {
    try {
      const activeProducts = state.products.filter((p) => p.businessId === currentBusiness.id);
      exportProductsStockToCSV(
        activeProducts,
        state.categories,
        state.brands,
        state.units,
        state.locations,
        {
          locationId: selectedLocationFilter,
          categoryId: selectedCategory,
          subCategoryId: selectedSubCategory,
          stockStatusFilter: stockFilterMode,
          searchQuery,
          currencySymbol: currentBusiness.currencySymbol,
          businessName: currentBusiness.name,
          delimiter: ';',
        },
        state.subCategories
      );
      setBulkActionToast(`Export CSV réussi (${filteredProducts.length} article(s) exporté(s))`);
      setTimeout(() => setBulkActionToast(null), 4000);
    } catch (err) {
      console.error('Erreur export CSV:', err);
    }
  };

  // Direct 1-Click CSV Export of only selected products (from bulk selection)
  const handleExportSelectedCSV = () => {
    if (selectedProductIds.length === 0) return;
    try {
      const activeProducts = state.products.filter((p) => p.businessId === currentBusiness.id);
      exportProductsStockToCSV(
        activeProducts,
        state.categories,
        state.brands,
        state.units,
        state.locations,
        {
          productIds: selectedProductIds,
          locationId: selectedLocationFilter,
          currencySymbol: currentBusiness.currencySymbol,
          businessName: currentBusiness.name,
          filename: `export_selection_${selectedProductIds.length}_produits_${new Date().toISOString().split('T')[0]}`,
          delimiter: ';',
        },
        state.subCategories
      );
      setBulkActionToast(`${selectedProductIds.length} produit(s) sélectionné(s) exporté(s) en CSV avec succès !`);
      setTimeout(() => setBulkActionToast(null), 4000);
    } catch (err) {
      console.error('Erreur export CSV sélection:', err);
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 text-white">
      {/* Top Header & Sub-Tab Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30 shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold">Gestion des Produits & Catalogues</h2>
            <p className="text-xs text-slate-400">
              Articles simples et variables, calcul automatique des prix, stock par emplacement.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center justify-center space-x-2 px-3.5 min-h-[42px] sm:min-h-[38px] bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-bold rounded-xl text-xs transition-all border border-emerald-500/30 shadow-sm whitespace-nowrap"
            title="Importer des produits et initialiser les stocks via fichier CSV ou Excel"
          >
            <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Importer</span>
          </button>

          {/* DEDICATED CSV EXPORT BUTTON GROUP */}
          <div className="relative inline-flex items-center rounded-xl bg-blue-600/20 border border-blue-500/30 p-0.5 shadow-sm">
            <button
              type="button"
              onClick={handleDirectExportCatalogCSV}
              className="flex items-center space-x-1.5 px-3 min-h-[38px] sm:min-h-[34px] hover:bg-blue-600 text-blue-300 hover:text-white font-bold rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap"
              title="Télécharger immédiatement le catalogue filtré en fichier CSV (Point-virgule UTF-8)"
            >
              <FileText className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Exporter CSV</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenExportModal('csv')}
              className="px-2.5 min-h-[38px] sm:min-h-[34px] hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg text-xs transition-all border-l border-blue-500/30 cursor-pointer"
              title="Paramètres avancés d'exportation CSV (séparateurs, magasins, filtres)"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* EXCEL EXPORT BUTTON */}
          <button
            onClick={() => handleOpenExportModal('xlsx')}
            className="flex items-center justify-center space-x-1.5 px-3 min-h-[42px] sm:min-h-[38px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition-all border border-slate-700 shadow-sm whitespace-nowrap"
            title="Exporter rapport complet avec KPIs et totaux en format Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 min-h-[42px] sm:min-h-[38px] bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-900/30 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Créer un Nouveau Produit</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex items-center space-x-1.5 border-b border-slate-800 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveSubTab('catalog')}
          className={`flex items-center space-x-2 px-4 min-h-[40px] py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            activeSubTab === 'catalog'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Catalogue Produit ({totalProducts})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('categories')}
          className={`flex items-center space-x-2 px-4 min-h-[40px] py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            activeSubTab === 'categories'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 shrink-0" />
          <span>Catégories & Sous-Catégories</span>
        </button>

        <button
          onClick={() => setActiveSubTab('brands')}
          className={`flex items-center space-x-2 px-4 min-h-[40px] py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            activeSubTab === 'brands'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Tag className="w-4 h-4 shrink-0" />
          <span>Marques</span>
        </button>

        <button
          onClick={() => setActiveSubTab('units')}
          className={`flex items-center space-x-2 px-4 min-h-[40px] py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            activeSubTab === 'units'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Scale className="w-4 h-4 shrink-0" />
          <span>Unités de Mesure</span>
        </button>

        <button
          onClick={() => setActiveSubTab('variations')}
          className={`flex items-center space-x-2 px-4 min-h-[40px] py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            activeSubTab === 'variations'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Settings2 className="w-4 h-4 shrink-0" />
          <span>Modèles de Variation</span>
        </button>
      </div>

      {/* SUB-TAB 1: CATALOG */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, SKU, code-barres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 text-white pl-9 pr-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2 w-full lg:w-auto">
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-xs text-slate-400 font-semibold shrink-0">Magasin:</span>
                <select
                  value={selectedLocationFilter}
                  onChange={(e) => setSelectedLocationFilter(e.target.value)}
                  className="min-w-0 flex-1 lg:flex-initial bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2 sm:p-1.5 font-semibold focus:outline-none"
                >
                  <option value="all">Tous les magasins (Vue globale)</option>
                  {state.locations
                    .filter((l) => l.businessId === currentBusiness.id)
                    .map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} {loc.city ? `(${loc.city})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs text-slate-400 font-semibold shrink-0">Disponibilité:</span>
                <select
                  value={stockFilterMode}
                  onChange={(e) => setStockFilterMode(e.target.value as any)}
                  className="min-w-0 flex-1 lg:flex-initial bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2 sm:p-1.5 font-semibold focus:outline-none"
                >
                  <option value="all">Tous les articles</option>
                  <option value="low_stock">⚠️ Niveaux Critiques / Stock Faible</option>
                  <option value="in_stock">En stock uniquement (&gt; 0)</option>
                  <option value="out_of_stock">Rupture de stock (0)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs text-slate-400 font-semibold shrink-0">Catégorie:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedSubCategory('all');
                  }}
                  className="min-w-0 flex-1 lg:flex-initial bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2 sm:p-1.5 font-semibold focus:outline-none"
                >
                  <option value="all">Toutes les catégories</option>
                  {state.categories
                    .filter((cat) => cat.businessId === currentBusiness.id)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs text-slate-400 font-semibold shrink-0">Sous-Catégorie:</span>
                <select
                  value={selectedSubCategory}
                  onChange={(e) => setSelectedSubCategory(e.target.value)}
                  className="min-w-0 flex-1 lg:flex-initial bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2 sm:p-1.5 font-semibold focus:outline-none"
                >
                  <option value="all">Toutes les sous-catégories</option>
                  {(state.subCategories || [])
                    .filter((s) => {
                      if (s.businessId && s.businessId !== currentBusiness.id) return false;
                      if (selectedCategory !== 'all' && s.categoryId !== selectedCategory) return false;
                      return true;
                    })
                    .map((sub) => {
                      const parentCat = state.categories.find((c) => c.id === sub.categoryId);
                      return (
                        <option key={sub.id} value={sub.id}>
                          {selectedCategory === 'all' && parentCat ? `${parentCat.name} > ` : ''}
                          {sub.name}
                        </option>
                      );
                    })}
                </select>
              </div>

              <button
                type="button"
                onClick={handleDirectExportCatalogCSV}
                className="sm:col-span-2 lg:col-span-1 flex items-center justify-center space-x-1.5 px-3 py-2 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap"
                title={`Télécharger immédiatement le fichier CSV des ${filteredProducts.length} articles filtrés`}
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Export CSV ({filteredProducts.length})</span>
              </button>
            </div>
          </div>

          {/* Bulk Selection Bar */}
          {selectedProductIds.length > 0 && (
            <div className="bg-blue-950/80 border border-blue-500/50 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-blue-950/40 animate-in fade-in duration-150">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-blue-600 text-white font-bold rounded-lg text-xs shadow-xs">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>
                    {selectedProductIds.length} produit{selectedProductIds.length > 1 ? 's' : ''} sélectionné{selectedProductIds.length > 1 ? 's' : ''}
                  </span>
                </span>

                {selectedProductIds.length < filteredProducts.length && (
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="text-xs font-semibold text-blue-300 hover:text-white underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    Sélectionner tous les {filteredProducts.length} produits filtrés
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                >
                  Désélectionner tout
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleExportSelectedCSV}
                  className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-950 transition-all cursor-pointer whitespace-nowrap"
                  title="Télécharger un fichier CSV contenant uniquement les produits sélectionnés"
                >
                  <Download className="w-4 h-4" />
                  <span>Exporter la sélection (CSV)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowBulkDeleteModal(true)}
                  className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-950 transition-all cursor-pointer whitespace-nowrap"
                  title="Supprimer définitivement tous les produits sélectionnés"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Supprimer la sélection ({selectedProductIds.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* Product Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[960px]">
              <thead className="bg-slate-950 border-b border-slate-800 uppercase text-[10px] font-bold text-slate-400">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllCurrentPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeCurrentPageSelected;
                      }}
                      onChange={handleToggleSelectAllCurrentPage}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                      title={
                        isAllCurrentPageSelected
                          ? 'Désélectionner toute cette page'
                          : 'Sélectionner tous les produits de cette page'
                      }
                    />
                  </th>
                  <th className="p-3">Produit</th>
                  <th className="p-3">SKU / Type</th>
                  <th className="p-3">Catégorie & Sous-Catégorie</th>
                  <th className="p-3 text-right">Prix d'Achat</th>
                  <th className="p-3 text-right">Marge %</th>
                  <th className="p-3 text-right">Prix de Vente</th>
                  <th className="p-3 text-center">
                    {selectedLocationFilter !== 'all' ? (
                      <span>
                        Stock (
                        {state.locations.find((l) => l.id === selectedLocationFilter)?.name || 'Magasin'}
                        )
                      </span>
                    ) : (
                      <span>Stock Total</span>
                    )}
                  </th>
                  <th className="p-3 text-center">Seuil Alerte</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {totalProducts === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-10 text-center text-slate-400">
                      <Package className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                      <p className="font-bold text-slate-300 text-sm">Aucun produit trouvé</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Aucun article ne correspond à vos critères de recherche.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((prd) => {
                  const cat = state.categories.find((c) => c.id === prd.categoryId);
                  const subCat = (state.subCategories || []).find((s) => s.id === prd.subCategoryId);
                  const brd = state.brands.find((b) => b.id === prd.brandId);
                  const currentStock = getProductStockForCatalog(prd, selectedLocationFilter);
                  const totalGlobalStock = getProductStockForCatalog(prd, 'all');
                  const isSelected = selectedProductIds.includes(prd.id);

                  return (
                    <tr
                      key={prd.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-blue-950/40 hover:bg-blue-900/40 border-l-2 border-l-blue-500'
                          : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectProduct(prd.id)}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                          title={`Sélectionner ${prd.name}`}
                        />
                      </td>
                      <td className="p-3 font-semibold text-white flex items-center space-x-2.5">
                        {prd.image ? (
                          <img
                            src={prd.image}
                            alt={prd.name}
                            className="w-9 h-9 rounded-lg object-cover border border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-100">{prd.name}</div>
                          {prd.type === 'variable' && (
                            <span className="text-[10px] text-blue-400">
                              {prd.variations?.length || 0} déclinaison(s)
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 font-mono text-slate-300">
                        <div>{prd.sku}</div>
                        <span className="text-[10px] uppercase font-bold text-slate-500">
                          {prd.type === 'single' ? 'Simple' : 'Variable'}
                        </span>
                      </td>

                      <td className="p-3 text-slate-300">
                        <div className="font-semibold text-slate-200">{cat ? cat.name : '-'}</div>
                        {subCat && (
                          <div className="text-[11px] text-blue-300 font-medium flex items-center space-x-1 mt-0.5">
                            <span className="text-slate-500">↳</span>
                            <span className="bg-blue-950/70 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800/40 text-[10px]">
                              {subCat.name}
                            </span>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-0.5">{brd ? `Marque: ${brd.name}` : ''}</div>
                      </td>

                      <td className="p-3 text-right font-medium text-slate-300">
                        {prd.purchasePrice.toLocaleString('fr-FR')}{' '}
                        {currentBusiness.currencySymbol}
                      </td>

                      <td className="p-3 text-right font-bold text-amber-400">
                        +{prd.profitMargin}%
                      </td>

                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenQuickPrice(prd)}
                          className="group/price inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/50 hover:border-emerald-500 text-emerald-300 transition-all font-black text-xs cursor-pointer shadow-sm"
                          title="Cliquer pour modifier directement le prix de vente"
                        >
                          <span>
                            {prd.sellingPrice.toLocaleString('fr-FR')}{' '}
                            {currentBusiness.currencySymbol}
                          </span>
                          <Edit2 className="w-3 h-3 text-emerald-400 opacity-60 group-hover/price:opacity-100 group-hover/price:scale-110 transition-all" />
                        </button>
                      </td>

                      <td className="p-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                            currentStock <= 0
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : currentStock <= prd.alertQuantity
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {currentStock} unité{currentStock > 1 ? 's' : ''}
                        </span>
                        {selectedLocationFilter !== 'all' && (
                          <div className="text-[9px] text-slate-500 mt-0.5">
                            Total réseau: {totalGlobalStock}
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenQuickAlertThreshold(prd)}
                          className="group/alert inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-amber-950/70 border border-slate-700 hover:border-amber-500/70 text-slate-300 hover:text-amber-300 transition-all text-xs font-bold"
                          title="Modifier le seuil critique d'alerte pour ce produit"
                        >
                          <AlertTriangle className={`w-3 h-3 ${currentStock <= prd.alertQuantity ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
                          <span>{prd.alertQuantity} u</span>
                          <Edit2 className="w-2.5 h-2.5 opacity-50 group-hover/alert:opacity-100" />
                        </button>
                      </td>

                      <td className="p-3 text-right space-x-1">
                        <button
                          onClick={() => handleOpenQuickAlertThreshold(prd)}
                          className="p-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white rounded-lg border border-amber-500/30 text-xs transition-colors"
                          title="Définir le seuil d'alerte stock bas"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenQuickPrice(prd)}
                          className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg border border-emerald-500/30 text-xs transition-colors"
                          title="Modifier le prix de vente"
                        >
                          <Coins className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditProduct(prd)}
                          className="p-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg border border-blue-500/30 text-xs transition-colors"
                          title="Modifier le produit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setProductToDelete(prd)}
                          className="p-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg border border-rose-500/30 text-xs transition-colors"
                          title="Supprimer le produit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setStockTransferProduct(prd)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg border border-slate-700 text-xs"
                          title="Transférer le stock entre magasins"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setStockAdjProduct(prd)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg border border-slate-700 text-xs"
                          title="Ajuster le stock"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setBarcodeProduct(prd)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs"
                          title="Générer code-barres"
                        >
                          <Barcode className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
              </table>
            </div>

            {/* Pagination Bar (20 items/page) */}
            <div className="bg-slate-950/90 px-4 py-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <span>
                  Affichage de{' '}
                  <span className="font-bold text-slate-200">
                    {totalProducts === 0 ? 0 : startIndex + 1}
                  </span>{' '}
                  à{' '}
                  <span className="font-bold text-slate-200">{endIndex}</span>{' '}
                  sur{' '}
                  <span className="font-bold text-white">{totalProducts}</span>{' '}
                  produit{totalProducts > 1 ? 's' : ''}
                </span>
                <span className="text-slate-700">•</span>
                <span className="px-2 py-0.5 rounded-md bg-blue-950/80 text-blue-400 border border-blue-800/40 font-semibold text-[11px]">
                  20 articles par page
                </span>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center space-x-1 self-center sm:self-auto">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={validCurrentPage === 1}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Première page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={validCurrentPage === 1}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Page précédente"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center space-x-1 px-1">
                    {pageNumbers.map((page, idx) =>
                      typeof page === 'number' ? (
                        <button
                          key={idx}
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-8 h-8 px-2 rounded-lg text-xs font-bold transition-all ${
                            validCurrentPage === page
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          {page}
                        </button>
                      ) : (
                        <span key={idx} className="px-1 text-slate-500 font-bold select-none">
                          ...
                        </span>
                      )
                    )}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={validCurrentPage === totalPages}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Page suivante"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={validCurrentPage === totalPages}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Dernière page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: CATEGORIES & SUB-CATEGORIES */}
      {activeSubTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Forms */}
          <div className="space-y-6">
            {/* Form 1: New Category */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 shadow-sm">
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-2.5">
                <Layers className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm text-white">Ajouter une Catégorie</h3>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-semibold">Nom de la Catégorie *</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="ex: Vêtements & Textiles"
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2.5 focus:border-blue-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-semibold">Code Catégorie</label>
                <input
                  type="text"
                  value={newCatCode}
                  onChange={(e) => setNewCatCode(e.target.value)}
                  placeholder="ex: CAT-TEX"
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2.5 focus:border-blue-500 font-mono"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (newCatName.trim()) {
                    addCategory({
                      businessId: currentBusiness.id,
                      name: newCatName.trim(),
                      code: newCatCode.trim() || undefined,
                    });
                    setNewCatName('');
                    setNewCatCode('');
                  }
                }}
                disabled={!newCatName.trim()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs shadow-md shadow-blue-950 transition-all flex items-center justify-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Créer la Catégorie</span>
              </button>
            </div>

            {/* Form 2: New Sub-Category */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 shadow-sm">
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-2.5">
                <GitBranch className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Ajouter une Sous-Catégorie</h3>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-semibold">Catégorie Parente *</label>
                <select
                  value={newSubCatParentId || (state.categories.find((c) => c.businessId === currentBusiness.id)?.id || '')}
                  onChange={(e) => setNewSubCatParentId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2.5 focus:border-emerald-500 font-medium"
                >
                  {state.categories
                    .filter((c) => c.businessId === currentBusiness.id)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} {cat.code ? `(${cat.code})` : ''}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-semibold">Nom de la Sous-Catégorie *</label>
                <input
                  type="text"
                  value={newSubCatName}
                  onChange={(e) => setNewSubCatName(e.target.value)}
                  placeholder="ex: Chemises Homme"
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2.5 focus:border-emerald-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-semibold">Code Sous-Catégorie</label>
                <input
                  type="text"
                  value={newSubCatCode}
                  onChange={(e) => setNewSubCatCode(e.target.value)}
                  placeholder="ex: SUB-CHM"
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2.5 focus:border-emerald-500 font-mono"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const targetParent =
                    newSubCatParentId ||
                    state.categories.find((c) => c.businessId === currentBusiness.id)?.id;
                  if (newSubCatName.trim() && targetParent) {
                    addSubCategory({
                      businessId: currentBusiness.id,
                      categoryId: targetParent,
                      name: newSubCatName.trim(),
                      code: newSubCatCode.trim() || undefined,
                    });
                    setNewSubCatName('');
                    setNewSubCatCode('');
                  }
                }}
                disabled={!newSubCatName.trim() || state.categories.filter((c) => c.businessId === currentBusiness.id).length === 0}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs shadow-md shadow-emerald-950 transition-all flex items-center justify-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Créer la Sous-Catégorie</span>
              </button>
            </div>
          </div>

          {/* Right Column: Hierarchical List / Tree */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 bg-slate-950 font-bold text-sm border-b border-slate-800 flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center space-x-2">
                  <FolderTree className="w-4 h-4 text-blue-400" />
                  <span>Arborescence Catégories & Sous-Catégories</span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate-400 font-normal">
                  <span>
                    <strong className="text-white font-bold">
                      {state.categories.filter((c) => c.businessId === currentBusiness.id).length}
                    </strong>{' '}
                    catégorie(s)
                  </span>
                  <span>•</span>
                  <span>
                    <strong className="text-emerald-400 font-bold">
                      {(state.subCategories || []).filter(
                        (s) => !s.businessId || s.businessId === currentBusiness.id
                      ).length}
                    </strong>{' '}
                    sous-catégorie(s)
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {state.categories.filter((c) => c.businessId === currentBusiness.id).length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    Aucune catégorie enregistrée pour le moment. Utilisez le formulaire à gauche pour en créer une.
                  </div>
                ) : (
                  state.categories
                    .filter((c) => c.businessId === currentBusiness.id)
                    .map((cat) => {
                      const childSubCats = (state.subCategories || []).filter(
                        (s) => s.categoryId === cat.id && (!s.businessId || s.businessId === currentBusiness.id)
                      );
                      const catProductsCount = state.products.filter(
                        (p) => p.businessId === currentBusiness.id && p.categoryId === cat.id
                      ).length;

                      return (
                        <div
                          key={cat.id}
                          className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5 space-y-3 hover:border-slate-700 transition-colors"
                        >
                          {/* Main Category Header Bar */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center space-x-2.5">
                              <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
                                <Layers className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-white text-sm">{cat.name}</span>
                                  {cat.code && (
                                    <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 font-mono text-[10px] rounded border border-slate-700">
                                      {cat.code}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    ({catProductsCount} produit{catProductsCount > 1 ? 's' : ''})
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setNewSubCatParentId(cat.id);
                                  setQuickSubCatName('');
                                  setQuickSubCatCode('');
                                  setShowQuickAddSubCatModal(true);
                                }}
                                className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg border border-emerald-500/30 text-xs font-bold flex items-center space-x-1 transition-colors"
                                title="Ajouter une sous-catégorie à cette catégorie"
                              >
                                <Plus className="w-3 h-3" />
                                <span>+ Sous-Catégorie</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategory(cat);
                                  setEditCatName(cat.name);
                                  setEditCatCode(cat.code || '');
                                }}
                                className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg border border-blue-500/30 text-xs font-bold flex items-center space-x-1 transition-colors"
                                title="Modifier la catégorie"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Modifier</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setCategoryToDelete(cat)}
                                className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg border border-rose-500/30 text-xs font-bold flex items-center space-x-1 transition-colors"
                                title="Supprimer la catégorie et ses sous-catégories"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Supprimer</span>
                              </button>
                            </div>
                          </div>

                          {/* Sub-Categories List */}
                          <div className="pl-6 border-l-2 border-slate-800 space-y-1.5">
                            {childSubCats.length === 0 ? (
                              <div className="text-xs text-slate-500 py-1 flex items-center justify-between">
                                <span>Aucune sous-catégorie rattachée.</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewSubCatParentId(cat.id);
                                    setQuickSubCatName('');
                                    setQuickSubCatCode('');
                                    setShowQuickAddSubCatModal(true);
                                  }}
                                  className="text-emerald-400 hover:underline text-[11px] font-semibold"
                                >
                                  + Ajouter une sous-catégorie
                                </button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {childSubCats.map((sub) => {
                                  const subProductsCount = state.products.filter(
                                    (p) => p.businessId === currentBusiness.id && p.subCategoryId === sub.id
                                  ).length;

                                  return (
                                    <div
                                      key={sub.id}
                                      className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-2 rounded-lg hover:border-slate-700 transition-colors text-xs"
                                    >
                                      <div className="flex items-center space-x-2 min-w-0">
                                        <span className="text-slate-600 shrink-0">↳</span>
                                        <div className="min-w-0">
                                          <div className="font-bold text-slate-200 truncate">{sub.name}</div>
                                          <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-mono">
                                            {sub.code && <span>{sub.code} • </span>}
                                            <span className="font-sans text-slate-400">
                                              {subProductsCount} art.
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center space-x-1 shrink-0 ml-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingSubCategory(sub);
                                            setEditSubCatName(sub.name);
                                            setEditSubCatCode(sub.code || '');
                                            setEditSubCatParentId(sub.categoryId);
                                          }}
                                          className="p-1 text-blue-400 hover:text-white hover:bg-blue-600/30 rounded"
                                          title="Modifier la sous-catégorie"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setSubCategoryToDelete(sub)}
                                          className="p-1 text-rose-400 hover:text-white hover:bg-rose-600/30 rounded"
                                          title="Supprimer la sous-catégorie"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: BRANDS */}
      {activeSubTab === 'brands' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
            <h3 className="font-bold text-sm text-white">Ajouter une Marque</h3>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Nom de la Marque *</label>
              <input
                type="text"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="ex: Sony"
                className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Description / Origine</label>
              <input
                type="text"
                value={newBrandDesc}
                onChange={(e) => setNewBrandDesc(e.target.value)}
                placeholder="ex: Marque officielle certifiée"
                className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2"
              />
            </div>
            <button
              onClick={() => {
                if (newBrandName.trim()) {
                  addBrand({
                    businessId: currentBusiness.id,
                    name: newBrandName.trim(),
                    description: newBrandDesc.trim() || undefined,
                  });
                  setNewBrandName('');
                  setNewBrandDesc('');
                }
              }}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs"
            >
              Enregistrer Marque
            </button>
          </div>

          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 bg-slate-950 font-bold text-sm border-b border-slate-800">
              Marques Enregistrées
            </div>
            <div className="divide-y divide-slate-800">
              {state.brands
                .filter((b) => b.businessId === currentBusiness.id)
                .map((brd) => (
                  <div key={brd.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-semibold hover:bg-slate-800/40">
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-white font-bold truncate">{brd.name}</div>
                      <div className="text-slate-400 text-[10px]">{brd.description || 'Marque certifiée'}</div>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setEditingBrand(brd);
                          setEditBrandName(brd.name);
                          setEditBrandDesc(brd.description || '');
                        }}
                        className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg border border-blue-500/30 text-xs font-bold flex items-center space-x-1 transition-colors"
                        title="Modifier la marque"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Modifier</span>
                      </button>
                      <button
                        onClick={() => setBrandToDelete(brd)}
                        className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg border border-rose-500/30 text-xs font-bold flex items-center space-x-1 transition-colors"
                        title="Supprimer la marque"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Supprimer</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: UNITS */}
      {activeSubTab === 'units' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
            <h3 className="font-bold text-sm text-white">Ajouter une Unité de Mesure</h3>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Nom de l'Unité *</label>
              <input
                type="text"
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
                placeholder="ex: Mètre linéaire"
                className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Abréviation *</label>
              <input
                type="text"
                value={newUnitShort}
                onChange={(e) => setNewUnitShort(e.target.value)}
                placeholder="ex: m"
                className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2"
              />
            </div>
            <button
              onClick={() => {
                if (newUnitName.trim() && newUnitShort.trim()) {
                  addUnit({
                    businessId: currentBusiness.id,
                    name: newUnitName.trim(),
                    shortName: newUnitShort.trim(),
                    allowDecimal: false,
                  });
                  setNewUnitName('');
                  setNewUnitShort('');
                }
              }}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs"
            >
              Enregistrer Unité
            </button>
          </div>

          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 bg-slate-950 font-bold text-sm border-b border-slate-800">
              Unités de Mesure Disponibles
            </div>
            <div className="divide-y divide-slate-800">
              {state.units
                .filter((u) => u.businessId === currentBusiness.id)
                .map((unit) => (
                  <div key={unit.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-semibold hover:bg-slate-800/40">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="text-white font-bold truncate">{unit.name}</span>
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-blue-400 font-mono text-[11px] border border-slate-700 shrink-0">
                        {unit.shortName}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setEditingUnit(unit);
                          setEditUnitName(unit.name);
                          setEditUnitShort(unit.shortName);
                        }}
                        className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg border border-blue-500/30 text-xs font-bold flex items-center space-x-1 transition-colors"
                        title="Modifier l'unité"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Modifier</span>
                      </button>
                      <button
                        onClick={() => setUnitToDelete(unit)}
                        className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg border border-rose-500/30 text-xs font-bold flex items-center space-x-1 transition-colors"
                        title="Supprimer l'unité"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Supprimer</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: VARIATIONS */}
      {activeSubTab === 'variations' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
            <h3 className="font-bold text-sm text-white">Nouveau Modèle de Variation</h3>
            <p className="text-[11px] text-slate-400">
              Réutilisez ce modèle pour créer facilement des produits variables.
            </p>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Nom du Modèle *</label>
              <input
                type="text"
                value={newVarTplName}
                onChange={(e) => setNewVarTplName(e.target.value)}
                placeholder="ex: Capacités Mémoire"
                className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Valeurs (séparées par virgules) *
              </label>
              <input
                type="text"
                value={newVarTplValues}
                onChange={(e) => setNewVarTplValues(e.target.value)}
                placeholder="ex: 128GB, 256GB, 512GB"
                className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2"
              />
            </div>
            <button
              onClick={() => {
                if (newVarTplName && newVarTplValues) {
                  addVariationTemplate({
                    businessId: currentBusiness.id,
                    name: newVarTplName,
                    values: newVarTplValues.split(',').map((v) => v.trim()),
                  });
                  setNewVarTplName('');
                  setNewVarTplValues('');
                }
              }}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs"
            >
              Enregistrer Modèle
            </button>
          </div>

          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 bg-slate-950 font-bold text-sm border-b border-slate-800">
              Modèles de Variation Existants
            </div>
            <div className="divide-y divide-slate-800">
              {state.variationTemplates
                .filter((vt) => vt.businessId === currentBusiness.id)
                .map((tpl) => (
                  <div key={tpl.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-semibold hover:bg-slate-800/40">
                    <div className="space-y-1 min-w-0">
                      <div className="font-bold text-xs text-white">{tpl.name}</div>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {tpl.values.map((v, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-slate-800 text-blue-300 rounded text-[10px] font-medium border border-slate-700"
                          >
                            {v}
                          </span>
                        ))}
                        <span className="text-[10px] text-slate-500 font-normal">
                          ({tpl.values.length} valeur{tpl.values.length > 1 ? 's' : ''})
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setEditingVariationTemplate(tpl);
                          setEditVarTplName(tpl.name);
                          setEditVarTplValues(tpl.values.join(', '));
                        }}
                        className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg border border-blue-500/30 text-xs font-bold flex items-center space-x-1 transition-colors"
                        title="Modifier le modèle de variation"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Modifier</span>
                      </button>
                      <button
                        onClick={() => setVariationTemplateToDelete(tpl)}
                        className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg border border-rose-500/30 text-xs font-bold flex items-center space-x-1 transition-colors"
                        title="Supprimer le modèle de variation"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Supprimer</span>
                      </button>
                    </div>
                  </div>
                ))}
              {state.variationTemplates.filter((vt) => vt.businessId === currentBusiness.id).length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Aucun modèle de variation enregistré.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT PRODUCT MODAL */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2.5 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 sm:p-6 w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl space-y-5 my-4 sm:my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">
                {editingProduct ? 'Modifier le Produit' : 'Créer un Nouveau Produit'}
              </h3>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">
                    Nom du Produit *
                  </label>
                  <input
                    type="text"
                    required
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-medium"
                    placeholder="ex: iPhone 16 Pro Max 256GB"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Type de Produit
                  </label>
                  <select
                    value={pType}
                    onChange={(e) => setPType(e.target.value as 'single' | 'variable')}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold"
                  >
                    <option value="single">Produit Simple</option>
                    <option value="variable">Produit Variable (Tailles/Couleurs)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                    <span>Code SKU *</span>
                    <button
                      type="button"
                      onClick={handleAutoGenerateSku}
                      className="text-blue-400 hover:underline text-[10px]"
                    >
                      Générer auto
                    </button>
                  </label>
                  <input
                    type="text"
                    required
                    value={pSku}
                    onChange={(e) => setPSku(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Catégorie
                  </label>
                  <select
                    value={pCategoryId}
                    onChange={(e) => {
                      const newCatId = e.target.value;
                      setPCategoryId(newCatId);
                      const matchingSubCats = (state.subCategories || []).filter(
                        (s) => s.categoryId === newCatId && (!s.businessId || s.businessId === currentBusiness.id)
                      );
                      if (!matchingSubCats.some((s) => s.id === pSubCategoryId)) {
                        setPSubCategoryId('');
                      }
                    }}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-medium"
                  >
                    {state.categories
                      .filter((c) => c.businessId === currentBusiness.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-300 font-semibold">
                      Sous-Catégorie
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setNewSubCatParentId(pCategoryId);
                        setQuickSubCatName('');
                        setQuickSubCatCode('');
                        setShowQuickAddSubCatModal(true);
                      }}
                      className="text-emerald-400 hover:text-emerald-300 text-[11px] font-bold flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Sous-catégorie</span>
                    </button>
                  </div>
                  <select
                    value={pSubCategoryId}
                    onChange={(e) => setPSubCategoryId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-medium"
                  >
                    <option value="">-- Aucune sous-catégorie --</option>
                    {(state.subCategories || [])
                      .filter(
                        (s) =>
                          s.categoryId === pCategoryId &&
                          (!s.businessId || s.businessId === currentBusiness.id)
                      )
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.code ? `(${s.code})` : ''}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Marque</label>
                  <select
                    value={pBrandId}
                    onChange={(e) => setPBrandId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-medium"
                  >
                    {state.brands
                      .filter((b) => b.businessId === currentBusiness.id)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Unité de Mesure
                  </label>
                  <select
                    value={pUnitId}
                    onChange={(e) => setPUnitId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-medium"
                  >
                    {state.units
                      .filter((u) => u.businessId === currentBusiness.id)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.shortName})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Seuil d'Alerte Stock Faible
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={pAlertQty}
                    onChange={(e) => setPAlertQty(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold"
                  />
                </div>
              </div>

              {/* Product Image & Firebase Storage Upload */}
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                    Image du Produit (Firebase Storage)
                  </label>
                  {isUploadingImage && (
                    <span className="text-xs text-blue-400 font-semibold animate-pulse">
                      Téléversement vers Firebase Storage...
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-4">
                  {pImage ? (
                    <div className="w-16 h-16 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-slate-600 flex items-center justify-center">
                      <img
                        src={pImage}
                        alt="Aperçu"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-500 shrink-0 text-xs">
                      Aucune
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      <label className="cursor-pointer px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 shadow transition-all">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploadingImage ? 'Envoi...' : 'Choisir une Image'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isUploadingImage}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setIsUploadingImage(true);
                            try {
                              const dest = `produits/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                              const url = await uploadFileToFirebaseStorage(file, dest);
                              setPImage(url);
                            } catch (err: any) {
                              alert(`Erreur téléversement Firebase : ${err.message || 'Erreur inconnue'}`);
                            } finally {
                              setIsUploadingImage(false);
                            }
                          }}
                          className="hidden"
                        />
                      </label>

                      {pImage && (
                        <button
                          type="button"
                          onClick={() => setPImage('')}
                          className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg text-xs transition-colors"
                        >
                          Retirer
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={pImage}
                      onChange={(e) => setPImage(e.target.value)}
                      placeholder="Ou collez l'URL directe de l'image"
                      className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded p-1.5 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Price Calculation & Direct Editing Box */}
              <div className="bg-slate-800/90 p-4 rounded-xl border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-bold text-amber-300 uppercase">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Tarification & Prix de Vente (Modifiable)</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Saisie libre du prix ou calcul automatique
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-xs">
                      Prix d'Achat HT ({currentBusiness.currencySymbol})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={pPurchasePrice}
                      onChange={(e) => handlePurchasePriceChange(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 font-bold focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-xs">
                      Marge Bénéficiaire (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={pProfitMargin}
                      onChange={(e) => handleProfitMarginChange(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 text-amber-400 rounded-lg p-2 font-bold focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-emerald-300 font-bold mb-1 text-xs flex items-center justify-between">
                      <span>Prix de Vente TTC *</span>
                      <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">
                        Modifiable
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={pSellingPrice}
                        onChange={(e) => handleSellingPriceChange(Number(e.target.value))}
                        className="w-full bg-slate-950 border-2 border-emerald-500 text-emerald-300 font-black rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="Prix TTC"
                      />
                      <span className="absolute right-2.5 top-2 text-xs font-bold text-emerald-400 pointer-events-none">
                        {currentBusiness.currencySymbol}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Price Info Preview */}
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between text-xs gap-2">
                  <div className="flex items-center space-x-2 text-slate-400 text-[11px]">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      Bénéfice estimé / unité :{' '}
                      <strong className="text-emerald-400 font-bold">
                        {Math.round((pSellingPrice / (1 + pTaxRate / 100)) - pPurchasePrice).toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {[
                      { label: '+10%', factor: 1.10 },
                      { label: '+20%', factor: 1.20 },
                      { label: '+30%', factor: 1.30 },
                      { label: '+50%', factor: 1.50 },
                    ].map((adj, aIdx) => (
                      <button
                        key={aIdx}
                        type="button"
                        onClick={() => {
                          const base = Math.round(pPurchasePrice * (1 + pTaxRate / 100));
                          handleSellingPriceChange(Math.round(base * adj.factor));
                        }}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded border border-slate-700 transition-colors"
                      >
                        {adj.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stock Per Location */}
              <div>
                <label className="block text-slate-300 font-bold mb-1 uppercase tracking-wider text-[10px]">
                  Quantité de Stock Initiale par Emplacement
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {businessLocations.map((loc) => (
                    <div key={loc.id} className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                      <div className="font-semibold text-slate-200 truncate">{loc.name}</div>
                      <input
                        type="number"
                        min="0"
                        value={locationStockMap[loc.id] ?? 0}
                        onChange={(e) =>
                          setLocationStockMap((prev) => ({
                            ...prev,
                            [loc.id]: Number(e.target.value),
                          }))
                        }
                        className="w-full mt-1 bg-slate-900 border border-slate-700 text-white rounded p-1 text-xs font-bold"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-md"
                >
                  Enregistrer le Produit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {stockAdjProduct && (
        <StockAdjustmentModal
          product={stockAdjProduct}
          onClose={() => setStockAdjProduct(null)}
        />
      )}

      {/* Stock Transfer Modal */}
      {stockTransferProduct && (
        <StockTransferModal
          product={stockTransferProduct}
          onClose={() => setStockTransferProduct(null)}
        />
      )}

      {/* Barcode Generator Modal */}
      {barcodeProduct && (
        <BarcodeGeneratorModal
          product={barcodeProduct}
          onClose={() => setBarcodeProduct(null)}
        />
      )}

      {/* CONFIRM DELETE PRODUCT MODAL */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400 border-b border-slate-800 pb-3">
              <div className="p-2 bg-rose-500/20 rounded-xl">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Supprimer le Produit</h3>
                <p className="text-xs text-slate-400">Action irréversible</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <p>
                Êtes-vous sûr de vouloir supprimer définitivement le produit{' '}
                <strong className="text-white font-bold">"{productToDelete.name}"</strong> (SKU:{' '}
                <span className="font-mono text-amber-300">{productToDelete.sku}</span>) ?
              </p>
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Ce produit sera retiré du catalogue, des alertes et du stock des magasins.</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteProduct(productToDelete.id);
                  setProductToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-md transition-colors"
              >
                Oui, Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CATEGORY MODAL */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Modifier la Catégorie</h3>
              <button
                onClick={() => setEditingCategory(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editCatName.trim()) {
                  updateCategory({
                    ...editingCategory,
                    name: editCatName.trim(),
                    code: editCatCode.trim() || undefined,
                  });
                  setEditingCategory(null);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nom de la Catégorie *</label>
                <input
                  type="text"
                  required
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Code Catégorie</label>
                <input
                  type="text"
                  value={editCatCode}
                  onChange={(e) => setEditCatCode(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md"
                >
                  Enregistrer Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE CATEGORY MODAL */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400 border-b border-slate-800 pb-3">
              <div className="p-2 bg-rose-500/20 rounded-xl">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Supprimer la Catégorie</h3>
                <p className="text-xs text-slate-400">Action irréversible</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <p>
                Êtes-vous sûr de vouloir supprimer la catégorie{' '}
                <strong className="text-white font-bold">"{categoryToDelete.name}"</strong> ?
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteCategory(categoryToDelete.id);
                  setCategoryToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-md"
              >
                Oui, Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT BRAND MODAL */}
      {editingBrand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Modifier la Marque</h3>
              <button
                onClick={() => setEditingBrand(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editBrandName.trim()) {
                  updateBrand({
                    ...editingBrand,
                    name: editBrandName.trim(),
                    description: editBrandDesc.trim() || undefined,
                  });
                  setEditingBrand(null);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nom de la Marque *</label>
                <input
                  type="text"
                  required
                  value={editBrandName}
                  onChange={(e) => setEditBrandName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description / Origine</label>
                <input
                  type="text"
                  value={editBrandDesc}
                  onChange={(e) => setEditBrandDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBrand(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md"
                >
                  Enregistrer Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE BRAND MODAL */}
      {brandToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400 border-b border-slate-800 pb-3">
              <div className="p-2 bg-rose-500/20 rounded-xl">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Supprimer la Marque</h3>
                <p className="text-xs text-slate-400">Action irréversible</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <p>
                Êtes-vous sûr de vouloir supprimer la marque{' '}
                <strong className="text-white font-bold">"{brandToDelete.name}"</strong> ?
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setBrandToDelete(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteBrand(brandToDelete.id);
                  setBrandToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-md"
              >
                Oui, Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT UNIT MODAL */}
      {editingUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Modifier l'Unité de Mesure</h3>
              <button
                onClick={() => setEditingUnit(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editUnitName.trim() && editUnitShort.trim()) {
                  updateUnit({
                    ...editingUnit,
                    name: editUnitName.trim(),
                    shortName: editUnitShort.trim(),
                  });
                  setEditingUnit(null);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nom de l'Unité *</label>
                <input
                  type="text"
                  required
                  value={editUnitName}
                  onChange={(e) => setEditUnitName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Abréviation / Symbole *</label>
                <input
                  type="text"
                  required
                  value={editUnitShort}
                  onChange={(e) => setEditUnitShort(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUnit(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md"
                >
                  Enregistrer Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE UNIT MODAL */}
      {unitToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400 border-b border-slate-800 pb-3">
              <div className="p-2 bg-rose-500/20 rounded-xl">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Supprimer l'Unité</h3>
                <p className="text-xs text-slate-400">Action irréversible</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <p>
                Êtes-vous sûr de vouloir supprimer l'unité{' '}
                <strong className="text-white font-bold">"{unitToDelete.name}"</strong> (
                <span className="font-mono text-blue-300">{unitToDelete.shortName}</span>) ?
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setUnitToDelete(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteUnit(unitToDelete.id);
                  setUnitToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-md"
              >
                Oui, Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT VARIATION TEMPLATE MODAL */}
      {editingVariationTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-blue-400" />
                <span>Modifier le Modèle de Variation</span>
              </h3>
              <button
                onClick={() => setEditingVariationTemplate(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editVarTplName.trim() && editVarTplValues.trim()) {
                  updateVariationTemplate({
                    ...editingVariationTemplate,
                    name: editVarTplName.trim(),
                    values: editVarTplValues
                      .split(',')
                      .map((v) => v.trim())
                      .filter((v) => v.length > 0),
                  });
                  setEditingVariationTemplate(null);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nom du Modèle *
                </label>
                <input
                  type="text"
                  required
                  value={editVarTplName}
                  onChange={(e) => setEditVarTplName(e.target.value)}
                  placeholder="ex: Tailles & Pointures"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 focus:border-blue-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Valeurs (séparées par des virgules) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={editVarTplValues}
                  onChange={(e) => setEditVarTplValues(e.target.value)}
                  placeholder="ex: S, M, L, XL, XXL"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 focus:border-blue-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Séparez chaque valeur ou déclinaison par une virgule (ex: Rouge, Vert, Bleu ou 38, 39, 40, 41).
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingVariationTemplate(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-950"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE VARIATION TEMPLATE MODAL */}
      {variationTemplateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400 border-b border-slate-800 pb-3">
              <div className="p-2 bg-rose-500/20 rounded-xl">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Supprimer le Modèle de Variation</h3>
                <p className="text-xs text-slate-400">Action irréversible</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <p>
                Êtes-vous sûr de vouloir supprimer le modèle de variation{' '}
                <strong className="text-white font-bold">"{variationTemplateToDelete.name}"</strong> ?
              </p>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400 mb-1">Valeurs configurées :</div>
                <div className="flex flex-wrap gap-1">
                  {variationTemplateToDelete.values.map((v, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-800 text-blue-300 rounded text-[10px] border border-slate-700">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-amber-400">
                ⚠️ Les produits existants ayant déjà généré leurs déclinaisons avec ce modèle conserveront leurs variations.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setVariationTemplateToDelete(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteVariationTemplate(variationTemplateToDelete.id);
                  setVariationTemplateToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-md shadow-rose-950"
              >
                Oui, Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT IMPORT MODAL (CSV & XLS/XLSX) */}
      <ProductImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />

      {/* PRODUCT EXPORT MODAL (CSV & XLS/XLSX) */}
      <ProductExportModal
        isOpen={showExportModal}
        onClose={() => {
          setShowExportModal(false);
          setExportProductIds(undefined);
        }}
        initialCategoryId={selectedCategory}
        initialSubCategoryId={selectedSubCategory}
        initialLocationId={selectedLocationFilter}
        initialStockFilter={stockFilterMode}
        initialFormat={exportModalFormat}
        selectedProductIds={exportProductIds}
      />

      {/* QUICK PRICE MODIFIER MODAL */}
      {quickPriceProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">Modifier le Prix de Vente</h3>
                  <p className="text-xs text-slate-400">Ajustement direct du tarif</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickPriceProduct(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Summary Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center space-x-3">
              {quickPriceProduct.image ? (
                <img
                  src={quickPriceProduct.image}
                  alt={quickPriceProduct.name}
                  className="w-12 h-12 rounded-lg object-cover border border-slate-700 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                  <Package className="w-6 h-6 text-slate-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm text-white truncate">{quickPriceProduct.name}</h4>
                <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                  <span className="font-mono">SKU: {quickPriceProduct.sku}</span>
                  <span>•</span>
                  <span>Achat: {quickPriceProduct.purchasePrice.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveQuickPrice} className="space-y-4">
              {/* Quick Pricing Controls */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Nouveau Prix de Vente ({currentBusiness.currencySymbol}) *</span>
                    <span className="text-[10px] font-normal text-slate-400">TTC</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={quickSellingPrice}
                      onChange={(e) => handleQuickSellingChange(Number(e.target.value))}
                      className="w-full bg-slate-950 border-2 border-emerald-500/70 focus:border-emerald-400 text-emerald-300 rounded-xl p-3 text-lg font-black tracking-wide pl-4 pr-20 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
                      placeholder="0"
                      autoFocus
                    />
                    <div className="absolute right-3 top-3.5 text-xs font-bold text-emerald-400/70 pointer-events-none">
                      {currentBusiness.currencySymbol}
                    </div>
                  </div>
                </div>

                {/* Quick Presets for Adjusting Price */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Ajustements Rapides
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '+500', add: 500 },
                      { label: '+1 000', add: 1000 },
                      { label: '+5 000', add: 5000 },
                      { label: '+10%', factor: 1.10 },
                      { label: '+20%', factor: 1.20 },
                      { label: '+30%', factor: 1.30 },
                    ].map((preset, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => {
                          let nextPrice = quickSellingPrice;
                          if (preset.add) nextPrice = quickSellingPrice + preset.add;
                          if (preset.factor) nextPrice = Math.round(quickSellingPrice * preset.factor);
                          handleQuickSellingChange(nextPrice);
                        }}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold border border-slate-700 transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const rounded = Math.ceil(quickSellingPrice / 500) * 500;
                        handleQuickSellingChange(rounded);
                      }}
                      className="px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 rounded-lg text-xs font-bold border border-emerald-800 transition-colors"
                    >
                      Arrondir à 500
                    </button>
                  </div>
                </div>

                {/* Financial Indicators Grid */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Prix Achat</span>
                    <span className="font-bold text-slate-200">
                      {quickPurchasePrice.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Marge %</span>
                    <span className={`font-black ${quickProfitMargin >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {quickProfitMargin > 0 ? `+${quickProfitMargin}%` : `${quickProfitMargin}%`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Bénéfice Unitaire</span>
                    <span className="font-bold text-emerald-400">
                      {Math.round((quickSellingPrice / (1 + quickTaxRate / 100)) - quickPurchasePrice).toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuickPriceProduct(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-950 flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer le Nouveau Prix</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ALERT THRESHOLD MODAL */}
      {quickAlertProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-amber-500/40 text-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-100">
                    Seuil d'Alerte Stock Bas
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Définissez le niveau critique déclencheur de notification
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickAlertProduct(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickAlertThreshold} className="p-5 space-y-4">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                  Produit
                </span>
                <div className="text-sm font-bold text-white mt-0.5">
                  {quickAlertProduct.name}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  SKU: {quickAlertProduct.sku}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Niveau Critique de Stock (Unités) *</span>
                  <span className="text-[10px] font-normal text-slate-400">
                    Seuil déclencheur
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={quickAlertThreshold}
                    onChange={(e) => setQuickAlertThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 border-2 border-amber-500/70 focus:border-amber-400 text-amber-300 rounded-xl p-3 text-lg font-black tracking-wide pl-4 pr-16 focus:outline-none focus:ring-4 focus:ring-amber-500/20"
                    autoFocus
                  />
                  <div className="absolute right-3 top-3.5 text-xs font-bold text-amber-400/70 pointer-events-none">
                    unités
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Dès que le stock en magasin est inférieur ou égal à ce niveau, une notification critique s'affichera dans le centre d'alertes (cloche de notification).
                </p>
              </div>

              {/* Quick Presets */}
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Préréglages Rapides
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 5, 10, 15, 20, 50].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setQuickAlertThreshold(val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                        quickAlertThreshold === val
                          ? 'bg-amber-600 text-white border-amber-500 shadow-xs'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                    >
                      {val} u
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuickAlertProduct(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-950 flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer le Seuil</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRICE TOAST NOTIFICATION */}
      {priceToast && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex items-center justify-between sm:justify-start space-x-3 bg-emerald-950 border border-emerald-500 text-white px-4 py-3 rounded-xl shadow-2xl">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-1.5 bg-emerald-500 rounded-lg text-slate-950 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-emerald-200">Prix mis à jour</div>
              <div className="text-[11px] text-slate-300 truncate">{priceToast}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPriceToast(null)}
            className="text-emerald-400 hover:text-white ml-2 p-1 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-rose-500/40 text-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30 shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-slate-100 truncate">
                    Suppression Groupée de Produits
                  </h3>
                  <p className="text-xs text-rose-400 font-semibold">
                    {selectedProductIds.length} article{selectedProductIds.length > 1 ? 's' : ''} sélectionné{selectedProductIds.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="text-slate-400 hover:text-white p-1.5 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <div className="space-y-1">
                  <p className="font-bold text-rose-200">Attention : Action irréversible</p>
                  <p className="text-slate-300 leading-relaxed">
                    Êtes-vous sûr de vouloir supprimer définitivement ces <strong className="text-white font-bold">{selectedProductIds.length} produits</strong> ? Ils seront retirés du catalogue, des magasins et des notifications de stock critique.
                  </p>
                </div>
              </div>

              {/* Items preview list */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Articles qui seront supprimés ({selectedProductIds.length})
                </label>
                <div className="max-h-52 overflow-y-auto divide-y divide-slate-800 bg-slate-950 rounded-xl border border-slate-800 p-1.5 space-y-1">
                  {selectedProductsList.map((p) => {
                    const stock = getProductStockForCatalog(p, 'all');
                    const cat = state.categories.find((c) => c.id === p.categoryId);
                    return (
                      <div
                        key={p.id}
                        className="p-2 flex items-center justify-between text-xs hover:bg-slate-900 rounded-lg transition-colors"
                      >
                        <div className="flex items-center space-x-2.5 overflow-hidden pr-2">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-7 h-7 rounded object-cover border border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded bg-slate-800 flex items-center justify-center shrink-0">
                              <Package className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                          )}
                          <div className="truncate">
                            <span className="font-bold text-slate-200 block truncate">
                              {p.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              SKU: {p.sku} {cat ? `• ${cat.name}` : ''}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                            Stock: {stock} u
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-800 bg-slate-950/70">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-4 py-2 min-h-[40px] bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="px-5 py-2 min-h-[40px] bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-950 flex items-center space-x-2 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirmer la suppression ({selectedProductIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK TOAST NOTIFICATION */}
      {bulkActionToast && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex items-center justify-between sm:justify-start space-x-3 bg-rose-950 border border-rose-500 text-white px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-2">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-1.5 bg-rose-500 rounded-lg text-slate-950 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-rose-200">Suppression groupée effectuée</div>
              <div className="text-[11px] text-slate-300 truncate">{bulkActionToast}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBulkActionToast(null)}
            className="text-rose-400 hover:text-white ml-2 p-1 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
