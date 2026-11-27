import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Product, TransferStatus } from '../../types';
import { X, ArrowRightLeft, AlertCircle, CheckCircle } from 'lucide-react';

interface StockTransferModalProps {
  product?: Product;
  onClose: () => void;
}

export const StockTransferModal: React.FC<StockTransferModalProps> = ({
  product: initialProduct,
  onClose,
}) => {
  const { currentBusiness, currentUser, state, recordStockTransfer } = useERP();

  const businessLocations = state.locations.filter(
    (l) => l.businessId === currentBusiness.id
  );
  const businessProducts = state.products.filter(
    (p) => p.businessId === currentBusiness.id
  );

  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProduct?.id || businessProducts[0]?.id || ''
  );

  const activeProduct = businessProducts.find((p) => p.id === selectedProductId) || initialProduct;

  const [fromLocationId, setFromLocationId] = useState<string>(
    businessLocations[0]?.id || ''
  );
  const [toLocationId, setToLocationId] = useState<string>(
    businessLocations[1]?.id || businessLocations[0]?.id || ''
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [status, setStatus] = useState<TransferStatus>('completed');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const currentSourceStock = activeProduct
    ? activeProduct.locationStock[fromLocationId] ?? 0
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!activeProduct) {
      setErrorMsg('Veuillez sélectionner un produit valide.');
      return;
    }

    if (fromLocationId === toLocationId) {
      setErrorMsg('Le magasin de destination doit être différent du magasin d’origine.');
      return;
    }

    if (quantity <= 0) {
      setErrorMsg('La quantité à transférer doit être supérieure à zéro.');
      return;
    }

    if (status === 'completed' && quantity > currentSourceStock) {
      setErrorMsg(`Stock insuffisant dans l'emplacement d'origine. Disponible: ${currentSourceStock}`);
      return;
    }

    recordStockTransfer({
      businessId: currentBusiness.id,
      referenceNo: `TRF-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      fromLocationId,
      toLocationId,
      productId: activeProduct.id,
      quantity,
      status,
      notes: notes || 'Transfert de stock entre magasins',
      createdBy: currentUser.name,
    });

    onClose();
  };

  const fromLocation = businessLocations.find((l) => l.id === fromLocationId);
  const toLocation = businessLocations.find((l) => l.id === toLocationId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5 my-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Transfert de Stock Inter-Magasins</h3>
              <p className="text-[11px] text-slate-400">Déplacez des marchandises d'un dépôt/magasin à un autre.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Select Product if not passed as fixed */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Produit à Transférer *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                setErrorMsg('');
              }}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {businessProducts.map((p) => {
                const totalStock = (Object.values(p.locationStock) as number[]).reduce((a, b) => a + b, 0);
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — Stock total: {totalStock}
                  </option>
                );
              })}
            </select>
          </div>

          {activeProduct && (
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 flex items-center space-x-3">
              {activeProduct.image ? (
                <img src={activeProduct.image} alt={activeProduct.name} className="w-10 h-10 rounded-lg object-cover border border-slate-600" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center font-bold text-slate-300">
                  {activeProduct.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-bold text-white text-xs truncate">{activeProduct.name}</div>
                <div className="text-[10px] text-slate-400 font-mono">SKU: {activeProduct.sku}</div>
              </div>
            </div>
          )}

          {/* Locations Routing Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <div>
              <label className="block text-amber-400 font-bold text-[10px] uppercase mb-1">
                Magasin D'Origine (Source) *
              </label>
              <select
                value={fromLocationId}
                onChange={(e) => {
                  setFromLocationId(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-semibold"
              >
                {businessLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
              <div className="mt-1.5 text-[11px] text-slate-300 font-medium">
                Stock dispo source: <strong className="text-emerald-400 font-bold">{currentSourceStock} pcs</strong>
              </div>
            </div>

            <div>
              <label className="block text-blue-400 font-bold text-[10px] uppercase mb-1">
                Magasin De Destination *
              </label>
              <select
                value={toLocationId}
                onChange={(e) => {
                  setToLocationId(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-semibold"
              >
                {businessLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
              <div className="mt-1.5 text-[11px] text-slate-300 font-medium">
                Stock actuel dest.:{' '}
                <strong className="text-blue-400 font-bold">
                  {activeProduct ? activeProduct.locationStock[toLocationId] ?? 0 : 0} pcs
                </strong>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Quantité à Transférer *
              </label>
              <input
                type="number"
                min="1"
                max={currentSourceStock > 0 ? currentSourceStock : undefined}
                required
                value={quantity}
                onChange={(e) => {
                  setQuantity(Number(e.target.value));
                  setErrorMsg('');
                }}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold text-sm"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Statut du Transfert *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TransferStatus)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-semibold"
              >
                <option value="completed">Terminé & Effectué (Immédiat)</option>
                <option value="pending">En attente de réception</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Notes / Raison du Transfert
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2"
              placeholder="Ex: Réapprovisionnement de la boutique suite au pic de ventes du week-end..."
            ></textarea>
          </div>

          <div className="pt-2 flex justify-end space-x-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-md shadow-blue-900/30 flex items-center space-x-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Valider le Transfert</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
