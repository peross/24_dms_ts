export {}; // Ensure this file is treated as a module

declare global {
  interface Window {
    dmsClient: {
      getConfig: () => Promise<any>;
      setApiBaseUrl: (apiBaseUrl: string) => Promise<any>;
      chooseWorkspace: () => Promise<string | null>;
      setWorkspace: (workspacePath: string) => Promise<any>;
      login: (payload: { identifier: string; password: string; twoFactorToken?: string }) => Promise<any>;
      logout: () => Promise<any>;
      restartSync: () => Promise<any>;
      listFiles: () => Promise<import('../shared/types').SyncedFileEntry[]>;
      openWorkspaceFolder: () => Promise<{ success: boolean; message?: string }>;
      openWebApp: () => Promise<{ success: boolean; message?: string; url?: string }>;
    };
  }

  // Allow access via globalThis.dmsClient
  // eslint-disable-next-line no-var
  var dmsClient: Window['dmsClient'];
}

