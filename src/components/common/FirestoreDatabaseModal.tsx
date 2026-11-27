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
  ArrowUpFromLine,
  ShieldCheck,
  HardDrive,
  Copy,
  ExternalLink,
  Table,
  Cpu,
  FileJson,
  Radio,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  db,
  syncAllEntitiesToFirestore,
  getFirestoreCollectionsStats,
  FirestoreEntityStats,
  testConnection,
} from '../../lib/firebase';
import firebaseConfig from '../../../firebase-applet-config.json';

interface FirestoreDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirestoreDatabaseModal: React.FC<FirestoreDatabaseModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { state, cloudSyncStatus, lastCloudSyncTime, forceCloudSync } = useERP();
  const [stats, setStats] = useState<FirestoreEntityStats[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [syncProgressMessage, setSyncProgressMessage] = useState<string>('');
  const [syncSuccessResult, setSyncSuccessResult] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [connectionOk, setConnectionOk] = useState<boolean>(true);

  // Load stats when modal is opened
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
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Full Database Synchronization
  const handleFullSync = async () => {
    setIsSyncingAll(true);
    setSyncProgressMessage('Initialisation de la synchronisation de toutes les entités...');
    setSyncSuccessResult(null);
    setErrorMessage(null);

    try {
      const res = await syncAllEntitiesToFirestore(state, (msg) => {
        setSyncProgressMessage(msg);
      });

      if (res.success) {
        setSyncSuccessResult(
          `Toutes les entités (${res.syncedEntities} enregistrements au total) ont été synchronisées avec succès dans Firestore !`
        );
        await loadStats();
      } else {
        setErrorMessage(`Erreur de synchronisation : ${res.error}`);
      }
    } catch (err: any) {
      setErrorMessage(`Erreur inattendue : ${err.message || 'Échec'}`);
    } finally {
      setIsSyncingAll(false);
      setSyncProgressMessage('');
    }
  };

  // Export Database JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `erp_firestore_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Copy helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Calculate total entities
  const totalLocalRecords = stats.reduce((acc, curr) => acc + curr.localCount, 0);
  const totalCloudRecords = stats.reduce((acc, curr) => acc + curr.cloudCount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-4 sm:my-8 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-start sm:items-center justify-between gap-3 bg-slate-950/60">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="p-2.5 sm:p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg shadow-orange-950/40 text-white shrink-0">
              <Database className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  Base de Données Cloud Firestore
                </h2>
                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-700/50 rounded-full text-[10px] font-bold whitespace-nowrap">
                  Connectée & Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Gestion et synchronisation en temps réel de toutes les entités de l'ERP
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] px-2.5 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-bold text-xs shrink-0 whitespace-nowrap"
          >
            Fermer ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1">
          
          {/* Database Specs Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Server className="w-3.5 h-3.5 text-blue-400" />
                <span>Base Firestore ID</span>
              </div>
              <div className="font-mono text-xs text-emerald-300 font-bold break-all flex items-center justify-between">
                <span>{firebaseConfig.firestoreDatabaseId}</span>
                <button
                  onClick={() => handleCopy(firebaseConfig.firestoreDatabaseId)}
                  className="text-slate-400 hover:text-white ml-1"
                  title="Copier ID"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                <span>Projet Firebase</span>
              </div>
              <div className="font-mono text-xs text-amber-300 font-bold truncate">
                {firebaseConfig.projectId}
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>Statut de Synchronisation</span>
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
                  {cloudSyncStatus === 'synced' && 'Synchronisé (Temps Réel)'}
                  {cloudSyncStatus === 'syncing' && 'Synchronisation en cours...'}
                  {cloudSyncStatus === 'offline' && 'Mode Hors Ligne'}
                  {cloudSyncStatus === 'error' && 'Erreur de connexion'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Notification Banners */}
          {isSyncingAll && (
            <div className="bg-blue-950/70 border border-blue-600/50 p-4 rounded-2xl flex items-center space-x-3 text-blue-200">
              <RefreshCw className="w-5 h-5 text-blue-400 animate-spin shrink-0" />
              <div className="text-xs font-semibold">{syncProgressMessage}</div>
            </div>
          )}

          {syncSuccessResult && (
            <div className="bg-emerald-950/70 border border-emerald-600/50 p-4 rounded-2xl flex items-center justify-between text-emerald-200">
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
            <div className="bg-rose-950/70 border border-rose-600/50 p-4 rounded-2xl flex items-center justify-between text-rose-200">
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

          {/* Entities Collection Table */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-3.5 sm:p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="font-bold text-xs text-white uppercase tracking-wider">
                  Collections d'Entités Connectées ({stats.length})
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={loadStats}
                  disabled={isLoadingStats}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStats ? 'animate-spin' : ''}`} />
                  <span>Actualiser</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[520px]">
                <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Collection Firestore</th>
                    <th className="py-2.5 px-4">Entité Métier</th>
                    <th className="py-2.5 px-4 text-center">Enregistrements</th>
                    <th className="py-2.5 px-4 text-right">Statut Firebase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {stats.map((st) => (
                    <tr key={st.collectionName} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-blue-300">
                        /{st.collectionName}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-200">
                        {st.label}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded font-mono font-bold text-[11px]">
                          {st.cloudCount} doc{st.cloudCount > 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Actif</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Total des documents gérés dans Firestore :</span>
              <strong className="text-white font-mono">{totalCloudRecords} documents</strong>
            </div>
          </div>

          {/* Quick Actions Footer Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Dernière synchro :{' '}
                <strong className="text-slate-200">
                  {lastCloudSyncTime ? lastCloudSyncTime.toLocaleTimeString() : 'En temps réel'}
                </strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleExportJSON}
                className="flex-1 sm:flex-initial px-4 py-2.5 min-h-[42px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all whitespace-nowrap"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                <span>Sauvegarde JSON</span>
              </button>

              <button
                type="button"
                onClick={handleFullSync}
                disabled={isSyncingAll}
                className="flex-1 sm:flex-initial px-5 py-2.5 min-h-[42px] bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl text-xs font-black shadow-lg shadow-orange-950/40 flex items-center justify-center space-x-2 transition-all whitespace-nowrap"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingAll ? 'animate-spin' : ''}`} />
                <span>Synchroniser Toutes les Entités</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
