export declare type ResultOk<T> = {
  ok: true,
  value: T,
};

export declare type ResultError<E = Error> = {
  ok: false,
  error: E,
};

export declare type Result<T, E = Error> = ResultOk<T> | ResultError<E>;

export declare type ResultAsync<T> = Promise<Result<T>>;

export const isOk = <T>(result: Result<T>): result is ResultOk<T> => result.ok;

export const isError = <T>(result: Result<T>): result is ResultError => !result.ok;

const commuteError = (thrown: any) => {
  if (thrown instanceof Error) {
    return thrown;
  }
  return new Error(String(thrown));
};

export const wrap = <T>(fn: () => T | Promise<T>): Result<T> | ResultAsync<T> => {
  try {
    const result = fn();

    if (result instanceof Promise) {
      return result
        .then((value) => ({ ok: true as const, value }))
        .catch((error) => ({ ok: false as const, error: commuteError(error) }));
    }

    return {
      ok: true as const,
      value: result,
    };
  } catch (error) {
    return {
      ok: false as const,
      error: commuteError(error),
    };
  }
};

export const unwrap = <T>(result: Result<T>): T => {
  if (isOk(result)) {
    return result.value;
  }
  throw result.error;
};

export const unwrapAsync = async <T>(resultAsync: ResultAsync<T>): Promise<T> => {
  const result = await resultAsync;
  if (isOk(result)) {
    return result.value;
  }
  throw result.error;
};

export const wrapValue = <T>(value: T): Result<T> => ({ ok: true as const, value });

export const wrapError = <E = Error>(error: E): ResultError<E> => ({ ok: false as const, error });
