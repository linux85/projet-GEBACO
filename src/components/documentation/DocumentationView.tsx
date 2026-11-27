import React from 'react';
import { FileText, CheckCircle, HelpCircle, BookOpen, Layers, Shield, ShoppingBag, Receipt, BarChart, Settings } from 'lucide-react';

export const DocumentationView: React.FC = () => {
  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 text-white max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-2">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 sm:p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30 shrink-0">
            <BookOpen className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-white">Documentation Officielle du Système ERP</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Guide complet d'utilisation, architecture multi-magasin, caisse POS et comptabilité séparée.
            </p>
          </div>
        </div>
      </div>

      {/* Modules Guide */}
      <div className="space-y-4">
        {/* Module 1 */}
        <section className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
          <h2 className="font-bold text-sm text-blue-400 flex items-center space-x-2">
            <Layers className="w-4 h-4" />
            <span>1. Gestion Multi-Entreprises & Isolation des Données</span>
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            L'ERP prend en charge plusieurs entreprises indépendantes sans aucune restriction. Les informations de stock, de facturation et de comptabilité sont strictement cloisonnées par entreprise via l'identifiant <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-400 font-mono">businessId</code>.
          </p>
        </section>

        {/* Module 2 */}
        <section className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
          <h2 className="font-bold text-sm text-emerald-400 flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span>2. Emplacements, Vitrines & Entrepôts</span>
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Pour chaque entreprise, vous pouvez configurer plusieurs lieux de stockage ou points de vente. Chaque emplacement dispose de son propre stock, de ses propres historiques de ventes/achats, et d'un modèle de facture personnalisé (en-tête, pied de page et logo).
          </p>
        </section>

        {/* Module 3 */}
        <section className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
          <h2 className="font-bold text-sm text-purple-400 flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>3. Utilisateurs, Rôles & Sécurité</span>
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Système de permissions avancées. Rôles prédéfinis (Administrateur, Caissier) et possibilité de définir des rôles sur-mesure. Vous pouvez limiter les accès d'un utilisateur à un seul emplacement ou lui accorder une vue d'ensemble.
          </p>
        </section>

        {/* Module 4 */}
        <section className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
          <h2 className="font-bold text-sm text-indigo-400 flex items-center space-x-2">
            <ShoppingBag className="w-4 h-4" />
            <span>4. Contacts (Clients & Fournisseurs)</span>
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Suivez les soldes créditeurs/débiteurs, les conditions de paiement (comptant, 7, 15, 30 jours) et affichez l'historique de factures pour chaque tiers.
          </p>
        </section>

        {/* Module 5 */}
        <section className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
          <h2 className="font-bold text-sm text-amber-400 flex items-center space-x-2">
            <Receipt className="w-4 h-4" />
            <span>5. Calculs Automatiques de Prix & Codes-Barres</span>
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Saisissez le prix d'achat, le taux de marge et les taxes pour obtenir le prix de vente conseillé. Générez et imprimez des étiquettes codes-barres directement.
          </p>
        </section>

        {/* Module 6 */}
        <section className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
          <h2 className="font-bold text-sm text-rose-400 flex items-center space-x-2">
            <BarChart className="w-4 h-4" />
            <span>6. Alertes Automatiques sous 7 Jours</span>
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Le système calcule automatiquement les alertes de stock faible et vous notifie à l'approche des échéances de paiement des factures d'achat (dans la limite de 7 jours).
          </p>
        </section>
      </div>
    </div>
  );
};
