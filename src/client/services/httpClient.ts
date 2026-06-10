import { TRIPO_API_BASE } from '../../shared/constants';

export interface TripoError extends Error {
  code?: number;
  suggestion?: string;
  status?: number;
}

interface PostOptions {
  maxRetries?: number;
  baseDelay?: number;
}

export class TripoHttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl: string = TRIPO_API_BASE) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private getMultipartHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  async get<T = unknown>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(response);
  }

  async post<T = unknown>(
    path: string,
    body: unknown,
    options: PostOptions = {},
  ): Promise<T> {
    const { maxRetries = 3, baseDelay = 1000 } = options;
    const url = `${this.baseUrl}${path}`;

    let lastError: TripoError | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      if (response.status === 429 && attempt < maxRetries) {
        const backoff = baseDelay * Math.pow(2, attempt);
        await this.delay(backoff);
        continue;
      }

      return this.handleResponse<T>(response);
    }

    // Should not reach here, but just in case
    throw lastError ?? new Error('Max retries exceeded');
  }

  async postMultipart<T = unknown>(
    path: string,
    formData: FormData,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getMultipartHeaders(),
      body: formData,
    });
    return this.handleResponse<T>(response);
  }

  async handleResponse<T>(response: Response): Promise<T> {
    if (response.ok) {
      return response.json() as Promise<T>;
    }

    let data: Record<string, unknown> = {};
    try {
      data = await response.json();
    } catch {
      // If response body is not JSON, fall through
    }

    const message =
      (data.message as string) ||
      (data.error as string) ||
      `HTTP ${response.status}: ${response.statusText}`;
    const code = data.code as number | undefined;
    const suggestion = data.suggestion as string | undefined;

    const error = new Error(message) as TripoError;
    error.code = code;
    error.suggestion = suggestion;
    error.status = response.status;

    throw error;
  }

  delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
