import { GoogleDriveClient } from "./servidor.js";

const credentialsPath = 'google_drive.json';
const driveClient = new GoogleDriveClient(credentialsPath);

function uploadFile(file) {
  driveClient.uploadFile(file);
}