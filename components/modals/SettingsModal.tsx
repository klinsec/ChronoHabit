
import React, { useState, useEffect } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext';
import { initGoogleDrive, signInToGoogle, findBackupFile, downloadBackupFile } from '../../utils/googleDrive';

interface SettingsModalProps {
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { requestNotificationPermission, exportData, importData, setCloudConnected, triggerCloudSync, cloudStatus, lastSyncTime } = useTimeTracker();
  
  const [clientId, setClientId] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDriveConfig, setShowDriveConfig] = useState(false);
  const [currentOrigin, setCurrentOrigin] = useState('');

  useEffect(() => {
      const storedClientId = localStorage.getItem('google_client_id');
      if (storedClientId) {
          setClientId(storedClientId);
          setShowDriveConfig(true);
      }
      setCurrentOrigin(window.location.origin);
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
      if (!clientId) {
          alert("Por favor, introduce un Client ID.");
          return;
      }
      localStorage.setItem('google_client_id', clientId);
      setIsLoading(true);
      setStatusMsg('Conectando con Google...');
      try {
          await initGoogleDrive(clientId); 
          await signInToGoogle();
          setCloudConnected(true);
          setStatusMsg('¡Nube conectada! Sincronizando...');
          await triggerCloudSync();
      } catch (err: any) {
          console.error(err);
          setStatusMsg('Error: ' + (err.message || 'Fallo de conexión'));
      } finally {
          setIsLoading(false);
      }
  };

  const handleCloudRestore = async () => {
      setIsLoading(true);
      setStatusMsg('Buscando copia en tu Drive...');
      try {
          const existingFile = await findBackupFile();
          if (!existingFile) {
              setStatusMsg('No hay copias en la nube.');
              return;
          }
          const data = await downloadBackupFile(existingFile.id);
          const success = importData(JSON.stringify(data), true);
          if (success) setStatusMsg('¡Restauración completada!');
      } catch (err: any) {
          setStatusMsg('Error al bajar: ' + err.message);
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl p-6 w-full max-w-md border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-6 text-on-surface border-b border-gray-700 pb-2">Panel de Control Nube</h2>
        
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

            {/* Main Cloud Setup */}
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Configuración Nube</h3>
                    <button onClick={() => setShowDriveConfig(!showDriveConfig)} className="text-xs text-blue-400 hover:underline">
                        {showDriveConfig ? 'Ocultar Tutorial' : '¿Cómo se hace?'}
                    </button>
                </div>

                {showDriveConfig && (
                    <div className="p-4 bg-blue-900/20 border border-blue-900/50 rounded-xl space-y-3 text-xs text-blue-100">
                        <p className="font-bold">Pasos para activar la Nube:</p>
                        <ol className="list-decimal list-inside space-y-2 opacity-90">
                            <li>Entra en <a href="https://console.cloud.google.com/" target="_blank" className="underline font-bold">Google Cloud Console</a>.</li>
                            <li>Crea un proyecto y activa la "Google Drive API".</li>
                            <li>En "Pantalla de consentimiento OAuth", elige "Externo" y añade tu email.</li>
                            <li>En "Credenciales", crea un "ID de cliente de OAuth".</li>
                            <li><b>IMPORTANTE:</b> En "Orígenes de JavaScript", pega exactamente esto: <code className="bg-black p-1 rounded font-mono text-green-400 select-all block mt-1">{currentOrigin}</code></li>
                            <li>Copia el "Client ID" que te den y pégalo abajo.</li>
                        </ol>
                    </div>
                )}

                <div className="space-y-2">
                    <input 
                        type="text" 
                        placeholder="Pega aquí tu Client ID de Google" 
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        className="w-full bg-black border border-gray-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-primary outline-none"
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={handleConnectDrive}
                            disabled={isLoading}
                            className={`bg-primary text-bkg font-bold py-3 rounded-xl text-sm transition-transform active:scale-95 ${isLoading ? 'opacity-50' : ''}`}
                        >
                            Conectar Nube
                        </button>
                        <button 
                            onClick={handleCloudRestore}
                            disabled={isLoading || cloudStatus !== 'connected'}
                            className={`bg-gray-700 text-white font-bold py-3 rounded-xl text-sm transition-transform active:scale-95 disabled:opacity-30`}
                        >
                            Bajar de Nube
                        </button>
                    </div>
                </div>
            </div>

            {/* Local Section */}
            <div className="pt-4 border-t border-gray-800">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Copia Manual (Sin Nube)</h3>
                <div className="flex gap-3">
                    <button 
                        onClick={handleDownloadBackup}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-on-surface font-semibold py-2 rounded-xl text-xs"
                    >
                        💾 Exportar JSON
                    </button>
                    <button 
                        onClick={requestNotificationPermission}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-on-surface font-semibold py-2 rounded-xl text-xs"
                    >
                        🔔 Activar Avisos
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
