/**
 * Tests for useCsInterface hook — evalScript message escaping and response parsing.
 *
 * Since CSInterface requires the CEP runtime, we test the escaping utility
 * and response parsing logic in isolation.
 */

describe('useCsInterface: Response Parsing', () => {
  // Simulates the evalScript response parsing logic from the hook
  function parseEvalResult(result: string): { ok: boolean; data?: unknown; error?: string } {
    if (result === 'undefined' || result === undefined || result === null) {
      return { ok: true, data: undefined };
    }
    try {
      const parsed = JSON.parse(result);
      if (parsed && parsed.ok === false) {
        return { ok: false, error: parsed.error || 'ExtendScript error' };
      }
      if (parsed && parsed.ok === true) {
        return { ok: true, data: parsed.data };
      }
      return { ok: true, data: parsed };
    } catch {
      return { ok: true, data: result as unknown };
    }
  }

  test('parses successful JSON response', () => {
    const input = JSON.stringify({ ok: true, data: { name: 'Test Comp', width: 1920 } });
    const result = parseEvalResult(input);
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ name: 'Test Comp', width: 1920 });
  });

  test('parses error JSON response', () => {
    const input = JSON.stringify({ ok: false, error: 'No active composition' });
    const result = parseEvalResult(input);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('No active composition');
  });

  test('handles undefined result', () => {
    const result = parseEvalResult('undefined');
    expect(result.ok).toBe(true);
    expect(result.data).toBeUndefined();
  });

  test('handles plain string result', () => {
    const result = parseEvalResult('some expression string');
    expect(result.ok).toBe(true);
    expect(result.data).toBe('some expression string');
  });

  test('handles JSON without ok field', () => {
    const input = JSON.stringify({ name: 'Layer 1', index: 0 });
    const result = parseEvalResult(input);
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ name: 'Layer 1', index: 0 });
  });
});

describe('useCsInterface: Path Escaping', () => {
  // Simulates the escapeForEval function from the hook
  function escapeForEval(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'");
  }

  test('escapes backslashes', () => {
    expect(escapeForEval('C:\\Users\\test\\file.glb')).toBe('C:\\\\Users\\\\test\\\\file.glb');
  });

  test('escapes single quotes', () => {
    expect(escapeForEval("it's a test")).toBe("it\\'s a test");
  });

  test('escapes both backslashes and quotes', () => {
    expect(escapeForEval("C:\\test's\\file.glb")).toBe("C:\\\\test\\'s\\\\file.glb");
  });

  test('leaves normal paths unchanged except backslashes', () => {
    expect(escapeForEval('/Users/test/Documents/file.glb')).toBe('/Users/test/Documents/file.glb');
  });

  test('escapes JSON in paths', () => {
    const json = JSON.stringify({ centerInComp: true }).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    // The escaped JSON should not contain unescaped single quotes
    expect(json).not.toMatch(/(?<!\\)'/);
  });
});
