import * as XLSX from 'xlsx';
import { Product, Category, SubCategory, Brand, Unit, BusinessLocation } from '../types';

export interface ProductStockExportRow {
  id: string;
  sku: string;
  name: string;
  variationName: string;
  type: string;
  barcode: string;
  category: string;
  subCategory: string;
  brand: string;
  unit: string;
  purchasePrice: number;
  profitMargin: number;
  sellingPrice: number;
  taxRate: number;
  alertQuantity: number;
  stockQuantity: number;
  stockPurchaseValue: number;
  stockSellingValue: number;
  potentialProfitValue: number;
  stockStatus: 'En stock' | 'Stock faible' | 'Rupture de stock';
  locationName: string;
  description: string;
}

export interface ProductStockExportOptions {
  filename?: string;
  format?: 'xlsx' | 'csv' | 'xls';
  locationId?: string; // 'all' or specific location ID
  categoryId?: string; // 'all' or specific category ID
  subCategoryId?: string; // 'all' or specific subcategory ID
  brandId?: string; // 'all' or specific brand ID
  stockStatusFilter?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  searchQuery?: string;
  includeVariations?: boolean;
  currencySymbol?: string;
  businessName?: string;
  productIds?: string[]; // Filter by specific product IDs (e.g. from bulk selection)
  delimiter?: ';' | ','; // CSV delimiter (; default for Excel FR, , for standard)
}

// Helper to sum stock across locations or for a specific location
export function getStockQuantity(
  locationStock?: Record<string, number>,
  locId: string = 'all'
): number {
  if (!locationStock) return 0;
  if (locId === 'all') {
    return Object.values(locationStock).reduce((sum, qty) => sum + (Number(qty) || 0), 0);
  }
  return Number(locationStock[locId]) || 0;
}

export function getProductStockTotal(p: Product, locId: string = 'all'): number {
  if (p.type === 'variable' && p.variations && p.variations.length > 0) {
    return p.variations.reduce((sum, v) => sum + getStockQuantity(v.locationStock, locId), 0);
  }
  return getStockQuantity(p.locationStock, locId);
}

/**
 * Filter and transform products into clean tabular export rows
 */
