import express from 'express';
import { flushPromises } from '@test/utils/testUtils';
import { pinoHttp } from 'pino-http';
import ExpressBeans from '@/ExpressBeans';
import { logger, registeredBeans } from '@/decorators';

jest.mock('express');
jest.mock('pino-http');
jest.mock('@/decorators', () => ({
  registeredBeans: new Map(),
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ExpressBeans.ts', () => {
  const realSetImmediate = setImmediate;
  const expressMock = {
    disable: jest.fn(),
    listen: jest.fn(),
    use: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.resetModules();
    registeredBeans.clear();
    express.mockReturnValue(expressMock);
    expressMock.use.mockClear();
    global.setImmediate = jest.fn().mockImplementation((cb) => {
      realSetImmediate(cb);
    });
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

  test('creation of a new application with static method', async () => {
    // GIVEN
    expressMock.listen.mockImplementation((port, cb) => cb());
    const application = await ExpressBeans.createApp();

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

  it('calls onInitialized callback', async () => {
    // GIVEN
    expressMock.listen.mockImplementation((port, cb) => cb());
    const onInitialized = jest.fn();

    // WHEN
    const application = new ExpressBeans({ onInitialized });
    await flushPromises();

    // THEN
    expect(application instanceof ExpressBeans).toBe(true);
    expect(onInitialized).toBeCalled();
  });

  it('calls onError callback', async () => {
    // GIVEN
    const error = new Error('Port already in use');
    expressMock.listen.mockImplementation(() => {
      throw error;
    });
    const onError = jest.fn();

    // WHEN
    const application = new ExpressBeans({ onError });
    await flushPromises();

    // THEN
    expect(application instanceof ExpressBeans).toBe(true);
    expect(onError).toBeCalledWith(error);
  });

  it('throws an error if listen function fails', async () => {
    // GIVEN
    global.setImmediate.mockImplementationOnce((cb) => {
      cb();
    });
    const error = new Error('Port already in use');
    expressMock.listen.mockImplementationOnce(() => {
      throw error;
    });

    // WHEN
    try {
      await ExpressBeans.createApp();
      await flushPromises();
    } catch (err) {
      expect(err).toBe(error);
    }
  });

  it('stops the process if listen function fails', async () => {
    // GIVEN
    const mockExit = jest.spyOn(process, 'exit')
      .mockImplementationOnce(
        () => {
          // prevent process.exit to actually ending the process
        },
      );
    global.setImmediate.mockImplementationOnce((cb) => {
      cb();
    });
    const error = new Error('Port already in use');
    expressMock.listen.mockImplementationOnce(() => {
      throw error;
    });

    // WHEN
    const app = new ExpressBeans({ onInitialized: jest.fn() });
    await flushPromises();

    // THEN
    expect(mockExit).toBeCalledWith(1);
    expect(app.onInitialized).not.toBeCalled();
    mockExit.mockRestore();
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
    } catch (e) {
      expect(e).toStrictEqual(error);
      expect(application).toBeUndefined();
    }
    expect.assertions(2);
  });

  it('registers router beans in express application', async () => {
    // GIVEN
    const loggerMock = jest.fn();
    pinoHttp.mockReturnValueOnce(loggerMock);
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
    expect(expressMock.use).toBeCalledTimes(4);
    expect(expressMock.use).toHaveBeenCalledWith(expect.any(Function));
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
      .mockReturnValueOnce(undefined)
      .mockImplementationOnce(() => {
        throw error;
      });

    try {
      // WHEN
      await ExpressBeans.createApp({ routerBeans: beans });
    } catch (e) {
      // THEN
      expect(e).toStrictEqual(new Error('Router Bean3 not initialized correctly'));
    }
  });

  it('throws an error (no callback) if a router has not created correctly', async () => {
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
      ExpressBeans.createApp({ routerBeans: beans });
    } catch (e) {
      // THEN
      expect(e).toStrictEqual(new Error('Router Bean3 not initialized correctly'));
    }
  });
});
