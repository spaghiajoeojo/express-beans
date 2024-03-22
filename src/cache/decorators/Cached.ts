import { createHash } from 'node:crypto';
import { Cache } from '@/ExpressBeansTypes';
import { logger, registeredMethods } from '@/core';

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
    return (...args: any) => {
      const key = createKey(args);
      let result;
      try {
        result = getCachedData(cache, key);
        logger.debug(`Returning cached data for ${key}`);
      } catch (error) {
        logger.debug(error);
        const computed = method.bind(registeredMethods.get(method))(...args);
        cache.set(key, {
          data: computed,
          expiration: Date.now() + options.duration,
        });
        return computed;
      }
      logger.debug(result);
      return result.data;
    };
  };
}
