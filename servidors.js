
import express from 'express';
import { google } from 'googleapis';
import fs from 'fs';
const app = express();
const PORT = 8080;

// Configurar middleware para manejar solicitudes POST multipart/form-data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public')); // Si tienes archivos estáticos como HTML, CSS o JS

class GoogleDriveClient {
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
            const fileMetadata = {
                name: filePath.split('/').pop(), // Nombre del archivo a partir de la ruta del archivo
                parents: ['1tj58NJSDDjqP8u4YR1cN0AV0MFRz7t-Z'], // ID de la carpeta a la que quieres subir el archivo
            };
            const media = {
                mimeType: mimeType,
                body: fs.createReadStream(filePath), // Crea un flujo de lectura del archivo local
            };
            const response = await this.driveClient.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id',
            });
            console.log('Archivo subido:', response.data.id);
            return response.data.id; // Retorna el ID del archivo creado en Google Drive
        } catch (error) {
            console.error('Error al subir el archivo:', error);
            throw error; // Lanza el error para manejarlo en el contexto donde se llame a esta función
        }
    }
}
const credentialsPath = 'google_drive.json';
const driveClient = new GoogleDriveClient(credentialsPath);

// Ruta para manejar el formulario de carga de archivos
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});
app.post('/ruta', async (req, res) => {
    try {
        if (!req.files || !req.files.epub) {
            res.status(400).send('No se encontró ningún archivo adjunto');
            return;
        }

        const file = req.files.epub;
        const filePath = './' + file.name;

        // Guardar el archivo en el servidor
        file.mv(filePath, async (err) => {
            if (err) {
                console.error('Error al guardar el archivo:', err);
                res.status(500).send('Error al guardar el archivo');
                return;
            }

            // Subir el archivo a Google Drive
            try {
                await driveClient.upload('application/epub+zip', filePath);
                res.status(200).send('Archivo subido correctamente a Google Drive');
            } catch (error) {
                console.error('Error al subir el archivo a Google Drive:', error);
                res.status(500).send('Error al subir el archivo a Google Drive');
            }
        });
    } catch (error) {
        console.error('Error al procesar el formulario:', error);
        res.status(500).send('Error interno del servidor');
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
