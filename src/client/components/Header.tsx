import React, { useState, useCallback, useEffect } from 'react';
import { useStore } from '../stores/useStore';
import { TripoApiService } from '../services/tripoApi';
import { useTranslation } from '../hooks/useTranslation';
import CSInterface from '../../js/lib/cep/csinterface';
import pkg from '../../../package.json';
import { isNewerVersion } from '../utils/version';

async function fetchLatestVersionInfo(): Promise<{ version: string; url: string; commit?: string }> {
  const repo = 'hexxyan/tripo4ae';
  const endpoints = [
    // 1. Direct release asset download (Fastly CDN, no rate limit)
    `https://github.com/${repo}/releases/latest/download/latest.json`,
    // 2. Proxied release asset download (No rate limit, China-friendly)
    `https://gh-proxy.com/https://github.com/${repo}/releases/latest/download/latest.json`,
    // 3. jsDelivr package.json (CDN, no rate limit, China-friendly)
    `https://cdn.jsdelivr.net/gh/${repo}@main/package.json`,
    // 4. Raw package.json (no rate limit, but raw github is often blocked in China)
    `https://raw.githubusercontent.com/${repo}/main/package.json`
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && data.version) {
          const version = data.version.startsWith('v') ? data.version : `v${data.version}`;
          const url = data.url || `https://github.com/${repo}/releases`;
          const commit = data.commit || undefined;
          return { version, url, commit };
        }
      }
    } catch (e) {
      console.warn(`[Tripo4AE] Update check failed for endpoint ${url}:`, e);
    }
  }

  // Final fallback to official GitHub REST API (subject to rate limit but works as a fallback)
  const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`);
  if (!res.ok) {
    throw res; // Throw response object so manual check can parse status (e.g. 403 Rate Limited)
  }
  const data = await res.json();
  if (data && data.tag_name) {
    return {
      version: data.tag_name,
      url: data.html_url || `https://github.com/${repo}/releases`,
      commit: data.target_commitish || undefined
    };
  }
  throw new Error('Invalid release data');
}

