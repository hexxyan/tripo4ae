import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  status?: string;
}

export function ProgressBar({ progress, status }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, progress));
  const displayPct = Math.round(clamped);

  return (
    <div style={styles.container}>
      <div style={styles.barBg}>
        <div
          style={{
            ...styles.barFill,
            width: `${displayPct}%`,
          }}
        />
      </div>
      <div style={styles.labelRow}>
        {status && <span style={styles.status}>{status}</span>}
        <span style={styles.percent}>{displayPct}%</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  barBg: {
    width: '100%',
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#4a9eff',
    borderRadius: 3,
    transition: 'width 0.3s ease',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  status: {
    fontSize: 10,
    color: '#999',
  },
  percent: {
    fontSize: 10,
    color: '#aaa',
  },
};
