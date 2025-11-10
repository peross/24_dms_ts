import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Select from '@radix-ui/react-select';
import type { SyncedFileEntry } from '../shared/types';

interface ConfigResponse {
  workspacePath?: string;
  apiBaseUrl?: string;
  auth?: {
    email?: string;
    displayName?: string;
    isAuthenticated?: boolean;
  };
  syncActive?: boolean;
  lastSyncedAt?: string | null;
}

interface LoginMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

interface AuthStateChangePayload {
  isAuthenticated: boolean;
  email: string | null;
  displayName: string | null;
}

const defaultConfig: ConfigResponse = {};

type StatusPillProps = Readonly<{ active: boolean }>;
type BadgeTone = 'work' | 'personal' | 'shared' | 'documents' | 'images' | 'videos' | 'audio' | 'archives' | 'other';

function StatusPill({ active }: StatusPillProps) {
  return (
    <span className={`status-pill ${active ? 'active' : 'inactive'}`}>
      <span className="dot" />
      {active ? 'Active' : 'Idle'}
    </span>
  );
}

function mapCategoryToTone(value: string): BadgeTone {
  switch (value) {
    case 'images':
      return 'images';
    case 'videos':
      return 'videos';
    case 'audio':
      return 'audio';
    case 'archives':
      return 'archives';
    case 'documents':
      return 'documents';
    default:
      return 'other';
  }
}

function splitPath(value: string): { directory: string; fileName: string } {
  if (!value) {
    return { directory: '', fileName: '' };
  }

  const normalized = value.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');

  if (lastSlash === -1) {
    return { directory: '', fileName: value };
  }

  return {
    directory: value.slice(0, lastSlash),
    fileName: value.slice(lastSlash + 1),
  };
}

function normalizePdfFileName(value: string): string {
  if (!value) {
    return 'scan.pdf';
  }
  return value.toLowerCase().endsWith('.pdf') ? value : `${value}.pdf`;
}

