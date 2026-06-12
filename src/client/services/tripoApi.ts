import { TripoHttpClient } from './httpClient';
import type { TripoTaskRequest, TripoTask, BalanceResponse } from '../../shared/types';

// CEP provides Node.js via require() — use runtime require instead of import
// to avoid Vite externalization warnings
const getNodeFs = () => (typeof window !== 'undefined' && (window as any).cep)
  ? (globalThis as any).require('fs')
  : null;
const getNodePath = () => (typeof window !== 'undefined' && (window as any).cep)
  ? (globalThis as any).require('path')
  : null;
const getNodeOs = () => (typeof window !== 'undefined' && (window as any).cep)
  ? (globalThis as any).require('os')
  : null;

interface TripoApiResponse<T> {
  code: number;
  data: T;
}

export class TripoApiService {
  private client: TripoHttpClient;

  constructor(apiKey: string) {
    this.client = new TripoHttpClient(apiKey);
  }

  getModelUrl(output?: { pbr_model?: string; model?: string; base_model?: string } | null): string | null {
    if (!output) return null;
    if (output.pbr_model) return output.pbr_model;
    if (output.model) return output.model;
    if (output.base_model) return output.base_model;
    return null;
  }

  async createTask(request: TripoTaskRequest): Promise<string> {
    const response = await this.client.post<TripoApiResponse<{ task_id: string }>>(
      '/task',
      request,
    );
    if (!response || !response.data) {
      throw new Error('Failed to create task: Invalid API response');
    }
    return response.data.task_id;
  }

  async getTask(taskId: string): Promise<TripoTask> {
    const response = await this.client.get<TripoApiResponse<TripoTask>>(
      `/task/${taskId}`,
    );
    if (!response || !response.data) {
      throw new Error(`Failed to get task ${taskId}: Invalid API response`);
    }
    return response.data;
  }

  async getBalance(): Promise<BalanceResponse> {
    const response = await this.client.get<TripoApiResponse<BalanceResponse>>(
      '/user/balance',
    );
    if (!response || !response.data) {
      throw new Error('Failed to get user balance: Invalid API response');
    }
    return response.data;
  }

