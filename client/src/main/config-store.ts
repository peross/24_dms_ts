import Store from 'electron-store';
import path from 'node:path';
import { normalizePath, isSubPath } from './utils/path';

export interface AuthState {
  accessToken?: string;
  userId?: number;
  email?: string;
  displayName?: string;
}

export interface AppConfig {
  workspacePath?: string;
  apiBaseUrl?: string;
  auth?: AuthState;
  folderMappings: Record<string, number>;
}

class ConfigStore {
  private readonly store: Store<AppConfig>;

  constructor() {
    this.store = new Store<AppConfig>({
      name: 'settings',
      cwd: path.join(process.cwd(), 'client-data'),
      defaults: {
        folderMappings: {},
      },
    });
  }

  getWorkspacePath(): string | undefined {
    return this.store.get('workspacePath');
  }

  setWorkspacePath(workspacePath: string): void {
    const normalized = normalizePath(workspacePath);
    this.store.set('workspacePath', normalized);
  }

  getApiBaseUrl(): string | undefined {
    return this.store.get('apiBaseUrl');
  }

  setApiBaseUrl(apiBaseUrl: string): void {
    this.store.set('apiBaseUrl', apiBaseUrl);
  }

  getAuthState(): AuthState | undefined {
    return this.store.get('auth');
  }

  setAuthState(auth: AuthState | undefined): void {
    if (auth) {
      this.store.set('auth', auth);
    } else {
      this.store.delete('auth');
    }
  }

  getFolderId(localPath: string): number | undefined {
    const normalized = normalizePath(localPath);
    const mappings = this.store.get('folderMappings', {});
    return mappings[normalized];
  }

  setFolderId(localPath: string, folderId: number): void {
    const normalized = normalizePath(localPath);
    const mappings = this.store.get('folderMappings', {});
    mappings[normalized] = folderId;
    this.store.set('folderMappings', mappings);
  }

  removeFolderId(localPath: string): void {
    const normalized = normalizePath(localPath);
    const mappings = this.store.get('folderMappings', {});
    if (mappings[normalized] !== undefined) {
      delete mappings[normalized];
      this.store.set('folderMappings', mappings);
    }
  }

  clearMappingsUnder(rootPath: string): void {
    const normalizedRoot = normalizePath(rootPath);
    const mappings = this.store.get('folderMappings', {});
    const entries = Object.entries(mappings).filter(([key]) => !isSubPath(normalizedRoot, key));
    this.store.set('folderMappings', Object.fromEntries(entries));
  }

  reset(): void {
    this.store.clear();
  }
}

export const configStore = new ConfigStore();

