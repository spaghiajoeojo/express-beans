import { flushPromises } from '@test/utils/testUtils';
import * as http from 'http';
import { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import ExpressBeans from '@/core/ExpressBeans';
import { Logger, Route, RouterBean } from '@/main';
import { logger } from '@/core';
import { Executor } from '@/core/Executor';

jest.mock('pino-http', () => ({
  pinoHttp: ({
    logger: loggerInstance,
    customSuccessMessage,
    customErrorMessage,
  }: {
    logger: Logger,
    customSuccessMessage: (req: Request, res: Response) => string,
    customErrorMessage: (req: Request, res: Response) => string
  }) => (req: Request, res: Response, next: NextFunction) => {
    if (res.err) {
      loggerInstance.error(customErrorMessage(req, res));
    } else {
      loggerInstance.info(customSuccessMessage(req, res));
    }
    next();
  },
  startTime: jest.requireActual('pino-http').startTime,
}));
jest.mock('@/core', () => ({
  registeredBeans: new Map(),
  registeredMethods: new Map(),
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ExpressBeans integration tests', () => {
  let server: http.Server;
  let server2: http.Server;
  let application: ExpressBeans;
  let application2: ExpressBeans;
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    Executor.stopLifecycle();
  });

  afterEach(() => {
    server.close();
    if (server2) {
      server2.close();
    }
  });

  test('start of application', async () => {
    // GIVEN
    @RouterBean('/test')
    class TestRouter {
      @Route('GET', '/42')
      test(_req: Request, res: Response) {
        res.send('42 is the answer');
      }
    }
    application = new ExpressBeans({ listen: false, routerBeans: [TestRouter] });
    await flushPromises();
    server = application.listen(3001);
    await flushPromises();

    // WHEN
    const { text } = await request(server).get('/test/42').expect(200);

    // THEN
    expect(text).toBe('42 is the answer');
  });

  test('start of application with baseURL', async () => {
    // GIVEN
    @RouterBean('/test')
    class TestRouter {
      @Route('GET', '/42')
      test(_req: Request, res: Response) {
        res.send('42 is the answer');
      }
    }
    application = new ExpressBeans({ listen: false, routerBeans: [TestRouter], baseURL: '/api' });
    await flushPromises();
    server = application.listen(3001);
    await flushPromises();

    // WHEN
    const { text } = await request(server).get('/api/test/42').expect(200);

    // THEN
    expect(text).toBe('42 is the answer');
  });

  test('creation of a new application', async () => {
    // WHEN
    application = new ExpressBeans({ listen: false });
    server = application.getApp().listen(3000);
    await flushPromises();

    // THEN
    expect(application instanceof ExpressBeans).toBe(true);
  });

  test('start multiple applications', async () => {
    // GIVEN
    @RouterBean('/test1')
    class TestRouter1 {
      @Route('GET', '/42')
      test(_req: Request, res: Response) {
        res.send('42 is the answer');
      }
    }
    @RouterBean('/test2')
    class TestRouter2 {
      @Route('GET', '/thanks')
      test(_req: Request, res: Response) {
        res.send('for all the fish');
      }
    }
    application = new ExpressBeans({ listen: false, routerBeans: [TestRouter1] });
    application2 = new ExpressBeans({ listen: false, routerBeans: [TestRouter2] });
    await flushPromises();
    server = application.listen(4001);
    server2 = application2.listen(4002);
    await flushPromises();
    await Executor.getExecutionPhase('init');
    await flushPromises();

    // WHEN
    const { text } = await request(server).get('/test1/42').expect(200);
    const { text: text2 } = await request(server2).get('/test2/thanks').expect(200);
    await request(server).get('/test2/thanks').expect(404);
    await request(server2).get('/test1/42').expect(404);

    // THEN
    expect(text).toBe('42 is the answer');
    expect(text2).toBe('for all the fish');
  });

  test('logs incoming requests', async () => {
    // GIVEN
    const loggerMock = jest.mocked(logger);
    @RouterBean('/test')
    class TestRouter {
      @Route('GET', '/42')
      test(_req: Request, res: Response) {
        res.send('42 is the answer');
      }
    }
    application = new ExpressBeans({ listen: false, routerBeans: [TestRouter] });
    await flushPromises();
    await Executor.getExecutionPhase('init');
    server = application.listen(3001);
    await flushPromises();

    // WHEN
    await (await request(server).get('/test/42').expect(200));

    // THEN
    expect(loggerMock.info).toHaveBeenCalledWith('::ffff:127.0.0.1 - "GET /test/42 HTTP/1.1" 200 - NaNms');
  });

  test('logs incoming requests using ip from header (proxy)', async () => {
    // GIVEN
    const loggerMock = jest.mocked(logger);
    @RouterBean('/test')
    class TestRouter {
      @Route('GET', '/42')
      test(_req: Request, res: Response) {
        res.send('42 is the answer');
      }
    }
    application = new ExpressBeans({ listen: false, routerBeans: [TestRouter] });
    await flushPromises();
    server = application.listen(3001);
    await Executor.getExecutionPhase('init');
    await flushPromises();

    // WHEN
    await (await request(server).get('/test/42').set({ 'x-forwarded-for': '193.234.61.32' }).expect(200));

    // THEN
    expect(loggerMock.info).toHaveBeenCalledWith('193.234.61.32 - "GET /test/42 HTTP/1.1" 200 - NaNms');
  });
});
