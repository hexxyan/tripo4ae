/**
 * @jest-environment jsdom
 */

import { TaskPoller } from '../../src/client/services/taskPoller';
import type { TripoTask, TaskStatus } from '../../src/shared/types';

// ---------- helpers ----------

function makeTask(overrides: Partial<TripoTask> = {}): TripoTask {
  return {
    task_id: 'task-001',
    type: 'text_to_model',
    status: 'queued',
    input: { prompt: 'test' },
    output: {},
    progress: 0,
    create_time: 1700000000,
    ...overrides,
  };
}

function createMockApi(
  taskSequence: TripoTask[],
): { getTask: jest.Mock } {
  const calls: TripoTask[] = [...taskSequence];
  return {
    getTask: jest.fn().mockImplementation(() => {
      const task = calls.shift();
      if (!task) throw new Error('No more mock responses');
      return Promise.resolve(task);
    }),
  };
}

// ---------- test suite ----------

describe('TaskPoller', () => {
  // ---- 1. Happy path: queued -> running -> success ----

  describe('pollUntilDone() — happy path', () => {
    it('polls queued -> running -> success and calls onProgress for intermediate states', async () => {
      const mockApi = createMockApi([
        makeTask({ status: 'queued', progress: 0 }),
        makeTask({ status: 'running', progress: 50 }),
        makeTask({ status: 'success', progress: 100 }),
      ]);

      const poller = new TaskPoller(mockApi);

      // Mock delay to resolve instantly
      jest.spyOn(poller as unknown as { delay: (ms: number) => Promise<void> }, 'delay')
        .mockResolvedValue(undefined);

      const onProgress = jest.fn();

      const result = await poller.pollUntilDone('task-001', {
        interval: 100,
        timeout: 5000,
        maxAttempts: 10,
        onProgress,
      });

      expect(result.status).toBe('success');
      expect(result.progress).toBe(100);
      expect(mockApi.getTask).toHaveBeenCalledTimes(3);

      // onProgress should be called for non-terminal intermediate states (queued, running)
      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'queued' }),
      );
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'running' }),
      );
    });
  });

  // ---- 2. Failed status throws ----

  describe('pollUntilDone() — failed status', () => {
    it('throws when task status is failed', async () => {
      const mockApi = createMockApi([
        makeTask({ status: 'queued', progress: 0 }),
        makeTask({
          status: 'failed',
          progress: 50,
          error_code: 50000,
          error_msg: 'Generation failed',
        }),
      ]);

      const poller = new TaskPoller(mockApi);
      jest.spyOn(poller as unknown as { delay: (ms: number) => Promise<void> }, 'delay')
        .mockResolvedValue(undefined);

      const onProgress = jest.fn();

      await expect(
        poller.pollUntilDone('task-001', {
          interval: 100,
          timeout: 5000,
          maxAttempts: 10,
          onProgress,
        }),
      ).rejects.toThrow(/Generation failed/);

      // onProgress should have been called once (for 'queued')
      expect(onProgress).toHaveBeenCalledTimes(1);
    });
  });

  // ---- 3. Timeout exceeded ----

  describe('pollUntilDone() — timeout', () => {
    it('throws on timeout exceeded', async () => {
      const mockApi = {
        getTask: jest.fn().mockResolvedValue(
          makeTask({ status: 'running', progress: 50 }),
        ),
      };

      const poller = new TaskPoller(mockApi);
      jest.spyOn(poller as unknown as { delay: (ms: number) => Promise<void> }, 'delay')
        .mockResolvedValue(undefined);

      // Mock Date.now to simulate elapsed time
      const realNow = Date.now;
      let callCount = 0;
      const startTime = realNow();
      Date.now = jest.fn().mockImplementation(() => {
        callCount++;
        // First two calls return start time, subsequent calls return time past timeout
        if (callCount <= 2) return startTime;
        return startTime + 600; // Past the 500ms timeout
      });

      try {
        await expect(
          poller.pollUntilDone('task-001', {
            interval: 100,
            timeout: 500,
            maxAttempts: 100,
          }),
        ).rejects.toThrow(/timed out/i);
      } finally {
        Date.now = realNow;
      }
    });
  });

  // ---- 4. maxAttempts exceeded ----

  describe('pollUntilDone() — maxAttempts', () => {
    it('throws when maxAttempts exceeded', async () => {
      // Always return 'queued' so it never completes
      const mockApi = {
        getTask: jest.fn().mockResolvedValue(
          makeTask({ status: 'queued', progress: 0 }),
        ),
      };

      const poller = new TaskPoller(mockApi);
      jest.spyOn(poller as unknown as { delay: (ms: number) => Promise<void> }, 'delay')
        .mockResolvedValue(undefined);

      await expect(
        poller.pollUntilDone('task-001', {
          interval: 50,
          timeout: 30000,
          maxAttempts: 3,
        }),
      ).rejects.toThrow(/max attempt/i);

      // Should have polled exactly 3 times (maxAttempts)
      expect(mockApi.getTask).toHaveBeenCalledTimes(3);
    });
  });

  // ---- 5. Other terminal statuses throw ----

  describe('pollUntilDone() — other terminal statuses', () => {
    const nonSuccessTerminal: TaskStatus[] = ['cancelled', 'unknown', 'banned', 'expired'];

    it.each(nonSuccessTerminal)(
      'throws when task status is "%s" (terminal non-success)',
      async (status) => {
        const mockApi = createMockApi([
          makeTask({ status, progress: 0 }),
        ]);

        const poller = new TaskPoller(mockApi);

        await expect(
          poller.pollUntilDone('task-001', {
            interval: 100,
            timeout: 5000,
            maxAttempts: 10,
          }),
        ).rejects.toThrow(new RegExp(status, 'i'));

        expect(mockApi.getTask).toHaveBeenCalledTimes(1);
      },
    );
  });

  // ---- 6. Default options ----

  describe('pollUntilDone() — default options', () => {
    it('uses defaults and resolves on immediate success', async () => {
      const mockApi = createMockApi([
        makeTask({ status: 'success', progress: 100 }),
      ]);

      const poller = new TaskPoller(mockApi);

      const result = await poller.pollUntilDone('task-001');

      expect(result.status).toBe('success');
      expect(mockApi.getTask).toHaveBeenCalledTimes(1);
    });
  });

  // ---- 7. Adaptive polling with running_left_time ----

  describe('pollUntilDone() — adaptive polling with running_left_time', () => {
    it('uses adaptive interval when running_left_time is provided', async () => {
      const mockApi = createMockApi([
        // running_left_time=10 => nextInterval = max(2000, floor(10*500)) = 5000
        makeTask({ status: 'running', progress: 20, running_left_time: 10 }),
        // running_left_time=1 => nextInterval = max(2000, floor(1*500)) = 2000
        makeTask({ status: 'running', progress: 60, running_left_time: 1 }),
        makeTask({ status: 'success', progress: 100 }),
      ]);

      const poller = new TaskPoller(mockApi);

      const delaySpy = jest.spyOn(poller as unknown as { delay: (ms: number) => Promise<void> }, 'delay')
        .mockResolvedValue(undefined);

      const onProgress = jest.fn();

      const result = await poller.pollUntilDone('task-001', {
        interval: 3000,
        timeout: 5000,
        maxAttempts: 10,
        onProgress,
      });

      expect(result.status).toBe('success');
      expect(onProgress).toHaveBeenCalledTimes(2);

      // delay should have been called twice (after first two non-terminal polls)
      expect(delaySpy).toHaveBeenCalledTimes(2);

      // First call: running_left_time=10 => max(2000, 5000) = 5000
      expect(delaySpy).toHaveBeenNthCalledWith(1, 5000);
      // Second call: running_left_time=1 => max(2000, 500) = 2000
      expect(delaySpy).toHaveBeenNthCalledWith(2, 2000);
    });

    it('falls back to configured interval when running_left_time is absent', async () => {
      const mockApi = createMockApi([
        makeTask({ status: 'running', progress: 50 }),
        makeTask({ status: 'success', progress: 100 }),
      ]);

      const poller = new TaskPoller(mockApi);

      const delaySpy = jest.spyOn(poller as unknown as { delay: (ms: number) => Promise<void> }, 'delay')
        .mockResolvedValue(undefined);

      await poller.pollUntilDone('task-001', {
        interval: 3000,
        timeout: 5000,
        maxAttempts: 10,
      });

      // Without running_left_time, should use configured interval of 3000
      expect(delaySpy).toHaveBeenCalledWith(3000);
    });
  });
});
