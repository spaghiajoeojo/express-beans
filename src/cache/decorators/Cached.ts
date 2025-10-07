import { createHash } from 'node:crypto';
import { Cache } from '@/ExpressBeansTypes';
import { logger } from '@/core';
import type { Request, Response } from 'express';

type BeanFunction = (...args: any) => any
type CacheEntry = {
  data: ReturnType<BeanFunction>,
  expiration: number,
}

const createKey = (obj: any) => createHash('sha224')
  .update(JSON.stringify(obj))
  .digest('hex');

const getCachedData = (cache: Map<string, CacheEntry>, key: string) => {
  const cached = cache.get(key);
  if (!cached) {
    throw new Error(`Key ${key} not found in cache`);
  }
  if (cached.expiration < Date.now()) {
    cache.delete(key);
    throw new Error(`Key ${key} expired in cache`);
  }
  return cached;
};

const isRoute = (args: unknown[]): args is [Request, Response] => {
  if (args.length !== 2) {
    return false;
  }
  const potentialReq = args[0] as any;
  const potentialRes = args[1] as any;

  return (
    potentialReq &&
    typeof potentialReq === 'object' &&
    'url' in potentialReq &&
    'method' in potentialReq &&
    'params' in potentialReq &&
    'query' in potentialReq &&
    potentialRes &&
    typeof potentialRes === 'object' &&
    'send' in potentialRes &&
    'json' in potentialRes
  );
};

/**
 * Caches the result of a method
 * @param options {Cache}
 * @decorator
 */
export function Cached<This>(
  options: Cache = { duration: 60_000, type: 'memory' },
) {
  return (
    method: BeanFunction,
    context: ClassMethodDecoratorContext<This, BeanFunction>,
  ) => {
    logger.debug(`Initializing cache for method ${String(context.name)}`);
    const cache = new Map<string, CacheEntry>();
    return function (this: any, ...args: any) {
      if (isRoute(args)) {
        const req = args[0];
        const res = args[1];

        const key = createKey({
          url: req.url,
          method: req.method,
          params: req.params,
          query: req.query
        });

        try {
          const result = getCachedData(cache, key);
          logger.debug(`Returning cached data for ${key}`);
          return res.send(result.data);
        } catch (error) {
          logger.debug(error);

          const originalSend = res.send.bind(res);
          res.send = function (body: any) {
            cache.set(key, {
              data: body,
              expiration: Date.now() + options.duration,
            });
            return originalSend(body);
          };

          return method.call(this, ...args);
        }
      } else {
        const key = createKey(args);

        try {
          const result = getCachedData(cache, key);
          logger.debug(`Returning cached data for ${key}`);
          return result.data;
        } catch (error) {
          logger.debug(error);
          const computed = method.call(this, ...args);
          cache.set(key, {
            data: computed,
            expiration: Date.now() + options.duration,
          });
          return computed;
        }
      }
    };
  };
}
