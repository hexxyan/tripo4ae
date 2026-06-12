import React, { useState, useEffect } from 'react';
import { TripoApiService } from '../../services/tripoApi';

interface ThumbnailImageProps {
  taskId: string;
  thumbnailUrl?: string;
  thumbnailPath?: string;
  api: TripoApiService;
  onUpdate?: (newUrl: string, newLocalPath?: string) => void;
  style?: React.CSSProperties;
  fallbackText?: string;
}

export function ThumbnailImage({
  taskId,
  thumbnailUrl,
  thumbnailPath,
  api,
  onUpdate,
  style,
  fallbackText = '3D',
}: ThumbnailImageProps) {
  const [src, setSrc] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorCount, setErrorCount] = useState<number>(0);

  useEffect(() => {
    setErrorCount(0);
  }, [taskId]);

  useEffect(() => {
    let active = true;
    const loadThumbnail = async () => {
      setLoading(true);

      // 1. Try local path first
      const resolvedPath = thumbnailPath || (taskId ? TripoApiService.getLocalThumbnailPath(taskId) : '');
      if (resolvedPath) {
        const fs = (window as any).cep ? (globalThis as any).require('fs') : null;
        if (fs && fs.existsSync(resolvedPath)) {
          try {
            const data = fs.readFileSync(resolvedPath);
            const base64 = `data:image/png;base64,${data.toString('base64')}`;
            if (active) {
              setSrc(base64);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error('[Tripo4AE] Error reading local thumbnail:', e);
          }
        }
      }

      // 2. Fallback to thumbnailUrl
      if (thumbnailUrl) {
        if (active) {
          setSrc(thumbnailUrl);
          setLoading(false);
        }
      } else {
        if (active) {
          setSrc('');
          setLoading(false);
        }
      }
    };

    loadThumbnail();
    return () => {
      active = false;
    };
  }, [thumbnailPath, thumbnailUrl, taskId]);

  const isMountedRef = React.useRef(true);
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  const handleError = async () => {
    // If it's already a base64 data URI, don't attempt to refresh
    if (src.startsWith('data:')) return;
    if (errorCount > 0) return; // Prevent infinite reload loops
    setErrorCount((c) => c + 1);

    console.log(`[Tripo4AE] Thumbnail load failed. Attempting refresh for task ${taskId}`);
    try {
      const task = await api.getTask(taskId);
      if (task && task.output?.rendered_image) {
        const newUrl = task.output.rendered_image;
        let localPath = thumbnailPath;

        // Try downloading it to the local cache folder
        const saveDir = TripoApiService.getModelSaveDir();
        if (saveDir) {
          const downloaded = await api.downloadThumbnail(task, saveDir);
          if (downloaded) {
            localPath = downloaded;
          }
        }

        if (isMountedRef.current) {
          if (onUpdate) {
            onUpdate(newUrl, localPath);
          } else {
            // Fallback UI-only update if no callback provided
            setSrc(newUrl);
          }
        }
      }
    } catch (err) {
      console.error('[Tripo4AE] Failed to lazy-refresh expired thumbnail URL:', err);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#333',
          color: '#666',
          fontSize: 9,
        }}
      >
        ...
      </div>
    );
  }

  if (!src) {
    return (
      <div
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#333',
          color: '#666',
          fontSize: 9,
        }}
      >
        {fallbackText}
      </div>
    );
  }

  return <img src={src} onError={handleError} style={style} alt="" />;
}
