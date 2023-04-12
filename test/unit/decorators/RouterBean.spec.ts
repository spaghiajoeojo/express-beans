import { flushPromises } from '@test/utils/testUtils';
import express from 'express';
import { RouterBean } from '@/decorators/RouterBean';
import { registeredBeans } from '@/decorators';

vi.mock('express');
vi.mock('@/decorators', () => ({
  registeredBeans: new Map(),
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('RouterBean.ts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    registeredBeans.clear();
  });

  it('registers a router bean', async () => {
    // GIVEN
    const router = { id: 'router-id' };
    express.Router = vi.fn().mockReturnValue(router);

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
