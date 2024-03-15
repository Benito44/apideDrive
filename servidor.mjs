//const fs = require('fs');
//const { google } = require('googleapis');

import fs from 'fs';
import { google } from 'googleapis';
import { createServer } from 'http';
import { parse } from 'url';
import { existsSync } from 'fs';

async function onRequest(peticio, resposta) {

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
            if (existsSync(filename)) {

              if (filename.endsWith(".svg")) {
                readFile(filename, function (err, dades) {
                    svgData = dades;
                    enviarArxiu(resposta, dades, filename, 'image/svg+xml', err);
                });
            } else {
                readFile(filename, function (err, dades) {
                    enviarArxiu(resposta, dades, filename, undefined, err);
                });
            }
            
            }
            else {
                header(resposta, 404, 'text/html');
                resposta.end("<p style='text-align:center;font-size:1.2rem;font-weight:bold;color:red'>404 Not Found</p>");
            }
        }
    });

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
    } else if (peticio.method === 'GET') {
        
        try {
            const q = parse(peticio.url, true);
            let filename = '.' + q.pathname;

            if (filename === './') {
                filename += 'index.html';
            }

            if (existsSync(filename)) {
                readFile(filename, function(err, data) {
                    if (err) {
                        console.error('Error al leer el archivo:', err);
                        header(resposta, 500, 'text/plain');
                        resposta.end('Error al leer el archivo.');
                    } else {
                        header(resposta, 200, 'text/html');
                        resposta.write(data);
                        resposta.end();
                    }
                });
            } else {
                console.error('Error: El archivo solicitado no existe:', filename);
                header(resposta, 404, 'text/plain');
                resposta.end('Error: El archivo solicitado no existe.');
            }
        } catch (error) {
            console.error('Error al manejar la solicitud GET:', error);
            header(resposta, 500, 'text/plain');
            resposta.end('Error al manejar la solicitud GET.');
        }
    }
}

const server = createServer(onRequest);

server.listen(8080);
console.log('Servidor escoltant a http://localhost:8080');