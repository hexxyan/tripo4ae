import React, { useState, useRef, useCallback } from 'react';

interface ImageUploadProps {
  onFileSelected: (file: File) => void;
  preview?: string | null;
  compact?: boolean;
}

export function ImageUpload({
  onFileSelected,
  preview: externalPreview,
  compact = false,
}: ImageUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [internalPreview, setInternalPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const previewSrc = externalPreview ?? internalPreview;

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      onFileSelected(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        setInternalPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    },
    [onFileSelected],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const containerStyle: React.CSSProperties = compact
    ? { ...styles.container, height: 80 }
    : styles.container;

  return (
    <div
      style={{
        ...containerStyle,
        borderColor: dragging ? '#4a9eff' : '#444',
        backgroundColor: dragging ? '#2a3040' : '#2a2a2a',
      }}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={styles.hiddenInput}
        onChange={handleInputChange}
      />

      {previewSrc ? (
        <img src={previewSrc} style={styles.preview} alt="Preview" />
      ) : (
        <div style={styles.placeholder}>
          <span style={styles.placeholderIcon}>+</span>
          <span style={styles.placeholderText}>Drop image here</span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    border: '1px dashed #444',
    borderRadius: 4,
    cursor: 'pointer',
    overflow: 'hidden',
    transition: 'border-color 0.15s, background-color 0.15s',
  },
  hiddenInput: {
    display: 'none',
  },
  preview: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain' as const,
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  placeholderIcon: {
    fontSize: 20,
    color: '#666',
  },
  placeholderText: {
    fontSize: 10,
    color: '#666',
  },
};
