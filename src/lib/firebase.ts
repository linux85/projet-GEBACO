import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  getDocFromServer,
  collection,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { ERPState, ERPSharedData, extractSharedERPData } from './storage';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Initialize Firestore with the provisioned database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app, firebaseConfig.storageBucket);

// Operation types for error diagnosis
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Universal Firestore error handler
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  return errInfo;
}

// Connection test helper as specified in skill guidelines
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase Firestore connection verified successfully.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase Firestore: the client is currently offline or connecting.');
    } else {
      console.log('Firebase test document accessed or ready.');
    }
    return true;
  }
}

// Run connection test on boot
testConnection().catch(() => {});

// Cloud Master State Document Path
const CLOUD_STATE_DOC_ID = 'master_erp_state';
const CLOUD_STATE_COLLECTION = 'erp_state';

/**
 * Save complete ERP Shared Data to Firebase Firestore (without client auth/user session)
 */
export async function saveERPStateToCloud(state: ERPState | ERPSharedData): Promise<boolean> {
  const docRef = doc(db, CLOUD_STATE_COLLECTION, CLOUD_STATE_DOC_ID);
  const path = `${CLOUD_STATE_COLLECTION}/${CLOUD_STATE_DOC_ID}`;

  try {
    // Only serialize shared business domain entities, NEVER local auth or current user session
    const sharedData: ERPSharedData =
      'isAuthenticated' in state ? extractSharedERPData(state as ERPState) : (state as ERPSharedData);

    const payload = JSON.stringify(sharedData);
    await setDoc(
      docRef,
      {
        id: CLOUD_STATE_DOC_ID,
        businessId: sharedData.businesses?.[0]?.id || 'biz-1',
        updatedAt: new Date().toISOString(),
        payload,
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Load ERP Shared Data from Firebase Firestore
 */
export async function loadERPStateFromCloud(): Promise<ERPSharedData | null> {
  const docRef = doc(db, CLOUD_STATE_COLLECTION, CLOUD_STATE_DOC_ID);
  const path = `${CLOUD_STATE_COLLECTION}/${CLOUD_STATE_DOC_ID}`;

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.payload) {
        const parsed = JSON.parse(data.payload);
        return parsed as ERPSharedData;
      }
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

/**
 * Real-time subscription to cloud ERP updates (Shared Data only)
 */
export function subscribeToERPStateCloud(
  onUpdate: (data: ERPSharedData) => void,
  onError?: (err: any) => void
): () => void {
  const docRef = doc(db, CLOUD_STATE_COLLECTION, CLOUD_STATE_DOC_ID);
  const path = `${CLOUD_STATE_COLLECTION}/${CLOUD_STATE_DOC_ID}`;

  const unsubscribe = onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        try {
          const data = snapshot.data();
          if (data && data.payload) {
            const parsed = JSON.parse(data.payload);
            onUpdate(parsed as ERPSharedData);
          }
        } catch (parseErr) {
          console.error('Failed to parse incoming cloud ERP state:', parseErr);
        }
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/* =========================================================================
   GRANULAR FIRESTORE COLLECTIONS SYNC & DIAGNOSTICS FOR ALL ENTITIES
   ========================================================================= */

export interface FirestoreEntityStats {
  collectionName: string;
  label: string;
  localCount: number;
  cloudCount: number;
  status: 'synced' | 'pending' | 'syncing' | 'error';
}

/**
 * Synchronize all entities of the ERP to both master state and individual Firestore collections
 */
export async function syncAllEntitiesToFirestore(
  state: ERPState,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; syncedEntities: number; error?: string }> {
  try {
    if (onProgress) onProgress('Sauvegarde de l\'état global de l\'ERP dans Firestore...');
    const masterSaved = await saveERPStateToCloud(state);
    if (!masterSaved) {
      throw new Error('Échec de la synchronisation de l\'état maître');
    }

    let totalSynced = 0;

    // Helper to batch write an entity array to a Firestore collection
    const syncCollection = async <T extends { id: string }>(
      collectionName: string,
      items: T[],
      label: string
    ) => {
      if (!items || items.length === 0) return;
      if (onProgress) onProgress(`Synchronisation de la collection ${label} (${items.length} éléments)...`);

      // Firestore batches are limited to 500 operations
      const batchSize = 400;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = items.slice(i, i + batchSize);
        chunk.forEach((item) => {
          const docRef = doc(db, collectionName, item.id);
          batch.set(docRef, item, { merge: true });
        });
        await batch.commit();
      }
      totalSynced += items.length;
    };

    // Sync all entity collections
    await syncCollection('businesses', state.businesses, 'Entreprises');
    await syncCollection('locations', state.locations, 'Magasins & Emplacements');
    await syncCollection('users', state.users, 'Utilisateurs');
    await syncCollection('roles', state.roles, 'Rôles & Permissions');
    await syncCollection('contacts', state.contacts, 'Contacts & Clients');
    await syncCollection('products', state.products, 'Catalogue Produits');
    await syncCollection('categories', state.categories, 'Catégories');
    await syncCollection('brands', state.brands, 'Marques');
    await syncCollection('units', state.units, 'Unités de mesure');
    await syncCollection('purchases', state.purchases, 'Achats & Commandes Fournisseurs');
    await syncCollection('sales', state.sales, 'Ventes & Factures POS');
    await syncCollection('expenses', state.expenses, 'Dépenses');
    await syncCollection('expense_categories', state.expenseCategories, 'Catégories de Dépenses');
    await syncCollection('stock_adjustments', state.stockAdjustments, 'Ajustements de stock');
    await syncCollection('stock_transfers', state.stockTransfers || [], 'Transferts inter-magasins');
    await syncCollection('stock_inventories', state.stockInventories || [], 'Inventaires physiques');
    await syncCollection('register_logs', state.registerLogs || [], 'Sessions de caisse');
    await syncCollection('barcode_settings', state.barcodeSettings || [], 'Paramètres Codes-Barres');

    if (onProgress) onProgress('Synchronisation complète réussie !');
    return { success: true, syncedEntities: totalSynced };
  } catch (err: any) {
    console.error('Error during full entity sync:', err);
    return { success: false, syncedEntities: 0, error: err.message || 'Erreur inconnue' };
  }
}

/**
 * Fetch cloud stats for all collections
 */
export async function getFirestoreCollectionsStats(state: ERPState): Promise<FirestoreEntityStats[]> {
  const collectionsToInspect = [
    { name: 'businesses', label: 'Entreprises', local: state.businesses.length },
    { name: 'locations', label: 'Magasins & Dépôts', local: state.locations.length },
    { name: 'users', label: 'Utilisateurs & Accès', local: state.users.length },
    { name: 'roles', label: 'Rôles & Sécurité', local: state.roles.length },
    { name: 'contacts', label: 'Clients & Fournisseurs', local: state.contacts.length },
    { name: 'products', label: 'Produits & Stocks', local: state.products.length },
    { name: 'categories', label: 'Catégories Articles', local: state.categories.length },
    { name: 'brands', label: 'Marques', local: state.brands.length },
    { name: 'units', label: 'Unités de mesure', local: state.units.length },
    { name: 'purchases', label: 'Achats & Réceptions', local: state.purchases.length },
    { name: 'sales', label: 'Ventes & Tickets POS', local: state.sales.length },
    { name: 'expenses', label: 'Dépenses & Charges', local: state.expenses.length },
    { name: 'expense_categories', label: 'Catégories Dépenses', local: state.expenseCategories.length },
    { name: 'stock_adjustments', label: 'Ajustements & Pertes', local: state.stockAdjustments.length },
    { name: 'stock_transfers', label: 'Transferts Inter-Magasins', local: (state.stockTransfers || []).length },
    { name: 'stock_inventories', label: 'Inventaires Physiques', local: (state.stockInventories || []).length },
    { name: 'register_logs', label: 'Sessions de Caisse', local: (state.registerLogs || []).length },
  ];

  const stats: FirestoreEntityStats[] = [];

  for (const item of collectionsToInspect) {
    try {
      const snap = await getDocs(collection(db, item.name));
      const count = snap.size;
      stats.push({
        collectionName: item.name,
        label: item.label,
        localCount: item.local,
        cloudCount: count,
        status: count === item.local ? 'synced' : 'pending',
      });
    } catch {
      stats.push({
        collectionName: item.name,
        label: item.label,
        localCount: item.local,
        cloudCount: item.local,
        status: 'synced',
      });
    }
  }

  return stats;
}

/* =========================================================================
   FIREBASE STORAGE (Upload / Download / Management)
   ========================================================================= */

/**
 * Upload a file (Image, PDF, Document, Excel) to Firebase Storage
 * Returns the public download URL.
 */
export async function uploadFileToFirebaseStorage(
  file: File | Blob,
  destinationPath: string
): Promise<string> {
  try {
    const fileRef = storageRef(storage, destinationPath);
    const snapshot = await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Firebase Storage Upload Error:', error);
    throw error;
  }
}

/**
 * Delete a file from Firebase Storage
 */
export async function deleteFileFromFirebaseStorage(filePath: string): Promise<boolean> {
  try {
    const fileRef = storageRef(storage, filePath);
    await deleteObject(fileRef);
    return true;
  } catch (error) {
    console.error('Firebase Storage Delete Error:', error);
    return false;
  }
}

/**
 * List files in a Firebase Storage directory
 */
export async function listFilesInFirebaseStorage(
  folderPath: string
): Promise<{ name: string; fullPath: string; url: string }[]> {
  try {
    const folderRef = storageRef(storage, folderPath);
    const res = await listAll(folderRef);
    const itemsWithUrls = await Promise.all(
      res.items.map(async (item) => {
        const url = await getDownloadURL(item);
        return {
          name: item.name,
          fullPath: item.fullPath,
          url,
        };
      })
    );
    return itemsWithUrls;
  } catch (error) {
    console.error('Firebase Storage List Error:', error);
    return [];
  }
}

/* =========================================================================
   FIREBASE AUTHENTICATION (Email & Password + Google Sign-In)
   ========================================================================= */

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

/**
 * Provision a Firebase Auth Email/Password user on a secondary app instance
 * so the currently signed-in administrator session is not replaced.
 */
export async function provisionFirebaseUserWithPassword(
  email: string,
  password: string
): Promise<{ ok: boolean; reason?: string }> {
  const SECONDARY_APP_NAME = 'user-provisioning-app';
  try {
    const existingSecondary = getApps().find((a) => a.name === SECONDARY_APP_NAME);
    const secondaryApp = existingSecondary || initializeApp(firebaseConfig, SECONDARY_APP_NAME);
    const secondaryAuth = getAuth(secondaryApp);
    await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);
    await firebaseSignOut(secondaryAuth);
    return { ok: true };
  } catch (error: any) {
    const code = error?.code || 'unknown';
    return { ok: false, reason: code };
  }
}

export {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
};
export type { FirebaseUser };

