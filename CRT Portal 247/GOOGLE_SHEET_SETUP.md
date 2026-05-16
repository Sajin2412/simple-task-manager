# Google Sheet Setup for CRT Form

This CRT form can send all submitted data to an online Google Sheet.

## 1. Create the Google Sheet

Use this Google Sheet:

`https://docs.google.com/spreadsheets/d/1BsYPEBRYWFbZyKMrZir4Scud631cYb2IiT40vLg2ozU/edit`

Keep it open.

## 2. Add Apps Script

1. In the Google Sheet, open `Extensions > Apps Script`.
2. Delete any existing code.
3. Paste the full code from `google-apps-script.gs`.
4. Click `Save`.

The script is already aligned to this spreadsheet ID and will create/use a sheet tab named `CRT FY26`.

## 3. Deploy as Web App

1. Click `Deploy > New deployment`.
2. Choose `Web app`.
3. Set `Execute as` to `Me`.
4. Set `Who has access` to `Anyone`.
5. Click `Deploy`.
6. Authorize the permissions.
7. Copy the Web App URL.

## 4. Connect the Form

Open `google-sheet-config.js` and paste the URL:

```js
window.CRT_GOOGLE_SHEET_WEB_APP_URL = "PASTE_WEB_APP_URL_HERE";
```

## How Image Download Links Work

When a user uploads an image or PDF:

1. The form sends the file to Apps Script.
2. Apps Script saves it in Google Drive inside `CRT FY26 Uploads`.
3. Apps Script makes the file viewable by link.
4. The Google Sheet receives the file name and the download/view link.

The backend person can open the Google Sheet and click the `Document Download Link` column.