  async downloadModel(url: string, savePath: string, onProgress?: (bytesReceived: number, totalBytes: number) => void): Promise<string> {
    const fs = getNodeFs();
    const nodePath = getNodePath();

    if (!fs || !nodePath) {
      throw new Error('Node.js fs not available — CEP Node.js integration required');
    }

    const dir = nodePath.dirname(savePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const isCep = typeof window !== 'undefined' && (window as any).cep;

    if (isCep) {
      const https = (globalThis as any).require('https');
      const http = (globalThis as any).require('http');

      if (https && http) {
        const downloadWithNode = (targetUrl: string, redirectCount = 0): Promise<string> => {
          if (redirectCount > 5) {
            return Promise.reject(new Error('Too many redirects'));
          }

          return new Promise((resolve, reject) => {
            try {
              const parsedUrl = new URL(targetUrl);
              const protocol = parsedUrl.protocol === 'https:' ? https : http;

              console.log(`[Tripo4AE] Downloading: ${parsedUrl.host}${parsedUrl.pathname} (redirect ${redirectCount})`);

              const requestOptions = {
                timeout: 60000,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
              };

              const req = protocol.get(targetUrl, requestOptions, (res: any) => {
                // Handle HTTP Redirects (301, 302, 303, 307, 308)
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                  const redirectUrl = new URL(res.headers.location, targetUrl).toString();
                  console.log(`[Tripo4AE] Redirect ${res.statusCode} -> ${redirectUrl}`);
                  res.resume(); // Drain response body to prevent socket leak
                  resolve(downloadWithNode(redirectUrl, redirectCount + 1));
                  return;
                }

                if (res.statusCode !== 200) {
                  res.resume(); // Drain the body to avoid leaks
                  const errMsg = `Download failed: HTTP ${res.statusCode}`;
                  console.error(`[Tripo4AE] ${errMsg}`, res.headers);
                  reject(new Error(errMsg));
                  return;
                }

                res.on('error', (streamErr: any) => {
                  console.error(`[Tripo4AE] Response stream error:`, streamErr);
                  res.destroy();
                  reject(streamErr);
                });

                const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
                console.log(`[Tripo4AE] Response OK, Content-Length: ${totalBytes || 'unknown'} bytes`);

                const fileStream = fs.createWriteStream(savePath);
                let bytesReceived = 0;
                let lastProgressLog = 0;

                res.pipe(fileStream);

                // Inactivity timeout — reset on every data chunk
                let downloadTimeout: NodeJS.Timeout | undefined = setTimeout(() => {
                  console.error(`[Tripo4AE] Download stalled after ${bytesReceived} bytes`);
                  res.destroy();
                  fileStream.close();
                  fs.unlink(savePath, () => {});
                  reject(new Error(`Download stalled: no data for 60s (${bytesReceived} bytes received)`));
                }, 60000);

                res.on('data', (chunk: Buffer) => {
                  bytesReceived += chunk.length;
                  if (downloadTimeout) clearTimeout(downloadTimeout);
                  downloadTimeout = setTimeout(() => {
                    console.error(`[Tripo4AE] Download stalled at ${bytesReceived}/${totalBytes || '?'} bytes`);
                    res.destroy();
                    fileStream.close();
                    fs.unlink(savePath, () => {});
                    reject(new Error(`Download stalled: no data for 60s (${bytesReceived} bytes received)`));
                  }, 60000);

                  if (onProgress) onProgress(bytesReceived, totalBytes);

                  // Log progress every 1MB or at 10% intervals
                  if (totalBytes > 0) {
                    const pct = Math.floor((bytesReceived / totalBytes) * 100);
                    if (pct - lastProgressLog >= 10) {
                      lastProgressLog = pct;
                      console.log(`[Tripo4AE] Download progress: ${pct}% (${bytesReceived}/${totalBytes})`);
                    }
                  } else if (bytesReceived - lastProgressLog > 1048576) {
                    lastProgressLog = bytesReceived;
                    console.log(`[Tripo4AE] Download progress: ${(bytesReceived / 1048576).toFixed(1)} MB`);
                  }
                });

                fileStream.on('finish', () => {
                  if (downloadTimeout) clearTimeout(downloadTimeout);
                  fileStream.close();
                  console.log(`[Tripo4AE] Download complete: ${savePath} (${bytesReceived} bytes)`);
                  resolve(savePath);
                });

                fileStream.on('error', (err: any) => {
                  if (downloadTimeout) clearTimeout(downloadTimeout);
                  console.error(`[Tripo4AE] File write error:`, err);
                  fileStream.close();
                  fs.unlink(savePath, () => {});
                  reject(err);
                });
              });

              req.on('timeout', () => {
                console.error(`[Tripo4AE] Connection timed out (60s)`);
                req.destroy();
                fs.unlink(savePath, () => {});
                reject(new Error('Download connection timed out (60s)'));
              });

              req.on('error', (err: any) => {
                console.error(`[Tripo4AE] Download request error:`, err.message);
                fs.unlink(savePath, () => {});
                reject(new Error(`Download network error: ${err.message}`));
              });
            } catch (urlErr: any) {
              console.error(`[Tripo4AE] Download setup error:`, urlErr);
              reject(urlErr);
            }
          });
        };

        try {
          return await downloadWithNode(url);
        } catch (err: any) {
          console.error('[Tripo4AE] Node.js download failed, falling back to fetch:', err.message);
        }
      }
    }

    // Browser/Fetch fallback (used for tests, or as a last-resort fallback)
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Failed to download model: HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (fs) {
      fs.writeFileSync(savePath, buffer);
    } else {
      throw new Error('Cannot save file: Node.js fs not available');
    }
    return savePath;
  }

