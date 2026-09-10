import { flushPromises } from '@test/utils/testUtils';
import * as http from 'http';
import { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import ExpressBeans from '@/core/ExpressBeans';
import {
  Bean, Cached, InjectBean, InvalidateCache, Logger, Route, RouterBean,
} from '@/main';
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
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
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
      @Cached()
      @Route('GET', '/42')
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

    await flushPromises();

    // THEN
    expect(text1).toBe(text2);

  });

  test('cache is invalidated by a route decorated with InvalidateCache', async () => {
    // GIVEN
    @RouterBean('/test')
    class TestRouter {
      @Cached()
      @Route('GET', '/42')
      test(_req: Request, res: Response) {
        res.send(randomUUID());
      }

      @InvalidateCache('test')
      @Route('POST', '/42')
      invalidate(_req: Request, res: Response) {
        res.send('invalidated');
      }
    }
    application = new ExpressBeans({ listen: false, routerBeans: [TestRouter] });
    await flushPromises();
    server = application.listen(3001);
    await flushPromises();

    // WHEN
    const { text: text1 } = await request(server).get('/test/42');
    const { text: text2 } = await request(server).get('/test/42');
    await request(server).post('/test/42').expect(200);
    const { text: text3 } = await request(server).get('/test/42');

    await flushPromises();

    // THEN
    expect(text1).toBe(text2);
    expect(text3).not.toBe(text1);
  });

  test('cache is invalidated across beans through dependency injection', async () => {
    // GIVEN
    @Bean
    class CacheOwnerBean {
      @Cached()
      getUUIDCached() {
        return randomUUID();
      }

      @InvalidateCache('getUUIDCached')
      invalidate() {
        return 'invalidated';
      }
    }

    @RouterBean('/test')
    class TestRouter {
      @InjectBean(CacheOwnerBean)
        cacheOwnerBean: CacheOwnerBean;

      @Route('GET', '/cached')
      getCached(_req: Request, res: Response) {
        res.send(this.cacheOwnerBean.getUUIDCached());
      }

      @Route('POST', '/invalidate')
      invalidate(_req: Request, res: Response) {
        res.send(this.cacheOwnerBean.invalidate());
      }
    }
    application = new ExpressBeans({ listen: false, routerBeans: [TestRouter] });
    await flushPromises();
    server = application.listen(3001);
    await flushPromises();

    // WHEN
    const { text: text1 } = await request(server).get('/test/cached').expect(200);
    const { text: text2 } = await request(server).get('/test/cached').expect(200);
    await request(server).post('/test/invalidate').expect(200);
    const { text: text3 } = await request(server).get('/test/cached').expect(200);

    await flushPromises();

    // THEN
    expect(text1).toBe(text2);
    expect(text3).not.toBe(text1);
  });

  test('cache is invalidated from a different bean when they share an explicit cache name', async () => {
    // GIVEN
    @Bean
    class CacheOwnerBean {
      @Cached({ duration: 60_000, name: 'sharedUUIDCache' })
      getUUIDCached() {
        return randomUUID();
      }
    }

    @Bean
    class CacheInvalidatorBean {
      @InvalidateCache('sharedUUIDCache')
      invalidate() {
        return 'invalidated';
      }
    }

    @RouterBean('/test')
    class TestRouter {
      @InjectBean(CacheOwnerBean)
        cacheOwnerBean: CacheOwnerBean;

      @InjectBean(CacheInvalidatorBean)
        cacheInvalidatorBean: CacheInvalidatorBean;

      @Route('GET', '/cached')
      getCached(_req: Request, res: Response) {
        res.send(this.cacheOwnerBean.getUUIDCached());
      }

      @Route('POST', '/invalidate')
      invalidate(_req: Request, res: Response) {
        res.send(this.cacheInvalidatorBean.invalidate());
      }
    }
    application = new ExpressBeans({ listen: false, routerBeans: [TestRouter] });
    await flushPromises();
    server = application.listen(3001);
    await flushPromises();

    // WHEN
    const { text: text1 } = await request(server).get('/test/cached').expect(200);
    const { text: text2 } = await request(server).get('/test/cached').expect(200);
    await request(server).post('/test/invalidate').expect(200);
    const { text: text3 } = await request(server).get('/test/cached').expect(200);

    await flushPromises();

    // THEN
    expect(text1).toBe(text2);
    expect(text3).not.toBe(text1);
  });
});
