import React, { useState, useCallback } from 'react';
import { useStore } from '../stores/useStore';
import { TripoApiService } from '../services/tripoApi';
import { useTranslation } from '../hooks/useTranslation';
import CSInterface from '../../js/lib/cep/csinterface';

export function Header() {
  const apiKey = useStore((s) => s.apiKey);
  const balance = useStore((s) => s.balance);
  const setApiKey = useStore((s) => s.setApiKey);
  const setBalance = useStore((s) => s.setBalance);

  const { t, language, setLanguage } = useTranslation();

  const [keyInput, setKeyInput] = useState(apiKey ?? '');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
};
