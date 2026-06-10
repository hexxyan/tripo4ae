import React, { useState, useCallback } from 'react';
import { useStore } from '../stores/useStore';
import { TripoApiService } from '../services/tripoApi';

export function Header() {
  const apiKey = useStore((s) => s.apiKey);
  const balance = useStore((s) => s.balance);
  const setApiKey = useStore((s) => s.setApiKey);
  const setBalance = useStore((s) => s.setBalance);

  const [keyInput, setKeyInput] = useState(apiKey ?? '');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConnected = apiKey !== null;

  const handleConnect = useCallback(async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) return;

    setConnecting(true);
    setError(null);

    try {
      const api = new TripoApiService(trimmed);
      const result = await api.getBalance();
      setApiKey(trimmed);
      setBalance(result.balance);
    } catch (e: any) {
      setError(e.message || 'Failed to connect');
      setApiKey(null);
      setBalance(0);
    } finally {
      setConnecting(false);
    }
  }, [keyInput, setApiKey, setBalance]);

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
        </div>
        {isConnected && (
          <span style={styles.balance}>{balance} credits</span>
        )}
      </div>

      <div style={styles.inputRow}>
        <input
          type="password"
          placeholder="API Key"
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
            {connecting ? '...' : 'Connect'}
          </button>
        )}
      </div>

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
};
