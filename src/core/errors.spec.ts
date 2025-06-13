import { fail } from '@test/utils/testUtils';
import {
  Result,
  ResultAsync,
  isOk,
  isError,
  wrap,
  unwrap,
  unwrapAsync,
  wrapValue,
  wrapError,
  ResultOk,
} from '@/core/errors';

describe('Result Types', () => {

  it('isOk returns true for successful results', () => {
    // GIVEN
    const result: Result<string> = { ok: true, value: 'success' };

    // WHEN
    const isOkResult = isOk(result);

    // THEN
    expect(isOkResult).toBe(true);
  });

  it('isOk returns false for error results', () => {
    // GIVEN
    const result: Result<string> = { ok: false, error: new Error('failed') };

    // WHEN
    const isOkResult = isOk(result);

    // THEN
    expect(isOkResult).toBe(false);
  });

  it('isOk narrows type correctly for successful results', () => {
    // GIVEN
    const result: Result<number> = { ok: true, value: 42 };

    // WHEN
    if (isOk(result)) {
      // THEN
      expect(typeof result.value).toBe('number');
      expect(result.value).toBe(42);
    }
  });

  it('isError returns false for successful results', () => {
    // GIVEN
    const result: Result<string> = { ok: true, value: 'success' };

    // WHEN
    const isErrorResult = isError(result);

    // THEN
    expect(isErrorResult).toBe(false);
  });

  it('isError returns true for error results', () => {
    // GIVEN
    const result: Result<string> = { ok: false, error: new Error('failed') };

    // WHEN
    const isErrorResult = isError(result);

    // THEN
    expect(isErrorResult).toBe(true);
  });

  it('isError narrows type correctly for error results', () => {
    // GIVEN
    const error = new Error('test error');
    const result: Result<string> = { ok: false, error };

    // WHEN
    if (isError(result)) {
      // THEN
      expect(result.error).toBe(error);
      expect(result.error.message).toBe('test error');
    }
  });

  it('wrap wraps successful synchronous function calls', () => {
    // GIVEN
    const fn = () => 'success';

    // WHEN
    const result = wrap(fn);

    // THEN
    expect(result).toEqual({ ok: true, value: 'success' });
    expect(isOk(result as Result<string>)).toBe(true);
  });

  it('wrap wraps failed synchronous function calls', () => {
    // GIVEN
    const error = new Error('sync error');
    const fn = () => { throw error; };

    // WHEN
    const result = wrap(fn);

    // THEN
    expect(result).toEqual({ ok: false, error });
    expect(isError(result as Result<string>)).toBe(true);
  });

  it('wrap converts non-Error exceptions to Error objects', () => {
    // GIVEN
    const fn = () => { throw 'string error'; };

    // WHEN
    const result = wrap(fn) as Result<string>;

    // THEN
    expect(isError(result)).toBe(true);
    if (isError(result)) {
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('string error');
    }
  });

  it('wrap handles null and undefined throws', () => {
    // GIVEN
    const fnNull = () => { throw null; };
    const fnUndefined = () => { throw undefined; };

    // WHEN
    const resultNull = wrap(fnNull) as Result<any>;
    const resultUndefined = wrap(fnUndefined) as Result<any>;

    // THEN
    expect(isError(resultNull)).toBe(true);
    expect(isError(resultUndefined)).toBe(true);

    if (isError(resultNull)) {
      expect(resultNull.error.message).toBe('null');
    }
    if (isError(resultUndefined)) {
      expect(resultUndefined.error.message).toBe('undefined');
    }
  });

  it('wrap wraps successful async function calls', async () => {
    // GIVEN
    const fn = async () => 'async success';

    // WHEN
    const resultPromise = wrap(fn);

    // THEN
    expect(resultPromise).toBeInstanceOf(Promise);
    const result = await resultPromise;
    expect(result).toEqual({ ok: true, value: 'async success' });
  });

  it('wrap wraps failed async function calls', async () => {
    // GIVEN
    const error = new Error('async error');
    const fn = async () => { throw error; };

    // WHEN
    const resultPromise = wrap(fn);

    // THEN
    expect(resultPromise).toBeInstanceOf(Promise);
    const result = await resultPromise;
    expect(result).toEqual({ ok: false, error });
  });

  it('wrap handles async functions that return promises', async () => {
    // GIVEN
    const fn = () => Promise.resolve(42);

    // WHEN
    const resultPromise = wrap(fn);

    // THEN
    const result = await resultPromise;
    expect(result).toEqual({ ok: true, value: 42 });
  });

  it('wrap handles async functions that return rejected promises', async () => {
    // GIVEN
    const error = new Error('rejected promise');
    const fn = () => Promise.reject(error);

    // WHEN
    const resultPromise = wrap(fn);

    // THEN
    const result = await resultPromise;
    expect(result).toEqual({ ok: false, error });
  });

  it('wrap converts non-Error async exceptions to Error objects', async () => {
    // GIVEN
    const fn = async () => { throw 'async string error'; };

    // WHEN
    const result = await wrap(fn);

    // THEN
    expect(isError(result)).toBe(true);
    if (isError(result)) {
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('async string error');
    }
  });

  it('unwrap returns value for successful results', () => {
    // GIVEN
    const result: Result<string> = { ok: true, value: 'success' };

    // WHEN
    const value = unwrap(result);

    // THEN
    expect(value).toBe('success');
  });

  it('unwrap throws error for failed results', () => {
    // GIVEN
    const error = new Error('unwrap error');
    const result: Result<string> = { ok: false, error };

    // WHEN & THEN
    expect(() => unwrap(result)).toThrow(error);
  });

  it('unwrap preserves original error when throwing', () => {
    // GIVEN
    const originalError = new Error('original message');
    originalError.name = 'CustomError';
    const result: Result<string> = { ok: false, error: originalError };

    // WHEN & THEN
    expect(() => unwrap(result)).toThrow(originalError);
    try {
      unwrap(result);
    } catch (thrownError) {
      expect(thrownError).toBe(originalError);
      expect((thrownError as Error).name).toBe('CustomError');
    }
  });

  it('unwrapAsync returns value for successful async results', async () => {
    // GIVEN
    const resultPromise: ResultAsync<string> = Promise.resolve({ ok: true, value: 'async success' });

    // WHEN
    const value = await unwrapAsync(resultPromise);

    // THEN
    expect(value).toBe('async success');
  });

  it('unwrapAsync throws error for failed async results', async () => {
    // GIVEN
    const error = new Error('async unwrap error');
    const resultPromise: ResultAsync<string> = Promise.resolve({ ok: false, error });

    // WHEN & THEN
    await expect(unwrapAsync(resultPromise)).rejects.toThrow(error);
  });

  it('unwrapAsync preserves original error when throwing', async () => {
    // GIVEN
    const originalError = new Error('async original message');
    originalError.name = 'AsyncCustomError';
    const resultPromise: ResultAsync<string> = Promise
      .resolve({ ok: false, error: originalError });

    // WHEN & THEN
    try {
      await unwrapAsync(resultPromise);
      fail('Should have thrown');
    } catch (thrownError) {
      expect(thrownError).toBe(originalError);
      expect((thrownError as Error).name).toBe('AsyncCustomError');
    }
  });

  it('unwrapAsync handles rejected promises', async () => {
    // GIVEN
    const rejectionError = new Error('promise rejection');
    const resultPromise: ResultAsync<string> = Promise.reject(rejectionError);

    // WHEN & THEN
    await expect(unwrapAsync(resultPromise)).rejects.toThrow(rejectionError);
  });

  it('wrapValue wraps primitive values', () => {
    // GIVEN
    const stringValue = 'string';
    const numberValue = 42;
    const booleanValue = true;

    // WHEN & THEN
    expect(wrapValue(stringValue)).toEqual({ ok: true, value: 'string' });
    expect(wrapValue(numberValue)).toEqual({ ok: true, value: 42 });
    expect(wrapValue(booleanValue)).toEqual({ ok: true, value: true });
  });

  it('wrapValue wraps object values', () => {
    // GIVEN
    const obj = { key: 'value' };

    // WHEN
    const result = wrapValue(obj);

    // THEN
    expect(result).toEqual({ ok: true, value: obj });
    expect(isOk(result)).toBe(true);
    expect((result as ResultOk<typeof obj>).value).toBe(obj);
  });

  it('wrapValue wraps null and undefined', () => {
    // GIVEN
    const nullValue = null;
    const undefinedValue = undefined;

    // WHEN & THEN
    expect(wrapValue(nullValue)).toEqual({ ok: true, value: null });
    expect(wrapValue(undefinedValue)).toEqual({ ok: true, value: undefined });
  });

  it('wrapValue creates proper ResultOk type', () => {
    // GIVEN
    const testValue = 'test';

    // WHEN
    const result = wrapValue(testValue);

    // THEN
    expect(isOk(result)).toBe(true);
    expect(isError(result)).toBe(false);
  });

  it('wrapError wraps Error objects', () => {
    // GIVEN
    const error = new Error('test error');

    // WHEN
    const result = wrapError(error);

    // THEN
    expect(result).toEqual({ ok: false, error });
    expect(isError(result)).toBe(true);
    expect(isOk(result)).toBe(false);
  });

  it('wrapError wraps custom error types', () => {
    // GIVEN
    class CustomError extends Error {
      constructor(message: string, public code: number) {
        super(message);
        this.name = 'CustomError';
      }
    }
    const customError = new CustomError('custom message', 404);

    // WHEN
    const result = wrapError(customError);

    // THEN
    expect(result).toEqual({ ok: false, error: customError });
    expect(result.error).toBe(customError);
  });

  it('wrapError wraps non-Error values', () => {
    // GIVEN
    const stringError = 'string error';

    // WHEN
    const result = wrapError(stringError);

    // THEN
    expect(result).toEqual({ ok: false, error: stringError });
    expect(result.error).toBe(stringError);
  });

  it('wrapError creates proper ResultError type', () => {
    // GIVEN
    const error = new Error('test');

    // WHEN
    const result = wrapError(error);

    // THEN
    expect(isError(result)).toBe(true);
    expect(isOk(result)).toBe(false);
  });

  it('integration - works with complete success flow', () => {
    // GIVEN
    const fn = () => 'integration test';

    // WHEN
    const wrapped = wrap(fn) as Result<string>;

    // THEN
    expect(isOk(wrapped)).toBe(true);
    const unwrapped = unwrap(wrapped);
    expect(unwrapped).toBe('integration test');
  });

  it('integration - works with complete error flow', () => {
    // GIVEN
    const error = new Error('integration error');
    const fn = () => { throw error; };

    // WHEN
    const wrapped = wrap(fn) as Result<string>;

    // THEN
    expect(isError(wrapped)).toBe(true);
    expect(() => unwrap(wrapped)).toThrow(error);
  });

  it('integration - works with async success flow', async () => {
    // GIVEN
    const fn = async () => 'async integration';

    // WHEN
    const wrapped = await wrap(fn);

    // THEN
    expect(isOk(wrapped)).toBe(true);
    const unwrapped = unwrap(wrapped);
    expect(unwrapped).toBe('async integration');
  });

  it('integration - works with async error flow', async () => {
    // GIVEN
    const error = new Error('async integration error');
    const fn = async () => { throw error; };

    // WHEN
    const wrapped = await wrap(fn);

    // THEN
    expect(isError(wrapped)).toBe(true);
    expect(() => unwrap(wrapped)).toThrow(error);
  });

  it('integration - chains operations correctly', async () => {
    // GIVEN
    const step1 = () => 10;
    const step2 = (x: number) => x * 2;
    const step3 = (x: number) => `Result: ${x}`;

    // WHEN
    const result1 = wrap(step1) as Result<number>;
    expect(isOk(result1)).toBe(true);

    const value1 = unwrap(result1);
    const result2 = wrap(() => step2(value1)) as Result<number>;
    expect(isOk(result2)).toBe(true);

    const value2 = unwrap(result2);
    const result3 = wrap(() => step3(value2)) as Result<string>;
    expect(isOk(result3)).toBe(true);

    const finalValue = unwrap(result3);

    // THEN
    expect(finalValue).toBe('Result: 20');
  });
});
