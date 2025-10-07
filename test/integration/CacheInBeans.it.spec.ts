import { flushPromises } from '@test/utils/testUtils';
import * as http from 'http';
import { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import ExpressBeans from '@/core/ExpressBeans';
import { Cached, Logger, Route, RouterBean } from '@/main';
import { Executor } from '@/core/executor';
import { randomUUID } from 'crypto';

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
  logger: console,
}));

describe('Cache integration tests', () => {
  let server: http.Server;
  let application: ExpressBeans;
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    Executor.stopLifecycle();
  });

  afterEach(() => {
    server.close();
  });

  test('cache works in routers', async () => {
    // GIVEN
    @RouterBean('/test')
    class TestRouter {
      @Route('GET', '/42')
      @Cached()
      test(_req: Request, res: Response) {
        res.send(randomUUID());
      }
    }
    application = new ExpressBeans({ listen: false, routerBeans: [TestRouter] });
    await flushPromises();
    server = application.listen(3001);
    await flushPromises();

    // WHEN
    const { text: text1 } = await request(server).get('/test/42');
    const { text: text2 } = await request(server).get('/test/42');
    console.log(text1, text2);
    await flushPromises();

    // THEN
    expect(text1).toBe(text2);

  });
});
