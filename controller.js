import { GoogleDriveClient } from "./servidor.js";

const credentialsPath = 'google_drive.json';
const driveClient = new GoogleDriveClient(credentialsPath);

const id = '1tj58NJSDDjqP8u4YR1cN0AV0MFRz7t-Z';
function uploadFile(file, id) {
  driveClient.uploadFile(file, id);
}