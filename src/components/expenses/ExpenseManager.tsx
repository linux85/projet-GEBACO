import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Receipt, Plus, Search, Calendar, FolderPlus, X } from 'lucide-react';

export const ExpenseManager: React.FC = () => {
  const {
    state,
    currentBusiness,
    recordExpense,
    addExpenseCategory,
  } = useERP();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);

  const categories = state.expenseCategories.filter((c) => c.businessId === currentBusiness.id);
  const locations = state.locations.filter((l) => l.businessId === currentBusiness.id);

  // New Expense Form
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [locationId, setLocationId] = useState(locations[0]?.id || '');
  const [amount, setAmount] = useState<number>(50000);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  // New Category Form
  const [catName, setCatName] = useState('');

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !categoryId) return;

    recordExpense({
      businessId: currentBusiness.id,
      locationId: locationId || locations[0]?.id || 'loc-1',
      categoryId,
      referenceNo: `DEP-${Date.now().toString().slice(-6)}`,
      expenseDate,
      amount,
      paymentMethod: 'cash',
      note,
    });

    setShowAddExpenseModal(false);
    setNote('');
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) return;
    addExpenseCategory({
      businessId: currentBusiness.id,
      name: catName,
    });
    setCatName('');
    setShowAddCategoryModal(false);
  };

  const filteredExpenses = state.expenses.filter((e) => {
    if (e.businessId !== currentBusiness.id) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return e.referenceNo.toLowerCase().includes(q) || (e.note && e.note.toLowerCase().includes(q));
    }
    return true;
  });

  const totalExpenseSum = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2.5 bg-rose-600/20 text-rose-400 rounded-xl border border-rose-500/30 shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold">Gestion des Dépenses Professionnelles</h2>
            <p className="text-xs text-slate-400">
              Saisissez les charges exploitation (loyer, électricité, salaires, transport) et suivez les sorties de caisse.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowAddCategoryModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1 px-3 min-h-[44px] sm:min-h-[38px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 whitespace-nowrap"
          >
            <FolderPlus className="w-4 h-4 shrink-0" />
            <span>Catégorie Dépense</span>
          </button>
          <button
            onClick={() => setShowAddExpenseModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 min-h-[44px] sm:min-h-[38px] bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-rose-900/30 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Enregistrer Dépense</span>
          </button>
        </div>
      </div>

      {/* Total Expense Summary Card */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Dépenses Enregistrées
          </span>
          <div className="text-xl sm:text-2xl font-black text-rose-400 mt-1 tabular-nums">
            {totalExpenseSum.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
          </div>
        </div>
        <div className="text-xs text-slate-400 font-medium">
          {filteredExpenses.length} dépense(s) comptabilisée(s)
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[640px]">
          <thead className="bg-slate-950 border-b border-slate-800 uppercase text-[10px] font-bold text-slate-400">
            <tr>
              <th className="p-3">Référence</th>
              <th className="p-3">Catégorie</th>
              <th className="p-3">Emplacement</th>
              <th className="p-3">Date</th>
              <th className="p-3">Note / Motif</th>
              <th className="p-3 text-right">Montant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredExpenses.map((exp) => {
              const cat = state.expenseCategories.find((c) => c.id === exp.categoryId);
              const loc = state.locations.find((l) => l.id === exp.locationId);

              return (
                <tr key={exp.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-3 font-bold text-slate-100 font-mono">{exp.referenceNo}</td>
                  <td className="p-3 font-semibold text-rose-300">{cat ? cat.name : 'Général'}</td>
                  <td className="p-3 text-slate-300">{loc ? loc.name : 'Tous'}</td>
                  <td className="p-3 text-slate-300 font-medium">{exp.expenseDate}</td>
                  <td className="p-3 text-slate-300 italic">{exp.note || '-'}</td>
                  <td className="p-3 text-right font-black text-rose-400 text-sm">
                    {exp.amount.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </div>

      {/* ADD EXPENSE MODAL */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 sm:p-6 w-full max-w-md shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Saisie d'une Dépense</h3>
              <button onClick={() => setShowAddExpenseModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Catégorie de Dépense *</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Emplacement *</label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-semibold"
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Montant ({currentBusiness.currencySymbol}) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-extrabold text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Note / Description</label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ex: Paiement facture d'électricité SODECI / CIE"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold"
                >
                  Enregistrer Dépense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CATEGORY MODAL */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-white">Nouvelle Catégorie de Dépense</h3>
              <button onClick={() => setShowAddCategoryModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nom de la Catégorie *</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="ex: Carburant & Transport"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Annuler
                </button>
                <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold">
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
