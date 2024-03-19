import express from 'express';
import fs from 'fs';
import multer from 'multer';
import { google } from 'googleapis';
import { fileURLToPath } from 'url';


const app = express();
const PORT = 8080;

const upload = multer({ dest: 'uploads/' }); // Directorio donde se guardarán los archivos temporales
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
            const fileName = filePath.split('/').pop(); // Obtener el nombre del archivo a partir de la ruta
            const fileMetadata = {
                name: fileName, // Usar el nombre original del archivo
                parents: [folderId], // ID de la carpeta a la que quieres subir el archivo
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
    
}
const credentialsPath = 'google_drive.json';
const driveClient = new GoogleDriveClient(credentialsPath);


import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Luego, puedes usar __dirname en tu ruta:
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});
app.get('/listar-archivos-en-carpeta', async (req, res) => {
    try {
        const folderId = "1tj58NJSDDjqP8u4YR1cN0AV0MFRz7t-Z";
        let filesInFolder = await driveClient.listFilesInFolder(folderId);
        res.json(filesInFolder);
    } catch (error) {
        console.error('Error al obtener la lista de archivos en la carpeta:', error);
        res.status(500).send('Error al obtener la lista de archivos en la carpeta');
    }
});
app.post('/ruta', upload.any(), async (req, res) => {
    try {
        if (!req.files || !req.files.length) {
            res.status(400).send('No se encontró ningún archivo adjunto');
            return;
        }

        const file = req.files[0]; // Obtener el primer archivo, si hay varios
        const filePath = file.path;

        // Subir el archivo a Google Drive
        try {
            await driveClient.upload('application/epub+zip', filePath);
            res.status(200).send('Archivo subido correctamente a Google Drive');
        } catch (error) {
            console.error('Error al subir el archivo a Google Drive:', error);
            res.status(500).send('Error al subir el archivo a Google Drive');
        }
    } catch (error) {
        console.error('Error al procesar el formulario:', error);
        res.status(500).send('Error interno del servidor');
    }
});// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