export default function App(): JSX.Element {
  const [config, setConfig] = useState<ConfigResponse>(defaultConfig);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [isSavingApiBaseUrl, setIsSavingApiBaseUrl] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [loginMessage, setLoginMessage] = useState<LoginMessage | null>(null);
  const [isWorkspaceBusy, setIsWorkspaceBusy] = useState(false);
  const [files, setFiles] = useState<SyncedFileEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<'updated' | 'name' | 'size'>('updated');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [scanners, setScanners] = useState<Array<{ id: string; name: string; status: string; source: string }>>([]);
  const [selectedScannerId, setSelectedScannerId] = useState('');
  const [isLoadingScanners, setIsLoadingScanners] = useState(false);
  const [isStartingScan, setIsStartingScan] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scanStatusMessage, setScanStatusMessage] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<'single' | 'multi'>('single');
  const [scanSessionId, setScanSessionId] = useState<string | null>(null);
  const [scanPages, setScanPages] = useState<Array<{ id: string; fileName: string; dataUrl: string; rotation: number }>>([]);
  const [scanSaveDirectory, setScanSaveDirectory] = useState('');
  const [scanFileName, setScanFileName] = useState('');
  const [isAppendingScan, setIsAppendingScan] = useState(false);
  const [isSavingScan, setIsSavingScan] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const selectedScanner = useMemo(
    () => scanners.find((scanner) => scanner.id === selectedScannerId) ?? null,
    [scanners, selectedScannerId]
  );
  const scanDestinationLabel = useMemo(() => {
    if (scanSaveDirectory) {
      return scanSaveDirectory;
    }
    if (config.workspacePath) {
      return `${config.workspacePath}/Scans`;
    }
    return 'Default scans folder';
  }, [scanSaveDirectory, config.workspacePath]);
  const resetScanSessionState = useCallback(() => {
    setScanSessionId(null);
    setScanPages([]);
    setScanSaveDirectory('');
    setScanFileName('');
    setIsAppendingScan(false);
    setIsSavingScan(false);
    setIsPreviewOpen(false);
  }, []);

  const profileRef = useRef<HTMLDivElement | null>(null);

  const isLoggedIn = useMemo(() => Boolean(config.auth?.isAuthenticated), [config.auth?.isAuthenticated]);
  const lastSyncedLabel = useMemo(() => {
    if (!config.lastSyncedAt) return 'Never';
    try {
      return new Date(config.lastSyncedAt).toLocaleString();
    } catch {
      return config.lastSyncedAt;
    }
  }, [config.lastSyncedAt]);

  const loadConfig = useCallback(async () => {
    const response = await globalThis.dmsClient.getConfig();
    setConfig(response);
    setApiBaseUrl(response.apiBaseUrl ?? 'http://localhost:3000/api');
  }, []);

  const loadFiles = useCallback(async () => {
    if (!config.syncActive) {
      setFiles([]);
      return;
    }

    try {
      const result = await globalThis.dmsClient.listFiles();
      setFiles(result);
    } catch (error) {
      console.error('Failed to load file list', error);
    }
  }, [config.syncActive]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (config.syncActive) {
      void loadFiles();
    }
  }, [config.syncActive, loadFiles]);

  useEffect(() => {
    const unsubscribe = globalThis.dmsClient.onAuthStateChanged?.((payload: AuthStateChangePayload) => {
      void loadConfig();
      if (!payload.isAuthenticated) {
        setFiles([]);
        setIsProfileMenuOpen(false);
        setIsSettingsOpen(false);
        setIsSidebarCollapsed(true);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [loadConfig]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isProfileMenuOpen && profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  useEffect(() => {
    if (!isLoggedIn) {
      setIsProfileMenuOpen(false);
      setIsSettingsOpen(false);
      setIsSidebarCollapsed(true);
    }
  }, [isLoggedIn]);

  const handleSaveApiBaseUrl = useCallback(async () => {
    setIsSavingApiBaseUrl(true);
    try {
      const response = await globalThis.dmsClient.setApiBaseUrl(apiBaseUrl);
      setConfig((prev) => ({ ...prev, apiBaseUrl: response.apiBaseUrl }));
    } finally {
      setIsSavingApiBaseUrl(false);
    }
  }, [apiBaseUrl]);

  const handleLogin = useCallback(async () => {
    if (!identifier || !password) {
      setLoginMessage({ type: 'error', text: 'Email/username and password are required.' });
      return;
    }

    setIsSubmittingLogin(true);
    setLoginMessage(null);

    try {
      const result = await globalThis.dmsClient.login({ identifier, password, twoFactorToken: twoFactorToken || undefined });
      if (result.requiresTwoFactor) {
        setLoginMessage({
          type: 'info',
          text: result.message ?? 'Two-factor code required. Enter the code to continue.',
        });
        setIsSubmittingLogin(false);
        return;
      }

      if (!result.success) {
        setLoginMessage({ type: 'error', text: result.message ?? 'Login failed.' });
        setIsSubmittingLogin(false);
        return;
      }

      setLoginMessage({ type: 'success', text: 'Logged in successfully.' });
      setPassword('');
      setTwoFactorToken('');
      setIsSubmittingLogin(false);
      await loadConfig();
    } catch (error: any) {
      const message = error?.response?.data?.error ?? error?.message ?? 'Login failed.';
      setLoginMessage({ type: 'error', text: message });
      setIsSubmittingLogin(false);
    }
  }, [identifier, password, twoFactorToken, loadConfig]);

  const handleLogout = useCallback(async () => {
    setIsProfileMenuOpen(false);
    setIsSettingsOpen(false);
    setIsSidebarCollapsed(true);
    await globalThis.dmsClient.logout();
    await loadConfig();
    setFiles([]);
  }, [loadConfig]);

  const handleChooseWorkspace = useCallback(async () => {
    setIsWorkspaceBusy(true);
    try {
      const selectedPath = await globalThis.dmsClient.chooseWorkspace();
      if (!selectedPath) {
        return;
      }
      const result = await globalThis.dmsClient.setWorkspace(selectedPath);
      setConfig((prev) => ({ ...prev, workspacePath: result.workspacePath, syncActive: result.syncActive }));
      await loadConfig();
    } finally {
      setIsWorkspaceBusy(false);
    }
  }, [loadConfig]);

  const handleRestartSync = useCallback(async () => {
    const result = await globalThis.dmsClient.restartSync();
    setConfig((prev) => ({ ...prev, syncActive: result.syncActive }));
    await loadConfig();
    await loadFiles();
  }, [loadConfig, loadFiles]);

  const handleOpenWorkspace = useCallback(async () => {
    const result = await globalThis.dmsClient.openWorkspaceFolder();
    if (!result.success && result.message) {
      console.error(result.message);
    }
  }, []);

  const handleRevealFile = useCallback(async (file: SyncedFileEntry) => {
    if (!file) {
      return;
    }

    const target = file.relativePath || file.name;

    try {
      const result = await globalThis.dmsClient.revealWorkspaceItem(target);
      if (!result?.success && result?.message) {
        console.error(result.message);
      }
    } catch (error) {
      console.error('Failed to reveal workspace file', error);
    }
  }, []);

  const handleOpenWebApp = useCallback(async () => {
    const result = await globalThis.dmsClient.openWebApp();
    if (!result.success && result.message) {
      console.error(result.message);
    }
  }, []);

  const loadScanners = useCallback(async () => {
    setIsLoadingScanners(true);
    setScannerError(null);
    setScanStatusMessage(null);
    try {
      const result = await globalThis.dmsClient.listScanners();
      setScanners(result);
      setSelectedScannerId((previous) => {
        if (previous && result.some((scanner) => scanner.id === previous)) {
          return previous;
        }
        return result[0]?.id ?? '';
      });
    } catch (error) {
      console.error('Failed to load scanners', error);
      const message = (error as { message?: string } | null)?.message ?? 'Failed to load scanners.';
      setScannerError(message);
    } finally {
      setIsLoadingScanners(false);
    }
  }, []);

  const handleOpenScannerModal = useCallback(() => {
    setIsScannerModalOpen(true);
    setScannerError(null);
    setScanStatusMessage(null);
    resetScanSessionState();
    setScanMode('single');
    void loadScanners();
  }, [loadScanners, resetScanSessionState]);

  const handleCloseScannerModal = useCallback(() => {
    if (scanSessionId) {
      void globalThis.dmsClient.discardScanSession(scanSessionId);
    }
    setIsScannerModalOpen(false);
    setScanners([]);
    setSelectedScannerId('');
    setIsLoadingScanners(false);
    setIsStartingScan(false);
    setScannerError(null);
    setScanStatusMessage(null);
    setScanMode('single');
    resetScanSessionState();
  }, [resetScanSessionState, scanSessionId]);

  const handleRefreshScanners = useCallback(() => {
    setScanStatusMessage(null);
    void loadScanners();
  }, [loadScanners]);

  const handleStartScan = useCallback(async () => {
    if (!selectedScannerId) {
      setScannerError('Please choose a scanner to continue.');
      return;
    }

    if (scanMode === 'multi' && scanSessionId) {
      void globalThis.dmsClient.discardScanSession(scanSessionId);
      resetScanSessionState();
    }

    setIsStartingScan(true);
    setScannerError(null);
    setScanStatusMessage(
      scanMode === 'multi'
        ? 'Scanning… Follow the prompts on your scanner to capture each page.'
        : 'Scanning…'
    );

    try {
      const result = await globalThis.dmsClient.startScan(selectedScannerId, { mode: scanMode });
      if (!result?.success) {
        setScannerError(result?.error ?? 'Failed to start scan.');
        setScanStatusMessage(null);
        return;
      }

      if (scanMode === 'multi') {
        if (!result.session) {
          setScannerError('No pages were captured. Please try scanning again.');
          setScanStatusMessage(null);
          return;
        }

        const { id, pages, suggestedFilePath, defaultFileName } = result.session;
        const previewPages = pages.map((page) => ({
          ...page,
          rotation: 0,
        }));
        const { directory, fileName } = splitPath(suggestedFilePath);

        setScanSessionId(id);
        setScanPages(previewPages);
        setScanSaveDirectory(directory);
        setScanFileName(normalizePdfFileName(fileName || defaultFileName));
        setScanStatusMessage('Pages captured. Review, rotate and save when ready.');
      } else if (result.filePath) {
        setScanStatusMessage(`Scan completed. File saved to ${result.filePath}`);
      } else {
        setScanStatusMessage('Scan completed.');
      }
    } catch (error) {
      console.error('Failed to start scanner', error);
      const message = (error as { message?: string } | null)?.message ?? 'Failed to start scan.';
      setScannerError(message);
      setScanStatusMessage(null);
    } finally {
      setIsStartingScan(false);
    }
  }, [selectedScannerId, scanMode, scanSessionId, resetScanSessionState]);

  const handleRotatePage = useCallback((pageId: string, delta: number) => {
    setScanPages((previous) =>
      previous.map((page) =>
        page.id === pageId
          ? {
              ...page,
              rotation: (page.rotation + delta + 360) % 360,
            }
          : page
      )
    );
  }, []);

  const handleAppendScanPages = useCallback(async () => {
    if (!scanSessionId) {
      return;
    }

    setIsAppendingScan(true);
    setScannerError(null);
    setScanStatusMessage('Scanning… Follow the prompts to capture additional pages.');

    try {
      const result = await globalThis.dmsClient.appendScanPages(scanSessionId);
      if (!result?.success) {
        setScannerError(result?.error ?? 'Failed to scan additional pages.');
        setScanStatusMessage(null);
        return;
      }

      const appended = (result.pages ?? []).map((page) => ({
        ...page,
        rotation: 0,
      }));

      if (appended.length > 0) {
        setScanPages((previous) => [...previous, ...appended]);
        setScanStatusMessage('Additional pages captured. Review before saving.');
      } else {
        setScanStatusMessage('No additional pages were captured.');
      }
    } catch (error) {
      console.error('Failed to append scan pages', error);
      const message = (error as { message?: string } | null)?.message ?? 'Failed to scan additional pages.';
      setScannerError(message);
      setScanStatusMessage(null);
    } finally {
      setIsAppendingScan(false);
    }
  }, [scanSessionId]);

  const handleChooseScanSaveLocation = useCallback(async () => {
    const result = await globalThis.dmsClient.chooseScanSaveLocation({
      directory: scanSaveDirectory,
      fileName: normalizePdfFileName(scanFileName),
    });

    if (result) {
      setScanSaveDirectory(result.directory);
      setScanFileName(normalizePdfFileName(result.fileName));
    }
  }, [scanSaveDirectory, scanFileName]);

  const handleOpenPreview = useCallback(() => {
    setIsPreviewOpen(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false);
  }, []);

  const handleSaveScanSession = useCallback(async () => {
    if (!scanSessionId) {
      return;
    }

    setIsSavingScan(true);
    setScannerError(null);
    setScanStatusMessage('Saving PDF…');

    try {
      const result = await globalThis.dmsClient.saveScanSession({
        sessionId: scanSessionId,
        directory: scanSaveDirectory,
        fileName: normalizePdfFileName(scanFileName),
        pages: scanPages.map((page) => ({
          id: page.id,
          rotation: page.rotation,
        })),
      });

      if (!result?.success) {
        setScannerError(result?.error ?? 'Failed to save scanned document.');
        setScanStatusMessage(null);
        return;
      }

      setScanStatusMessage(result.filePath ? `Saved PDF to ${result.filePath}` : 'Scan saved.');
      resetScanSessionState();
      void loadFiles();
    } catch (error) {
      console.error('Failed to save scan session', error);
      const message = (error as { message?: string } | null)?.message ?? 'Failed to save scanned document.';
      setScannerError(message);
      setScanStatusMessage(null);
    } finally {
      setIsSavingScan(false);
    }
  }, [scanSessionId, scanSaveDirectory, scanFileName, scanPages, resetScanSessionState, loadFiles]);

  const handleDiscardScanSession = useCallback(() => {
    if (!scanSessionId) {
      return;
    }

    void globalThis.dmsClient.discardScanSession(scanSessionId);
    resetScanSessionState();
    setScanStatusMessage('Scan session discarded.');
  }, [resetScanSessionState, scanSessionId]);

  const handleScanFileNameBlur = useCallback(() => {
    setScanFileName((current) => normalizePdfFileName(current.replace(/[\\/]/g, '')));
  }, []);

  useEffect(() => {
    if (scanMode === 'single' && scanSessionId) {
      void globalThis.dmsClient.discardScanSession(scanSessionId);
      resetScanSessionState();
    }
  }, [scanMode, scanSessionId, resetScanSessionState]);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((previous) => !previous);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true);
    setIsProfileMenuOpen(false);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const sortedFiles = useMemo(() => {
    const list = [...files];
    switch (sortOption) {
      case 'name':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case 'size':
        return list.sort((a, b) => Number(b.size ?? 0) - Number(a.size ?? 0));
      case 'updated':
      default:
        return list.sort((a, b) => {
          const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return bTime - aTime;
        });
    }
  }, [files, sortOption]);

  const filteredFiles = useMemo(() => {
    if (!searchTerm) return sortedFiles;
    const term = searchTerm.toLowerCase();
    return sortedFiles.filter((file) =>
      file.name.toLowerCase().includes(term) || file.relativePath.toLowerCase().includes(term)
    );
  }, [sortedFiles, searchTerm]);

  const categorizeFile = useCallback((mimeType?: string | null): string => {
    if (!mimeType) return 'Other';
    if (mimeType.startsWith('image/')) return 'Images';
    if (mimeType.startsWith('video/')) return 'Videos';
    if (mimeType.startsWith('audio/')) return 'Audio';
    if (mimeType === 'application/pdf' || mimeType.startsWith('application/vnd')) return 'Documents';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return 'Archives';
    return 'Documents';
  }, []);

  const emptyMessage = useMemo(() => {
    if (!config.syncActive) {
      return 'Sync is inactive. Start sync to populate your workspace.';
    }
    if (filteredFiles.length === 0) {
      return searchTerm ? 'No files match your search.' : 'No files available yet.';
    }
    return '';
  }, [config.syncActive, filteredFiles.length, searchTerm]);

  const workspaceButtonLabel = useMemo(() => {
    if (isWorkspaceBusy) {
      return 'Processing…';
    }
    return config.workspacePath ? 'Change location' : 'Choose location';
  }, [config.workspacePath, isWorkspaceBusy]);

  const formatSize = useCallback((value: number) => {
    if (!value) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const size = Math.max(value, 0);
    const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
    const formatted = size / Math.pow(1024, index);
    return `${formatted.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  }, []);

  const formatDate = useCallback((value: string) => {
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  }, []);

  const profileName = config.auth?.displayName ?? config.auth?.email ?? 'Account';
  const profileEmail = config.auth?.email ?? '';
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || 'A';
  const hasFiles = filteredFiles.length > 0;
  const viewTitle = 'Workspace Sync';
  const viewDescription = 'Quick helper to keep your desktop and web files aligned.';
  const resolvedEmptyMessage = emptyMessage || 'No files to display.';

  const getFileIcon = useCallback(
    (file: SyncedFileEntry) => {
      const category = categorizeFile(file.mimeType);
      switch (category) {
        case 'Images':
          return '🖼️';
        case 'Videos':
          return '🎬';
        case 'Audio':
          return '🎧';
        case 'Archives':
          return '🗜️';
        case 'Documents':
          return '📄';
        default:
          return '📁';
      }
    },
    [categorizeFile]
  );

  const getBadgeInfo = useCallback(
    (file: SyncedFileEntry): { label: string; tone: BadgeTone } => {
      const systemFolder = (file.systemFolder ?? '').toLowerCase();
      if (systemFolder.includes('shared')) {
        return { label: 'shared', tone: 'shared' };
      }
      if (systemFolder.includes('general')) {
        return { label: 'work', tone: 'work' };
      }
      if (systemFolder.includes('my')) {
        return { label: 'personal', tone: 'personal' };
      }

      const category = categorizeFile(file.mimeType).toLowerCase();
      return { label: category, tone: mapCategoryToTone(category) };
    },
    [categorizeFile]
  );

  const sidebarActions = [
    {
      label: 'Open Workspace',
      icon: '📂',
      onClick: () => {
        void handleOpenWorkspace();
      },
      disabled: !config.workspacePath,
    },
    {
      label: 'Scan Documents',
      icon: '🖨️',
      onClick: () => {
        handleOpenScannerModal();
      },
      disabled: false,
    },
    {
      label: 'Open Web App',
      icon: '🌐',
      onClick: () => {
        void handleOpenWebApp();
      },
      disabled: false,
    },
  ];

  if (!isLoggedIn) {
    return (
      <div className="login-screen">
        <div className="login-panel">
          <div className="login-panel__brand">
            <span className="login-panel__logo">S</span>
            <div>
              <h1>Document Management</h1>
              <p>Sign in to keep your files in sync.</p>
            </div>
          </div>

          {loginMessage && (
            <div className={`login-alert login-alert--${loginMessage.type}`} role="alert">
              {loginMessage.text}
            </div>
          )}

          <div className="login-panel__section login-panel__section--access">
            <div className="login-field login-field--stack">
              <label htmlFor="login-api">API Base URL</label>
              <input
                id="login-api"
                type="text"
                value={apiBaseUrl}
                onChange={(event) => setApiBaseUrl(event.target.value)}
                placeholder="https://dms.example.com/api"
              />
              <button onClick={() => handleSaveApiBaseUrl()} disabled={isSavingApiBaseUrl}>
                {isSavingApiBaseUrl ? 'Saving…' : 'Save'}
              </button>
              {config.apiBaseUrl && <small>Current: {config.apiBaseUrl}</small>}
            </div>

            <div className="login-field login-field--stack">
              <label htmlFor="login-workspace">Workspace Folder</label>
              <div id="login-workspace" className="login-field__value">
                {config.workspacePath ?? 'Not selected yet'}
              </div>
              <div className="login-field__actions">
                <button onClick={() => handleChooseWorkspace()} disabled={isWorkspaceBusy}>
                  {workspaceButtonLabel}
                </button>
                <button
                  className="ghost"
                  onClick={() => handleOpenWorkspace()}
                  disabled={!config.workspacePath}
                >
                  Open Folder
                </button>
              </div>
            </div>
          </div>

          <div className="login-panel__section login-panel__section--form">
            <div className="login-field">
              <label htmlFor="login-identifier">Email or Username</label>
              <input
                id="login-identifier"
                autoComplete="username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="login-field">
              <label htmlFor="login-twofactor">Two-factor Code (if required)</label>
              <input
                id="login-twofactor"
                value={twoFactorToken}
                onChange={(event) => setTwoFactorToken(event.target.value)}
                placeholder="123456"
              />
            </div>
            <button className="login-submit" onClick={() => handleLogin()} disabled={isSubmittingLogin}>
              {isSubmittingLogin ? 'Signing in…' : 'Login'}
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className={`app ${isSidebarCollapsed ? 'app--sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${isSidebarCollapsed ? 'sidebar--collapsed' : ''}`}>
        <div className="sidebar__brand">
          <span className="sidebar__logo">DMS</span>
          <div className="sidebar__brand-meta">
            <div className="sidebar__title">DMS Client</div>
            <div className="sidebar__subtitle">Document Management System</div>
          </div>
        </div>
        <div className="sidebar__actions">
          {sidebarActions.map((action) => (
            <button
              key={action.label}
              type="button"
              className="sidebar__action"
              onClick={action.onClick}
              disabled={action.disabled}
            >
              <span className="sidebar__menu-icon" aria-hidden="true">
                {action.icon}
              </span>
              <span className="sidebar__action-label">{action.label}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="workspace">
        <header className="workspace__header">
          <div className="workspace__headline workspace__headline--with-toggle">
            <button
              type="button"
              className="workspace__toggle"
              onClick={handleToggleSidebar}
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              ☰
            </button>
            <div className="workspace__headline-text">
              <h1>{viewTitle}</h1>
              <p>{viewDescription}</p>
            </div>
          </div>
          <div className="workspace__header-utilities">
            <div className="workspace__search">
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search your files"
                aria-label="Search files"
              />
            </div>
            <button className="button button--secondary" type="button" onClick={() => handleRestartSync()}>
              Resync
            </button>
            <div className="workspace__profile" ref={profileRef}>
              <button
                type="button"
                className="profile-button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                aria-haspopup="true"
                aria-expanded={isProfileMenuOpen}
              >
                <span className="profile-button__avatar" aria-hidden="true">
                  {profileInitial}
                </span>
                <span className="profile-button__name">{profileName}</span>
                <span className="profile-button__caret" aria-hidden="true">
                  ▾
                </span>
              </button>
              {isProfileMenuOpen && (
                <div className="dropdown profile-dropdown" role="menu">
                  <div className="profile-dropdown__header">
                    <strong>{profileName}</strong>
                    {profileEmail ? <span>{profileEmail}</span> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      handleOpenSettings();
                    }}
                  >
                    Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleLogout();
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="workspace__toolbar">
          <div className="workspace__sort">
            <label htmlFor="sort-option">Sort by</label>
            <select
              id="sort-option"
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value as typeof sortOption)}
            >
              <option value="updated">Last updated</option>
              <option value="name">Name</option>
              <option value="size">Size</option>
            </select>
          </div>
          <div />
          <div className="workspace__sync">
            <StatusPill active={Boolean(config.syncActive)} />
            <span className="workspace__sync-label">Last sync {lastSyncedLabel}</span>
          </div>
        </div>

        <main className="workspace__body">
          {!hasFiles && <div className="workspace__empty">{resolvedEmptyMessage}</div>}
          {hasFiles && (
            <div className="file-list">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Badge</th>
                    <th>Location</th>
                    <th>Size</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((file) => {
                    const badge = getBadgeInfo(file);
                    return (
                      <tr
                        key={file.fileId}
                        onDoubleClick={() => {
                          void handleRevealFile(file);
                        }}
                      >
                        <td>
                          <div className="file-list__name">
                            <span className="file-list__icon" aria-hidden="true">
                              {getFileIcon(file)}
                            </span>
                            {file.name}
                          </div>
                        </td>
                        <td>
                          <span className={`file-card__badge file-card__badge--${badge.tone}`}>{badge.label}</span>
                        </td>
                        <td>{file.relativePath}</td>
                        <td>{formatSize(Number(file.size ?? 0))}</td>
                        <td>{file.updatedAt ? formatDate(file.updatedAt) : 'Not synced yet'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>

        <footer className="status-bar">
          <div className="status-bar__item">
            <span className={`status-indicator ${config.syncActive ? 'online' : 'offline'}`} />
            Sync {config.syncActive ? 'Active' : 'Paused'}
          </div>
          <div className="status-bar__item">Last Sync: {lastSyncedLabel}</div>
          <div className="status-bar__item">API: {config.apiBaseUrl ?? 'Not configured'}</div>
          <div className="status-bar__item">Workspace: {config.workspacePath ?? 'Not selected'}</div>
          <div className="status-bar__item">Files: {files.length}</div>
        </footer>
      </div>

      {isScannerModalOpen && (
        <div className="modal-overlay">
          <dialog
            className={`settings-modal${scanMode === 'multi' ? ' settings-modal--wide' : ''}`}
            open
          >
            <header className="settings-modal__header">
              <h2>Scan Documents</h2>
            </header>
            <div className="settings-modal__section">
              <div className="settings-modal__label">Scan mode</div>
              <div className="scanner-mode">
                <label className="scanner-mode__option">
                  <input
                    type="radio"
                    name="scan-mode"
                    value="single"
                    checked={scanMode === 'single'}
                    onChange={() => setScanMode('single')}
                  />
                  <div>
                    <div className="scanner-mode__title">Single page</div>
                    <small>Save as an individual image (PNG).</small>
                  </div>
                </label>
                <label className="scanner-mode__option">
                  <input
                    type="radio"
                    name="scan-mode"
                    value="multi"
                    checked={scanMode === 'multi'}
                    onChange={() => setScanMode('multi')}
                  />
                  <div>
                    <div className="scanner-mode__title">Multi-page PDF</div>
                    <small>Combine multiple pages into one PDF. You will be prompted between pages.</small>
                  </div>
                </label>
              </div>
              <div className="settings-modal__label">Available scanners</div>
              <div className="settings-modal__field">
                {isLoadingScanners ? (
                  <div>Loading scanners…</div>
                ) : scanners.length > 0 ? (
                  <div className="scanner-select">
                    <Select.Root value={selectedScannerId} onValueChange={(value) => setSelectedScannerId(value)}>
                      <Select.Trigger className="scanner-select__trigger" aria-label="Choose a scanner">
                        <Select.Value placeholder="Select a scanner" />
                        <Select.Icon className="scanner-select__icon">▾</Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="scanner-select__content" position="popper" sideOffset={4}>
                          <Select.Viewport className="scanner-select__viewport">
                            {scanners.map((scanner) => (
                              <Select.Item key={scanner.id} value={scanner.id} className="scanner-select__item">
                                <Select.ItemText>{scanner.name}</Select.ItemText>
                                <Select.ItemIndicator className="scanner-select__indicator">✓</Select.ItemIndicator>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                    {selectedScanner && (
                      <div className="scanner-select__meta">
                        <small>
                          Status: {selectedScanner.status} · Source: {selectedScanner.source.toUpperCase()}
                        </small>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="scanner-list__empty">No scanners detected.</div>
                )}
              </div>
            </div>
            {scanMode === 'multi' && scanSessionId && (
              <>
                <div className="settings-modal__section">
                  <label className="scanner-save__label" htmlFor="scan-file-name">
                    File name
                  </label>
                  <input
                    id="scan-file-name"
                    type="text"
                    value={scanFileName}
                    onChange={(event) => setScanFileName(event.target.value.replace(/[\\/]/g, ''))}
                    onBlur={handleScanFileNameBlur}
                    disabled={isSavingScan}
                  />
                  <div className="scanner-save__path">Saving to: {scanDestinationLabel}</div>
                  <div className="scanner-save__actions">
                    <button type="button" onClick={handleChooseScanSaveLocation} disabled={isSavingScan}>
                      Choose location
                    </button>
                    <button type="button" className="ghost" onClick={handleOpenPreview} disabled={scanPages.length === 0}>
                      Preview pages
                    </button>
                    <button type="button" className="ghost" onClick={handleDiscardScanSession} disabled={isSavingScan || isAppendingScan}>
                      Discard session
                    </button>
                  </div>
                </div>
              </>
            )}
            {(scannerError || scanStatusMessage) && (
              <div className="settings-modal__section">
                {scannerError ? (
                  <div className="login-alert login-alert--error" role="alert">
                    {scannerError}
                  </div>
                ) : null}
                {scanStatusMessage ? (
                  <div className="login-alert login-alert--info" role="status">
                    {scanStatusMessage}
                  </div>
                ) : null}
              </div>
            )}
            <div className="settings-modal__section">
              <div className="settings-modal__actions">
                <button type="button" onClick={() => handleRefreshScanners()} disabled={isLoadingScanners}>
                  {isLoadingScanners ? 'Refreshing…' : 'Refresh list'}
                </button>
              </div>
            </div>
            <div className="settings-modal__footer">
              {scanMode === 'multi' && scanSessionId ? (
                <>
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={() => handleAppendScanPages()}
                    disabled={isAppendingScan || isSavingScan}
                  >
                    {isAppendingScan ? 'Scanning…' : 'Scan more pages'}
                  </button>
                  <button className="button button--primary" type="button" onClick={() => handleSaveScanSession()} disabled={isSavingScan || scanPages.length === 0}>
                    {isSavingScan ? 'Saving…' : 'Save as PDF'}
                  </button>
                  <button className="ghost" onClick={handleCloseScannerModal} disabled={isSavingScan || isAppendingScan}>
                    Close
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={() => handleStartScan()}
                    disabled={!selectedScannerId || isStartingScan || isLoadingScanners}
                  >
                    {isStartingScan ? 'Scanning…' : 'Start scanning'}
                  </button>
                  <button className="ghost" onClick={handleCloseScannerModal}>
                    Close
                  </button>
                </>
              )}
            </div>
          </dialog>
        </div>
      )}

      {isPreviewOpen && (
        <div className="modal-overlay modal-overlay--preview">
          <dialog className="scanner-preview-modal" open>
            <header className="scanner-preview-modal__header">
              <div>
                <h2>Scanned Pages</h2>
                <p>{scanPages.length} page{scanPages.length === 1 ? '' : 's'} ready for export</p>
              </div>
              <button
                type="button"
                className="icon-button scanner-preview-modal__close"
                onClick={handleClosePreview}
                aria-label="Close preview"
              >
                ✕
              </button>
            </header>
            <div className="scanner-preview-modal__body">
              {scanPages.length === 0 ? (
                <div className="scanner-preview__empty">No pages captured yet.</div>
              ) : (
                <div className="scanner-preview__grid">
                  {scanPages.map((page, index) => (
                    <div key={page.id} className="scanner-preview__page">
                      <div className="scanner-preview__image-wrapper">
                        <img
                          src={page.dataUrl}
                          alt={`Scanned page ${index + 1}`}
                          style={{ transform: `rotate(${page.rotation}deg)` }}
                        />
                      </div>
                      <div className="scanner-preview__meta">
                        <span>Page {index + 1}</span>
                        {page.rotation !== 0 ? <span>{page.rotation}°</span> : null}
                      </div>
                      <div className="scanner-preview__controls">
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => handleRotatePage(page.id, -90)}
                          disabled={isAppendingScan || isSavingScan}
                        >
                          ↺ Rotate left
                        </button>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => handleRotatePage(page.id, 90)}
                          disabled={isAppendingScan || isSavingScan}
                        >
                          ↻ Rotate right
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <footer className="scanner-preview-modal__footer">
              <div className="scanner-preview-modal__summary">
                <span>{scanPages.length} page{scanPages.length === 1 ? '' : 's'}</span>
                <span>Destination: {scanDestinationLabel}</span>
              </div>
              <div className="scanner-preview-modal__actions">
                <button type="button" className="ghost" onClick={handleClosePreview} disabled={isSavingScan}>
                  Close preview
                </button>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => handleAppendScanPages()}
                  disabled={isAppendingScan || isSavingScan}
                >
                  {isAppendingScan ? 'Scanning…' : 'Scan more pages'}
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => handleSaveScanSession()}
                  disabled={isSavingScan || scanPages.length === 0}
                >
                  {isSavingScan ? 'Saving…' : 'Save as PDF'}
                </button>
              </div>
            </footer>
          </dialog>
        </div>
      )}

      {isSettingsOpen && (
        <div className="modal-overlay">
          <dialog className="settings-modal" open>
            <header className="settings-modal__header">
              <h2>Settings</h2>
            </header>
            <div className="settings-modal__section">
              <label htmlFor="settings-api">API Base URL</label>
              <div className="settings-modal__field">
                <input
                  id="settings-api"
                  type="text"
                  value={apiBaseUrl}
                  onChange={(event) => setApiBaseUrl(event.target.value)}
                  placeholder="https://dms.example.com/api"
                />
                <button onClick={() => handleSaveApiBaseUrl()} disabled={isSavingApiBaseUrl}>
                  {isSavingApiBaseUrl ? 'Saving…' : 'Save'}
                </button>
              </div>
              {config.apiBaseUrl && <small>Current: {config.apiBaseUrl}</small>}
            </div>
            <div className="settings-modal__section">
              <div className="settings-modal__label">Workspace Folder</div>
              <div className="settings-modal__value">{config.workspacePath ?? 'Not selected yet'}</div>
              <div className="settings-modal__actions">
                <button onClick={() => handleChooseWorkspace()} disabled={isWorkspaceBusy}>
                  {workspaceButtonLabel}
                </button>
                <button className="ghost" onClick={() => handleOpenWorkspace()} disabled={!config.workspacePath}>
                  Open Folder
                </button>
              </div>
            </div>
            <div className="settings-modal__footer">
              <button className="ghost" onClick={handleCloseSettings}>
                Close
              </button>
            </div>
          </dialog>
        </div>
      )}
    </div>
  );
}

