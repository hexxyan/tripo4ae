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

    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Failed to download model: HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const dir = nodePath.dirname(savePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

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
