/**
 * @jest-environment jsdom
 */

// Mock 'fs' before any imports that use it
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue(Buffer.from('fake-image-data')),
}));

import * as fs from 'fs';
import { TripoApiService } from '../../src/client/services/tripoApi';
import type { TripoTaskRequest, TripoTask, BalanceResponse } from '../../src/shared/types';

// ---------- helpers ----------

function mockFetchResponse(
  overrides: Partial<Response> & { json?: unknown } = {}
) {
  const body = overrides.json ?? {};
  const ok = overrides.ok ?? true;
  const status = overrides.status ?? (ok ? 200 : 400);

  const resp = {
    ok,
    status,
    statusText: overrides.statusText ?? (ok ? 'OK' : 'Error'),
    headers: new Headers(),
    json: async () => body,
    text: async () => JSON.stringify(body),
    blob: async () => new Blob([new Uint8Array([1, 2, 3])], { type: 'application/octet-stream' }),
    clone() { return resp; },
  } as unknown as Response;

  return resp;
}

// ---------- test suite ----------

describe('TripoApiService', () => {
  let api: TripoApiService;
  const API_KEY = 'test-api-key-123';
  let originalFetch: typeof globalThis.fetch | undefined;
  let originalCep: unknown;
  let originalRequire: unknown;

  beforeAll(() => {
    originalFetch = globalThis.fetch;
    originalCep = (window as any).cep;
    originalRequire = (globalThis as any).require;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
    if (originalCep === undefined) {
      delete (window as any).cep;
    } else {
      (window as any).cep = originalCep;
    }
    if (originalRequire === undefined) {
      delete (globalThis as any).require;
    } else {
      (globalThis as any).require = originalRequire;
    }
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    globalThis.fetch = jest.fn();
    (window as any).cep = {};
    (globalThis as any).require = jest.fn((moduleName: string) => {
      if (moduleName === 'fs') return fs;
      if (moduleName === 'path') return jest.requireActual('path');
      if (moduleName === 'os') return { homedir: () => '/tmp' };
      if (moduleName === 'https' || moduleName === 'http') return null;
      throw new Error(`Unexpected module require: ${moduleName}`);
    });
    api = new TripoApiService(API_KEY);

    // Reset fs mocks
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('fake-image-data'));
  });

  // ---- 1. createTask ----

  describe('createTask()', () => {
    it('sends correct type and returns task_id', async () => {
      const request: TripoTaskRequest = {
        type: 'text_to_model',
        prompt: 'a cute cat',
      } as TripoTaskRequest;

      const responseData = {
        code: 200,
        data: { task_id: 'task-abc-123' },
      };
      const fakeResp = mockFetchResponse({ json: responseData });
      const fetchMock = jest.fn().mockResolvedValue(fakeResp);
      globalThis.fetch = fetchMock;

      const taskId = await api.createTask(request);

      expect(taskId).toBe('task-abc-123');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Verify it was a POST to /task with correct body
      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/task');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body as string)).toEqual(expect.objectContaining({
        type: 'text_to_model',
        prompt: 'a cute cat',
      }));
    });
  });

  // ---- 2. getTask ----

  describe('getTask()', () => {
    it('returns parsed TripoTask', async () => {
      const taskData: TripoTask = {
        task_id: 'task-xyz-456',
        type: 'text_to_model',
        status: 'success',
        input: { prompt: 'a cat' },
        output: {
          model: 'https://cdn.example.com/model.glb',
          rendered_image: 'https://cdn.example.com/render.png',
          consumed_credit: 10,
        },
        progress: 100,
        create_time: 1700000000,
      };

      const responseData = {
        code: 200,
        data: taskData,
      };
      const fakeResp = mockFetchResponse({ json: responseData });
      const fetchMock = jest.fn().mockResolvedValue(fakeResp);
      globalThis.fetch = fetchMock;

      const task = await api.getTask('task-xyz-456');

      expect(task).toEqual(taskData);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Verify GET to /task/{taskId}
      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/task/task-xyz-456');
      expect(options.method).toBe('GET');
    });
  });

  // ---- 3. getBalance ----

  describe('getBalance()', () => {
    it('returns balance data', async () => {
      const balanceData: BalanceResponse = {
        balance: 500,
        frozen: 50,
      };

      const responseData = {
        code: 200,
        data: balanceData,
      };
      const fakeResp = mockFetchResponse({ json: responseData });
      const fetchMock = jest.fn().mockResolvedValue(fakeResp);
      globalThis.fetch = fetchMock;

      const balance = await api.getBalance();

      expect(balance).toEqual(balanceData);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Verify GET to /user/balance
      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/user/balance');
      expect(options.method).toBe('GET');
    });
  });

  // ---- 4. downloadModel ----

  describe('downloadModel()', () => {
    it('fetches binary and writes file', async () => {
      const modelUrl = 'https://cdn.example.com/model.glb';
      const savePath = '/tmp/test-model.glb';
      const binaryData = new Uint8Array([1, 2, 3, 4, 5]);

      const blobResp = {
        ok: true,
        status: 200,
        arrayBuffer: async () => binaryData.buffer,
      } as unknown as Response;

      const fetchMock = jest.fn().mockResolvedValue(blobResp);
      globalThis.fetch = fetchMock;

      const result = await api.downloadModel(modelUrl, savePath);

      expect(result).toBe(savePath);

      // Verify fetch was called for the model URL
      expect(fetchMock).toHaveBeenCalledWith(
        modelUrl,
        expect.objectContaining({ method: 'GET' }),
      );

      // Verify fs.writeFileSync was called with the save path
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        savePath,
        expect.any(Buffer),
      );
    });

    it('creates parent directory if it does not exist', async () => {
      const modelUrl = 'https://cdn.example.com/model.glb';
      const savePath = '/tmp/nested/dir/model.glb';
      const binaryData = new Uint8Array([1, 2, 3]);

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const blobResp = {
        ok: true,
        status: 200,
        arrayBuffer: async () => binaryData.buffer,
      } as unknown as Response;

      globalThis.fetch = jest.fn().mockResolvedValue(blobResp);

      await api.downloadModel(modelUrl, savePath);

      expect(fs.mkdirSync).toHaveBeenCalledWith('/tmp/nested/dir', { recursive: true });
    });
  });

  // ---- 5. uploadImage ----

  describe('uploadImage()', () => {
    it('sends multipart form and returns image_token', async () => {
      const responseData = {
        code: 200,
        data: { image_token: 'img-token-789' },
      };
      const fakeResp = mockFetchResponse({ json: responseData });
      const fetchMock = jest.fn().mockResolvedValue(fakeResp);
      globalThis.fetch = fetchMock;

      const imageToken = await api.uploadImage('/path/to/image.png');

      expect(imageToken).toBe('img-token-789');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Verify it's a POST to /upload/sts
      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/upload/sts');
      expect(options.method).toBe('POST');

      // Verify the body is FormData
      expect(options.body).toBeInstanceOf(FormData);

      // Verify fs.readFileSync was called to read the file
      expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/image.png');
    });
  });
});