export function Header() {
  const apiKey = useStore((s) => s.apiKey);
  const balance = useStore((s) => s.balance);
  const setApiKey = useStore((s) => s.setApiKey);
  const setBalance = useStore((s) => s.setBalance);

  const { t, language, setLanguage } = useTranslation();

  const [keyInput, setKeyInput] = useState(apiKey ?? '');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<{ version: string; url: string; commit?: string } | null>(null);

  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const CACHE_KEY = 'tripo4ae_update_check';
        const cacheStr = localStorage.getItem(CACHE_KEY);
        const now = Date.now();

        if (cacheStr) {
          try {
            const cache = JSON.parse(cacheStr);
            // If checked less than 24 hours ago, use cache to avoid GitHub rate limits
            if (now - cache.lastCheck < 24 * 60 * 60 * 1000) {
              const localCommit = typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : '';
              const isUpdateAvailable =
                isNewerVersion(pkg.version, cache.latestVersion) ||
                (pkg.version === cache.latestVersion &&
                  cache.latestCommit &&
                  localCommit &&
                  !cache.latestCommit.toLowerCase().startsWith(localCommit.toLowerCase()));

              if (isUpdateAvailable) {
                setUpdateInfo({ version: cache.latestVersion, url: cache.releaseUrl, commit: cache.latestCommit });
              }
              return; // Crucial fix: return early regardless of whether version is newer to prevent rate limits
            }
          } catch (e) {
            // Ignore cache error
          }
        }

        const info = await fetchLatestVersionInfo();
        const latestVersion = info.version;
        const releaseUrl = info.url;
        const latestCommit = info.commit || '';

        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            lastCheck: now,
            latestVersion,
            releaseUrl,
            latestCommit,
          })
        );

        const localCommit = typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : '';
        const isUpdateAvailable =
          isNewerVersion(pkg.version, latestVersion) ||
          (pkg.version === latestVersion &&
            latestCommit &&
            localCommit &&
            !latestCommit.toLowerCase().startsWith(localCommit.toLowerCase()));

        if (isUpdateAvailable) {
          setUpdateInfo({ version: latestVersion, url: releaseUrl, commit: latestCommit });
        }
      } catch (e) {
        console.warn('[Tripo4AE] Failed to check for updates:', e);
      }
    };

    checkUpdate();
  }, []);

  const isConnected = apiKey !== null;

  const handleConnect = useCallback(async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) return;

    setConnecting(true);
    setError(null);

    if (!/^tsk_/.test(trimmed)) {
      setError(t('apiKeyFormatError'));
      setConnecting(false);
      return;
    }

    try {
      const api = new TripoApiService(trimmed);
      const result = await api.getBalance();
      
      setApiKey(trimmed);
      setBalance(result.balance);

      if (result.balance <= 0) {
        setError(t('apiKeyZeroBalance'));
      }
    } catch (e: any) {
      console.error('[Tripo4AE] Connect error:', e);
      if (e.status === 401) {
        setError(t('apiKeyUnauthorized'));
      } else if (e.status === 403) {
        setError(t('apiKeyUnauthorized') + ' (403)');
      } else if (
        e.message &&
        (e.message.includes('fetch') ||
          e.message.includes('NetworkError') ||
          e.message.includes('ENOTFOUND') ||
          e.message.includes('ECONNREFUSED') ||
          e.message.includes('Failed to fetch'))
      ) {
        setError(t('networkConnectionError'));
      } else {
        setError(e.message || t('failedToConnect'));
      }
      setApiKey(null);
      setBalance(0);
    } finally {
      setConnecting(false);
    }
  }, [keyInput, setApiKey, setBalance, t]);

  const handleDisconnect = useCallback(() => {
    setApiKey(null);
    setBalance(0);
    setKeyInput('');
    setError(null);
  }, [setApiKey, setBalance]);

  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  const handleManualCheck = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    setUpdateMessage(null);

    try {
      const info = await fetchLatestVersionInfo();
      const latestVersion = info.version;
      const releaseUrl = info.url;
      const latestCommit = info.commit || '';

      localStorage.setItem(
        'tripo4ae_update_check',
        JSON.stringify({
          lastCheck: Date.now(),
          latestVersion,
          releaseUrl,
          latestCommit,
        })
      );

      const localCommit = typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : '';
      const isUpdateAvailable =
        isNewerVersion(pkg.version, latestVersion) ||
        (pkg.version === latestVersion &&
          latestCommit &&
          localCommit &&
          !latestCommit.toLowerCase().startsWith(localCommit.toLowerCase()));

      if (isUpdateAvailable) {
        setUpdateInfo({ version: latestVersion, url: releaseUrl, commit: latestCommit });
        setUpdateMessage(t('language') === 'zh' ? '有新版' : 'New version');
      } else {
        setUpdateInfo(null);
        setUpdateMessage(t('language') === 'zh' ? '最新' : 'Latest');
      }
    } catch (err: any) {
      console.error(err);
      if (err && err.status === 403) {
        setUpdateMessage(t('language') === 'zh' ? '限流' : 'Rate limited');
      } else {
        setUpdateMessage(t('language') === 'zh' ? '网络错误' : 'Net error');
      }
    } finally {
      setCheckingUpdate(false);
      setTimeout(() => {
        setUpdateMessage(null);
      }, 3000);
    }
  }, [checkingUpdate, t]);

  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <div style={styles.statusDotRow}>
          <span
            style={{
              ...styles.dot,
              backgroundColor: isConnected ? '#4caf50' : '#f44336',
            }}
          />
          <span style={styles.title}>Tripo4AE</span>
          <span style={styles.versionText}>
            v{pkg.version}{typeof __COMMIT_HASH__ !== 'undefined' && __COMMIT_HASH__ ? ` (${__COMMIT_HASH__})` : ''}
            <a
              href="#"
              onClick={handleManualCheck}
              style={styles.checkUpdateLink}
              title={t('checkUpdateLinkText')}
            >
              {checkingUpdate ? '...' : updateMessage ? ` (${updateMessage})` : ` (${t('checkUpdateLinkText')})`}
            </a>
          </span>

          {updateInfo && (
            <button
              onClick={() => {
                try {
                  if (typeof window.cep !== 'undefined') {
                    const cs = new CSInterface();
                    cs.openURLInDefaultBrowser(updateInfo.url);
                  } else {
                    window.open(updateInfo.url, '_blank');
                  }
                } catch (err) {
                  window.open(updateInfo.url, '_blank');
                }
              }}
              style={styles.updateBadge}
              title={t('updateAvailableTooltip')}
            >
              🆕 {updateInfo.version}{updateInfo.commit ? ` (${updateInfo.commit.substring(0, 7)})` : ''}
            </button>
          )}

          {isConnected && (
            <span style={styles.balance}>
              ({balance} {t('credits')})
            </span>
          )}
        </div>
        <div style={styles.langSwitchRow}>
          <button
            onClick={() => setLanguage('en')}
            style={language === 'en' ? styles.langBtnActive : styles.langBtn}
          >
            EN
          </button>
          <span style={styles.langDivider}>/</span>
          <button
            onClick={() => setLanguage('zh')}
            style={language === 'zh' ? styles.langBtnActive : styles.langBtn}
          >
            中
          </button>
        </div>
      </div>

      <div style={styles.inputRow}>
        <input
          type="password"
          placeholder={t('apiKeyPlaceholder')}
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConnect();
          }}
          style={styles.input}
          disabled={connecting}
        />
        {isConnected ? (
          <button onClick={handleDisconnect} style={styles.disconnectBtn}>
            X
          </button>
        ) : (
          <button
            onClick={handleConnect}
            style={styles.connectBtn}
            disabled={connecting || !keyInput.trim()}
          >
            {connecting ? '...' : t('connect')}
          </button>
        )}
      </div>

      {!isConnected && (
        <div style={styles.onboardingRow}>
          <span style={styles.onboardingText}>{t('noApiKeyPrompt')}</span>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              try {
                if (typeof window.cep !== 'undefined') {
                  const cs = new CSInterface();
                  cs.openURLInDefaultBrowser('https://platform.tripo3d.ai/');
                } else {
                  window.open('https://platform.tripo3d.ai/', '_blank');
                }
              } catch (err) {
                console.error(err);
                window.open('https://platform.tripo3d.ai/', '_blank');
              }
            }}
            style={styles.onboardingLink}
          >
            {t('getApiKeyLink')}
          </a>
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '8px 10px',
    borderBottom: '1px solid #333',
    flexShrink: 0,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statusDotRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  title: {
    fontSize: 12,
    fontWeight: 600,
    color: '#e0e0e0',
  },
  balance: {
    fontSize: 10,
    color: '#888',
  },
  langSwitchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    fontSize: 10,
  },
  langBtn: {
    background: 'none',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    padding: '2px 4px',
    fontSize: 10,
    transition: 'color 0.15s',
  },
  langBtnActive: {
    background: 'none',
    border: 'none',
    color: '#4a9eff',
    cursor: 'pointer',
    padding: '2px 4px',
    fontSize: 10,
    fontWeight: 'bold',
  },
  langDivider: {
    color: '#444',
    fontSize: 9,
  },
  inputRow: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: '4px 6px',
    fontSize: 11,
    backgroundColor: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: 3,
    color: '#e0e0e0',
    outline: 'none',
    minWidth: 0,
  },
  connectBtn: {
    padding: '4px 10px',
    fontSize: 11,
    backgroundColor: '#4a9eff',
    color: '#fff',
    border: 'none',
    borderRadius: 3,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  disconnectBtn: {
    padding: '4px 8px',
    fontSize: 11,
    backgroundColor: '#f44336',
    color: '#fff',
    border: 'none',
    borderRadius: 3,
    cursor: 'pointer',
    flexShrink: 0,
  },
  error: {
    marginTop: 4,
    fontSize: 10,
    color: '#f44336',
  },
  onboardingRow: {
    marginTop: 6,
    fontSize: 9,
    color: '#888',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  onboardingText: {
    color: '#888',
  },
  onboardingLink: {
    color: '#4a9eff',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  versionText: {
    fontSize: 9,
    color: '#666',
    marginLeft: 4,
    alignSelf: 'center',
  },
  updateBadge: {
    fontSize: 9,
    color: '#fff',
    backgroundColor: '#ff9800',
    border: 'none',
    borderRadius: 3,
    padding: '1px 4px',
    marginLeft: 6,
    cursor: 'pointer',
    fontWeight: 'bold',
    alignSelf: 'center',
  },
  checkUpdateLink: {
    color: '#666',
    textDecoration: 'none',
    fontSize: 8,
    marginLeft: 3,
    cursor: 'pointer',
  },
};
