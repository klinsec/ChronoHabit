
import React, { useState, useEffect } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext.js';
import { initGoogleDrive, signInToGoogle, findBackupFile, uploadBackupFile, downloadBackupFile } from '../../utils/googleDrive.js';

const SettingsModal = ({ onClose }) => {
  const { requestNotificationPermission, exportData, importData } = useTimeTracker();
  
  // Google Drive State
  const [clientId, setClientId] = useState('');
  const [isDriveConnected, setIsDriveConnected] = useState(false);
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

  const handleImportClick = () => {
      document.getElementById('import-file')?.click();
  };

  const handleFileChange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const content = event.target?.result;
          if (content) {
              const success = importData(content);
              if (success) onClose();
          }
      };
      reader.readAsText(file);
  };

  // Google Drive Logic
  const handleConnectDrive = async () => {
      if (!clientId) {
          alert("Por favor, introduce un Client ID de Google Cloud.");
          return;
      }
      localStorage.setItem('google_client_id', clientId);
      setIsLoading(true);
      setStatusMsg('Iniciando sesión en Google...');
      
      try {
          await initGoogleDrive(clientId); 
          setStatusMsg('Solicitando permiso...');
          await signInToGoogle();
          setIsDriveConnected(true);
          setStatusMsg('Conectado a Google Drive.');
      } catch (err) {
          console.error(err);
          let errMsg = err.message || JSON.stringify(err);
          if (errMsg.includes("origin_mismatch")) {
              errMsg = "Error de Origen: La URL actual no está autorizada en tu Google Cloud Console.";
          }
          setStatusMsg('Error: ' + errMsg);
      } finally {
          setIsLoading(false);
      }
  };

  const handleDriveBackup = async () => {
      if (!isDriveConnected) {
          await handleConnectDrive();
          if (!isDriveConnected) return; // If failed, stop
      }
      
      setIsLoading(true);
      setStatusMsg('Buscando copia anterior...');
      try {
          const data = exportData();
          const existingFile = await findBackupFile();
          setStatusMsg('Subiendo datos...');
          await uploadBackupFile(data, existingFile?.id);
          setStatusMsg('¡Copia de seguridad en la nube completada!');
      } catch (err) {
          console.error(err);
          setStatusMsg('Error al subir: ' + err.message);
      } finally {
          setIsLoading(false);
      }
  };

  const handleDriveRestore = async () => {
      if (!isDriveConnected) {
          await handleConnectDrive();
          if (!isDriveConnected) return;
      }

      setIsLoading(true);
      setStatusMsg('Buscando copia...');
      try {
          const existingFile = await findBackupFile();
          if (!existingFile) {
              setStatusMsg('No se encontró ninguna copia de seguridad.');
              return;
          }
          setStatusMsg('Descargando...');
          const data = await downloadBackupFile(existingFile.id);
          const success = importData(JSON.stringify(data));
          if (success) {
              setStatusMsg('Restauración completada.');
              setTimeout(onClose, 1000);
          } else {
              setStatusMsg('Restauración cancelada o fallida.');
          }
      } catch (err) {
          console.error(err);
          setStatusMsg('Error al restaurar: ' + err.message);
      } finally {
          setIsLoading(false);
      }
  };

  return (
    React.createElement('div', { className: "fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" },
      React.createElement('div', { className: "bg-surface rounded-2xl p-6 w-full max-w-md border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto" },
        React.createElement('h2', { className: "text-xl font-bold mb-6 text-on-surface border-b border-gray-700 pb-2" }, "Configuración y Copias"),
        
        React.createElement('div', { className: "space-y-6" },
            
            /* Local Backup */
            React.createElement('div', { className: "space-y-3 bg-gray-800/50 p-4 rounded-xl border border-gray-700" },
                React.createElement('h3', { className: "text-base font-bold text-green-400 uppercase tracking-wider flex items-center gap-2" },
                    React.createElement('span', null, "🛡️ Copia de Seguridad Fácil")
                ),
                React.createElement('p', { className: "text-xs text-gray-400" },
                    "La forma más rápida y segura. Descarga tus datos a un archivo y guárdalo donde quieras. Si borras la caché, solo tienes que volver a cargarlo."
                ),
                React.createElement('div', { className: "grid grid-cols-2 gap-3" },
                    React.createElement('button', 
                        {
                            onClick: handleDownloadBackup,
                            className: "bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-2 rounded-xl text-sm flex flex-col items-center justify-center gap-1 shadow-lg"
                        },
                        React.createElement('span', { className: "text-xl" }, "⬇️"),
                        React.createElement('span', null, "Descargar Archivo")
                    ),
                    React.createElement('button', 
                        {
                            onClick: handleImportClick,
                            className: "bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-2 rounded-xl text-sm flex flex-col items-center justify-center gap-1 border border-gray-600"
                        },
                        React.createElement('span', { className: "text-xl" }, "⬆️"),
                        React.createElement('span', null, "Cargar Archivo")
                    ),
                    React.createElement('input', { type: "file", id: "import-file", accept: ".json", className: "hidden", onChange: handleFileChange })
                )
            ),

            /* Notifications */
            React.createElement('div', { className: "flex items-center justify-between p-3 bg-gray-800 rounded-xl" },
                React.createElement('div', null,
                    React.createElement('p', { className: "font-semibold text-sm" }, "Notificaciones"),
                    React.createElement('p', { className: "text-xs text-gray-400" }, "Avisos del cronómetro")
                ),
                React.createElement('button', 
                    {
                        onClick: requestNotificationPermission,
                        className: "bg-primary text-bkg font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-purple-400 transition-colors"
                    },
                    "Activar"
                )
            ),

            /* Google Drive Backup */
            React.createElement('div', { className: "space-y-2 border-t border-gray-700 pt-4" },
                React.createElement('div', { className: "flex justify-between items-center" },
                    React.createElement('h3', { className: "text-sm font-bold text-gray-500 uppercase tracking-wider" }, "Google Drive (Avanzado)"),
                    React.createElement('button', { onClick: () => setShowDriveConfig(!showDriveConfig), className: "text-xs text-blue-400 underline" },
                        showDriveConfig ? 'Ocultar' : 'Configurar'
                    )
                ),
                
                showDriveConfig && (
                    React.createElement('div', { className: "mb-3 p-3 bg-gray-900 rounded-lg text-xs text-gray-400 space-y-2" },
                        React.createElement('p', { className: "font-semibold text-gray-300" }, "¿Por qué es difícil?"),
                        React.createElement('p', null, "Google exige un ", React.createElement('span', { className: "text-white" }, "Client ID"), " único para permitir el acceso. Si quieres usar la nube, debes crear un proyecto en ", React.createElement('b', null, "Google Cloud Console"), "."),
                        
                        React.createElement('div', { className: "bg-black p-2 rounded border border-gray-700 mt-2" },
                            React.createElement('p', { className: "text-gray-500 mb-1" }, "Tu URL (Origen Autorizado):"),
                            React.createElement('code', { className: "block text-green-400 break-all select-all" }, currentOrigin),
                            React.createElement('p', { className: "text-[10px] text-gray-500 mt-1" }, "Copia esto en \"Authorized Javascript Origins\" en Google.")
                        ),

                        React.createElement('input', 
                            {
                                type: "text",
                                placeholder: "Pega aquí tu Client ID",
                                value: clientId,
                                onChange: (e) => setClientId(e.target.value),
                                className: "w-full bg-black border border-gray-700 rounded p-2 text-white mt-2"
                            }
                        )
                    )
                ),

                clientId ? (
                    React.createElement('div', { className: "grid grid-cols-2 gap-3 mt-2" },
                        React.createElement('button', 
                            {
                                onClick: handleDriveBackup,
                                disabled: isLoading,
                                className: `bg-blue-900/40 hover:bg-blue-900/60 text-blue-200 border border-blue-900 font-bold py-2 px-2 rounded-xl text-xs flex flex-col items-center justify-center gap-1 ${isLoading ? 'opacity-50' : ''}`
                            },
                            React.createElement('span', null, "☁️ Guardar en Nube")
                        ),
                        React.createElement('button', 
                            {
                                onClick: handleDriveRestore,
                                disabled: isLoading,
                                className: `bg-blue-900/40 hover:bg-blue-900/60 text-blue-200 border border-blue-900 font-bold py-2 px-2 rounded-xl text-xs flex flex-col items-center justify-center gap-1 ${isLoading ? 'opacity-50' : ''}`
                            },
                            React.createElement('span', null, "☁️ Restaurar de Nube")
                        )
                    )
                ) : (
                    showDriveConfig && React.createElement('p', { className: "text-xs text-red-400 text-center" }, "Falta el Client ID para usar Drive.")
                ),
                
                statusMsg && React.createElement('p', { className: "text-xs text-center text-primary mt-2 animate-pulse" }, statusMsg)
            )
        ),

        React.createElement('div', { className: "mt-6 flex justify-end" },
            React.createElement('button', 
                {
                    onClick: onClose,
                    className: "text-gray-400 hover:text-white font-bold py-2 px-4 rounded-lg"
                },
                "Cerrar"
            )
        )
      )
    )
  );
};

export default SettingsModal;
