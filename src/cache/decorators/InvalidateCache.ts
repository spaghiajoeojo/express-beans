import { BeanFunction } from '@/cache/types';
import { registeredMethods } from '@/core';
import { Executor } from '@/core/executor';
import { caches } from '@/cache';

/**
 * Invalidates specific cache when called this method
 * @param CachedMethodName {string | symbol}
 * @decorator
 */
export function InvalidateCache<This>(
  CachedMethodName: string | symbol,
) {
  return (
    method: BeanFunction,
    context: ClassMethodDecoratorContext<This, BeanFunction>,
  ) => {

    Executor.setExecution('init', () => {
      const bean = registeredMethods.get(method);
      bean?._interceptors.set(context.name as string, (target: any, _prop: string) => {
        return (...args: any[]) => {
          caches.get(CachedMethodName)
            ?.clear();
          return method.call(target, ...args);
        };

      });
    });
    return method;
  };
}
