
// Helper to interact with Google Drive API
// Note: This requires a Google Cloud Project with Drive API enabled and a Client ID.

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const BACKUP_FILE_NAME = 'chronohabit_backup.json';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

export const initGoogleDrive = (clientId: string) => {
    return new Promise<void>((resolve, reject) => {
        const gapiScript = document.createElement('script');
        gapiScript.src = 'https://apis.google.com/js/api.js';
        gapiScript.onload = () => {
             // @ts-ignore
             gapi.load('client', async () => {
                try {
                    // We don't strictly need apiKey for OAuth flows if we use the token correctly
                     // @ts-ignore
                    await gapi.client.init({
                        discoveryDocs: [DISCOVERY_DOC],
                    });
                    gapiInited = true;
                    checkInit(resolve);
                } catch (err) {
                    reject(err);
                }
             });
        };
        document.body.appendChild(gapiScript);

        const gisScript = document.createElement('script');
        gisScript.src = 'https://accounts.google.com/gsi/client';
        gisScript.onload = () => {
             // @ts-ignore
             tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: SCOPES,
                callback: '', // defined later
            });
            gisInited = true;
            checkInit(resolve);
        };
        document.body.appendChild(gisScript);
    });
};

function checkInit(resolve: () => void) {
    if (gapiInited && gisInited) {
        resolve();
    }
}

export const setGapiToken = (tokenResponse: any) => {
    // @ts-ignore
    if (typeof gapi !== 'undefined' && gapi.client) {
        // @ts-ignore
        gapi.client.setToken(tokenResponse);
    }
}

export const signInToGoogle = () => {
    return new Promise<any>((resolve, reject) => {
        if (!tokenClient) {
            reject("Google Client not initialized");
            return;
        }
        
        tokenClient.callback = async (resp: any) => {
            if (resp.error) {
                reject(resp);
            }
            // Important: Set the token for gapi calls
            setGapiToken(resp);
            resolve(resp);
        };

        // Trigger the popup
        tokenClient.requestAccessToken({ prompt: 'consent' });
    });
};

export const findBackupFile = async () => {
    try {
        // @ts-ignore
        const response = await gapi.client.drive.files.list({
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

export const uploadBackupFile = async (data: string, fileId?: string) => {
    const fileContent = data;
    const file = new Blob([fileContent], { type: 'application/json' });
    const metadata = {
        name: BACKUP_FILE_NAME,
        mimeType: 'application/json',
    };

    // @ts-ignore
    const tokenObj = gapi.client.getToken();
    if (!tokenObj) throw new Error("No Google Token found");
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
    
    return await response.json();
};

export const downloadBackupFile = async (fileId: string) => {
    try {
        // @ts-ignore
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });
        return response.result; // This is the JSON object
    } catch (err) {
        console.error("Error downloading file", err);
        throw err;
    }
};
