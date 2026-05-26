const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

export type DriveFile = {
  id: string;
  name: string;
};

export type DriveFileWithLink = {
  id: string;
  webViewLink: string;
};

async function assertOk(response: Response, context: string): Promise<void> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Drive API error [${context}]: ${response.status} ${text}`);
  }
}

/**
 * Extracts a Google Drive ID from a full URL or sharing link if necessary.
 * IDs are typically 25-50 characters of [a-zA-Z0-9_-].
 */
function ensureId(input: string): string {
  if (!input) return '';
  // Try to find a sequence of characters that looks like a Drive ID
  // It's usually between /d/ and /edit, or just the ID itself.
  const match = input.match(/[-\w]{25,}/);
  return match ? match[0] : input;
}

export async function listFolderFiles(folderId: string, token: string): Promise<DriveFile[]> {
  const cleanFolderId = ensureId(folderId);
  const params = new URLSearchParams({
    q: `'${cleanFolderId}' in parents and trashed = false`,
    fields: 'files(id,name)',
    pageSize: '100',
    includeItemsFromAllDrives: 'true',
    supportsAllDrives: 'true',
  });
  const response = await fetch(`${DRIVE_API}/files?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await assertOk(response, 'listFolderFiles');
  const data = await response.json<{ files: DriveFile[] }>();
  return data.files;
}

export async function copyFile(
  fileOrId: string,
  destFolderOrId: string,
  newName: string,
  token: string,
): Promise<DriveFileWithLink> {
  const fileId = ensureId(fileOrId);
  const destFolderId = ensureId(destFolderOrId);
  const response = await fetch(`${DRIVE_API}/files/${fileId}/copy?fields=id,webViewLink&supportsAllDrives=true`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: newName, parents: [destFolderId] }),
  });
  await assertOk(response, 'copyFile');
  return response.json<DriveFileWithLink>();
}

export async function exportAsPdf(fileOrId: string, token: string): Promise<ArrayBuffer> {
  const fileId = ensureId(fileOrId);
  const params = new URLSearchParams({ mimeType: 'application/pdf', supportsAllDrives: 'true' });
  const response = await fetch(`${DRIVE_API}/files/${fileId}/export?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await assertOk(response, 'exportAsPdf');
  return response.arrayBuffer();
}

export async function savePdf(
  pdfBuffer: ArrayBuffer,
  name: string,
  folderOrId: string,
  token: string,
): Promise<DriveFileWithLink> {
  const folderId = ensureId(folderOrId);
  const boundary = '-------dam_boundary_314159265358979';
  const metadata = JSON.stringify({ name, parents: [folderId] });
  const encoder = new TextEncoder();

  const preamble = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`,
  );
  const epilogue = encoder.encode(`\r\n--${boundary}--`);

  const body = new Uint8Array(preamble.byteLength + pdfBuffer.byteLength + epilogue.byteLength);
  body.set(preamble, 0);
  body.set(new Uint8Array(pdfBuffer), preamble.byteLength);
  body.set(epilogue, preamble.byteLength + pdfBuffer.byteLength);

  const response = await fetch(`${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  await assertOk(response, 'savePdf');
  return response.json<DriveFileWithLink>();
}
