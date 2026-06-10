import * as fs from 'fs';
import * as path from 'path';
import { TripoHttpClient } from './httpClient';
import type { TripoTaskRequest, TripoTask, BalanceResponse } from '../../shared/types';

interface TripoApiResponse<T> {
  code: number;
  data: T;
}

export class TripoApiService {
  private client: TripoHttpClient;

  constructor(apiKey: string) {
    this.client = new TripoHttpClient(apiKey);
  }

  /**
   * Returns the best available model URL from task output.
   * Priority: pbr_model > model > base_model (matches official plugin patterns).
   */
  getModelUrl(output: { pbr_model?: string; model?: string; base_model?: string }): string | null {
    if (output.pbr_model) return output.pbr_model;
    if (output.model) return output.model;
    if (output.base_model) return output.base_model;
    return null;
  }

  /**
   * Convenience method: downloads the best available model from a completed task.
   * Returns the local file path.
   */
  async downloadTaskResult(task: TripoTask, saveDir: string): Promise<string> {
    const url = this.getModelUrl(task.output);
    if (!url) {
      throw new Error(`No model URL found in task ${task.task_id} output`);
    }

    // Determine extension from URL (default to .glb)
    const urlPath = new URL(url).pathname;
    const ext = path.extname(urlPath) || '.glb';
    const fileName = `${task.task_id}${ext}`;
    const savePath = path.join(saveDir, fileName);

    return this.downloadModel(url, savePath);
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

  async downloadModel(url: string, savePath: string): Promise<string> {
    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to download model: HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure directory exists
    const dir = path.dirname(savePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(savePath, buffer);
    return savePath;
  }

  async uploadImage(filePath: string): Promise<string> {
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer as any]), fileName);

    const response = await this.client.postMultipart<TripoApiResponse<{ image_token: string }>>(
      '/upload/sts',
      formData,
    );
    return response.data.image_token;
  }
}
