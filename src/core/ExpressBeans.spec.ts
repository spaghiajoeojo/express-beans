import express from 'express';
import { flushPromises } from '@test/utils/testUtils';
import { pinoHttp } from 'pino-http';
import ExpressBeans from '@/core/ExpressBeans';
import {
  logger, registeredBeans,
} from '@/core';
import { ExpressBean } from '@/ExpressBeansTypes';
import { Executor } from '@/core/Executor';
import { wrapError } from './errors';

jest.mock('express');
jest.mock('pino-http');
jest.mock('@/core', () => ({
  registeredBeans: new Map(),
  registeredMethods: new Map(),
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
  const routerMock = {
    use: jest.fn(),
  };
  let mockExit: jest.SpyInstance;

  beforeEach(async () => {
    Executor.stopLifecycle();
    await flushPromises();
    mockExit = jest.spyOn(process, 'exit')
      .mockImplementationOnce(() => undefined as never);
    jest.mocked(express).mockImplementation(() => expressMock as unknown as express.Express);
    jest.mocked(express).Router = jest.fn().mockReturnValue(
      routerMock as unknown as express.Router,
    );
    registeredBeans.clear();
    jest.spyOn(global, 'setImmediate').mockImplementation((cb) => realSetImmediate(cb));
    await flushPromises();
    Executor.stopLifecycle();
    await flushPromises();
  });

  test('creation of a new application', async () => {
    // GIVEN
    expressMock.listen.mockImplementation((_port, cb) => cb());
    const application = new ExpressBeans();
    const mockedLogger = jest.mocked(logger);

    // WHEN
    await flushPromises();
    await Executor.getExecutionPhase('init');

    // THEN
    expect(application instanceof ExpressBeans).toBe(true);
    expect(expressMock.disable).toHaveBeenCalledWith('x-powered-by');
    expect(expressMock.listen).toHaveBeenCalledWith(8080, expect.any(Function));
    expect(mockedLogger.info).toHaveBeenCalledWith('Server listening on port 8080');
  });

  test('creation of a new application with static method', async () => {
    // GIVEN
    expressMock.listen.mockImplementation((_port, cb) => cb());
    const application = await ExpressBeans.createApp();
    const mockedLogger = jest.mocked(logger);

    // WHEN
    await flushPromises();
    await Executor.getExecutionPhase('init');

    // THEN
    expect(application instanceof ExpressBeans).toBe(true);
    expect(expressMock.disable).toHaveBeenCalledWith('x-powered-by');
    expect(expressMock.listen).toHaveBeenCalledWith(8080, expect.any(Function));
    expect(mockedLogger.info).toHaveBeenCalledWith('Server listening on port 8080');
  });

  it('exposes use method of express application', async () => {
    // GIVEN
    const application = new ExpressBeans();
    const middleware = (
      _req: express.Request,
      _res: express.Response,
      next: express.NextFunction,
    ) => next();

    // WHEN
    application.use(middleware);

    // THEN
    expect(expressMock.use).toHaveBeenCalledWith(middleware);
  });

  it('exposes express application', async () => {
    // GIVEN
    const application = new ExpressBeans();

    // WHEN
    const expressApp = application.getApp();

    // THEN
    expect(expressApp).toBe(expressMock);
  });

  it('throws an error if listen function fails', async () => {
    const error = new Error('Port already in use');

    // Reset esplicito
    expressMock.listen.mockReset();
    expressMock.listen.mockImplementation((_port, errorHandler) => {
      errorHandler(error);
    });

    ExpressBeans.createApp({ port: 4000 });
    await flushPromises();

    await expect(Executor.execution).resolves.toEqual([wrapError(error)]);
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });

  it('stops the process if listen function fails', async () => {
    // GIVEN
    const error = new Error('Port already in use');
    expressMock.listen.mockImplementationOnce((_, cb) => {
      cb(error);
    });

    // WHEN
    await ExpressBeans.createApp();
    await flushPromises();
    await Executor.getExecutionPhase('init');

    // THEN
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });

  it('accepts a list of beans', async () => {
    // GIVEN
    const bean1 = class Bean1 {};
    const bean2 = class Bean2 {};
    const bean3 = class Bean3 {};
    const beans = [bean1, bean2, bean3] as unknown as ExpressBean[];
    beans.forEach((Bean: any) => {
      Bean._beanUUID = crypto.randomUUID();
      Bean._className = Bean.name;
      Bean._instance = new Bean();
      Bean._instance._routerConfig = {
        path: '/router',
        router: jest.mocked(express.Router),
      };
    });

    // WHEN
    const application = new ExpressBeans({
      routerBeans: beans,
    });

    // THEN
    expect(application instanceof ExpressBeans).toBe(true);
  });

  it('throws an error if passing a non bean class', async () => {
    // GIVEN
    const bean1 = class Bean1 {} as any;
    bean1._beanUUID = crypto.randomUUID();
    const bean2 = class Bean2 {} as any;
    bean2._beanUUID = crypto.randomUUID();
    const notABean = class NotABean {};
    const beans = [bean1, bean2, notABean];
    const error = new Error('Trying to use something that is not an ExpressBean: NotABean');

    // WHEN
    await ExpressBeans.createApp({ routerBeans: beans });
    await flushPromises();
    await expect(Executor.execution).resolves.toEqual([wrapError(error)]);
    await flushPromises();

    // THEN
    expect(mockExit).toHaveBeenCalledWith(1);
    expect.assertions(2);
    mockExit.mockRestore();
  });

  it('registers router beans in express application', async () => {
    // GIVEN
    const loggerMock = jest.fn();
    jest.mocked(pinoHttp).mockReturnValueOnce(loggerMock as unknown as ReturnType<typeof pinoHttp>);
    const bean1 = class Bean1 {};
    const bean2 = class Bean2 {};
    const bean3 = class Bean3 {};
    const beans = [bean1, bean2, bean3];

    beans.forEach((Bean: any, index) => {
      Bean._beanUUID = crypto.randomUUID();
      const bean = new Bean();
      Bean._instance = bean;
      bean._className = `Bean${index + 1}`;
      bean._routerConfig = {
        path: `router-path/${index}`,
        router: { id: index },
      };
      registeredBeans.set(`Bean${index + 1}`, bean);
    });

    // WHEN
    const application = new ExpressBeans({
      routerBeans: beans,
      logRequests: false,
    });
    await flushPromises();

    // THEN
    expect(application instanceof ExpressBeans).toBe(true);
    expect(routerMock.use).toHaveBeenCalledTimes(3);
    expect(routerMock.use).toHaveBeenCalledWith('router-path/0', { id: 0 });
    expect(routerMock.use).toHaveBeenCalledWith('router-path/1', { id: 1 });
    expect(routerMock.use).toHaveBeenCalledWith('router-path/2', { id: 2 });
  });

  it('throws an error if a router has not created correctly', async () => {
    // GIVEN
    const bean1 = class Bean1 {};
    const bean2 = class Bean2 {};
    const bean3 = class Bean3 {};
    const beans = [bean1, bean2, bean3];
    beans.forEach((Bean: any, index) => {
      Bean._beanUUID = crypto.randomUUID();
      Bean._className = `Bean${index + 1}`;
      const bean = new Bean();
      Bean._instance = bean;
      bean._className = `Bean${index + 1}`;
      bean._routerConfig = {
        path: `router-path/${index}`,
        router: { id: index },
      };
      registeredBeans.set(Bean._className, bean);
    });
    const error = new Error('router initialization failed');
    routerMock.use
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(undefined)
      .mockImplementationOnce(() => {
        throw error;
      });

    // WHEN
    await ExpressBeans.createApp({ routerBeans: beans, logRequests: false });

    // THEN
    await flushPromises();

    await expect(Executor.execution).resolves.toEqual([wrapError(new Error('Router Bean3 not initialized correctly'))]);
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });
});