  /**
   * Download best available model from a completed task.
   * Uses pbr_model > model > base_model priority.
   * Returns local file path.
   */
  async downloadTaskResult(task: TripoTask, saveDir: string, onProgress?: (bytesReceived: number, totalBytes: number) => void): Promise<string> {
    // Background download of the thumbnail
    if (task.output?.rendered_image) {
      this.downloadThumbnail(task, saveDir).catch((err) => {
        console.warn(`[Tripo4AE] Background thumbnail download failed for task ${task.task_id}:`, err);
      });
    }

    const url = this.getModelUrl(task.output);
    if (!url) {
      console.error(`[Tripo4AE] No model URL in task ${task.task_id}. output keys:`, Object.keys(task.output || {}));
      throw new Error(`No model URL found in task ${task.task_id} output`);
    }

    console.log(`[Tripo4AE] downloadTaskResult: task=${task.task_id} url=${url.substring(0, 80)}...`);

    const nodePath = getNodePath();
    let urlPath = '';
    try {
      urlPath = new URL(url).pathname;
    } catch (e) {
      console.warn(`[Tripo4AE] Invalid URL format for model: ${url}`, e);
    }
    const ext = (nodePath && urlPath) ? nodePath.extname(urlPath) || '.glb' : '.glb';
    const fileName = `${task.task_id}${ext}`;
    const savePath = nodePath ? nodePath.join(saveDir, fileName) : `${saveDir}/${fileName}`;

    return this.downloadModel(url, savePath, onProgress);
  }

  /**
   * Get local thumbnail path for a given taskId.
   */
  static getLocalThumbnailPath(taskId: string): string {
    const saveDir = TripoApiService.getModelSaveDir();
    if (!saveDir) return '';
    const nodePath = getNodePath();
    const fileName = `${taskId}_thumb.png`;
    return nodePath ? nodePath.join(saveDir, fileName) : `${saveDir}/${fileName}`;
  }

  /**
   * Download model thumbnail (rendered_image) from a completed task.
   * Returns local file path.
   */
  async downloadThumbnail(task: TripoTask, saveDir: string): Promise<string | undefined> {
    const url = task.output?.rendered_image;
    if (!url) return undefined;

    const nodePath = getNodePath();
    const fileName = `${task.task_id}_thumb.png`;
    const savePath = nodePath ? nodePath.join(saveDir, fileName) : `${saveDir}/${fileName}`;

    try {
      await this.downloadModel(url, savePath);
      return savePath;
    } catch (e) {
      console.warn(`[Tripo4AE] Failed to download thumbnail for task ${task.task_id}:`, e);
      return undefined;
    }
  }

  /**
   * Get default save directory for models.
   */
  static getModelSaveDir(): string {
    const nodePath = getNodePath();
    const nodeOs = getNodeOs();
    const home = nodeOs ? nodeOs.homedir() : '';
    return nodePath ? nodePath.join(home, 'Documents', 'Tripo4AE', 'Models') : '';
  }

  /**
   * Upload image file using File object's arrayBuffer (works in CEP browser).
   */
  async uploadImage(fileOrPath: File | string): Promise<string> {
    let fileName: string;
    let blob: Blob;

    if (typeof fileOrPath === 'string') {
      // Local file path — read via CEP Node.js
      const fs = getNodeFs();
      const nodePath = getNodePath();
      if (!fs || !nodePath) {
        throw new Error('Node.js fs not available for file upload');
      }
      const fileBuffer = fs.readFileSync(fileOrPath);
      fileName = nodePath.basename(fileOrPath);
      const ext = fileName.split('.').pop()?.toLowerCase();
      const mimeMap: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };
      blob = new Blob([fileBuffer], { type: mimeMap[ext || ''] || 'image/jpeg' });
    } else {
      // File object from drag-drop / file input
      fileName = fileOrPath.name;
      const arrayBuffer = await fileOrPath.arrayBuffer();
      blob = new Blob([arrayBuffer], { type: fileOrPath.type || 'image/jpeg' });
    }

    const formData = new FormData();
    formData.append('file', blob, fileName);

    const response = await this.client.postMultipart<TripoApiResponse<{ image_token: string }>>(
      '/upload/sts',
      formData,
    );
    return response.data.image_token;
  }
}
