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
  describe('Type Guards', () => {
    describe('isOk', () => {
      it('returns true for successful results', () => {
        const result: Result<string> = { ok: true, value: 'success' };
        expect(isOk(result)).toBe(true);
      });

      it('returns false for error results', () => {
        const result: Result<string> = { ok: false, error: new Error('failed') };
        expect(isOk(result)).toBe(false);
      });

      it('narrows type correctly for successful results', () => {
        const result: Result<number> = { ok: true, value: 42 };
        if (isOk(result)) {
          // TypeScript should infer result.value as number
          expect(typeof result.value).toBe('number');
          expect(result.value).toBe(42);
        }
      });
    });

    describe('isError', () => {
      it('returns false for successful results', () => {
        const result: Result<string> = { ok: true, value: 'success' };
        expect(isError(result)).toBe(false);
      });

      it('returns true for error results', () => {
        const result: Result<string> = { ok: false, error: new Error('failed') };
        expect(isError(result)).toBe(true);
      });

      it('narrows type correctly for error results', () => {
        const error = new Error('test error');
        const result: Result<string> = { ok: false, error };
        if (isError(result)) {
          // TypeScript should infer result.error as Error
          expect(result.error).toBe(error);
          expect(result.error.message).toBe('test error');
        }
      });
    });
  });

  describe('wrap', () => {
    describe('synchronous functions', () => {
      it('wraps successful synchronous function calls', () => {
        const fn = () => 'success';
        const result = wrap(fn);

        expect(result).toEqual({ ok: true, value: 'success' });
        expect(isOk(result as Result<string>)).toBe(true);
      });

      it('wraps failed synchronous function calls', () => {
        const error = new Error('sync error');
        const fn = () => { throw error; };
        const result = wrap(fn);

        expect(result).toEqual({ ok: false, error });
        expect(isError(result as Result<string>)).toBe(true);
      });

      it('converts non-Error exceptions to Error objects', () => {
        // eslint-disable-next-line no-throw-literal
        const fn = () => { throw 'string error'; };
        const result = wrap(fn) as Result<string>;

        expect(isError(result)).toBe(true);
        if (isError(result)) {
          expect(result.error).toBeInstanceOf(Error);
          expect(result.error.message).toBe('string error');
        }
      });

      it('handles null and undefined throws', () => {
        // eslint-disable-next-line no-throw-literal
        const fnNull = () => { throw null; };
        // eslint-disable-next-line no-throw-literal
        const fnUndefined = () => { throw undefined; };

        const resultNull = wrap(fnNull) as Result<any>;
        const resultUndefined = wrap(fnUndefined) as Result<any>;

        expect(isError(resultNull)).toBe(true);
        expect(isError(resultUndefined)).toBe(true);

        if (isError(resultNull)) {
          expect(resultNull.error.message).toBe('null');
        }
        if (isError(resultUndefined)) {
          expect(resultUndefined.error.message).toBe('undefined');
        }
      });
    });

    describe('asynchronous functions', () => {
      it('wraps successful async function calls', async () => {
        const fn = async () => 'async success';
        const resultPromise = wrap(fn);

        expect(resultPromise).toBeInstanceOf(Promise);
        const result = await resultPromise;
        expect(result).toEqual({ ok: true, value: 'async success' });
      });

      it('wraps failed async function calls', async () => {
        const error = new Error('async error');
        const fn = async () => { throw error; };
        const resultPromise = wrap(fn);

        expect(resultPromise).toBeInstanceOf(Promise);
        const result = await resultPromise;
        expect(result).toEqual({ ok: false, error });
      });

      it('handles async functions that return promises', async () => {
        const fn = () => Promise.resolve(42);
        const resultPromise = wrap(fn);

        const result = await resultPromise;
        expect(result).toEqual({ ok: true, value: 42 });
      });

      it('handles async functions that return rejected promises', async () => {
        const error = new Error('rejected promise');
        const fn = () => Promise.reject(error);
        const resultPromise = wrap(fn);

        const result = await resultPromise;
        expect(result).toEqual({ ok: false, error });
      });

      it('converts non-Error async exceptions to Error objects', async () => {
        // eslint-disable-next-line no-throw-literal
        const fn = async () => { throw 'async string error'; };
        const result = await wrap(fn);

        expect(isError(result)).toBe(true);
        if (isError(result)) {
          expect(result.error).toBeInstanceOf(Error);
          expect(result.error.message).toBe('async string error');
        }
      });
    });
  });

  describe('unwrap', () => {
    it('returns value for successful results', () => {
      const result: Result<string> = { ok: true, value: 'success' };
      const value = unwrap(result);
      expect(value).toBe('success');
    });

    it('throws error for failed results', () => {
      const error = new Error('unwrap error');
      const result: Result<string> = { ok: false, error };

      expect(() => unwrap(result)).toThrow(error);
    });

    it('preserves original error when throwing', () => {
      const originalError = new Error('original message');
      originalError.name = 'CustomError';
      const result: Result<string> = { ok: false, error: originalError };

      expect(() => unwrap(result)).toThrow(originalError);
      try {
        unwrap(result);
      } catch (thrownError) {
        expect(thrownError).toBe(originalError);
        expect((thrownError as Error).name).toBe('CustomError');
      }
    });
  });

  describe('unwrapAsync', () => {
    it('returns value for successful async results', async () => {
      const resultPromise: ResultAsync<string> = Promise.resolve({ ok: true, value: 'async success' });
      const value = await unwrapAsync(resultPromise);
      expect(value).toBe('async success');
    });

    it('throws error for failed async results', async () => {
      const error = new Error('async unwrap error');
      const resultPromise: ResultAsync<string> = Promise.resolve({ ok: false, error });

      await expect(unwrapAsync(resultPromise)).rejects.toThrow(error);
    });

    it('preserves original error when throwing', async () => {
      const originalError = new Error('async original message');
      originalError.name = 'AsyncCustomError';
      const resultPromise: ResultAsync<string> = Promise
        .resolve({ ok: false, error: originalError });

      try {
        await unwrapAsync(resultPromise);
        fail('Should have thrown');
      } catch (thrownError) {
        expect(thrownError).toBe(originalError);
        expect((thrownError as Error).name).toBe('AsyncCustomError');
      }
    });

    it('handles rejected promises', async () => {
      const rejectionError = new Error('promise rejection');
      const resultPromise: ResultAsync<string> = Promise.reject(rejectionError);

      await expect(unwrapAsync(resultPromise)).rejects.toThrow(rejectionError);
    });
  });

  describe('wrapValue', () => {
    it('wraps primitive values', () => {
      expect(wrapValue('string')).toEqual({ ok: true, value: 'string' });
      expect(wrapValue(42)).toEqual({ ok: true, value: 42 });
      expect(wrapValue(true)).toEqual({ ok: true, value: true });
    });

    it('wraps object values', () => {
      const obj = { key: 'value' };
      const result = wrapValue(obj);

      expect(result).toEqual({ ok: true, value: obj });
      expect(isOk(result)).toBe(true);
      expect((result as ResultOk<typeof obj>).value).toBe(obj);
    });

    it('wraps null and undefined', () => {
      expect(wrapValue(null)).toEqual({ ok: true, value: null });
      expect(wrapValue(undefined)).toEqual({ ok: true, value: undefined });
    });

    it('creates proper ResultOk type', () => {
      const result = wrapValue('test');
      expect(isOk(result)).toBe(true);
      expect(isError(result)).toBe(false);
    });
  });

  describe('wrapError', () => {
    it('wraps Error objects', () => {
      const error = new Error('test error');
      const result = wrapError(error);

      expect(result).toEqual({ ok: false, error });
      expect(isError(result)).toBe(true);
      expect(isOk(result)).toBe(false);
    });

    it('wraps custom error types', () => {
      class CustomError extends Error {
        constructor(message: string, public code: number) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const customError = new CustomError('custom message', 404);
      const result = wrapError(customError);

      expect(result).toEqual({ ok: false, error: customError });
      expect(result.error).toBe(customError);
    });

    it('wraps non-Error values', () => {
      const stringError = 'string error';
      const result = wrapError(stringError);

      expect(result).toEqual({ ok: false, error: stringError });
      expect(result.error).toBe(stringError);
    });

    it('creates proper ResultError type', () => {
      const error = new Error('test');
      const result = wrapError(error);

      expect(isError(result)).toBe(true);
      expect(isOk(result)).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('works with complete success flow', () => {
      const fn = () => 'integration test';
      const wrapped = wrap(fn) as Result<string>;

      expect(isOk(wrapped)).toBe(true);
      const unwrapped = unwrap(wrapped);
      expect(unwrapped).toBe('integration test');
    });

    it('works with complete error flow', () => {
      const error = new Error('integration error');
      const fn = () => { throw error; };
      const wrapped = wrap(fn) as Result<string>;

      expect(isError(wrapped)).toBe(true);
      expect(() => unwrap(wrapped)).toThrow(error);
    });

    it('works with async success flow', async () => {
      const fn = async () => 'async integration';
      const wrapped = await wrap(fn);

      expect(isOk(wrapped)).toBe(true);
      const unwrapped = unwrap(wrapped);
      expect(unwrapped).toBe('async integration');
    });

    it('works with async error flow', async () => {
      const error = new Error('async integration error');
      const fn = async () => { throw error; };
      const wrapped = await wrap(fn);

      expect(isError(wrapped)).toBe(true);
      expect(() => unwrap(wrapped)).toThrow(error);
    });

    it('chains operations correctly', async () => {
      const step1 = () => 10;
      const step2 = (x: number) => x * 2;
      const step3 = (x: number) => `Result: ${x}`;

      const result1 = wrap(step1) as Result<number>;
      expect(isOk(result1)).toBe(true);

      const value1 = unwrap(result1);
      const result2 = wrap(() => step2(value1)) as Result<number>;
      expect(isOk(result2)).toBe(true);

      const value2 = unwrap(result2);
      const result3 = wrap(() => step3(value2)) as Result<string>;
      expect(isOk(result3)).toBe(true);

      const finalValue = unwrap(result3);
      expect(finalValue).toBe('Result: 20');
    });
  });
});
