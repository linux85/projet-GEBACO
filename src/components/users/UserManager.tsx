import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { User, Role, Permission } from '../../types';
import {
  ALL_PERMISSIONS,
  PERMISSION_CATEGORIES,
  ROLE_PRESETS,
  PermissionDefinition,
} from '../../data/permissionsData';
import {
  Users,
  Shield,
  Plus,
  UserPlus,
  Check,
  X,
  Lock,
  Edit2,
  Trash2,
  AlertTriangle,
  Search,
  Grid,
  Layers,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Sliders,
  Filter,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import { generateStrongPassword } from '../../lib/passwordCrypto';
import { createServerSession, saveUserCredentialOnServer } from '../../lib/sessionClient';
import {
  auth,
  provisionFirebaseUserWithPassword,
  isFirebaseAdminAccount,
  sendPasswordResetEmail,
} from '../../lib/firebase';

export const UserManager: React.FC = () => {
  const {
    state,
    currentBusiness,
    currentUser,
    addUser,
    updateUser,
    deleteUser,
    addRole,
    updateRole,
    deleteRole,
  } = useERP();

  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [rolesViewMode, setRolesViewMode] = useState<'matrix' | 'cards'>('matrix');
  const [permissionFilterCategory, setPermissionFilterCategory] = useState<string>('all');
  const [permissionSearchQuery, setPermissionSearchQuery] = useState<string>('');

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  // New User Form State
  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [showUPassword, setShowUPassword] = useState(false);
  const [uRoleId, setURoleId] = useState(state.roles[0]?.id || '');
  const [uLocationId, setULocationId] = useState(state.locations[0]?.id || '');
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Edit User Form State
  const [editUName, setEditUName] = useState('');
  const [editUEmail, setEditUEmail] = useState('');
  const [editUPassword, setEditUPassword] = useState('');
  const [showEditUPassword, setShowEditUPassword] = useState(false);
  const [editURoleId, setEditURoleId] = useState('');
  const [editULocationId, setEditULocationId] = useState('');
  const [editUIsActive, setEditUIsActive] = useState(true);
  const [editUserFormError, setEditUserFormError] = useState<string | null>(null);
  const [userFeedbackBanner, setUserFeedbackBanner] = useState<string | null>(null);

  // New Role Form State: Initialize with ALL 19 permissions
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [permissions, setPermissions] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    ALL_PERMISSIONS.forEach((p) => {
      // Default: POS and Sales viewing enabled
      initial[p.id] = ['access_pos', 'view_sales'].includes(p.id);
    });
    return initial;
  });
  const [modalSearchPerm, setModalSearchPerm] = useState('');

  // Edit Role Form State
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDesc, setEditRoleDesc] = useState('');
  const [editRolePermissions, setEditRolePermissions] = useState<Record<string, boolean>>({});
  const [editModalSearchPerm, setEditModalSearchPerm] = useState('');

  // Filtering for Permissions Matrix Table
  const filteredPermissions = useMemo(() => {
    return ALL_PERMISSIONS.filter((p) => {
      if (permissionFilterCategory !== 'all' && p.category !== permissionFilterCategory) {
        return false;
      }
      if (permissionSearchQuery.trim()) {
        const q = permissionSearchQuery.toLowerCase();
        return (
          p.label.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [permissionFilterCategory, permissionSearchQuery]);

  // Group filtered permissions by Category for the Matrix view
  const groupedPermissions = useMemo(() => {
    const groups: { category: string; color: string; perms: PermissionDefinition[] }[] = [];
    PERMISSION_CATEGORIES.forEach((cat) => {
      const perms = filteredPermissions.filter((p) => p.category === cat.name);
      if (perms.length > 0) {
        groups.push({
          category: cat.name,
          color: cat.color,
          perms,
        });
      }
    });
    return groups;
  }, [filteredPermissions]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError(null);

    const trimmedName = uName.trim();
    const trimmedEmail = uEmail.trim();

    if (!trimmedName || !trimmedEmail) {
      setUserFormError('Veuillez renseigner le nom complet et l’adresse email.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail)) {
      setUserFormError('Veuillez saisir une adresse email valide.');
      return;
    }

    if (state.users.some((u) => u.email?.trim().toLowerCase() === trimmedEmail.toLowerCase())) {
      setUserFormError('Un utilisateur avec cette adresse email existe déjà.');
      return;
    }

    if (!uPassword || uPassword.length < 8) {
      setUserFormError('Le mot de passe attribué doit contenir au moins 8 caractères.');
      return;
    }

    setIsSavingUser(true);
    try {
      const now = new Date().toISOString();
      const newUserId = `usr-${Date.now()}`;
      const payload = {
        userId: newUserId,
        email: trimmedEmail,
        name: trimmedName,
        businessId: currentBusiness.id,
        roleId: uRoleId,
        locationIds: uLocationId ? [uLocationId] : [],
        isActive: true,
        password: uPassword,
      };

      await auth.authStateReady().catch(() => {});
      let serverSave = await saveUserCredentialOnServer(payload, {
        skipExpiredNotify: Boolean(auth.currentUser),
      });

      // Re-sync server session automatically if Firebase user is active and server token was missing or invalidated
      if (!serverSave.ok && !serverSave.apiUnavailable && serverSave.status === 401 && auth.currentUser) {
        const fbToken = await auth.currentUser.getIdToken(true).catch(() => null);
        if (fbToken) {
          const recreated = await createServerSession({ firebaseIdToken: fbToken });
          if (recreated.ok) {
            serverSave = await saveUserCredentialOnServer(payload);
          }
        }
      }

      if (!serverSave.ok && !serverSave.apiUnavailable) {
        setUserFormError(
          serverSave.message || 'Impossible d’enregistrer le mot de passe sur le serveur.'
        );
        return;
      }

      const fbProvision = await provisionFirebaseUserWithPassword(trimmedEmail, uPassword);

      if (serverSave.apiUnavailable && !fbProvision.ok) {
        if (fbProvision.reason === 'auth/email-already-in-use') {
          addUser({
            id: newUserId,
            businessId: currentBusiness.id,
            name: trimmedName,
            email: trimmedEmail,
            hasPassword: true,
            passwordUpdatedAt: now,
            roleId: uRoleId,
            locationIds: uLocationId ? [uLocationId] : [],
            isActive: true,
            status: 'active',
          });
          setUserFeedbackBanner(
            `Compte ERP ajouté pour ${trimmedName} (${trimmedEmail}). L’adresse email existait déjà dans Firebase Authentication.`
          );
          setUName('');
          setUEmail('');
          setUPassword('');
          setShowUPassword(false);
          setUserFormError(null);
          setShowAddUserModal(false);
          return;
        }

        if (fbProvision.reason === 'auth/operation-not-allowed') {
          setUserFormError(
            'La connexion Email/Mot de passe doit être activée dans Firebase Console > Authentication.'
          );
          return;
        }
        if (fbProvision.reason === 'auth/weak-password') {
          setUserFormError('Le mot de passe doit contenir au moins 8 caractères.');
          return;
        }
        setUserFormError(
          'Impossible de créer le compte dans Firebase Authentication. Vérifiez la connexion et réessayez.'
        );
        return;
      }

      addUser({
        id: newUserId,
        businessId: currentBusiness.id,
        name: trimmedName,
        email: trimmedEmail,
        firebaseUid: fbProvision.uid,
        hasPassword: true,
        passwordUpdatedAt: serverSave.passwordUpdatedAt || now,
        roleId: uRoleId,
        locationIds: uLocationId ? [uLocationId] : [],
        isActive: true,
        status: 'active',
      });

      setUserFeedbackBanner(
        `Compte créé pour ${trimmedName} (${trimmedEmail}). L’utilisateur peut maintenant se connecter avec son mot de passe.`
      );
      setUName('');
      setUEmail('');
      setUPassword('');
      setShowUPassword(false);
      setUserFormError(null);
      setShowAddUserModal(false);
    } catch {
      setUserFormError('Impossible d’enregistrer le mot de passe pour le moment.');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleStartEditUser = (u: User) => {
    setEditingUser(u);
    setEditUName(u.name);
    setEditUEmail(u.email);
    setEditUPassword('');
    setShowEditUPassword(false);
    setEditURoleId(u.roleId);
    setEditULocationId(u.locationIds?.[0] || '');
    setEditUIsActive(u.isActive !== false);
    setEditUserFormError(null);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditUserFormError(null);

    const trimmedName = editUName.trim();
    const trimmedEmail = editUEmail.trim();

    if (!trimmedName || !trimmedEmail) {
      setEditUserFormError('Veuillez renseigner le nom complet et l’adresse email.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail)) {
      setEditUserFormError('Veuillez saisir une adresse email valide.');
      return;
    }

    if (
      state.users.some(
        (u) => u.id !== editingUser.id && u.email?.trim().toLowerCase() === trimmedEmail.toLowerCase()
      )
    ) {
      setEditUserFormError('Un autre utilisateur utilise déjà cette adresse email.');
      return;
    }

    if (editUPassword && editUPassword.length < 8) {
      setEditUserFormError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setIsSavingUser(true);
    try {
      const payload = {
        userId: editingUser.id,
        email: trimmedEmail,
        name: trimmedName,
        businessId: editingUser.businessId,
        roleId: editURoleId,
        locationIds: editULocationId ? [editULocationId] : [],
        isActive: editUIsActive,
        firebaseUid: editingUser.firebaseUid,
        password: editUPassword || undefined,
      };

      await auth.authStateReady().catch(() => {});
      let serverSave = await saveUserCredentialOnServer(payload, {
        skipExpiredNotify: Boolean(auth.currentUser),
      });

      if (!serverSave.ok && !serverSave.apiUnavailable && serverSave.status === 401 && auth.currentUser) {
        const fbToken = await auth.currentUser.getIdToken(true).catch(() => null);
        if (fbToken) {
          const recreated = await createServerSession({ firebaseIdToken: fbToken });
          if (recreated.ok) {
            serverSave = await saveUserCredentialOnServer(payload);
          }
        }
      }

      if (!serverSave.ok && !serverSave.apiUnavailable) {
        setEditUserFormError(
          serverSave.message || 'Erreur lors de la mise à jour sur le serveur.'
        );
        return;
      }

      let provisionedUid = editingUser.firebaseUid;
      let resetEmailSent = false;

      if (editUPassword) {
        const fbProvision = await provisionFirebaseUserWithPassword(trimmedEmail, editUPassword);
        if (fbProvision.ok && fbProvision.uid) {
          provisionedUid = fbProvision.uid;
        } else if (serverSave.apiUnavailable && fbProvision.reason === 'auth/email-already-in-use') {
          resetEmailSent = await sendPasswordResetEmail(auth, trimmedEmail)
            .then(() => true)
            .catch(() => false);
        } else if (serverSave.apiUnavailable && !fbProvision.ok) {
          setEditUserFormError(
            fbProvision.reason === 'auth/operation-not-allowed'
              ? 'La connexion Email/Mot de passe doit être activée dans Firebase Console > Authentication.'
              : 'Impossible de mettre à jour le mot de passe dans Firebase Authentication.'
          );
          return;
        }
      }

      const { passwordHash: _stripHash, ...cleanEditingUser } = editingUser;
      updateUser({
        ...cleanEditingUser,
        name: trimmedName,
        email: trimmedEmail,
        firebaseUid: serverSave.firebaseUid || provisionedUid,
        roleId: editURoleId,
        locationIds: editULocationId ? [editULocationId] : [],
        isActive: editUIsActive,
        status: editUIsActive ? 'active' : 'inactive',
        hasPassword: Boolean(serverSave.hasPassword || editUPassword || editingUser.hasPassword),
        passwordUpdatedAt: serverSave.passwordUpdatedAt || editingUser.passwordUpdatedAt,
      });

      setUserFeedbackBanner(
        resetEmailSent
          ? `Profil mis à jour pour ${trimmedName}. Un email de réinitialisation du mot de passe a été envoyé à ${trimmedEmail} via Firebase.`
          : editUPassword
          ? `Profil et mot de passe mis à jour pour ${trimmedName}.`
          : `Profil mis à jour pour ${trimmedName}.`
      );
      setEditingUser(null);
      setEditUPassword('');
    } catch {
      setEditUserFormError('Erreur lors de la mise à jour de l’utilisateur.');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDeleteUserConfirm = () => {
    if (!deletingUser) return;
    deleteUser(deletingUser.id);
    setDeletingUser(null);
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName) return;

    const selectedPerms = Object.keys(permissions).filter(
      (k) => permissions[k]
    ) as Permission[];

    addRole({
      businessId: currentBusiness.id,
      name: roleName,
      description: roleDesc || 'Rôle personnalisé',
      permissions: selectedPerms,
    });

    setRoleName('');
    setRoleDesc('');
    // Reset permissions to default
    const initial: Record<string, boolean> = {};
    ALL_PERMISSIONS.forEach((p) => {
      initial[p.id] = ['access_pos', 'view_sales'].includes(p.id);
    });
    setPermissions(initial);
    setShowAddRoleModal(false);
  };

  const handleStartEditRole = (r: Role) => {
    setEditingRole(r);
    setEditRoleName(r.name);
    setEditRoleDesc(r.description || '');

    // Accurately map ALL 19 permissions based on role's permissions array
    const permsObj: Record<string, boolean> = {};
    ALL_PERMISSIONS.forEach((p) => {
      permsObj[p.id] = r.permissions.includes(p.id);
    });
    setEditRolePermissions(permsObj);
    setEditModalSearchPerm('');
  };

  const handleSaveEditRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole || !editRoleName) return;

    const selectedPerms = Object.keys(editRolePermissions).filter(
      (k) => editRolePermissions[k]
    ) as Permission[];

    updateRole({
      ...editingRole,
      name: editRoleName,
      description: editRoleDesc,
      permissions: selectedPerms,
    });

    setEditingRole(null);
  };

  const handleDeleteRoleConfirm = () => {
    if (!deletingRole) return;
    deleteRole(deletingRole.id);
    setDeletingRole(null);
  };

  // One-click Toggle Permission directly on Matrix Table for custom roles
  const handleToggleMatrixPermission = (role: Role, permId: Permission) => {
    if (role.isPredefined) return; // Predefined roles are immutable

    const hasPerm = role.permissions.includes(permId);
    const newPerms = hasPerm
      ? role.permissions.filter((p) => p !== permId)
      : [...role.permissions, permId];

    updateRole({
      ...role,
      permissions: newPerms,
    });
  };

  // Presets Handlers for Creation Modal
  const applyPresetToNewRole = (presetPermissions: Permission[]) => {
    const updated: Record<string, boolean> = {};
    ALL_PERMISSIONS.forEach((p) => {
      updated[p.id] = presetPermissions.includes(p.id);
    });
    setPermissions(updated);
  };

  // Presets Handlers for Edit Modal
  const applyPresetToEditRole = (presetPermissions: Permission[]) => {
    const updated: Record<string, boolean> = {};
    ALL_PERMISSIONS.forEach((p) => {
      updated[p.id] = presetPermissions.includes(p.id);
    });
    setEditRolePermissions(updated);
  };

  const businessUsers = state.users.filter(
    (u) =>
      u.businessId === currentBusiness.id ||
      isFirebaseAdminAccount({ uid: u.firebaseUid, email: u.email, userId: u.id })
  );
  const businessRoles = state.roles.filter(
    (r) => r.isPredefined || r.businessId === currentBusiness.id
  );

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 text-white">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xs">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2.5 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold">Gestion des Utilisateurs & Matrice des Permissions</h2>
            <p className="text-xs text-slate-400">
              Contrôlez les accès utilisateurs et configurez les 19 permissions du système ERP.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => {
              // Open modal with fresh state
              setRoleName('');
              setRoleDesc('');
              const initial: Record<string, boolean> = {};
              ALL_PERMISSIONS.forEach((p) => {
                initial[p.id] = ['access_pos', 'view_sales'].includes(p.id);
              });
              setPermissions(initial);
              setModalSearchPerm('');
              setShowAddRoleModal(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3.5 min-h-[44px] sm:min-h-[38px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors shadow-xs whitespace-nowrap"
            title="Créer un nouveau rôle avec des autorisations personnalisées"
          >
            <Shield className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Nouveau Rôle</span>
          </button>

          <button
            onClick={() => {
              setUName('');
              setUEmail('');
              setUPassword('');
              setShowUPassword(false);
              setUserFormError(null);
              setShowAddUserModal(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 min-h-[44px] sm:min-h-[38px] bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-purple-900/30 whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            <span>Ajouter Utilisateur</span>
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center space-x-1.5 border-b border-slate-800 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 px-4 min-h-[40px] py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'users'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span>Comptes Utilisateurs ({businessUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center space-x-2 px-4 min-h-[40px] py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'roles'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4 shrink-0" />
          <span>Matrice des Permissions & Rôles ({ALL_PERMISSIONS.length} Permissions / {businessRoles.length} Rôles)</span>
        </button>
      </div>

      {/* SUB-TAB 1: USERS LIST */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          {userFeedbackBanner && (
            <div className="flex items-center justify-between gap-3 bg-emerald-950/70 border border-emerald-700/70 text-emerald-200 px-4 py-3 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{userFeedbackBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setUserFeedbackBanner(null)}
                className="text-emerald-300 hover:text-white"
                aria-label="Fermer la notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[760px]">
              <thead className="bg-slate-950 border-b border-slate-800 uppercase text-[10px] font-bold text-slate-400">
                <tr>
                  <th className="p-3.5">Utilisateur</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Rôle Assigné</th>
                  <th className="p-3.5">Emplacement</th>
                  <th className="p-3.5">Mot de passe</th>
                  <th className="p-3.5 text-center">Statut</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {businessUsers.map((u) => {
                  const role = state.roles.find((r) => r.id === u.roleId);
                  const loc = state.locations.find((l) => u.locationIds?.includes(l.id));
                  const isCurrent = u.id === currentUser?.id;
                  const isAdminAccount = isFirebaseAdminAccount({
                    uid: u.firebaseUid,
                    email: u.email,
                    userId: u.id,
                  });
                  const hasPassword = Boolean(u.hasPassword || u.passwordHash);

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5 font-bold text-white flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-purple-600/30 text-purple-300 flex items-center justify-center font-bold text-xs border border-purple-500/40">
                          {u.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {isAdminAccount && (
                              <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700/60 rounded text-[9px] font-bold">
                                Admin Firebase
                              </span>
                            )}
                          </div>
                          {isCurrent && (
                            <span className="text-[10px] text-purple-400 font-normal">(Session active)</span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 text-slate-300 font-mono">{u.email}</td>

                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-purple-950 text-purple-300 border border-purple-800">
                          {role ? role.name : 'Inconnu'}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-300">
                        {loc ? loc.name : <span className="text-slate-500 italic">Tous les magasins</span>}
                      </td>

                      <td className="p-3.5">
                        {hasPassword ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                            <KeyRound className="w-3.5 h-3.5 shrink-0" />
                            <span>Défini</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-slate-400">
                            <Lock className="w-3.5 h-3.5 shrink-0" />
                            <span>Firebase / Google</span>
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.isActive !== false
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}
                        >
                          {u.isActive !== false ? 'Actif' : 'Désactivé'}
                        </span>
                      </td>

                      <td className="p-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => handleStartEditUser(u)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded-lg border border-slate-700 transition-colors"
                          title="Modifier l'utilisateur ou attribuer un mot de passe"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeletingUser(u)}
                          disabled={isCurrent || isAdminAccount}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isCurrent || isAdminAccount
                              ? 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed'
                              : 'bg-slate-800 hover:bg-rose-950/80 text-rose-400 hover:text-rose-300 border-slate-700 hover:border-rose-800'
                          }`}
                          title={
                            isCurrent
                              ? 'Impossible de supprimer votre propre session active'
                              : isAdminAccount
                              ? 'Le compte Administrateur Firebase est protégé'
                              : "Supprimer l'utilisateur"
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ROLES & FULL PERMISSIONS MATRIX */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-semibold mr-1">Affichage:</span>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setRolesViewMode('matrix')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    rolesViewMode === 'matrix'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Matrice Globale ({ALL_PERMISSIONS.length})</span>
                </button>
                <button
                  onClick={() => setRolesViewMode('cards')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    rolesViewMode === 'cards'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Fiches des Rôles ({businessRoles.length})</span>
                </button>
              </div>
            </div>

            {/* Filter by Category & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={permissionSearchQuery}
                  onChange={(e) => setPermissionSearchQuery(e.target.value)}
                  placeholder="Rechercher une permission..."
                  className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 w-56"
                />
                {permissionSearchQuery && (
                  <button
                    onClick={() => setPermissionSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <select
                value={permissionFilterCategory}
                onChange={(e) => setPermissionFilterCategory(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="all">Tous les Modules ({ALL_PERMISSIONS.length})</option>
                {PERMISSION_CATEGORIES.map((cat) => {
                  const count = ALL_PERMISSIONS.filter((p) => p.category === cat.name).length;
                  return (
                    <option key={cat.name} value={cat.name}>
                      {cat.name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* VIEW 1: FULL PERMISSIONS MATRIX TABLE */}
          {rolesViewMode === 'matrix' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              {/* Matrix Banner */}
              <div className="bg-slate-950/80 px-4 py-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2 text-xs">
                  <span className="font-bold text-slate-200">
                    Matrice Complète des Droits d'Accès
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-purple-400 font-semibold">
                    {filteredPermissions.length} / {ALL_PERMISSIONS.length} permissions affichées
                  </span>
                </div>

                <div className="flex items-center space-x-4 text-[11px] text-slate-400">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                    <span>Autorisé</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <div className="w-4 h-4 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center border border-slate-700">
                      <X className="w-2.5 h-2.5" />
                    </div>
                    <span>Refusé</span>
                  </div>
                  <div className="flex items-center space-x-1 text-slate-500 italic">
                    <span>(Cliquez sur les cases d'un rôle personnalisé pour modifier directement)</span>
                  </div>
                </div>
              </div>

              {/* Matrix Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800">
                      <th className="p-3.5 min-w-[280px] max-w-sm text-slate-400 uppercase text-[10px] font-bold sticky left-0 bg-slate-950 z-10 border-r border-slate-800/80 shadow-xs">
                        Permissions & Modules Système ({filteredPermissions.length})
                      </th>
                      {businessRoles.map((r) => {
                        const grantedCount = ALL_PERMISSIONS.filter((p) =>
                          r.permissions.includes(p.id)
                        ).length;
                        const pct = Math.round((grantedCount / ALL_PERMISSIONS.length) * 100);

                        return (
                          <th
                            key={r.id}
                            className="p-3.5 text-center min-w-[150px] border-r border-slate-800 last:border-r-0"
                          >
                            <div className="flex flex-col items-center space-y-1">
                              <div className="flex items-center space-x-1 font-bold text-white text-xs">
                                <Shield className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                <span className="truncate max-w-[130px]">{r.name}</span>
                              </div>

                              <div className="flex items-center space-x-1">
                                {r.isPredefined ? (
                                  <span className="px-1.5 py-0.2 bg-slate-800 text-slate-400 text-[9px] font-bold uppercase rounded border border-slate-700">
                                    Système
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 bg-purple-950 text-purple-300 text-[9px] font-bold uppercase rounded border border-purple-800">
                                    Sur-Mesure
                                  </span>
                                )}
                              </div>

                              {/* Coverage counter */}
                              <div className="text-[10px] text-slate-400 font-medium">
                                <span className="text-emerald-400 font-bold">{grantedCount}</span>
                                <span> / {ALL_PERMISSIONS.length} ({pct}%)</span>
                              </div>

                              {/* Custom Role Actions */}
                              {!r.isPredefined && (
                                <div className="flex items-center space-x-1 pt-1">
                                  <button
                                    onClick={() => handleStartEditRole(r)}
                                    className="p-1 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded border border-slate-700 transition-colors"
                                    title="Modifier le rôle"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setDeletingRole(r)}
                                    className="p-1 bg-slate-800 hover:bg-rose-950 text-rose-400 hover:text-rose-300 rounded border border-slate-700 transition-colors"
                                    title="Supprimer le rôle"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody>
                    {groupedPermissions.map((group) => (
                      <React.Fragment key={group.category}>
                        {/* Category Header Row */}
                        <tr className="bg-slate-950/60 border-y border-slate-800/80">
                          <td
                            colSpan={businessRoles.length + 1}
                            className="px-4 py-2 text-[11px] font-bold text-slate-300 uppercase tracking-wider bg-slate-950/80 sticky left-0"
                          >
                            <span className="text-purple-400 font-black mr-2">■</span>
                            <span>{group.category}</span>
                            <span className="ml-2 text-[10px] text-slate-500 font-normal lowercase">
                              ({group.perms.length} permissions)
                            </span>
                          </td>
                        </tr>

                        {/* Category Permissions Rows */}
                        {group.perms.map((perm) => (
                          <tr
                            key={perm.id}
                            className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/40"
                          >
                            {/* Permission Information */}
                            <td className="p-3 sticky left-0 bg-slate-900 hover:bg-slate-800/80 transition-colors border-r border-slate-800/80 z-10">
                              <div className="flex flex-col space-y-0.5">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-white text-xs">
                                    {perm.label}
                                  </span>
                                  <code className="text-[9px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                                    {perm.id}
                                  </code>
                                </div>
                                <p className="text-[11px] text-slate-400 leading-snug">
                                  {perm.description}
                                </p>
                              </div>
                            </td>

                            {/* Roles Columns */}
                            {businessRoles.map((r) => {
                              const isGranted = r.permissions.includes(perm.id);
                              const isPredefined = r.isPredefined;

                              return (
                                <td
                                  key={r.id}
                                  onClick={() => {
                                    if (!isPredefined) {
                                      handleToggleMatrixPermission(r, perm.id);
                                    }
                                  }}
                                  className={`p-3 text-center border-r border-slate-800 last:border-r-0 transition-colors ${
                                    !isPredefined
                                      ? 'cursor-pointer hover:bg-purple-950/20'
                                      : 'cursor-default'
                                  }`}
                                  title={
                                    isPredefined
                                      ? `${r.name}: Rôle système immuable (${isGranted ? 'Accordé' : 'Refusé'})`
                                      : `Cliquer pour ${isGranted ? 'désactiver' : 'activer'} "${perm.label}" pour le rôle ${r.name}`
                                  }
                                >
                                  <div className="flex justify-center items-center">
                                    {isGranted ? (
                                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-xs">
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                      </div>
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-slate-800/80 text-slate-600 border border-slate-700/60 flex items-center justify-center">
                                        <X className="w-3.5 h-3.5" />
                                      </div>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: ROLES CARDS VIEW */}
          {rolesViewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {businessRoles.map((r) => {
                const grantedCount = ALL_PERMISSIONS.filter((p) =>
                  r.permissions.includes(p.id)
                ).length;
                const pct = Math.round((grantedCount / ALL_PERMISSIONS.length) * 100);

                return (
                  <div
                    key={r.id}
                    className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 relative group shadow-xs"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-sm text-white flex items-center space-x-1.5">
                          <Shield className="w-4 h-4 text-purple-400" />
                          <span>{r.name}</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">{r.description}</p>
                      </div>

                      <div className="flex items-center space-x-1">
                        {r.isPredefined ? (
                          <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 text-[9px] font-bold uppercase rounded border border-slate-700">
                            Système
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartEditRole(r)}
                              className="p-1 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded border border-slate-700"
                              title="Modifier le rôle"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setDeletingRole(r)}
                              className="p-1 bg-slate-800 hover:bg-rose-950 text-rose-400 rounded border border-slate-700"
                              title="Supprimer le rôle"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar of Permissions */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                        <span>Couverture des permissions:</span>
                        <span className="text-purple-300 font-bold">
                          {grantedCount} / {ALL_PERMISSIONS.length} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Permissions list categorized */}
                    <div className="border-t border-slate-800 pt-3 space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Détail des {grantedCount} autorisations accordées :
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto pr-1">
                        {r.permissions.map((p, i) => {
                          const def = ALL_PERMISSIONS.find((item) => item.id === p);
                          return (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-slate-800/90 text-purple-300 rounded text-[10px] font-medium border border-slate-700/80"
                              title={def ? def.description : p}
                            >
                              {def ? def.label : p}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ADD USER MODAL */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Nouveau Compte Utilisateur</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {userFormError && (
              <div className="p-3 bg-rose-950/70 border border-rose-700 text-rose-200 rounded-xl text-xs">
                {userFormError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nom Complet *</label>
                <input
                  type="text"
                  required
                  value={uName}
                  onChange={(e) => setUName(e.target.value)}
                  placeholder="ex: M. Koffi Eric"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Adresse Email *</label>
                <input
                  type="email"
                  required
                  value={uEmail}
                  onChange={(e) => setUEmail(e.target.value)}
                  placeholder="ex: eric@entreprise.com"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-semibold">Mot de passe (min. 8 caractères) *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setUPassword(generateStrongPassword(12));
                      setShowUPassword(true);
                      setUserFormError(null);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-400 hover:text-purple-300"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Générer</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showUPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={uPassword}
                    onChange={(e) => setUPassword(e.target.value)}
                    placeholder="Minimum 8 caractères"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 pr-9 font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUPassword((prev) => !prev)}
                    aria-label={showUPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showUPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Rôle Attribué *</label>
                <select
                  value={uRoleId}
                  onChange={(e) => setURoleId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  {businessRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.permissions.length} permissions)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Magasin / Emplacement Délégué</label>
                <select
                  value={uLocationId}
                  onChange={(e) => setULocationId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="">Tous les emplacements</option>
                  {state.locations
                    .filter((l) => l.businessId === currentBusiness.id)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  disabled={isSavingUser}
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {isSavingUser ? 'Enregistrement...' : 'Créer Utilisateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Modifier l'Utilisateur</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {editUserFormError && (
              <div className="p-3 bg-rose-950/70 border border-rose-700 text-rose-200 rounded-xl text-xs">
                {editUserFormError}
              </div>
            )}

            <form onSubmit={handleSaveEditUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nom Complet *</label>
                <input
                  type="text"
                  required
                  value={editUName}
                  onChange={(e) => setEditUName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Adresse Email *</label>
                <input
                  type="email"
                  required
                  value={editUEmail}
                  onChange={(e) => setEditUEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-semibold">
                    {editingUser.hasPassword || editingUser.passwordHash
                      ? 'Nouveau mot de passe (optionnel)'
                      : 'Attribuer un mot de passe (min. 8 car.)'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditUPassword(generateStrongPassword(12));
                      setShowEditUPassword(true);
                      setEditUserFormError(null);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Générer</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showEditUPassword ? 'text' : 'password'}
                    value={editUPassword}
                    onChange={(e) => setEditUPassword(e.target.value)}
                    placeholder={
                      editingUser.hasPassword || editingUser.passwordHash
                        ? 'Laisser vide pour conserver le mot de passe actuel'
                        : 'Minimum 8 caractères'
                    }
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 pr-9 font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditUPassword((prev) => !prev)}
                    aria-label={showEditUPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showEditUPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Rôle Attribué *</label>
                <select
                  value={editURoleId}
                  onChange={(e) => setEditURoleId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  {businessRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.permissions.length} permissions)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Magasin / Emplacement Délégué</label>
                <select
                  value={editULocationId}
                  onChange={(e) => setEditULocationId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="">Tous les emplacements</option>
                  {state.locations
                    .filter((l) => l.businessId === currentBusiness.id)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                </select>
              </div>

              {editingUser.id !== currentUser?.id && (
                <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/70 border border-slate-700 cursor-pointer">
                  <span className="text-slate-200 font-semibold">Compte actif (connexion autorisée)</span>
                  <input
                    type="checkbox"
                    checked={editUIsActive}
                    onChange={(e) => setEditUIsActive(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                  />
                </label>
              )}

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  disabled={isSavingUser}
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {isSavingUser ? 'Enregistrement...' : 'Enregistrer Modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE USER CONFIRM MODAL */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-slate-900 border border-rose-900/50 text-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-white">Supprimer l'Utilisateur ?</h3>
            </div>

            <p className="text-xs text-slate-300">
              Êtes-vous sûr de vouloir supprimer l'utilisateur <span className="font-bold text-white">{deletingUser.name}</span> ({deletingUser.email}) ?
              Cette action est irréversible.
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700 text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteUserConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs shadow-md shadow-rose-950"
              >
                Confirmer la Suppression
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD ROLE MODAL (COMPLETE 19 PERMISSIONS MATRIX) */}
      {showAddRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl space-y-4 my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div>
                <h3 className="font-bold text-base text-white flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span>Créer un Rôle Sur-Mesure</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Définissez l'intitulé et cochez les permissions autorisées parmi les {ALL_PERMISSIONS.length} permissions possibles.
                </p>
              </div>
              <button onClick={() => setShowAddRoleModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Intitulé du Rôle *</label>
                  <input
                    type="text"
                    required
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="ex: Chef de Caisse & Stock"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Description / Fonction</label>
                  <input
                    type="text"
                    value={roleDesc}
                    onChange={(e) => setRoleDesc(e.target.value)}
                    placeholder="ex: Responsable des inventaires et caisses"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Presets & Quick Actions Toolbar */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-300 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Modèles de rôles prédéfinis :</span>
                  </span>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const allTrue: Record<string, boolean> = {};
                        ALL_PERMISSIONS.forEach((p) => (allTrue[p.id] = true));
                        setPermissions(allTrue);
                      }}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[10px] font-semibold border border-slate-700"
                    >
                      Tout Cocher ({ALL_PERMISSIONS.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const allFalse: Record<string, boolean> = {};
                        ALL_PERMISSIONS.forEach((p) => (allFalse[p.id] = false));
                        setPermissions(allFalse);
                      }}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[10px] font-semibold border border-slate-700"
                    >
                      Tout Décocher (0)
                    </button>
                  </div>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {ROLE_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPresetToNewRole(preset.permissions)}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-purple-950/60 hover:text-purple-300 text-slate-300 rounded-lg text-[10px] font-semibold border border-slate-800 hover:border-purple-800 transition-colors"
                      title={preset.description}
                    >
                      {preset.name} ({preset.permissions.length})
                    </button>
                  ))}
                </div>
              </div>

              {/* Permissions Matrix with Grouping & Search */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <label className="block text-slate-200 font-bold">
                      Matrice des Permissions ({Object.values(permissions).filter(Boolean).length} / {ALL_PERMISSIONS.length} accordées)
                    </label>
                  </div>

                  <div className="relative">
                    <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={modalSearchPerm}
                      onChange={(e) => setModalSearchPerm(e.target.value)}
                      placeholder="Filtrer permissions..."
                      className="bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-purple-500 w-44"
                    />
                  </div>
                </div>

                {/* Categorized Permissions List */}
                <div className="space-y-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800 max-h-72 overflow-y-auto">
                  {PERMISSION_CATEGORIES.map((cat) => {
                    const catPerms = ALL_PERMISSIONS.filter((p) => {
                      if (p.category !== cat.name) return false;
                      if (modalSearchPerm.trim()) {
                        const q = modalSearchPerm.toLowerCase();
                        return (
                          p.label.toLowerCase().includes(q) ||
                          p.description.toLowerCase().includes(q) ||
                          p.id.toLowerCase().includes(q)
                        );
                      }
                      return true;
                    });

                    if (catPerms.length === 0) return null;

                    const activeInCat = catPerms.filter((p) => permissions[p.id]).length;

                    return (
                      <div key={cat.name} className="space-y-1.5 pb-2 border-b border-slate-800/80 last:border-b-0">
                        {/* Group Header */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center space-x-1.5">
                            <span>■ {cat.name}</span>
                            <span className="text-[10px] text-slate-400 font-normal lowercase">
                              ({activeInCat}/{catPerms.length} accordées)
                            </span>
                          </span>

                          <div className="space-x-1 text-[9px]">
                            <button
                              type="button"
                              onClick={() => {
                                setPermissions((prev) => {
                                  const next = { ...prev };
                                  catPerms.forEach((p) => (next[p.id] = true));
                                  return next;
                                });
                              }}
                              className="text-slate-400 hover:text-white underline"
                            >
                              Tout cocher
                            </button>
                            <span className="text-slate-600">|</span>
                            <button
                              type="button"
                              onClick={() => {
                                setPermissions((prev) => {
                                  const next = { ...prev };
                                  catPerms.forEach((p) => (next[p.id] = false));
                                  return next;
                                });
                              }}
                              className="text-slate-400 hover:text-white underline"
                            >
                              Décocher
                            </button>
                          </div>
                        </div>

                        {/* Permissions Grid in Group */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {catPerms.map((perm) => (
                            <label
                              key={perm.id}
                              className={`flex items-start space-x-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                                permissions[perm.id]
                                  ? 'bg-purple-950/30 border-purple-800/60 text-white'
                                  : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:bg-slate-900'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(permissions[perm.id])}
                                onChange={(e) =>
                                  setPermissions((prev) => ({
                                    ...prev,
                                    [perm.id]: e.target.checked,
                                  }))
                                }
                                className="mt-0.5 rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500 shrink-0"
                              />
                              <div className="leading-tight select-none">
                                <div className="font-semibold text-xs text-slate-200">
                                  {perm.label}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                                  {perm.description}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2 shrink-0 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddRoleModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold shadow-md shadow-purple-950"
                >
                  Créer le Rôle avec {Object.values(permissions).filter(Boolean).length} Permissions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ROLE MODAL (COMPLETE 19 PERMISSIONS MATRIX) */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl space-y-4 my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div>
                <h3 className="font-bold text-base text-white flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span>Modifier le Rôle : {editingRole.name}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Ajustez les droits d'accès accordés parmi les {ALL_PERMISSIONS.length} permissions de la matrice.
                </p>
              </div>
              <button onClick={() => setEditingRole(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRole} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Intitulé du Rôle *</label>
                  <input
                    type="text"
                    required
                    value={editRoleName}
                    onChange={(e) => setEditRoleName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Description / Fonction</label>
                  <input
                    type="text"
                    value={editRoleDesc}
                    onChange={(e) => setEditRoleDesc(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Presets & Quick Actions Toolbar */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-300 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Appliquer un modèle de permissions :</span>
                  </span>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const allTrue: Record<string, boolean> = {};
                        ALL_PERMISSIONS.forEach((p) => (allTrue[p.id] = true));
                        setEditRolePermissions(allTrue);
                      }}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[10px] font-semibold border border-slate-700"
                    >
                      Tout Cocher ({ALL_PERMISSIONS.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const allFalse: Record<string, boolean> = {};
                        ALL_PERMISSIONS.forEach((p) => (allFalse[p.id] = false));
                        setEditRolePermissions(allFalse);
                      }}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[10px] font-semibold border border-slate-700"
                    >
                      Tout Décocher (0)
                    </button>
                  </div>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {ROLE_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPresetToEditRole(preset.permissions)}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-purple-950/60 hover:text-purple-300 text-slate-300 rounded-lg text-[10px] font-semibold border border-slate-800 hover:border-purple-800 transition-colors"
                      title={preset.description}
                    >
                      {preset.name} ({preset.permissions.length})
                    </button>
                  ))}
                </div>
              </div>

              {/* Permissions Matrix with Grouping & Search */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <label className="block text-slate-200 font-bold">
                      Matrice des Permissions ({Object.values(editRolePermissions).filter(Boolean).length} / {ALL_PERMISSIONS.length} accordées)
                    </label>
                  </div>

                  <div className="relative">
                    <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={editModalSearchPerm}
                      onChange={(e) => setEditModalSearchPerm(e.target.value)}
                      placeholder="Filtrer permissions..."
                      className="bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-purple-500 w-44"
                    />
                  </div>
                </div>

                {/* Categorized Permissions List */}
                <div className="space-y-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800 max-h-72 overflow-y-auto">
                  {PERMISSION_CATEGORIES.map((cat) => {
                    const catPerms = ALL_PERMISSIONS.filter((p) => {
                      if (p.category !== cat.name) return false;
                      if (editModalSearchPerm.trim()) {
                        const q = editModalSearchPerm.toLowerCase();
                        return (
                          p.label.toLowerCase().includes(q) ||
                          p.description.toLowerCase().includes(q) ||
                          p.id.toLowerCase().includes(q)
                        );
                      }
                      return true;
                    });

                    if (catPerms.length === 0) return null;

                    const activeInCat = catPerms.filter((p) => editRolePermissions[p.id]).length;

                    return (
                      <div key={cat.name} className="space-y-1.5 pb-2 border-b border-slate-800/80 last:border-b-0">
                        {/* Group Header */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center space-x-1.5">
                            <span>■ {cat.name}</span>
                            <span className="text-[10px] text-slate-400 font-normal lowercase">
                              ({activeInCat}/{catPerms.length} accordées)
                            </span>
                          </span>

                          <div className="space-x-1 text-[9px]">
                            <button
                              type="button"
                              onClick={() => {
                                setEditRolePermissions((prev) => {
                                  const next = { ...prev };
                                  catPerms.forEach((p) => (next[p.id] = true));
                                  return next;
                                });
                              }}
                              className="text-slate-400 hover:text-white underline"
                            >
                              Tout cocher
                            </button>
                            <span className="text-slate-600">|</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditRolePermissions((prev) => {
                                  const next = { ...prev };
                                  catPerms.forEach((p) => (next[p.id] = false));
                                  return next;
                                });
                              }}
                              className="text-slate-400 hover:text-white underline"
                            >
                              Décocher
                            </button>
                          </div>
                        </div>

                        {/* Permissions Grid in Group */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {catPerms.map((perm) => (
                            <label
                              key={perm.id}
                              className={`flex items-start space-x-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                                editRolePermissions[perm.id]
                                  ? 'bg-purple-950/30 border-purple-800/60 text-white'
                                  : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:bg-slate-900'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(editRolePermissions[perm.id])}
                                onChange={(e) =>
                                  setEditRolePermissions((prev) => ({
                                    ...prev,
                                    [perm.id]: e.target.checked,
                                  }))
                                }
                                className="mt-0.5 rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500 shrink-0"
                              />
                              <div className="leading-tight select-none">
                                <div className="font-semibold text-xs text-slate-200">
                                  {perm.label}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                                  {perm.description}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2 shrink-0 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-md shadow-blue-950"
                >
                  Enregistrer ({Object.values(editRolePermissions).filter(Boolean).length} Permissions)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE ROLE CONFIRM MODAL */}
      {deletingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-slate-900 border border-rose-900/50 text-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-white">Supprimer le Rôle ?</h3>
            </div>

            <p className="text-xs text-slate-300">
              Êtes-vous sûr de vouloir supprimer le rôle <span className="font-bold text-white">{deletingRole.name}</span> ?
              Cette action est irréversible.
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRole(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700 text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteRoleConfirm}
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
