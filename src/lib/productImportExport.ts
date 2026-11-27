import * as XLSX from 'xlsx';
import { Product, Category, Brand, Unit } from '../types';

export interface ImportFieldMapping {
  name: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  unit: string;
  purchasePrice: string;
  profitMargin: string;
  sellingPrice: string;
  taxRate: string;
  stockQuantity: string;
  alertQuantity: string;
  description: string;
}

export interface ParsedImportRow {
  rowIndex: number;
  raw: Record<string, any>;
  mapped: {
    name: string;
    sku: string;
    barcode: string;
    categoryName: string;
    brandName: string;
    unitShortName: string;
    purchasePrice: number;
    profitMargin: number;
    sellingPrice: number;
    taxRate: number;
    stockQuantity: number;
    alertQuantity: number;
    description: string;
  };
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isDuplicateSku: boolean;
  duplicateAction?: 'update' | 'skip' | 'unique_sku';
}

// Field aliases for smart auto-detection
const FIELD_ALIASES: Record<keyof ImportFieldMapping, string[]> = {
  name: ['nom', 'nom du produit', 'nom produit', 'libelle', 'libellé', 'designation', 'désignation', 'product', 'product name', 'article', 'description article', 'title'],
  sku: ['sku', 'code', 'code article', 'code produit', 'reference', 'référence', 'ref', 'code_article', 'item_code', 'item code'],
  barcode: ['barcode', 'code-barres', 'code barres', 'code_barre', 'code barre', 'ean', 'ean13', 'ean-13', 'upc', 'gtin'],
  category: ['categorie', 'catégorie', 'category', 'famille', 'rayon', 'sous-categorie', 'classification'],
  brand: ['marque', 'brand', 'fabricant', 'constructeur', 'fournisseur', 'maker'],
  unit: ['unite', 'unité', 'unit', 'mesure', 'uom', 'unite de mesure', 'unite_mesure', 'conditionnement'],
  purchasePrice: ['prix achat', 'prix d\'achat', 'prix d achat', 'prix_achat', 'cout', 'coût', 'cost', 'cost price', 'achat ht', 'prix achat ht', 'pa ht', 'prix revient'],
  profitMargin: ['marge', 'marge %', 'marge beneficiaire', 'marge bénéficiaire', 'profit margin', 'margin', 'taux marge', 'marge pct'],
  sellingPrice: ['prix vente', 'prix de vente', 'prix_vente', 'prix public', 'price', 'selling price', 'prix ttc', 'prix de vente ttc', 'pv ttc', 'tarif', 'pv'],
  taxRate: ['tva', 'taux tva', 'tax', 'tax rate', 'tva %', 'taxe', 'taux de tva', 'vat'],
  stockQuantity: ['stock', 'quantite', 'quantité', 'stock initial', 'qte', 'qte stock', 'qty', 'quantity', 'stock_initial', 'inventaire', 'stock dispo'],
  alertQuantity: ['alerte', 'seuil alerte', 'stock min', 'min stock', 'seuil', 'seuil réappro', 'alert_quantity', 'stock securite'],
  description: ['description', 'notes', 'remarques', 'details', 'détails', 'commentaire', 'caracteristiques'],
};

/**
 * Normalizes text for matching header column names
 */
