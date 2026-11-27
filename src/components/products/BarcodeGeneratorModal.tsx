import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Product } from '../../types';
import { X, Printer, Barcode as BarcodeIcon, Settings2 } from 'lucide-react';

interface BarcodeGeneratorModalProps {
  product?: Product;
  onClose: () => void;
}

export const BarcodeGeneratorModal: React.FC<BarcodeGeneratorModalProps> = ({
  product,
  onClose,
}) => {
  const { currentBusiness, state } = useERP();

  const [selectedProductId, setSelectedProductId] = useState<string>(
    product ? product.id : state.products[0]?.id || ''
  );
  const [printCount, setPrintCount] = useState<number>(12);
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showBusinessName, setShowBusinessName] = useState<boolean>(true);
  const [showSku, setShowSku] = useState<boolean>(true);

  const selectedProduct = state.products.find((p) => p.id === selectedProductId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 w-full max-w-3xl shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <BarcodeIcon className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base">Générateur d’Étiquettes Code-barres</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Produit Cible
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 font-medium"
            >
              {state.products
                .filter((p) => p.businessId === currentBusiness.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Nombre d’Étiquettes à Imprimer
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={printCount}
              onChange={(e) => setPrintCount(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 font-bold"
            />
          </div>

          <div className="space-y-1 pt-1">
            <label className="block text-slate-300 font-semibold mb-1">
              Éléments d'Affichage
            </label>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <label className="flex items-center space-x-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBusinessName}
                  onChange={(e) => setShowBusinessName(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-blue-500"
                />
                <span>Nom Commerce</span>
              </label>
              <label className="flex items-center space-x-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-blue-500"
                />
                <span>Prix de vente</span>
              </label>
              <label className="flex items-center space-x-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSku}
                  onChange={(e) => setShowSku(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-blue-500"
                />
                <span>Code SKU</span>
              </label>
            </div>
          </div>
        </div>

        {/* Printable Barcode Sheet Preview */}
        {selectedProduct && (
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center justify-between">
              <span>Aperçu de la planche d'impression ({printCount} étiquettes)</span>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-md"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer les Étiquettes</span>
              </button>
            </div>

            <div
              id="printable-area"
              className="bg-white text-slate-900 p-4 rounded-xl max-h-[350px] overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 border border-slate-700"
            >
              {Array.from({ length: printCount }).map((_, i) => (
                <div
                  key={i}
                  className="border-2 border-dashed border-slate-300 p-2 rounded-lg text-center flex flex-col items-center justify-between min-h-[110px] bg-white text-slate-900"
                >
                  {showBusinessName && (
                    <div className="text-[9px] font-black uppercase text-slate-700 truncate max-w-full">
                      {currentBusiness.name}
                    </div>
                  )}

                  <div className="text-[10px] font-bold truncate max-w-full my-0.5">
                    {selectedProduct.name}
                  </div>

                  {/* Simulated Barcode lines */}
                  <div className="w-full flex items-center justify-center space-x-0.5 my-1 h-8 px-1">
                    {Array.from({ length: 24 }).map((_, bIdx) => (
                      <div
                        key={bIdx}
                        className={`h-full bg-slate-950 ${
                          bIdx % 3 === 0 ? 'w-1' : bIdx % 5 === 0 ? 'w-0.5' : 'w-1.5'
                        }`}
                      ></div>
                    ))}
                  </div>

                  <div className="font-mono text-[9px] font-semibold text-slate-700 tracking-wider">
                    {selectedProduct.barcode || selectedProduct.sku}
                  </div>

                  {showPrice && (
                    <div className="text-[11px] font-black text-blue-900 mt-0.5">
                      {selectedProduct.sellingPrice.toLocaleString('fr-FR')}{' '}
                      {currentBusiness.currencySymbol}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
