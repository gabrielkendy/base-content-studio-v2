import { google, drive_v3 } from 'googleapis';

// Configurar auth com Service Account
function getAuth() {
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  if (!privateKey || !clientEmail) {
    throw new Error('Google Service Account credentials not configured');
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
}

// Obter cliente do Drive
function getDriveClient(): drive_v3.Drive {
  const auth = getAuth();
  return google.drive({ version: 'v3', auth });
}

// Extrair folder ID de uma URL do Google Drive
export function extractFolderId(url: string): string | null {
  // Formatos suportados:
  // https://drive.google.com/drive/folders/FOLDER_ID
  // https://drive.google.com/drive/u/0/folders/FOLDER_ID
  // https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
  const patterns = [
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  // Se já for um ID (não URL)
  if (/^[a-zA-Z0-9_-]+$/.test(url)) {
    return url;
  }

  return null;
}

// Interface para arquivo do Drive
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  modifiedTime?: string;
  createdTime?: string;
}

// Listar arquivos de uma pasta
export async function listFilesInFolder(folderId: string): Promise<DriveFile[]> {
  const drive = getDriveClient();
  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink, modifiedTime, createdTime)',
      pageSize: 100,
      pageToken,
      orderBy: 'name',
    });

    if (response.data.files) {
      files.push(...response.data.files.map(file => ({
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        size: file.size || undefined,
        webViewLink: file.webViewLink || undefined,
        webContentLink: file.webContentLink || undefined,
        thumbnailLink: file.thumbnailLink || undefined,
        modifiedTime: file.modifiedTime || undefined,
        createdTime: file.createdTime || undefined,
      })));
    }

    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return files;
}

// Obter informações de um arquivo específico
export async function getFileInfo(fileId: string): Promise<DriveFile | null> {
  const drive = getDriveClient();

  try {
    const response = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink, modifiedTime, createdTime',
    });

    return {
      id: response.data.id!,
      name: response.data.name!,
      mimeType: response.data.mimeType!,
      size: response.data.size || undefined,
      webViewLink: response.data.webViewLink || undefined,
      webContentLink: response.data.webContentLink || undefined,
      thumbnailLink: response.data.thumbnailLink || undefined,
      modifiedTime: response.data.modifiedTime || undefined,
      createdTime: response.data.createdTime || undefined,
    };
  } catch {
    return null;
  }
}

// Verificar se a pasta existe e é acessível
export async function verifyFolderAccess(folderId: string): Promise<{ ok: boolean; name?: string; error?: string }> {
  const drive = getDriveClient();

  try {
    const response = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType',
    });

    if (response.data.mimeType !== 'application/vnd.google-apps.folder') {
      return { ok: false, error: 'O link não é uma pasta do Google Drive' };
    }

    return { ok: true, name: response.data.name || undefined };
  } catch (error: unknown) {
    const err = error as { code?: number };
    if (err.code === 404) {
      return { ok: false, error: 'Pasta não encontrada. Verifique se compartilhou com a Service Account.' };
    }
    if (err.code === 403) {
      return { ok: false, error: 'Sem permissão. Compartilhe a pasta com: base-content-drive@ia-studio-435515.iam.gserviceaccount.com' };
    }
    return { ok: false, error: 'Erro ao acessar a pasta' };
  }
}

// Gerar link de download direto (para arquivos menores que 25MB)
export function getDirectDownloadLink(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

// Gerar link de visualização
export function getViewLink(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

// Gerar link de thumbnail (para imagens)
export function getThumbnailLink(fileId: string, size: number = 200): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}

// Verificar se é uma imagem
export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

// Verificar se é um vídeo
export function isVideo(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

// Verificar se é um documento
export function isDocument(mimeType: string): boolean {
  const docTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.spreadsheet',
    'application/vnd.google-apps.presentation',
  ];
  return docTypes.includes(mimeType);
}
