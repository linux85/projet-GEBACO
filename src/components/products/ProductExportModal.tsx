import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  Package,
  Layers,
  Building2,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  DollarSign,
  TrendingUp,
  Tag,
  Check,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import {
  exportProductsStockToExcel,
  exportProductsStockToCSV,
  buildProductStockExportRows,
  getProductStockTotal,
} from '../../lib/productStockExport';

interface ProductExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStockFilter?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  initialLocationId?: string;
  initialCategoryId?: string;
  initialSubCategoryId?: string;
  initialBrandId?: string;
  initialFormat?: 'xlsx' | 'csv';
  selectedProductIds?: string[];
}

export const ProductExportModal: React.FC<ProductExportModalProps> = ({
  isOpen,
  onClose,
  initialStockFilter = 'all',
  initialLocationId,
  initialCategoryId,
  initialSubCategoryId,
  initialBrandId,
  initialFormat = 'csv',
  selectedProductIds,
}) => {
  const { state, currentBusiness, currentLocation } = useERP();

  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>(initialFormat || 'csv');
  const [csvDelimiter, setCsvDelimiter] = useState<';' | ','>(';');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>(
    initialStockFilter
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    initialLocationId || (state.currentLocationId === 'all' ? 'all' : state.currentLocationId)
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(initialCategoryId || 'all');
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string>(initialSubCategoryId || 'all');
  const [selectedBrandId, setSelectedBrandId] = useState<string>(initialBrandId || 'all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [includeVariations, setIncludeVariations] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);
  const [exportOnlySelected, setExportOnlySelected] = useState<boolean>(
    Boolean(selectedProductIds && selectedProductIds.length > 0)
  );

  useEffect(() => {
    if (isOpen) {
      if (initialFormat) setExportFormat(initialFormat);
      if (initialCategoryId) setSelectedCategoryId(initialCategoryId);
      if (initialSubCategoryId) setSelectedSubCategoryId(initialSubCategoryId);
      if (initialBrandId) setSelectedBrandId(initialBrandId);
      if (initialStockFilter) setStockFilter(initialStockFilter);
      if (selectedProductIds && selectedProductIds.length > 0) {
        setExportOnlySelected(true);
      } else {
        setExportOnlySelected(false);
      }
    }
  }, [isOpen, initialFormat, initialCategoryId, initialSubCategoryId, initialBrandId, initialStockFilter, selectedProductIds]);

  // Business products
  const businessProducts = useMemo(() => {
    return state.products.filter((p) => p.businessId === currentBusiness.id);
  }, [state.products, currentBusiness.id]);

  const activeProductIds = useMemo(() => {
    if (exportOnlySelected && selectedProductIds && selectedProductIds.length > 0) {
      return selectedProductIds;
    }
    return undefined;
  }, [exportOnlySelected, selectedProductIds]);

  // Preview rows generated based on current modal filters
  const previewRows = useMemo(() => {
    return buildProductStockExportRows(
      businessProducts,
      state.categories,
      state.brands,
      state.units,
      state.locations,
      {
        locationId: selectedLocationId,
        categoryId: selectedCategoryId,
        subCategoryId: selectedSubCategoryId,
        brandId: selectedBrandId,
        stockStatusFilter: stockFilter,
        searchQuery,
        includeVariations,
        currencySymbol: currentBusiness.currencySymbol,
        businessName: currentBusiness.name,
        delimiter: csvDelimiter,
        productIds: activeProductIds,
      },
      state.subCategories
    );
  }, [
    businessProducts,
    state.categories,
    state.brands,
    state.units,
    state.locations,
    state.subCategories,
    selectedLocationId,
    selectedCategoryId,
    selectedSubCategoryId,
    selectedBrandId,
    stockFilter,
    searchQuery,
    includeVariations,
    currentBusiness,
    csvDelimiter,
    activeProductIds,
  ]);

  // Summary Metrics
  const totalItemsCount = previewRows.length;
  const totalStockUnits = useMemo(() => {
    return previewRows.reduce((sum, r) => sum + r.stockQuantity, 0);
  }, [previewRows]);

  const totalPurchaseValue = useMemo(() => {
    return previewRows.reduce((sum, r) => sum + r.stockPurchaseValue, 0);
  }, [previewRows]);

  const totalSellingValue = useMemo(() => {
    return previewRows.reduce((sum, r) => sum + r.stockSellingValue, 0);
  }, [previewRows]);

  const totalPotentialMargin = totalSellingValue - totalPurchaseValue;

  const handleExecuteExport = (formatToUse?: 'xlsx' | 'csv') => {
    const finalFormat = formatToUse || exportFormat;
    setIsExporting(true);

    try {
      const options = {
        format: finalFormat,
        locationId: selectedLocationId,
        categoryId: selectedCategoryId,
        subCategoryId: selectedSubCategoryId,
        brandId: selectedBrandId,
        stockStatusFilter: stockFilter,
        searchQuery,
        includeVariations,
        currencySymbol: currentBusiness.currencySymbol,
        businessName: currentBusiness.name,
        delimiter: csvDelimiter,
        productIds: activeProductIds,
      };

      if (finalFormat === 'xlsx') {
        exportProductsStockToExcel(
          businessProducts,
          state.categories,
          state.brands,
          state.units,
          state.locations,
          options,
          state.subCategories
        );
      } else {
        exportProductsStockToCSV(
          businessProducts,
          state.categories,
          state.brands,
          state.units,
          state.locations,
          options,
          state.subCategories
        );
      }

      setExportSuccessMessage(
        `Fichier ${finalFormat.toUpperCase()} généré avec succès (${totalItemsCount} articles exportés)`
      );

      setTimeout(() => {
        setExportSuccessMessage(null);
      }, 4000);
    } catch (err) {
      console.error('Error during product stock export:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-600/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                Exporter les Produits & Stocks
              </h2>
              <p className="text-xs text-slate-400">
                Générez des fichiers CSV ou Excel (.xlsx) avec valorisation d'inventaire, marges et état des stocks.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NOTIFICATION TOAST */}
        {exportSuccessMessage && (
          <div className="bg-emerald-600/90 text-white px-6 py-3 border-b border-emerald-500/30 flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>{exportSuccessMessage}</span>
            </div>
            <button
              onClick={() => setExportSuccessMessage(null)}
              className="text-emerald-100 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* MODAL BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 text-xs">
          {/* SELECTION CALLOUT IF APPLICABLE */}
          {selectedProductIds && selectedProductIds.length > 0 && (
            <div className="bg-blue-950/60 border border-blue-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-white text-xs">
                    {selectedProductIds.length} produit{selectedProductIds.length > 1 ? 's' : ''} sélectionné{selectedProductIds.length > 1 ? 's' : ''} dans le catalogue
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Choisissez d'exporter uniquement ces articles sélectionnés ou l'ensemble du catalogue.
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setExportOnlySelected(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    exportOnlySelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  Sélection ({selectedProductIds.length})
                </button>
                <button
                  type="button"
                  onClick={() => setExportOnlySelected(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    !exportOnlySelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  Tout le catalogue
                </button>
              </div>
            </div>
          )}

          {/* FORMAT SELECTOR CARDS */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              1. Format de Téléchargement
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setExportFormat('csv')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start space-x-3.5 ${
                  exportFormat === 'csv'
                    ? 'bg-blue-950/40 border-blue-500 text-white shadow-lg shadow-blue-950/50'
                    : 'bg-slate-800/60 border-slate-700 hover:border-slate-600 text-slate-300'
                }`}
              >
                <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30 mt-0.5">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">Fichier CSV Délimité (.csv)</span>
                    {exportFormat === 'csv' && (
                      <span className="bg-blue-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                        Sélectionné
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Format standard léger, compatible Excel, tableurs et systèmes comptables externes (UTF-8 avec BOM).
                  </p>
                </div>
              </div>

              <div
                onClick={() => setExportFormat('xlsx')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start space-x-3.5 ${
                  exportFormat === 'xlsx'
                    ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                    : 'bg-slate-800/60 border-slate-700 hover:border-slate-600 text-slate-300'
                }`}
              >
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 mt-0.5">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">Classeur Excel (.xlsx / .xls)</span>
                    {exportFormat === 'xlsx' && (
                      <span className="bg-emerald-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full">
                        Sélectionné
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Multi-feuilles avec tableau formaté, totaux, calculs et feuille récapitulative des KPIs.
                  </p>
                </div>
              </div>
            </div>

            {/* CSV OPTIONS IF CSV SELECTED */}
            {exportFormat === 'csv' && (
              <div className="bg-blue-950/30 border border-blue-500/30 rounded-2xl p-3.5 space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 text-xs flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span>Options du Format CSV</span>
                  </span>
                  <span className="text-[10px] text-blue-300 bg-blue-900/60 px-2 py-0.5 rounded-md font-mono">
                    UTF-8 (avec BOM Excel)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <label className="text-[11px] text-slate-400">Séparateur de colonnes :</label>
                  <div className="inline-flex rounded-xl bg-slate-800/80 p-0.5 border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setCsvDelimiter(';')}
                      className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all ${
                        csvDelimiter === ';'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Point-virgule (;) — Recommandé Excel FR
                    </button>
                    <button
                      type="button"
                      onClick={() => setCsvDelimiter(',')}
                      className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all ${
                        csvDelimiter === ','
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Virgule (,) — Standard RFC
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STOCK STATUS FILTER */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              2. Périmètre de Stock à Exporter
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setStockFilter('in_stock')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  stockFilter === 'in_stock'
                    ? 'bg-emerald-600/30 border-emerald-500 text-white font-bold'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>En Stock Uniquement</span>
                  {stockFilter === 'in_stock' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <div className="text-[10px] text-emerald-400 mt-0.5">Stock &gt; 0 unités</div>
              </button>

              <button
                type="button"
                onClick={() => setStockFilter('all')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  stockFilter === 'all'
                    ? 'bg-blue-600/30 border-blue-500 text-white font-bold'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>Tous les Produits</span>
                  {stockFilter === 'all' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Catalogue complet</div>
              </button>

              <button
                type="button"
                onClick={() => setStockFilter('low_stock')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  stockFilter === 'low_stock'
                    ? 'bg-amber-600/30 border-amber-500 text-white font-bold'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>Stock Faible</span>
                  {stockFilter === 'low_stock' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <div className="text-[10px] text-amber-400 mt-0.5">Sous le seuil d'alerte</div>
              </button>

              <button
                type="button"
                onClick={() => setStockFilter('out_of_stock')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  stockFilter === 'out_of_stock'
                    ? 'bg-rose-600/30 border-rose-500 text-white font-bold'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>En Rupture</span>
                  {stockFilter === 'out_of_stock' && <Check className="w-3.5 h-3.5 text-rose-400" />}
                </div>
                <div className="text-[10px] text-rose-400 mt-0.5">Stock = 0 unités</div>
              </button>
            </div>
          </div>

          {/* SECONDARY FILTERS: Location, Category, SubCategory, Brand, Search */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              3. Filtres Complémentaires
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Location */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Emplacement / Magasin</label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="all">Tous les magasins (Cumul)</option>
                  {state.locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.isDefault ? '(Principal)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Catégorie</label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value);
                    setSelectedSubCategoryId('all');
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="all">Toutes les catégories ({state.categories.length})</option>
                  {state.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* SubCategory */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Sous-Catégorie</label>
                <select
                  value={selectedSubCategoryId}
                  onChange={(e) => setSelectedSubCategoryId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="all">Toutes les sous-catégories</option>
                  {(state.subCategories || [])
                    .filter((s) => {
                      if (s.businessId && s.businessId !== currentBusiness.id) return false;
                      if (selectedCategoryId !== 'all' && s.categoryId !== selectedCategoryId) return false;
                      return true;
                    })
                    .map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Brand */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Marque</label>
                <select
                  value={selectedBrandId}
                  onChange={(e) => setSelectedBrandId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="all">Toutes les marques ({state.brands.length})</option>
                  {state.brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search Query & Variations option */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="sm:col-span-2">
                <label className="text-[11px] text-slate-400 block mb-1">Recherche par Nom, SKU ou Code-Barres</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ex: Riz, SAV-01, 618..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center space-x-2.5 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={includeVariations}
                    onChange={(e) => setIncludeVariations(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0 w-4 h-4"
                  />
                  <span className="text-[11px]">Détailler les déclinaisons (variantes)</span>
                </label>
              </div>
            </div>
          </div>

          {/* LIVE SUMMARY / METRICS BANNER */}
          <div className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center space-x-2">
                <Package className="w-4 h-4 text-emerald-400" />
                <span>Aperçu des données à exporter ({totalItemsCount} lignes)</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                Devise: <strong className="text-white">{currentBusiness.currencySymbol}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl">
                <div className="text-[10px] text-slate-400 font-medium">Articles & Variantes</div>
                <div className="text-base font-black text-white mt-0.5">{totalItemsCount}</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl">
                <div className="text-[10px] text-slate-400 font-medium">Total Unités en Stock</div>
                <div className="text-base font-black text-emerald-400 mt-0.5">
                  {totalStockUnits.toLocaleString()}
                </div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl">
                <div className="text-[10px] text-slate-400 font-medium">Valeur d'Achat HT</div>
                <div className="text-base font-black text-blue-400 mt-0.5">
                  {totalPurchaseValue.toLocaleString()} {currentBusiness.currencySymbol}
                </div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl">
                <div className="text-[10px] text-slate-400 font-medium">Valeur de Vente TTC</div>
                <div className="text-base font-black text-purple-400 mt-0.5">
                  {totalSellingValue.toLocaleString()} {currentBusiness.currencySymbol}
                </div>
              </div>
            </div>

            {/* Quick table preview of first 3 items */}
            {previewRows.length > 0 && (
              <div className="border border-slate-800 rounded-xl overflow-hidden mt-2">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-1.5 px-3">SKU</th>
                      <th className="py-1.5 px-3">Nom du Produit</th>
                      <th className="py-1.5 px-3 text-right">Stock</th>
                      <th className="py-1.5 px-3 text-right">Prix Achat</th>
                      <th className="py-1.5 px-3 text-right">Prix Vente</th>
                      <th className="py-1.5 px-3 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 text-slate-300">
                    {previewRows.slice(0, 3).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-900/50">
                        <td className="py-1.5 px-3 font-mono text-slate-400">{r.sku}</td>
                        <td className="py-1.5 px-3 font-medium text-white">
                          {r.name} {r.variationName !== '-' ? `(${r.variationName})` : ''}
                        </td>
                        <td className="py-1.5 px-3 text-right font-bold text-emerald-400">
                          {r.stockQuantity} {r.unit}
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          {r.purchasePrice.toLocaleString()} {currentBusiness.currencySymbol}
                        </td>
                        <td className="py-1.5 px-3 text-right font-semibold text-white">
                          {r.sellingPrice.toLocaleString()} {currentBusiness.currencySymbol}
                        </td>
                        <td className="py-1.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              r.stockStatus === 'En stock'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : r.stockStatus === 'Stock faible'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {r.stockStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewRows.length > 3 && (
                  <div className="bg-slate-900/60 py-1 px-3 text-center text-[10px] text-slate-400 border-t border-slate-800">
                    + {previewRows.length - 3} autres articles prêts à être exportés dans le fichier
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 text-center sm:text-left">
            Fichier généré : <strong className="text-white">export_stock_produits_{exportFormat === 'xlsx' ? 'excel.xlsx' : 'csv.csv'}</strong>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-1/2 sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Fermer
            </button>

            {/* Quick CSV Export Button */}
            <button
              disabled={isExporting || totalItemsCount === 0}
              onClick={() => handleExecuteExport('csv')}
              className="w-1/2 sm:w-auto px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              <span>Exporter CSV</span>
            </button>

            {/* Quick Excel Export Button */}
            <button
              disabled={isExporting || totalItemsCount === 0}
              onClick={() => handleExecuteExport('xlsx')}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-950 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
