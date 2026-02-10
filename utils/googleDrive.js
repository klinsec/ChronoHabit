
// Helper to interact with Google Drive API
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const BACKUP_FILE_NAME = 'chronohabit_backup.json';

let tokenClient = null;
let gapiInited = false;
let gisInited = false;

// Wait for the scripts loaded in index.html to be available in the window object
const waitForGoogleScripts = () => {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const interval = setInterval(() => {
            if (typeof window.gapi !== 'undefined' && typeof window.google !== 'undefined') {
                clearInterval(interval);
                resolve();
            }
            attempts++;
            if (attempts > 100) { // 10 seconds timeout
                clearInterval(interval);
                reject(new Error("Los servicios de Google no han cargado. Revisa tu conexión."));
            }
        }, 100);
    });
};

export const initGoogleDrive = async (clientId) => {
    try {
        await waitForGoogleScripts();

        // 1. Init GAPI (for API calls)
        if (!gapiInited) {
            await new Promise((resolve, reject) => {
                window.gapi.load('client', {
                    callback: resolve,
                    onerror: reject,
                    timeout: 5000,
                    ontimeout: reject
                });
            });

            await window.gapi.client.init({
                discoveryDocs: [DISCOVERY_DOC],
            });
            gapiInited = true;
        }

        // 2. Init GIS (for Auth Popup)
        if (!gisInited && window.google && window.google.accounts && window.google.accounts.oauth2) {
             tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: SCOPES,
                callback: '' // Defined dynamically in signInToGoogle
            });
            gisInited = true;
        }

        return true;
    } catch (err) {
        console.error("GAPI Init Error:", err);
        throw err;
    }
};

export const signInToGoogle = () => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            reject(new Error("Google Client no inicializado."));
            return;
        }

        // Override the callback to capture the token response
        tokenClient.callback = (resp) => {
            if (resp.error) {
                console.warn("Auth error or closed:", resp);
                reject(resp);
                return;
            }
            // Important: Set the token for gapi calls safely
            if (window.gapi && window.gapi.client) {
                window.gapi.client.setToken(resp);
                resolve(resp);
            } else {
                reject(new Error("GAPI Client lost during sign in."));
            }
        };

        // Trigger the popup
        // Use 'consent' to force token refresh and ensure user actually sees it working
        tokenClient.requestAccessToken({ prompt: 'consent' });
    });
};

export const findBackupFile = async () => {
    try {
        if (!window.gapi || !window.gapi.client || !window.gapi.client.drive) {
             throw new Error("Drive API not loaded");
        }
        const response = await window.gapi.client.drive.files.list({
            q: `name = '${BACKUP_FILE_NAME}' and trashed = false`,
            fields: 'files(id, name, modifiedTime)',
            spaces: 'drive'
        });
        const files = response.result.files;
        if (files && files.length > 0) {
            return files[0];
        }
        return null;
    } catch (err) {
        console.error("Error finding backup file", err);
        throw err;
    }
};

export const uploadBackupFile = async (data, fileId) => {
    const fileContent = data;
    const file = new Blob([fileContent], { type: 'application/json' });
    const metadata = {
        name: BACKUP_FILE_NAME,
        mimeType: 'application/json',
    };

    const tokenObj = window.gapi.client.getToken();
    if (!tokenObj) throw new Error("No Google Token found. Please sign in.");
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
    
    if (!response.ok) throw new Error("Upload failed: " + response.statusText);
    
    return await response.json();
};

export const downloadBackupFile = async (fileId) => {
    try {
        const response = await window.gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });
        
        const result = response.result;
        if (typeof result === 'string') {
            return JSON.parse(result);
        }
        return result; 
    } catch (err) {
        console.error("Error downloading file", err);
        throw err;
    }
};
