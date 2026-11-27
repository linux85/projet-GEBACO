import React, { useState, useEffect } from 'react';
import {
  Upload,
  Folder,
  FileText,
  Image as ImageIcon,
  FileCheck,
  Download,
  Trash2,
  ExternalLink,
  Copy,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  HardDrive,
  Eye,
  FileCode,
  FileSpreadsheet,
  FilePlus,
} from 'lucide-react';
import {
  uploadFileToFirebaseStorage,
  deleteFileFromFirebaseStorage,
  listFilesInFirebaseStorage,
  storage,
} from '../../lib/firebase';
import firebaseConfig from '../../../firebase-applet-config.json';

interface StoredFileItem {
  name: string;
  fullPath: string;
  url: string;
  size?: number;
  type?: string;
  createdAt?: string;
}

export const FirebaseStorageExplorer: React.FC = () => {
  const [selectedFolder, setSelectedFolder] = useState<string>('documents');
  const [files, setFiles] = useState<StoredFileItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<StoredFileItem | null>(null);

  const folders = [
    { id: 'documents', label: 'Documents & Factures', icon: FileText },
    { id: 'produits', label: 'Images Produits', icon: ImageIcon },
    { id: 'logos', label: 'Logos Entreprises', icon: HardDrive },
    { id: 'exports', label: 'Exports Excel / CSV', icon: FileSpreadsheet },
    { id: 'general', label: 'Fichiers Divers', icon: Folder },
  ];

  // Fetch files in the selected folder
  const fetchFiles = async (folderName: string) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const items = await listFilesInFirebaseStorage(folderName);
      setFiles(items);
    } catch (err: any) {
      console.error('Error fetching files from Firebase Storage:', err);
      setErrorMessage(
        'Impossible de charger la liste des fichiers depuis Firebase Storage. Vérifiez vos permissions de stockage.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles(selectedFolder);
  }, [selectedFolder]);

  // Handle File Upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    const file = fileList[0];
    setIsUploading(true);
    setErrorMessage('');
    setUploadSuccessMessage('');
    setUploadProgress(20);

    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const destinationPath = `${selectedFolder}/${Date.now()}_${sanitizedName}`;

      setUploadProgress(60);
      const downloadUrl = await uploadFileToFirebaseStorage(file, destinationPath);
      setUploadProgress(100);

      setUploadSuccessMessage(`Fichier "${file.name}" téléversé avec succès sur Firebase Storage !`);

      // Refresh file list
      await fetchFiles(selectedFolder);
    } catch (err: any) {
      console.error('Error uploading file to Firebase Storage:', err);
      setErrorMessage(`Échec du téléversement : ${err.message || 'Erreur inconnue'}`);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
      // Reset input value
      event.target.value = '';
    }
  };

  // Handle Delete
  const handleDeleteFile = async (file: StoredFileItem) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer "${file.name}" de Firebase Storage ?`)) {
      return;
    }

    try {
      await deleteFileFromFirebaseStorage(file.fullPath);
      setFiles((prev) => prev.filter((f) => f.fullPath !== file.fullPath));
      setUploadSuccessMessage(`Fichier "${file.name}" supprimé de Firebase Storage.`);
    } catch (err: any) {
      setErrorMessage(`Échec de suppression : ${err.message || 'Erreur'}`);
    }
  };

  // Copy Download URL
  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const isImageFile = (fileName: string) => {
    return /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileName);
  };

  const isPdfFile = (fileName: string) => {
    return /\.pdf$/i.test(fileName);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white flex items-center space-x-2">
                <span>Stockage & Téléchargement Firebase</span>
                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700/50 rounded text-[11px] font-bold">
                  Mode Production Actif
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Bucket Cloud : <span className="font-mono text-slate-300">{firebaseConfig.storageBucket}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <label className="cursor-pointer px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-900/30 flex items-center space-x-2 transition-all">
            <Upload className="w-4 h-4" />
            <span>{isUploading ? 'Téléversement...' : 'Téléverser un Fichier'}</span>
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>

          <button
            onClick={() => fetchFiles(selectedFolder)}
            disabled={isLoading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Actualiser la liste"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="bg-slate-900 border border-blue-500/40 p-4 rounded-xl space-y-2">
          <div className="flex justify-between text-xs font-semibold text-blue-300">
            <span>Envoi du fichier vers Firebase Storage...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {uploadSuccessMessage && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-700/50 rounded-xl text-xs font-medium text-emerald-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{uploadSuccessMessage}</span>
          </div>
          <button
            onClick={() => setUploadSuccessMessage('')}
            className="text-emerald-400 hover:text-white text-xs underline"
          >
            Fermer
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-rose-950/60 border border-rose-700/50 rounded-xl text-xs font-medium text-rose-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage('')}
            className="text-rose-400 hover:text-white text-xs underline"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left: Folders */}
        <div className="md:col-span-1 bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 mb-2">
            Dossiers Firebase Storage
          </div>

          {folders.map((folder) => {
            const Icon = folder.icon;
            const isSelected = selectedFolder === folder.id;
            return (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.id)}
                className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{folder.label}</span>
              </button>
            );
          })}

          <div className="pt-4 border-t border-slate-800 mt-4 text-[11px] text-slate-400 space-y-2">
            <div className="font-bold text-slate-300">Vérification Téléchargement :</div>
            <p className="text-[10px] leading-relaxed">
              Tous les fichiers envoyés génèrent une URL publique signée sécurisée (<code className="text-amber-300">getDownloadURL</code>) accessible directement par le navigateur.
            </p>
          </div>
        </div>

        {/* Right: File Explorer Table / Grid */}
        <div className="md:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center space-x-2">
              <Folder className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-sm text-white capitalize">/{selectedFolder}</span>
              <span className="text-xs text-slate-400">({files.length} fichier{files.length > 1 ? 's' : ''})</span>
            </div>

            <span className="text-[11px] text-slate-400 font-mono">
              gs://{firebaseConfig.storageBucket}/{selectedFolder}
            </span>
          </div>

          {/* Files List */}
          <div className="p-4 flex-1">
            {isLoading ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw className="w-7 h-7 text-blue-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-medium">Chargement des fichiers Firebase...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <FilePlus className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm text-slate-200">Aucun fichier dans ce dossier</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Utilisez le bouton <strong>"Téléverser un Fichier"</strong> ci-dessus pour envoyer votre premier fichier dans ce dossier Firebase Storage.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {files.map((file) => {
                  const isImg = isImageFile(file.name);
                  const isPdf = isPdfFile(file.name);

                  return (
                    <div
                      key={file.fullPath}
                      className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col justify-between space-y-3 transition-all group"
                    >
                      <div className="flex items-start space-x-3">
                        {isImg ? (
                          <div className="w-12 h-12 rounded-lg bg-slate-900 overflow-hidden shrink-0 border border-slate-700 flex items-center justify-center">
                            <img
                              src={file.url}
                              alt={file.name}
                              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => setPreviewFile(file)}
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : isPdf ? (
                          <div className="w-12 h-12 rounded-lg bg-rose-950/60 border border-rose-700/40 flex items-center justify-center shrink-0 text-rose-400">
                            <FileText className="w-6 h-6" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-blue-950/60 border border-blue-700/40 flex items-center justify-center shrink-0 text-blue-400">
                            <FileCode className="w-6 h-6" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-slate-100 truncate" title={file.name}>
                            {file.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate font-mono mt-0.5">
                            {file.fullPath}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1">
                          {/* Direct Download */}
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            download={file.name}
                            className="p-1.5 bg-slate-700 hover:bg-emerald-600 hover:text-white text-slate-300 rounded-lg transition-colors"
                            title="Télécharger le fichier"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          {/* Open in new tab */}
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-slate-700 hover:bg-blue-600 hover:text-white text-slate-300 rounded-lg transition-colors"
                            title="Ouvrir le lien direct"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          {/* Copy URL */}
                          <button
                            onClick={() => handleCopyUrl(file.url)}
                            className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                            title="Copier le lien public"
                          >
                            {copiedUrl === file.url ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteFile(file)}
                          className="p-1.5 bg-rose-950/40 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg transition-colors"
                          title="Supprimer de Firebase Storage"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* IMAGE PREVIEW MODAL */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white truncate">{previewFile.name}</h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Fermer
              </button>
            </div>

            <div className="bg-slate-950 rounded-xl p-2 flex items-center justify-center max-h-[60vh] overflow-hidden">
              <img
                src={previewFile.url}
                alt={previewFile.name}
                className="max-h-[55vh] object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <a
                href={previewFile.url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ouvrir en Plein Écran</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
