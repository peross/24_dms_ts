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
      revealWorkspaceItem: (relativePath: string) => Promise<{ success: boolean; message?: string }>;
      openWebApp: () => Promise<{ success: boolean; message?: string; url?: string }>;
      listScanners: () => Promise<Array<{ id: string; name: string; status: string; source: string }>>;
      startScan: (
        scannerId: string,
        options?: { mode?: 'single' | 'multi' }
      ) => Promise<{
        success: boolean;
        error?: string;
        filePath?: string;
        session?: {
          id: string;
          pages: Array<{ id: string; fileName: string; dataUrl: string }>;
          suggestedFilePath: string;
          defaultFileName: string;
        };
      }>;
      appendScanPages: (
        sessionId: string
      ) => Promise<{ success: boolean; error?: string; pages?: Array<{ id: string; fileName: string; dataUrl: string }> }>;
      saveScanSession: (payload: {
        sessionId: string;
        directory: string;
        fileName: string;
        pages: Array<{ id: string; rotation?: number }>;
      }) => Promise<{ success: boolean; error?: string; filePath?: string }>;
      discardScanSession: (sessionId: string) => Promise<{ success: boolean }>;
      chooseScanSaveLocation: (
        payload: { directory: string; fileName: string }
      ) => Promise<{ directory: string; fileName: string } | null>;
      getNotifications: (
        params?: { limit?: number; offset?: number; unreadOnly?: boolean }
      ) => Promise<{ total: number; items: Array<Record<string, any>>; error?: string }>;
      markNotificationRead: (notificationId: number) => Promise<{ success: boolean; notification?: Record<string, any>; error?: string }>;
      markAllNotificationsRead: () => Promise<{ success: boolean; error?: string }>;
      onAuthStateChanged: (
        callback: (payload: { isAuthenticated: boolean; email: string | null; displayName: string | null }) => void
      ) => () => void;
      onNotificationCreated: (callback: (notification: Record<string, any>) => void) => () => void;
      onNotificationUpdated: (callback: (notification: Record<string, any>) => void) => () => void;
    };
  }

  // Allow access via globalThis.dmsClient
  // eslint-disable-next-line no-var
  var dmsClient: Window['dmsClient'];
}

