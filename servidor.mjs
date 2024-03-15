import { createServer } from 'http';
import { parse } from 'url';
import { existsSync, readFile } from 'fs';
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
    async uploadFile(mimeType) {
        try {
            const folderId = '1tj58NJSDDjqP8u4YR1cN0AV0MFRz7t-Z';
            const filePath = 'Nombre';
            const fileMetadata = {
                name: filePath.split('/').pop(), // Nom de l'arxiu a partir de la ruta del fitxer
                parents: [folderId], // Id de la carpeta a la qual vols pujar l'arxiu
            };
            const media = {
                mimeType: mimeType,
                body: fs.createReadStream(filePath), // Crea un flux de lectura de l'arxiu local
            };
            const response = await this.driveClient.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id',
            });
            console.log('File uploaded:', response.data.id);
        } catch (error) {
            console.error('Error uploading file:', error);
        }}
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
