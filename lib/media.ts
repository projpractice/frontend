import { Image, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

import type { MediaAttachment } from '@/types/detection';

type PersistOptions = {
  fileName: string;
  mimeType?: string;
  width?: number;
  height?: number;
};

const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
let cachedTempDir: string | null = null;

export function resolveImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      error => reject(error)
    );
  });
}

export async function persistMediaBuffer(
  buffer: ArrayBuffer,
  options: PersistOptions
): Promise<MediaAttachment> {
  const { mimeType = 'application/octet-stream', width, height } = options;
  const fileName = sanitizeFileName(options.fileName);
  const size = buffer.byteLength;

  if (Platform.OS === 'web') {
    const blob = new Blob([buffer], { type: mimeType });
    const uri = URL.createObjectURL(blob);
    return {
      uri,
      mimeType,
      size: blob.size,
      name: fileName,
      width,
      height,
      file: blob,
      isTemporary: true,
    };
  }

  const targetDir = await ensureTempDir();
  const targetPath = `${targetDir}/${fileName}`;
  const base64 = arrayBufferToBase64(buffer);
  await FileSystem.writeAsStringAsync(targetPath, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return {
    uri: targetPath,
    mimeType,
    size,
    name: fileName,
    width,
    height,
    isTemporary: true,
  };
}

export async function releaseMediaAttachment(
  attachment?: MediaAttachment | null
): Promise<void> {
  if (!attachment || !attachment.isTemporary) {
    return;
  }
  if (Platform.OS === 'web') {
    if (attachment.uri.startsWith('blob:')) {
      URL.revokeObjectURL(attachment.uri);
    }
    return;
  }
  try {
    await FileSystem.deleteAsync(attachment.uri, { idempotent: true });
  } catch {
    // ignore cleanup errors
  }
}

export function dataUriToBlob(dataUri: string, fallbackMime?: string): Blob | null {
  if (Platform.OS !== 'web') {
    return null;
  }
  const match = dataUri.match(/^data:(.+?);base64,(.+)$/);
  if (!match) {
    return null;
  }
  const mimeType = match[1] || fallbackMime || 'application/octet-stream';
  const base64 = match[2];
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

async function ensureTempDir(): Promise<string> {
  if (cachedTempDir) {
    return cachedTempDir;
  }
  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDir) {
    throw new Error('Файловая система недоступна, чтобы сохранить временный файл.');
  }
  const target = `${baseDir}dogmuzzle-cache`;
  try {
    await FileSystem.makeDirectoryAsync(target, { intermediates: true });
  } catch {
    // directory already exists
  }
  cachedTempDir = target;
  return target;
}

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-]+/g, '_');
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const len = bytes.length;
  const chunks: string[] = [];

  for (let i = 0; i < len; i += 3) {
    const a = bytes[i];
    const b = i + 1 < len ? bytes[i + 1] : 0;
    const c = i + 2 < len ? bytes[i + 2] : 0;

    const triplet = (a << 16) | (b << 8) | c;
    chunks.push(base64Chars[(triplet >> 18) & 63]);
    chunks.push(base64Chars[(triplet >> 12) & 63]);
    chunks.push(i + 1 < len ? base64Chars[(triplet >> 6) & 63] : '=');
    chunks.push(i + 2 < len ? base64Chars[triplet & 63] : '=');
  }

  return chunks.join('');
}
