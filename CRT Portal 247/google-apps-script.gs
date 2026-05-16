const SPREADSHEET_ID = "1BsYPEBRYWFbZyKMrZir4Scud631cYb2IiT40vLg2ozU";
const SHEET_NAME = "CRT FY26";
const DRIVE_FOLDER_NAME = "CRT FY26 Uploads";
const DRIVE_FOLDER_ID = "";
const HEADERS = [
  "Submitted At",
  "Institute/College Name",
  "Student Name",
  "Student Mobile Number",
  "Invoice Number",
  "Product Serial Number",
  "CRT Claim Category",
  "Uploaded Document Name",
  "Document Download Link",
  "Remarks",
];

function doPost(e) {
  const sheet = getOrCreateSheet();
  const data = e.parameter || {};
  const uploadedFile = saveUploadedDocument(data);

  sheet.appendRow([
    data.submittedAt || new Date(),
    data.institute || "",
    data.student || "",
    data.mobile || "",
    data.invoice || "",
    data.serial || "",
    data.category || "",
    uploadedFile.name || data.document || "",
    uploadedFile.url || "",
    data.remark || "",
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function saveUploadedDocument(data) {
  if (!data.documentBase64 || !data.document) {
    return { name: data.document || "", url: "" };
  }

  const bytes = Utilities.base64Decode(data.documentBase64);
  const mimeType = data.documentMimeType || "application/octet-stream";
  const safeName = sanitizeFileName(data.document);
  const blob = Utilities.newBlob(bytes, mimeType, safeName);
  const folder = getUploadFolder();
  const file = folder.createFile(blob);

  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    name: file.getName(),
    url: file.getUrl(),
  };
}

function getUploadFolder() {
  if (DRIVE_FOLDER_ID) {
    return DriveApp.getFolderById(DRIVE_FOLDER_ID);
  }

  const folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);

  if (folders.hasNext()) {
    return folders.next();
  }

  return DriveApp.createFolder(DRIVE_FOLDER_NAME);
}

function sanitizeFileName(name) {
  return String(name || "crt-document")
    .replace(/[\\/:*?"<>|#{}%~&]/g, "-")
    .slice(0, 120);
}

function getOrCreateSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }

  return sheet;
}
