import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Contact, ContactType } from '../../types';
import { Contact as ContactIcon, Plus, Search, Phone, Mail, Building, AlertCircle, X, DollarSign, Edit2, Trash2, AlertTriangle } from 'lucide-react';

export const ContactManager: React.FC = () => {
  const { state, currentBusiness, addContact, updateContact, deleteContact } = useERP();

  const [activeType, setActiveType] = useState<'all' | ContactType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [selectedContactForTx, setSelectedContactForTx] = useState<Contact | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<ContactType>('customer');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(30);

  const handleOpenAddModal = () => {
    setEditingContact(null);
    setName('');
    setType('customer');
    setCompanyName('');
    setEmail('');
    setPhone('+225 ');
    setAddress('');
    setTaxNumber('');
    setPaymentTermsDays(30);
    setShowModal(true);
  };

  const handleOpenEditModal = (c: Contact) => {
    setEditingContact(c);
    setName(c.name);
    setType(c.type);
    setCompanyName(c.companyName || '');
    setEmail(c.email || '');
    setPhone(c.phone);
    setAddress(c.address || '');
    setTaxNumber(c.taxNumber || '');
    setPaymentTermsDays(c.paymentTermsDays || 30);
    setShowModal(true);
  };

  const handleDeleteContactConfirm = () => {
    if (!deletingContact) return;
    deleteContact(deletingContact.id);
    setDeletingContact(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    if (editingContact) {
      updateContact({
        ...editingContact,
        name,
        type,
        companyName,
        email,
        phone,
        address,
        taxNumber,
        paymentTermsDays,
      });
    } else {
      addContact({
        businessId: currentBusiness.id,
        type,
        name,
        companyName,
        email,
        phone,
        address,
        taxNumber,
        paymentTermsDays,
      });
    }

    setShowModal(false);
  };

  const filteredContacts = state.contacts.filter((c) => {
    if (c.businessId !== currentBusiness.id) return false;
    if (activeType !== 'all' && c.type !== activeType && c.type !== 'both') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.companyName && c.companyName.toLowerCase().includes(q)) ||
        c.phone.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30 shrink-0">
            <ContactIcon className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold">Gestion des Contacts & Clientèle</h2>
            <p className="text-xs text-slate-400">
              Clients, Fournisseurs, conditions de règlement et suivi des soldes débiteurs/créditeurs.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center space-x-2 px-4 min-h-[44px] sm:min-h-[38px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-900/30 shrink-0 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Contact</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-lg overflow-x-auto">
          <button
            onClick={() => setActiveType('all')}
            className={`px-3 min-h-[38px] sm:min-h-[32px] rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeType === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => setActiveType('customer')}
            className={`px-3 min-h-[38px] sm:min-h-[32px] rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeType === 'customer' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Clients
          </button>
          <button
            onClick={() => setActiveType('supplier')}
            className={`px-3 min-h-[38px] sm:min-h-[32px] rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeType === 'supplier' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Fournisseurs
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, entreprise, téléphone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[42px] sm:min-h-[36px] bg-slate-800 text-white pl-9 pr-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[720px]">
          <thead className="bg-slate-950 border-b border-slate-800 uppercase text-[10px] font-bold text-slate-400">
            <tr>
              <th className="p-3">Contact / Raison Sociale</th>
              <th className="p-3">Type</th>
              <th className="p-3">Coordonnées</th>
              <th className="p-3">Conditions Règl.</th>
              <th className="p-3 text-right">Solde Actuel</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredContacts.map((c) => (
              <tr key={c.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="p-3">
                  <div className="font-bold text-slate-100 flex items-center space-x-1.5">
                    <span>{c.name}</span>
                    {c.isDefaultWalkIn && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-900/80 text-blue-300">
                        Par Défaut
                      </span>
                    )}
                  </div>
                  {c.companyName && (
                    <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                      <Building className="w-3 h-3" />
                      <span>{c.companyName}</span>
                    </div>
                  )}
                </td>

                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      c.type === 'customer'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : c.type === 'supplier'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-purple-950 text-purple-300 border border-purple-800'
                    }`}
                  >
                    {c.type === 'customer'
                      ? 'Client'
                      : c.type === 'supplier'
                      ? 'Fournisseur'
                      : 'Client & Fournisseur'}
                  </span>
                </td>

                <td className="p-3 space-y-0.5">
                  <div className="flex items-center space-x-1 text-slate-300">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{c.phone}</span>
                  </div>
                  {c.email && (
                    <div className="flex items-center space-x-1 text-slate-400 text-[11px]">
                      <Mail className="w-3 h-3 text-slate-500" />
                      <span>{c.email}</span>
                    </div>
                  )}
                </td>

                <td className="p-3 font-semibold text-slate-300">
                  {c.paymentTermsDays === 0 ? 'Comptant' : `${c.paymentTermsDays} jours`}
                </td>

                <td className="p-3 text-right">
                  <span
                    className={`font-black text-sm ${
                      c.currentBalance > 0
                        ? 'text-emerald-400'
                        : c.currentBalance < 0
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {c.currentBalance.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                  </span>
                  <div className="text-[10px] text-slate-500">
                    {c.currentBalance > 0
                      ? 'Débit (Client nous doit)'
                      : c.currentBalance < 0
                      ? 'Crédit (Dette fournisseur)'
                      : 'Solde nul'}
                  </div>
                </td>

                <td className="p-3 text-right space-x-1">
                  <button
                    onClick={() => setSelectedContactForTx(c)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg border border-slate-700 text-xs font-semibold"
                  >
                    Transactions
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(c)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-xs font-semibold"
                    title="Modifier le contact"
                  >
                    <Edit2 className="w-3.5 h-3.5 inline mr-1" />
                    <span>Modifier</span>
                  </button>
                  <button
                    onClick={() => setDeletingContact(c)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-rose-950/80 text-rose-400 hover:text-rose-300 rounded-lg border border-slate-700 hover:border-rose-800 text-xs font-semibold transition-colors"
                    title="Supprimer le contact"
                  >
                    <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                    <span>Supprimer</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT CONTACT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 sm:p-6 w-full max-w-lg shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">
                {editingContact ? 'Modifier le Contact' : 'Nouveau Contact'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Type de Contact *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ContactType)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold"
                >
                  <option value="customer">Client</option>
                  <option value="supplier">Fournisseur</option>
                  <option value="both">Client & Fournisseur</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nom Complet / Contact *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2"
                  placeholder="ex: M. Yao Julien"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nom Entreprise / Raison Sociale</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2"
                  placeholder="ex: Yao Import SARL"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Téléphone *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Conditions de Règlement (jours)</label>
                <select
                  value={paymentTermsDays}
                  onChange={(e) => setPaymentTermsDays(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-semibold"
                >
                  <option value={0}>Comptant (0 jour)</option>
                  <option value={7}>7 jours net</option>
                  <option value={15}>15 jours net</option>
                  <option value={30}>30 jours net</option>
                  <option value={60}>60 jours net</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold"
                >
                  Enregistrer Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSACTION HISTORY MODAL */}
      {selectedContactForTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base">{selectedContactForTx.name}</h3>
                <p className="text-xs text-slate-400">Historique des transactions & factures</p>
              </div>
              <button onClick={() => setSelectedContactForTx(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 flex justify-between text-xs">
              <div>
                <span className="text-slate-400 block">Solde Actuel:</span>
                <span className="text-lg font-black text-emerald-400">
                  {selectedContactForTx.currentBalance.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Conditions de paiement:</span>
                <span className="font-bold text-white">{selectedContactForTx.paymentTermsDays} jours</span>
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2 text-xs">
              {state.sales
                .filter((s) => s.customerId === selectedContactForTx.id)
                .map((s) => (
                  <div key={s.id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 flex justify-between">
                    <div>
                      <div className="font-bold text-white">Facture: {s.invoiceNo}</div>
                      <div className="text-[10px] text-slate-400">Date: {s.saleDate} | Statut: {s.status}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-emerald-400">
                        {s.totalAmount.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                      </div>
                      <div className="text-[10px] text-amber-400 font-semibold">
                        Reste dû: {s.dueAmount.toLocaleString('fr-FR')}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setSelectedContactForTx(null)} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONTACT CONFIRM MODAL */}
      {deletingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-slate-900 border border-rose-900/50 text-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-white">Supprimer le Contact ?</h3>
            </div>

            <p className="text-xs text-slate-300">
              Êtes-vous sûr de vouloir supprimer{' '}
              <span className="font-bold text-white">{deletingContact.name}</span>
              {deletingContact.companyName ? ` (${deletingContact.companyName})` : ''} ?
              Cette action est irréversible.
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingContact(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700 text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteContactConfirm}
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
