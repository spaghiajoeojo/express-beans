import express from 'express';
import { flushPromises } from '@test/utils/testUtils';
import ExpressBeans from '@/ExpressBeans';
import { logger, registeredBeans } from '@/decorators';

vi.mock('express');
vi.mock('@/decorators', () => ({
  registeredBeans: new Map(),
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ExpressBeans.ts', () => {
  const expressMock = {
    disable: vi.fn(),
    listen: vi.fn(),
    use: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    vi.resetModules();
    registeredBeans.clear();
    express.mockReturnValue(expressMock);
    expressMock.use.mockClear();
    await flushPromises();
  });

  test('creation of a new application', async () => {
    // GIVEN
    expressMock.listen.mockImplementation((port, cb) => cb());
    const application = new ExpressBeans();

    // WHEN
    await flushPromises();

    // THEN
    expect(application instanceof ExpressBeans).toBe(true);
    expect(expressMock.disable).toBeCalledWith('x-powered-by');
    expect(expressMock.listen).toBeCalledWith(8080, expect.any(Function));
    expect(logger.info).toBeCalledWith('Server listening on port 8080');
  });

  it('exposes use method of express application', async () => {
    // GIVEN
    const application = new ExpressBeans();
    const middleware = (req, res, next) => next();

    // WHEN
    application.use(middleware);

    // THEN
    expect(expressMock.use).toBeCalledWith(middleware);
  });

  it('exposes express application', async () => {
    // GIVEN
    const application = new ExpressBeans();

    // WHEN
    const expressApp = application.getApp();

    // THEN
    expect(expressApp).toBe(expressMock);
  });

  it('accepts a list of beans', async () => {
    // GIVEN
    const bean1 = class Bean1 {};
    const bean2 = class Bean2 {};
    const bean3 = class Bean3 {};
    const beans = [bean1, bean2, bean3];
    beans.forEach((bean) => {
      bean.isExpressBean = true;
    });

    // WHEN
    const application = new ExpressBeans({
      beans,
    });

    // THEN
    expect(application instanceof ExpressBeans).toBe(true);
  });

  it('throws an error if passing a non bean class', async () => {
    // GIVEN
    const bean1 = class Bean1 {};
    bean1.isExpressBean = true;
    const bean2 = class Bean2 {};
    bean2.isExpressBean = true;
    const notABean = class NotABean {};
    const beans = [bean1, bean2, notABean];
    const error = new Error('Trying to use something that is not an ExpressBean: NotABean');
    let application;

    // WHEN
    try {
      application = new ExpressBeans({
        routerBeans: beans,
      });
      expect.fail('error not thrown');
    } catch (e) {
      expect(e).toStrictEqual(error);
    }
  });

  it('registers router beans in express application', async () => {
    // GIVEN
    const bean1 = class Bean1 {};
    const bean2 = class Bean2 {};
    const bean3 = class Bean3 {};
    const beans = [bean1, bean2, bean3];
    beans.forEach((Bean, index) => {
      Bean.isExpressBean = true;
      const bean = new Bean();
      bean.routerConfig = {
        path: `router-path/${index}`,
        router: { id: index },
      };
      registeredBeans.set(`Bean${index + 1}`, bean);
    });

    // WHEN
    expressMock.use.mockReset();
    const application = new ExpressBeans({
      routerBeans: beans,
    });
    await flushPromises();

    // THEN
    expect(application instanceof ExpressBeans).toBe(true);
    expect(expressMock.use).toBeCalledTimes(3);
    expect(expressMock.use).toHaveBeenCalledWith('router-path/0', { id: 0 });
    expect(expressMock.use).toHaveBeenCalledWith('router-path/1', { id: 1 });
    expect(expressMock.use).toHaveBeenCalledWith('router-path/2', { id: 2 });
  });

  it('throws an error if a router has not created correctly', async () => {
    // GIVEN
    const bean1 = class Bean1 {};
    const bean2 = class Bean2 {};
    const bean3 = class Bean3 {};
    const beans = [bean1, bean2, bean3];
    beans.forEach((Bean, index) => {
      Bean.isExpressBean = true;
      Bean.className = `Bean${index + 1}`;
      const bean = new Bean();
      bean.className = `Bean${index + 1}`;
      bean.routerConfig = {
        path: `router-path/${index}`,
        router: { id: index },
      };
      registeredBeans.set(Bean.className, bean);
    });
    const error = new Error('router initialization failed');
    expressMock.use
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(undefined)
      .mockImplementationOnce(() => {
        throw error;
      });

    try {
      // WHEN
      const promise = new Promise((resolve, reject) => {
        ExpressBeans.createApp({ routerBeans: beans, onInitialized: resolve, onError: reject });
      });
      await promise;
      // THEN
      expect.fail('error not caught');
    } catch (e) {
      expect(e).toStrictEqual(new Error('Router Bean3 not initialized correctly'));
    }
  });
});