export function buildProductStockExportRows(
  products: Product[],
  categories: Category[],
  brands: Brand[],
  units: Unit[],
  locations: BusinessLocation[],
  options: ProductStockExportOptions = {},
  subCategories: SubCategory[] = []
): ProductStockExportRow[] {
  const {
    locationId = 'all',
    categoryId = 'all',
    subCategoryId = 'all',
    brandId = 'all',
    stockStatusFilter = 'all',
    searchQuery = '',
    includeVariations = true,
    productIds,
  } = options;

  const locName =
    locationId === 'all'
      ? 'Tous les magasins'
      : locations.find((l) => l.id === locationId)?.name || 'Magasin';

  const rows: ProductStockExportRow[] = [];

  // Filter products
  const filtered = products.filter((p) => {
    if (productIds && productIds.length > 0 && !productIds.includes(p.id)) return false;
    if (categoryId !== 'all' && p.categoryId !== categoryId) return false;
    if (subCategoryId && subCategoryId !== 'all' && p.subCategoryId !== subCategoryId) return false;
    if (brandId !== 'all' && p.brandId !== brandId) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchSku = p.sku.toLowerCase().includes(q);
      const matchBarcode = p.barcode ? p.barcode.toLowerCase().includes(q) : false;
      if (!matchName && !matchSku && !matchBarcode) return false;
    }

    const currentStock = getProductStockTotal(p, locationId);
    if (stockStatusFilter === 'in_stock' && currentStock <= 0) return false;
    if (stockStatusFilter === 'low_stock' && (currentStock <= 0 || currentStock > p.alertQuantity)) return false;
    if (stockStatusFilter === 'out_of_stock' && currentStock > 0) return false;

    return true;
  });

  filtered.forEach((p) => {
    const categoryName = categories.find((c) => c.id === p.categoryId)?.name || 'Général';
    const subCategoryName = subCategories.find((s) => s.id === p.subCategoryId)?.name || '-';
    const brandName = brands.find((b) => b.id === p.brandId)?.name || '-';
    const unitName = units.find((u) => u.id === p.unitId)?.shortName || 'pcs';

    if (p.type === 'variable' && p.variations && p.variations.length > 0 && includeVariations) {
      p.variations.forEach((v) => {
        const stockQty = getStockQuantity(v.locationStock, locationId);

        // Apply variation-level stock filter if needed
        if (stockStatusFilter === 'in_stock' && stockQty <= 0) return;
        if (stockStatusFilter === 'low_stock' && (stockQty <= 0 || stockQty > p.alertQuantity)) return;
        if (stockStatusFilter === 'out_of_stock' && stockQty > 0) return;

        const purchasePrice = v.purchasePrice ?? p.purchasePrice;
        const profitMargin = v.profitMargin ?? p.profitMargin;
        const sellingPrice = v.sellingPrice ?? p.sellingPrice;
        const purchaseVal = stockQty * purchasePrice;
        const sellingVal = stockQty * sellingPrice;
        const profitVal = sellingVal - purchaseVal;

        let status: 'En stock' | 'Stock faible' | 'Rupture de stock' = 'En stock';
        if (stockQty <= 0) status = 'Rupture de stock';
        else if (stockQty <= p.alertQuantity) status = 'Stock faible';

        rows.push({
          id: p.id,
          sku: `${p.sku}${v.skuSuffix || ''}`,
          name: p.name,
          variationName: v.name,
          type: 'Variable',
          barcode: p.barcode || '',
          category: categoryName,
          subCategory: subCategoryName,
          brand: brandName,
          unit: unitName,
          purchasePrice,
          profitMargin,
          sellingPrice,
          taxRate: p.taxRate,
          alertQuantity: p.alertQuantity,
          stockQuantity: stockQty,
          stockPurchaseValue: purchaseVal,
          stockSellingValue: sellingVal,
          potentialProfitValue: profitVal,
          stockStatus: status,
          locationName: locName,
          description: (p as any).description || '',
        });
      });
    } else {
      const stockQty = getProductStockTotal(p, locationId);
      const purchaseVal = stockQty * p.purchasePrice;
      const sellingVal = stockQty * p.sellingPrice;
      const profitVal = sellingVal - purchaseVal;

      let status: 'En stock' | 'Stock faible' | 'Rupture de stock' = 'En stock';
      if (stockQty <= 0) status = 'Rupture de stock';
      else if (stockQty <= p.alertQuantity) status = 'Stock faible';

      rows.push({
        id: p.id,
        sku: p.sku,
        name: p.name,
        variationName: '-',
        type: p.type === 'variable' ? 'Variable (Global)' : 'Simple',
        barcode: p.barcode || '',
        category: categoryName,
        subCategory: subCategoryName,
        brand: brandName,
        unit: unitName,
        purchasePrice: p.purchasePrice,
        profitMargin: p.profitMargin,
        sellingPrice: p.sellingPrice,
        taxRate: p.taxRate,
        alertQuantity: p.alertQuantity,
        stockQuantity: stockQty,
        stockPurchaseValue: purchaseVal,
        stockSellingValue: sellingVal,
        potentialProfitValue: profitVal,
        stockStatus: status,
        locationName: locName,
        description: (p as any).description || '',
      });
    }
  });

  return rows;
}

/**
 * Export products & stock to Excel (.xlsx) with clean formatting & summary sheet
 */
