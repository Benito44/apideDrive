const fs = require('fs');
const { google } = require('googleapis');

export class GoogleDriveClient {
    constructor(credentialsPath) {
        const { clientId, clientSecret, redirectUri, refreshToken } = this.loadCredentials(credentialsPath);
        this.driveClient = this.createDriveClient(clientId, clientSecret, redirectUri, refreshToken);
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

    createDriveClient(clientId, clientSecret, redirectUri, refreshToken) {
        const client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            redirectUri
        );
        client.setCredentials({ refresh_token: refreshToken });
        return google.drive({ version: 'v3', auth: client });
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

    async uploadFile(filePath, folderId) {
        try {
            const fileMetadata = {
                name: filePath.split('/').pop(),
                parents: [folderId]
            };
            const media = {
                mimeType: 'application/epub+zip',
                body: fs.createReadStream(filePath)
            };
            const response = await this.driveClient.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id, name'
            });
            console.log('File uploaded:', response.data.name, '(' + response.data.id + ')');
        } catch (error) {
            console.error('Error uploading file:', error);
        }
    }
}

// Example usage:
// const credentialsPath = 'google_drive.json';
// const driveClient = new GoogleDriveClient(credentialsPath);
// driveClient.listFiles();
// driveClient.createFolder('MyNewFolder');