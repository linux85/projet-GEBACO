import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';
import { resetERPState } from '../../lib/storage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetData = () => {
    if (window.confirm('Voulez-vous réinitialiser les données locales et recharger ?')) {
      resetERPState();
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="bg-slate-900 border border-slate-800 max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center space-x-3 text-amber-400">
              <div className="p-3 bg-amber-950/60 rounded-xl border border-amber-800/60">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Une erreur d'affichage est survenue</h2>
                <p className="text-xs text-slate-400">L'application a rencontré une exception inattendue.</p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-rose-300 font-mono overflow-x-auto max-h-40">
              {this.state.error?.message || 'Erreur inconnue'}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recharger la page</span>
              </button>
              <button
                type="button"
                onClick={this.handleResetData}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 border border-slate-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Réinitialiser les données</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
