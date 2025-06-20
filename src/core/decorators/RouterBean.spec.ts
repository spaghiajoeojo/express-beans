import { flushPromises } from '@test/utils/testUtils';
import express from 'express';
import { RouterBean } from '@/core/decorators/RouterBean';
import { registeredBeans } from '@/core';

jest.mock('express');
jest.mock('@/core', () => ({
  registeredBeans: new Map(),
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('RouterBean.ts', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    registeredBeans.clear();
  });

  it('registers a router bean', async () => {
    // GIVEN
    const router = { id: 'router-id' };
    express.Router = jest.fn().mockReturnValue(router);

    // WHEN
    @RouterBean('/route')
    class Class {
      id = 42;
    }
    const C: any = Class;
    await flushPromises();

    // THEN
    expect(registeredBeans.get('Class')).toBe(C._instance);
    expect(C._instance.id).toStrictEqual(42);
    expect(C._instance._routerConfig).toStrictEqual({
      path: '/route',
      router,
    });
  });

  it.each([1,2,3,10])('registers a router bean with %s middlewares', async (numberOfMiddlewares: number) => {
    // GIVEN
    const router = { use: jest.fn() };
    express.Router = jest.fn().mockReturnValue(router);
    const middlewares = new Array(numberOfMiddlewares).fill(jest.fn());

    // WHEN
    @RouterBean('/route', middlewares)
    class Class {
      id = 42;
    }
    const C: any = Class;
    await flushPromises();

    // THEN
    expect(registeredBeans.get('Class')).toBe(C._instance);
    expect(C._instance.id).toStrictEqual(42);
    expect(C._instance._routerConfig).toStrictEqual({
      path: '/route',
      router,
    });
    expect(router.use).toHaveBeenCalledTimes(1);
    expect(router.use).toHaveBeenCalledWith(...middlewares);
  });

  it('registers a router bean with no middlewares', async () => {
    // GIVEN
    const router = { use: jest.fn() };
    express.Router = jest.fn().mockReturnValue(router);

    // WHEN
    @RouterBean('/route', [])
    class Class {
      id = 42;
    }
    const C: any = Class;
    await flushPromises();

    // THEN
    expect(registeredBeans.get('Class')).toBe(C._instance);
    expect(C._instance.id).toStrictEqual(42);
    expect(C._instance._routerConfig).toStrictEqual({
      path: '/route',
      router,
    });
    expect(router.use).not.toHaveBeenCalled();
  });
});