export function normalizeHeaderKey(key: string): string {
  return key
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Guess mapping from file headers
 */
export function autoDetectMapping(headers: string[]): ImportFieldMapping {
  const mapping: ImportFieldMapping = {
    name: '',
    sku: '',
    barcode: '',
    category: '',
    brand: '',
    unit: '',
    purchasePrice: '',
    profitMargin: '',
    sellingPrice: '',
    taxRate: '',
    stockQuantity: '',
    alertQuantity: '',
    description: '',
  };

  const normalizedHeaders = headers.map((h) => ({
    original: h,
    normalized: normalizeHeaderKey(h),
  }));

  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [keyof ImportFieldMapping, string[]][]) {
    for (const { original, normalized } of normalizedHeaders) {
      if (mapping[field]) continue; // already mapped

      const isExactMatch = aliases.some((alias) => {
        const normAlias = normalizeHeaderKey(alias);
        return normalized === normAlias;
      });

      if (isExactMatch) {
        mapping[field] = original;
        break;
      }
    }

    // Partial fuzzy match if no exact match
    if (!mapping[field]) {
      for (const { original, normalized } of normalizedHeaders) {
        const isPartialMatch = aliases.some((alias) => {
          const normAlias = normalizeHeaderKey(alias);
          return normalized.includes(normAlias) || normAlias.includes(normalized);
        });

        if (isPartialMatch) {
          mapping[field] = original;
          break;
        }
      }
    }
  }

  return mapping;
}

/**
 * Parse CSV raw string with multi-delimiter and quoted text support
 */
export function parseCSVRaw(csvText: string): { headers: string[]; rows: Record<string, any>[] } {
  // Strip UTF-8 BOM if present
  let cleanText = csvText;
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1);
  }

  // Detect delimiter
  const firstLine = cleanText.split(/\r\n|\n|\r/)[0] || '';
  let delimiter = ',';
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (semicolonCount >= commaCount && semicolonCount >= tabCount && semicolonCount > 0) {
    delimiter = ';';
  } else if (tabCount > commaCount && tabCount > semicolonCount) {
    delimiter = '\t';
  }

  // Robust line/cell parsing with quotes
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      currentCell = '';
      if (currentRow.some((c) => c.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      lines.push(currentRow);
    }
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = lines[0].map((h) => h.trim());
  const headers = rawHeaders.filter((h) => h.length > 0);

  const rows: Record<string, any>[] = [];
  for (let r = 1; r < lines.length; r++) {
    const line = lines[r];
    const rowObj: Record<string, any> = {};
    for (let c = 0; c < headers.length; c++) {
      const headerName = headers[c];
      rowObj[headerName] = line[c] !== undefined ? line[c] : '';
    }
    rows.push(rowObj);
  }

  return { headers, rows };
}

/**
 * Parse Excel file (Buffer or ArrayBuffer) using XLSX
 */
export function parseExcelRaw(data: ArrayBuffer): { headers: string[]; rows: Record<string, any>[] } {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { headers: [], rows: [] };
  }

  const worksheet = workbook.Sheets[sheetName];
  const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (jsonData.length === 0) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = (jsonData[0] || []).map((h: any) => String(h || '').trim());
  const headers = rawHeaders.filter((h) => h.length > 0);

  const rows: Record<string, any>[] = [];
  for (let r = 1; r < jsonData.length; r++) {
    const line = jsonData[r] || [];
    const rowObj: Record<string, any> = {};
    let hasValue = false;
    for (let c = 0; c < headers.length; c++) {
      const headerName = headers[c];
      const val = line[c] !== undefined ? line[c] : '';
      if (val !== '' && val !== null && val !== undefined) {
        hasValue = true;
      }
      rowObj[headerName] = val;
    }
    if (hasValue) {
      rows.push(rowObj);
    }
  }

  return { headers, rows };
}

/**
 * Clean & parse number values (handles European decimals like 1 500,50 or 1500.50 or currencies like 10 000 FCFA)
 */
export function parseCleanNumber(val: any, defaultVal: number = 0): number {
  if (val === null || val === undefined || val === '') return defaultVal;
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val;

  const str = String(val)
    .replace(/[^\d.,-]/g, '') // remove currency signs, spaces
    .replace(/\s+/g, '')
    .trim();

  if (!str) return defaultVal;

  // If contains comma and dot, e.g. 1,500.50 or 1.500,50
  if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // 1.500,50 -> 1500.50
      const clean = str.replace(/\./g, '').replace(',', '.');
      const num = parseFloat(clean);
      return isNaN(num) ? defaultVal : num;
    } else {
      // 1,500.50 -> 1500.50
      const clean = str.replace(/,/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? defaultVal : num;
    }
  }

  // If only comma, replace with dot
  if (str.includes(',')) {
    const clean = str.replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? defaultVal : num;
  }

  const num = parseFloat(str);
  return isNaN(num) ? defaultVal : num;
}

