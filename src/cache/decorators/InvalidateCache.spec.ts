import { randomUUID } from 'crypto';
import { Cached } from '@/cache/decorators/Cached';
import { InvalidateCache } from '@/cache/decorators/InvalidateCache';
import { caches } from '@/cache';
import { logger, registeredBeans, registeredMethods } from '@/core';
import { Executor } from '@/core/executor';

jest.mock('@/core', () => ({
  registeredBeans: new Map(),
  registeredMethods: new Map(),
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const createProxy = (actualBean: any) => new Proxy(actualBean, {
  get(target, prop) {
    const interceptor = (target as any)._interceptors.get(prop as string);
    if (interceptor) {
      return interceptor(target, prop as string);
    }
    return target[prop as keyof typeof target];
  }
});

describe('InvalidateCache.ts', () => {
  beforeEach(async () => {
    jest.resetAllMocks();
    registeredMethods.clear();
    registeredBeans.clear();
    caches.clear();
    await Executor.stopLifecycle();
  });

  it('invalidates a cache when the decorated method is called', async () => {
    // GIVEN
    class Class {
      @Cached()
      getUUIDCached() {
        return randomUUID();
      }

      @InvalidateCache('getUUIDCached')
      invalidate() {
        return undefined;
      }
    }
    const bean = createProxy(new Class());
    (bean as any)._interceptors = new Map();
    registeredBeans.set('Class', bean as any);
    registeredMethods.set(bean.getUUIDCached, bean as any);
    registeredMethods.set(bean.invalidate, bean as any);
    await Executor.execute();

    // WHEN
    const resultCache = bean.getUUIDCached();
    expect(bean.getUUIDCached()).toStrictEqual(resultCache);
    bean.invalidate();

    // THEN
    expect(bean.getUUIDCached()).not.toStrictEqual(resultCache);
  });

  it('invalidates a cache when an async decorated method is called', async () => {
    // GIVEN
    class Class {
      @Cached()
      getUUIDCached() {
        return randomUUID();
      }

      @InvalidateCache('getUUIDCached')
      async invalidate() {
        return undefined;
      }
    }
    const bean = createProxy(new Class());
    (bean as any)._interceptors = new Map();
    registeredBeans.set('Class', bean as any);
    registeredMethods.set(bean.getUUIDCached, bean as any);
    registeredMethods.set(bean.invalidate, bean as any);
    await Executor.execute();

    // WHEN
    const resultCache = bean.getUUIDCached();
    expect(bean.getUUIDCached()).toStrictEqual(resultCache);
    await bean.invalidate();

    // THEN
    expect(bean.getUUIDCached()).not.toStrictEqual(resultCache);
  });

  it('returns the result of the decorated method', async () => {
    // GIVEN
    class Class {
      @Cached()
      getUUIDCached() {
        return randomUUID();
      }

      @InvalidateCache('getUUIDCached')
      invalidate() {
        return 'invalidated';
      }
    }
    const bean = createProxy(new Class());
    (bean as any)._interceptors = new Map();
    registeredBeans.set('Class', bean as any);
    registeredMethods.set(bean.getUUIDCached, bean as any);
    registeredMethods.set(bean.invalidate, bean as any);
    await Executor.execute();

    // WHEN
    const result = bean.invalidate();

    // THEN
    expect(result).toBe('invalidated');
  });

  it('forwards arguments to the decorated method', async () => {
    // GIVEN
    class Class {
      @Cached()
      getUUIDCached() {
        return randomUUID();
      }

      @InvalidateCache('getUUIDCached')
      invalidate(a: number, b: number) {
        return a + b;
      }
    }
    const bean = createProxy(new Class());
    (bean as any)._interceptors = new Map();
    registeredBeans.set('Class', bean as any);
    registeredMethods.set(bean.getUUIDCached, bean as any);
    registeredMethods.set(bean.invalidate, bean as any);
    await Executor.execute();

    // WHEN
    const result = bean.invalidate(40, 2);

    // THEN
    expect(result).toBe(42);
  });

  it('does not throw when the referenced cache does not exist', async () => {
    // GIVEN
    class Class {
      @InvalidateCache('nonExistentCache')
      invalidate() {
        return 'done';
      }
    }
    const bean = createProxy(new Class());
    (bean as any)._interceptors = new Map();
    registeredBeans.set('Class', bean as any);
    registeredMethods.set(bean.invalidate, bean as any);
    await Executor.execute();

    // WHEN / THEN
    expect(() => bean.invalidate()).not.toThrow();
    expect(bean.invalidate()).toBe('done');
    expect(logger.warn).toHaveBeenCalledWith('No cache found for "nonExistentCache", nothing to invalidate');
  });

  it('only invalidates the referenced cache, leaving other caches intact', async () => {
    // GIVEN
    class Class {
      @Cached()
      getUUIDCachedA() {
        return randomUUID();
      }

      @Cached()
      getUUIDCachedB() {
        return randomUUID();
      }

      @InvalidateCache('getUUIDCachedA')
      invalidate() {
        return undefined;
      }
    }
    const bean = createProxy(new Class());
    (bean as any)._interceptors = new Map();
    registeredBeans.set('Class', bean as any);
    registeredMethods.set(bean.getUUIDCachedA, bean as any);
    registeredMethods.set(bean.getUUIDCachedB, bean as any);
    registeredMethods.set(bean.invalidate, bean as any);
    await Executor.execute();

    // WHEN
    const resultA = bean.getUUIDCachedA();
    const resultB = bean.getUUIDCachedB();
    bean.invalidate();

    // THEN
    expect(bean.getUUIDCachedA()).not.toStrictEqual(resultA);
    expect(bean.getUUIDCachedB()).toStrictEqual(resultB);
  });

  it('does not collide between two different beans exposing a method with the same name', async () => {
    // GIVEN
    class CacheOwner {
      @Cached()
      getUUIDCached() {
        return randomUUID();
      }

      @InvalidateCache('getUUIDCached')
      invalidate() {
        return undefined;
      }
    }
    const beanA = createProxy(new CacheOwner());
    (beanA as any)._interceptors = new Map();
    (beanA as any)._beanUUID = 'bean-a';
    const beanB = createProxy(new CacheOwner());
    (beanB as any)._interceptors = new Map();
    (beanB as any)._beanUUID = 'bean-b';

    registeredBeans.set('CacheOwnerA', beanA as any);
    registeredBeans.set('CacheOwnerB', beanB as any);
    registeredMethods.set(beanA.getUUIDCached, beanA as any);
    registeredMethods.set(beanA.invalidate, beanA as any);
    registeredMethods.set(beanB.getUUIDCached, beanB as any);
    registeredMethods.set(beanB.invalidate, beanB as any);
    await Executor.execute();

    // WHEN
    const resultA = beanA.getUUIDCached();
    const resultB = beanB.getUUIDCached();
    beanA.invalidate();

    // THEN
    expect(beanA.getUUIDCached()).not.toStrictEqual(resultA);
    expect(beanB.getUUIDCached()).toStrictEqual(resultB);
  });

  it('does not invalidate another bean\'s cache by method name alone, without a shared explicit name', async () => {
    // GIVEN
    class CacheOwner {
      @Cached()
      getUUIDCached() {
        return randomUUID();
      }
    }
    class Invalidator {
      @InvalidateCache('getUUIDCached')
      invalidate() {
        return undefined;
      }
    }
    const ownerBean = createProxy(new CacheOwner());
    (ownerBean as any)._interceptors = new Map();
    (ownerBean as any)._beanUUID = 'owner-uuid';
    const invalidatorBean = createProxy(new Invalidator());
    (invalidatorBean as any)._interceptors = new Map();
    (invalidatorBean as any)._beanUUID = 'invalidator-uuid';

    registeredBeans.set('CacheOwner', ownerBean as any);
    registeredBeans.set('Invalidator', invalidatorBean as any);
    registeredMethods.set(ownerBean.getUUIDCached, ownerBean as any);
    registeredMethods.set(invalidatorBean.invalidate, invalidatorBean as any);
    await Executor.execute();

    // WHEN
    const resultCache = ownerBean.getUUIDCached();
    invalidatorBean.invalidate();

    // THEN
    expect(ownerBean.getUUIDCached()).toStrictEqual(resultCache);
    expect(logger.warn).toHaveBeenCalledWith('No cache found for "getUUIDCached", nothing to invalidate');
  });

  it('invalidates a cache in another bean when they share an explicit cache name', async () => {
    // GIVEN
    class CacheOwner {
      @Cached({ duration: 60_000, name: 'sharedCache' })
      getUUIDCached() {
        return randomUUID();
      }
    }
    class Invalidator {
      @InvalidateCache('sharedCache')
      invalidate() {
        return undefined;
      }
    }
    const ownerBean = createProxy(new CacheOwner());
    (ownerBean as any)._interceptors = new Map();
    (ownerBean as any)._beanUUID = 'owner-uuid';
    const invalidatorBean = createProxy(new Invalidator());
    (invalidatorBean as any)._interceptors = new Map();
    (invalidatorBean as any)._beanUUID = 'invalidator-uuid';

    registeredBeans.set('CacheOwner', ownerBean as any);
    registeredBeans.set('Invalidator', invalidatorBean as any);
    registeredMethods.set(ownerBean.getUUIDCached, ownerBean as any);
    registeredMethods.set(invalidatorBean.invalidate, invalidatorBean as any);
    await Executor.execute();

    // WHEN
    const resultCache = ownerBean.getUUIDCached();
    expect(ownerBean.getUUIDCached()).toStrictEqual(resultCache);
    invalidatorBean.invalidate();

    // THEN
    expect(ownerBean.getUUIDCached()).not.toStrictEqual(resultCache);
  });
});
