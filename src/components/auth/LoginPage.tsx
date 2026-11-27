import React from 'react';
import { useERP } from '../../context/ERPContext';
import { AuthenticatedUserProfile, LoginForm } from './LoginForm';
import gebacoLogo from '../../assets/images/logo_gebaco_1788877200494.jpg';

export const LoginPage: React.FC = () => {
  const {
    loginWithFirebaseUser,
    authenticateUserWithEmailPassword,
    logoutReason,
    clearLogoutReason,
  } = useERP();

  const handleAuthSuccess = async (profile: AuthenticatedUserProfile) => {
    return await loginWithFirebaseUser(profile);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-emerald-600 selection:text-white">
      {/* Minimal SaaS Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <img
            src={gebacoLogo}
            alt="Logo GEBACO"
            className="h-8 w-auto max-w-[130px] object-contain"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.src.includes('logo-gebaco.png')) {
                target.src = '/logo-gebaco.png';
              }
            }}
          />
          <div className="leading-tight">
            <span className="font-bold text-base text-slate-900 tracking-tight block">
              GEBACO
            </span>
            <span className="text-xs text-slate-500">
              ERP & POS Multi-Magasins
            </span>
          </div>
        </div>
      </header>

      {/* Centered Login Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <LoginForm
          onSuccess={handleAuthSuccess}
          onEmailPasswordSubmit={authenticateUserWithEmailPassword}
          sessionNotice={logoutReason}
          onDismissSessionNotice={clearLogoutReason}
        />
      </main>

      {/* Minimal Footer */}
      <footer className="px-6 py-4 text-center text-xs text-slate-500 border-t border-slate-200/80 bg-white">
        JEBACO ERP Multi-Magasins &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};