/**
 * Process and validate rows using the field mapping and business existing data
 */
export function processAndValidateRows(
  rawRows: Record<string, any>[],
  mapping: ImportFieldMapping,
  existingProducts: Product[],
  defaultProfitMargin: number = 25,
  defaultTaxRate: number = 18
): ParsedImportRow[] {
  const seenSkusInFile = new Set<string>();

  return rawRows.map((raw, index) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const rawName = mapping.name ? String(raw[mapping.name] || '').trim() : '';
    let rawSku = mapping.sku ? String(raw[mapping.sku] || '').trim() : '';
    const rawBarcode = mapping.barcode ? String(raw[mapping.barcode] || '').trim() : '';
    const rawCategory = mapping.category ? String(raw[mapping.category] || '').trim() : '';
    const rawBrand = mapping.brand ? String(raw[mapping.brand] || '').trim() : '';
    const rawUnit = mapping.unit ? String(raw[mapping.unit] || '').trim() : '';
    const rawDesc = mapping.description ? String(raw[mapping.description] || '').trim() : '';

    // Numeric fields
    const purchasePrice = parseCleanNumber(mapping.purchasePrice ? raw[mapping.purchasePrice] : null, 0);
    let profitMargin = parseCleanNumber(mapping.profitMargin ? raw[mapping.profitMargin] : null, defaultProfitMargin);
    let sellingPrice = parseCleanNumber(mapping.sellingPrice ? raw[mapping.sellingPrice] : null, 0);
    const taxRate = parseCleanNumber(mapping.taxRate ? raw[mapping.taxRate] : null, defaultTaxRate);
    const stockQuantity = Math.max(0, parseCleanNumber(mapping.stockQuantity ? raw[mapping.stockQuantity] : null, 0));
    const alertQuantity = Math.max(0, parseCleanNumber(mapping.alertQuantity ? raw[mapping.alertQuantity] : null, 5));

    // Validations
    if (!rawName) {
      errors.push('Le nom du produit est obligatoire.');
    }

    if (!rawSku) {
      // Auto-generate SKU
      rawSku = `PRD-IMP-${Date.now().toString().slice(-5)}-${index + 1}`;
      warnings.push(`SKU auto-généré : ${rawSku}`);
    }

    // Check duplicate in existing system
    const isExistingInDb = existingProducts.some(
      (p) => p.sku.toLowerCase() === rawSku.toLowerCase()
    );

    // Check duplicate inside this file
    if (seenSkusInFile.has(rawSku.toLowerCase())) {
      warnings.push(`SKU en doublon dans le fichier : ${rawSku}`);
    } else {
      seenSkusInFile.add(rawSku.toLowerCase());
    }

    if (isExistingInDb) {
      warnings.push(`SKU existant déjà en base de données (${rawSku}).`);
    }

    // Price auto-calculation logic
    if (sellingPrice <= 0 && purchasePrice > 0) {
      sellingPrice = Math.round(purchasePrice * (1 + profitMargin / 100) * (1 + taxRate / 100));
      warnings.push(`Prix de vente calculé automatiquement : ${sellingPrice.toLocaleString()}`);
    } else if (purchasePrice > 0 && sellingPrice > 0 && profitMargin === defaultProfitMargin) {
      // Re-calculate margin if both prices are provided
      const preTaxSelling = sellingPrice / (1 + taxRate / 100);
      if (purchasePrice > 0) {
        profitMargin = Math.round(((preTaxSelling - purchasePrice) / purchasePrice) * 100 * 10) / 10;
      }
    }

    if (purchasePrice < 0) {
      errors.push('Le prix d\'achat ne peut pas être négatif.');
    }
    if (sellingPrice < 0) {
      errors.push('Le prix de vente ne peut pas être négatif.');
    }

    return {
      rowIndex: index + 1,
      raw,
      mapped: {
        name: rawName,
        sku: rawSku,
        barcode: rawBarcode,
        categoryName: rawCategory || 'Général',
        brandName: rawBrand || '',
        unitShortName: rawUnit || 'pcs',
        purchasePrice,
        profitMargin,
        sellingPrice,
        taxRate,
        stockQuantity,
        alertQuantity,
        description: rawDesc,
      },
      isValid: errors.length === 0,
      errors,
      warnings,
      isDuplicateSku: isExistingInDb,
    };
  });
}

