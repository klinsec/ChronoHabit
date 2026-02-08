
// Helper to interact with Google Drive API
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const BACKUP_FILE_NAME = 'chronohabit_backup.json';

let tokenClient = null;
let gapiInited = false;
let gisInited = false;

/**
 * Robustly waits for a global variable to be defined
 */
const waitForGlobal = (name, timeout = 15000) => {
    return new Promise((resolve, reject) => {
        if (window[name]) return resolve(window[name]);
        const start = Date.now();
        const interval = setInterval(() => {
            if (window[name]) {
                clearInterval(interval);
                resolve(window[name]);
            } else if (Date.now() - start > timeout) {
                clearInterval(interval);
                reject(new Error(`La librería ${name} de Google tarda demasiado en cargar.`));
            }
        }, 100);
    });
};

export const initGoogleDrive = async (clientId) => {
    try {
        // 1. Wait for scripts to be present in window
        await waitForGlobal('gapi');
        await waitForGlobal('google');

        // 2. Initialize GAPI Client
        await new Promise((resolve, reject) => {
            window.gapi.load('client', {
                callback: async () => {
                    try {
                        await window.gapi.client.init({
                            discoveryDocs: [DISCOVERY_DOC],
                        });
                        gapiInited = true;
                        resolve();
                    } catch (err) {
                        console.warn("GAPI Init fail, retrying...", err);
                        // Retry once after 2 seconds
                        setTimeout(async () => {
                            try {
                                await window.gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });
                                gapiInited = true;
                                resolve();
                            } catch (e) { reject(e); }
                        }, 2000);
                    }
                },
                onerror: () => reject(new Error("Error al cargar el cliente de Google (GAPI)")),
                timeout: 10000
            });
        });

        // 3. Initialize GIS Token Client
        if (window.google && window.google.accounts && window.google.accounts.oauth2) {
            tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: SCOPES,
                callback: '', // defined in signInToGoogle
            });
            gisInited = true;
        } else {
            throw new Error("El sistema de cuentas de Google (GIS) no está disponible.");
        }

        return true;
    } catch (err) {
        console.error("Google Drive Init Error:", err);
        throw err;
    }
};

export const setGapiToken = (tokenResponse) => {
    if (window.gapi && window.gapi.client) {
        window.gapi.client.setToken(tokenResponse);
    }
};

export const signInToGoogle = () => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            reject(new Error("El cliente de Google no está listo. Espera un momento y vuelve a intentarlo."));
            return;
        }
        
        tokenClient.callback = async (resp) => {
            if (resp.error) {
                console.error("Auth Error:", resp);
                reject(new Error("Error de autorización: " + resp.error));
                return;
            }
            setGapiToken(resp);
            resolve(resp);
        };

        try {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } catch (err) {
            reject(err);
        }
    });
};

export const findBackupFile = async () => {
    if (!gapiInited) return null;
    try {
        const response = await window.gapi.client.drive.files.list({
            q: `name = '${BACKUP_FILE_NAME}' and trashed = false`,
            fields: 'files(id, name, modifiedTime)',
            spaces: 'drive'
        });
        const files = response.result.files;
        return (files && files.length > 0) ? files[0] : null;
    } catch (err) {
        console.error("Error finding backup file", err);
        throw err;
    }
};

export const uploadBackupFile = async (data, fileId) => {
    if (!gapiInited) throw new Error("Google Drive no está inicializado.");
    const file = new Blob([data], { type: 'application/json' });
    const metadata = {
        name: BACKUP_FILE_NAME,
        mimeType: 'application/json',
    };

    const tokenObj = window.gapi.client.getToken();
    if (!tokenObj) throw new Error("Inicia sesión en Google primero.");
    const accessToken = tokenObj.access_token;
    
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    let method = 'POST';

    if (fileId) {
        url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
        method = 'PATCH';
    }

    const response = await fetch(url, {
        method: method,
        headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
        body: form
    });
    
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Fallo al subir: ${response.status}`);
    }

    return await response.json();
};

export const downloadBackupFile = async (fileId) => {
    if (!gapiInited) throw new Error("Google Drive no está inicializado.");
    try {
        const response = await window.gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });
        return response.result;
    } catch (err) {
        console.error("Error downloading file", err);
        throw err;
    }
};
