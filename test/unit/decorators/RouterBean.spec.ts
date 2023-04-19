import { flushPromises } from '@test/utils/testUtils';
import express from 'express';
import { RouterBean } from '@/decorators/RouterBean';
import { registeredBeans } from '@/decorators';

jest.mock('express');
jest.mock('@/decorators', () => ({
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
    expect(registeredBeans.get('Class')).toBe(C.instance);
    expect(C.instance.id).toStrictEqual(42);
    expect(C.instance.routerConfig).toStrictEqual({
      path: '/route',
      router,
    });
  });
});
