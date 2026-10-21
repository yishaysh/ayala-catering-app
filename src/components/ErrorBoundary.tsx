import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 my-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-center flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
            <AlertTriangle size={28} />
          </div>
          <div>
            <h4 className="text-lg font-bold text-themeText">
              {this.props.fallbackMessage || 'נתקלנו בבעיה בטעינת הרכיב'}
            </h4>
            <p className="text-xs text-themeText/60 mt-1">
              שאר חלקי האתר פועלים כרגיל. ניתן לנסות לטעון שוב.
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-themePrimary text-themeCardBg rounded-xl font-bold text-sm shadow-md hover:opacity-90 transition-opacity"
          >
            <RefreshCw size={16} />
            רענן דף
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
