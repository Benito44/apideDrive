import express from 'express';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { GoogleDriveClient } from './drive.js';
import AdmZip from 'adm-zip';



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

app.use('/books', express.static(path.join(__dirname, 'books')));

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

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        console.log('No se envió ningún archivo');
        res.status(400).send('No se envió ningún archivo');
    } else {
        const filePath = req.file.path;
        const originalName = path.basename(req.file.originalname, '.epub');
        const targetPath = path.join('books', originalName);

        if (!fs.existsSync(targetPath)) {
            let zip = new AdmZip(filePath);
            zip.extractAllTo(targetPath, true);
        }

        const textDirPath = path.join(targetPath, 'OEBPS', 'Text'); // Ajustado para incluir 'OEBPS'
        if (!fs.existsSync(textDirPath)) {
            console.log('No se encontró el directorio Text/');
            res.status(400).send('No se encontró el directorio Text/');
        } else {
            const textFiles = fs.readdirSync(textDirPath);
            const textLinks = textFiles.map(file => `http://localhost:8080/books/${originalName}/OEBPS/Text/${file}`); // Ajustado para incluir 'OEBPS'

            res.send(textLinks);
        }
    }
});

app.get('/books/:bookId', (req, res) => {
    const bookId = req.params.bookId;
    const bookPath = path.resolve('books', bookId);

    if (fs.existsSync(bookPath)) {
        console.log("libro encontrado")
        res.send(bookPath);
    } else {
        res.status(404).send('Libro no encontrado');
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
