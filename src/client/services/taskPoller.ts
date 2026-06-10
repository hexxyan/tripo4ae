import type { TripoTask, TaskStatus } from '../../shared/types';

const TERMINAL_STATUSES: TaskStatus[] = ['success', 'failed', 'cancelled', 'unknown', 'banned', 'expired'];

export interface PollOptions {
  interval?: number;      // default 2000ms
  maxInterval?: number;   // default 5000ms
  timeout?: number;       // default 300000ms (5 min)
  maxAttempts?: number;   // default 150
  onProgress?: (task: TripoTask) => void;
}

export class TaskPoller {
  private api: { getTask: (id: string) => Promise<TripoTask> };

  constructor(api: { getTask: (id: string) => Promise<TripoTask> }) {
    this.api = api;
  }

  async pollUntilDone(taskId: string, options?: PollOptions): Promise<TripoTask> {
    const defaultInterval = options?.interval ?? 2000;
    const maxInterval = options?.maxInterval ?? 5000;
    const timeout = options?.timeout ?? 300000;
    const maxAttempts = options?.maxAttempts ?? 150;
    const onProgress = options?.onProgress;

    const startTime = Date.now();
    let attempts = 0;

    while (attempts < maxAttempts) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= timeout) {
        throw new Error(`Polling timed out after ${timeout}ms`);
      }

      const task = await this.api.getTask(taskId);
      attempts++;

      if (TERMINAL_STATUSES.includes(task.status)) {
        if (task.status === 'success') {
          return task;
        }
        const errorMsg = task.error_msg || `Task ended with status: ${task.status}`;
        throw new Error(errorMsg);
      }

      // Non-terminal status — notify progress
      if (onProgress) {
        onProgress(task);
      }

      // Adaptive interval: use running_left_time if available, otherwise configured interval
      let nextInterval = defaultInterval;
      if (task.running_left_time != null && task.running_left_time > 0) {
        nextInterval = Math.max(2000, Math.floor(task.running_left_time * 500));
      }
      nextInterval = Math.min(maxInterval, nextInterval);

      // Wait before next poll
      await this.delay(nextInterval);
    }

    throw new Error(`Max attempts (${maxAttempts}) exceeded while polling task ${taskId}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