/**
 * Generate Sample Excel / CSV template
 */
export function generateProductImportTemplate(format: 'xlsx' | 'csv'): void {
  const sampleData = [
    {
      'Nom Produit': 'Riz Parfumé Supérieur 5kg',
      'SKU': 'RIZ-PARF-05K',
      'Code-Barres': '6181100234512',
      'Catégorie': 'Alimentation & Épicerie',
      'Marque': 'Dinor Gold',
      'Unité': 'Sac',
      'Prix Achat HT': 4200,
      'Marge %': 25,
      'Prix Vente TTC': 6200,
      'Taux TVA %': 18,
      'Stock Initial': 150,
      'Seuil Alerte': 15,
      'Description': 'Riz blanc long grain parfumé 1er choix',
    },
    {
      'Nom Produit': 'Huile Végétale Raffinée 1L',
      'SKU': 'HUILE-VEG-01L',
      'Code-Barres': '6181100234529',
      'Catégorie': 'Alimentation & Épicerie',
      'Marque': 'Aya Pure',
      'Unité': 'Bouteille',
      'Prix Achat HT': 1100,
      'Marge %': 20,
      'Prix Vente TTC': 1550,
      'Taux TVA %': 18,
      'Stock Initial': 200,
      'Seuil Alerte': 20,
      'Description': 'Huile enrichie en vitamines A et E',
    },
    {
      'Nom Produit': 'Savon Purifiant Anti-Bactérien 200g',
      'SKU': 'SAV-PUR-200G',
      'Code-Barres': '6181100234536',
      'Catégorie': 'Hygiène & Soins',
      'Marque': 'DermoCare',
      'Unité': 'Pièce',
      'Prix Achat HT': 450,
      'Marge %': 33.3,
      'Prix Vente TTC': 700,
      'Taux TVA %': 18,
      'Stock Initial': 80,
      'Seuil Alerte': 10,
      'Description': 'Savon dermatologique doux aux extraits naturels',
    },
    {
      'Nom Produit': 'Sucre Blanc en Morceaux 1kg',
      'SKU': 'SUC-MOR-01K',
      'Code-Barres': '6181100234543',
      'Catégorie': 'Alimentation & Épicerie',
      'Marque': 'Sucre Ivoire',
      'Unité': 'Paquet',
      'Prix Achat HT': 750,
      'Marge %': 25,
      'Prix Vente TTC': 1100,
      'Taux TVA %': 18,
      'Stock Initial': 120,
      'Seuil Alerte': 15,
      'Description': 'Sucre blanc cristallisé en morceaux',
    },
    {
      'Nom Produit': 'Câble USB-C Tressé Charge Rapide 1.5m',
      'SKU': 'ACC-USBC-15M',
      'Code-Barres': '6181100234550',
      'Catégorie': 'High-Tech & Accessoires',
      'Marque': 'TechPro',
      'Unité': 'Pièce',
      'Prix Achat HT': 1800,
      'Marge %': 45,
      'Prix Vente TTC': 3100,
      'Taux TVA %': 18,
      'Stock Initial': 45,
      'Seuil Alerte': 5,
      'Description': 'Câble en nylon tressé résistant 60W Fast Charge',
    },
  ];

  if (format === 'xlsx') {
    const ws = XLSX.utils.json_to_sheet(sampleData);

    // Set custom column widths
    ws['!cols'] = [
      { wch: 35 }, // Nom Produit
      { wch: 16 }, // SKU
      { wch: 18 }, // Code-Barres
      { wch: 25 }, // Catégorie
      { wch: 18 }, // Marque
      { wch: 12 }, // Unité
      { wch: 15 }, // Prix Achat HT
      { wch: 10 }, // Marge %
      { wch: 15 }, // Prix Vente TTC
      { wch: 12 }, // Taux TVA %
      { wch: 14 }, // Stock Initial
      { wch: 14 }, // Seuil Alerte
      { wch: 45 }, // Description
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produits & Stock');

    // Add Instructions sheet
    const instructionsData = [
      { 'COLONNE': 'Nom Produit', 'OBLIGATOIRE': 'OUI', 'DESCRIPTION': 'Nom complet et libellé de l\'article.' },
      { 'COLONNE': 'SKU', 'OBLIGATOIRE': 'NON (Auto-généré)', 'DESCRIPTION': 'Référence unique de l\'article. Sert à identifier les mises à jour.' },
      { 'COLONNE': 'Code-Barres', 'OBLIGATOIRE': 'NON', 'DESCRIPTION': 'Code EAN13 ou code-barres pour scanner au POS.' },
      { 'COLONNE': 'Catégorie', 'OBLIGATOIRE': 'NON (Défaut: Général)', 'DESCRIPTION': 'Catégorie du produit. Sera créée automatiquement si elle n\'existe pas.' },
      { 'COLONNE': 'Marque', 'OBLIGATOIRE': 'NON', 'DESCRIPTION': 'Marque ou fabricant du produit.' },
      { 'COLONNE': 'Unité', 'OBLIGATOIRE': 'NON (Défaut: Pièce)', 'DESCRIPTION': 'Unité de mesure (ex: Sac, Bouteille, Pièce, Kg, Litre, Carton).' },
      { 'COLONNE': 'Prix Achat HT', 'OBLIGATOIRE': 'OUI (ou 0)', 'DESCRIPTION': 'Coût d\'achat unitaire hors taxe.' },
      { 'COLONNE': 'Marge %', 'OBLIGATOIRE': 'NON', 'DESCRIPTION': 'Marge brute bénéficiaire souhaitée (ex: 25 pour 25%).' },
      { 'COLONNE': 'Prix Vente TTC', 'OBLIGATOIRE': 'OUI (ou calculé)', 'DESCRIPTION': 'Prix de vente final toutes taxes comprises.' },
      { 'COLONNE': 'Taux TVA %', 'OBLIGATOIRE': 'NON (Défaut: 18%)', 'DESCRIPTION': 'Taux de taxe applicable.' },
      { 'COLONNE': 'Stock Initial', 'OBLIGATOIRE': 'NON (Défaut: 0)', 'DESCRIPTION': 'Quantité physique initiale à enregistrer dans le magasin choisi.' },
      { 'COLONNE': 'Seuil Alerte', 'OBLIGATOIRE': 'NON (Défaut: 5)', 'DESCRIPTION': 'Niveau de stock déclenchant une alerte de réapprovisionnement.' },
      { 'COLONNE': 'Description', 'OBLIGATOIRE': 'NON', 'DESCRIPTION': 'Notes ou descriptif technique du produit.' },
    ];
    const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);
    wsInstructions['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Guide & Instructions');

    XLSX.writeFile(wb, 'modele_import_produits_stock.xlsx');
  } else {
    // CSV Format
    const headers = Object.keys(sampleData[0]);
    const rows = sampleData.map((row) => Object.values(row));
    const csvRows = [headers, ...rows];

    const formatCell = (val: any): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvContent = csvRows.map((r) => r.map(formatCell).join(';')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'modele_import_produits_stock.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
