import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Product, AdjustmentType } from '../../types';
import { X, Sliders, AlertTriangle } from 'lucide-react';

interface StockAdjustmentModalProps {
  product: Product;
  onClose: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  product,
  onClose,
}) => {
  const { currentBusiness, state, recordStockAdjustment } = useERP();

  const businessLocations = state.locations.filter(
    (l) => l.businessId === currentBusiness.id
  );

  const [locationId, setLocationId] = useState<string>(
    businessLocations[0]?.id || ''
  );
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('loss');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId || quantity <= 0) return;

    recordStockAdjustment({
      businessId: currentBusiness.id,
      locationId,
      referenceNo: `ADJ-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      type: adjustmentType,
      productId: product.id,
      quantity,
      reason: reason || 'Ajustement manuel du stock',
    });

    onClose();
  };

  const currentStockAtLoc = product.locationStock[locationId] ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-5 w-full max-w-md shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base">Ajustement de Stock</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-xs space-y-1">
          <div className="font-bold text-white text-sm">{product.name}</div>
          <div className="text-slate-400">SKU: {product.sku}</div>
          <div className="text-emerald-400 font-semibold">
            Stock actuel à cet emplacement: <strong>{currentStockAtLoc}</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Emplacement Concerné *
            </label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-medium"
            >
              {businessLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Type d'Ajustement *
            </label>
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-medium"
            >
              <option value="loss">Perte (-)</option>
              <option value="damage">Endommagé / Casse (-)</option>
              <option value="expired">Périmé (-)</option>
              <option value="theft">Vol (-)</option>
              <option value="correction_add">Correction d'inventaire (+)</option>
              <option value="correction_sub">Correction d'inventaire (-)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Quantité à Ajuster *
            </label>
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Motif / Explication
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2"
              placeholder="Ex: Erreur lors du comptage d'inventaire physique..."
            ></textarea>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold"
            >
              Enregistrer Ajustement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
