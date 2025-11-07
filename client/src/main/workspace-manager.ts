import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizePath } from './utils/path';

const SYSTEM_FOLDER_NAMES = ['General', 'My Folders', 'Shared With Me'] as const;

export type SystemFolderName = typeof SYSTEM_FOLDER_NAMES[number];

export function getSystemFolderPath(rootPath: string, folderName: SystemFolderName): string {
  const normalizedRoot = normalizePath(rootPath);
  return normalizePath(path.join(normalizedRoot, folderName));
}

export function getMyFoldersPath(rootPath: string): string {
  return getSystemFolderPath(rootPath, 'My Folders');
}

export async function ensureWorkspaceStructure(rootPath: string): Promise<void> {
  const normalizedRoot = normalizePath(rootPath);
  await fs.mkdir(normalizedRoot, { recursive: true });

  for (const folderName of SYSTEM_FOLDER_NAMES) {
    const folderPath = path.join(normalizedRoot, folderName);
    await fs.mkdir(folderPath, { recursive: true });
  }
}

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

