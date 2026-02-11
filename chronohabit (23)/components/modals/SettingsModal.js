
import React, { useState, useEffect, useRef } from 'react';
import { useTimeTracker, GOOGLE_CLIENT_ID } from '../../context/TimeTrackerContext.js';
import { findBackupFile, downloadBackupFile, initGoogleDrive } from '../../utils/googleDrive.js';

const SettingsModal = ({ onClose }) => {
  const { 
    requestNotificationPermission, 
    exportData, 
    importData, 
    cloudStatus, 
    lastSyncTime, 
    triggerCloudSync,
    connectToCloud,
    notificationsEnabled,
    toggleDailyNotification
  } = useTimeTracker();
  
  const [statusMsg, setStatusMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

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
          await initGoogleDrive(GOOGLE_CLIENT_ID);
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
      try {
          await connectToCloud();
          
          // Check for existing backup immediately after connection
          setStatusMsg('Buscando copias existentes...');
          const existingFile = await findBackupFile();
          
          if (existingFile) {
              if (window.confirm("Se ha encontrado una copia de seguridad en Google Drive. ¿Quieres descargarla y mezclarla con tus datos actuales? \n\n(Cancelar para mantener solo los datos locales y sobreescribir la nube después)")) {
                  setStatusMsg('Descargando copia...');
                  const data = await downloadBackupFile(existingFile.id);
                  const success = importData(JSON.stringify(data), true); // Merge = true
                  if(success) setStatusMsg('Conectado y Sincronizado.');
              } else {
                  setStatusMsg('Conectado. Usando datos locales.');
                  // Optional: Trigger upload immediately to sync local state to cloud
                  // triggerCloudSync(); 
              }
          } else {
              setStatusMsg('Conectado. No hay copias previas.');
          }

      } catch (err) {
          console.error("Manual connect error:", err);
          setStatusMsg('Fallo al conectar: ' + (err.message || 'Error desconocido'));
      } finally {
          setIsLoading(false);
      }
  };

  const handleImportClick = () => {
      fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const jsonContent = event.target.result;
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
      e.target.value = null; 
  };

  return (
    React.createElement('div', { className: "fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" },
      React.createElement('div', { className: "bg-surface rounded-2xl p-6 w-full max-w-sm border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto" },
        React.createElement('h2', { className: "text-xl font-bold mb-6 text-on-surface border-b border-gray-700 pb-2" }, "Configuración"),
        
        React.createElement('div', { className: "space-y-6" },
            
            /* Cloud Sync Section */
            React.createElement('div', { className: "bg-gray-800/80 p-4 rounded-xl border border-gray-700" },
                React.createElement('div', { className: "flex items-center justify-between mb-4" },
                    React.createElement('h3', { className: "text-sm font-bold uppercase tracking-widest text-gray-400" }, "Copia de Seguridad (Drive)"),
                    React.createElement('span', { className: `text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${cloudStatus === 'connected' ? 'bg-green-900 text-green-400' : cloudStatus === 'error' ? 'bg-red-900 text-red-400' : 'bg-gray-700 text-gray-400'}` },
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
                         React.createElement('div', { className: "flex justify-between items-center" },
                            React.createElement('p', { className: "text-xs text-gray-400" }, "Guarda tus datos en Google Drive.")
                        ),
                        
                        React.createElement('button', 
                            { 
                                onClick: handleConnect, 
                                disabled: isLoading,
                                className: "w-full bg-primary text-bkg font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                            },
                            React.createElement('span', { className: "text-lg" }, "☁️"),
                            React.createElement('span', null, isLoading ? "Cargando..." : "Conectar Nube")
                        )
                    )
                ),
                statusMsg && React.createElement('p', { className: "text-[10px] text-center text-primary mt-2 animate-pulse" }, statusMsg)
            ),

            /* Notification Section */
            React.createElement('div', { className: "space-y-3 pt-4 border-t border-gray-800" },
                React.createElement('h3', { className: "text-xs font-bold text-gray-500 uppercase tracking-widest" }, "Notificaciones Push (Firebase)"),
                
                React.createElement('div', { className: "flex items-center justify-between bg-gray-800 p-3 rounded-xl border border-gray-700" },
                    React.createElement('span', { className: "text-sm font-semibold" }, "Vincular Dispositivo"),
                    React.createElement('button', 
                        {
                            onClick: toggleDailyNotification,
                            className: `w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${notificationsEnabled ? 'bg-primary' : 'bg-gray-600'}`
                        },
                        React.createElement('div', { className: `bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${notificationsEnabled ? 'translate-x-6' : 'translate-x-0'}` })
                    )
                ),
                React.createElement('p', { className: "text-[10px] text-gray-500 px-1" },
                    "Activa esto para registrar este dispositivo en la nube y recibir alertas."
                )
            ),

            /* Local Options */
            React.createElement('div', { className: "space-y-3 pt-4 border-t border-gray-800" },
                React.createElement('h3', { className: "text-xs font-bold text-gray-500 uppercase tracking-widest" }, "Datos Locales"),
                React.createElement('div', { className: "grid grid-cols-2 gap-3" },
                    React.createElement('button', 
                        {
                            onClick: handleDownloadBackup,
                            className: "w-full bg-gray-800 hover:bg-gray-700 text-on-surface font-semibold py-3 rounded-xl text-sm border border-gray-700 flex items-center justify-center gap-2"
                        },
                        React.createElement('span', null, "💾 Exportar JSON")
                    ),
                    React.createElement('button', 
                        {
                            onClick: handleImportClick,
                            className: "w-full bg-gray-800 hover:bg-gray-700 text-on-surface font-semibold py-3 rounded-xl text-sm border border-gray-700 flex items-center justify-center gap-2"
                        },
                        React.createElement('span', null, "📂 Importar JSON")
                    ),
                    /* Hidden Input */
                    React.createElement('input', {
                        type: "file",
                        accept: ".json",
                        ref: fileInputRef,
                        style: { display: 'none' },
                        onChange: handleFileChange
                    })
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
