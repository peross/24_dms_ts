import path from 'node:path';

export function normalizePath(targetPath: string): string {
  return path.normalize(targetPath).replaceAll('\\', '/');
}

export function isSubPath(parent: string, child: string): boolean {
  const normalizedParent = normalizePath(parent);
  const normalizedChild = normalizePath(child);
  return normalizedChild === normalizedParent || normalizedChild.startsWith(`${normalizedParent}/`);
}

