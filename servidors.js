import express from 'express';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { GoogleDriveClient } from './drive.js';

const app = express();
const PORT = 8080;

const upload = multer({ dest: 'uploads/' }); // Directorio donde se guardarán los archivos temporales
// Configurar middleware para manejar solicitudes POST multipart/form-data

app.use(express.urlencoded({ extended: true }));

app.use(express.json());

app.use(express.static('public')); // Si tienes archivos estáticos como HTML, CSS o JS

const credentialsPath = 'google_drive.json';
const driveClient = new GoogleDriveClient(credentialsPath);


import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// Array con los libros y el capítulo que se encuentra leyendo el usuario

let libros = [];

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
app.get('/libroId', async (req, res) => {
    try {
        const libroId = req.params.libroId;
        let libro = await driveClient.getFile(libroId);
        res.json(libro);
    } catch (error) {
        console.error('Error al obtener el libro:', error);
        res.status(500).send('Error al obtener el libro');
    }
});

app.post('/ruta', upload.any(), async (req, res) => {
    try {
        if (!req.files || !req.files.length) {
            res.status(400).send('No se encontró ningún archivo adjunto');
            return;
        }

        const file = req.files[0];
        const filePath = file.originalname;
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
