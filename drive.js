import fs from 'fs';
import { google } from 'googleapis';
import path from 'path'; // Import the path module
export class GoogleDriveClient {
    constructor(credentialsPath) {
        const { clientId, clientSecret, redirectUri, refreshToken } = this.loadCredentials(credentialsPath);
        this.driveClient = this.createDriveClient(clientId, clientSecret, redirectUri, refreshToken);
    }

    createDriveClient(clientId, clientSecret, redirectUri, refreshToken) {
        const oAuth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            redirectUri
        );
        oAuth2Client.setCredentials({ refresh_token: refreshToken });
        return google.drive({ version: 'v3', auth: oAuth2Client });
    }
    loadCredentials(credentialsPath) {
        try {
            const credentials = JSON.parse(fs.readFileSync(credentialsPath));
            const { clientId, clientSecret, redirectUri, refreshToken } = credentials;
            return { clientId, clientSecret, redirectUri, refreshToken };
        } catch (error) {
            console.error('Error loading credentials:', error);
            process.exit(1);
        }
    }

    async listFiles() {
        try {
            const response = await this.driveClient.files.list({
                pageSize: 10,
                fields: 'nextPageToken, files(id, name)',
            });
            const files = response.data.files;
            if (files.length) {
                console.log('Files:');
                files.forEach((file) => {
                    console.log(`${file.name} (${file.id})`);
                });
            } else {
                console.log('No files found.');
            }
        } catch (error) {
            console.error('Error listing files:', error);
        }
    }
    async createFolder(folderName) {
        try {
            const parentId = '1tj58NJSDDjqP8u4YR1cN0AV0MFRz7t-Z';
            const response = await this.driveClient.files.create({
                resource: {
                    name: folderName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [parentId]
                },
                fields: 'id, name'
            });
            console.log('Folder created:', response.data.name, '(' + response.data.id + ')');
        } catch (error) {
            console.error('Error creating folder:', error);
        }
    }
    async upload(mimeType, filePath) {
        try {
            const folderId = '1tj58NJSDDjqP8u4YR1cN0AV0MFRz7t-Z';
            const fileName = path.basename(filePath); // Extract filename from file path
            const fileMetadata = {
                name: fileName, // Use the extracted filename
                parents: [folderId],
            };
            const media = {
                mimeType: mimeType,
                body: fs.createReadStream(filePath),
            };
            const response = await this.driveClient.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id',
            });
            console.log('File uploaded:', response.data.id);
            return response.data.id;
        } catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
    }
    async listFilesInFolder(folderId) {
        try {
            const response = await this.driveClient.files.list({
                q: `mimeType='application/epub+zip' and parents in '${folderId}' and trashed=false`,                
                fields: 'files(id, name)',
            });
            const files = response.data.files;
            if (files.length) {
                console.log('Files in folder:');
                files.forEach((file) => {
                    console.log(`${file.name} (${file.id})`);
                });
            } else {
                console.log('No files found in folder.');
            }
            return files;
        } catch (error) {
            console.error('Error listing files in folder:', error);
            throw error;
        }
    }
    async deleteFile(fileId) {
        try {
            // Eliminar el archivo utilizando la API de Google Drive
            await this.driveClient.files.delete({
                fileId: fileId
            });
    
            console.log(`El archivo con ID "${fileId}" se eliminó correctamente.`);
        } catch (error) {
            console.error('Error al eliminar el archivo:', error);
        }
    }
    
}