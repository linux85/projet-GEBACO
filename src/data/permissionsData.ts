import { Permission } from '../types';

export interface PermissionDefinition {
  id: Permission;
  label: string;
  description: string;
  category:
    | 'POS & Caisse'
    | 'Ventes & Factures'
    | 'Produits & Stocks'
    | 'Achats & Fournisseurs'
    | 'Contacts & Tiers'
    | 'Dépenses & Frais'
    | 'Rapports & Audit'
    | 'Administration & Système';
  categoryColor: string;
  iconName?: string;
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // POS & Caisse
  {
    id: 'access_pos',
    label: 'Point de Vente & Caisse (POS)',
    description: 'Accéder à la caisse tactile, ouvrir/fermer les registres et enregistrer les encaissements.',
    category: 'POS & Caisse',
    categoryColor: 'emerald',
  },

  // Ventes & Factures
  {
    id: 'view_sales',
    label: 'Consulter les Ventes & Devis',
    description: 'Voir l\'historique des ventes, factures proforma, reçus clients et le suivi journalier.',
    category: 'Ventes & Factures',
    categoryColor: 'blue',
  },
  {
    id: 'manage_sales',
    label: 'Gérer les Ventes & Factures',
    description: 'Créer, modifier, annuler des ventes, appliquer des remises exceptionnelles et générer les factures.',
    category: 'Ventes & Factures',
    categoryColor: 'blue',
  },

  // Produits & Stocks
  {
    id: 'view_products',
    label: 'Consulter le Catalogue & Stocks',
    description: 'Visualiser la liste des articles, fiches techniques, catégories, marques et niveaux de stock.',
    category: 'Produits & Stocks',
    categoryColor: 'purple',
  },
  {
    id: 'manage_products',
    label: 'Gérer les Produits & Prix',
    description: 'Créer, modifier des produits, fixer les prix d\'achat/vente, marges et seuils d\'alerte stock.',
    category: 'Produits & Stocks',
    categoryColor: 'purple',
  },
  {
    id: 'adjust_stock',
    label: 'Inventaires, Transferts & Ajustements',
    description: 'Effectuer des comptages d\'inventaire physique, régularisations de stock et transferts entre magasins.',
    category: 'Produits & Stocks',
    categoryColor: 'purple',
  },
  {
    id: 'print_barcodes',
    label: 'Génération & Impression Codes-barres',
    description: 'Générer et imprimer les planches d\'étiquettes code-barres (EAN, Code128) pour le rayonnage.',
    category: 'Produits & Stocks',
    categoryColor: 'purple',
  },

  // Achats & Fournisseurs
  {
    id: 'view_purchases',
    label: 'Consulter les Achats Fournisseurs',
    description: 'Consulter les bons de commande d\'achat, factures fournisseurs et alertes d\'échéance de paiement.',
    category: 'Achats & Fournisseurs',
    categoryColor: 'amber',
  },
  {
    id: 'manage_purchases',
    label: 'Gérer les Achats & Réceptions',
    description: 'Passer les commandes d\'achat, valider la réception physique en stock et enregistrer les règlements.',
    category: 'Achats & Fournisseurs',
    categoryColor: 'amber',
  },

  // Contacts & Tiers
  {
    id: 'view_contacts',
    label: 'Consulter le Répertoire Contacts',
    description: 'Consulter la liste et les soldes des clients, prospects et fournisseurs.',
    category: 'Contacts & Tiers',
    categoryColor: 'sky',
  },
  {
    id: 'manage_contacts',
    label: 'Gérer les Contacts (Clients & Fournisseurs)',
    description: 'Ajouter, éditer les coordonnées, conditions de paiement, plafonds de crédit et supprimer des fiches.',
    category: 'Contacts & Tiers',
    categoryColor: 'sky',
  },

  // Dépenses & Frais
  {
    id: 'view_expenses',
    label: 'Consulter les Dépenses & Frais',
    description: 'Visualiser le registre des charges opérationnelles, factures de charges et états de caisse.',
    category: 'Dépenses & Frais',
    categoryColor: 'rose',
  },
  {
    id: 'manage_expenses',
    label: 'Gérer & Enregistrer les Dépenses',
    description: 'Saisir les dépenses quotidiennes, gérer les catégories de frais et attacher les reçus justificatifs.',
    category: 'Dépenses & Frais',
    categoryColor: 'rose',
  },

