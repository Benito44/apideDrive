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

const upload = multer({ dest: 'uploads/' }); 

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public')); 
app.use(express.static('css')); // Agregar middleware para servir archivos CSS
app.use(express.static('js')); // Agregar middleware para servir archivos JS

const credentialsPath = 'google_drive.json';
const driveClient = new GoogleDriveClient(credentialsPath);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let libros = [];

app.use('/books', express.static(path.join(__dirname, 'books')));
app.use('/js', (req, res, next) => {
    res.set('Content-Type', 'text/javascript');
    next();
  }, express.static(path.join(__dirname, 'js')));
  
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.delete('/eliminar-archivo', async (req, res) => {
    const fileId = req.query.id; 

    try {
        console.log(fileId);
        await driveClient.deleteFile(fileId);
        res.status(200).send('Archivo eliminado correctamente del drive');
    } catch (error) {
        console.error('Error al eliminar el archivo del drive:', error);
        res.status(500).send('Error al eliminar el archivo del drive');
    }
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

        const textDirPath = path.join(targetPath, 'OEBPS', 'Text');
        if (!fs.existsSync(textDirPath)) {
            console.log('No se encontró el directorio Text/');
            res.status(400).send('No se encontró el directorio Text/');
        } else {
            const textFiles = fs.readdirSync(textDirPath);
            const textLinks = textFiles.map(file => `http://localhost:8080/books/${originalName}/OEBPS/Text/${file}`);

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
            return res.status(400).send('No se encontró ningún archivo adjunto');
        }

        const file = req.files[0];
        const fileName = file.originalname;

        try {
            await driveClient.upload('application/epub+zip', fileName);
            return res.status(200).send('Archivo subido correctamente a Google Drive');
        } catch (error) {
            console.error('Error al subir el archivo a Google Drive:', error);
            return res.status(500).send('Error al subir el archivo a Google Drive');
        }
    } catch (error) {
        console.error('Error al procesar el formulario:', error);
        return res.status(500).send('Error interno del servidor');
    }
});


app.get('/listar-libros-disponibles', (req, res) => {
    const books = [];

    driveClient.files.list({
        pageSize: 10,
        fields: 'nextPageToken, files(id, name)',
    }, (err, response) => {
        if (err) return console.log('The API returned an error: ' + err);
        let filesTemp = response.data.files;
        if (filesTemp.length) {
            filesTemp.map((file) => {
                let name = path.basename(file.name, '.epub');
                let fileTemp = {id: file.id, name: name};
                books.push(fileTemp);
            });
            return res.send(books);
        } else {
            console.log('No files found.');
        }
    });
});

app.get('/obtener-libro', (req, res) => {
    const fileName = req.query.fileName;
    const filePath = `${__dirname}/books/${fileName}/OEBPS/Text/cubierta.xhtml`;

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error al leer el archivo:', err);
            return res.status(500).send('Error al leer el archivo del libro');
        }

        return res.send(data);
    });
});

app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
