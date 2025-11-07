import { useCallback, useEffect, useMemo, useState } from 'react';
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

const defaultConfig: ConfigResponse = {};

type SectionProps = Readonly<{
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}>;

function Section({ title, actions, children }: SectionProps) {
  return (
    <section className="section">
      <div className="section-header">
        <h2>{title}</h2>
        {actions ? <div className="section-actions">{actions}</div> : null}
      </div>
      <div className="section-body">{children}</div>
    </section>
  );
}

type StatusPillProps = Readonly<{ active: boolean }>;

function StatusPill({ active }: StatusPillProps) {
  return (
    <span className={`status-pill ${active ? 'active' : 'inactive'}`}>
      <span className="dot" />
      {active ? 'Active' : 'Idle'}
    </span>
  );
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

  const recentlyUsed = useMemo(() => filteredFiles.slice(0, 4), [filteredFiles]);
  const recentTableFiles = useMemo(() => filteredFiles.slice(0, 8), [filteredFiles]);
  const sharedItems = useMemo(() => filteredFiles.slice(4, 7), [filteredFiles]);

  const categorizeFile = useCallback((mimeType?: string | null): string => {
    if (!mimeType) return 'Other';
    if (mimeType.startsWith('image/')) return 'Images';
    if (mimeType.startsWith('video/')) return 'Videos';
    if (mimeType.startsWith('audio/')) return 'Audio';
    if (mimeType === 'application/pdf' || mimeType.startsWith('application/vnd')) return 'Documents';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return 'Archives';
    return 'Documents';
  }, []);

  const categoryStats = useMemo(() => {
    const map = new Map<string, { label: string; count: number; size: number }>();

    const addCategory = (key: string, label: string, size: number) => {
      if (!map.has(key)) {
        map.set(key, { label, count: 0, size: 0 });
      }
      const entry = map.get(key)!;
      entry.count += 1;
      entry.size += size;
    };

    for (const file of files) {
      const key = categorizeFile(file.mimeType);
      const size = Number(file.size ?? 0);
      switch (key) {
        case 'Images':
          addCategory('images', 'Images', size);
          break;
        case 'Videos':
          addCategory('videos', 'Videos', size);
          break;
        case 'Audio':
          addCategory('audio', 'Audio', size);
          break;
        case 'Archives':
          addCategory('archives', 'Archives', size);
          break;
        case 'Documents':
          addCategory('documents', 'Documents', size);
          break;
        default:
          addCategory('other', 'Other', size);
      }
    }

    const stats = Array.from(map.entries()).map(([key, value]) => ({ key, ...value }));
    stats.sort((a, b) => b.size - a.size);
    return stats;
  }, [files, categorizeFile]);

  const topCategories = useMemo(() => categoryStats.slice(0, 4), [categoryStats]);

  const storageCapacityBytes = 500 * 1024 * 1024 * 1024; // 500 GB
  const totalSizeBytes = useMemo(() => files.reduce((sum, file) => sum + Number(file.size ?? 0), 0), [files]);
  const storagePercent = useMemo(() => {
    if (!storageCapacityBytes) return 0;
    return Math.min(100, Math.round((totalSizeBytes / storageCapacityBytes) * 100));
  }, [totalSizeBytes]);

  const formatBytes = useCallback((value: number) => {
    if (!value) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    const formatted = value / Math.pow(1024, index);
    return `${formatted.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  }, []);

  const emptyStateMessage = useMemo(
    () => (config.syncActive ? 'No files found. Try a different search.' : 'Sync is inactive.'),
    [config.syncActive]
  );

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
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__logo">S</span>
          <div>
            <div className="sidebar__title">SATA UI</div>
            <div className="sidebar__subtitle">Demo</div>
          </div>
        </div>
        <nav className="sidebar__nav">
          <button className="sidebar__item" onClick={() => handleOpenWorkspace()}>
            Open Workspace
          </button>
          <button className="sidebar__item" onClick={() => handleOpenWebApp()}>
            Open Web App
          </button>
          <button className="sidebar__item" onClick={() => handleRestartSync()}>
            Restart Sync
          </button>
          <button className="sidebar__item" onClick={() => handleChooseWorkspace()}>
            Choose Workspace
          </button>
        </nav>
      </aside>

      <div className="workspace">
        <header className="workspace__header">
          <div className="search-bar">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search your files"
            />
          </div>
          <StatusPill active={Boolean(config.syncActive)} />
        </header>

        <div className="app-content">
          <div className="workspace__main">
            <main className="workspace__content">
              <Section title="Recently Used">
                {recentlyUsed.length === 0 ? (
                  <div className="empty-state">No files yet.</div>
                ) : (
                  <div className="recent-grid">
                    {recentlyUsed.map((file) => {
                      const category = categorizeFile(file.mimeType);
                      return (
                        <div key={file.fileId} className="recent-card">
                          <div className={`recent-card__icon recent-card__icon--${category.toLowerCase()}`}>
                            {category === 'Documents' && '📄'}
                            {category === 'Images' && '🖼️'}
                            {category === 'Videos' && '🎬'}
                            {category === 'Audio' && '🎧'}
                            {category === 'Archives' && '🗜️'}
                            {category === 'Other' && '📁'}
                          </div>
                          <div className="recent-card__title">{file.name}</div>
                          <div className="recent-card__meta">Updated {formatDate(file.updatedAt)}</div>
                          <div className="recent-card__path">{file.relativePath}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Section>

              <Section title="Recent Files" actions={<span className="table-count">{filteredFiles.length} files</span>}>
                <div className="file-table-container">
                  {recentTableFiles.length === 0 ? (
                    <div className="empty-state">{emptyStateMessage}</div>
                  ) : (
                    <table className="file-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>System Folder</th>
                          <th>Location</th>
                          <th>Size</th>
                          <th>Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentTableFiles.map((file) => (
                          <tr key={file.fileId}>
                            <td>{file.name}</td>
                            <td>{file.systemFolder ?? 'My Folders'}</td>
                            <td>{file.relativePath}</td>
                            <td>{formatSize(file.size)}</td>
                            <td>{formatDate(file.updatedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Section>

              <Section title="Shared with me">
                {sharedItems.length === 0 ? (
                  <div className="empty-state">No shared files yet.</div>
                ) : (
                  <div className="recent-grid shared-grid">
                    {sharedItems.map((file) => (
                      <div key={file.fileId} className="shared-card">
                        <div className="shared-card__title">{file.name}</div>
                        <div className="shared-card__meta">{formatDate(file.updatedAt)}</div>
                        <div className="shared-card__path">{file.relativePath}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </main>

            <aside className="workspace__summary">
              <div className="summary-card">
                <div className="summary-card__header">
                  <h3>Storage</h3>
                  <span className="summary-card__hint">{formatBytes(totalSizeBytes)} of {formatBytes(storageCapacityBytes)}</span>
                </div>
                <div className="storage-chart">
                  <div className="storage-chart__ring" style={{ background: `conic-gradient(#6366f1 ${storagePercent}%, #e2e8f0 0)` }}>
                    <div className="storage-chart__inner">{storagePercent}%</div>
                  </div>
                  <div className="storage-chart__details">
                    <div className="storage-chart__value">{formatBytes(totalSizeBytes)} used</div>
                    <div className="storage-chart__subtitle">{files.length} files</div>
                  </div>
                </div>
                <ul className="storage-list">
                  {topCategories.length === 0 ? (
                    <li className="storage-list__item">No files yet.</li>
                  ) : (
                    topCategories.map((category) => (
                      <li key={category.key} className="storage-list__item">
                        <span className={`storage-dot storage-dot--${category.key}`} />
                        <span className="storage-list__label">{category.label}</span>
                        <span className="storage-list__value">{formatBytes(category.size)}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className="summary-card">
                <div className="summary-card__header">
                  <h3>Workspace</h3>
                  <StatusPill active={Boolean(config.syncActive)} />
                </div>
                <div className="summary-item">
                  <span className="summary-label">Location</span>
                  <span className="summary-value">{config.workspacePath ?? 'Not selected yet'}</span>
                </div>
                <div className="summary-actions">
                  <button onClick={() => handleChooseWorkspace()} disabled={isWorkspaceBusy}>
                    {workspaceButtonLabel}
                  </button>
                  <button className="ghost" onClick={() => handleOpenWorkspace()}>
                    Open Folder
                  </button>
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-card__header">
                  <h3>Account</h3>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Signed in as</span>
                  <span className="summary-value">{config.auth?.displayName ?? config.auth?.email}</span>
                </div>
                <button className="ghost" onClick={() => handleLogout()}>
                  Logout
                </button>
              </div>
            </aside>
          </div>
        </div>

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

