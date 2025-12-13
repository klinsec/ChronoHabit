
// Helper to interact with Google Drive API
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const BACKUP_FILE_NAME = 'chronohabit_backup.json';

let tokenClient;
let gapiInited = false;
let gisInited = false;

export const initGoogleDrive = (clientId) => {
    return new Promise((resolve, reject) => {
        // Scripts are usually loaded in index.html, we wait for objects
        if(typeof gapi !== 'undefined') {
             gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        discoveryDocs: [DISCOVERY_DOC],
                    });
                    gapiInited = true;
                    checkInit(resolve, clientId);
                } catch (err) {
                    reject(err);
                }
             });
        }
    });
};

function checkInit(resolve, clientId) {
     if(typeof google !== 'undefined') {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPES,
            callback: '', 
        });
        gisInited = true;
     }

    if (gapiInited && gisInited) {
        resolve();
    }
}

export const setGapiToken = (tokenResponse) => {
    if (typeof gapi !== 'undefined' && gapi.client) {
        gapi.client.setToken(tokenResponse);
    }
}

export const signInToGoogle = () => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
             // Retry init
             reject("Google Client not fully initialized. Check Client ID.");
             return;
        }
        
        tokenClient.callback = async (resp) => {
            if (resp.error) {
                reject(resp);
            }
            setGapiToken(resp);
            resolve(resp);
        };

        // Trigger the popup
        tokenClient.requestAccessToken({ prompt: 'consent' });
    });
};

export const findBackupFile = async () => {
    try {
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

export const uploadBackupFile = async (data, fileId) => {
    const fileContent = data;
    const file = new Blob([fileContent], { type: 'application/json' });
    const metadata = {
        name: BACKUP_FILE_NAME,
        mimeType: 'application/json',
    };

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

export const downloadBackupFile = async (fileId) => {
    try {
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });
        return response.result;
    } catch (err) {
        console.error("Error downloading file", err);
        throw err;
    }
};
