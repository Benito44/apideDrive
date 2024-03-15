import fs from 'fs';
import { google } from 'googleapis';
import { createServer } from 'http';
import { parse } from 'url';
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
function header(resposta, codi, cType) {
	resposta.setHeader('Access-Control-Allow-Origin', '*');
	// Permetre peticions GET i POST
	resposta.setHeader('Access-Control-Allow-Methods', 'GET, POST');
	if (cType) resposta.writeHead(codi, {'Content-Type': cType + '; charset=utf-8'});
	else resposta.writeHead(codi);
}

function enviarArxiu(resposta, dades, filename, cType, err) {
    if (err) {
        header(resposta, 400, 'text/html');
        resposta.end("<p style='text-align:center;font-size:1.2rem;font-weight:bold;color:red'>Error al l legir l'arxiu</p>");
        return;
    }

    header(resposta, 200, cType);
    resposta.write(dades);
    resposta.end();
}

function onRequest(peticio, resposta) {
    let cosPeticio = "";

    peticio.on('error', function (err) {
        console.error(err);
    }).on('data', function (dades) {
        cosPeticio += dades;
    }).on('end', function () {
        resposta.on('error', function (err) {
            console.error(err);
        });

        if (peticio.method == 'GET') {
            let q = parse(peticio.url, true);
            let filename = "." + q.pathname;

            if (filename == "./") filename += "index.html";
        }
    });
}

let server = createServer();
server.on('request', onRequest);

server.listen(8080);
console.log("Servidor escoltant en http://localhost:8080");
// Example usage:
// const credentialsPath = 'google_drive.json';
// const driveClient = new GoogleDriveClient(credentialsPath);
// driveClient.listFiles();
// driveClient.createFolder('MyNewFolder');