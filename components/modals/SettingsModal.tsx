
import React, { useState, useEffect } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext';
import { initGoogleDrive, findBackupFile, downloadBackupFile } from '../../utils/googleDrive';

interface SettingsModalProps {
  onClose: () => void;
}

const GOOGLE_CLIENT_ID = '347833746217-of5l8r31t5csaqtqce7130raeisgidlv.apps.googleusercontent.com';

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { requestNotificationPermission, exportData, importData, connectToCloud, triggerCloudSync, cloudStatus, lastSyncTime, notificationsEnabled, toggleDailyNotification } = useTimeTracker();
  
  const [statusMsg, setStatusMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
      // Try to init immediately in background
      initGoogleDrive(GOOGLE_CLIENT_ID).catch(e => console.warn("Auto-init failed:", e));
  }, []);

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

  const handleConnectDrive = async () => {
      setIsLoading(true);
      setStatusMsg('Conectando y comprobando copias...');
      try {
          await connectToCloud();
          setStatusMsg('');
      } catch (err: any) {
          console.error(err);
          // If popup blocked or closed
          if (err.error === 'popup_closed_by_user') {
               setStatusMsg('Cancelado por usuario.');
          } else {
               setStatusMsg('Error: ' + (err.message || JSON.stringify(err)));
          }
      } finally {
          setIsLoading(false);
      }
  };

  const handleCloudRestore = async () => {
      setIsLoading(true);
      setStatusMsg('Buscando copia en tu Drive...');
      try {
          // Ensure init
          await initGoogleDrive(GOOGLE_CLIENT_ID);
          
          const existingFile = await findBackupFile();
          if (!existingFile) {
              setStatusMsg('No hay copias en la nube.');
              return;
          }
          const data = await downloadBackupFile(existingFile.id);
          const success = importData(JSON.stringify(data), true);
          if (success) setStatusMsg('¡Restauración completada!');
      } catch (err: any) {
          setStatusMsg('Error al bajar: ' + (err.message || 'Desconocido'));
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
                    <span className="text-sm font-semibold">Estado de la Nube</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${cloudStatus === 'connected' ? 'bg-green-900 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                        {cloudStatus === 'connected' ? 'Sincronizado' : cloudStatus}
                    </span>
                </div>
                {lastSyncTime && (
                    <p className="text-[10px] text-gray-500">Última sincronización: {new Date(lastSyncTime).toLocaleString()}</p>
                )}
                {cloudStatus === 'connected' && (
                    <button 
                        onClick={() => triggerCloudSync()}
                        className="mt-3 w-full bg-primary/20 hover:bg-primary/30 text-primary font-bold py-2 rounded-lg text-xs transition-colors"
                    >
                        🔄 Sincronizar Ahora
                    </button>
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
                    <p className="text-[10px] text-gray-500 px-1">
                        *Requiere configuración de Firebase y Cloud Functions en el backend para enviar alertas programadas.
                    </p>
                </div>
            </div>

            {/* Main Cloud Setup */}
            <div className="space-y-3 pt-4 border-t border-gray-800">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nube (Google Drive)</h3>

                {cloudStatus !== 'connected' && (
                    <div className="space-y-3">
                        <p className="text-xs text-gray-400">Conecta tu cuenta de Google para guardar tus datos automáticamente.</p>
                        
                        <button 
                            onClick={handleConnectDrive}
                            disabled={isLoading}
                            className="w-full bg-primary text-bkg font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <span className="text-lg">☁️</span>
                            <span>{isLoading ? "Cargando..." : "Conectar Nube"}</span>
                        </button>
                        
                        <div className="text-center">
                             <button 
                                onClick={handleCloudRestore}
                                disabled={isLoading}
                                className="text-xs text-gray-500 hover:text-white underline disabled:opacity-30"
                            >
                                ¿Ya tienes datos? Bajar copia existente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Local Section */}
            <div className="pt-4 border-t border-gray-800">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Datos Locales</h3>
                <div className="flex gap-3">
                    <button 
                        onClick={handleDownloadBackup}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-on-surface font-semibold py-2 rounded-xl text-xs"
                    >
                        💾 Exportar JSON
                    </button>
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
