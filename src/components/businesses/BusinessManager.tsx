import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Business, BusinessLocation, InvoiceLayout } from '../../types';
import { Building2, MapPin, Plus, Edit2, Layout, CheckCircle2, X, Sparkles, Trash2, AlertCircle } from 'lucide-react';

export const BusinessManager: React.FC = () => {
  const {
    state,
    currentBusiness,
    addBusiness,
    updateBusiness,
    addLocation,
    updateLocation,
    deleteLocation,
    setBusinessId,
  } = useERP();

  const [activeTab, setActiveTab] = useState<'businesses' | 'locations' | 'invoice_layout' | 'wizard'>('businesses');

  // New & Edit Business State
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [bizName, setBizName] = useState('');
  const [bizCurrency, setBizCurrency] = useState('FCFA');
  const [bizCurrencyCode, setBizCurrencyCode] = useState('XOF');
  const [bizMargin, setBizMargin] = useState(25);
  const [showAddBizModal, setShowAddBizModal] = useState(false);

  // New & Edit Location State
  const [editingLocation, setEditingLocation] = useState<BusinessLocation | null>(null);
  const [locationToDelete, setLocationToDelete] = useState<BusinessLocation | null>(null);
  const [showAddLocModal, setShowAddLocModal] = useState(false);
  const [locName, setLocName] = useState('');
  const [locCode, setLocCode] = useState('');
  const [locAddress, setLocAddress] = useState('');
  const [locCity, setLocCity] = useState('Abidjan');
  const [locPhone, setLocPhone] = useState('+225 ');
  const [locEmail, setLocEmail] = useState('');

  // Invoice Layout Customization State for selected location
  const businessLocations = state.locations.filter((l) => l.businessId === currentBusiness.id);
  const [selectedLocForLayout, setSelectedLocForLayout] = useState<BusinessLocation>(
    businessLocations[0] || state.locations[0]
  );

  const [headerText, setHeaderText] = useState(
    selectedLocForLayout?.invoiceLayout?.headerText || ''
  );
  const [footerText, setFooterText] = useState(
    selectedLocForLayout?.invoiceLayout?.footerText || ''
  );
  const [invoicePrefix, setInvoicePrefix] = useState(
    selectedLocForLayout?.invoiceLayout?.invoicePrefix || 'FAC-'
  );
  const [primaryColor, setPrimaryColor] = useState(
    selectedLocForLayout?.invoiceLayout?.primaryColor || '#1e40af'
  );

  const handleOpenAddBiz = () => {
    setEditingBusiness(null);
    setBizName('');
    setBizCurrency('FCFA');
    setBizCurrencyCode('XOF');
    setBizMargin(25);
    setShowAddBizModal(true);
  };

  const handleOpenEditBiz = (biz: Business) => {
    setEditingBusiness(biz);
    setBizName(biz.name);
    setBizCurrency(biz.currencySymbol);
    setBizCurrencyCode(biz.currencyCode);
    setBizMargin(biz.defaultProfitMargin || 25);
    setShowAddBizModal(true);
  };

  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizName.trim()) return;

    if (editingBusiness) {
      updateBusiness({
        ...editingBusiness,
        name: bizName.trim(),
        currencySymbol: bizCurrency.trim() || 'FCFA',
        currencyCode: bizCurrencyCode.trim() || 'XOF',
        defaultProfitMargin: Number(bizMargin) || 25,
      });
    } else {
      addBusiness({
        name: bizName.trim(),
        currencySymbol: bizCurrency.trim() || 'FCFA',
        currencyCode: bizCurrencyCode.trim() || 'XOF',
        timezone: 'Africa/Abidjan',
        financialYearStartMonth: 1,
        defaultProfitMargin: Number(bizMargin) || 25,
      });
    }

    setBizName('');
    setShowAddBizModal(false);
  };

  const handleOpenAddLocation = () => {
    setEditingLocation(null);
    setLocName('');
    setLocCode(`LOC-${Date.now().toString().slice(-3)}`);
    setLocAddress('');
    setLocCity('Abidjan');
    setLocPhone('+225 ');
    setLocEmail('');
    setShowAddLocModal(true);
  };

  const handleOpenEditLocation = (loc: BusinessLocation) => {
    setEditingLocation(loc);
    setLocName(loc.name);
    setLocCode(loc.code);
    setLocAddress(loc.address);
    setLocCity(loc.city);
    setLocPhone(loc.phone);
    setLocEmail(loc.email);
    setShowAddLocModal(true);
  };

  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName.trim()) return;

    if (editingLocation) {
      updateLocation({
        ...editingLocation,
        name: locName.trim(),
        code: locCode.trim() || editingLocation.code,
        address: locAddress.trim() || 'Adresse non spécifiée',
        city: locCity.trim() || 'Abidjan',
        phone: locPhone.trim() || '+225',
        email: locEmail.trim() || `contact@${locName.toLowerCase().replace(/\s+/g, '')}.com`,
      });
    } else {
      addLocation({
        businessId: currentBusiness.id,
        name: locName.trim(),
        code: locCode.trim() || `LOC-${Date.now().toString().slice(-3)}`,
        address: locAddress.trim() || 'Adresse non spécifiée',
        city: locCity.trim() || 'Abidjan',
        country: 'Côte d’Ivoire',
        phone: locPhone.trim() || '+225',
        email: locEmail.trim() || `contact@${locName.toLowerCase().replace(/\s+/g, '')}.com`,
        invoiceLayout: {
          headerText: `${locName.toUpperCase()} - Facture Officielle`,
          footerText: 'Merci de votre confiance !',
          showLogo: true,
          invoicePrefix: 'FAC-',
          quotationPrefix: 'DEV-',
          primaryColor: '#1e40af',
          showTaxDetails: true,
          termsAndConditions: 'Paiement selon les conditions convenues.',
        },
      });
    }

    setLocName('');
    setLocCode('');
    setShowAddLocModal(false);
  };

  const handleConfirmDeleteLocation = () => {
    if (locationToDelete) {
      deleteLocation(locationToDelete.id);
      setLocationToDelete(null);
    }
  };

  const handleSaveInvoiceLayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocForLayout) return;

    const updatedLayout: InvoiceLayout = {
      ...selectedLocForLayout.invoiceLayout,
      headerText,
      footerText,
      invoicePrefix,
      primaryColor,
    };

    updateLocation({
      ...selectedLocForLayout,
      invoiceLayout: updatedLayout,
    });
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 text-white max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-black text-white">Paramètres Commerces & Magasins</h2>
            <p className="text-xs text-slate-400">
              Gérez les entreprises, vos points de vente physiques et la personnalisation des factures.
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('businesses')}
            className={`px-3 min-h-[40px] sm:min-h-[32px] py-1.5 rounded-lg transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'businesses' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Commerces
          </button>
          <button
            onClick={() => setActiveTab('locations')}
            className={`px-3 min-h-[40px] sm:min-h-[32px] py-1.5 rounded-lg transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'locations' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Magasins & Dépôts
          </button>
          <button
            onClick={() => setActiveTab('invoice_layout')}
            className={`px-3 min-h-[40px] sm:min-h-[32px] py-1.5 rounded-lg transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'invoice_layout' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Modèle Facture
          </button>
          <button
            onClick={() => setActiveTab('wizard')}
            className={`px-3 min-h-[40px] sm:min-h-[32px] py-1.5 rounded-lg transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'wizard' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Assistant 3-Étapes
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: BUSINESSES */}
      {activeTab === 'businesses' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2.5 bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="text-xs font-bold text-slate-300">
              Liste des Entreprises Multi-Commerces ({state.businesses.length})
            </span>
            <button
              onClick={handleOpenAddBiz}
              className="px-3.5 min-h-[42px] sm:min-h-[34px] py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1 shadow-md transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Créer un Nouveau Commerce</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.businesses.map((biz) => (
              <div
                key={biz.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  biz.id === currentBusiness.id
                    ? 'bg-slate-900 border-blue-500 shadow-lg ring-1 ring-blue-500/50'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-base border border-blue-500/30">
                        {biz.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white">{biz.name}</h3>
                        <span className="text-[10px] text-slate-400">
                          Créé le {biz.createdAt.split('T')[0]}
                        </span>
                      </div>
                    </div>
                    {biz.id === currentBusiness.id && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-600 text-white flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Actif</span>
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300 border-t border-slate-800 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Devise Principale:</span>
                      <strong className="text-emerald-400">
                        {biz.currencySymbol} ({biz.currencyCode})
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Marge Défaut:</span>
                      <strong className="text-amber-400">{biz.defaultProfitMargin}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Emplacements:</span>
                      <strong className="text-white">
                        {state.locations.filter((l) => l.businessId === biz.id).length} local/locaux
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center space-x-2 border-t border-slate-800/80 mt-4">
                  <button
                    onClick={() => handleOpenEditBiz(biz)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-colors"
                    title="Modifier les paramètres du commerce"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setBusinessId(biz.id)}
                    disabled={biz.id === currentBusiness.id}
                    className="flex-1 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-xl text-xs font-bold border border-blue-500/30 transition-all disabled:opacity-50"
                  >
                    {biz.id === currentBusiness.id ? 'Commerce Actif' : 'Basculer'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: LOCATIONS */}
      {activeTab === 'locations' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2.5 bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="text-xs font-bold text-slate-300">
              Magasins & Entrepôts pour <strong className="text-blue-400">{currentBusiness.name}</strong> ({businessLocations.length})
            </span>
            <button
              onClick={handleOpenAddLocation}
              className="px-3.5 min-h-[42px] sm:min-h-[34px] py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1 shadow-md transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter un Magasin</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {businessLocations.map((loc) => (
              <div key={loc.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-sm text-white flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate">{loc.name}</span>
                    </h4>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                      {loc.code}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">{loc.address}, {loc.city}</p>
                  <p className="text-xs text-slate-400">Tél: {loc.phone || 'Non renseigné'}</p>
                  {loc.email && <p className="text-[11px] text-slate-500 truncate">Email: {loc.email}</p>}
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
                  <button
                    onClick={() => handleOpenEditLocation(loc)}
                    className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg border border-blue-500/30 text-xs font-bold flex items-center space-x-1 transition-colors"
                    title="Modifier ce magasin"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Modifier</span>
                  </button>
                  <button
                    onClick={() => setLocationToDelete(loc)}
                    className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg border border-rose-500/30 text-xs font-bold flex items-center space-x-1 transition-colors"
                    title="Supprimer ce magasin"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: INVOICE LAYOUT */}
      {activeTab === 'invoice_layout' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 max-w-2xl">
          <h3 className="font-bold text-base text-white">Personnalisation du Modèle de Facture</h3>
          <p className="text-xs text-slate-400">
            Définissez l'en-tête, le pied de page et la couleur principale des factures d'un emplacement.
          </p>

          <form onSubmit={handleSaveInvoiceLayout} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Sélectionner l'Emplacement *</label>
              <select
                value={selectedLocForLayout?.id}
                onChange={(e) => {
                  const loc = state.locations.find((l) => l.id === e.target.value);
                  if (loc) {
                    setSelectedLocForLayout(loc);
                    setHeaderText(loc.invoiceLayout.headerText);
                    setFooterText(loc.invoiceLayout.footerText);
                    setInvoicePrefix(loc.invoiceLayout.invoicePrefix);
                    setPrimaryColor(loc.invoiceLayout.primaryColor);
                  }
                }}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold"
              >
                {businessLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Préfixe Numéro de Facture</label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Texte d'En-tête de Facture</label>
              <textarea
                rows={2}
                value={headerText}
                onChange={(e) => setHeaderText(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2"
              ></textarea>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Pied de Page / Conditions de Garantie</label>
              <textarea
                rows={2}
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2"
              ></textarea>
            </div>

            <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md">
              Enregistrer le Modèle
            </button>
          </form>
        </div>
      )}

      {/* SUB-TAB 4: 3-STEP INSTALLATION WIZARD */}
      {activeTab === 'wizard' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 max-w-3xl mx-auto">
          <div className="text-center space-y-1">
            <h3 className="font-extrabold text-lg text-white">Assistant d'Installation Rapide en 3 Étapes</h3>
            <p className="text-xs text-slate-400">Configurez facilement un nouveau magasin prêt pour la vente.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
              <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-extrabold text-[10px]">Étape 1</span>
              <h4 className="font-bold text-white text-sm">Informations Entreprise</h4>
              <p className="text-slate-400 text-[11px]">Nom du commerce, devise (FCFA/EUR), fuseau horaire et taux de marge par défaut.</p>
            </div>

            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
              <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-extrabold text-[10px]">Étape 2</span>
              <h4 className="font-bold text-white text-sm">Emplacement Initial</h4>
              <p className="text-slate-400 text-[11px]">Créez le premier magasin, boutique ou entrepôt avec adresse et contact.</p>
            </div>

            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
              <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-extrabold text-[10px]">Étape 3</span>
              <h4 className="font-bold text-white text-sm">Administrateur & Caisse</h4>
              <p className="text-slate-400 text-[11px]">Attribution des comptes utilisateurs, caissiers et ouverture de la caisse.</p>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT BUSINESS MODAL */}
      {showAddBizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 sm:p-6 w-full max-w-md shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">
                {editingBusiness ? 'Modifier le Commerce' : 'Créer un Nouveau Commerce'}
              </h3>
              <button onClick={() => setShowAddBizModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBusiness} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nom de l'Entreprise *</label>
                <input
                  type="text"
                  required
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  placeholder="ex: Distribution San Pedro SARL"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Symbole Devise</label>
                  <input
                    type="text"
                    value={bizCurrency}
                    onChange={(e) => setBizCurrency(e.target.value)}
                    placeholder="FCFA / € / $"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Code Devise</label>
                  <input
                    type="text"
                    value={bizCurrencyCode}
                    onChange={(e) => setBizCurrencyCode(e.target.value)}
                    placeholder="XOF / EUR / USD"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Marge Bénéficiaire Défaut (%)</label>
                <input
                  type="number"
                  value={bizMargin}
                  onChange={(e) => setBizMargin(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddBizModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Annuler
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-md">
                  {editingBusiness ? 'Enregistrer Modifications' : 'Créer le Commerce'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT LOCATION MODAL */}
      {showAddLocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 sm:p-6 w-full max-w-md shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">
                {editingLocation ? 'Modifier le Magasin / Entrepôt' : 'Nouveau Magasin / Entrepôt'}
              </h3>
              <button onClick={() => setShowAddLocModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLocation} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nom de l'Emplacement *</label>
                <input
                  type="text"
                  required
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  placeholder="ex: Boutique Treichville"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Code Emplacement</label>
                  <input
                    type="text"
                    value={locCode}
                    onChange={(e) => setLocCode(e.target.value)}
                    placeholder="ex: LOC-01"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Ville</label>
                  <input
                    type="text"
                    value={locCity}
                    onChange={(e) => setLocCity(e.target.value)}
                    placeholder="ex: Abidjan"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Adresse Physique</label>
                <input
                  type="text"
                  value={locAddress}
                  onChange={(e) => setLocAddress(e.target.value)}
                  placeholder="ex: Avenue 16 Rue 21"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={locPhone}
                    onChange={(e) => setLocPhone(e.target.value)}
                    placeholder="+225 07..."
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={locEmail}
                    onChange={(e) => setLocEmail(e.target.value)}
                    placeholder="magasin@domaine.com"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddLocModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Annuler
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-md">
                  {editingLocation ? 'Enregistrer Modifications' : 'Créer l\'Emplacement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE LOCATION MODAL */}
      {locationToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400 border-b border-slate-800 pb-3">
              <div className="p-2 bg-rose-500/20 rounded-xl">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Supprimer le Magasin</h3>
                <p className="text-xs text-slate-400">Action irréversible</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <p>
                Êtes-vous sûr de vouloir supprimer le magasin{' '}
                <strong className="text-white font-bold">"{locationToDelete.name}"</strong> (Code:{' '}
                <span className="font-mono text-emerald-300">{locationToDelete.code}</span>) ?
              </p>
              {businessLocations.length <= 1 && (
                <div className="p-3 bg-amber-950/50 border border-amber-700/60 rounded-xl text-amber-300 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Attention : Il s'agit du seul magasin de ce commerce. La suppression laissera ce commerce sans point de vente jusqu'à création d'un nouveau.
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setLocationToDelete(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteLocation}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-md"
              >
                Oui, Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
