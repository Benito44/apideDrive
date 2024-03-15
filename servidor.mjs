import { createServer } from 'http';
import { parse } from 'url';
import { existsSync, readFile } from 'fs';
import { GoogleDriveClient } from './GoogleDriveClient'; // Ajusta la ruta según la ubicación de tu archivo GoogleDriveClient.js
class GDrive {
    constructor(credentials) {
      const { client_secret, client_id, redirect_uris, access_token } = credentials.installed;
      console.log(client_secret);
      console.log(client_id);
      console.log(redirect_uris);
      console.log(access_token);
      this.oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
      this.token = access_token; // Inicializa this.token con el token de acceso del JSON
      this.drive = google.drive({ version: 'v3', auth: this.oAuth2Client });
  }
  
  async authenticate() {
    return new Promise((resolve, reject) => {
        fs.readFile('google_drive.json', (err, data) => {
            if (err) {
                reject('Error llegint el fitxer de token:', err);
                return;
            }
            const token = JSON.parse(data).installed;
            console.log('Token:', token);
            this.oAuth2Client = new google.auth.OAuth2(token.client_id, token.client_secret, token.redirect_uris[0]);
            console.log('OAuth2Client:', this.oAuth2Client);
            this.oAuth2Client.setCredentials({ access_token: token.access_token });
            console.log('Credentials set:', this.oAuth2Client.credentials);
            resolve('Autenticació completada amb èxit.');
        });
    });
  }
  
  
    async listFolders() {
      const res = await this.drive.files.list({
  
        q: `mimeType='image/jpeg' and parents in '${'1tj58NJSDDjqP8u4YR1cN0AV0MFRz7t-Z'}' and trashed=false`,     
         fields: 'files(id, name)',
      });
      return res.data.files;
    }
  
    async listFilesInFolder(folderId) {
      const res = await this.drive.files.list({
        q: `'${folderId}' in parents`,
        fields: 'files(id, name)',
      });
      return res.data.files;
    }
  
    async createFolder(name) {
      const fileMetadata = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
      };
      const res = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id',
      });
      return res.data.id;
    }
  
    async uploadFile(filename, mimeType, folderId = null) {
      const fileMetadata = {
        name: filename,
        parents: folderId ? [folderId] : [],
      };
      const media = {
        mimeType,
        body: fs.createReadStream(filename),
      };
      const res = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id',
      });
      return res.data.id;
    }
  
    async deleteFile(fileId) {
      await this.drive.files.delete({ fileId });
    }
  
    async deleteFolder(folderId) {
      await this.drive.files.delete({ fileId: folderId });
    }
  }

const FILE_TYPES = {
	html:"text/html",
	css:"text/css",
	js:"text/javascript",
	mjs:"text/javascript",
	svg:"image/svg+xml",
	png:"image/png",
	gif:"image/gif",
	ico:"image/ico",
	jpg:"image/jpeg",
	jpeg:"image/jpeg",
};

function tipusArxiu(filename) {
	let ndx = filename.lastIndexOf('.');
	if (ndx < 0) return undefined;
	
	let ext = filename.substring(filename.lastIndexOf('.') + 1);
	if (ext.length == 0) return undefined;
	
	return FILE_TYPES[ext];
}



function header(resposta, codi, cType) {
	resposta.setHeader('Access-Control-Allow-Origin', '*');
	// Permetre peticions GET i POST
	resposta.setHeader('Access-Control-Allow-Methods', 'GET, POST');
	if (cType) resposta.writeHead(codi, {'Content-Type': cType + '; charset=utf-8'});
	else resposta.writeHead(codi);
}

function missatgeError(resposta, cError, missatge) {
	header(resposta, cError, 'text/html');
	resposta.end("<p style='text-align:center;font-size:1.2rem;font-weight:bold;color:red'>" + missatge + "</p>");
	console.log("\t" + cError + " " + missatge);
}

function missatgeResposta(resposta, dades, cType) {
	header(resposta, 200, cType);
	resposta.end(dades);
}

// Llegir els paràmetre passats de la petició
function mostrarParametres(parametres, metode) {
	let np = 0;
	
	// Mostrar mètode (GET o POST)
	console.log(metode);	

	// Mostrar per consola els paràmetres rebuts
	switch (typeof parametres) {
		case 'number':
		case 'string':
			np = 1;
			console.log("\t" + parametres);
			break;
		default:
			if (typeof parametres[Symbol.iterator] === 'function') {
				// Paràmetres obtinguts amb GET (iterador)
				for (let key of parametres.keys()) {
					console.log("\t" + key + ": " + parametres.get(key));
					++np;
				}
			} else {
				// Paràmetres obtinguts amb POST (JSON)
				for (let key in parametres) {
					console.log("\t" + key + ": " + parametres[key]);
					++np;
				}
			}
	}
	if (np == 0) console.log("\t" + "No s'ha rebut cap paràmetre");
}

function onRequest(peticio, resposta) {
	let cosPeticio = "";

	peticio.on('error', function(err) {
		console.error(err);
	}).on('data', function(dades) {
		cosPeticio += dades;
	}).on('end', async function() {
		resposta.on('error', function(err) {
			console.error(err);
		});

		if (peticio.method == 'GET') {
			const base = 'http://' + peticio.headers.host + '/';
			const url = new URL(peticio.url, base);

			let filename = "." + url.pathname;
			if (filename == "./") filename += "index.html";

			if (existsSync(filename)) {
				console.log("------\nEnviant " + filename);

				readFile(filename, function(err, dades) {
					let cType = tipusArxiu(filename);

					if (err) missatgeError(resposta, 400, "Error al llegir l'arxiu " + filename);
					else if (!cType) missatgeError(resposta, 400, "Extensió d'arxiu desconeguda: " + filename);
					else missatgeResposta(resposta, dades, cType);
				});
			}
			else missatgeError(resposta, 404, "Not Found (" + filename + ")");

			// Mostrar per consola els paràmetres passats en la URL (GET)
			mostrarParametres(url.searchParams, "GET");
		} else {	// Mètode POST
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
		}
	});
}

const server = createServer();
server.on('request', onRequest);

server.listen(8080);	
console.log("Servidor escoltant en http://localhost:8080");