export function exportProductsStockToExcel(
  products: Product[],
  categories: Category[],
  brands: Brand[],
  units: Unit[],
  locations: BusinessLocation[],
  options: ProductStockExportOptions = {},
  subCategories: SubCategory[] = []
): void {
  const currency = options.currencySymbol || 'FCFA';
  const businessName = options.businessName || 'Entreprise';
  const todayStr = new Date().toISOString().split('T')[0];
  const locationLabel =
    options.locationId && options.locationId !== 'all'
      ? (locations.find((l) => l.id === options.locationId)?.name || 'Magasin').replace(/\s+/g, '_')
      : 'Tous_Magasins';

  const defaultFilename = options.productIds && options.productIds.length > 0
    ? `export_produits_selection_${options.productIds.length}_articles_${todayStr}`
    : `export_stock_produits_${locationLabel}_${todayStr}`;
  const filename = options.filename ? options.filename.replace(/\.(xlsx|xls|csv)$/i, '') : defaultFilename;

  const exportRows = buildProductStockExportRows(
    products,
    categories,
    brands,
    units,
    locations,
    options,
    subCategories
  );

  // 1. Prepare Main Data Table
  const tableData = exportRows.map((r) => ({
    'SKU / Référence': r.sku,
    'Nom du Produit': r.name,
    'Déclinaison / Variante': r.variationName,
    'Type': r.type,
    'Code-Barres': r.barcode,
    'Catégorie': r.category,
    'Sous-Catégorie': r.subCategory,
    'Marque': r.brand,
    'Unité': r.unit,
    [`Prix Achat HT (${currency})`]: r.purchasePrice,
    'Marge %': r.profitMargin,
    [`Prix Vente TTC (${currency})`]: r.sellingPrice,
    'Taux TVA %': r.taxRate,
    'Stock Actuel': r.stockQuantity,
    'Seuil Alerte': r.alertQuantity,
    [`Valeur Stock Achat (${currency})`]: r.stockPurchaseValue,
    [`Valeur Stock Vente (${currency})`]: r.stockSellingValue,
    [`Marge Brute Potentielle (${currency})`]: r.potentialProfitValue,
    'Statut Stock': r.stockStatus,
    'Emplacement / Magasin': r.locationName,
    'Description': r.description,
  }));

  const wb = XLSX.utils.book_new();

  // Create main sheet
  const wsMain = XLSX.utils.json_to_sheet(tableData);

  // Column width calculations
  wsMain['!cols'] = [
    { wch: 18 }, // SKU
    { wch: 32 }, // Nom Produit
    { wch: 20 }, // Déclinaison
    { wch: 14 }, // Type
    { wch: 16 }, // Code-barres
    { wch: 22 }, // Catégorie
    { wch: 18 }, // Marque
    { wch: 10 }, // Unité
    { wch: 18 }, // Prix Achat
    { wch: 12 }, // Marge %
    { wch: 18 }, // Prix Vente
    { wch: 12 }, // TVA %
    { wch: 14 }, // Stock Actuel
    { wch: 14 }, // Seuil Alerte
    { wch: 22 }, // Val Stock Achat
    { wch: 22 }, // Val Stock Vente
    { wch: 22 }, // Marge Potentielle
    { wch: 16 }, // Statut
    { wch: 22 }, // Emplacement
    { wch: 30 }, // Description
  ];

  XLSX.utils.book_append_sheet(wb, wsMain, 'État du Stock');

  // 2. Prepare Summary & Valuation Sheet
  const totalItems = exportRows.length;
  const totalStockUnits = exportRows.reduce((sum, r) => sum + r.stockQuantity, 0);
  const totalPurchaseVal = exportRows.reduce((sum, r) => sum + r.stockPurchaseValue, 0);
  const totalSellingVal = exportRows.reduce((sum, r) => sum + r.stockSellingValue, 0);
  const totalPotentialMargin = totalSellingVal - totalPurchaseVal;
  const inStockCount = exportRows.filter((r) => r.stockStatus === 'En stock').length;
  const lowStockCount = exportRows.filter((r) => r.stockStatus === 'Stock faible').length;
  const outOfStockCount = exportRows.filter((r) => r.stockStatus === 'Rupture de stock').length;

  const summaryData = [
    { 'PARAMÈTRE / INDICATEUR': 'Entreprise', 'VALEUR': businessName },
    { 'PARAMÈTRE / INDICATEUR': 'Date d\'exportation', 'VALEUR': new Date().toLocaleString('fr-FR') },
    { 'PARAMÈTRE / INDICATEUR': 'Emplacement sélectionné', 'VALEUR': options.locationId === 'all' ? 'Tous les magasins' : (locations.find((l) => l.id === options.locationId)?.name || 'Magasin') },
    { 'PARAMÈTRE / INDICATEUR': 'Devise', 'VALEUR': currency },
    { 'PARAMÈTRE / INDICATEUR': '----------------------------------------', 'VALEUR': '----------------------------------------' },
    { 'PARAMÈTRE / INDICATEUR': 'Nombre Total de Références', 'VALEUR': totalItems },
    { 'PARAMÈTRE / INDICATEUR': 'Volume Total Unités en Stock', 'VALEUR': totalStockUnits },
    { 'PARAMÈTRE / INDICATEUR': `Valeur Totale du Stock au Coût d'Achat (${currency})`, 'VALEUR': totalPurchaseVal },
    { 'PARAMÈTRE / INDICATEUR': `Valeur Totale du Stock au Prix de Vente (${currency})`, 'VALEUR': totalSellingVal },
    { 'PARAMÈTRE / INDICATEUR': `Marge Brute Potentielle Globale (${currency})`, 'VALEUR': totalPotentialMargin },
    { 'PARAMÈTRE / INDICATEUR': '----------------------------------------', 'VALEUR': '----------------------------------------' },
    { 'PARAMÈTRE / INDICATEUR': 'Articles en Stock Normal', 'VALEUR': inStockCount },
    { 'PARAMÈTRE / INDICATEUR': 'Articles en Stock Faible (Alerte)', 'VALEUR': lowStockCount },
    { 'PARAMÈTRE / INDICATEUR': 'Articles en Rupture de Stock', 'VALEUR': outOfStockCount },
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 45 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Synthèse & KPIs');

  // Write file
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Export products & stock to CSV (.csv) with UTF-8 BOM and delimiter
 */
export function exportProductsStockToCSV(
  products: Product[],
  categories: Category[],
  brands: Brand[],
  units: Unit[],
  locations: BusinessLocation[],
  options: ProductStockExportOptions = {},
  subCategories: SubCategory[] = []
): void {
  const currency = options.currencySymbol || 'FCFA';
  const todayStr = new Date().toISOString().split('T')[0];
  const locationLabel =
    options.locationId && options.locationId !== 'all'
      ? (locations.find((l) => l.id === options.locationId)?.name || 'Magasin').replace(/\s+/g, '_')
      : 'Tous_Magasins';

  const defaultFilename = options.productIds && options.productIds.length > 0
    ? `export_produits_selection_${options.productIds.length}_articles_${todayStr}`
    : `export_stock_produits_${locationLabel}_${todayStr}`;
  const filename = options.filename ? options.filename.replace(/\.(xlsx|xls|csv)$/i, '') : defaultFilename;

  const exportRows = buildProductStockExportRows(
    products,
    categories,
    brands,
    units,
    locations,
    options,
    subCategories
  );

  const headers = [
    'SKU / Référence',
    'Nom du Produit',
    'Déclinaison',
    'Type',
    'Code-Barres',
    'Catégorie',
    'Sous-Catégorie',
    'Marque',
    'Unité',
    `Prix Achat HT (${currency})`,
    'Marge %',
    `Prix Vente TTC (${currency})`,
    'Taux TVA %',
    'Stock Actuel',
    'Seuil Alerte',
    `Valeur Stock Achat (${currency})`,
    `Valeur Stock Vente (${currency})`,
    `Marge Potentielle (${currency})`,
    'Statut Stock',
    'Emplacement',
    'Description',
  ];

  const rows: (string | number)[][] = [headers];

  exportRows.forEach((r) => {
    rows.push([
      r.sku,
      r.name,
      r.variationName,
      r.type,
      r.barcode,
      r.category,
      r.subCategory,
      r.brand,
      r.unit,
      r.purchasePrice,
      r.profitMargin,
      r.sellingPrice,
      r.taxRate,
      r.stockQuantity,
      r.alertQuantity,
      r.stockPurchaseValue,
      r.stockSellingValue,
      r.potentialProfitValue,
      r.stockStatus,
      r.locationName,
      r.description,
    ]);
  });

  const delimiter = options.delimiter || ';';
  const formatCell = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = rows.map((row) => row.map(formatCell).join(delimiter)).join('\r\n');

  // \uFEFF is UTF-8 BOM so Excel opens accents correctly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
