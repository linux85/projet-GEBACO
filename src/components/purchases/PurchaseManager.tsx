import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Purchase, PurchaseItem, PaymentStatus, PurchaseStatus } from '../../types';
import { ShoppingBag, Plus, Search, Calendar, AlertTriangle, CheckCircle, X, Trash2, Edit2 } from 'lucide-react';

export const PurchaseManager: React.FC = () => {
  const {
    state,
    currentBusiness,
    recordPurchase,
    updatePurchase,
    deletePurchase,
  } = useERP();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [deletingPurchase, setDeletingPurchase] = useState<Purchase | null>(null);

  // Form State
  const suppliers = state.contacts.filter(
    (c) => c.businessId === currentBusiness.id && (c.type === 'supplier' || c.type === 'both')
  );
  const locations = state.locations.filter((l) => l.businessId === currentBusiness.id);

  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [locationId, setLocationId] = useState(locations[0]?.id || '');
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  
  // Payment Due Date defaults to 15 days later (will trigger 7-day payment alert when time comes)
  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 10);
  const [paymentDueDate, setPaymentDueDate] = useState(
    defaultDueDate.toISOString().split('T')[0]
  );

  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemUnitPrice, setItemUnitPrice] = useState(10000);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);

  // Edit states
  const [editRefNo, setEditRefNo] = useState('');
  const [editSupplierId, setEditSupplierId] = useState('');
  const [editLocationId, setEditLocationId] = useState('');
  const [editPurchaseDate, setEditPurchaseDate] = useState('');
  const [editPaymentDueDate, setEditPaymentDueDate] = useState('');
  const [editStatus, setEditStatus] = useState<PurchaseStatus>('received');
  const [editPaymentStatus, setEditPaymentStatus] = useState<PaymentStatus>('paid');
  const [editDiscountAmount, setEditDiscountAmount] = useState(0);
  const [editTaxAmount, setEditTaxAmount] = useState(0);
  const [editPaidAmount, setEditPaidAmount] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const [editItems, setEditItems] = useState<PurchaseItem[]>([]);

  const handleOpenEdit = (p: Purchase) => {
    setEditingPurchase(p);
    setEditRefNo(p.referenceNo);
    setEditSupplierId(p.supplierId);
    setEditLocationId(p.locationId);
    setEditPurchaseDate(p.purchaseDate);
    setEditPaymentDueDate(p.paymentDueDate);
    setEditStatus(p.status);
    setEditPaymentStatus(p.paymentStatus);
    setEditDiscountAmount(p.discountAmount || 0);
    setEditTaxAmount(p.taxAmount || 0);
    setEditPaidAmount(p.paidAmount || 0);
    setEditNotes(p.notes || '');
    setEditItems([...p.items]);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPurchase || editItems.length === 0) return;

    const subtotal = editItems.reduce((acc, i) => acc + i.subtotal, 0);
    const grand = Math.max(0, subtotal + editTaxAmount - editDiscountAmount);
    const due = Math.max(0, grand - editPaidAmount);
    const calculatedPayStatus: PaymentStatus = due <= 0 ? 'paid' : editPaidAmount > 0 ? 'partial' : 'due';

    const updated: Purchase = {
      ...editingPurchase,
      referenceNo: editRefNo,
      supplierId: editSupplierId,
      locationId: editLocationId,
      purchaseDate: editPurchaseDate,
      paymentDueDate: editPaymentDueDate,
      status: editStatus,
      paymentStatus: calculatedPayStatus,
      items: editItems,
      discountAmount: editDiscountAmount,
      taxAmount: editTaxAmount,
      totalAmount: grand,
      paidAmount: editPaidAmount,
      dueAmount: due,
      notes: editNotes,
    };

    updatePurchase(updated);
    setEditingPurchase(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingPurchase) return;
    deletePurchase(deletingPurchase.id);
    setDeletingPurchase(null);
  };

  const removeEditItem = (idx: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const availableProducts = state.products.filter(
    (p) => p.businessId === currentBusiness.id
  );

  const handleAddItem = () => {
    const prd = availableProducts.find((p) => p.id === selectedProductId);
    if (!prd || itemQty <= 0) return;

    setPurchaseItems((prev) => [
      ...prev,
      {
        productId: prd.id,
        productName: prd.name,
        unitPrice: itemUnitPrice,
        quantity: itemQty,
        subtotal: itemUnitPrice * itemQty,
      },
    ]);

    setItemQty(1);
  };

  const removeItem = (idx: number) => {
    setPurchaseItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const subtotalItems = purchaseItems.reduce((acc, i) => acc + i.subtotal, 0);
  const grandTotal = Math.max(0, subtotalItems + taxAmount - discountAmount);
  const dueAmount = Math.max(0, grandTotal - paidAmount);

  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (purchaseItems.length === 0 || !supplierId) return;

    const refNo = `ACH-${Date.now().toString().slice(-6)}`;
    const payStatus: PaymentStatus =
      dueAmount <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'due';

    recordPurchase({
      businessId: currentBusiness.id,
      locationId,
      supplierId,
      referenceNo: refNo,
      purchaseDate,
      paymentDueDate,
      status: 'received' as PurchaseStatus,
      paymentStatus: payStatus,
      items: purchaseItems,
      discountAmount,
      taxAmount,
      totalAmount: grandTotal,
      paidAmount,
      dueAmount,
      notes: 'Bon de commande d’achat enregistré',
    });

    setShowAddModal(false);
    setPurchaseItems([]);
  };

  const filteredPurchases = state.purchases.filter((p) => {
    if (p.businessId !== currentBusiness.id) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.referenceNo.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30 shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold">Achats & Approvisionnements Stock</h2>
            <p className="text-xs text-slate-400">
              Bons de commande, suivi des dettes fournisseurs et alertes d'échéances de paiement sous 7 jours.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center space-x-2 px-4 min-h-[44px] sm:min-h-[38px] bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-900/30 shrink-0 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Saisir un Nouvel Achat</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par référence bon d'achat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[42px] sm:min-h-[36px] bg-slate-800 text-white pl-9 pr-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[780px]">
          <thead className="bg-slate-950 border-b border-slate-800 uppercase text-[10px] font-bold text-slate-400">
            <tr>
              <th className="p-3">Référence Achat</th>
              <th className="p-3">Fournisseur</th>
              <th className="p-3">Emplacement</th>
              <th className="p-3">Date & Échéance</th>
              <th className="p-3 text-right">Total Achat</th>
              <th className="p-3 text-right">Payé / Reste Dû</th>
              <th className="p-3 text-center">Statut Paiement</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredPurchases.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  Aucun bon d'achat trouvé.
                </td>
              </tr>
            ) : (
              filteredPurchases.map((p) => {
                const supplier = state.contacts.find((c) => c.id === p.supplierId);
                const location = state.locations.find((l) => l.id === p.locationId);

                return (
                  <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 font-bold text-slate-100 font-mono">
                      {p.referenceNo}
                    </td>

                    <td className="p-3 font-semibold text-slate-200">
                      {supplier ? supplier.name : 'Fournisseur Inconnu'}
                    </td>

                    <td className="p-3 text-slate-300">
                      {location ? location.name : 'Tous'}
                    </td>

                    <td className="p-3">
                      <div className="text-slate-200 font-semibold">{p.purchaseDate}</div>
                      <div className="text-[10px] text-amber-400 font-medium">
                        Échéance: {p.paymentDueDate}
                      </div>
                    </td>

                    <td className="p-3 text-right font-extrabold text-white">
                      {p.totalAmount.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                    </td>

                    <td className="p-3 text-right">
                      <div className="text-emerald-400 font-bold">
                        Payé: {p.paidAmount.toLocaleString('fr-FR')}
                      </div>
                      {p.dueAmount > 0 && (
                        <div className="text-rose-400 font-extrabold text-[11px]">
                          Dû: {p.dueAmount.toLocaleString('fr-FR')}
                        </div>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          p.paymentStatus === 'paid'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : p.paymentStatus === 'partial'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {p.paymentStatus === 'paid'
                          ? 'Payé'
                          : p.paymentStatus === 'partial'
                          ? 'Partiel'
                          : 'En Attente'}
                      </span>
                    </td>

                    <td className="p-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-xs font-semibold inline-flex items-center space-x-1"
                        title="Modifier le Bon d'Achat"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>Modifier</span>
                      </button>
                      <button
                        onClick={() => setDeletingPurchase(p)}
                        className="px-2 py-1 bg-slate-800 hover:bg-rose-950/80 text-rose-400 hover:text-rose-300 rounded-lg border border-slate-700 hover:border-rose-800 text-xs font-semibold inline-flex items-center space-x-1 transition-colors"
                        title="Supprimer le Bon d'Achat"
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

      {/* ADD PURCHASE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 sm:p-6 w-full max-w-3xl shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Saisie d'un Bon d'Achat</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Fournisseur *</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.companyName || 'Indépendant'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Emplacement de Réception *
                  </label>
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold"
                  >
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Date d'Achat</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Date d'Échéance de Paiement *
                  </label>
                  <input
                    type="date"
                    value={paymentDueDate}
                    onChange={(e) => setPaymentDueDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-amber-300 rounded-lg p-2 font-bold"
                  />
                </div>
              </div>

              {/* Add Item Row */}
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-2">
                <div className="font-bold text-white text-xs">Ajouter des Articles à l'Achat</div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <select
                      value={selectedProductId}
                      onChange={(e) => {
                        setSelectedProductId(e.target.value);
                        const p = availableProducts.find((prd) => prd.id === e.target.value);
                        if (p) setItemUnitPrice(p.purchasePrice);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded p-1.5"
                    >
                      <option value="">-- Sélectionner un produit --</option>
                      {availableProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <input
                      type="number"
                      min="1"
                      value={itemQty}
                      onChange={(e) => setItemQty(Number(e.target.value))}
                      placeholder="Qté"
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded p-1.5 font-bold"
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded"
                    >
                      + Ajouter
                    </button>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1 max-h-[150px] overflow-y-auto">
                {purchaseItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-slate-800 rounded border border-slate-700 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-white">{item.productName}</span>
                      <span className="text-[10px] text-slate-400 ml-2">
                        Qté: {item.quantity} x {item.unitPrice.toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-emerald-400">
                        {item.subtotal.toLocaleString('fr-FR')} FCFA
                      </span>
                      <button onClick={() => removeItem(idx)} className="text-rose-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals & Paid Amount */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 font-bold">
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Articles:</span>
                  <span className="text-white text-sm">{subtotalItems.toLocaleString('fr-FR')}</span>
                </div>
                <div>
                  <label className="text-slate-400 block text-[10px]">Acompte Payé:</label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 text-emerald-400 rounded p-1 font-bold text-xs"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Reste Dû:</span>
                  <span className="text-rose-400 text-sm">{dueAmount.toLocaleString('fr-FR')}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Total Net:</span>
                  <span className="text-lg text-emerald-400 font-black">
                    {grandTotal.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={purchaseItems.length === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  Enregistrer l'Achat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PURCHASE MODAL */}
      {editingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 sm:p-6 w-full max-w-2xl shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base text-white">
                  Modifier le Bon d'Achat ({editingPurchase.referenceNo})
                </h3>
              </div>
              <button onClick={() => setEditingPurchase(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Réf Achat</label>
                  <input
                    type="text"
                    required
                    value={editRefNo}
                    onChange={(e) => setEditRefNo(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Fournisseur</label>
                  <select
                    value={editSupplierId}
                    onChange={(e) => setEditSupplierId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.companyName || 'Indépendant'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Magasin / Emplacement</label>
                  <select
                    value={editLocationId}
                    onChange={(e) => setEditLocationId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold"
                  >
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Date d'Achat</label>
                  <input
                    type="date"
                    required
                    value={editPurchaseDate}
                    onChange={(e) => setEditPurchaseDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Échéance de Paiement</label>
                  <input
                    type="date"
                    required
                    value={editPaymentDueDate}
                    onChange={(e) => setEditPaymentDueDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-amber-300 rounded-lg p-2 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Statut Réception</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as PurchaseStatus)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold"
                  >
                    <option value="received">Reçu (Stock incrémenté)</option>
                    <option value="pending">En attente de réception</option>
                    <option value="ordered">Commandé</option>
                  </select>
                </div>
              </div>

              {/* Items in edit */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="font-bold text-slate-300">Articles du bon d'achat ({editItems.length}) :</div>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {editItems.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800 text-xs">
                      <div>
                        <div className="font-bold text-white">{it.productName}</div>
                        <div className="text-slate-400 text-[11px]">
                          {it.quantity} × {it.unitPrice.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-emerald-400">
                          {it.subtotal.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                        </span>
                        {editItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEditItem(idx)}
                            className="text-rose-400 hover:text-rose-300 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals & paid amount */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 items-center">
                <div>
                  <label className="block text-slate-400 text-[10px]">Remise ({currentBusiness.currencySymbol})</label>
                  <input
                    type="number"
                    min="0"
                    value={editDiscountAmount}
                    onChange={(e) => setEditDiscountAmount(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded p-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px]">Montant Payé ({currentBusiness.currencySymbol})</label>
                  <input
                    type="number"
                    min="0"
                    value={editPaidAmount}
                    onChange={(e) => setEditPaidAmount(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 text-emerald-400 rounded p-1 font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px]">Notes</label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded p-1 text-xs"
                    placeholder="Notes..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPurchase(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-md shadow-blue-950"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deletingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
          <div className="bg-slate-900 border border-rose-900/50 text-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-white">Supprimer le Bon d'Achat ?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer l'achat <span className="font-bold text-white font-mono">{deletingPurchase.referenceNo}</span> d'un montant total de{' '}
              <span className="font-bold text-emerald-400">{deletingPurchase.totalAmount.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}</span> ?
              {deletingPurchase.status === 'received' && (
                <span className="block mt-2 text-amber-300 font-semibold bg-amber-950/40 p-2 rounded-lg border border-amber-900/50">
                  ℹ️ Les stocks ajoutés lors de la réception seront automatiquement déduits pour conserver l'exactitude de l'inventaire.
                </span>
              )}
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPurchase(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700 text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs shadow-md shadow-rose-950"
              >
                Confirmer la Suppression
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
