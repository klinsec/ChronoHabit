import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component to catch rendering errors in child components.
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    const { hasError, error } = this.state;

    if (hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#121212] p-6 text-center">
            <div className="bg-[#1e1e1e] p-8 rounded-2xl shadow-2xl border border-red-900/50 max-w-sm w-full">
                <h1 className="text-3xl mb-4">😵</h1>
                <h2 className="text-xl font-bold text-red-500 mb-2">¡Ups! Algo salió mal.</h2>
                <p className="text-sm text-gray-400 mb-6">La aplicación ha encontrado un error inesperado y no puede continuar.</p>
                
                <details className="mb-6 text-left">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">Ver detalles técnicos</summary>
                    <pre className="mt-2 bg-black p-2 rounded text-[10px] text-red-300 overflow-auto max-h-32">
                        {error?.toString()}
                    </pre>
                </details>

                <div className="space-y-3">
                    <button 
                        onClick={() => window.location.reload()}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-xl transition-colors"
                    >
                        Intentar recargar
                    </button>
                    <button 
                        onClick={() => {
                            if(window.confirm("Esto borrará todos tus datos locales. ¿Seguro?")) {
                                localStorage.clear();
                                window.location.reload();
                            }
                        }}
                        className="w-full bg-red-900/30 hover:bg-red-900/50 text-red-400 font-bold py-2 px-4 rounded-xl text-sm transition-colors border border-red-900/50"
                    >
                        Restablecer App de fábrica
                    </button>
                </div>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;