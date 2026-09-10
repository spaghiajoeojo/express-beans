import { randomUUID } from 'crypto';
import { Cached } from '@/cache/decorators/Cached';
import { caches } from '@/cache';
import { registeredBeans, registeredMethods } from '@/core';
import { Executor } from '@/core/executor';
import { isError } from '@/core/errors';

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

describe('Cached.ts', () => {
  beforeEach(async () => {
    jest.resetAllMocks();
    registeredMethods.clear();
    registeredBeans.clear();
    await Executor.stopLifecycle();
  });

  it('execute a cached function', async () => {
    // GIVEN
    class Class {
      @Cached()
      getUUIDCached() {
        return randomUUID();
      }

      getUUID() {
        return randomUUID();
      }
    }
    const bean = createProxy(new Class());
    (bean as any)._interceptors = new Map();
    registeredBeans.set('Class', bean as any);
    registeredMethods.set(bean.getUUID, bean as any);
    registeredMethods.set(bean.getUUIDCached, bean as any);
    await Executor.execute();

    // WHEN
    const resultNoCache = bean.getUUID();
    const resultCache = bean.getUUIDCached();

    // THEN
    expect(bean.getUUID()).not.toStrictEqual(resultNoCache);
    expect(bean.getUUIDCached()).toStrictEqual(resultCache);
  });

  it('execute an async cached function', async () => {
    // GIVEN
    class Class {
      @Cached()
      async getUUIDCached() {
        return randomUUID();
      }

      async getUUID() {
        return randomUUID();
      }
    }
    const bean = createProxy(new Class());
    (bean as any)._interceptors = new Map();
    registeredBeans.set('Class', bean as any);
    registeredMethods.set(bean.getUUID, bean as any);
    registeredMethods.set(bean.getUUIDCached, bean as any);
    await Executor.execute();

    // WHEN
    const resultNoCache = await bean.getUUID();
    const resultCache = await bean.getUUIDCached();

    // THEN
    expect(await bean.getUUID()).not.toStrictEqual(resultNoCache);
    expect(await bean.getUUIDCached()).toStrictEqual(resultCache);
  });

  it('caches a function by its arguments', async () => {
    // GIVEN
    class Class {
      @Cached()
      getUUIDCached(anArgument: string) {
        return `${randomUUID()}/${anArgument}`;
      }
    }
    const bean = createProxy(new Class());
    (bean as any)._interceptors = new Map();
    registeredBeans.set('Class', bean as any);
    registeredMethods.set(bean.getUUIDCached, bean as any);
    await Executor.execute();

    // WHEN
    const resultCache = bean.getUUIDCached('first');

    // THEN
    expect(bean.getUUIDCached('second')).not.toStrictEqual(resultCache);
    expect(bean.getUUIDCached('first')).toStrictEqual(resultCache);
  });

  it('caches an async function by its arguments', async () => {
    // GIVEN
    class Class {
      @Cached()
      async getUUIDCached(anArgument: string) {
        return `${randomUUID()}/${anArgument}`;
      }
    }
    const bean = createProxy(new Class());
    (bean as any)._interceptors = new Map();
    registeredBeans.set('Class', bean as any);
    registeredMethods.set(bean.getUUIDCached, bean as any);
    await Executor.execute();

    // WHEN
    const resultCache = await bean.getUUIDCached('first');

    // THEN
    expect(await bean.getUUIDCached('second')).not.toStrictEqual(resultCache);
    expect(await bean.getUUIDCached('first')).toStrictEqual(resultCache);
  });

  it('invalidates a cache when expired', async () => {
    // GIVEN
    class Class {
      @Cached()
      getUUIDCached() {
        return randomUUID();
      }
    }
    const bean = createProxy(new Class());
    (bean as any)._interceptors = new Map();
    registeredBeans.set('Class', bean as any);
    registeredMethods.set(bean.getUUIDCached, bean as any);
    await Executor.execute();

    // WHEN
    const resultCache = bean.getUUIDCached();
    expect(bean.getUUIDCached()).toStrictEqual(resultCache);
    jest.useFakeTimers().setSystemTime(Date.now() + 60_001);

    // THEN
    expect(bean.getUUIDCached()).not.toStrictEqual(resultCache);
  });

  it('registers the cache under a custom name when provided', async () => {
    // GIVEN
    class Class {
      @Cached({ duration: 60_000, name: 'customCacheName' })
      getUUIDCached() {
        return randomUUID();
      }
    }
    const bean = createProxy(new Class());
    (bean as any)._interceptors = new Map();
    registeredBeans.set('Class', bean as any);
    registeredMethods.set(bean.getUUIDCached, bean as any);
    await Executor.execute();

    // WHEN
    bean.getUUIDCached();

    // THEN
    expect(caches.has('customCacheName')).toBe(true);
  });

  it('fails the init phase when the owning bean is not registered', async () => {
    // GIVEN
    class Class {
      @Cached()
      getUUIDCached() {
        return randomUUID();
      }
    }
    createProxy(new Class());
    // intentionally not registering the bean/method mapping
    Executor.once('error', () => {});

    // WHEN
    const results = await Executor.execute();

    // THEN
    expect(
      results.some((result) => isError(result) && result.error.message.includes('Bean not found')),
    ).toBe(true);
  });
});
