import type { TripoTask, TaskStatus } from '../../shared/types';

const TERMINAL_STATUSES: TaskStatus[] = ['success', 'failed', 'cancelled', 'unknown', 'banned', 'expired'];

export interface WsPollOptions {
  onProgress?: (task: TripoTask) => void;
  timeout?: number;  // default 300000ms
}

/**
 * WebSocket-based task watcher for real-time progress updates.
 *
 * Uses the Tripo WebSocket endpoint `wss://api.tripo3d.ai/v2/openapi/task/watch/{task_id}`
 * for real-time status, as seen in the official Cocos plugin.
 *
 * The official Cocos plugin (Node.js) passes auth via headers:
 *   new WebSocket(url, { headers: { Authorization: `Bearer ${apiKey}` } })
 *
 * Since browser WebSocket does not support custom headers, we pass the API key
 * as a query parameter: `?token=<apiKey>`.
 */
export class TaskWsPoller {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async watchUntilDone(taskId: string, options: WsPollOptions = {}): Promise<TripoTask> {
    const { onProgress, timeout = 300000 } = options;

    return new Promise<TripoTask>((resolve, reject) => {
      const url = `wss://api.tripo3d.ai/v2/openapi/task/watch/${taskId}?token=${encodeURIComponent(this.apiKey)}`;
      const ws = new WebSocket(url);

      const timer = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket polling timed out'));
      }, timeout);

      ws.onopen = () => {
        // Connection established; server will begin sending status updates
      };

      ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data as string);
          const task = response.data as TripoTask;

          if (TERMINAL_STATUSES.includes(task.status)) {
            clearTimeout(timer);
            ws.close();
            if (task.status === 'success') {
              resolve(task);
            } else {
              reject(new Error(`Task ${task.status}: ${task.error_msg || 'Unknown error'}`));
            }
            return;
          }

          if (onProgress) onProgress(task);
        } catch (_e) {
          // Ignore parse errors, keep listening
        }
      };

      ws.onerror = () => {
        clearTimeout(timer);
        // Fallback: reject, caller should fall back to HTTP polling
        reject(new Error('WebSocket connection failed'));
      };

      ws.onclose = () => {
        clearTimeout(timer);
      };
    });
  }
}
