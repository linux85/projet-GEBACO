import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { DailySalesTracker } from './DailySalesTracker';
import {
  BarChart3,
  TrendingUp,
  Receipt,
  Users,
  Package,
  Calendar,
  DollarSign,
  PieChart,
  FileSpreadsheet,
  Award,
  CreditCard,
  Building,
  CalendarDays,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const ReportManager: React.FC = () => {
  const { state, currentBusiness } = useERP();

  const [activeReportTab, setActiveReportTab] = useState<
    'daily_sales' | 'sales_purchases' | 'tax' | 'contacts' | 'stock' | 'expenses' | 'trending' | 'register' | 'sales_rep'
  >('daily_sales');

  // Filter params for Trending Products
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterBrand, setFilterBrand] = useState('all');

  // 1. Sales & Purchases Totals
  const totalSales = state.sales
    .filter((s) => s.businessId === currentBusiness.id)
    .reduce((acc, s) => acc + s.totalAmount, 0);

  const totalPurchases = state.purchases
    .filter((p) => p.businessId === currentBusiness.id)
    .reduce((acc, p) => acc + p.totalAmount, 0);

  const totalExpenses = state.expenses
    .filter((e) => e.businessId === currentBusiness.id)
    .reduce((acc, e) => acc + e.amount, 0);

  const netProfit = totalSales - totalPurchases - totalExpenses;

  // 2. Tax Report
  const totalSalesTax = state.sales
    .filter((s) => s.businessId === currentBusiness.id)
    .reduce((acc, s) => acc + s.taxAmount, 0);

  const totalPurchasesTax = state.purchases
    .filter((p) => p.businessId === currentBusiness.id)
    .reduce((acc, p) => acc + p.taxAmount, 0);

  const netTaxBalance = totalSalesTax - totalPurchasesTax;

  // 3. Trending Products
  const trendingProducts = state.products.filter((p) => {
    if (p.businessId !== currentBusiness.id) return false;
    if (filterCategory !== 'all' && p.categoryId !== filterCategory) return false;
    if (filterBrand !== 'all' && p.brandId !== filterBrand) return false;
    return true;
  });

  const chartData = [
    { name: 'Ventes', Montant: totalSales },
    { name: 'Achats', Montant: totalPurchases },
    { name: 'Dépenses', Montant: totalExpenses },
    { name: 'Bénéfice Net', Montant: netProfit },
  ];

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30 shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold">Rapports & Analyses d’Activité ERP</h2>
            <p className="text-xs text-slate-400">
              Ventes, Achats, Taxes TVA, Stocks, Dépenses, Produits Tendance et Performances des Représentants.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-1.5 border-b border-slate-800 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveReportTab('daily_sales')}
          className={`px-3.5 min-h-[40px] py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap shrink-0 ${
            activeReportTab === 'daily_sales'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5 shrink-0" />
          <span>Suivi Journalier des Ventes</span>
        </button>
        <button
          onClick={() => setActiveReportTab('sales_purchases')}
          className={`px-3 min-h-[40px] py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            activeReportTab === 'sales_purchases'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          1. Achats & Ventes
        </button>
        <button
          onClick={() => setActiveReportTab('tax')}
          className={`px-3 min-h-[40px] py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            activeReportTab === 'tax'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          2. Rapport Fiscal (TVA)
        </button>
        <button
          onClick={() => setActiveReportTab('contacts')}
          className={`px-3 min-h-[40px] py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            activeReportTab === 'contacts'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          3. Solde Contacts
        </button>
        <button
          onClick={() => setActiveReportTab('stock')}
          className={`px-3 min-h-[40px] py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            activeReportTab === 'stock'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          4. Évaluation Stock
        </button>
        <button
          onClick={() => setActiveReportTab('expenses')}
          className={`px-3 min-h-[40px] py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            activeReportTab === 'expenses'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          5. Analyse Dépenses
        </button>
        <button
          onClick={() => setActiveReportTab('trending')}
          className={`px-3 min-h-[40px] py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            activeReportTab === 'trending'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          6. Produits Tendance
        </button>
        <button
          onClick={() => setActiveReportTab('register')}
          className={`px-3 min-h-[40px] py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            activeReportTab === 'register'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          7. Caisse Enregistreuse
        </button>
        <button
          onClick={() => setActiveReportTab('sales_rep')}
          className={`px-3 min-h-[40px] py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            activeReportTab === 'sales_rep'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          8. Représentant Commercial
        </button>
      </div>

      {/* 0. DAILY SALES TRACKER */}
      {activeReportTab === 'daily_sales' && (
        <DailySalesTracker />
      )}

      {/* 1. SALES & PURCHASES REPORT */}
      {activeReportTab === 'sales_purchases' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400 font-bold uppercase">Ventes Globales</span>
              <div className="text-xl font-extrabold text-emerald-400 mt-1 tabular-nums">
                {totalSales.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400 font-bold uppercase">Achats Stock</span>
              <div className="text-xl font-extrabold text-blue-400 mt-1 tabular-nums">
                {totalPurchases.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400 font-bold uppercase">Dépenses Exploitation</span>
              <div className="text-xl font-extrabold text-rose-400 mt-1 tabular-nums">
                {totalExpenses.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400 font-bold uppercase">Bénéfice Net</span>
              <div className="text-xl font-extrabold text-amber-400 mt-1 tabular-nums">
                {netProfit.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl h-72 min-w-0">
            <h3 className="font-bold text-sm mb-4">Graphique Comparatif des Chiffres Clefs</h3>
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px' }} />
                <Bar dataKey="Montant" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 2. TAX REPORT */}
      {activeReportTab === 'tax' && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="font-bold text-base text-white">Rapport de Taxes & TVA</h3>
          <p className="text-xs text-slate-400">TVA collectée sur les ventes vs TVA déductible sur les achats.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-400 font-bold uppercase">TVA Collectée (Ventes)</span>
              <div className="text-lg font-black text-emerald-400 mt-1">
                {totalSalesTax.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
              </div>
            </div>

            <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-400 font-bold uppercase">TVA Déductible (Achats)</span>
              <div className="text-lg font-black text-blue-400 mt-1">
                {totalPurchasesTax.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
              </div>
            </div>

            <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-400 font-bold uppercase">Solde Fiscal à Reverser</span>
              <div className="text-lg font-black text-amber-400 mt-1">
                {netTaxBalance.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. TRENDING PRODUCTS */}
      {activeReportTab === 'trending' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs">
            <span className="font-bold text-slate-300">Filtres Produits Tendance:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded p-1.5 font-semibold"
            >
              <option value="all">Toutes Catégories</option>
              {state.categories
                .filter((c) => c.businessId === currentBusiness.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>

            <select
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded p-1.5 font-semibold"
            >
              <option value="all">Toutes Marques</option>
              {state.brands
                .filter((b) => b.businessId === currentBusiness.id)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[520px]">
                <thead className="bg-slate-950 border-b border-slate-800 uppercase text-[10px] font-bold text-slate-400">
                  <tr>
                    <th className="p-3">Produit Tendance</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3 text-right">Prix Unitaire</th>
                    <th className="p-3 text-center">Stock Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {trendingProducts.map((p) => {
                    const stockSum = (Object.values(p.locationStock) as number[]).reduce((a, b) => a + b, 0);
                    return (
                      <tr key={p.id}>
                        <td className="p-3 font-bold text-white">{p.name}</td>
                        <td className="p-3 font-mono text-slate-400">{p.sku}</td>
                        <td className="p-3 text-right font-extrabold text-emerald-400 tabular-nums">
                          {p.sellingPrice.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-200 tabular-nums">{stockSum}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* OTHER REPORT PLACEHOLDERS */}
      {['contacts', 'stock', 'expenses', 'register', 'sales_rep'].includes(activeReportTab) && (
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-2">
          <FileSpreadsheet className="w-12 h-12 mx-auto text-blue-400" />
          <h3 className="font-bold text-base text-white">Rapport Détaillé Disponible</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Les données de ce module sont synchronisées en temps réel avec les transactions et les emplacements de {currentBusiness.name}.
          </p>
        </div>
      )}
    </div>
  );
};
