import { BeanFunction } from '@/cache/types';
import { logger, registeredMethods } from '@/core';
import { Executor } from '@/core/executor';
import { caches, computeCacheName } from '@/cache';

/**
 * Invalidates the cache created by a `@Cached` method or route handler
 * whenever the decorated method is called.
 * @param cachedMethodName {string | symbol} name of the `@Cached` method (or route handler) whose cache should be cleared
 * @decorator
 */
export function InvalidateCache<This>(
  cachedMethodName: string | symbol,
) {
  return (
    method: BeanFunction,
    context: ClassMethodDecoratorContext<This, BeanFunction>,
  ) => {

    Executor.setExecution('init', () => {
      const bean = registeredMethods.get(method);
      bean?._interceptors.set(context.name as string, (target: any, _prop: string) => {
        return (...args: any[]) => {
          const cache = caches.get(cachedMethodName) ?? caches.get(computeCacheName(bean, cachedMethodName));
          if ( !cache ) {
            logger.warn(`No cache found for "${String(cachedMethodName)}", nothing to invalidate`);
          } else {
            cache.clear();
          }
          return method.call(target, ...args);
        };

      });
    });
    return method;
  };
}
