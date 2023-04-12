import { flushPromises } from '@test/utils/testUtils';
import { Request, Response } from 'express';
import { Route } from '@/decorators/Route';
import { registeredBeans, registeredMethods } from '@/decorators';

vi.mock('@/decorators', () => ({
  registeredBeans: new Map(),
  registeredMethods: new Map(),
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Route.ts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    registeredMethods.clear();
    registeredBeans.clear();
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
    const mock = vi.fn();
    class Class {
      @Route(method, '/num')
      getNum(_req: Request, res: Response) {
        res.send('OK');
      }
    }
    const bean: any = new Class();
    registeredMethods.set(bean.getNum, bean);
    bean.routerConfig = {
      path: '/router',
      router: {
        [method.toLowerCase()]: mock,
      },
    };
    registeredBeans.set('Class', bean);
    await flushPromises();

    // THEN
    expect(mock).toBeCalledWith('/num', expect.any(Function));
    expect(mock.mock.calls[0][1].name)
      .toBe('bound getNum');
  });
});
