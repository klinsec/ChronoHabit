
import React, { useState } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext.js';
import { findBackupFile, downloadBackupFile } from '../../utils/googleDrive.js';

const SettingsModal = ({ onClose }) => {
  const { 
    requestNotificationPermission, 
    exportData, 
    importData, 
    cloudStatus, 
    lastSyncTime, 
    connectToCloud, 
    triggerCloudSync 
  } = useTimeTracker();
  
  const [statusMsg, setStatusMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const handleCloudRestore = async () => {
      setIsLoading(true);
      setStatusMsg('Buscando copia en la nube...');
      try {
          const existingFile = await findBackupFile();
          if (!existingFile) {
              setStatusMsg('No se encontró copia en la nube.');
              return;
          }
          const data = await downloadBackupFile(existingFile.id);
          const success = importData(JSON.stringify(data), true);
          if (success) setStatusMsg('¡Datos recuperados con éxito!');
      } catch (err) {
          setStatusMsg('Error al bajar datos: ' + (err.message || 'Sin conexión'));
      } finally {
          setIsLoading(false);
      }
  };

  const handleConnect = async () => {
      setIsLoading(true);
      setStatusMsg('Conectando...');
      await connectToCloud();
      setIsLoading(false);
      setStatusMsg('');
  };

  return (
    React.createElement('div', { className: "fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" },
      React.createElement('div', { className: "bg-surface rounded-2xl p-6 w-full max-w-sm border border-gray-700 shadow-2xl" },
        React.createElement('h2', { className: "text-xl font-bold mb-6 text-on-surface border-b border-gray-700 pb-2" }, "Configuración"),
        
        React.createElement('div', { className: "space-y-6" },
            
            /* Cloud Sync Section */
            React.createElement('div', { className: "bg-gray-800/80 p-4 rounded-xl border border-gray-700" },
                React.createElement('div', { className: "flex items-center justify-between mb-4" },
                    React.createElement('h3', { className: "text-sm font-bold uppercase tracking-widest text-gray-400" }, "Nube Personal"),
                    React.createElement('span', { className: `text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${cloudStatus === 'connected' ? 'bg-green-900 text-green-400' : 'bg-gray-700 text-gray-400'}` },
                        cloudStatus === 'connected' ? 'Activa' : cloudStatus
                    )
                ),
                
                cloudStatus === 'connected' ? (
                    React.createElement('div', { className: "space-y-3" },
                        React.createElement('p', { className: "text-xs text-gray-400" }, 
                            lastSyncTime ? `Sincronizado: ${new Date(lastSyncTime).toLocaleTimeString()}` : "Conectado. Sincronizando..."
                        ),
                        React.createElement('div', { className: "grid grid-cols-2 gap-2" },
                            React.createElement('button', 
                                { onClick: () => triggerCloudSync(), className: "bg-primary/20 text-primary py-2 rounded-lg text-xs font-bold" },
                                "🔄 Forzar Subida"
                            ),
                            React.createElement('button', 
                                { onClick: handleCloudRestore, className: "bg-gray-700 text-white py-2 rounded-lg text-xs font-bold" },
                                "📥 Bajar Copia"
                            )
                        )
                    )
                ) : (
                    React.createElement('div', { className: "space-y-3" },
                        React.createElement('p', { className: "text-xs text-gray-400" }, "Guarda tus cronómetros automáticamente en tu cuenta de Google Drive."),
                        React.createElement('button', 
                            { 
                                onClick: handleConnect, 
                                disabled: isLoading,
                                className: "w-full bg-primary text-bkg font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                            },
                            React.createElement('span', { className: "text-lg" }, "☁️"),
                            React.createElement('span', null, "Conectar con Google")
                        )
                    )
                ),
                statusMsg && React.createElement('p', { className: "text-[10px] text-center text-primary mt-2 animate-pulse" }, statusMsg)
            ),

            /* Local Options */
            React.createElement('div', { className: "space-y-3" },
                 React.createElement('button', 
                    {
                        onClick: requestNotificationPermission,
                        className: "w-full bg-gray-800 hover:bg-gray-700 text-on-surface font-semibold py-3 rounded-xl text-sm border border-gray-700 flex items-center justify-center gap-2"
                    },
                    React.createElement('span', null, "🔔 Activar Notificaciones")
                ),
                React.createElement('button', 
                    {
                        onClick: handleDownloadBackup,
                        className: "w-full bg-gray-800 hover:bg-gray-700 text-on-surface font-semibold py-3 rounded-xl text-sm border border-gray-700 flex items-center justify-center gap-2"
                    },
                    React.createElement('span', null, "💾 Guardar archivo JSON")
                )
            )
        ),

        React.createElement('button', 
            {
                onClick: onClose,
                className: "mt-8 w-full py-2 text-gray-500 font-bold hover:text-white transition-colors"
            },
            "Cerrar"
        )
      )
    )
  );
};

export default SettingsModal;
