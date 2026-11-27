import React from 'react';
import { useERP } from '../../context/ERPContext';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  ShoppingBag,
  Users,
  AlertTriangle,
  Package,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ClipboardCheck,
  CalendarDays,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

interface DashboardOverviewProps {
  setActiveTab?: (tab: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  setActiveTab,
  onNavigateTab,
}) => {
  const navigate = setActiveTab || onNavigateTab || (() => {});
  const {
    state,
    currentBusiness,
    currentLocation,
    paymentAlerts = [],
    lowStockAlerts = [],
  } = useERP();

  const businessSales = (state.sales || []).filter((s) => {
    if (!s) return false;
    if (s.businessId !== currentBusiness.id) return false;
    if (state.currentLocationId !== 'all' && s.locationId !== state.currentLocationId)
      return false;
    return true;
  });

  const businessPurchases = (state.purchases || []).filter((p) => {
    if (!p) return false;
    if (p.businessId !== currentBusiness.id) return false;
    if (state.currentLocationId !== 'all' && p.locationId !== state.currentLocationId)
      return false;
    return true;
  });

  const totalSalesAmount = businessSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const totalPurchasesAmount = businessPurchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0);

  const totalExpensesAmount = (state.expenses || [])
    .filter((e) => {
      if (!e) return false;
      if (e.businessId !== currentBusiness.id) return false;
      if (state.currentLocationId !== 'all' && e.locationId !== state.currentLocationId)
        return false;
      return true;
    })
    .reduce((acc, e) => acc + (e.amount || 0), 0);

  const estimatedProfit = totalSalesAmount - totalPurchasesAmount - totalExpensesAmount;

  // Chart data simulation
  const chartData = [
    { date: '06 Aug', Ventes: 450000, Achats: 200000 },
    { date: '07 Aug', Ventes: 720000, Achats: 350000 },
    { date: '08 Aug', Ventes: 600000, Achats: 150000 },
    { date: '09 Aug', Ventes: 910000, Achats: 400000 },
    { date: '10 Aug', Ventes: 1062500, Achats: 800000 },
    { date: '11 Aug', Ventes: 780000, Achats: 0 },
    { date: '12 Aug', Ventes: 115000, Achats: 1200000 },
  ];

  const topProducts = state.products.slice(0, 4);

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 text-white shadow-xl">
        <div className="min-w-0">
          <div className="flex items-center space-x-2 text-[11px] sm:text-xs text-emerald-400 font-semibold mb-1 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Tableau de Bord Exécutif</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white break-words">
            Bienvenue sur {currentBusiness.name}
          </h2>
          <p className="text-xs text-slate-400 mt-1 break-words">
            Emplacement:{' '}
            <strong className="text-white underline">
              {currentLocation ? currentLocation.name : 'Vue d’ensemble globale'}
            </strong>{' '}
            | Devise: <strong>{currentBusiness.currencySymbol} ({currentBusiness.currencyCode})</strong>
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab && setActiveTab('daily_sales')}
            className="flex items-center space-x-1.5 px-3 sm:px-3.5 min-h-[42px] sm:min-h-[38px] bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-950/40 whitespace-nowrap"
          >
            <CalendarDays className="w-4 h-4 text-white shrink-0" />
            <span>Suivi Journalier Ventes</span>
          </button>
          <button
            onClick={() => setActiveTab && setActiveTab('pos')}
            className="flex items-center space-x-1.5 px-3 sm:px-3.5 min-h-[42px] sm:min-h-[38px] bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-950/40 whitespace-nowrap"
          >
            <ShoppingCart className="w-4 h-4 text-white shrink-0" />
            <span>Point de Vente (POS)</span>
          </button>
          <button
            onClick={() => setActiveTab && setActiveTab('purchases')}
            className="flex items-center space-x-1.5 px-3 sm:px-3.5 min-h-[42px] sm:min-h-[38px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all border border-slate-700 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Nouvel Achat</span>
          </button>
          <button
            onClick={() => setActiveTab && setActiveTab('inventory')}
            className="flex items-center space-x-1.5 px-3 sm:px-3.5 min-h-[42px] sm:min-h-[38px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
          >
            <ClipboardCheck className="w-4 h-4 shrink-0" />
            <span>Inventaire Stock</span>
          </button>
          <button
            onClick={() => setActiveTab && setActiveTab('products')}
            className="flex items-center space-x-1.5 px-3 sm:px-3.5 min-h-[42px] sm:min-h-[38px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
          >
            <Package className="w-4 h-4 shrink-0" />
            <span>Ajouter Produit</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Ventes */}
        <div
          onClick={() => setActiveTab && setActiveTab('daily_sales')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer p-4 rounded-xl shadow-lg text-slate-100 flex flex-col justify-between transition-all group hover:bg-slate-850 min-w-0"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-400 group-hover:text-emerald-400 uppercase tracking-wider transition-colors">
              Ventes Totales (Suivi Quotidien)
            </span>
            <div className="p-2 bg-emerald-950/60 text-emerald-400 rounded-lg border border-emerald-800/60 group-hover:bg-emerald-900/60 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-extrabold text-white tracking-tight tabular-nums break-words">
              {totalSalesAmount.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
            </div>
            <div className="flex items-center space-x-1 text-[11px] text-emerald-400 mt-1 font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5 inline shrink-0" />
              <span>{businessSales.length} facture(s) • Voir suivi journalier →</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Achats */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg text-slate-100 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Achats Stock
            </span>
            <div className="p-2 bg-blue-950/60 text-blue-400 rounded-lg border border-blue-800/60 shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-extrabold text-white tracking-tight tabular-nums break-words">
              {totalPurchasesAmount.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
            </div>
            <div className="flex items-center space-x-1 text-[11px] text-slate-400 mt-1 font-semibold">
              <span>{businessPurchases.length} bon(s) de commande</span>
            </div>
          </div>
        </div>

        {/* Card 3: Bénéfice estimé */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg text-slate-100 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Bénéfice Brut Estimatif
            </span>
            <div className="p-2 bg-emerald-950/60 text-emerald-400 rounded-lg border border-emerald-800/60 shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums break-words ${
                estimatedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {estimatedProfit.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 break-words">
              Ventes - Achats - Dépenses ({totalExpensesAmount.toLocaleString('fr-FR')} {currentBusiness.currencySymbol})
            </div>
          </div>
        </div>

        {/* Card 4: Alertes & Priorités */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg text-slate-100 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Alertes & Stock
            </span>
            <div className="p-2 bg-amber-950/60 text-amber-400 rounded-lg border border-amber-800/60 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">Échéances paiements:</span>
              <span className="text-amber-400 font-bold tabular-nums">{paymentAlerts.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold mt-1">
              <span className="text-slate-400">Stocks faibles:</span>
              <span className="text-rose-400 font-bold tabular-nums">{lowStockAlerts.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart & Top Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Recharts Area Chart */}
        <div className="lg:col-span-2 min-w-0 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-lg text-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-white">
                Évolution Ventes vs Achats (7 derniers jours)
              </h3>
              <p className="text-xs text-slate-400">
                Analyse comparative des flux de trésorerie en {currentBusiness.currencySymbol}
              </p>
            </div>
          </div>

          <div className="h-56 sm:h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVentes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAchats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#ffffff' }}
                />
                <Area
                  type="monotone"
                  dataKey="Ventes"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVentes)"
                />
                <Area
                  type="monotone"
                  dataKey="Achats"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorAchats)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Trending Products */}
        <div className="min-w-0 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-lg text-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm sm:text-base text-white">Produits Phares</h3>
              <button
                onClick={() => navigate('products')}
                className="text-xs text-blue-400 hover:underline font-semibold min-h-[36px] px-2"
              >
                Voir tout
              </button>
            </div>

            <div className="space-y-3">
              {topProducts.map((prd) => {
                const totalLocStock = prd.locationStock
                  ? (Object.values(prd.locationStock) as number[]).reduce((a, b) => a + (b || 0), 0)
                  : 0;
                return (
                  <div
                    key={prd.id}
                    className="flex items-center space-x-3 p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60"
                  >
                    {prd.image ? (
                      <img
                        src={prd.image}
                        alt={prd.name}
                        className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs text-white truncate">{prd.name}</h4>
                      <p className="text-[10px] text-slate-400">
                        Prix: <strong className="text-emerald-400">{prd.sellingPrice.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}</strong>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                        Stock: {totalLocStock}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-center">
            <span className="text-[11px] text-slate-400">
              Calcul automatique des prix de vente basé sur la marge configurée ({currentBusiness.defaultProfitMargin}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
