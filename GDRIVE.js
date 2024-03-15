const { google } = require('googleapis');
const fs = require('fs');

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

module.exports = GDrive;
