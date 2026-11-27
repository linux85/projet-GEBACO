import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  X,
  AlertTriangle,
  Calendar,
  Package,
  TrendingDown,
  Edit2,
  Check,
  Building2,
  ArrowRight,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Product } from '../../types';

interface NotificationsModalProps {
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ onClose, onNavigateTab }) => {
  const { paymentAlerts, lowStockAlerts, currentBusiness, state, updateProduct } = useERP();
  const [activeTab, setActiveTab] = useState<'all' | 'stock' | 'payments'>('all');
  const [editingAlertProduct, setEditingAlertProduct] = useState<Product | null>(null);
  const [newAlertThreshold, setNewAlertThreshold] = useState<number>(5);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filterLocationId, setFilterLocationId] = useState<string>('all');

  // Filter locations belonging to the current business
  const businessLocations = (state.locations || []).filter(
    (l) => l.businessId === currentBusiness.id
  );

  // Filter low stock alerts by location if requested
  const filteredStockAlerts = lowStockAlerts.filter((alert) => {
    if (filterLocationId === 'all') return true;
    const loc = businessLocations.find((l) => l.id === filterLocationId);
    return loc ? alert.locationName === loc.name : true;
  });

  const handleOpenEditThreshold = (productId: string, currentThreshold: number) => {
    const prd = state.products.find((p) => p.id === productId);
    if (prd) {
      setEditingAlertProduct(prd);
      setNewAlertThreshold(prd.alertQuantity ?? currentThreshold);
    }
  };

  const handleSaveThreshold = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlertProduct) return;

    const thresholdVal = Math.max(0, Number(newAlertThreshold));
    updateProduct({
      ...editingAlertProduct,
      alertQuantity: thresholdVal,
    });

    setSuccessMessage(
      `Le seuil critique d'alerte pour "${editingAlertProduct.name}" est désormais fixé à ${thresholdVal} unité(s).`
    );
    setEditingAlertProduct(null);

    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const totalStockCount = lowStockAlerts.length;
  const totalPaymentCount = paymentAlerts.length;
  const totalAlertCount = totalStockCount + totalPaymentCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-2.5 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-start sm:items-center justify-between gap-2 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-slate-100">
                  Centre d’Alertes & Notifications
                </h3>
                {totalAlertCount > 0 ? (
                  <span className="px-2 py-0.5 text-xs font-black bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full animate-pulse whitespace-nowrap">
                    {totalAlertCount} active{totalAlertCount > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full whitespace-nowrap">
                    Système nominal
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 flex flex-wrap items-center gap-x-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>{currentBusiness.name}</span>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span>Seuils de stock critiques & échéances de paiement</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner */}
        {successMessage && (
          <div className="px-4 sm:px-6 py-2.5 bg-emerald-950/80 border-b border-emerald-700/60 text-emerald-200 text-xs font-semibold flex items-center justify-between animate-in slide-in-from-top duration-200">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-400 hover:text-white text-xs ml-2 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab & Filter Bar */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Toutes ({totalAlertCount})
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'stock'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Package className="w-3.5 h-3.5 shrink-0" />
              <span>Stocks Faibles ({totalStockCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'payments'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>Échéances ({totalPaymentCount})</span>
            </button>
          </div>

          {activeTab !== 'payments' && businessLocations.length > 1 && (
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-[11px] text-slate-400 shrink-0">Emplacement :</span>
              <select
                value={filterLocationId}
                onChange={(e) => setFilterLocationId(e.target.value)}
                className="flex-1 sm:flex-initial bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Tous les magasins</option>
                {businessLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 flex-1">
          {/* SECTION: LOW STOCK ALERTS */}
          {(activeTab === 'all' || activeTab === 'stock') && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-rose-300 uppercase tracking-wider">
                      Alertes de Stock Faible & Niveaux Critiques
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Articles ayant atteint ou franchi le seuil minimal défini par l'utilisateur
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="bg-rose-900/60 text-rose-300 border border-rose-800/80 text-xs px-2.5 py-0.5 rounded-full font-black">
                    {filteredStockAlerts.length} alerte{filteredStockAlerts.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {filteredStockAlerts.length === 0 ? (
                <div className="p-5 bg-slate-950/50 rounded-xl border border-slate-800/80 text-center">
                  <Package className="w-8 h-8 text-emerald-500/60 mx-auto mb-2" />
                  <p className="text-xs font-bold text-emerald-300">
                    Tous les stocks sont au-dessus de leurs seuils critiques d'alerte !
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Aucun produit ne requiert de réapprovisionnement d'urgence pour le moment.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredStockAlerts.map((stock, idx) => {
                    const isOutOfStock = stock.currentStock <= 0;
                    return (
                      <div
                        key={`${stock.productId}-${idx}`}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isOutOfStock
                            ? 'bg-rose-950/40 border-rose-800/60 hover:border-rose-600'
                            : 'bg-slate-850 border-slate-700/80 hover:border-amber-500/50'
                        } flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                isOutOfStock
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-amber-600/90 text-white'
                              }`}
                            >
                              {isOutOfStock ? 'RUPTURE IMMÉDIATE' : 'SEUIL CRITIQUE ATTEINT'}
                            </span>
                            <h5 className="font-bold text-sm text-white">{stock.productName}</h5>
                          </div>
                          <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                            <span>
                              SKU : <strong className="text-slate-300 font-mono">{stock.sku}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Magasin : <strong className="text-blue-300">{stock.locationName}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end space-x-3">
                          <div className="text-right">
                            <div className="flex items-center space-x-1.5 justify-end">
                              <span
                                className={`text-base font-black ${
                                  isOutOfStock ? 'text-rose-400' : 'text-amber-300'
                                }`}
                              >
                                {stock.currentStock}
                              </span>
                              <span className="text-xs text-slate-400 font-medium">
                                / Seuil alerte : <strong className="text-slate-200">{stock.alertQuantity}</strong>
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block">
                              {isOutOfStock
                                ? 'Stock épuisé'
                                : `Reste ${stock.currentStock} unité${stock.currentStock > 1 ? 's' : ''}`}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditThreshold(stock.productId, stock.alertQuantity)}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-200 rounded-lg text-xs font-bold border border-slate-700 transition-colors flex items-center space-x-1 shadow-xs"
                              title="Définir un nouveau seuil d'alerte pour ce produit"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span className="hidden md:inline">Modifier Seuil</span>
                            </button>
                            {onNavigateTab && (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onNavigateTab('products');
                                }}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
                                title="Voir le catalogue produit"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION: PAYMENT DUE ALERTS */}
          {(activeTab === 'all' || activeTab === 'payments') && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-amber-300 uppercase tracking-wider">
                      Échéances de Paiement (Moins de 7 jours ou en retard)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Règlements fournisseurs et créances clients arrivant à échéance
                    </p>
                  </div>
                </div>
                <span className="bg-amber-900/60 text-amber-300 border border-amber-800/80 text-xs px-2.5 py-0.5 rounded-full font-black">
                  {paymentAlerts.length} alerte{paymentAlerts.length > 1 ? 's' : ''}
                </span>
              </div>

              {paymentAlerts.length === 0 ? (
                <div className="p-5 bg-slate-950/50 rounded-xl border border-slate-800/80 text-center">
                  <Calendar className="w-8 h-8 text-emerald-500/60 mx-auto mb-2" />
                  <p className="text-xs font-bold text-emerald-300">
                    Aucun paiement à échéance dans les 7 prochains jours.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Toutes les factures et créances sont à jour ou hors délai critique.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {paymentAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3.5 bg-slate-850 rounded-xl border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-500/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              alert.type === 'purchase_due'
                                ? 'bg-rose-900/80 text-rose-300 border border-rose-800'
                                : 'bg-emerald-900/80 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            {alert.type === 'purchase_due' ? 'Achat Fournisseur' : 'Créance Client'}
                          </span>
                          <span className="font-bold text-xs text-white">
                            Réf : <strong className="font-mono text-slate-200">{alert.referenceNo}</strong>
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-medium">
                          Contact : <strong className="text-white">{alert.contactName}</strong> ({alert.locationName})
                        </p>
                        <p className="text-[11px] text-amber-400">
                          Échéance : {alert.dueDate} ({alert.daysRemaining <= 0 ? 'EN RETARD' : `dans ${alert.daysRemaining} jour(s)`})
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="font-black text-base text-rose-400">
                          {alert.amountDue.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                        </div>
                        <span className="text-[10px] text-slate-400">Montant restant dû</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-slate-500" />
            <span>
              Vous pouvez personnaliser le seuil d'alerte critique directement depuis chaque produit ou dans le catalogue.
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateTab('products');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-700"
              >
                Gérer les Produits & Stocks
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-blue-900/30"
            >
              Fermer les Alertes
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: DIRECT QUICK EDIT OF ALERT THRESHOLD */}
      {editingAlertProduct && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in zoom-in duration-150">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-sm text-slate-100">
                  Définir le Seuil d'Alerte Critique
                </h4>
              </div>
              <button
                onClick={() => setEditingAlertProduct(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveThreshold} className="p-5 space-y-4">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                  Produit Sélectionné
                </span>
                <div className="text-sm font-bold text-white mt-0.5">
                  {editingAlertProduct.name}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  SKU: {editingAlertProduct.sku}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Nouveau Seuil Critique (Unités) *</span>
                  <span className="text-[10px] font-normal text-slate-400">
                    Déclenche une notification
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={newAlertThreshold}
                    onChange={(e) => setNewAlertThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 border-2 border-amber-500/70 focus:border-amber-400 text-amber-300 rounded-xl p-3 text-lg font-black tracking-wide pl-4 pr-16 focus:outline-none focus:ring-4 focus:ring-amber-500/20"
                    autoFocus
                  />
                  <div className="absolute right-3 top-3.5 text-xs font-bold text-amber-400/70 pointer-events-none">
                    unités
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Dès que le stock d'un magasin descend à ou en dessous de ce niveau, une alerte est immédiatement visible dans la cloche des notifications et le panneau latéral.
                </p>
              </div>

              {/* Quick Presets */}
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Valeurs Fréquentes
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[2, 5, 10, 15, 20, 50].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setNewAlertThreshold(val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                        newAlertThreshold === val
                          ? 'bg-amber-600 text-white border-amber-500'
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
                  onClick={() => setEditingAlertProduct(null)}
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
    </div>
  );
};

export default NotificationsModal;
