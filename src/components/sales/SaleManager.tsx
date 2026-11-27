import React, { useState, useRef, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { Sale, SaleStatus, PaymentStatus, PaymentMethod, SaleItem, Product } from '../../types';
import { DailySalesTracker } from '../reports/DailySalesTracker';
import {
  FileText,
  Search,
  Printer,
  CheckCircle2,
  Clock,
  X,
  Edit2,
  Trash2,
  AlertTriangle,
  DollarSign,
  Calendar,
  CalendarDays,
  MapPin,
  User,
  Tag,
  Plus,
  Minus,
  Package,
  ShoppingBag,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const SaleManager: React.FC = () => {
  const { state, currentBusiness, updateSaleStatus, updateSale, deleteSale } = useERP();

  const [activeSalesTab, setActiveSalesTab] = useState<'history' | 'daily_tracking'>('history');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSaleForPrint, setSelectedSaleForPrint] = useState<Sale | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [deletingSale, setDeletingSale] = useState<Sale | null>(null);

  // Edit form states
  const [editInvoiceNo, setEditInvoiceNo] = useState('');
  const [editCustomerId, setEditCustomerId] = useState('');
  const [editLocationId, setEditLocationId] = useState('');
  const [editSaleDate, setEditSaleDate] = useState('');
  const [editStatus, setEditStatus] = useState<SaleStatus>('final');
  const [editPaymentStatus, setEditPaymentStatus] = useState<PaymentStatus>('paid');
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('cash');
  const [editPaidAmount, setEditPaidAmount] = useState<number>(0);
  const [editNotes, setEditNotes] = useState('');
  const [editDiscountAmount, setEditDiscountAmount] = useState<number>(0);
  const [editItems, setEditItems] = useState<SaleItem[]>([]);

  // Add Item to Document in Modal
  const [productSearchInModal, setProductSearchInModal] = useState<string>('');
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');
  const [selectedVariationToAdd, setSelectedVariationToAdd] = useState<string>('');
  const [addItemQty, setAddItemQty] = useState<number>(1);
  const [addItemCustomPrice, setAddItemCustomPrice] = useState<number | ''>('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState<boolean>(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        productDropdownRef.current &&
        !productDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProductDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenEdit = (sale: Sale) => {
    setEditingSale(sale);
    setEditInvoiceNo(sale.invoiceNo);
    setEditCustomerId(sale.customerId);
    setEditLocationId(sale.locationId);
    setEditSaleDate(sale.saleDate);
    setEditStatus(sale.status);
    setEditPaymentStatus(sale.paymentStatus);
    setEditPaymentMethod(sale.paymentMethod);
    setEditPaidAmount(sale.paidAmount);
    setEditNotes(sale.notes || '');
    setEditDiscountAmount(sale.discountAmount || 0);
    // Deep clone items so that changes in edit modal are isolated until saved
    setEditItems(
      (sale.items || []).map((item) => ({
        ...item,
        subtotal: item.subtotal || item.quantity * item.unitPrice,
      }))
    );
    setSelectedProductToAdd('');
    setSelectedVariationToAdd('');
    setAddItemQty(1);
    setAddItemCustomPrice('');
    setProductSearchInModal('');
    setIsProductDropdownOpen(false);
  };

  // Item manipulation functions
  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    setEditItems((prev) => {
      const updated = [...prev];
      const target = updated[index];
      const unitP = target.unitPrice;
      updated[index] = {
        ...target,
        quantity: newQty,
        subtotal: newQty * unitP,
      };
      return updated;
    });
  };

  const handleUpdateItemPrice = (index: number, newPrice: number) => {
    const validPrice = Math.max(0, newPrice || 0);
    setEditItems((prev) => {
      const updated = [...prev];
      const target = updated[index];
      updated[index] = {
        ...target,
        unitPrice: validPrice,
        subtotal: target.quantity * validPrice,
      };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setEditItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddItemToEdit = () => {
    if (!selectedProductToAdd) return;
    const product = state.products.find((p) => p.id === selectedProductToAdd);
    if (!product) return;

    let price =
      typeof addItemCustomPrice === 'number' && addItemCustomPrice >= 0
        ? addItemCustomPrice
        : product.sellingPrice;
    let varName = '';

    if (selectedVariationToAdd && product.variations) {
      const v = product.variations.find((varVal) => varVal.id === selectedVariationToAdd);
      if (v) {
        if (typeof addItemCustomPrice !== 'number' || addItemCustomPrice === 0) {
          price = v.sellingPrice;
        }
        varName = ` (${v.name})`;
      }
    }

    const qty = Math.max(1, addItemQty || 1);

    setEditItems((prev) => {
      const existingIdx = prev.findIndex(
        (it) =>
          it.productId === product.id &&
          it.variationId === (selectedVariationToAdd || undefined)
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        const existing = updated[existingIdx];
        const newTotalQty = existing.quantity + qty;
        updated[existingIdx] = {
          ...existing,
          quantity: newTotalQty,
          unitPrice: price,
          subtotal: newTotalQty * price,
        };
        return updated;
      } else {
        const taxRate = product.taxRate || 0;
        return [
          ...prev,
          {
            productId: product.id,
            variationId: selectedVariationToAdd || undefined,
            productName: `${product.name}${varName}`,
            unitPrice: price,
            quantity: qty,
            taxAmount: (price * taxRate) / 100,
            discountAmount: 0,
            subtotal: qty * price,
          },
        ];
      }
    });

    // Reset article addition fields
    setSelectedProductToAdd('');
    setSelectedVariationToAdd('');
    setAddItemQty(1);
    setAddItemCustomPrice('');
    setProductSearchInModal('');
    setIsProductDropdownOpen(false);
  };

  // Calculations for modal
  const editItemsSubtotal = editItems.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
  const editTaxTotal = editItems.reduce(
    (acc, it) => acc + (it.taxAmount || 0) * it.quantity,
    0
  );
  const editFinalTotal = Math.max(0, editItemsSubtotal + editTaxTotal - editDiscountAmount);
  const editCalculatedDue = Math.max(0, editFinalTotal - editPaidAmount);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;

    if (editItems.length === 0) {
      alert('Veuillez ajouter au moins un article au document.');
      return;
    }

    // Auto-adjust payment status based on paid amount
    let calculatedPaymentStatus: PaymentStatus = editPaymentStatus;
    if (editPaidAmount >= editFinalTotal && editFinalTotal > 0) {
      calculatedPaymentStatus = 'paid';
    } else if (editPaidAmount > 0 && editPaidAmount < editFinalTotal) {
      calculatedPaymentStatus = 'partial';
    } else if (editPaidAmount === 0 && editFinalTotal > 0) {
      calculatedPaymentStatus = 'due';
    }

    const updated: Sale = {
      ...editingSale,
      invoiceNo: editInvoiceNo,
      customerId: editCustomerId,
      locationId: editLocationId,
      saleDate: editSaleDate,
      status: editStatus,
      paymentStatus: calculatedPaymentStatus,
      paymentMethod: editPaymentMethod,
      items: editItems,
      discountAmount: editDiscountAmount,
      taxAmount: editTaxTotal,
      totalAmount: editFinalTotal,
      paidAmount: editPaidAmount,
      dueAmount: editCalculatedDue,
      notes: editNotes,
    };

    updateSale(updated);
    setEditingSale(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingSale) return;
    deleteSale(deletingSale.id);
    setDeletingSale(null);
  };

  const filteredSales = state.sales.filter((s) => {
    if (s.businessId !== currentBusiness.id) return false;
    if (selectedStatus !== 'all' && s.status !== selectedStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const customer = state.contacts.find((c) => c.id === s.customerId);
      return (
        s.invoiceNo.toLowerCase().includes(q) ||
        (customer && customer.name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const [onlyInStockInModal, setOnlyInStockInModal] = useState<boolean>(true);

  // Helper to compute stock of a product in a given store
  const getProductStockForLocation = (p: Product, locId?: string): number => {
    if (!locId) {
      if (p.type === 'variable' && p.variations && p.variations.length > 0) {
        return p.variations.reduce((sum, v) => {
          return sum + (Object.values(v.locationStock || {}) as number[]).reduce((a, b) => a + (Number(b) || 0), 0);
        }, 0);
      }
      return (Object.values(p.locationStock || {}) as number[]).reduce((a, b) => a + (Number(b) || 0), 0);
    }
    if (p.type === 'variable' && p.variations && p.variations.length > 0) {
      return p.variations.reduce((sum, v) => {
        return sum + (Number(v.locationStock?.[locId]) || 0);
      }, 0);
    }
    return Number(p.locationStock?.[locId]) || 0;
  };

  // Filter products for adding in the edit modal
  const modalAvailableProducts = state.products.filter((p) => {
    if (p.businessId !== currentBusiness.id) return false;
    if (onlyInStockInModal && editLocationId) {
      const stockInLoc = getProductStockForLocation(p, editLocationId);
      if (stockInLoc <= 0) return false;
    }
    if (productSearchInModal.trim()) {
      const q = productSearchInModal.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const selectedProductObj = state.products.find((p) => p.id === selectedProductToAdd);

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 text-white">
      {/* Top Main Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveSalesTab('history')}
          className={`px-4 min-h-[42px] sm:min-h-[36px] py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all whitespace-nowrap shrink-0 ${
            activeSalesTab === 'history'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>Historique des Factures & Devis</span>
        </button>

        <button
          onClick={() => setActiveSalesTab('daily_tracking')}
          className={`px-4 min-h-[42px] sm:min-h-[36px] py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all whitespace-nowrap shrink-0 ${
            activeSalesTab === 'daily_tracking'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <CalendarDays className="w-4 h-4 shrink-0" />
          <span>Suivi Journalier (Par Produit, Catégorie & Magasin)</span>
        </button>
      </div>

      {activeSalesTab === 'daily_tracking' ? (
        <DailySalesTracker />
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="p-2.5 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold">Historique des Ventes & Devis Provisoires</h2>
                <p className="text-xs text-slate-400">
                  Gérez, modifiez, ajoutez ou supprimez des articles dans vos factures et devis avec synchronisation instantanée des stocks.
                </p>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-lg overflow-x-auto">
              <button
                onClick={() => setSelectedStatus('all')}
                className={`px-3 min-h-[38px] sm:min-h-[32px] rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  selectedStatus === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Toutes
              </button>
              <button
                onClick={() => setSelectedStatus('final')}
                className={`px-3 min-h-[38px] sm:min-h-[32px] rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  selectedStatus === 'final' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Définitives
              </button>
              <button
                onClick={() => setSelectedStatus('quotation')}
                className={`px-3 min-h-[38px] sm:min-h-[32px] rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  selectedStatus === 'quotation' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Devis
              </button>
            </div>

            <div className="relative flex-1 sm:max-w-md w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par numéro de facture ou client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[42px] sm:min-h-[36px] bg-slate-800 text-white pl-9 pr-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

      {/* Sales Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[780px]">
          <thead className="bg-slate-950 border-b border-slate-800 uppercase text-[10px] font-bold text-slate-400">
            <tr>
              <th className="p-3">Facture / Devis N°</th>
              <th className="p-3">Client</th>
              <th className="p-3">Magasin</th>
              <th className="p-3">Date</th>
              <th className="p-3 text-right">Montant Total</th>
              <th className="p-3 text-center">Statut</th>
              <th className="p-3 text-center">Paiement</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  Aucune vente ou devis trouvé.
                </td>
              </tr>
            ) : (
              filteredSales.map((s) => {
                const customer = state.contacts.find((c) => c.id === s.customerId);
                const location = state.locations.find((l) => l.id === s.locationId);

                return (
                  <tr key={s.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 font-bold text-slate-100 font-mono">
                      {s.invoiceNo}
                    </td>

                    <td className="p-3 font-semibold text-slate-200">
                      {customer ? customer.name : 'Client de Passage'}
                    </td>

                    <td className="p-3 text-slate-300">
                      {location ? location.name : 'Siège'}
                    </td>

                    <td className="p-3 text-slate-300 font-medium">
                      {s.saleDate}
                    </td>

                    <td className="p-3 text-right font-extrabold text-emerald-400">
                      {s.totalAmount.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          s.status === 'final'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {s.status === 'final' ? 'Définitive' : 'Devis'}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          s.paymentStatus === 'paid'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : s.paymentStatus === 'due'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {s.paymentStatus === 'paid' ? 'Payé' : s.paymentStatus === 'due' ? 'Non Payé' : 'Partiel'}
                      </span>
                    </td>

                    <td className="p-3 text-right space-x-1 whitespace-nowrap">
                      {s.status === 'quotation' && (
                        <button
                          onClick={() => updateSaleStatus(s.id, 'final', 'paid')}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold shadow-sm"
                          title="Convertir en vente définitive validée"
                        >
                          Valider
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedSaleForPrint(s)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg border border-slate-700 inline-flex items-center"
                        title="Imprimer Reçu / Facture"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-blue-900/60 text-slate-200 hover:text-blue-300 rounded-lg border border-slate-700 text-xs font-semibold inline-flex items-center space-x-1 transition-colors"
                        title={s.status === 'quotation' ? "Modifier le Devis & Articles" : "Modifier la Vente & Articles"}
                      >
                        <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>Modifier</span>
                      </button>
                      <button
                        onClick={() => setDeletingSale(s)}
                        className="px-2 py-1 bg-slate-800 hover:bg-rose-950/80 text-rose-400 hover:text-rose-300 rounded-lg border border-slate-700 hover:border-rose-800 text-xs font-semibold inline-flex items-center space-x-1 transition-colors"
                        title={s.status === 'quotation' ? "Supprimer le Devis" : "Supprimer la Vente"}
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
    </>
  )}

      {/* EDIT MODAL - FULL ARTICLE & HEADER EDITOR */}
      {editingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 sm:p-6 w-full max-w-4xl shadow-2xl space-y-4 sm:space-y-5 my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {editStatus === 'quotation' ? 'Modifier le Devis' : 'Modifier la Vente / Facture'}{' '}
                    <span className="font-mono text-emerald-400">({editingSale.invoiceNo})</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Ajoutez, supprimez des articles, modifiez quantités et tarifs avec ajustement automatique des stocks.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingSale(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-5 overflow-y-auto pr-1 text-xs">
              {/* Document Header Fields */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Informations Générales
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">N° Facture / Devis</label>
                    <input
                      type="text"
                      required
                      value={editInvoiceNo}
                      onChange={(e) => setEditInvoiceNo(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={editSaleDate}
                      onChange={(e) => setEditSaleDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Client</label>
                    <select
                      value={editCustomerId}
                      onChange={(e) => setEditCustomerId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">Client de Passage (Sans compte)</option>
                      {state.contacts
                        .filter(
                          (c) =>
                            c.businessId === currentBusiness.id &&
                            (c.type === 'customer' || c.type === 'both')
                        )
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.companyName ? `(${c.companyName})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Magasin</label>
                    <select
                      value={editLocationId}
                      onChange={(e) => setEditLocationId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {state.locations
                        .filter((l) => l.businessId === currentBusiness.id)
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name} ({l.code})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Statut du Document</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as SaleStatus)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="final">Vente Définitive (Déduit le stock)</option>
                      <option value="quotation">Devis Provisoire (Sans déduction)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Mode Paiement</label>
                    <select
                      value={editPaymentMethod}
                      onChange={(e) => setEditPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="cash">Espèces</option>
                      <option value="mobile_money">Mobile Money (Orange/MTN/Wave)</option>
                      <option value="card">Carte Bancaire</option>
                      <option value="bank_transfer">Virement Bancaire</option>
                      <option value="check">Chèque</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Remise Globale ({currentBusiness.currencySymbol})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editDiscountAmount}
                      onChange={(e) => setEditDiscountAmount(Number(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Montant Encaissé ({currentBusiness.currencySymbol})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editPaidAmount}
                      onChange={(e) => setEditPaidAmount(Number(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 text-emerald-400 rounded-lg p-2 font-extrabold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: ADD ARTICLES TO THE DOCUMENT */}
              <div className="bg-slate-950 p-4 rounded-xl border border-blue-900/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs">
                    <Plus className="w-4 h-4" />
                    <span>Ajouter un Article au Document</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={onlyInStockInModal}
                        onChange={(e) => setOnlyInStockInModal(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                      />
                      <span className="text-emerald-400 font-medium">
                        Articles en stock uniquement dans ce magasin
                      </span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      ({modalAvailableProducts.length} disponibles)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  {/* Product Search & Dropdown */}
                  <div className="sm:col-span-5 relative" ref={productDropdownRef}>
                    <label className="block text-slate-300 font-semibold mb-1 text-[11px]">
                      Rechercher le Produit
                    </label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={productSearchInModal}
                        onFocus={() => setIsProductDropdownOpen(true)}
                        onChange={(e) => {
                          setProductSearchInModal(e.target.value);
                          setIsProductDropdownOpen(true);
                          if (selectedProductToAdd) {
                            setSelectedProductToAdd('');
                            setSelectedVariationToAdd('');
                            setAddItemCustomPrice('');
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (!selectedProductToAdd && modalAvailableProducts.length > 0) {
                              const firstProduct = modalAvailableProducts[0];
                              setSelectedProductToAdd(firstProduct.id);
                              setSelectedVariationToAdd('');
                              setAddItemCustomPrice(firstProduct.sellingPrice);
                              setProductSearchInModal(firstProduct.name);
                              setIsProductDropdownOpen(false);
                            }
                          } else if (e.key === 'Escape') {
                            setIsProductDropdownOpen(false);
                          }
                        }}
                        placeholder="Nom, SKU ou code-barres..."
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg pl-8 pr-7 py-2 text-xs font-semibold placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      {(productSearchInModal || selectedProductToAdd) && (
                        <button
                          type="button"
                          onClick={() => {
                            setProductSearchInModal('');
                            setSelectedProductToAdd('');
                            setSelectedVariationToAdd('');
                            setAddItemCustomPrice('');
                            setIsProductDropdownOpen(true);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                          title="Effacer la recherche"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {isProductDropdownOpen && (
                      <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-xl divide-y divide-slate-800/70">
                        {modalAvailableProducts.length === 0 ? (
                          <div className="px-3 py-2.5 text-xs text-slate-400 text-center">
                            Aucun article trouvé
                          </div>
                        ) : (
                          modalAvailableProducts.map((p) => {
                            const stock = getProductStockForLocation(p, editLocationId);
                            const isSelected = p.id === selectedProductToAdd;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setSelectedProductToAdd(p.id);
                                  setSelectedVariationToAdd('');
                                  setAddItemCustomPrice(p.sellingPrice);
                                  setProductSearchInModal(p.name);
                                  setIsProductDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between gap-2 ${
                                  isSelected
                                    ? 'bg-blue-600/20 text-blue-300'
                                    : 'text-slate-200 hover:bg-slate-800'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="font-semibold truncate">{p.name}</div>
                                  <div className="text-[10px] text-slate-400 truncate">
                                    SKU: {p.sku}
                                    {p.barcode ? ` · ${p.barcode}` : ''}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="font-bold text-emerald-400">
                                    {p.sellingPrice.toLocaleString('fr-FR')}{' '}
                                    {currentBusiness.currencySymbol}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    Stock: {stock}
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Variation selector if product has variations */}
                  {selectedProductObj && selectedProductObj.variations && selectedProductObj.variations.length > 0 ? (
                    <div className="sm:col-span-3">
                      <label className="block text-slate-300 font-semibold mb-1 text-[11px]">
                        Variante ({selectedProductObj.variations.length})
                      </label>
                      <select
                        value={selectedVariationToAdd}
                        onChange={(e) => {
                          setSelectedVariationToAdd(e.target.value);
                          const v = selectedProductObj.variations?.find(
                            (varVal) => varVal.id === e.target.value
                          );
                          if (v) {
                            setAddItemCustomPrice(v.sellingPrice);
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">-- Choisir la déclinaison --</option>
                        {selectedProductObj.variations
                          .filter((v) => {
                            if (!onlyInStockInModal || !editLocationId) return true;
                            return (Number(v.locationStock?.[editLocationId]) || 0) > 0;
                          })
                          .map((v) => {
                            const varStock = editLocationId
                              ? Number(v.locationStock?.[editLocationId]) || 0
                              : (Object.values(v.locationStock || {}) as number[]).reduce((a, b) => a + b, 0);
                            return (
                              <option key={v.id} value={v.id}>
                                {v.name} ({v.sellingPrice.toLocaleString('fr-FR')}{' '}
                                {currentBusiness.currencySymbol}) [Stock: {varStock}]
                              </option>
                            );
                          })}
                      </select>
                    </div>
                  ) : (
                    <div className="sm:col-span-3">
                      <label className="block text-slate-300 font-semibold mb-1 text-[11px]">
                        Prix Unitaire ({currentBusiness.currencySymbol})
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Prix de vente"
                        value={addItemCustomPrice}
                        onChange={(e) =>
                          setAddItemCustomPrice(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Quantity */}
                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-semibold mb-1 text-[11px]">
                      Quantité
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={addItemQty}
                      onChange={(e) => setAddItemQty(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs font-bold text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Add Button */}
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddItemToEdit}
                      disabled={!selectedProductToAdd}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg font-bold flex items-center justify-center space-x-1 transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* TABLE: CURRENT ARTICLES IN DOCUMENT */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex justify-between items-center">
                  <div className="font-bold text-slate-200 flex items-center space-x-2">
                    <ShoppingBag className="w-4 h-4 text-emerald-400" />
                    <span>Articles Inclus dans le Document ({editItems.length})</span>
                  </div>
                  {editItems.length === 0 && (
                    <span className="text-rose-400 font-semibold text-[11px]">
                      Aucun article ! Veuillez en ajouter au moins un.
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 uppercase text-[10px] text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-3">Article</th>
                        <th className="p-3 w-32 text-center">Prix Unitaire</th>
                        <th className="p-3 w-36 text-center">Quantité</th>
                        <th className="p-3 text-right">Sous-total</th>
                        <th className="p-3 w-16 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {editItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-500 italic">
                            Le document ne contient aucun article. Utilisez le formulaire ci-dessus pour ajouter des articles.
                          </td>
                        </tr>
                      ) : (
                        editItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                            <td className="p-3">
                              <span className="font-bold text-slate-100">{item.productName}</span>
                            </td>

                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.unitPrice}
                                  onChange={(e) => handleUpdateItemPrice(idx, Number(e.target.value))}
                                  className="w-24 bg-slate-900 border border-slate-700 text-white rounded p-1 text-center font-bold font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                />
                                <span className="text-[10px] text-slate-400">
                                  {currentBusiness.currencySymbol}
                                </span>
                              </div>
                            </td>

                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQty(idx, item.quantity - 1)}
                                  className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleUpdateItemQty(idx, Math.max(1, Number(e.target.value) || 1))
                                  }
                                  className="w-14 bg-slate-900 border border-slate-700 text-white rounded p-1 text-center font-bold font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQty(idx, item.quantity + 1)}
                                  className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>

                            <td className="p-3 text-right font-bold text-emerald-400 font-mono">
                              {(item.unitPrice * item.quantity).toLocaleString('fr-FR')}{' '}
                              {currentBusiness.currencySymbol}
                            </td>

                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1.5 bg-rose-950/40 hover:bg-rose-900/80 text-rose-400 hover:text-rose-200 rounded-lg border border-rose-900/50 transition-colors"
                                title="Supprimer cet article"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* LIVE TOTALS RECAP */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[11px]">
                    Notes & Observations
                  </label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full sm:w-80 bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs"
                    placeholder="Observations facultatives sur le devis/vente..."
                  />
                </div>

                <div className="space-y-1.5 w-full sm:w-72 text-right">
                  <div className="flex justify-between text-slate-400">
                    <span>Total Brut :</span>
                    <span className="font-mono text-slate-200 font-bold">
                      {editItemsSubtotal.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                    </span>
                  </div>

                  {editTaxTotal > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>TVA / Taxes :</span>
                      <span className="font-mono text-slate-200 font-bold">
                        +{editTaxTotal.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                      </span>
                    </div>
                  )}

                  {editDiscountAmount > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>Remise :</span>
                      <span className="font-mono font-bold">
                        -{editDiscountAmount.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-base font-extrabold text-white pt-1.5 border-t border-slate-800">
                    <span>Total Net :</span>
                    <span className="font-mono text-emerald-400">
                      {editFinalTotal.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Payé :</span>
                    <span className="font-mono text-emerald-300 font-bold">
                      {editPaidAmount.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-800">
                    <span className={editCalculatedDue > 0 ? 'text-rose-400' : 'text-slate-400'}>
                      {editCalculatedDue > 0 ? 'Reste Dû (Crédit) :' : 'Solde :'}
                    </span>
                    <span
                      className={`font-mono ${
                        editCalculatedDue > 0 ? 'text-rose-400' : 'text-slate-300'
                      }`}
                    >
                      {editCalculatedDue.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                    </span>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setEditPaidAmount(editFinalTotal)}
                      className="text-[10px] text-blue-400 hover:text-blue-300 underline font-semibold"
                    >
                      Régler la totalité ({editFinalTotal.toLocaleString('fr-FR')}{' '}
                      {currentBusiness.currencySymbol})
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700 text-xs transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={editItems.length === 0}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-950 text-xs flex items-center space-x-1.5 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Enregistrer les Modifications</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deletingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-4">
          <div className="bg-slate-900 border border-rose-900/50 text-white rounded-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-white">
                {deletingSale.status === 'quotation' ? 'Supprimer le Devis ?' : 'Supprimer la Vente ?'}
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer la facture <span className="font-bold text-white font-mono">{deletingSale.invoiceNo}</span> d'un montant de{' '}
              <span className="font-bold text-emerald-400">{deletingSale.totalAmount.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}</span> ?
              {deletingSale.status === 'final' && (
                <span className="block mt-2 text-amber-300 font-semibold bg-amber-950/40 p-2 rounded-lg border border-amber-900/50">
                  ℹ️ Les stocks déduits seront automatiquement restitués dans l'inventaire du magasin.
                </span>
              )}
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSale(null)}
                className="px-4 py-2 min-h-[40px] bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700 text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 min-h-[40px] bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs shadow-md shadow-rose-950"
              >
                Confirmer la Suppression
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT MODAL */}
      {selectedSaleForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4">
          <div className="bg-white text-slate-900 rounded-2xl p-4 sm:p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 no-print">
              <h3 className="font-bold text-base text-slate-900">Impression Facture / Devis</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Lancer l'impression</span>
                </button>
                <button onClick={() => setSelectedSaleForPrint(null)} className="p-2 text-slate-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div id="printable-area" className="space-y-4 text-xs">
              <div className="text-center border-b pb-3">
                <h2 className="text-lg font-black tracking-tight text-slate-900">{currentBusiness.name}</h2>
                <div className="mt-1 font-mono text-xs font-bold text-blue-800">
                  {selectedSaleForPrint.invoiceNo}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap justify-between gap-1 text-slate-600">
                  <span>Date: {selectedSaleForPrint.saleDate}</span>
                  <span>Statut: {selectedSaleForPrint.status === 'final' ? 'Facture Définitive' : 'Devis Provisoire'}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-t border-b border-slate-200 py-2 min-w-[320px]">
                  <thead>
                    <tr className="border-b">
                      <th className="py-1">Article</th>
                      <th className="py-1 text-center">Qté</th>
                      <th className="py-1 text-right">P.U.</th>
                      <th className="py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSaleForPrint.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-1">{it.productName}</td>
                        <td className="py-1 text-center">{it.quantity}</td>
                        <td className="py-1 text-right tabular-nums">{it.unitPrice.toLocaleString('fr-FR')}</td>
                        <td className="py-1 text-right font-semibold tabular-nums">{it.subtotal.toLocaleString('fr-FR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t pt-2 space-y-1 text-right font-extrabold text-sm tabular-nums">
                <span>Total: {selectedSaleForPrint.totalAmount.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