  // Rapports & Audit
  {
    id: 'view_reports',
    label: 'Consulter les Rapports & Statistiques',
    description: 'Accéder aux analyses de rentabilité, bilan financier, marge brute, top articles et exportations comptables.',
    category: 'Rapports & Audit',
    categoryColor: 'indigo',
  },

  // Administration & Système
  {
    id: 'manage_businesses',
    label: 'Gérer les Entreprises & Sociétés',
    description: 'Créer et configurer les entités commerciales, raisons sociales, devises et exercices fiscaux.',
    category: 'Administration & Système',
    categoryColor: 'slate',
  },
  {
    id: 'manage_locations',
    label: 'Gérer les Magasins & Entrepôts',
    description: 'Créer, configurer et rattacher les magasins, dépôts logistiques et points de vente.',
    category: 'Administration & Système',
    categoryColor: 'slate',
  },
  {
    id: 'manage_users',
    label: 'Gérer les Comptes Utilisateurs',
    description: 'Créer, modifier, activer ou désactiver les comptes utilisateurs et affecter leurs magasins.',
    category: 'Administration & Système',
    categoryColor: 'slate',
  },
  {
    id: 'manage_roles',
    label: 'Gérer les Rôles & Permissions',
    description: 'Créer des profils de rôles sur-mesure et modifier la matrice d\'autorisations du système.',
    category: 'Administration & Système',
    categoryColor: 'slate',
  },
  {
    id: 'manage_settings',
    label: 'Paramètres Système & Base de Données',
    description: 'Accéder aux configurations système, maintenance Firestore et intégrations techniques avancées.',
    category: 'Administration & Système',
    categoryColor: 'slate',
  },
];

export const PERMISSION_CATEGORIES = [
  { name: 'POS & Caisse', color: 'emerald', bgBadge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { name: 'Ventes & Factures', color: 'blue', bgBadge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { name: 'Produits & Stocks', color: 'purple', bgBadge: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { name: 'Achats & Fournisseurs', color: 'amber', bgBadge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { name: 'Contacts & Tiers', color: 'sky', bgBadge: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  { name: 'Dépenses & Frais', color: 'rose', bgBadge: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  { name: 'Rapports & Audit', color: 'indigo', bgBadge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  { name: 'Administration & Système', color: 'slate', bgBadge: 'bg-slate-500/10 text-slate-300 border-slate-500/20' },
] as const;

export const ROLE_PRESETS: { name: string; description: string; permissions: Permission[] }[] = [
  {
    name: 'Administrateur Complet',
    description: 'Accès total à l\'ensemble des 19 permissions et modules du système ERP.',
    permissions: ALL_PERMISSIONS.map((p) => p.id),
  },
  {
    name: 'Caissier / Vendeur POS',
    description: 'Accès au terminal de caisse, aux ventes, aux contacts et à la consultation des stocks.',
    permissions: [
      'access_pos',
      'view_sales',
      'manage_sales',
      'view_contacts',
      'manage_contacts',
      'view_products',
    ],
  },
  {
    name: 'Gestionnaire des Stocks & Achats',
    description: 'Gestion complète du catalogue, réceptions fournisseurs, transferts et inventaires.',
    permissions: [
      'view_products',
      'manage_products',
      'adjust_stock',
      'print_barcodes',
      'view_purchases',
      'manage_purchases',
      'view_contacts',
    ],
  },
  {
    name: 'Comptable & Gestionnaire des Frais',
    description: 'Suivi des factures de vente, achats, dépenses et accès aux rapports financiers.',
    permissions: [
      'view_sales',
      'view_purchases',
      'view_expenses',
      'manage_expenses',
      'view_reports',
      'view_contacts',
    ],
  },
  {
    name: 'Superviseur Commercial',
    description: 'Suivi des ventes, gestion des clients, consultation des stocks et rapports de vente.',
    permissions: [
      'access_pos',
      'view_sales',
      'manage_sales',
      'view_products',
      'view_contacts',
      'manage_contacts',
      'view_reports',
    ],
  },
  {
    name: 'Consultation Seule (Auditeur)',
    description: 'Lecture seule sur les ventes, stocks, achats, dépenses et rapports sans droit de modification.',
    permissions: [
      'view_sales',
      'view_products',
      'view_purchases',
      'view_expenses',
      'view_contacts',
      'view_reports',
    ],
  },
];
