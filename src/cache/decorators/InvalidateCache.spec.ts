import { randomUUID } from 'crypto';
import { Cached } from '@/cache/decorators/Cached';
import { InvalidateCache } from '@/cache/decorators/InvalidateCache';
import { caches } from '@/cache';
import { registeredBeans, registeredMethods } from '@/core';
import { Executor } from '@/core/executor';

jest.mock('@/core', () => ({
  registeredBeans: new Map(),
  registeredMethods: new Map(),
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
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
  beforeEach(() => {
    jest.resetAllMocks();
    registeredMethods.clear();
    registeredBeans.clear();
    caches.clear();
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
});
