import React from 'react';
import { Clock, Loader2, LogOut, ShieldAlert } from 'lucide-react';

interface InactivityWarningModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  totalWarningSeconds: number;
  isRenewing: boolean;
  onStayConnected: () => void;
  onLogoutNow: () => void;
}

function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const InactivityWarningModal: React.FC<InactivityWarningModalProps> = ({
  isOpen,
  remainingSeconds,
  totalWarningSeconds,
  isRenewing,
  onStayConnected,
  onLogoutNow,
}) => {
  if (!isOpen) return null;

  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((remainingSeconds / Math.max(1, totalWarningSeconds)) * 100))
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="inactivity-modal-title"
      aria-describedby="inactivity-modal-desc"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 border border-amber-200">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2
              id="inactivity-modal-title"
              className="text-base font-bold text-slate-900 leading-tight"
            >
              Session bientôt expirée
            </h2>
            <p className="text-xs font-medium text-amber-800 mt-0.5">
              Sécurité automatique d’inactivité
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <p id="inactivity-modal-desc" className="text-sm text-slate-600 leading-relaxed">
            Aucune activité récente n’a été détectée. Par sécurité, vous serez automatiquement
            déconnecté à la fin du compte à rebours.
          </p>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              <Clock className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
              <span>Déconnexion automatique dans</span>
            </div>
            <div className="text-3xl font-extrabold tabular-nums tracking-tight text-slate-900">
              {formatCountdown(remainingSeconds)}
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full transition-all duration-500 ${
                  remainingSeconds <= 15 ? 'bg-rose-500' : 'bg-amber-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onLogoutNow}
              disabled={isRenewing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 min-h-[44px] text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Se déconnecter</span>
            </button>

            <button
              type="button"
              autoFocus
              onClick={onStayConnected}
              disabled={isRenewing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 min-h-[44px] text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 active:bg-emerald-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {isRenewing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
                  <span>Renouvellement...</span>
                </>
              ) : (
                <span>Rester connecté</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
