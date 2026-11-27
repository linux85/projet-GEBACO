import React, { useState, useMemo, useRef } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  StockInventory,
  StockInventoryItem,
  Product,
  Category,
  BusinessLocation,
} from '../../types';
import {
  ClipboardCheck,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Search,
  Filter,
  Printer,
  Download,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Barcode,
  Package,
  Building2,
  Calendar,
  User,
  FileSpreadsheet,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Check,
  ArrowRight,
  Save,
  X,
  Sliders,
  ShieldCheck,
  Percent,
  Layers,
  Scale,
  ShoppingCart,
  ArrowDownToLine,
} from 'lucide-react';
import { InventoryDataExportView } from './InventoryDataExportView';

export const StockInventoryManager: React.FC = () => {
  const {
    state,
    currentBusiness,
    currentLocation,
    currentUser,
    createStockInventory,
    updateStockInventory,
    reconcileStockInventory,
    cancelStockInventory,
    deleteStockInventory,
    hasPermission,
  } = useERP();

  // Active view tab
  const [activeTab, setActiveTab] = useState<'campaigns' | 'active_count' | 'variances' | 'exports'>('campaigns');

  // Selected inventory for counting / viewing / printing
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);

  // Filters for campaign list
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | StockInventory['status']>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printMode, setPrintMode] = useState<'pv' | 'blank'>('pv');
  const [showReconcileConfirm, setShowReconcileConfirm] = useState(false);
  const [deletingInventory, setDeletingInventory] = useState<StockInventory | null>(null);

  // Create Form State
  const [newRef, setNewRef] = useState(`INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`);
  const [newTitle, setNewTitle] = useState('');
  const [newLocationId, setNewLocationId] = useState(
    state.currentLocationId === 'all' ? state.locations[0]?.id || '' : state.currentLocationId
  );
  const [newType, setNewType] = useState<'full' | 'partial'>('full');
  const [newSelectedCategories, setNewSelectedCategories] = useState<string[]>([]);
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newCountedBy, setNewCountedBy] = useState(currentUser?.name || '');
  const [newSupervisedBy, setNewSupervisedBy] = useState('');
  const [newIsBlindCount, setNewIsBlindCount] = useState(false);
  const [newNotes, setNewNotes] = useState('');

  // Counting Sheet State
  const [countSearch, setCountSearch] = useState('');
  const [countFilter, setCountFilter] = useState<'all' | 'variance' | 'uncounted' | 'matching'>('all');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeFlash, setBarcodeFlash] = useState<string | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Filtered inventories for current business
  const businessInventories = useMemo(() => {
    return (state.stockInventories || [])
      .filter((inv) => inv.businessId === currentBusiness.id)
      .filter((inv) => (locationFilter === 'all' ? true : inv.locationId === locationFilter))
      .filter((inv) => (statusFilter === 'all' ? true : inv.status === statusFilter))
      .filter((inv) => {
        if (!searchFilter.trim()) return true;
        const q = searchFilter.toLowerCase();
        return (
          inv.referenceNo.toLowerCase().includes(q) ||
          inv.title.toLowerCase().includes(q) ||
          inv.countedBy.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [state.stockInventories, currentBusiness.id, locationFilter, statusFilter, searchFilter]);

  // Selected Active Inventory object
  const activeInventory = useMemo(() => {
    if (!selectedInventoryId) return null;
    return (state.stockInventories || []).find((i) => i.id === selectedInventoryId) || null;
  }, [state.stockInventories, selectedInventoryId]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const all = (state.stockInventories || []).filter((i) => i.businessId === currentBusiness.id);
    const completed = all.filter((i) => i.status === 'completed');
    const inProgress = all.filter((i) => i.status === 'in_progress');

    const totalLossGain = completed.reduce((sum, i) => sum + i.totalVarianceCost, 0);
    const avgAccuracy =
      completed.length > 0
        ? Math.round((completed.reduce((sum, i) => sum + i.accuracyRate, 0) / completed.length) * 10) / 10
        : 100;

    return {
      totalCompleted: completed.length,
      inProgressCount: inProgress.length,
      totalLossGain,
      avgAccuracy,
    };
  }, [state.stockInventories, currentBusiness.id]);

  // Format currency
  const formatMoney = (amount: number) => {
    return `${amount.toLocaleString()} ${currentBusiness.currencySymbol}`;
  };

  // Open Create Modal with default reference
  const handleOpenCreate = () => {
    const year = new Date().getFullYear();
    const count = (state.stockInventories || []).length + 1;
    setNewRef(`INV-${year}-${String(count).padStart(3, '0')}`);
    setNewTitle(`Inventaire ${newType === 'full' ? 'Général' : 'Partiel'} - ${new Date().toLocaleDateString('fr-FR')}`);
    setNewLocationId(
      state.currentLocationId === 'all' ? state.locations[0]?.id || '' : state.currentLocationId
    );
    setNewType('full');
    setNewSelectedCategories([]);
    setNewStartDate(new Date().toISOString().split('T')[0]);
    setNewCountedBy(currentUser?.name || '');
    setNewSupervisedBy('');
    setNewIsBlindCount(false);
    setNewNotes('');
    setShowCreateModal(true);
  };

  // Save new inventory
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newLocationId) return;

    const created = createStockInventory({
      businessId: currentBusiness.id,
      locationId: newLocationId,
      referenceNo: newRef.trim(),
      title: newTitle.trim(),
      type: newType,
      categoryIds: newType === 'partial' ? newSelectedCategories : undefined,
      status: 'in_progress',
      startDate: newStartDate,
      countedBy: newCountedBy.trim() || currentUser?.name || 'Responsable Stock',
      supervisedBy: newSupervisedBy.trim() || undefined,
      notes: newNotes.trim() || undefined,
      isBlindCount: newIsBlindCount,
      items: [],
      totalTheoreticalQty: 0,
      totalPhysicalQty: 0,
      totalVarianceQty: 0,
      totalVarianceCost: 0,
      accuracyRate: 100,
    });

    setShowCreateModal(false);
    setSelectedInventoryId(created.id);
    setActiveTab('active_count');
  };

  // Update a single item in the count sheet
  const handleItemCountChange = (itemId: string, physicalQty: number | null, varianceReason?: string) => {
    if (!activeInventory) return;

    const updatedItems = activeInventory.items.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          physicalQty,
          varianceReason: varianceReason !== undefined ? varianceReason : item.varianceReason,
        };
      }
      return item;
    });

    updateStockInventory({
      ...activeInventory,
      items: updatedItems,
    });
  };

  // Barcode quick scan handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInventory || !barcodeInput.trim()) return;

    const query = barcodeInput.trim().toLowerCase();
    const item = activeInventory.items.find(
      (i) =>
        (i.barcode && i.barcode.toLowerCase() === query) ||
        i.sku.toLowerCase() === query ||
        i.productName.toLowerCase().includes(query)
    );

    if (item) {
      const currentPhysical = item.physicalQty ?? 0;
      handleItemCountChange(item.id, currentPhysical + 1);
      setBarcodeFlash(`+1 compté pour "${item.productName}" (Total: ${currentPhysical + 1})`);
      setTimeout(() => setBarcodeFlash(null), 3000);
      setBarcodeInput('');
    } else {
      setBarcodeFlash(`❌ Aucun article trouvé pour le code "${barcodeInput}"`);
      setTimeout(() => setBarcodeFlash(null), 3000);
    }
  };

  // Mark all uncounted items as matching theoretical stock
  const handleMarkAllMatching = () => {
    if (!activeInventory) return;
    const updatedItems = activeInventory.items.map((item) => ({
      ...item,
      physicalQty: item.physicalQty !== null ? item.physicalQty : item.theoreticalQty,
      varianceReason: item.varianceReason || 'Conforme',
    }));

    updateStockInventory({
      ...activeInventory,
      items: updatedItems,
    });
  };

  // Reset all counts
  const handleResetCounts = () => {
    if (!activeInventory) return;
    if (!confirm('Réinitialiser toutes les saisies physiques de cet inventaire ?')) return;

    const updatedItems = activeInventory.items.map((item) => ({
      ...item,
      physicalQty: null,
      varianceReason: undefined,
      isCounted: false,
    }));

    updateStockInventory({
      ...activeInventory,
      items: updatedItems,
    });
  };

  // Filtered items in count sheet
  const filteredCountItems = useMemo(() => {
    if (!activeInventory) return [];
    return activeInventory.items.filter((item) => {
      // Search query
      if (countSearch.trim()) {
        const q = countSearch.toLowerCase();
        const matchName = item.productName.toLowerCase().includes(q);
        const matchSku = item.sku.toLowerCase().includes(q);
        const matchBarcode = item.barcode ? item.barcode.toLowerCase().includes(q) : false;
        if (!matchName && !matchSku && !matchBarcode) return false;
      }

      // Filter status
      if (countFilter === 'variance') {
        return item.isCounted && item.varianceQty !== 0;
      }
      if (countFilter === 'uncounted') {
        return !item.isCounted;
      }
      if (countFilter === 'matching') {
        return item.isCounted && item.varianceQty === 0;
      }

      return true;
    });
  }, [activeInventory, countSearch, countFilter]);

  // Export inventory to CSV
  const handleExportCSV = (inv: StockInventory) => {
    const loc = state.locations.find((l) => l.id === inv.locationId)?.name || 'Magasin';
    let csv = `Procès-Verbal d'Inventaire - ${inv.referenceNo}\n`;
    csv += `Titre;${inv.title}\n`;
    csv += `Magasin;${loc}\n`;
    csv += `Date Début;${inv.startDate}\n`;
    csv += `Date Clôture;${inv.completedDate || 'En cours'}\n`;
    csv += `Responsable;${inv.countedBy}\n`;
    csv += `Superviseur;${inv.supervisedBy || 'N/A'}\n`;
    csv += `Taux d'Exactitude;${inv.accuracyRate}%\n`;
    csv += `Écart Net Valorisé;${inv.totalVarianceCost} ${currentBusiness.currencySymbol}\n\n`;

    csv += `Article;SKU;Code-Barre;Catégorie;Unité;Prix Achat;Stock Théorique;Stock Physique;Écart Qté;Écart Valeur (${currentBusiness.currencySymbol});Motif / Remarque\n`;

    inv.items.forEach((i) => {
      csv += `"${i.productName}";"${i.sku}";"${i.barcode || ''}";"${i.categoryName || ''}";"${i.unitName}";${i.purchasePrice};${i.theoreticalQty};${i.physicalQty !== null ? i.physicalQty : 'Non compté'};${i.varianceQty};${i.varianceCost};"${i.varianceReason || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `inventaire_${inv.referenceNo}_${inv.startDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 backdrop-blur">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center space-x-2">
                <span>Inventaires Physiques & Audit Stock</span>
              </h1>
              <p className="text-xs text-slate-400">
                Comptages périodiques, fiches de saisie, réconciliation automatique et détection des écarts
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {activeInventory && activeInventory.status === 'in_progress' && (
            <button
              onClick={() => {
                setActiveTab('active_count');
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-emerald-950 transition-all"
            >
              <ClipboardList className="w-4 h-4" />
              <span>Session en cours ({activeInventory.referenceNo})</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('exports')}
            className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-xl text-xs font-bold flex items-center space-x-2 border border-emerald-500/30 transition-all"
            title="Exporter la liste des produits ou l'historique des ventes au format CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Exports CSV (Produits & Ventes)</span>
          </button>

          <button
            onClick={() => {
              if (businessInventories.length > 0) {
                setSelectedInventoryId(businessInventories[0].id);
                setPrintMode('blank');
                setShowPrintModal(true);
              } else {
                handleOpenCreate();
              }
            }}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center space-x-2 border border-slate-700 transition-colors"
            title="Imprimer une fiche de comptage vierge pour le terrain"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>Fiche Vierge Terrain</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-blue-950 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvel Inventaire</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Inventaires Clôturés</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{metrics.totalCompleted}</div>
          <p className="text-[11px] text-slate-500">Campagnes finalisées & réconciliées</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Exactitude Moyenne</span>
            <Percent className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-400">{metrics.avgAccuracy}%</div>
          <p className="text-[11px] text-slate-500">Conformité stock théorique vs réel</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Écart Net Cumulé</span>
            {metrics.totalLossGain >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div
            className={`text-xl sm:text-2xl font-black ${
              metrics.totalLossGain >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {metrics.totalLossGain >= 0 ? `+${formatMoney(metrics.totalLossGain)}` : formatMoney(metrics.totalLossGain)}
          </div>
          <p className="text-[11px] text-slate-500">Pertes & surplus financiers valorisés</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>En Cours / Saisie</span>
            <ClipboardList className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{metrics.inProgressCount}</div>
          <p className="text-[11px] text-slate-500">Campagnes de comptage actives</p>
        </div>
      </div>

      {/* NAVIGATION SUB-TABS */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'campaigns'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Campagnes d'Inventaire ({businessInventories.length})</span>
        </button>

        {activeInventory && (
          <button
            onClick={() => setActiveTab('active_count')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'active_count'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>
              Feuille de Comptage : <strong className="text-white">{activeInventory.referenceNo}</strong>
            </span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('variances')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'variances'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>Analyse Globale des Écarts</span>
        </button>

        <button
          onClick={() => setActiveTab('exports')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'exports'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Exports CSV & Données</span>
        </button>
      </div>

      {/* TAB 1: CAMPAIGNS LIST */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {/* FILTER BAR */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Réf, titre, auditeur..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-slate-800 text-white pl-9 pr-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
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

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full bg-slate-800 text-white px-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="all">Tous les Statuts</option>
                <option value="in_progress">En Cours de Comptage</option>
                <option value="completed">Validé & Réconcilié</option>
                <option value="draft">Brouillon</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>

            <div className="flex items-center justify-end text-xs text-slate-400 font-semibold px-2">
              {businessInventories.length} inventaire(s) trouvé(s)
            </div>
          </div>

          {/* INVENTORIES TABLE */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/70 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[10px]">
                  <tr>
                    <th className="p-3.5">Réf & Titre</th>
                    <th className="p-3.5">Magasin</th>
                    <th className="p-3.5">Type & Périmètre</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Responsable</th>
                    <th className="p-3.5 text-center">Progression</th>
                    <th className="p-3.5 text-right">Écart Net</th>
                    <th className="p-3.5 text-center">Exactitude</th>
                    <th className="p-3.5 text-center">Statut</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {businessInventories.map((inv) => {
                    const loc = state.locations.find((l) => l.id === inv.locationId);
                    const countedCount = inv.items.filter((i) => i.isCounted).length;
                    const progressPercent =
                      inv.items.length > 0 ? Math.round((countedCount / inv.items.length) * 100) : 100;

                    return (
                      <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-white flex items-center space-x-1.5">
                            <span className="font-mono text-blue-400">{inv.referenceNo}</span>
                            {inv.isBlindCount && (
                              <span
                                title="Mode Comptage à l'aveugle activé"
                                className="p-0.5 bg-purple-500/20 text-purple-300 rounded text-[9px] px-1 border border-purple-500/30"
                              >
                                Aveugle
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 text-[11px] truncate max-w-[180px]">
                            {inv.title}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="font-semibold text-slate-200 flex items-center space-x-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{loc?.name || 'Magasin Inconnu'}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">{loc?.city}</div>
                        </td>

                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              inv.type === 'full'
                                ? 'bg-blue-900/40 text-blue-300 border border-blue-700/50'
                                : 'bg-amber-900/40 text-amber-300 border border-amber-700/50'
                            }`}
                          >
                            {inv.type === 'full' ? 'Complet (Global)' : 'Partiel (Catégories)'}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {inv.items.length} référence(s)
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="text-slate-200 font-medium">{inv.startDate}</div>
                          {inv.completedDate && (
                            <div className="text-[10px] text-emerald-400">
                              Clôturé le {inv.completedDate}
                            </div>
                          )}
                        </td>

                        <td className="p-3.5">
                          <div className="text-slate-200 font-medium flex items-center space-x-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{inv.countedBy}</span>
                          </div>
                          {inv.supervisedBy && (
                            <div className="text-[10px] text-slate-500">Sup: {inv.supervisedBy}</div>
                          )}
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="w-24 mx-auto space-y-1">
                            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                              <span>
                                {countedCount}/{inv.items.length}
                              </span>
                              <span>{progressPercent}%</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  progressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 text-right font-mono font-bold">
                          <span
                            className={
                              inv.totalVarianceCost < 0
                                ? 'text-rose-400'
                                : inv.totalVarianceCost > 0
                                ? 'text-emerald-400'
                                : 'text-slate-400'
                            }
                          >
                            {inv.totalVarianceCost > 0 ? `+` : ''}
                            {formatMoney(inv.totalVarianceCost)}
                          </span>
                          <div className="text-[10px] text-slate-500 font-sans">
                            {inv.totalVarianceQty > 0 ? `+${inv.totalVarianceQty}` : inv.totalVarianceQty} pcs
                          </div>
                        </td>

                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              inv.accuracyRate >= 95
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : inv.accuracyRate >= 80
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-rose-950 text-rose-300 border border-rose-800'
                            }`}
                          >
                            {inv.accuracyRate}%
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              inv.status === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : inv.status === 'in_progress'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                                : inv.status === 'draft'
                                ? 'bg-slate-700 text-slate-300'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {inv.status === 'completed'
                              ? 'Clôturé & Validé'
                              : inv.status === 'in_progress'
                              ? 'Comptage en cours'
                              : inv.status === 'draft'
                              ? 'Brouillon'
                              : 'Annulé'}
                          </span>
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Open counting sheet */}
                            <button
                              onClick={() => {
                                setSelectedInventoryId(inv.id);
                                setActiveTab('active_count');
                              }}
                              className="p-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg border border-blue-500/30 transition-colors"
                              title="Ouvrir la feuille de comptage"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Print PV */}
                            <button
                              onClick={() => {
                                setSelectedInventoryId(inv.id);
                                setPrintMode('pv');
                                setShowPrintModal(true);
                              }}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
                              title="Imprimer le Procès-Verbal (PV)"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Export CSV */}
                            <button
                              onClick={() => handleExportCSV(inv)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
                              title="Exporter en CSV"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete inventory */}
                            <button
                              onClick={() => setDeletingInventory(inv)}
                              className="p-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg border border-rose-500/30 transition-colors"
                              title="Supprimer la campagne d'inventaire"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {businessInventories.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-12 text-center text-slate-500">
                        <ClipboardList className="w-10 h-10 mx-auto mb-2 text-slate-600 opacity-60" />
                        <p className="font-semibold text-sm text-slate-400">Aucun inventaire trouvé</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Lancez votre premier inventaire physique pour ajuster et certifier vos stocks réels.
                        </p>
                        <button
                          onClick={handleOpenCreate}
                          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Créer un inventaire</span>
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE COUNTING SHEET */}
      {activeTab === 'active_count' && activeInventory && (
        <div className="space-y-4">
          {/* ACTIVE INVENTORY HEADER BANNER */}
          <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm font-black text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                  {activeInventory.referenceNo}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeInventory.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {activeInventory.status === 'completed' ? 'Clôturé & Validé' : 'Comptage en cours'}
                </span>
                {activeInventory.isBlindCount && (
                  <span className="px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 text-[10px] font-bold border border-purple-700">
                    Mode Aveugle
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-white">{activeInventory.title}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                <span className="flex items-center space-x-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Magasin :{' '}
                    <strong className="text-slate-200">
                      {state.locations.find((l) => l.id === activeInventory.locationId)?.name}
                    </strong>
                  </span>
                </span>
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Date : <strong className="text-slate-200">{activeInventory.startDate}</strong>
                  </span>
                </span>
                <span className="flex items-center space-x-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Responsable : <strong className="text-slate-200">{activeInventory.countedBy}</strong>
                  </span>
                </span>
              </div>
            </div>

            {/* ACTION BUTTONS IN COUNT HEADER */}
            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={() => {
                  setPrintMode('pv');
                  setShowPrintModal(true);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border border-slate-700"
              >
                <Printer className="w-3.5 h-3.5 text-slate-400" />
                <span>Imprimer PV</span>
              </button>

              <button
                onClick={() => handleExportCSV(activeInventory)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border border-slate-700"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>CSV</span>
              </button>

              {activeInventory.status !== 'completed' && (
                <button
                  onClick={() => setShowReconcileConfirm(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-emerald-950 transition-transform active:scale-95"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Valider & Réconcilier le Stock</span>
                </button>
              )}
            </div>
          </div>

          {/* LIVE COUNTING METRICS BAR */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
            <div className="space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-slate-400">Progression</div>
              <div className="text-sm sm:text-base font-black text-white">
                {activeInventory.items.filter((i) => i.isCounted).length} / {activeInventory.items.length}{' '}
                <span className="text-xs text-slate-400 font-normal">
                  (
                  {activeInventory.items.length > 0
                    ? Math.round(
                        (activeInventory.items.filter((i) => i.isCounted).length /
                          activeInventory.items.length) *
                          100
                      )
                    : 100}
                  %)
                </span>
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-slate-400">Articles Conformes</div>
              <div className="text-sm sm:text-base font-black text-emerald-400">
                {activeInventory.items.filter((i) => i.isCounted && i.varianceQty === 0).length}{' '}
                <span className="text-xs text-slate-400 font-normal">
                  ({activeInventory.accuracyRate}%)
                </span>
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-slate-400">Articles avec Écart</div>
              <div className="text-sm sm:text-base font-black text-amber-400">
                {activeInventory.items.filter((i) => i.isCounted && i.varianceQty !== 0).length} réf(s)
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-slate-400">Impact Financier Net</div>
              <div
                className={`text-sm sm:text-base font-black ${
                  activeInventory.totalVarianceCost < 0
                    ? 'text-rose-400'
                    : activeInventory.totalVarianceCost > 0
                    ? 'text-emerald-400'
                    : 'text-slate-300'
                }`}
              >
                {activeInventory.totalVarianceCost > 0 ? '+' : ''}
                {formatMoney(activeInventory.totalVarianceCost)}
              </div>
            </div>
          </div>

          {/* BARCODE SCANNER QUICK INPUT */}
          <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2">
            <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Barcode className="w-4 h-4 absolute left-3 top-2.5 text-blue-400" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Scanner un code-barres ou entrer un SKU pour incrémenter +1..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="w-full bg-slate-800 text-white pl-9 pr-3 py-2 rounded-lg border border-slate-700 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shrink-0"
              >
                Scanner (+1)
              </button>
            </form>

            {barcodeFlash && (
              <div
                className={`p-2 rounded-lg text-xs font-semibold ${
                  barcodeFlash.includes('❌')
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {barcodeFlash}
              </div>
            )}
          </div>

          {/* COUNT SHEET FILTER & QUICK ACTIONS */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Recherche dans la liste..."
                  value={countSearch}
                  onChange={(e) => setCountSearch(e.target.value)}
                  className="w-full bg-slate-800 text-white pl-8 pr-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCountFilter('all')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${
                    countFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Tous ({activeInventory.items.length})
                </button>
                <button
                  onClick={() => setCountFilter('variance')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${
                    countFilter === 'variance'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Avec Écarts ({activeInventory.items.filter((i) => i.isCounted && i.varianceQty !== 0).length})
                </button>
                <button
                  onClick={() => setCountFilter('uncounted')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${
                    countFilter === 'uncounted'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Non Comptés ({activeInventory.items.filter((i) => !i.isCounted).length})
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {activeInventory.status !== 'completed' && (
                <>
                  <button
                    onClick={handleMarkAllMatching}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                    title="Définir tous les articles non comptés avec la quantité théorique"
                  >
                    Marquer Tous Conformes
                  </button>
                  <button
                    onClick={handleResetCounts}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    Réinitialiser
                  </button>
                </>
              )}
            </div>
          </div>

          {/* COUNT ITEMS TABLE */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[10px]">
                  <tr>
                    <th className="p-3.5">Article & Déclinaison</th>
                    <th className="p-3.5">SKU / Code-Barres</th>
                    <th className="p-3.5 text-center">Unité</th>
                    <th className="p-3.5 text-right">Prix Achat</th>
                    <th className="p-3.5 text-center">
                      Stock Théorique
                      {activeInventory.isBlindCount && (
                        <span className="block text-[9px] text-purple-400 font-normal">
                          (Masqué aux opérateurs)
                        </span>
                      )}
                    </th>
                    <th className="p-3.5 text-center bg-blue-950/30">Quantité Physique Comptée</th>
                    <th className="p-3.5 text-center">Écart Qté</th>
                    <th className="p-3.5 text-right">Écart Valorisé</th>
                    <th className="p-3.5">Motif de l'Écart / Remarques</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredCountItems.map((item) => {
                    const isCompleted = activeInventory.status === 'completed';
                    const hasCount = item.physicalQty !== null;
                    const isMatching = hasCount && item.varianceQty === 0;
                    const isLoss = hasCount && item.varianceQty < 0;
                    const isGain = hasCount && item.varianceQty > 0;

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-800/50 transition-colors ${
                          !hasCount
                            ? 'opacity-80'
                            : isLoss
                            ? 'bg-rose-950/10'
                            : isGain
                            ? 'bg-emerald-950/10'
                            : ''
                        }`}
                      >
                        <td className="p-3.5">
                          <div className="font-bold text-white">{item.productName}</div>
                          <div className="text-[10px] text-slate-500">{item.categoryName || 'Général'}</div>
                        </td>

                        <td className="p-3.5 font-mono text-[11px]">
                          <div className="text-blue-300 font-semibold">{item.sku}</div>
                          {item.barcode && <div className="text-slate-500">{item.barcode}</div>}
                        </td>

                        <td className="p-3.5 text-center text-slate-300">{item.unitName}</td>

                        <td className="p-3.5 text-right font-mono text-slate-300">
                          {formatMoney(item.purchasePrice)}
                        </td>

                        <td className="p-3.5 text-center font-bold font-mono">
                          {activeInventory.isBlindCount && !isCompleted ? (
                            <span className="text-purple-400 text-xs italic">Masqué</span>
                          ) : (
                            <span className="text-slate-200">{item.theoreticalQty}</span>
                          )}
                        </td>

                        {/* PHYSICAL COUNT INPUT CELL */}
                        <td className="p-3.5 text-center bg-blue-950/20">
                          {isCompleted ? (
                            <span className="font-black text-sm text-white font-mono">
                              {item.physicalQty !== null ? item.physicalQty : '-'}
                            </span>
                          ) : (
                            <div className="inline-flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const cur = item.physicalQty ?? item.theoreticalQty;
                                  handleItemCountChange(item.id, Math.max(0, cur - 1));
                                }}
                                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-700"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={item.physicalQty !== null ? item.physicalQty : ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0);
                                  handleItemCountChange(item.id, val);
                                }}
                                placeholder="Saisir..."
                                className={`w-20 text-center font-mono font-bold py-1 px-1 rounded-lg text-xs border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                                  item.physicalQty === null
                                    ? 'bg-slate-800 text-slate-400 border-slate-700'
                                    : isMatching
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-600 font-black'
                                    : isLoss
                                    ? 'bg-rose-950 text-rose-300 border-rose-600 font-black'
                                    : 'bg-blue-950 text-blue-300 border-blue-600 font-black'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const cur = item.physicalQty ?? item.theoreticalQty;
                                  handleItemCountChange(item.id, cur + 1);
                                }}
                                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-700"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </td>

                        {/* VARIANCE QTY BADGE */}
                        <td className="p-3.5 text-center">
                          {hasCount ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                                isMatching
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : isLoss
                                  ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                  : 'bg-blue-950 text-blue-400 border border-blue-800'
                              }`}
                            >
                              {item.varianceQty > 0 ? `+${item.varianceQty}` : item.varianceQty}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">En attente</span>
                          )}
                        </td>

                        {/* VARIANCE COST */}
                        <td className="p-3.5 text-right font-mono font-bold">
                          {hasCount ? (
                            <span
                              className={
                                isLoss
                                  ? 'text-rose-400'
                                  : isGain
                                  ? 'text-emerald-400'
                                  : 'text-slate-400'
                              }
                            >
                              {item.varianceCost > 0 ? '+' : ''}
                              {formatMoney(item.varianceCost)}
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>

                        {/* VARIANCE REASON INPUT */}
                        <td className="p-3.5">
                          {isCompleted ? (
                            <span className="text-slate-300 text-xs">
                              {item.varianceReason || (item.varianceQty === 0 ? 'Conforme' : '-')}
                            </span>
                          ) : (
                            <div className="flex items-center space-x-1.5">
                              <select
                                value={item.varianceReason || ''}
                                onChange={(e) =>
                                  handleItemCountChange(item.id, item.physicalQty, e.target.value)
                                }
                                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg p-1.5 focus:border-blue-500 focus:outline-none"
                              >
                                <option value="">Motif / Cause...</option>
                                <option value="Conforme">Conforme</option>
                                <option value="Casse / Abîmé non déclaré">Casse / Abîmé non déclaré</option>
                                <option value="Vol / Disparition présumée">Vol / Disparition présumée</option>
                                <option value="Produit périmé / Déclassé">Produit périmé / Déclassé</option>
                                <option value="Erreur de comptage précédent">Erreur de comptage précédent</option>
                                <option value="Surplus livraison fournisseur">Surplus livraison fournisseur</option>
                                <option value="Erreur de saisie vente / caisse">Erreur de saisie vente / caisse</option>
                                <option value="Autre ajustement">Autre motif</option>
                              </select>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GLOBAL VARIANCE & DISCREPANCY ANALYSIS */}
      {activeTab === 'variances' && (
        <div className="space-y-4">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <span>Historique des Écarts Constatés par Inventaire</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Synthèse des pertes et surplus physiques enregistrés lors des différentes campagnes
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {businessInventories.map((inv) => {
                const loc = state.locations.find((l) => l.id === inv.locationId);
                const varianceItems = inv.items.filter((i) => i.isCounted && i.varianceQty !== 0);

                return (
                  <div
                    key={inv.id}
                    className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div>
                        <div className="font-mono text-xs font-bold text-blue-400">
                          {inv.referenceNo}
                        </div>
                        <div className="font-bold text-xs text-white truncate max-w-[150px]">
                          {inv.title}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          inv.status === 'completed'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {inv.status === 'completed' ? 'Clôturé' : 'En cours'}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Magasin :</span>
                        <span className="text-slate-200 font-semibold">{loc?.name}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Réf avec écarts :</span>
                        <span className="text-amber-400 font-bold">{varianceItems.length} article(s)</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Exactitude :</span>
                        <span className="text-blue-400 font-bold">{inv.accuracyRate}%</span>
                      </div>
                      <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-900">
                        <span>Impact financier :</span>
                        <span
                          className={`font-mono font-bold ${
                            inv.totalVarianceCost < 0
                              ? 'text-rose-400'
                              : inv.totalVarianceCost > 0
                              ? 'text-emerald-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {inv.totalVarianceCost > 0 ? '+' : ''}
                          {formatMoney(inv.totalVarianceCost)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-2">
                      <button
                        onClick={() => {
                          setSelectedInventoryId(inv.id);
                          setActiveTab('active_count');
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700"
                      >
                        Voir les lignes
                      </button>
                      <button
                        onClick={() => {
                          setSelectedInventoryId(inv.id);
                          setPrintMode('pv');
                          setShowPrintModal(true);
                        }}
                        className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg text-xs font-semibold border border-blue-500/30"
                      >
                        PV d'Inventaire
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CSV DATA EXPORTS */}
      {activeTab === 'exports' && (
        <InventoryDataExportView onBackToCampaigns={() => setActiveTab('campaigns')} />
      )}

      {/* CREATE INVENTORY MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 w-full max-w-xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Lancer une Campagne d'Inventaire</h3>
                  <p className="text-xs text-slate-400">
                    Prend un instantané (snapshot) des stocks théoriques du magasin sélectionné
                  </p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Référence d'Inventaire *
                  </label>
                  <input
                    type="text"
                    required
                    value={newRef}
                    onChange={(e) => setNewRef(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 font-mono font-bold focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Date de Début *
                  </label>
                  <input
                    type="date"
                    required
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Intitulé / Titre de la Campagne *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Inventaire Trimestriel Informatique & Smartphones"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 focus:border-blue-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Magasin / Emplacement Cible *
                  </label>
                  <select
                    required
                    value={newLocationId}
                    onChange={(e) => setNewLocationId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 focus:border-blue-500 font-bold"
                  >
                    {state.locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Périmètre de l'Inventaire *
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 focus:border-blue-500 font-semibold"
                  >
                    <option value="full">Inventaire Complet (Tous les articles)</option>
                    <option value="partial">Inventaire Partiel / Catégoriel</option>
                  </select>
                </div>
              </div>

              {/* CATEGORY SELECTION IF PARTIAL */}
              {newType === 'partial' && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <label className="block text-slate-300 font-semibold">
                    Sélectionner les catégories à inventorier :
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {state.categories
                      .filter((c) => c.businessId === currentBusiness.id)
                      .map((cat) => {
                        const checked = newSelectedCategories.includes(cat.id);
                        return (
                          <label
                            key={cat.id}
                            className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer text-xs ${
                              checked
                                ? 'bg-blue-900/30 border-blue-600 text-white'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewSelectedCategories([...newSelectedCategories, cat.id]);
                                } else {
                                  setNewSelectedCategories(
                                    newSelectedCategories.filter((id) => id !== cat.id)
                                  );
                                }
                              }}
                              className="rounded text-blue-600 focus:ring-0"
                            />
                            <span className="truncate">{cat.name}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Agent Responsable du Comptage *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCountedBy}
                    onChange={(e) => setNewCountedBy(e.target.value)}
                    placeholder="Nom du responsable"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Superviseur / Auditeur (Optionnel)
                  </label>
                  <input
                    type="text"
                    value={newSupervisedBy}
                    onChange={(e) => setNewSupervisedBy(e.target.value)}
                    placeholder="Nom de l'auditeur / chef magasin"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* BLIND COUNT TOGGLE */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5 pr-4">
                  <div className="font-bold text-white flex items-center space-x-1.5">
                    <EyeOff className="w-4 h-4 text-purple-400" />
                    <span>Mode Comptage à l'Aveugle (Blind Count)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Masque le stock théorique aux agents pendant la saisie pour garantir un comptage 100% objectif et impartial.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={newIsBlindCount}
                  onChange={(e) => setNewIsBlindCount(e.target.checked)}
                  className="w-5 h-5 rounded text-purple-600 bg-slate-800 border-slate-700 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Notes & Instructions particulières
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Consignes particulières pour l'équipe de comptage..."
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-950 flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Démarrer l'inventaire</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECONCILE CONFIRMATION MODAL */}
      {showReconcileConfirm && activeInventory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-emerald-400 border-b border-slate-800 pb-3">
              <div className="p-2 bg-emerald-500/20 rounded-xl">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">
                  Valider & Réconcilier le Stock
                </h3>
                <p className="text-xs text-slate-400">
                  Application immédiate des quantités physiques comptées
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                Vous êtes sur le point de clôturer l'inventaire{' '}
                <strong className="text-white font-bold">{activeInventory.referenceNo}</strong> pour le magasin{' '}
                <strong className="text-white">
                  {state.locations.find((l) => l.id === activeInventory.locationId)?.name}
                </strong>
                .
              </p>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Références totales inventoriées :</span>
                  <span className="text-white font-bold">{activeInventory.items.length} articles</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Références conformes :</span>
                  <span className="text-emerald-400 font-bold">
                    {activeInventory.items.filter((i) => i.isCounted && i.varianceQty === 0).length} articles (
                    {activeInventory.accuracyRate}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Références avec écarts :</span>
                  <span className="text-amber-400 font-bold">
                    {activeInventory.items.filter((i) => i.isCounted && i.varianceQty !== 0).length} articles
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-900">
                  <span className="text-slate-400">Impact Financier Net :</span>
                  <span
                    className={`font-mono font-bold ${
                      activeInventory.totalVarianceCost < 0
                        ? 'text-rose-400'
                        : activeInventory.totalVarianceCost > 0
                        ? 'text-emerald-400'
                        : 'text-white'
                    }`}
                  >
                    {activeInventory.totalVarianceCost > 0 ? '+' : ''}
                    {formatMoney(activeInventory.totalVarianceCost)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-950/40 rounded-lg border border-blue-800/50 text-[11px] text-blue-200 space-y-1">
                <p className="font-semibold flex items-center space-x-1">
                  <span>ℹ️ Conséquences de la validation :</span>
                </p>
                <ul className="list-disc pl-4 space-y-0.5 text-blue-300">
                  <li>Les stocks du magasin seront immédiatement mis à jour avec les quantités physiques comptées.</li>
                  <li>Des mouvements d'ajustement de stock traçables seront automatiquement créés pour chaque écart.</li>
                  <li>Le statut de l'inventaire passera à "Clôturé" et sera archivé.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowReconcileConfirm(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700"
              >
                Continuer le comptage
              </button>
              <button
                type="button"
                onClick={() => {
                  reconcileStockInventory(activeInventory.id);
                  setShowReconcileConfirm(false);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-950 flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirmer et Appliquer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE INVENTORY MODAL */}
      {deletingInventory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400 border-b border-slate-800 pb-3">
              <div className="p-2 bg-rose-500/20 rounded-xl">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Supprimer l'Inventaire</h3>
                <p className="text-xs text-slate-400">Action irréversible</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <p>
                Êtes-vous sûr de vouloir supprimer l'inventaire{' '}
                <strong className="text-white font-bold">"{deletingInventory.referenceNo}"</strong> (
                {deletingInventory.title}) ?
              </p>
              <p className="text-[11px] text-slate-400">
                Toutes les feuilles de comptage et annotations associées à cette session seront définitivement effacées.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingInventory(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteStockInventory(deletingInventory.id);
                  if (selectedInventoryId === deletingInventory.id) {
                    setSelectedInventoryId(null);
                    setActiveTab('campaigns');
                  }
                  setDeletingInventory(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-md shadow-rose-950"
              >
                Oui, Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE REPORT / PV MODAL */}
      {showPrintModal && selectedInventoryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-4xl p-6 sm:p-8 shadow-2xl space-y-6 my-auto">
            {/* SCREEN ACTION BAR (HIDDEN IN PRINT) */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 print:hidden">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 text-sm">
                  {printMode === 'pv' ? 'Procès-Verbal d’Inventaire' : 'Fiche de Comptage Terrain Vierge'}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  ({activeInventory?.referenceNo})
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPrintMode(printMode === 'pv' ? 'blank' : 'pv')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Basculer vers : {printMode === 'pv' ? 'Fiche Vierge Terrain' : 'Procès-Verbal'}
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer / Exporter PDF</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PRINTABLE DOCUMENT BODY */}
            {activeInventory && (
              <div className="space-y-6 text-xs text-slate-800">
                {/* HEADER */}
                <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">{currentBusiness.name}</h2>
                    <p className="text-xs text-slate-600">
                      {state.locations.find((l) => l.id === activeInventory.locationId)?.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {state.locations.find((l) => l.id === activeInventory.locationId)?.address} -{' '}
                      {state.locations.find((l) => l.id === activeInventory.locationId)?.city}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-blue-900 uppercase">
                      {printMode === 'pv' ? "Procès-Verbal d'Inventaire" : "Feuille de Comptage Physique"}
                    </div>
                    <div className="font-mono text-xs font-bold text-slate-700">
                      N° {activeInventory.referenceNo}
                    </div>
                    <div className="text-[11px] text-slate-500">Date : {activeInventory.startDate}</div>
                  </div>
                </div>

                {/* INVENTORY INFO SUMMARY */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Titre :</div>
                    <div className="font-bold text-slate-900">{activeInventory.title}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Responsable :</div>
                    <div className="font-bold text-slate-900">{activeInventory.countedBy}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Superviseur :</div>
                    <div className="font-bold text-slate-900">{activeInventory.supervisedBy || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Taux Exactitude :</div>
                    <div className="font-black text-blue-700">{activeInventory.accuracyRate}%</div>
                  </div>
                </div>

                {/* PRINT ITEMS TABLE */}
                <table className="w-full text-left text-xs border-collapse border border-slate-300">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="border border-slate-300 p-2">N°</th>
                      <th className="border border-slate-300 p-2">Désignation Produit</th>
                      <th className="border border-slate-300 p-2">SKU</th>
                      <th className="border border-slate-300 p-2 text-center">Unité</th>
                      {printMode === 'pv' && (
                        <th className="border border-slate-300 p-2 text-center">Stock Théorique</th>
                      )}
                      <th className="border border-slate-300 p-2 text-center bg-slate-50">
                        {printMode === 'pv' ? 'Stock Physique' : 'Comptage Réel (Physique)'}
                      </th>
                      {printMode === 'pv' && (
                        <>
                          <th className="border border-slate-300 p-2 text-center">Écart Qté</th>
                          <th className="border border-slate-300 p-2 text-right">Écart Valeur</th>
                          <th className="border border-slate-300 p-2">Motif Constaté</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {activeInventory.items.map((item, idx) => (
                      <tr key={item.id} className="border-b border-slate-200">
                        <td className="border border-slate-300 p-2 text-center text-slate-500 font-mono text-[10px]">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-300 p-2 font-bold text-slate-900">
                          {item.productName}
                        </td>
                        <td className="border border-slate-300 p-2 font-mono text-[11px] text-slate-600">
                          {item.sku}
                        </td>
                        <td className="border border-slate-300 p-2 text-center text-slate-600">
                          {item.unitName}
                        </td>

                        {printMode === 'pv' && (
                          <td className="border border-slate-300 p-2 text-center font-mono font-bold">
                            {item.theoreticalQty}
                          </td>
                        )}

                        <td className="border border-slate-300 p-2 text-center font-mono font-bold bg-slate-50">
                          {printMode === 'pv' ? (
                            item.physicalQty !== null ? item.physicalQty : '-'
                          ) : (
                            <span className="text-slate-300 font-normal">..................</span>
                          )}
                        </td>

                        {printMode === 'pv' && (
                          <>
                            <td className="border border-slate-300 p-2 text-center font-mono font-bold">
                              <span
                                className={
                                  item.varianceQty < 0
                                    ? 'text-rose-600'
                                    : item.varianceQty > 0
                                    ? 'text-emerald-600'
                                    : 'text-slate-700'
                                }
                              >
                                {item.varianceQty > 0 ? `+${item.varianceQty}` : item.varianceQty}
                              </span>
                            </td>
                            <td className="border border-slate-300 p-2 text-right font-mono font-bold">
                              <span
                                className={
                                  item.varianceCost < 0
                                    ? 'text-rose-600'
                                    : item.varianceCost > 0
                                    ? 'text-emerald-600'
                                    : 'text-slate-700'
                                }
                              >
                                {item.varianceCost > 0 ? '+' : ''}
                                {formatMoney(item.varianceCost)}
                              </span>
                            </td>
                            <td className="border border-slate-300 p-2 text-[11px] text-slate-600">
                              {item.varianceReason || (item.varianceQty === 0 ? 'Conforme' : '-')}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* SUMMARY FINANCIALS IN PV */}
                {printMode === 'pv' && (
                  <div className="flex justify-end">
                    <div className="w-72 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total Références :</span>
                        <span className="font-bold">{activeInventory.items.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Taux de conformité :</span>
                        <span className="font-bold text-blue-700">{activeInventory.accuracyRate}%</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-300">
                        <span className="font-bold text-slate-900">Écart Net Global :</span>
                        <span
                          className={`font-mono font-black ${
                            activeInventory.totalVarianceCost < 0
                              ? 'text-rose-600'
                              : activeInventory.totalVarianceCost > 0
                              ? 'text-emerald-600'
                              : 'text-slate-900'
                          }`}
                        >
                          {activeInventory.totalVarianceCost > 0 ? '+' : ''}
                          {formatMoney(activeInventory.totalVarianceCost)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* SIGNATURES BLOCK */}
                <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-300 text-center text-xs">
                  <div className="space-y-10">
                    <div className="font-bold text-slate-800">L'Agent de Comptage</div>
                    <div className="text-[11px] text-slate-500">(Nom & Signature)</div>
                  </div>
                  <div className="space-y-10">
                    <div className="font-bold text-slate-800">Le Responsable Magasin</div>
                    <div className="text-[11px] text-slate-500">(Nom & Signature)</div>
                  </div>
                  <div className="space-y-10">
                    <div className="font-bold text-slate-800">La Direction Générale</div>
                    <div className="text-[11px] text-slate-500">(Visa & Cachet)</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
