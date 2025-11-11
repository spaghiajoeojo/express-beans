import { createHash } from 'node:crypto';
import { Cache } from '@/ExpressBeansTypes';
import { logger, registeredMethods } from '@/core';
import type { Request, Response } from 'express';
import { Executor } from '@/core/executor';

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
    Executor.setExecution('init', () => {
      const bean = registeredMethods.get(method);
      bean?._interceptors.set(context.name as string, (target: any, _prop: string) => {

        return (...args: any[]) => {
          let keyObj: any = { args };
          if (isRoute(args)) {
            const [req, res] = args;
            keyObj = {
              url: req.url,
              method: req.method,
              params: req.params,
              query: req.query,
              body: req.body,
            };
            const key = createKey(keyObj);
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

              return method.call(target, ...args);
            }
          } else {
            const key = createKey(keyObj);
            try {
              const cached = getCachedData(cache, key);
              logger.debug(`Cache hit for method ${String(context.name)} with key ${key}`);
              return cached.data;
            } catch {
              logger.debug(`Cache miss for method ${String(context.name)} with key ${key}`);
              const result = method.apply(target, args);
              cache.set(key, {
                data: result,
                expiration: Date.now() + options.duration,
              });
              return result;
            }
          }
        };


      });
    });
    return method;
  };
}
