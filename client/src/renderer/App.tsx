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
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
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

    setIsLoadingFiles(true);
    try {
      const result = await globalThis.dmsClient.listFiles();
      setFiles(result);
    } catch (error) {
      console.error('Failed to load file list', error);
    } finally {
      setIsLoadingFiles(false);
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
        setLoginMessage({ type: 'info', text: result.message ?? 'Two-factor code required. Enter the code to continue.' });
        return;
      }

      if (!result.success) {
        setLoginMessage({ type: 'error', text: result.message ?? 'Login failed.' });
        return;
      }

      setLoginMessage({ type: 'success', text: 'Logged in successfully.' });
      setPassword('');
      setTwoFactorToken('');
      await loadConfig();
    } catch (error: any) {
      const message = error?.response?.data?.error ?? error?.message ?? 'Login failed.';
      setLoginMessage({ type: 'error', text: message });
    } finally {
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

  const filteredFiles = useMemo(() => {
    if (!searchTerm) return files;
    const term = searchTerm.toLowerCase();
    return files.filter((file) =>
      file.name.toLowerCase().includes(term) || file.relativePath.toLowerCase().includes(term)
    );
  }, [files, searchTerm]);

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

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-text">
          <h1>Document Management Client</h1>
          <p>Keep your workspace mirrored with the web platform in real time.</p>
        </div>
        <div className="hero-status">
          <StatusPill active={Boolean(config.syncActive)} />
          <span className="hero-sync-label">Sync {config.syncActive ? 'running' : 'paused'}</span>
        </div>
      </header>

      <main className="layout-grid">
        <div className="panel-stack control-stack">
          <Section
          title="Quick Access"
          actions={
            <div className="quick-actions">
              <button className="ghost" onClick={() => handleOpenWorkspace()}>
                Open Workspace
              </button>
              <button className="ghost" onClick={() => handleOpenWebApp()}>
                Open Web App
              </button>
              <button className="secondary" onClick={() => handleRestartSync()}>
                Restart Sync
              </button>
            </div>
          }
        >
          <p>
            Workspace: <strong>{config.workspacePath ?? 'Not selected yet'}</strong>
          </p>
          <p>
            Last synced: <strong>{lastSyncedLabel}</strong>
          </p>
        </Section>

        <Section title="API Connection">
          <p>Provide the base URL of your DMS API (for example, http://localhost:3000 or https://dms.yourdomain.com).</p>
          <div className="form-row">
            <input
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
        </Section>

        <Section title="Authentication">
          {isLoggedIn ? (
            <div className="status-card">
              <p>
                Signed in as <strong>{config.auth?.displayName ?? config.auth?.email}</strong>
              </p>
              <button className="secondary" onClick={() => handleLogout()}>
                Logout
              </button>
            </div>
          ) : (
            <div className="login-form">
              <div className="form-group">
                <label htmlFor="identifier">Email or Username</label>
                <input
                  id="identifier"
                  autoComplete="username"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="form-group">
                <label htmlFor="twoFactor">Two-Factor Code (if required)</label>
                <input
                  id="twoFactor"
                  value={twoFactorToken}
                  onChange={(event) => setTwoFactorToken(event.target.value)}
                  placeholder="123456"
                />
              </div>
              <button onClick={() => handleLogin()} disabled={isSubmittingLogin}>
                {isSubmittingLogin ? 'Signing in…' : 'Login'}
              </button>
              {loginMessage && <p className={`message ${loginMessage.type}`}>{loginMessage.text}</p>}
            </div>
          )}
        </Section>

        <Section title="Workspace Folder">
          <p>Choose where the client should create the DMS folder structure (General, My Folders, Shared With Me).</p>
          <div className="workspace-status">
            <div>
              <strong>Current location</strong>
              <p>{config.workspacePath ?? 'Not selected yet'}</p>
            </div>
            <button onClick={() => handleChooseWorkspace()} disabled={isWorkspaceBusy}>
              {workspaceButtonLabel}
            </button>
          </div>
        </Section>

        <Section title="Sync Status">
          <p>The client monitors the <strong>My Folders</strong> directory and uploads new folders and files to the server.</p>
          <div className="status-card">
            <p>
              Sync state: <StatusPill active={Boolean(config.syncActive)} />
            </p>
            <button className="secondary" onClick={() => handleRestartSync()}>
              Restart watcher
            </button>
          </div>
          <small>
            Tip: Once you select a workspace and authenticate, the watcher will automatically keep the platform up to date when you add folders or files inside <em>My Folders</em>.
          </small>
        </Section>
        </div>

        <div className="panel-stack files-stack">
          <Section
            title="Workspace Files"
            actions={
              <div className="files-actions">
                <input
                  type="search"
                  className="search-input"
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  disabled={isLoadingFiles || !config.syncActive}
                />
              </div>
            }
          >
            <div className="files-meta">
              <span>{filteredFiles.length} file(s)</span>
              {isLoadingFiles ? <span className="pill">Loading…</span> : null}
            </div>
            <div className="file-table-container">
              {filteredFiles.length === 0 ? (
                <div className="empty-state">
                  <p>{emptyStateMessage}</p>
                </div>
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
                    {filteredFiles.map((file) => (
                      <tr key={file.fileId}>
                        <td>{file.name}</td>
                        <td>{file.systemFolder}</td>
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
        </div>
      </main>
    </div>
  );
}

