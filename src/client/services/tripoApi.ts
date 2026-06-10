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
