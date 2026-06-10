import React, { useState } from 'react';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  negativeValue?: string;
  onNegativeChange?: (value: string) => void;
  placeholder?: string;
}

export function PromptInput({
  value,
  onChange,
  negativeValue,
  onNegativeChange,
  placeholder = 'Describe what to generate...',
}: PromptInputProps) {
  const [showNegative, setShowNegative] = useState(false);
  const hasNegative = negativeValue !== undefined && onNegativeChange !== undefined;

  return (
    <div style={styles.container}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={styles.textarea}
        rows={3}
      />

      {hasNegative && (
        <>
          <button onClick={() => setShowNegative(!showNegative)} style={styles.toggleBtn}>
            {showNegative ? '▼' : '▶'} Negative Prompt
          </button>
          {showNegative && (
            <textarea
              value={negativeValue}
              onChange={(e) => onNegativeChange(e.target.value)}
              placeholder="What to avoid..."
              style={{ ...styles.textarea, marginTop: 4 }}
              rows={2}
            />
          )}
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
  },
  textarea: {
    width: '100%',
    padding: '6px 8px',
    fontSize: 11,
    lineHeight: 1.4,
    backgroundColor: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: 3,
    color: '#e0e0e0',
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  toggleBtn: {
    marginTop: 4,
    padding: '2px 0',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#888',
    fontSize: 10,
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
};
