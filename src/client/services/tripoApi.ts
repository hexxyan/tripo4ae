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

  getModelUrl(output: { pbr_model?: string; model?: string; base_model?: string }): string | null {
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
    return response.data.task_id;
  }

  async getTask(taskId: string): Promise<TripoTask> {
    const response = await this.client.get<TripoApiResponse<TripoTask>>(
      `/task/${taskId}`,
    );
    return response.data;
  }

  async getBalance(): Promise<BalanceResponse> {
    const response = await this.client.get<TripoApiResponse<BalanceResponse>>(
      '/user/balance',
    );
    return response.data;
  }

  /**
   * Download model from URL to local disk via CEP Node.js.
   * Returns local file path.
   */
  async downloadModel(url: string, savePath: string): Promise<string> {
    const fs = getNodeFs();
    const nodePath = getNodePath();

    if (!fs || !nodePath) {
      throw new Error('Node.js fs not available — CEP Node.js integration required');
    }

    const dir = nodePath.dirname(savePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Determine if we are inside the CEP context with Node.js modules
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

              const requestOptions = {
                timeout: 45000, // 45 seconds timeout
                // Bypass SSL certificate checks if behind a proxy/firewall that intercepts certificates
                rejectUnauthorized: false,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
              };

              const req = protocol.get(targetUrl, requestOptions, (res: any) => {
                // Handle HTTP Redirects (301, 302, 303, 307, 308)
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                  const redirectUrl = new URL(res.headers.location, targetUrl).toString();
                  resolve(downloadWithNode(redirectUrl, redirectCount + 1));
                  return;
                }

                if (res.statusCode !== 200) {
                  reject(new Error(`Failed to download model: HTTP status ${res.statusCode}`));
                  return;
                }

                const fileStream = fs.createWriteStream(savePath);
                res.pipe(fileStream);

                fileStream.on('finish', () => {
                  fileStream.close();
                  resolve(savePath);
                });

                fileStream.on('error', (err: any) => {
                  fs.unlink(savePath, () => {}); // Delete the partial file on error
                  reject(err);
                });
              });

              req.on('timeout', () => {
                req.destroy();
                fs.unlink(savePath, () => {});
                reject(new Error('Download request timed out (45s)'));
              });

              req.on('error', (err: any) => {
                fs.unlink(savePath, () => {});
                reject(err);
              });
            } catch (urlErr) {
              reject(urlErr);
            }
          });
        };

        try {
          return await downloadWithNode(url);
        } catch (err: any) {
          console.warn('Node.js download failed, falling back to fetch:', err);
          // Fallback to fetch below
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
    fs.writeFileSync(savePath, buffer);
    return savePath;
  }

  /**
   * Download best available model from a completed task.
   * Uses pbr_model > model > base_model priority.
   * Returns local file path.
   */
  async downloadTaskResult(task: TripoTask, saveDir: string): Promise<string> {
    const url = this.getModelUrl(task.output);
    if (!url) {
      throw new Error(`No model URL found in task ${task.task_id} output`);
    }

    const nodePath = getNodePath();
    const urlPath = new URL(url).pathname;
    const ext = nodePath ? nodePath.extname(urlPath) || '.glb' : '.glb';
    const fileName = `${task.task_id}${ext}`;
    const savePath = nodePath ? nodePath.join(saveDir, fileName) : `${saveDir}/${fileName}`;

    return this.downloadModel(url, savePath);
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
      blob = new Blob([fileBuffer]);
    } else {
      // File object from drag-drop / file input
      fileName = fileOrPath.name;
      const arrayBuffer = await fileOrPath.arrayBuffer();
      blob = new Blob([arrayBuffer]);
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
