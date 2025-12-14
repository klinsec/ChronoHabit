
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return React.createElement('div', { className: "flex flex-col items-center justify-center h-screen bg-[#121212] p-6 text-center" },
        React.createElement('div', { className: "bg-[#1e1e1e] p-8 rounded-2xl shadow-2xl border border-red-900/50 max-w-sm w-full" },
            React.createElement('h1', { className: "text-3xl mb-4" }, "😵"),
            React.createElement('h2', { className: "text-xl font-bold text-red-500 mb-2" }, "¡Ups! Algo salió mal."),
            React.createElement('p', { className: "text-sm text-gray-400 mb-6" }, "La aplicación ha encontrado un error inesperado y no puede continuar."),
            
            React.createElement('details', { className: "mb-6 text-left" },
                React.createElement('summary', { className: "text-xs text-gray-500 cursor-pointer hover:text-gray-300" }, "Ver detalles técnicos"),
                React.createElement('pre', { className: "mt-2 bg-black p-2 rounded text-[10px] text-red-300 overflow-auto max-h-32" },
                    this.state.error?.toString()
                )
            ),

            React.createElement('div', { className: "space-y-3" },
                React.createElement('button', 
                    {
                        onClick: () => window.location.reload(),
                        className: "w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-xl transition-colors"
                    },
                    "Intentar recargar"
                ),
                React.createElement('button', 
                    {
                        onClick: () => {
                            if(window.confirm("Esto borrará todos tus datos locales. ¿Seguro?")) {
                                localStorage.clear();
                                window.location.reload();
                            }
                        },
                        className: "w-full bg-red-900/30 hover:bg-red-900/50 text-red-400 font-bold py-2 px-4 rounded-xl text-sm transition-colors border border-red-900/50"
                    },
                    "Restablecer App de fábrica"
                )
            )
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
