import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Product, StockTransfer, StockAdjustment } from '../../types';
import {
  Package,
  ArrowRightLeft,
  Sliders,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  RefreshCw,
  FileText,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { StockTransferModal } from './StockTransferModal';

export const StockMovementView: React.FC = () => {
  const {
    state,
    currentBusiness,
    currentLocation,
    updateStockTransfer,
    deleteStockTransfer,
    updateStockAdjustment,
    deleteStockAdjustment,
  } = useERP();

  const [activeTab, setActiveTab] = useState<'matrix' | 'transfers' | 'audit' | 'adjustments'>('matrix');

  // Modals state
  const [stockAdjProduct, setStockAdjProduct] = useState<Product | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferModalProduct, setTransferModalProduct] = useState<Product | undefined>(undefined);

  // Transfer edit / delete states
  const [editingTransfer, setEditingTransfer] = useState<StockTransfer | null>(null);
  const [deletingTransfer, setDeletingTransfer] = useState<StockTransfer | null>(null);

  // Adjustment edit / delete states
  const [editingAdjustment, setEditingAdjustment] = useState<StockAdjustment | null>(null);
  const [deletingAdjustment, setDeletingAdjustment] = useState<StockAdjustment | null>(null);

  // Edit Transfer Form States
  const [editTrfRef, setEditTrfRef] = useState('');
  const [editTrfFrom, setEditTrfFrom] = useState('');
  const [editTrfTo, setEditTrfTo] = useState('');
  const [editTrfProductId, setEditTrfProductId] = useState('');
  const [editTrfQty, setEditTrfQty] = useState(1);
  const [editTrfDate, setEditTrfDate] = useState('');
  const [editTrfStatus, setEditTrfStatus] = useState<'pending' | 'in_transit' | 'completed' | 'cancelled'>('completed');
  const [editTrfNotes, setEditTrfNotes] = useState('');

  // Edit Adjustment Form States
  const [editAdjRef, setEditAdjRef] = useState('');
  const [editAdjLocationId, setEditAdjLocationId] = useState('');
  const [editAdjProductId, setEditAdjProductId] = useState('');
  const [editAdjType, setEditAdjType] = useState<StockAdjustment['type']>('damage');
  const [editAdjQty, setEditAdjQty] = useState(1);
  const [editAdjDate, setEditAdjDate] = useState('');
  const [editAdjReason, setEditAdjReason] = useState('');

  const handleOpenEditTransfer = (t: StockTransfer) => {
    setEditingTransfer(t);
    setEditTrfRef(t.referenceNo);
    setEditTrfFrom(t.fromLocationId);
    setEditTrfTo(t.toLocationId);
    setEditTrfProductId(t.productId);
    setEditTrfQty(t.quantity);
    setEditTrfDate(t.date);
    setEditTrfStatus(t.status);
    setEditTrfNotes(t.notes || '');
  };

  const handleSaveEditTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransfer || editTrfQty <= 0) return;
    if (editTrfFrom === editTrfTo) {
      alert("Le magasin de destination doit être différent du magasin d'origine.");
      return;
    }

    const updated: StockTransfer = {
      ...editingTransfer,
      referenceNo: editTrfRef,
      fromLocationId: editTrfFrom,
      toLocationId: editTrfTo,
      productId: editTrfProductId,
      quantity: editTrfQty,
      date: editTrfDate,
      status: editTrfStatus,
      notes: editTrfNotes,
    };

    updateStockTransfer(updated);
    setEditingTransfer(null);
  };

  const handleConfirmDeleteTransfer = () => {
    if (!deletingTransfer) return;
    deleteStockTransfer(deletingTransfer.id);
    setDeletingTransfer(null);
  };

  const handleOpenEditAdjustment = (a: StockAdjustment) => {
    setEditingAdjustment(a);
    setEditAdjRef(a.referenceNo);
    setEditAdjLocationId(a.locationId);
    setEditAdjProductId(a.productId);
    setEditAdjType(a.type);
    setEditAdjQty(a.quantity);
    setEditAdjDate(a.date);
    setEditAdjReason(a.reason);
  };

  const handleSaveEditAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdjustment || editAdjQty <= 0) return;

    const updated: StockAdjustment = {
      ...editingAdjustment,
      referenceNo: editAdjRef,
      locationId: editAdjLocationId,
      productId: editAdjProductId,
      type: editAdjType,
      quantity: editAdjQty,
      date: editAdjDate,
      reason: editAdjReason,
    };

    updateStockAdjustment(updated);
    setEditingAdjustment(null);
  };

  const handleConfirmDeleteAdjustment = () => {
    if (!deletingAdjustment) return;
    deleteStockAdjustment(deletingAdjustment.id);
    setDeletingAdjustment(null);
  };

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [movementTypeFilter, setMovementTypeFilter] = useState<'all' | 'in' | 'out' | 'transfer'>('all');

  const businessLocations = state.locations.filter((l) => l.businessId === currentBusiness.id);
  const businessProducts = state.products.filter((p) => p.businessId === currentBusiness.id);
  const businessTransfers = (state.stockTransfers || []).filter((t) => t.businessId === currentBusiness.id);
  const businessAdjustments = state.stockAdjustments.filter((a) => a.businessId === currentBusiness.id);

  // Calculate Key Inventory Metrics
  let totalStockUnits = 0;
  let totalStockCost = 0;
  let totalStockSalesValue = 0;
  let lowStockItemCount = 0;

  businessProducts.forEach((p) => {
    businessLocations.forEach((loc) => {
      const qty = p.locationStock[loc.id] ?? 0;
      totalStockUnits += qty;
      totalStockCost += qty * p.purchasePrice;
      totalStockSalesValue += qty * p.sellingPrice;
      if (qty <= p.alertQuantity) {
        lowStockItemCount += 1;
      }
    });
  });

  // Build Unified Stock Movements Audit Log (Entrées, Sorties, Transferts)
  interface UnifiedMovement {
    id: string;
    date: string;
    type: 'purchase_in' | 'sale_out' | 'adj_add' | 'adj_sub' | 'transfer';
    category: 'in' | 'out' | 'transfer';
    productName: string;
    sku: string;
    quantity: number;
    locationName: string;
    destinationName?: string;
    reference: string;
    userOrContact: string;
    notes?: string;
  }

  const unifiedMovements: UnifiedMovement[] = [];

  // 1. Purchases (Entrées)
  state.purchases
    .filter((p) => p.businessId === currentBusiness.id && p.status === 'received')
    .forEach((pur) => {
      const loc = businessLocations.find((l) => l.id === pur.locationId);
      const supplier = state.contacts.find((c) => c.id === pur.supplierId);
      pur.items.forEach((item, idx) => {
        const prod = businessProducts.find((p) => p.id === item.productId);
        unifiedMovements.push({
          id: `mv-pur-${pur.id}-${idx}`,
          date: pur.purchaseDate,
          type: 'purchase_in',
          category: 'in',
          productName: item.productName,
          sku: prod ? prod.sku : '-',
          quantity: item.quantity,
          locationName: loc ? loc.name : 'Emplacement inconnu',
          reference: pur.referenceNo,
          userOrContact: supplier ? supplier.name : 'Fournisseur',
          notes: pur.notes || 'Entrée stock via achat fournisseur',
        });
      });
    });

  // 2. Sales (Sorties)
  state.sales
    .filter((s) => s.businessId === currentBusiness.id && s.status === 'final')
    .forEach((sal) => {
      const loc = businessLocations.find((l) => l.id === sal.locationId);
      const customer = state.contacts.find((c) => c.id === sal.customerId);
      sal.items.forEach((item, idx) => {
        const prod = businessProducts.find((p) => p.id === item.productId);
        unifiedMovements.push({
          id: `mv-sal-${sal.id}-${idx}`,
          date: sal.saleDate,
          type: 'sale_out',
          category: 'out',
          productName: item.productName,
          sku: prod ? prod.sku : '-',
          quantity: item.quantity,
          locationName: loc ? loc.name : 'Emplacement inconnu',
          reference: sal.invoiceNo,
          userOrContact: customer ? customer.name : 'Client de passage',
          notes: 'Sortie stock via vente client',
        });
      });
    });

  // 3. Adjustments (Entrées & Sorties)
  businessAdjustments.forEach((adj) => {
    const loc = businessLocations.find((l) => l.id === adj.locationId);
    const prod = businessProducts.find((p) => p.id === adj.productId);
    const isAdd = adj.type === 'correction_add';
    unifiedMovements.push({
      id: `mv-adj-${adj.id}`,
      date: adj.date,
      type: isAdd ? 'adj_add' : 'adj_sub',
      category: isAdd ? 'in' : 'out',
      productName: prod ? prod.name : 'Produit inconnu',
      sku: prod ? prod.sku : '-',
      quantity: adj.quantity,
      locationName: loc ? loc.name : 'Emplacement inconnu',
      reference: adj.referenceNo,
      userOrContact: 'Ajustement Inventaire',
      notes: `${adj.type.toUpperCase()}: ${adj.reason}`,
    });
  });

  // 4. Transfers (Mouvements inter-magasins)
  businessTransfers.forEach((trf) => {
    const srcLoc = businessLocations.find((l) => l.id === trf.fromLocationId);
    const destLoc = businessLocations.find((l) => l.id === trf.toLocationId);
    const prod = businessProducts.find((p) => p.id === trf.productId);
    unifiedMovements.push({
      id: `mv-trf-${trf.id}`,
      date: trf.date,
      type: 'transfer',
      category: 'transfer',
      productName: prod ? prod.name : 'Produit inconnu',
      sku: prod ? prod.sku : '-',
      quantity: trf.quantity,
      locationName: srcLoc ? srcLoc.name : 'Origine inconnue',
      destinationName: destLoc ? destLoc.name : 'Destination inconnue',
      reference: trf.referenceNo,
      userOrContact: trf.createdBy || 'Responsable Stock',
      notes: trf.notes || 'Transfert de stock inter-magasins',
    });
  });

  // Sort movements newest date first
  unifiedMovements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Filter unified movements
  const filteredMovements = unifiedMovements.filter((m) => {
    if (movementTypeFilter !== 'all' && m.category !== movementTypeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        m.productName.toLowerCase().includes(q) ||
        m.sku.toLowerCase().includes(q) ||
        m.reference.toLowerCase().includes(q) ||
        m.locationName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered Products for Stock Grid/Matrix
  const filteredProducts = businessProducts.filter((p) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 text-white">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3.5 min-w-0">
          <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30 shrink-0">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-black text-white">Gestion & Transferts de Stock Multi-Magasins</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Consultez le stock par magasin, gérez les transferts inter-magasins et suivez toutes les entrées et sorties.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0 w-full md:w-auto">
          <button
            onClick={() => {
              setTransferModalProduct(undefined);
              setShowTransferModal(true);
            }}
            className="w-full md:w-auto flex items-center justify-center space-x-2 px-4 min-h-[44px] sm:min-h-[40px] py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-900/30 transition-all whitespace-nowrap"
          >
            <ArrowRightLeft className="w-4 h-4 shrink-0" />
            <span>Nouveau Transfert</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quantité en Stock Total</div>
            <div className="text-xl font-black text-white tabular-nums">{totalStockUnits.toLocaleString('fr-FR')} <span className="text-xs text-slate-400 font-normal">unités</span></div>
            <div className="text-[10px] text-emerald-400 mt-0.5 font-semibold">Reparti sur {businessLocations.length} magasin(s)</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center space-x-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Valeur Stock (Achat)</div>
            <div className="text-xl font-black text-blue-400 tabular-nums">{totalStockCost.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Valeur d'achat cumulée</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center space-x-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 shrink-0">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Transferts Inter-Magasins</div>
            <div className="text-xl font-black text-amber-300 tabular-nums">{businessTransfers.length}</div>
            <div className="text-[10px] text-amber-400/80 mt-0.5 font-medium">Historique des mouvements inter-dépôts</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center space-x-4">
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Stock Faible / Alerte</div>
            <div className="text-xl font-black text-rose-400 tabular-nums">{lowStockItemCount}</div>
            <div className="text-[10px] text-rose-400/80 mt-0.5 font-medium">Emplacements en rupture imminente</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-1.5 border-b border-slate-800 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center space-x-2 px-4 min-h-[42px] sm:min-h-[38px] py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'matrix'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4 shrink-0" />
          <span>Consultation du Stock par Magasin</span>
        </button>

        <button
          onClick={() => setActiveTab('transfers')}
          className={`flex items-center space-x-2 px-4 min-h-[42px] sm:min-h-[38px] py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'transfers'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4 shrink-0" />
          <span>Transferts Inter-Magasins ({businessTransfers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center space-x-2 px-4 min-h-[42px] sm:min-h-[38px] py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'audit'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>Suivi des Entrées & Sorties (Journal)</span>
        </button>

        <button
          onClick={() => setActiveTab('adjustments')}
          className={`flex items-center space-x-2 px-4 min-h-[42px] sm:min-h-[38px] py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'adjustments'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4 shrink-0" />
          <span>Ajustements & Pertes ({businessAdjustments.length})</span>
        </button>
      </div>

      {/* TAB 1: STORE STOCK MATRIX */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrer par nom de produit, SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 text-white pl-9 pr-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="text-xs text-slate-400 font-semibold shrink-0">
              {filteredProducts.length} produit(s) affiché(s)
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[680px]">
              <thead className="bg-slate-950 border-b border-slate-800 uppercase text-[10px] font-bold text-slate-400">
                <tr>
                  <th className="p-3.5 min-w-[200px]">Produit</th>
                  <th className="p-3.5 min-w-[120px]">SKU</th>
                  {businessLocations.map((loc) => (
                    <th key={loc.id} className="p-3.5 text-center min-w-[140px] bg-slate-900/50 border-l border-slate-800/80">
                      <div className="font-extrabold text-blue-300">{loc.name}</div>
                      <div className="text-[9px] text-slate-500 font-normal font-mono">{loc.code}</div>
                    </th>
                  ))}
                  <th className="p-3.5 text-center min-w-[110px] bg-slate-950 font-bold text-emerald-400">Stock Total</th>
                  <th className="p-3.5 text-right min-w-[130px]">Actions Rapides</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredProducts.map((prd) => {
                  const totalStock = (Object.values(prd.locationStock) as number[]).reduce((a, b) => a + b, 0);

                  return (
                    <tr key={prd.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5 font-bold text-white flex items-center space-x-2.5">
                        {prd.image ? (
                          <img src={prd.image} alt={prd.name} className="w-9 h-9 rounded-lg object-cover border border-slate-700 shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 text-slate-400 font-bold">
                            {prd.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="text-slate-100 font-bold">{prd.name}</div>
                          <div className="text-[10px] text-slate-400">
                            Seuil d'alerte: {prd.alertQuantity} pcs
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono text-slate-300 font-semibold">{prd.sku}</td>

                      {/* Quantity per store columns */}
                      {businessLocations.map((loc) => {
                        const locQty = prd.locationStock[loc.id] ?? 0;
                        const isLow = locQty <= prd.alertQuantity;

                        return (
                          <td key={loc.id} className="p-3.5 text-center border-l border-slate-800/80">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-lg font-black text-xs ${
                                locQty === 0
                                  ? 'bg-rose-950/80 text-rose-400 border border-rose-800'
                                  : isLow
                                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                                  : 'bg-slate-800 text-slate-100 border border-slate-700'
                              }`}
                            >
                              {locQty} pcs
                            </span>
                          </td>
                        );
                      })}

                      <td className="p-3.5 text-center bg-slate-950/40">
                        <span className="px-3 py-1 bg-emerald-950/90 text-emerald-300 font-black rounded-lg border border-emerald-800 text-xs">
                          {totalStock} pcs
                        </span>
                      </td>

                      <td className="p-3.5 text-right space-x-1">
                        <button
                          onClick={() => {
                            setTransferModalProduct(prd);
                            setShowTransferModal(true);
                          }}
                          className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg border border-blue-500/30 text-xs font-bold transition-all"
                          title="Transférer vers un autre magasin"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 inline mr-1" />
                          <span>Transférer</span>
                        </button>

                        <button
                          onClick={() => setStockAdjProduct(prd)}
                          className="px-2 py-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white rounded-lg border border-amber-500/30 text-xs font-bold transition-all"
                          title="Ajuster le stock"
                        >
                          <Sliders className="w-3.5 h-3.5 inline" />
                        </button>
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

      {/* TAB 2: INTER-STORE TRANSFERS LOG */}
      {activeTab === 'transfers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-xl border border-slate-800">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher transfert par référence, produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 text-white pl-9 pr-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              onClick={() => {
                setTransferModalProduct(undefined);
                setShowTransferModal(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center space-x-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Transfert</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[820px]">
              <thead className="bg-slate-950 border-b border-slate-800 uppercase text-[10px] font-bold text-slate-400">
                <tr>
                  <th className="p-3.5">Référence & Date</th>
                  <th className="p-3.5">Magasin D'Origine</th>
                  <th className="p-3.5 text-center">⇄</th>
                  <th className="p-3.5">Magasin De Destination</th>
                  <th className="p-3.5">Produit Transféré</th>
                  <th className="p-3.5 text-center">Quantité</th>
                  <th className="p-3.5 text-center">Statut</th>
                  <th className="p-3.5">Initié par / Notes</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {businessTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      Aucun transfert de stock enregistré.
                    </td>
                  </tr>
                ) : (
                  businessTransfers
                    .filter((t) => {
                      if (searchQuery) {
                        const q = searchQuery.toLowerCase();
                        const p = businessProducts.find((prod) => prod.id === t.productId);
                        return (
                          t.referenceNo.toLowerCase().includes(q) ||
                          (p && p.name.toLowerCase().includes(q))
                        );
                      }
                      return true;
                    })
                    .map((trf) => {
                      const srcLoc = businessLocations.find((l) => l.id === trf.fromLocationId);
                      const destLoc = businessLocations.find((l) => l.id === trf.toLocationId);
                      const prod = businessProducts.find((p) => p.id === trf.productId);

                      return (
                        <tr key={trf.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="p-3.5 font-bold text-white">
                            <div className="font-mono text-blue-400">{trf.referenceNo}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{trf.date}</div>
                          </td>

                          <td className="p-3.5">
                            <span className="font-bold text-amber-300">{srcLoc ? srcLoc.name : '-'}</span>
                          </td>

                          <td className="p-3.5 text-center text-slate-400">
                            <ArrowRightLeft className="w-4 h-4 inline text-blue-400" />
                          </td>

                          <td className="p-3.5">
                            <span className="font-bold text-blue-300">{destLoc ? destLoc.name : '-'}</span>
                          </td>

                          <td className="p-3.5 font-semibold text-white">
                            {prod ? (
                              <div>
                                <div>{prod.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">SKU: {prod.sku}</div>
                              </div>
                            ) : (
                              'Produit inconnu'
                            )}
                          </td>

                          <td className="p-3.5 text-center font-black text-amber-300 text-sm">
                            {trf.quantity} pcs
                          </td>

                          <td className="p-3.5 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold inline-flex items-center space-x-1 ${
                                trf.status === 'completed'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : trf.status === 'pending'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-rose-950 text-rose-300 border border-rose-800'
                              }`}
                            >
                              {trf.status === 'completed' ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>Terminé</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  <span>En attente</span>
                                </>
                              )}
                            </span>
                          </td>

                          <td className="p-3.5 text-slate-300 text-[11px]">
                            <div className="font-bold text-slate-200">{trf.createdBy || 'Système'}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{trf.notes || '-'}</div>
                          </td>

                          <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                            <button
                              onClick={() => handleOpenEditTransfer(trf)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-xs font-semibold inline-flex items-center space-x-1"
                              title="Modifier le transfert"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                              <span>Modifier</span>
                            </button>
                            <button
                              onClick={() => setDeletingTransfer(trf)}
                              className="px-2 py-1 bg-slate-800 hover:bg-rose-950/80 text-rose-400 hover:text-rose-300 rounded-lg border border-slate-700 hover:border-rose-800 text-xs font-semibold inline-flex items-center space-x-1 transition-colors"
                              title="Supprimer le transfert"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Supprimer</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: UNIFIED AUDIT LOG (ENTRÉES & SORTIES & TRANSFERTS) */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-xl border border-slate-800">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher mouvement, produit, référence..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 text-white pl-9 pr-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400 font-semibold shrink-0">Type de Mouvement:</span>
              <select
                value={movementTypeFilter}
                onChange={(e) => setMovementTypeFilter(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-1.5 font-bold focus:outline-none"
              >
                <option value="all">Tous les mouvements</option>
                <option value="in">Entrées en Stock (+)</option>
                <option value="out">Sorties de Stock (-)</option>
                <option value="transfer">Transferts Inter-Magasins (⇄)</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[740px]">
              <thead className="bg-slate-950 border-b border-slate-800 uppercase text-[10px] font-bold text-slate-400">
                <tr>
                  <th className="p-3.5">Date & Référence</th>
                  <th className="p-3.5">Nature Mouvement</th>
                  <th className="p-3.5">Produit & SKU</th>
                  <th className="p-3.5">Emplacement / Magasin</th>
                  <th className="p-3.5 text-center">Quantité</th>
                  <th className="p-3.5">Origine / Destination / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredMovements.map((mv) => {
                  const isIn = mv.category === 'in';
                  const isOut = mv.category === 'out';
                  const isTrf = mv.category === 'transfer';

                  return (
                    <tr key={mv.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5 font-semibold text-white">
                        <div className="font-mono text-slate-300">{mv.reference}</div>
                        <div className="text-[10px] text-slate-400">{mv.date}</div>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center space-x-1 ${
                            isIn
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : isOut
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-blue-950 text-blue-300 border border-blue-800'
                          }`}
                        >
                          {isIn && (
                            <>
                              <ArrowDownRight className="w-3 h-3 text-emerald-400" />
                              <span>Entrée (+)</span>
                            </>
                          )}
                          {isOut && (
                            <>
                              <ArrowUpRight className="w-3 h-3 text-rose-400" />
                              <span>Sortie (-)</span>
                            </>
                          )}
                          {isTrf && (
                            <>
                              <ArrowRightLeft className="w-3 h-3 text-blue-400" />
                              <span>Transfert (⇄)</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="p-3.5 font-bold text-slate-100">
                        <div>{mv.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono font-normal">SKU: {mv.sku}</div>
                      </td>

                      <td className="p-3.5 font-semibold text-slate-200">
                        {mv.locationName}
                      </td>

                      <td className="p-3.5 text-center font-black text-sm">
                        <span
                          className={
                            isIn ? 'text-emerald-400' : isOut ? 'text-rose-400' : 'text-blue-400'
                          }
                        >
                          {isIn ? '+' : isOut ? '-' : ''}
                          {mv.quantity} pcs
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-300 text-[11px]">
                        {isTrf ? (
                          <div className="text-blue-300 font-bold">
                            Vers: {mv.destinationName}
                          </div>
                        ) : (
                          <div className="font-bold text-slate-300">{mv.userOrContact}</div>
                        )}
                        <div className="text-[10px] text-slate-400">{mv.notes}</div>
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

      {/* TAB 4: ADJUSTMENTS & LOSSES LOG */}
      {activeTab === 'adjustments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900 p-3.5 rounded-xl border border-slate-800">
            <h3 className="font-bold text-sm text-white">Historique des Ajustements de Stock & Pertes</h3>
            <div className="text-xs text-slate-400">
              Casse, vols, produits périmés et corrections manuelles d'inventaire.
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[760px]">
              <thead className="bg-slate-950 border-b border-slate-800 uppercase text-[10px] font-bold text-slate-400">
                <tr>
                  <th className="p-3.5">Référence & Date</th>
                  <th className="p-3.5">Magasin / Emplacement</th>
                  <th className="p-3.5">Type d'Ajustement</th>
                  <th className="p-3.5">Produit</th>
                  <th className="p-3.5 text-center">Quantité</th>
                  <th className="p-3.5">Motif / Justification</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {businessAdjustments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Aucun ajustement de stock enregistré.
                    </td>
                  </tr>
                ) : (
                  businessAdjustments.map((adj) => {
                    const loc = businessLocations.find((l) => l.id === adj.locationId);
                    const prod = businessProducts.find((p) => p.id === adj.productId);

                    return (
                      <tr key={adj.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-3.5 font-bold text-white">
                          <div className="font-mono text-amber-400">{adj.referenceNo}</div>
                          <div className="text-[10px] text-slate-400">{adj.date}</div>
                        </td>

                        <td className="p-3.5 font-semibold text-slate-200">
                          {loc ? loc.name : '-'}
                        </td>

                        <td className="p-3.5">
                          <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-amber-300 font-bold rounded-lg text-[10px] uppercase">
                            {adj.type}
                          </span>
                        </td>

                        <td className="p-3.5 font-bold text-slate-100">
                          {prod ? prod.name : 'Produit inconnu'}
                        </td>

                        <td className="p-3.5 text-center font-black text-amber-300 text-sm">
                          {adj.quantity} pcs
                        </td>

                        <td className="p-3.5 text-slate-300 text-[11px]">
                          {adj.reason || 'Aucun motif renseigné'}
                        </td>

                        <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEditAdjustment(adj)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-xs font-semibold inline-flex items-center space-x-1"
                            title="Modifier l'ajustement"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                            <span>Modifier</span>
                          </button>
                          <button
                            onClick={() => setDeletingAdjustment(adj)}
                            className="px-2 py-1 bg-slate-800 hover:bg-rose-950/80 text-rose-400 hover:text-rose-300 rounded-lg border border-slate-700 hover:border-rose-800 text-xs font-semibold inline-flex items-center space-x-1 transition-colors"
                            title="Supprimer l'ajustement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Supprimer</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EDIT TRANSFER MODAL */}
      {editingTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 my-4 sm:my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base text-white">
                  Modifier le Transfert ({editingTransfer.referenceNo})
                </h3>
              </div>
              <button onClick={() => setEditingTransfer(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTransfer} className="space-y-4 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Réf Transfert</label>
                  <input
                    type="text"
                    required
                    value={editTrfRef}
                    onChange={(e) => setEditTrfRef(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-mono font-bold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Magasin D'Origine</label>
                    <select
                      value={editTrfFrom}
                      onChange={(e) => setEditTrfFrom(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-amber-300 font-bold rounded-lg p-2"
                    >
                      {businessLocations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Magasin Destination</label>
                    <select
                      value={editTrfTo}
                      onChange={(e) => setEditTrfTo(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-blue-300 font-bold rounded-lg p-2"
                    >
                      {businessLocations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Produit</label>
                  <select
                    value={editTrfProductId}
                    onChange={(e) => setEditTrfProductId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold"
                  >
                    {businessProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Quantité Transférée</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={editTrfQty}
                      onChange={(e) => setEditTrfQty(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Statut</label>
                    <select
                      value={editTrfStatus}
                      onChange={(e) => setEditTrfStatus(e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-700 text-white font-bold rounded-lg p-2"
                    >
                      <option value="completed">Terminé (Appliquer)</option>
                      <option value="pending">En attente</option>
                      <option value="in_transit">En transit</option>
                      <option value="cancelled">Annulé</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={editTrfDate}
                    onChange={(e) => setEditTrfDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Notes / Motif</label>
                  <input
                    type="text"
                    value={editTrfNotes}
                    onChange={(e) => setEditTrfNotes(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2"
                    placeholder="Remarques..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTransfer(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-md shadow-blue-950"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE TRANSFER CONFIRM MODAL */}
      {deletingTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-4">
          <div className="bg-slate-900 border border-rose-900/50 text-white rounded-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-white">Supprimer le Transfert ?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer le transfert <span className="font-bold text-white font-mono">{deletingTransfer.referenceNo}</span> ({deletingTransfer.quantity} pcs) ?
              {deletingTransfer.status === 'completed' && (
                <span className="block mt-2 text-amber-300 font-semibold bg-amber-950/40 p-2 rounded-lg border border-amber-900/50">
                  ℹ️ Les quantités transférées seront automatiquement restituées au magasin d'origine et déduites de la destination.
                </span>
              )}
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTransfer(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700 text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTransfer}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs shadow-md shadow-rose-950"
              >
                Confirmer la Suppression
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ADJUSTMENT MODAL */}
      {editingAdjustment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 my-4 sm:my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base text-white">
                  Modifier l'Ajustement ({editingAdjustment.referenceNo})
                </h3>
              </div>
              <button onClick={() => setEditingAdjustment(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAdjustment} className="space-y-4 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Réf Ajustement</label>
                  <input
                    type="text"
                    required
                    value={editAdjRef}
                    onChange={(e) => setEditAdjRef(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Magasin / Emplacement</label>
                  <select
                    value={editAdjLocationId}
                    onChange={(e) => setEditAdjLocationId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white font-bold rounded-lg p-2"
                  >
                    {businessLocations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Produit</label>
                  <select
                    value={editAdjProductId}
                    onChange={(e) => setEditAdjProductId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold"
                  >
                    {businessProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Type d'Ajustement</label>
                    <select
                      value={editAdjType}
                      onChange={(e) => setEditAdjType(e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-700 text-amber-300 font-bold rounded-lg p-2"
                    >
                      <option value="damage">Casse / Endommagé (Déduction -)</option>
                      <option value="expired">Périmé (Déduction -)</option>
                      <option value="theft">Vol / Perte (Déduction -)</option>
                      <option value="loss">Perte Diverse (Déduction -)</option>
                      <option value="correction_sub">Correction Soustraction (-)</option>
                      <option value="correction_add">Correction Addition / Retrouvé (+)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Quantité (pcs)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={editAdjQty}
                      onChange={(e) => setEditAdjQty(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={editAdjDate}
                    onChange={(e) => setEditAdjDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Motif / Justification</label>
                  <textarea
                    rows={2}
                    required
                    value={editAdjReason}
                    onChange={(e) => setEditAdjReason(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2"
                    placeholder="Explication détaillée..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAdjustment(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-md shadow-blue-950"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE ADJUSTMENT CONFIRM MODAL */}
      {deletingAdjustment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-4">
          <div className="bg-slate-900 border border-rose-900/50 text-white rounded-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-white">Supprimer l'Ajustement ?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer l'ajustement <span className="font-bold text-white font-mono">{deletingAdjustment.referenceNo}</span> ({deletingAdjustment.quantity} pcs) ?
              <span className="block mt-2 text-amber-300 font-semibold bg-amber-950/40 p-2 rounded-lg border border-amber-900/50">
                ℹ️ La correction de stock effectuée par cet ajustement sera automatiquement inversée pour préserver l'intégrité de l'inventaire.
              </span>
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingAdjustment(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700 text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAdjustment}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs shadow-md shadow-rose-950"
              >
                Confirmer la Suppression
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {stockAdjProduct && (
        <StockAdjustmentModal
          product={stockAdjProduct}
          onClose={() => setStockAdjProduct(null)}
        />
      )}

      {showTransferModal && (
        <StockTransferModal
          product={transferModalProduct}
          onClose={() => {
            setShowTransferModal(false);
            setTransferModalProduct(undefined);
          }}
        />
      )}
    </div>
  );
};
