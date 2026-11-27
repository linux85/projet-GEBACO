import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  X,
  Store,
  Layers,
  Sparkles,
  HelpCircle,
  RefreshCw,
  Search,
  Check,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import {
  parseCSVRaw,
  parseExcelRaw,
  autoDetectMapping,
  processAndValidateRows,
  generateProductImportTemplate,
  ImportFieldMapping,
  ParsedImportRow,
} from '../../lib/productImportExport';

interface ProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'result';

export const ProductImportModal: React.FC<ProductImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { state, currentBusiness, bulkImportProducts } = useERP();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [fieldMapping, setFieldMapping] = useState<ImportFieldMapping>({
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
  });

  // Settings
  const businessLocations = state.locations.filter((l) => l.businessId === currentBusiness.id);
  const [targetLocationId, setTargetLocationId] = useState<string>(
    state.currentLocationId !== 'all' && state.currentLocationId
      ? state.currentLocationId
      : businessLocations[0]?.id || 'all'
  );
  const [duplicateStrategy, setDuplicateStrategy] = useState<'update' | 'skip' | 'create_unique'>('update');

  // Preview & parsed data
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'warnings' | 'errors'>('all');
  const [previewSearch, setPreviewSearch] = useState('');

  // Loading & Result state
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importReport, setImportReport] = useState<{
    inserted: number;
    updated: number;
    skipped: number;
    categoriesCreated: number;
    brandsCreated: number;
    unitsCreated: number;
  } | null>(null);

  if (!isOpen) return null;

  // Handle file selection
  const handleFileChange = async (file: File) => {
    if (!file) return;
    setSelectedFile(file);
    setIsProcessingFile(true);

    try {
      const fileName = file.name.toLowerCase();
      let parsedHeaders: string[] = [];
      let parsedDataRows: Record<string, any>[] = [];

      if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
        const text = await file.text();
        const res = parseCSVRaw(text);
        parsedHeaders = res.headers;
        parsedDataRows = res.rows;
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const res = parseExcelRaw(buffer);
        parsedHeaders = res.headers;
        parsedDataRows = res.rows;
      } else {
        alert('Format de fichier non pris en charge. Veuillez choisir un fichier .csv, .xlsx ou .xls.');
        setIsProcessingFile(false);
        return;
      }

      if (parsedHeaders.length === 0 || parsedDataRows.length === 0) {
        alert('Le fichier sélectionné est vide ou ses colonnes ne sont pas lisibles.');
        setIsProcessingFile(false);
        return;
      }

      setFileHeaders(parsedHeaders);
      setRawRows(parsedDataRows);

      // Auto-detect mappings
      const detected = autoDetectMapping(parsedHeaders);
      setFieldMapping(detected);

      setCurrentStep('mapping');
    } catch (err: any) {
      console.error('Erreur de lecture du fichier:', err);
      alert(`Erreur lors de la lecture du fichier : ${err.message || 'Format invalide'}`);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Proceed from mapping to preview
  const handleProceedToPreview = () => {
    if (!fieldMapping.name) {
      alert('Veuillez au minimum sélectionner la colonne correspondant au "Nom du produit".');
      return;
    }

    const businessProducts = state.products.filter((p) => p.businessId === currentBusiness.id);
    const validated = processAndValidateRows(
      rawRows,
      fieldMapping,
      businessProducts,
      currentBusiness.defaultProfitMargin || 25,
      18
    );

    setParsedRows(validated);
    setCurrentStep('preview');
  };

  // Execute Import
  const handleExecuteImport = () => {
    const validRowsToImport = parsedRows.filter((r) => r.isValid);
    if (validRowsToImport.length === 0) {
      alert('Aucune ligne valide à importer.');
      return;
    }

    setIsImporting(true);

    try {
      const itemsToProcess = validRowsToImport.map((r) => ({
        name: r.mapped.name,
        sku: r.mapped.sku,
        barcode: r.mapped.barcode,
        categoryName: r.mapped.categoryName,
        brandName: r.mapped.brandName,
        unitShortName: r.mapped.unitShortName,
        purchasePrice: r.mapped.purchasePrice,
        profitMargin: r.mapped.profitMargin,
        sellingPrice: r.mapped.sellingPrice,
        taxRate: r.mapped.taxRate,
        stockQuantity: r.mapped.stockQuantity,
        alertQuantity: r.mapped.alertQuantity,
        description: r.mapped.description,
      }));

      const report = bulkImportProducts(itemsToProcess, {
        targetLocationId,
        duplicateStrategy,
      });

      setImportReport(report);
      setCurrentStep('result');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Erreur lors de l\'import:', err);
      alert(`Une erreur est survenue lors de l'import : ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Preview filtering & calculations
  const filteredPreviewRows = parsedRows.filter((row) => {
    if (previewFilter === 'valid' && (!row.isValid || row.warnings.length > 0)) return false;
    if (previewFilter === 'warnings' && (row.warnings.length === 0 || !row.isValid)) return false;
    if (previewFilter === 'errors' && row.isValid) return false;

    if (previewSearch) {
      const q = previewSearch.toLowerCase();
      return (
        row.mapped.name.toLowerCase().includes(q) ||
        row.mapped.sku.toLowerCase().includes(q) ||
        row.mapped.categoryName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const warningCount = parsedRows.filter((r) => r.warnings.length > 0 && r.isValid).length;
  const errorCount = parsedRows.filter((r) => !r.isValid).length;

  const totalUnitsCalculated = parsedRows
    .filter((r) => r.isValid)
    .reduce((sum, r) => sum + (r.mapped.stockQuantity || 0), 0);

  const totalPurchaseValueCalculated = parsedRows
    .filter((r) => r.isValid)
    .reduce((sum, r) => sum + (r.mapped.stockQuantity || 0) * (r.mapped.purchasePrice || 0), 0);

  const totalSellingValueCalculated = parsedRows
    .filter((r) => r.isValid)
    .reduce((sum, r) => sum + (r.mapped.stockQuantity || 0) * (r.mapped.sellingPrice || 0), 0);

  const resetAll = () => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setFileHeaders([]);
    setRawRows([]);
    setParsedRows([]);
    setImportReport(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">Import de Produits & Stock Initial</h3>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md text-[10px] font-bold">
                  CSV & Excel (XLS/XLSX)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Insérez vos articles en masse et enregistrez directement vos quantités en stock.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP PROGRESS BAR */}
        <div className="bg-slate-950/40 border-b border-slate-800 px-6 py-3">
          <div className="flex items-center justify-between max-w-2xl mx-auto text-xs">
            <div
              className={`flex items-center space-x-2 ${
                currentStep === 'upload'
                  ? 'text-blue-400 font-bold'
                  : 'text-slate-400'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  currentStep === 'upload'
                    ? 'bg-blue-600 text-white'
                    : selectedFile
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                1
              </div>
              <span>Fichier & Modèle</span>
            </div>

            <div className="w-12 h-0.5 bg-slate-800" />

            <div
              className={`flex items-center space-x-2 ${
                currentStep === 'mapping'
                  ? 'text-blue-400 font-bold'
                  : 'text-slate-400'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  currentStep === 'mapping'
                    ? 'bg-blue-600 text-white'
                    : ['preview', 'result'].includes(currentStep)
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                2
              </div>
              <span>Correspondance Colonnes</span>
            </div>

            <div className="w-12 h-0.5 bg-slate-800" />

            <div
              className={`flex items-center space-x-2 ${
                currentStep === 'preview'
                  ? 'text-blue-400 font-bold'
                  : 'text-slate-400'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  currentStep === 'preview'
                    ? 'bg-blue-600 text-white'
                    : currentStep === 'result'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                3
              </div>
              <span>Validation & Aperçu</span>
            </div>

            <div className="w-12 h-0.5 bg-slate-800" />

            <div
              className={`flex items-center space-x-2 ${
                currentStep === 'result'
                  ? 'text-emerald-400 font-bold'
                  : 'text-slate-500'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  currentStep === 'result'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                4
              </div>
              <span>Résultat</span>
            </div>
          </div>
        </div>

        {/* MODAL BODY (STEPS) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* ================= STEP 1: UPLOAD & TEMPLATE ================= */}
          {currentStep === 'upload' && (
            <div className="space-y-6">
              {/* Template Download Banner */}
              <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-emerald-950/30 p-5 rounded-2xl border border-blue-900/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <h4 className="text-sm font-bold text-white">Besoin d'un modèle prêt à remplir ?</h4>
                  </div>
                  <p className="text-xs text-slate-300">
                    Téléchargez notre modèle avec les colonnes recommandées et des exemples d'articles pour un import sans erreur.
                  </p>
                </div>

                <div className="flex items-center space-x-3 w-full md:w-auto shrink-0">
                  <button
                    onClick={() => generateProductImportTemplate('xlsx')}
                    className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950/40 transition-all"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Modèle Excel (.xlsx)</span>
                  </button>
                  <button
                    onClick={() => generateProductImportTemplate('csv')}
                    className="flex-1 md:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 border border-slate-700 transition-all"
                  >
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span>Modèle CSV (.csv)</span>
                  </button>
                </div>
              </div>

              {/* Upload Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-blue-500/80 bg-slate-950/50 hover:bg-slate-900/60 transition-all rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-16 h-16 rounded-2xl bg-blue-600/10 group-hover:bg-blue-600/20 text-blue-400 flex items-center justify-center mb-4 transition-transform group-hover:scale-110 border border-blue-500/20">
                  <Upload className="w-8 h-8" />
                </div>

                <h4 className="text-base font-bold text-white mb-1">
                  Glissez-déposez votre fichier ici, ou{' '}
                  <span className="text-blue-400 group-hover:underline">parcourez vos dossiers</span>
                </h4>
                <p className="text-xs text-slate-400 max-w-md">
                  Formats acceptés : <strong>.xlsx, .xls, .csv</strong> (encodage UTF-8 recommandé, délimiteurs virgule ou point-virgule).
                </p>

                {isProcessingFile && (
                  <div className="mt-4 flex items-center space-x-2 text-xs text-blue-400">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyse du fichier en cours...</span>
                  </div>
                )}
              </div>

              {/* Information Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Création Automatique</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Les catégories, marques ou unités non existantes seront créées automatiquement dans votre catalogue.
                  </p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs">
                    <Store className="w-4 h-4" />
                    <span>Stock par Emplacement</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Attribuez le stock initial à votre magasin principal ou au dépôt de votre choix lors de l'import.
                  </p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Gestion des Doublons</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Choisissez de mettre à jour les prix & stocks existants, d'ignorer les doublons ou de créer de nouveaux SKU.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: COLUMN MAPPING & SETTINGS ================= */}
          {currentStep === 'mapping' && (
            <div className="space-y-6">
              {/* File Info & Store Selector Banner */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center space-x-1.5">
                    <Store className="w-4 h-4 text-blue-400" />
                    <span>Magasin / Dépôt cible pour le Stock Initial *</span>
                  </label>
                  <select
                    value={targetLocationId}
                    onChange={(e) => setTargetLocationId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {businessLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.city || 'Principal'})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Les quantités de la colonne "Stock Initial" seront allouées à cet emplacement.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center space-x-1.5">
                    <RefreshCw className="w-4 h-4 text-amber-400" />
                    <span>Traitement des Doublons (SKU existant)</span>
                  </label>
                  <select
                    value={duplicateStrategy}
                    onChange={(e) => setDuplicateStrategy(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="update">Mettre à jour le produit existant (Prix & Stock)</option>
                    <option value="skip">Ignorer le produit (Conserver l'existant sans modification)</option>
                    <option value="create_unique">Créer comme nouveau produit (Ajouter un suffixe au SKU)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Fichier chargé : <strong className="text-white">{selectedFile?.name}</strong> ({rawRows.length} lignes détectées)
                  </p>
                </div>
              </div>

              {/* Column Mapping Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-blue-400" />
                      <span>Correspondance des Colonnes</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Associez les colonnes de votre fichier aux champs du système ERP. Les correspondances ont été pré-remplies automatiquement.
                    </p>
                  </div>

                  <button
                    onClick={() => setFieldMapping(autoDetectMapping(fileHeaders))}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center space-x-1.5 border border-slate-700"
                  >
                    <RefreshCw className="w-3 h-3 text-blue-400" />
                    <span>Réinitialiser la Détection</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
                  {/* Field: Product Name (Required) */}
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center space-x-1">
                        <span>Nom du Produit / Libellé</span>
                        <span className="text-red-400 font-bold">*</span>
                      </span>
                      <span className="text-[10px] text-red-400 bg-red-950/50 px-1.5 py-0.5 rounded border border-red-800/40">
                        Obligatoire
                      </span>
                    </div>
                    <select
                      value={fieldMapping.name}
                      onChange={(e) => setFieldMapping({ ...fieldMapping, name: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">-- Non mappé --</option>
                      {fileHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Field: SKU */}
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">SKU / Référence Article</span>
                      <span className="text-[10px] text-slate-400">Auto-généré si vide</span>
                    </div>
                    <select
                      value={fieldMapping.sku}
                      onChange={(e) => setFieldMapping({ ...fieldMapping, sku: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">-- Non mappé (Auto-générer) --</option>
                      {fileHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Field: Code-barres */}
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">Code-Barres / EAN13</span>
                      <span className="text-[10px] text-slate-400">Optionnel</span>
                    </div>
                    <select
                      value={fieldMapping.barcode}
                      onChange={(e) => setFieldMapping({ ...fieldMapping, barcode: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">-- Non mappé --</option>
                      {fileHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Field: Catégorie */}
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">Catégorie</span>
                      <span className="text-[10px] text-emerald-400">Création auto</span>
                    </div>
                    <select
                      value={fieldMapping.category}
                      onChange={(e) => setFieldMapping({ ...fieldMapping, category: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">-- Défaut (Général) --</option>
                      {fileHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Field: Marque */}
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">Marque / Fabricant</span>
                      <span className="text-[10px] text-emerald-400">Création auto</span>
                    </div>
                    <select
                      value={fieldMapping.brand}
                      onChange={(e) => setFieldMapping({ ...fieldMapping, brand: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">-- Non mappé --</option>
                      {fileHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Field: Unité */}
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">Unité de mesure (pcs, kg, L...)</span>
                      <span className="text-[10px] text-emerald-400">Défaut: Pièce</span>
                    </div>
                    <select
                      value={fieldMapping.unit}
                      onChange={(e) => setFieldMapping({ ...fieldMapping, unit: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">-- Défaut (Pièce) --</option>
                      {fileHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Field: Prix Achat HT */}
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">Prix d'Achat HT</span>
                      <span className="text-[10px] text-slate-400">Coût unitaire</span>
                    </div>
                    <select
                      value={fieldMapping.purchasePrice}
                      onChange={(e) => setFieldMapping({ ...fieldMapping, purchasePrice: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">-- Non mappé (0) --</option>
                      {fileHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Field: Marge % */}
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">Marge Bénéficiaire (%)</span>
                      <span className="text-[10px] text-slate-400">Défaut: {currentBusiness.defaultProfitMargin || 25}%</span>
                    </div>
                    <select
                      value={fieldMapping.profitMargin}
                      onChange={(e) => setFieldMapping({ ...fieldMapping, profitMargin: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">-- Défaut ({currentBusiness.defaultProfitMargin || 25}%) --</option>
                      {fileHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Field: Prix Vente TTC */}
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">Prix de Vente TTC</span>
                      <span className="text-[10px] text-blue-400">Calculé si vide</span>
                    </div>
                    <select
                      value={fieldMapping.sellingPrice}
                      onChange={(e) => setFieldMapping({ ...fieldMapping, sellingPrice: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">-- Calculer via Marge & TVA --</option>
                      {fileHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Field: Stock Initial */}
                  <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-800/40 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-300 flex items-center space-x-1.5">
                        <Store className="w-3.5 h-3.5" />
                        <span>Quantité Stock Initial</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-900/40 px-1.5 py-0.5 rounded">
                        Affecté au magasin
                      </span>
                    </div>
                    <select
                      value={fieldMapping.stockQuantity}
                      onChange={(e) => setFieldMapping({ ...fieldMapping, stockQuantity: e.target.value })}
                      className="w-full bg-slate-800 border border-emerald-700/50 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="">-- Non mappé (0 en stock) --</option>
                      {fileHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Field: Seuil Alerte */}
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">Seuil d'Alerte Stock</span>
                      <span className="text-[10px] text-slate-400">Défaut: 5</span>
                    </div>
                    <select
                      value={fieldMapping.alertQuantity}
                      onChange={(e) => setFieldMapping({ ...fieldMapping, alertQuantity: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">-- Défaut (5) --</option>
                      {fileHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Field: Description */}
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">Description / Remarques</span>
                      <span className="text-[10px] text-slate-400">Optionnel</span>
                    </div>
                    <select
                      value={fieldMapping.description}
                      onChange={(e) => setFieldMapping({ ...fieldMapping, description: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">-- Non mappé --</option>
                      {fileHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: PREVIEW & VALIDATION ================= */}
          {currentStep === 'preview' && (
            <div className="space-y-5">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                    Articles Valides
                  </span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-xl font-bold text-emerald-400">{validCount}</span>
                    <span className="text-xs text-slate-500">/ {parsedRows.length}</span>
                  </div>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                    Stock Initial Total
                  </span>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-xl font-bold text-blue-400">
                      {totalUnitsCalculated.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400">unités</span>
                  </div>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                    Valorisation Coût Achat
                  </span>
                  <div className="text-sm font-bold text-amber-400 truncate">
                    {totalPurchaseValueCalculated.toLocaleString()} {currentBusiness.currencySymbol}
                  </div>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                    Valorisation Vente TTC
                  </span>
                  <div className="text-sm font-bold text-emerald-400 truncate">
                    {totalSellingValueCalculated.toLocaleString()} {currentBusiness.currencySymbol}
                  </div>
                </div>
              </div>

              {/* Filter and Search bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPreviewFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      previewFilter === 'all'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    Tous ({parsedRows.length})
                  </button>

                  <button
                    onClick={() => setPreviewFilter('valid')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      previewFilter === 'valid'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    Valides ({validCount - warningCount})
                  </button>

                  {warningCount > 0 && (
                    <button
                      onClick={() => setPreviewFilter('warnings')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        previewFilter === 'warnings'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-amber-400 hover:bg-amber-950/40'
                      }`}
                    >
                      Avertissements ({warningCount})
                    </button>
                  )}

                  {errorCount > 0 && (
                    <button
                      onClick={() => setPreviewFilter('errors')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        previewFilter === 'errors'
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'text-red-400 hover:bg-red-950/40'
                      }`}
                    >
                      Erreurs ({errorCount})
                    </button>
                  )}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher dans l'aperçu..."
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    className="w-full bg-slate-800 text-white pl-8 pr-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40 max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 sticky top-0 border-b border-slate-800 uppercase text-[10px] font-bold text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3">Statut</th>
                      <th className="py-2.5 px-3">Nom du Produit</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Catégorie / Marque</th>
                      <th className="py-2.5 px-3 text-right">P. Achat</th>
                      <th className="py-2.5 px-3 text-right">P. Vente</th>
                      <th className="py-2.5 px-3 text-right">Stock Initial</th>
                      <th className="py-2.5 px-3">Remarques / Alertes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredPreviewRows.map((row) => (
                      <tr
                        key={row.rowIndex}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          !row.isValid
                            ? 'bg-red-950/20'
                            : row.warnings.length > 0
                            ? 'bg-amber-950/10'
                            : ''
                        }`}
                      >
                        <td className="py-2 px-3">
                          {!row.isValid ? (
                            <span className="flex items-center space-x-1 text-red-400 font-bold">
                              <XCircle className="w-4 h-4" />
                              <span>Erreur</span>
                            </span>
                          ) : row.warnings.length > 0 ? (
                            <span className="flex items-center space-x-1 text-amber-400 font-bold">
                              <AlertTriangle className="w-4 h-4" />
                              <span>Avis</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-1 text-emerald-400 font-bold">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Prêt</span>
                            </span>
                          )}
                        </td>

                        <td className="py-2 px-3">
                          <div className="font-bold text-white">{row.mapped.name || '(Nom manquant)'}</div>
                          {row.mapped.barcode && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              EAN: {row.mapped.barcode}
                            </div>
                          )}
                        </td>

                        <td className="py-2 px-3 font-mono text-slate-300">
                          {row.mapped.sku}
                        </td>

                        <td className="py-2 px-3">
                          <div className="text-white">{row.mapped.categoryName}</div>
                          {row.mapped.brandName && (
                            <div className="text-[10px] text-slate-400">{row.mapped.brandName}</div>
                          )}
                        </td>

                        <td className="py-2 px-3 text-right font-mono text-slate-300">
                          {row.mapped.purchasePrice.toLocaleString()} {currentBusiness.currencySymbol}
                        </td>

                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                          {row.mapped.sellingPrice.toLocaleString()} {currentBusiness.currencySymbol}
                        </td>

                        <td className="py-2 px-3 text-right font-mono font-bold text-blue-400">
                          {row.mapped.stockQuantity} {row.mapped.unitShortName}
                        </td>

                        <td className="py-2 px-3 text-[11px]">
                          {row.errors.length > 0 ? (
                            <div className="text-red-400">{row.errors.join(', ')}</div>
                          ) : row.warnings.length > 0 ? (
                            <div className="text-amber-400/90">{row.warnings.join(', ')}</div>
                          ) : (
                            <span className="text-slate-500">Conforme</span>
                          )}
                        </td>
                      </tr>
                    ))}

                    {filteredPreviewRows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500">
                          Aucune ligne ne correspond aux critères de filtre.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= STEP 4: IMPORT RESULT REPORT ================= */}
          {currentStep === 'result' && importReport && (
            <div className="space-y-6 text-center py-6">
              <div className="w-16 h-16 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-bold text-white">Importation Réussie avec Succès !</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Vos produits ont été intégrés au catalogue et les niveaux de stock ont été enregistrés pour l'emplacement cible.
                </p>
              </div>

              {/* Report Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-left">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Nouveaux Produits Créés</span>
                  <div className="text-xl font-bold text-emerald-400">+{importReport.inserted}</div>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Produits Mis à Jour</span>
                  <div className="text-xl font-bold text-blue-400">{importReport.updated}</div>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Doublons Ignorés</span>
                  <div className="text-xl font-bold text-slate-400">{importReport.skipped}</div>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Nouvelles Catégories</span>
                  <div className="text-base font-bold text-purple-400">+{importReport.categoriesCreated}</div>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Nouvelles Marques</span>
                  <div className="text-base font-bold text-purple-400">+{importReport.brandsCreated}</div>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Nouvelles Unités</span>
                  <div className="text-base font-bold text-purple-400">+{importReport.unitsCreated}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER BUTTONS */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div>
            {currentStep === 'mapping' && (
              <button
                onClick={() => setCurrentStep('upload')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center space-x-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Changer de Fichier</span>
              </button>
            )}

            {currentStep === 'preview' && (
              <button
                onClick={() => setCurrentStep('mapping')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center space-x-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Modifier le Mappage</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {currentStep !== 'result' ? (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Annuler
                </button>

                {currentStep === 'mapping' && (
                  <button
                    onClick={handleProceedToPreview}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-blue-900/30 transition-all"
                  >
                    <span>Valider & Prévisualiser</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {currentStep === 'preview' && (
                  <button
                    onClick={handleExecuteImport}
                    disabled={isImporting || validCount === 0}
                    className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg transition-all ${
                      isImporting || validCount === 0
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
                    }`}
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Importation en cours...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Confirmer et Importer ({validCount} articles)</span>
                      </>
                    )}
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-emerald-950/40 transition-all"
              >
                <span>Accéder au Catalogue Produit</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
