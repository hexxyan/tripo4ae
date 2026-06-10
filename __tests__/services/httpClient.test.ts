import { TripoHttpClient } from '../../src/client/services/httpClient';
import { TRIPO_API_BASE } from '../../src/shared/constants';

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
    headers: new Headers(overrides.headers instanceof Headers ? overrides.headers : undefined),
    json: async () => body,
    text: async () => JSON.stringify(body),
    clone() { return resp; },
  } as unknown as Response;

  return resp;
}

// ---------- test suite ----------

describe('TripoHttpClient', () => {
  let client: TripoHttpClient;
  const API_KEY = 'test-api-key-123';
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeAll(() => {
    originalFetch = globalThis.fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    client = new TripoHttpClient(API_KEY);
  });

  // ---- 1. Constructor & headers ----

  describe('constructor and getHeaders', () => {
    it('uses default baseUrl from TRIPO_API_BASE', () => {
      expect(client).toBeDefined();
    });

    it('allows overriding baseUrl', async () => {
      const customUrl = 'https://custom.api.example.com';
      const customClient = new TripoHttpClient(API_KEY, customUrl);
      const fakeResp = mockFetchResponse({ json: { data: 'ok' } });
      const fetchMock = jest.fn().mockResolvedValue(fakeResp);
      globalThis.fetch = fetchMock;

      await customClient.get('/test');
      expect(fetchMock).toHaveBeenCalledWith(
        `${customUrl}/test`,
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('sets Authorization header with Bearer token', () => {
      const headers = client.getHeaders();
      expect(headers).toEqual({
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      });
    });
  });

  // ---- 2. GET ----

  describe('get()', () => {
    it('sends GET request and returns parsed response', async () => {
      const responseData = { data: { task_id: 'abc-123' } };
      const fakeResp = mockFetchResponse({ json: responseData });
      const fetchMock = jest.fn().mockResolvedValue(fakeResp);
      globalThis.fetch = fetchMock;

      const result = await client.get('/task/abc-123');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        `${TRIPO_API_BASE}/task/abc-123`,
        expect.objectContaining({
          method: 'GET',
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
          },
        }),
      );
      expect(result).toEqual(responseData);
    });
  });

  // ---- 3. POST ----

  describe('post()', () => {
    it('sends JSON body and returns parsed response', async () => {
      const requestBody = { type: 'text_to_model', prompt: 'a cat' };
      const responseData = { code: 200, data: { task_id: 'task-xyz' } };
      const fakeResp = mockFetchResponse({ json: responseData });
      const fetchMock = jest.fn().mockResolvedValue(fakeResp);
      globalThis.fetch = fetchMock;

      const result = await client.post('/task', requestBody);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        `${TRIPO_API_BASE}/task`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }),
      );
      expect(result).toEqual(responseData);
    });
  });

  // ---- 4. Error handling ----

  describe('handleResponse() — error handling', () => {
    it('throws on non-ok response with error message', async () => {
      const errorBody = {
        code: 40001,
        message: 'Invalid API key',
        suggestion: 'Check your API key in settings',
      };
      const fakeResp = mockFetchResponse({
        ok: false,
        status: 401,
        json: errorBody,
      });
      globalThis.fetch = jest.fn().mockResolvedValue(fakeResp);

      await expect(client.get('/task/test')).rejects.toThrow(/Invalid API key/);
    });

    it('includes code and suggestion in thrown error', async () => {
      const errorBody = {
        code: 40001,
        message: 'Invalid API key',
        suggestion: 'Check your API key in settings',
      };
      const fakeResp = mockFetchResponse({
        ok: false,
        status: 401,
        json: errorBody,
      });
      globalThis.fetch = jest.fn().mockResolvedValue(fakeResp);

      try {
        await client.get('/task/test');
        fail('Should have thrown');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(Error);
        const e = err as Error & { code?: number; suggestion?: string };
        expect(e.message).toContain('Invalid API key');
        expect(e.code).toBe(40001);
        expect(e.suggestion).toBe('Check your API key in settings');
      }
    });

    it('throws with status text when JSON has no message', async () => {
      const fakeResp = mockFetchResponse({
        ok: false,
        status: 500,
        json: {},
      });
      globalThis.fetch = jest.fn().mockResolvedValue(fakeResp);

      await expect(client.post('/task', {})).rejects.toThrow(/500/);
    });
  });

  // ---- 5. Retry on 429 ----

  describe('retry on 429 with exponential backoff', () => {
    it('retries on 429 and eventually succeeds', async () => {
      const successBody = { data: { task_id: 'retried-task' } };
      const errorBody = { code: 42900, message: 'Rate limited' };

      const rateLimitResp = mockFetchResponse({
        ok: false,
        status: 429,
        json: errorBody,
      });
      const successResp = mockFetchResponse({
        ok: true,
        status: 200,
        json: successBody,
      });

      const fetchMock = jest.fn()
        .mockResolvedValueOnce(rateLimitResp)
        .mockResolvedValueOnce(rateLimitResp)
        .mockResolvedValueOnce(successResp);
      globalThis.fetch = fetchMock;

      // Spy on delay to avoid actual waiting
      const delaySpy = jest.spyOn(client as unknown as { delay: (ms: number) => Promise<void> }, 'delay').mockResolvedValue(undefined);

      const result = await client.post('/task', { type: 'text_to_model', prompt: 'a dog' });

      // Should have retried twice before success
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(delaySpy).toHaveBeenCalledTimes(2);
      // First retry: base delay (1000ms), second retry: 1000 * 2^1 = 2000ms
      expect(delaySpy).toHaveBeenNthCalledWith(1, 1000);
      expect(delaySpy).toHaveBeenNthCalledWith(2, 2000);
      expect(result).toEqual(successBody);
    });

    it('stops retrying after max retries and throws', async () => {
      const errorBody = { code: 42900, message: 'Rate limited' };
      const rateLimitResp = mockFetchResponse({
        ok: false,
        status: 429,
        json: errorBody,
      });

      const fetchMock = jest.fn().mockResolvedValue(rateLimitResp);
      globalThis.fetch = fetchMock;

      // Spy on delay to avoid actual waiting
      jest.spyOn(client as unknown as { delay: (ms: number) => Promise<void> }, 'delay').mockResolvedValue(undefined);

      await expect(client.post('/task', {})).rejects.toThrow(/Rate limited/);

      // Default max retries = 3, so 1 initial + 3 retries = 4 total
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it('does not retry on non-429 errors', async () => {
      const errorBody = { code: 40001, message: 'Bad request' };
      const badResp = mockFetchResponse({
        ok: false,
        status: 400,
        json: errorBody,
      });

      const fetchMock = jest.fn().mockResolvedValue(badResp);
      globalThis.fetch = fetchMock;

      await expect(client.post('/task', {})).rejects.toThrow(/Bad request/);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  // ---- 6. postMultipart ----

  describe('postMultipart()', () => {
    it('sends FormData without Content-Type header', async () => {
      const formData = new FormData();
      formData.append('file', new Blob(['test']), 'test.png');

      const responseData = { data: { file_token: 'ft-123' } };
      const fakeResp = mockFetchResponse({ json: responseData });
      const fetchMock = jest.fn().mockResolvedValue(fakeResp);
      globalThis.fetch = fetchMock;

      const result = await client.postMultipart('/upload', formData);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const callArgs = fetchMock.mock.calls[0][1] as RequestInit;
      expect(callArgs.method).toBe('POST');
      expect(callArgs.body).toBe(formData);

      // Should NOT include Content-Type header (browser sets boundary)
      const headers = callArgs.headers as Record<string, string>;
      expect(headers['Content-Type']).toBeUndefined();
      expect(headers['Authorization']).toBe(`Bearer ${API_KEY}`);

      expect(result).toEqual(responseData);
    });
  });
});
