import { randomUUID } from 'crypto';
import { Cached } from '@/cache/decorators/Cached';
import { registeredBeans, registeredMethods } from '@/core';

jest.mock('@/core', () => ({
  registeredBeans: new Map(),
  registeredMethods: new Map(),
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Cached.ts', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    registeredMethods.clear();
    registeredBeans.clear();
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
    const bean = new Class();
    registeredMethods.set(bean.getUUID, bean as any);
    registeredMethods.set(bean.getUUIDCached, bean as any);
    registeredBeans.set('Class', bean as any);

    // WHEN
    const resultNoCache = bean.getUUID();
    const resultCache = bean.getUUIDCached();

    // THEN
    expect(bean.getUUID()).not.toBe(resultNoCache);
    expect(bean.getUUIDCached()).toBe(resultCache);
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
    const bean = new Class();
    registeredMethods.set(bean.getUUID, bean as any);
    registeredMethods.set(bean.getUUIDCached, bean as any);
    registeredBeans.set('Class', bean as any);

    // WHEN
    const resultNoCache = await bean.getUUID();
    const resultCache = await bean.getUUIDCached();

    // THEN
    expect(await bean.getUUID()).not.toBe(resultNoCache);
    expect(await bean.getUUIDCached()).toBe(resultCache);
  });

  it('caches a function by its arguments', async () => {
    // GIVEN
    class Class {
      @Cached()
      getUUIDCached(anArgument: string) {
        return `${randomUUID()}/${anArgument}`;
      }
    }
    const bean = new Class();
    registeredMethods.set(bean.getUUIDCached, bean as any);
    registeredBeans.set('Class', bean as any);

    // WHEN
    const resultCache = bean.getUUIDCached('first');

    // THEN
    expect(bean.getUUIDCached('second')).not.toBe(resultCache);
    expect(bean.getUUIDCached('first')).toBe(resultCache);
  });

  it('caches an async function by its arguments', async () => {
    // GIVEN
    class Class {
      @Cached()
      async getUUIDCached(anArgument: string) {
        return `${randomUUID()}/${anArgument}`;
      }
    }
    const bean = new Class();
    registeredMethods.set(bean.getUUIDCached, bean as any);
    registeredBeans.set('Class', bean as any);

    // WHEN
    const resultCache = await bean.getUUIDCached('first');

    // THEN
    expect(await bean.getUUIDCached('second')).not.toBe(resultCache);
    expect(await bean.getUUIDCached('first')).toBe(resultCache);
  });

  it('invalidates a cache when expired', async () => {
    // GIVEN
    class Class {
      @Cached()
      getUUIDCached() {
        return randomUUID();
      }
    }
    const bean = new Class();
    registeredMethods.set(bean.getUUIDCached, bean as any);
    registeredBeans.set('Class', bean as any);

    // WHEN
    const resultCache = bean.getUUIDCached();
    expect(bean.getUUIDCached()).toBe(resultCache);
    jest.useFakeTimers().setSystemTime(Date.now() + 60_001);

    // THEN
    expect(bean.getUUIDCached()).not.toBe(resultCache);
  });
});
