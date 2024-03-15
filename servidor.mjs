//const fs = require('fs');
//const { google } = require('googleapis');

import fs from 'fs';
import { google } from 'googleapis';
import { createServer } from 'http';
import { parse } from 'url';
import { existsSync } from 'fs';

class GoogleDriveClient {
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
    async upload(fileStream) {
        try {
            const parentId = '1tj58NJSDDjqP8u4YR1cN0AV0MFRz7t-Z';
            const response = await this.driveClient.files.create({
                resource: {
                    name: 'fileName',
                    mimeType: 'fileMimeType',
                    parents: [parentId]
                },
                media: {
                    mimeType: fileMimeType,
                    body: fileStream
                },
                fields: 'id, name'
            });
            console.log('Folder created:', response.data.name, '(' + response.data.id + ')');
        } catch (error) {
            console.error('Error creating folder:', error);
        }
    }
}
function header(resposta, codi, cType) {
    resposta.setHeader('Access-Control-Allow-Origin', '*');
    // Permetre peticions GET i POST
    resposta.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    if (cType) resposta.writeHead(codi, {'Content-Type': cType + '; charset=utf-8'});
    else resposta.writeHead(codi);
}

async function onRequest(peticio, resposta) {
    if (peticio.method === 'POST') {
        try {
            const credentialsPath = 'google_drive.json'; // Ruta del fitxer de credencials
            const driveClient = new GoogleDriveClient(credentialsPath);

            // Verificar si s'ha enviat un arxiu
            if (!peticio.files || Object.keys(peticio.files).length === 0) {
                header(resposta, 400, 'text/plain');
                resposta.end('No s\'ha trobat cap fitxer.');
                return;
            }

            const file = peticio.files.epub; // Nom del camp del formulari on s'ha enviat l'arxiu
            const filePath = file.path;
            const fileStream = fs.createReadStream(filePath);

            // Pujar l'arxiu al Google Drive
            await driveClient.upload(fileStream);

            // Resposta al client
            header(resposta, 200, 'text/plain');
            resposta.end('Fitxer pujat correctament al Google Drive.');
        } catch (error) {
            console.error('Error al pujar l\'arxiu:', error);
            header(resposta, 500, 'text/plain');
            resposta.end('Error al pujar l\'arxiu al Google Drive.');
        }
    } else {
        // Resta del codi d'handleRequest aquí...
    }
}

const server = createServer(onRequest);

server.listen(8080);
console.log('Servidor escoltant a http://localhost:8080');