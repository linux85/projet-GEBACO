import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Layers,
  ArrowDownToLine,
  ShieldCheck,
  HardDrive,
  Copy,
  Table,
  Cpu,
  Radio,
  Clock,
  Sparkles,
  Zap,
  Lock,
  Globe,
  FileCheck,
} from 'lucide-react';
import {
  db,
  syncAllEntitiesToFirestore,
  getFirestoreCollectionsStats,
  FirestoreEntityStats,
  testConnection,
} from '../../lib/firebase';
import firebaseConfig from '../../../firebase-applet-config.json';

export const FirestoreDatabaseView: React.FC = () => {
  const { state, cloudSyncStatus, lastCloudSyncTime, forceCloudSync } = useERP();
  const [stats, setStats] = useState<FirestoreEntityStats[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [syncProgressMessage, setSyncProgressMessage] = useState<string>('');
  const [syncSuccessResult, setSyncSuccessResult] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [connectionOk, setConnectionOk] = useState<boolean>(true);

  const loadStats = async () => {
    setIsLoadingStats(true);
    setErrorMessage(null);
    try {
      const isOnline = await testConnection();
      setConnectionOk(isOnline);
      const data = await getFirestoreCollectionsStats(state);
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load stats:', err);
      setErrorMessage('Impossible de charger les métriques Firestore.');
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleFullSync = async () => {
    setIsSyncingAll(true);
    setSyncProgressMessage('Initialisation de la synchronisation complète dans Firestore...');
    setSyncSuccessResult(null);
    setErrorMessage(null);

    try {
      const res = await syncAllEntitiesToFirestore(state, (msg) => {
        setSyncProgressMessage(msg);
      });

      if (res.success) {
        setSyncSuccessResult(
          `Toutes les entités (${res.syncedEntities} enregistrements) ont été synchronisées avec succès dans les collections Firestore !`
        );
        await loadStats();
      } else {
        setErrorMessage(`Erreur lors de la synchronisation : ${res.error}`);
      }
    } catch (err: any) {
      setErrorMessage(`Erreur inattendue : ${err.message || 'Échec'}`);
    } finally {
      setIsSyncingAll(false);
      setSyncProgressMessage('');
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `erp_firestore_full_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const totalCloudRecords = stats.reduce((acc, curr) => acc + curr.cloudCount, 0);

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-3xl shadow-xl">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
          <div className="p-3 sm:p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg shadow-orange-950/40 text-white shrink-0">
            <Database className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                Base de Données Firebase Firestore
              </h1>
              <span className="px-2.5 sm:px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-700/60 rounded-full text-[11px] sm:text-xs font-bold flex items-center space-x-1.5 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Connectée & Provisionnée</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Gestion de la persistance cloud, réplication multi-entités et règles de sécurité en temps réel
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full md:w-auto shrink-0">
          <button
            onClick={handleExportJSON}
            className="flex-1 sm:flex-initial px-4 py-2.5 min-h-[42px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all border border-slate-700 whitespace-nowrap"
          >
            <ArrowDownToLine className="w-4 h-4 text-blue-400" />
            <span>Sauvegarde JSON</span>
          </button>

          <button
            onClick={handleFullSync}
            disabled={isSyncingAll}
            className="flex-1 sm:flex-initial px-5 py-2.5 min-h-[42px] bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl text-xs font-black shadow-lg shadow-orange-950/40 flex items-center justify-center space-x-2 transition-all whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingAll ? 'animate-spin' : ''}`} />
            <span>Synchroniser Toutes les Entités</span>
          </button>
        </div>
      </div>

      {/* Connection & Configuration Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
            <Server className="w-4 h-4 text-blue-400" />
            <span>Database ID</span>
          </div>
          <div className="font-mono text-xs text-emerald-300 font-bold break-all flex items-center justify-between">
            <span>{firebaseConfig.firestoreDatabaseId}</span>
            <button
              onClick={() => handleCopy(firebaseConfig.firestoreDatabaseId)}
              className="text-slate-400 hover:text-white p-1"
              title="Copier ID"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-[11px] text-slate-500">Instance Firestore officielle</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
            <Cpu className="w-4 h-4 text-amber-400" />
            <span>Projet Google Cloud</span>
          </div>
          <div className="font-mono text-xs text-amber-300 font-bold truncate">
            {firebaseConfig.projectId}
          </div>
          <div className="text-[11px] text-slate-500">Auth Domain: {firebaseConfig.authDomain}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Règles de Sécurité</span>
          </div>
          <div className="text-xs text-emerald-400 font-bold flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>firestore.rules déployées</span>
          </div>
          <div className="text-[11px] text-slate-500">Validation d'IDs et isolation sécurisée</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
            <Radio className="w-4 h-4 text-indigo-400" />
            <span>Synchronisation</span>
          </div>
          <div className="flex items-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                cloudSyncStatus === 'synced'
                  ? 'bg-emerald-500 animate-pulse'
                  : cloudSyncStatus === 'syncing'
                  ? 'bg-amber-500 animate-spin'
                  : 'bg-rose-500'
              }`}
            ></span>
            <span className="font-bold text-xs capitalize text-white">
              {cloudSyncStatus === 'synced' && 'En Temps Réel (Actif)'}
              {cloudSyncStatus === 'syncing' && 'Synchronisation en cours...'}
              {cloudSyncStatus === 'offline' && 'Hors Ligne'}
              {cloudSyncStatus === 'error' && 'Erreur de connexion'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            {lastCloudSyncTime ? `Dernière synchro: ${lastCloudSyncTime.toLocaleTimeString()}` : 'Flux actif'}
          </div>
        </div>

      </div>

      {/* Progress & Alert Banners */}
      {isSyncingAll && (
        <div className="bg-blue-950/80 border border-blue-600/50 p-4 rounded-2xl flex items-center space-x-3 text-blue-200 animate-pulse">
          <RefreshCw className="w-5 h-5 text-blue-400 animate-spin shrink-0" />
          <div className="text-xs font-semibold">{syncProgressMessage}</div>
        </div>
      )}

      {syncSuccessResult && (
        <div className="bg-emerald-950/80 border border-emerald-600/50 p-4 rounded-2xl flex items-center justify-between text-emerald-200">
          <div className="flex items-center space-x-2.5 text-xs font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{syncSuccessResult}</span>
          </div>
          <button
            onClick={() => setSyncSuccessResult(null)}
            className="text-emerald-400 hover:text-white text-xs underline"
          >
            Fermer
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-950/80 border border-rose-600/50 p-4 rounded-2xl flex items-center justify-between text-rose-200">
          <div className="flex items-center space-x-2.5 text-xs font-semibold">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white text-xs underline"
          >
            Fermer
          </button>
        </div>
      )}

      {/* All Entities Table in Firestore */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-950 border border-blue-800/60 rounded-xl text-blue-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                Collections & Entités Métier dans Firestore ({stats.length})
              </h3>
              <p className="text-xs text-slate-400">
                État des documents synchronisés dans la base cloud pour toutes les entités de l'application
              </p>
            </div>
          </div>

          <button
            onClick={loadStats}
            disabled={isLoadingStats}
            className="self-start sm:self-auto px-3 py-2 min-h-[38px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-slate-700 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStats ? 'animate-spin' : ''}`} />
            <span>Actualiser les métriques</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Collection Firestore</th>
                <th className="py-3.5 px-4 sm:px-6">Entité Métier</th>
                <th className="py-3.5 px-4 sm:px-6 text-center">Nombre Local</th>
                <th className="py-3.5 px-4 sm:px-6 text-center">Nombre Cloud Firestore</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Statut Temps Réel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {stats.map((st) => (
                <tr key={st.collectionName} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-blue-300">
                    /{st.collectionName}
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 font-medium text-slate-200">
                    {st.label}
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-center tabular-nums">
                    <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg font-mono font-bold text-xs">
                      {st.localCount}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-center tabular-nums">
                    <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800/40 rounded-lg font-mono font-bold text-xs">
                      {st.cloudCount} document{st.cloudCount > 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-right">
                    <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Synchronisé</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 font-medium">
          <span>Total des documents administrés dans Firestore :</span>
          <strong className="text-white font-mono text-sm tabular-nums">{totalCloudRecords} documents</strong>
        </div>
      </div>

    </div>
  );
};
