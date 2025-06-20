import { flushPromises } from '@test/utils/testUtils';
import { Request, Response } from 'express';
import { Route } from '@/core/decorators/Route';
import { registeredBeans, registeredMethods } from '@/core';
import { Executor } from '../executor/Executor';

jest.mock('@/core', () => ({
  registeredBeans: new Map(),
  registeredMethods: new Map(),
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Route.ts', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    registeredMethods.clear();
    registeredBeans.clear();
    Executor.stopLifecycle();
  });

  it.each([
    'GET',
    'HEAD',
    'POST',
    'PUT',
    'DELETE',
    'CONNECT',
    'OPTIONS',
    'TRACE',
    'PATCH',
  ])('registers a %s route', async (method: any) => {
    // GIVEN
    const mock = jest.fn();
    const resMock = { send: jest.fn() };
    class Class {
      num = 42;

      @Route(method, '/num')
      getNum(_req: Request, res: Response) {
        res.send('OK');
      }
    }
    const bean: any = new Class();
    registeredMethods.set(bean.getNum, bean);
    bean._routerConfig = {
      path: '/router',
      router: {
        [method.toLowerCase()]: mock,
      },
    };
    registeredBeans.set('Class', bean);
    await flushPromises();
    await Executor.execute();
    mock.mock.calls[0][1](null, resMock);
    await flushPromises();

    // THEN
    expect(mock).toHaveBeenCalledWith('/num', expect.any(Function));
    expect(resMock.send).toHaveBeenCalledWith('OK');
  });

  it.each([
    'GET',
    'HEAD',
    'POST',
    'PUT',
    'DELETE',
    'CONNECT',
    'OPTIONS',
    'TRACE',
    'PATCH',
  ])('registers a %s route with async function', async (method: any) => {
    // GIVEN
    const mock = jest.fn();
    const resMock = { send: jest.fn() };
    class Class {
      num = 42;

      @Route(method, '/num')
      async getNum(_req: Request, res: Response) {
        res.send('OK');
      }
    }
    const bean: any = new Class();
    registeredMethods.set(bean.getNum, bean);
    bean._routerConfig = {
      path: '/router',
      router: {
        [method.toLowerCase()]: mock,
      },
    };
    registeredBeans.set('Class', bean);
    await flushPromises();
    await Executor.execute();
    mock.mock.calls[0][1](null, resMock);
    await flushPromises();

    // THEN
    expect(mock).toHaveBeenCalledWith('/num', expect.any(Function));
    expect(resMock.send).toHaveBeenCalledWith('OK');
  });

  it('does not registers a route on a generic Bean', async () => {
    // GIVEN
    const mock = jest.fn();
    class Class {
      @Route('GET', '/num')
      getNum(_req: Request, res: Response) {
        res.send('OK');
      }
    }
    const bean: any = new Class();
    registeredMethods.set(bean.getNum, bean);
    registeredBeans.set('Class', bean);
    await flushPromises();

    // THEN
    expect(mock).not.toHaveBeenCalled();
  });
});
