import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

interface NotificationEntry {
  notificationId: number;
  title: string;
  message: string;
  type: string;
  metadata?: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

interface AuthStateChangePayload {
  isAuthenticated: boolean;
  email: string | null;
  displayName: string | null;
}

const defaultConfig: ConfigResponse = {};

type StatusPillProps = Readonly<{ active: boolean }>;
type ActiveSection = 'my-files' | 'shared' | 'recent' | 'trash';
type BadgeTone = 'work' | 'personal' | 'shared' | 'documents' | 'images' | 'videos' | 'audio' | 'archives' | 'other';

const coerceReadFlag = (value: any): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    const numeric = Number.parseInt(normalized, 10);
    if (!Number.isNaN(numeric)) {
      return numeric !== 0;
    }
  }
  return Boolean(value);
};

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

function normalizeNotification(raw: any): NotificationEntry {
  let createdAt = new Date().toISOString();
  const rawCreatedAt = raw?.createdAt;
  if (typeof rawCreatedAt === 'string') {
    createdAt = rawCreatedAt;
  } else if (rawCreatedAt instanceof Date) {
    createdAt = rawCreatedAt.toISOString();
  } else if (typeof rawCreatedAt === 'number') {
    createdAt = new Date(rawCreatedAt).toISOString();
  }

  return {
    notificationId: Number(raw?.notificationId ?? raw?.id ?? Date.now()),
    title: raw?.title ? String(raw.title) : '',
    message: raw?.message ? String(raw.message) : '',
    type: raw?.type ? String(raw.type) : '',
    metadata: raw?.metadata ?? null,
    read: coerceReadFlag(raw?.read),
    createdAt,
  };
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
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
  const [pendingNotificationIds, setPendingNotificationIds] = useState<number[]>([]);
  const [isMarkingAllNotifications, setIsMarkingAllNotifications] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState<ActiveSection>('my-files');
  const [sortOption, setSortOption] = useState<'updated' | 'name' | 'size'>('updated');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const notificationRef = useRef<HTMLDivElement | null>(null);
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

  const applyNotificationUpdate = useCallback((rawNotification: any) => {
    if (!rawNotification) {
      return;
    }

    const normalized = normalizeNotification(rawNotification);

    setNotifications((previous) => {
      const existingIndex = previous.findIndex((item) => item.notificationId === normalized.notificationId);
      if (existingIndex !== -1) {
        const updated = [...previous];
        updated[existingIndex] = normalized;
        updated.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        return updated;
      }

      const combined = [normalized, ...previous];
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return combined.slice(0, 100);
    });
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsNotificationsLoading(true);
      const response = await globalThis.dmsClient.getNotifications({ limit: 50 });
      const items = Array.isArray(response?.items) ? response.items : [];
      const normalized = items.map((item) => normalizeNotification(item));
      normalized.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(normalized);
    } catch (error) {
      console.error('Failed to load notifications', error);
      setNotifications([]);
    } finally {
      setIsNotificationsLoading(false);
    }
  }, []);

  const handleMarkNotificationRead = useCallback(
    async (notificationId: number) => {
      setPendingNotificationIds((previous) =>
        previous.includes(notificationId) ? previous : [...previous, notificationId]
      );

      try {
        const result = await globalThis.dmsClient.markNotificationRead(notificationId);
        if (result?.success && result.notification) {
          applyNotificationUpdate(result.notification);
        } else {
          setNotifications((previous) =>
            previous.map((item) =>
              item.notificationId === notificationId ? { ...item, read: true } : item
            )
          );
        }
      } catch (error) {
        console.error('Failed to mark notification as read', error);
      } finally {
        setPendingNotificationIds((previous) => previous.filter((id) => id !== notificationId));
      }
    },
    [applyNotificationUpdate]
  );

  const handleMarkAllNotificationsRead = useCallback(async () => {
    setIsMarkingAllNotifications(true);
    try {
      const result = await globalThis.dmsClient.markAllNotificationsRead();
      if (result?.success !== false) {
        setNotifications((previous) => previous.map((item) => ({ ...item, read: true })));
        setPendingNotificationIds([]);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read', error);
    } finally {
      setIsMarkingAllNotifications(false);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (!isLoggedIn) {
      setNotifications([]);
      setIsNotificationsOpen(false);
       setIsNotificationsLoading(false);
      setPendingNotificationIds([]);
      setIsMarkingAllNotifications(false);
      return;
    }

    void fetchNotifications();
  }, [isLoggedIn, fetchNotifications]);

  useEffect(() => {
    const unsubscribe = globalThis.dmsClient.onAuthStateChanged?.((payload: AuthStateChangePayload) => {
      void loadConfig();
      if (!payload.isAuthenticated) {
        setFiles([]);
        setNotifications([]);
        setIsNotificationsOpen(false);
        setIsProfileMenuOpen(false);
        setPendingNotificationIds([]);
        setIsMarkingAllNotifications(false);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [loadConfig]);

  useEffect(() => {
    if (config.syncActive) {
      void loadFiles();
    }
  }, [config.syncActive, loadFiles]);

  useEffect(() => {
    const unsubscribeCreated = globalThis.dmsClient.onNotificationCreated?.((notification: any) => {
      applyNotificationUpdate(notification);
    });
    const unsubscribeUpdated = globalThis.dmsClient.onNotificationUpdated?.((notification: any) => {
      applyNotificationUpdate(notification);
    });

    return () => {
      if (typeof unsubscribeCreated === 'function') {
        unsubscribeCreated();
      }
      if (typeof unsubscribeUpdated === 'function') {
        unsubscribeUpdated();
      }
    };
  }, [applyNotificationUpdate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isNotificationsOpen && notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (isProfileMenuOpen && profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationsOpen, isProfileMenuOpen]);

  useEffect(() => {
    if (!isLoggedIn) {
      setIsNotificationsOpen(false);
      setIsProfileMenuOpen(false);
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
      await fetchNotifications();
    } catch (error: any) {
      const message = error?.response?.data?.error ?? error?.message ?? 'Login failed.';
      setLoginMessage({ type: 'error', text: message });
      setIsSubmittingLogin(false);
    }
  }, [identifier, password, twoFactorToken, loadConfig, fetchNotifications]);

  const handleLogout = useCallback(async () => {
    setIsProfileMenuOpen(false);
    await globalThis.dmsClient.logout();
    await loadConfig();
    setFiles([]);
    setNotifications([]);
    setIsNotificationsOpen(false);
    setPendingNotificationIds([]);
    setIsMarkingAllNotifications(false);
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

  const handleOpenWebApp = useCallback(async () => {
    const result = await globalThis.dmsClient.openWebApp();
    if (!result.success && result.message) {
      console.error(result.message);
    }
  }, []);

  const sortedFiles = useMemo(() => {
    const mapped = [...files];
    mapped.sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime;
    });
    return mapped;
  }, [files]);

  const filteredFiles = useMemo(() => {
    if (!searchTerm) return sortedFiles;
    const term = searchTerm.toLowerCase();
    return sortedFiles.filter((file) =>
      file.name.toLowerCase().includes(term) || file.relativePath.toLowerCase().includes(term)
    );
  }, [sortedFiles, searchTerm]);

  const sharedFiles = useMemo(
    () => filteredFiles.filter((file) => (file.systemFolder ?? '').toLowerCase().includes('shared')),
    [filteredFiles]
  );

  const recentFiles = useMemo(() => sortedFiles.slice(0, 24), [sortedFiles]);

  const sectionFiles = useMemo(() => {
    switch (activeSection) {
      case 'shared':
        return sharedFiles;
      case 'recent':
        return recentFiles;
      case 'trash':
        return [];
      case 'my-files':
      default:
        return filteredFiles;
    }
  }, [activeSection, filteredFiles, recentFiles, sharedFiles]);

  const sortedSectionFiles = useMemo(() => {
    const list = [...sectionFiles];
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
  }, [sectionFiles, sortOption]);

  const displayedFiles = useMemo(() => sortedSectionFiles.slice(0, 12), [sortedSectionFiles]);

  const categorizeFile = useCallback((mimeType?: string | null): string => {
    if (!mimeType) return 'Other';
    if (mimeType.startsWith('image/')) return 'Images';
    if (mimeType.startsWith('video/')) return 'Videos';
    if (mimeType.startsWith('audio/')) return 'Audio';
    if (mimeType === 'application/pdf' || mimeType.startsWith('application/vnd')) return 'Documents';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return 'Archives';
    return 'Documents';
  }, []);

  const emptyStateMessage = useMemo(() => {
    if (!config.syncActive) {
      return 'Sync is inactive. Start sync to populate your workspace.';
    }
    if (activeSection === 'trash') {
      return 'Trash is empty.';
    }
    if (activeSection === 'shared') {
      return 'No shared files yet.';
    }
    if (displayedFiles.length === 0) {
      return 'No files match your search.';
    }
    return '';
  }, [activeSection, config.syncActive, displayedFiles.length]);

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

  const unreadNotificationCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const notificationBadgeValue = unreadNotificationCount > 99 ? '99+' : `${unreadNotificationCount}`;
  const notificationCount = notifications.length;
  const isNotificationPending = useCallback(
    (notificationId: number) => pendingNotificationIds.includes(notificationId),
    [pendingNotificationIds]
  );
  const profileName = config.auth?.displayName ?? config.auth?.email ?? 'Account';
  const profileEmail = config.auth?.email ?? '';
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || 'A';
  const emptyMessage = emptyStateMessage || 'No files to display.';
  const hasFiles = displayedFiles.length > 0;

  const viewTitle = useMemo(() => {
    switch (activeSection) {
      case 'shared':
        return 'Shared with Me';
      case 'recent':
        return 'Recent Files';
      case 'trash':
        return 'Trash';
      case 'my-files':
      default:
        return 'My Files';
    }
  }, [activeSection]);

  const viewDescription = useMemo(() => {
    switch (activeSection) {
      case 'shared':
        return 'Files and folders that were shared with you from the web platform.';
      case 'recent':
        return 'Most recently updated files across your synchronized workspace.';
      case 'trash':
        return 'Items removed from your workspace will appear here temporarily.';
      case 'my-files':
      default:
        return 'Keep your desktop workspace mirrored with the web platform in real time.';
    }
  }, [activeSection]);

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

  const navigationItems: Array<{ key: ActiveSection; label: string; icon: string }> = [
    { key: 'my-files', label: 'My Files', icon: '📁' },
    { key: 'shared', label: 'Shared with Me', icon: '👥' },
    { key: 'recent', label: 'Recent', icon: '🕒' },
    { key: 'trash', label: 'Trash', icon: '🗑' },
  ];

  const sidebarActions = [
    {
      label: 'Open Workspace',
      icon: '📂',
      onClick: () => handleOpenWorkspace(),
      disabled: !config.workspacePath,
    },
    {
      label: 'Change Workspace',
      icon: '🗂️',
      onClick: () => handleChooseWorkspace(),
      disabled: isWorkspaceBusy,
    },
    {
      label: 'Restart Sync',
      icon: '🔄',
      onClick: () => handleRestartSync(),
    },
    {
      label: 'Open Web App',
      icon: '🌐',
      onClick: () => handleOpenWebApp(),
    },
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__logo">S</span>
          <div className="sidebar__brand-meta">
            <div className="sidebar__title">SATA Client</div>
            <div className="sidebar__subtitle">Document Sync</div>
          </div>
        </div>

        <nav className="sidebar__menu" aria-label="Workspace navigation">
          {navigationItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`sidebar__menu-item ${activeSection === item.key ? 'is-active' : ''}`}
              onClick={() => setActiveSection(item.key)}
            >
              <span className="sidebar__menu-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

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
              <span>{action.label}</span>
            </button>
          ))}
        </div>

      </aside>

      <div className="workspace">
        <header className="workspace__header">
          <div className="workspace__headline">
            <h1>{viewTitle}</h1>
            <p>{viewDescription}</p>
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
            <button className="button button--primary" type="button" onClick={() => handleOpenWebApp()}>
              Upload
            </button>
            <div className="workspace__notifications" ref={notificationRef}>
              <button
                type="button"
                className="icon-button notification-bell"
                onClick={() => setIsNotificationsOpen((prev) => !prev)}
                aria-haspopup="true"
                aria-expanded={isNotificationsOpen}
                aria-label="Notifications"
              >
                <span aria-hidden="true">🔔</span>
                {unreadNotificationCount > 0 && (
                  <span className="notification-badge">{notificationBadgeValue}</span>
                )}
              </button>
              {isNotificationsOpen && (
                <div className="dropdown notification-dropdown" role="menu">
                  <div className="notification-dropdown__header">
                    <span className="notification-dropdown__title">Notifications</span>
                    {unreadNotificationCount > 0 && (
                      <button
                        type="button"
                        className="notification-dropdown__mark-all"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void handleMarkAllNotificationsRead();
                        }}
                        disabled={isMarkingAllNotifications}
                      >
                        {isMarkingAllNotifications ? 'Marking…' : 'Mark all as read'}
                      </button>
                    )}
                  </div>
                  {(() => {
                    if (isNotificationsLoading) {
                      return <div className="dropdown__empty">Loading notifications…</div>;
                    }

                    if (notificationCount === 0) {
                      return <div className="dropdown__empty">No notifications yet.</div>;
                    }

                    return (
                      <ul>
                        {notifications.map((item) => {
                          const itemClassName = item.read
                            ? 'notification-item'
                            : 'notification-item notification-item--unread';
                          const isPending = isNotificationPending(item.notificationId);
                          return (
                            <li key={item.notificationId} className={itemClassName}>
                              <div className="notification-item__content">
                                <div className="notification-item__title">{item.title || 'Notification'}</div>
                                <div className="notification-item__message">{item.message || item.type}</div>
                                {item.createdAt ? (
                                  <time className="notification-item__time">{formatDate(item.createdAt)}</time>
                                ) : null}
                              </div>
                              {!item.read && (
                                <div className="notification-item__actions">
                                  <button
                                    type="button"
                                    className="notification-item__action"
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      void handleMarkNotificationRead(item.notificationId);
                                    }}
                                    disabled={isPending || isMarkingAllNotifications}
                                  >
                                    {isPending ? 'Marking…' : 'Mark as read'}
                                  </button>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    );
                  })()}
                </div>
              )}
            </div>
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
                      void handleOpenWorkspace();
                    }}
                    disabled={!config.workspacePath}
                  >
                    Open Workspace Folder
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      void handleOpenWebApp();
                    }}
                  >
                    Open Web App
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
          {!hasFiles && <div className="workspace__empty">{emptyMessage}</div>}
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
                  {displayedFiles.map((file) => {
                    const badge = getBadgeInfo(file);
                    return (
                      <tr key={file.fileId}>
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
    </div>
  );
}

