import React, { useState } from 'react';
import { AlertCircle, Clock, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { auth, signInWithEmailAndPassword, signInWithGoogle } from '../../lib/firebase';
import gebacoLogo from '../../assets/images/logo_gebaco_1788877200494.jpg';

export interface AuthenticatedUserProfile {
  uid?: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
  firebaseIdToken?: string;
}

export interface LoginFormProps {
  onSuccess?: (
    profile: AuthenticatedUserProfile
  ) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string } | void;
  onEmailPasswordSubmit?: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  sessionNotice?: string | null;
  onDismissSessionNotice?: () => void;
}

interface ValidationErrors {
  email?: string;
  password?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const mapAuthErrorMessage = (error: unknown): string => {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code)
    : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email ou mot de passe incorrect. Veuillez vérifier vos identifiants.';
    case 'auth/invalid-email':
      return 'Le format de l’adresse email est invalide.';
    case 'auth/user-disabled':
      return 'Ce compte a été désactivé. Contactez votre administrateur.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives infructueuses. Veuillez patienter avant de réessayer.';
    case 'auth/network-request-failed':
      return 'Erreur réseau. Vérifiez votre connexion internet et réessayez.';
    case 'auth/operation-not-allowed':
      return 'La connexion par email et mot de passe n’est pas activée. Utilisez Google ou activez ce mode dans la console Firebase.';
    case 'auth/popup-closed-by-user':
      return 'La fenêtre de connexion Google a été fermée avant la fin de l’opération.';
    case 'auth/cancelled-popup-request':
      return 'La demande de connexion Google a été annulée.';
    case 'auth/popup-blocked':
      return 'Le navigateur a bloqué la fenêtre Google. Autorisez les fenêtres contextuelles puis réessayez.';
    case 'auth/unauthorized-domain':
      return 'Ce domaine n’est pas autorisé pour la connexion Google dans la configuration Firebase.';
    default:
      return 'Échec de l’authentification. Veuillez vérifier vos identifiants et réessayez.';
  }
};

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onEmailPasswordSubmit,
  sessionNotice,
  onDismissSessionNotice,
}) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMethod, setLoadingMethod] = useState<'email' | 'google' | null>(null);

  const validateFields = (): ValidationErrors => {
    const nextErrors: ValidationErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = 'Veuillez saisir votre adresse email.';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      nextErrors.email = 'Veuillez saisir une adresse email valide.';
    }

    if (!password) {
      nextErrors.password = 'Veuillez saisir votre mot de passe.';
    } else if (password.length < 8) {
      nextErrors.password = 'Le mot de passe doit contenir au moins 8 caractères.';
    }

    return nextErrors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGlobalError(null);
    onDismissSessionNotice?.();

    const validationErrors = validateFields();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsLoading(true);
    setLoadingMethod('email');

    try {
      const trimmedEmail = email.trim();

      if (onEmailPasswordSubmit) {
        const outcome = await onEmailPasswordSubmit(trimmedEmail, password);
        if (!outcome.success) {
          setGlobalError(outcome.error || 'Email ou mot de passe incorrect.');
        }
        return;
      }

      const credential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      const firebaseIdToken = await credential.user.getIdToken();

      const outcome = await onSuccess?.({
        uid: credential.user.uid,
        email: credential.user.email || trimmedEmail,
        displayName: credential.user.displayName,
        photoURL: credential.user.photoURL,
        firebaseIdToken,
      });

      if (outcome && !outcome.success) {
        setGlobalError(outcome.error || 'Connexion refusée pour ce compte.');
      }
    } catch (err) {
      setGlobalError(mapAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
      setLoadingMethod(null);
    }
  };

  const handleGoogleLogin = async () => {
    setGlobalError(null);
    onDismissSessionNotice?.();
    setErrors({});
    setIsLoading(true);
    setLoadingMethod('google');

    try {
      const result = await signInWithGoogle();
      const userEmail = result.user.email;

      if (!userEmail) {
        setGlobalError('Aucune adresse email n’a été retournée par le compte Google.');
        return;
      }

      const firebaseIdToken = await result.user.getIdToken();
      const outcome = await onSuccess?.({
        uid: result.user.uid,
        email: userEmail,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        firebaseIdToken,
      });

      if (outcome && !outcome.success) {
        setGlobalError(outcome.error || 'Connexion refusée pour ce compte Google.');
      }
    } catch (err) {
      setGlobalError(mapAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
      setLoadingMethod(null);
    }
  };

  return (
    <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-[0_10px_35px_-10px_rgba(15,23,42,0.08)] p-6 sm:p-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-1.5 shadow-2xs">
          <img
            src={gebacoLogo}
            alt="Logo GEBACO"
            className="h-full w-full object-contain rounded-lg"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.src.includes('logo-gebaco.png')) {
                target.src = '/logo-gebaco.png';
              }
            }}
          />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Connexion à votre espace
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Identifiez-vous pour accéder à votre plateforme GEBACO ERP
        </p>
      </div>

      {/* Session Inactivity Notice */}
      {sessionNotice && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-sm text-amber-900"
        >
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
          <div className="leading-snug font-medium">{sessionNotice}</div>
        </div>
      )}

      {/* Global Error Alert */}
      {globalError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          <div className="leading-snug">{globalError}</div>
        </div>
      )}

      {/* Email / Password Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Email Input */}
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-slate-700">
            Adresse email
          </label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              disabled={isLoading}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                if (globalError) setGlobalError(null);
              }}
              placeholder="nom@entreprise.com"
              className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
                errors.email
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15'
                  : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-600/15'
              }`}
            />
          </div>
          {errors.email && (
            <p id="login-email-error" className="mt-1.5 text-xs font-medium text-red-600">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password Input */}
        <div>
          <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-slate-700">
            Mot de passe
          </label>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              disabled={isLoading}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'login-password-error' : 'login-password-hint'}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                if (globalError) setGlobalError(null);
              }}
              placeholder="••••••••"
              className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
                errors.password
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15'
                  : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-600/15'
              }`}
            />
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:pointer-events-none disabled:opacity-50"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {errors.password ? (
            <p id="login-password-error" className="mt-1.5 text-xs font-medium text-red-600">
              {errors.password}
            </p>
          ) : (
            <p id="login-password-hint" className="mt-1.5 text-xs text-slate-400">
              Minimum 8 caractères requis
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-emerald-700 active:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingMethod === 'email' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Connexion en cours...</span>
            </>
          ) : (
            <span>Se connecter</span>
          )}
        </button>
      </form>

      {/* Separator */}
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">ou</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {/* Secondary Google Auth Button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 active:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loadingMethod === 'google' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-slate-600" aria-hidden="true" />
            <span>Connexion avec Google...</span>
          </>
        ) : (
          <>
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span>Continuer avec Google</span>
          </>
        )}
      </button>
    </div>
  );
};
