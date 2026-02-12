
import React, { useState } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext';

interface SettingsModalProps {
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { 
      connectToCloud, 
      cloudStatus, 
      lastSyncTime, 
      notificationsEnabled, 
      toggleDailyNotification, 
      firebaseUser, 
      exportData, 
      importData 
  } = useTimeTracker();
  
  const [statusMsg, setStatusMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDownloadBackup = () => {
      const data = exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chronohabit_backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const jsonContent = event.target?.result as string;
              // Check validity roughly
              JSON.parse(jsonContent); 
              
              const shouldMerge = window.confirm("¿Quieres MEZCLAR estos datos con los actuales?\n\nCancelar: Reemplazar todo (Borra datos actuales).\nAceptar: Combinar datos.");
              const success = importData(jsonContent, shouldMerge);
              
              if (success) {
                  alert("Importación completada con éxito.");
                  onClose();
              } else {
                  alert("Error al importar los datos. El formato podría ser incorrecto.");
              }
          } catch (err) {
              alert("El archivo seleccionado no es un JSON válido.");
          }
      };
      reader.readAsText(file);
      // Reset input
      e.target.value = ''; 
  };

  const handleConnect = async () => {
      setIsLoading(true);
      try {
          await connectToCloud();
      } catch (err: any) {
          console.error(err);
          if(err.code === 'auth/popup-closed-by-user') {
              setStatusMsg('Inicio de sesión cancelado.');
          } else {
              setStatusMsg('Error al conectar: ' + err.message);
          }
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl p-6 w-full max-w-md border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-6 text-on-surface border-b border-gray-700 pb-2">Configuración</h2>
        
        <div className="space-y-6">
            
            {/* Status Section */}
            <div className="bg-gray-800/80 p-4 rounded-xl border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">Sincronización en Nube</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${cloudStatus === 'connected' ? 'bg-green-900 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                        {cloudStatus === 'connected' ? 'Activa' : cloudStatus}
                    </span>
                </div>
                
                {firebaseUser ? (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                            {firebaseUser.photoURL && <img src={firebaseUser.photoURL} className="w-6 h-6 rounded-full" alt="" />}
                            <span className="text-xs text-gray-300">{firebaseUser.displayName || firebaseUser.email}</span>
                        </div>
                        {lastSyncTime && (
                            <p className="text-[10px] text-gray-500">Última subida: {new Date(lastSyncTime).toLocaleString()}</p>
                        )}
                        <p className="text-[10px] text-green-400 italic">Tus datos se sobrescriben automáticamente al realizar cambios.</p>
                    </div>
                ) : (
                    <div className="space-y-3 mt-2">
                        <p className="text-xs text-gray-400">Inicia sesión para guardar tus datos en la nube y sincronizarlos entre dispositivos.</p>
                        <button 
                            onClick={handleConnect}
                            disabled={isLoading}
                            className="w-full bg-white text-black font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="" />
                            {isLoading ? "Conectando..." : "Iniciar con Google"}
                        </button>
                    </div>
                )}
            </div>

            {/* Notifications Section */}
            <div className="pt-4 border-t border-gray-800">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Notificaciones (FCM)</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between bg-gray-800 p-3 rounded-xl border border-gray-700">
                        <span className="text-sm font-semibold">Alertas Push</span>
                         <button 
                            onClick={toggleDailyNotification}
                            className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${notificationsEnabled ? 'bg-primary' : 'bg-gray-600'}`}
                        >
                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${notificationsEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Local Section */}
            <div className="pt-4 border-t border-gray-800">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Datos Locales (Manual)</h3>
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={handleDownloadBackup}
                        className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-on-surface font-semibold py-2 rounded-xl text-xs flex items-center justify-center gap-2"
                    >
                        <span>💾 Backup JSON</span>
                    </button>
                    <button 
                        onClick={handleImportClick}
                        className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-on-surface font-semibold py-2 rounded-xl text-xs flex items-center justify-center gap-2"
                    >
                        <span>📂 Restaurar JSON</span>
                    </button>
                    <input type="file" accept=".json" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
                </div>
            </div>
            
            {statusMsg && (
                <p className="text-center text-xs font-bold text-primary animate-pulse">{statusMsg}</p>
            )}
        </div>

        <button 
            onClick={onClose}
            className="mt-8 w-full py-3 text-gray-400 font-bold hover:text-white transition-colors"
        >
            Cerrar
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;
