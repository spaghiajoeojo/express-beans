import { flushPromises } from '@test/utils/testUtils';
import ExpressBeans from '@/core/ExpressBeans';
import { Bean, RouterBean, Route, InjectBean, getBean } from '@/main';
import { Executor } from '@/core/executor';
import { NextFunction, Request, Response } from 'express';
import { Logger } from '@/main';
import * as http from 'http';
import request from 'supertest';

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

describe('getBean integration tests', () => {
  let server: http.Server;
  let application: ExpressBeans;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    Executor.stopLifecycle();
  });

  afterEach(() => {
    server?.close();
  });

  test('getBean retrieves a registered Bean instance', async () => {
    // GIVEN
    @Bean
    class MyService {
      getValue() {
        return 'hello from bean';
      }
    }

    @RouterBean('/test')
    class TestRouter {
      @Route('GET', '/ping')
      ping(_req: Request, res: Response) {
        res.send('pong');
      }
    }

    application = new ExpressBeans({ listen: false, routerBeans: [TestRouter] });
    await flushPromises();
    server = application.listen(3001);
    await flushPromises();

    // WHEN
    const service = getBean(MyService) as unknown as MyService;

    // THEN
    expect(service).toBeDefined();
    expect(service.getValue()).toBe('hello from bean');
  });

  test('getBean returns the same instance used by @InjectBean', async () => {
    // GIVEN
    @Bean
    class SharedService {
      counter = 0;
      increment() {
        this.counter++;
      }
    }

    @RouterBean('/test')
    class TestRouter {
      @InjectBean(SharedService)
      private service: SharedService;

      @Route('GET', '/increment')
      doIncrement(_req: Request, res: Response) {
        this.service.increment();
        res.send(String(this.service.counter));
      }
    }

    application = new ExpressBeans({ listen: false, routerBeans: [TestRouter] });
    await flushPromises();
    server = application.listen(3001);
    await flushPromises();

    // WHEN
    const service = getBean(SharedService) as unknown as SharedService;
    service.increment(); // counter = 1

    const { text } = await request(server).get('/test/increment').expect(200); // counter = 2

    // THEN
    expect(text).toBe('2');
    expect(service.counter).toBe(2);
  });

  test('getBean throws if class is not decorated with @Bean', async () => {
    // GIVEN
    class NotABean {
      getValue() {
        return 'nope';
      }
    }

    @RouterBean('/test')
    class TestRouter {
      @Route('GET', '/ping')
      ping(_req: Request, res: Response) {
        res.send('pong');
      }
    }

    application = new ExpressBeans({ listen: false, routerBeans: [TestRouter] });
    await flushPromises();
    server = application.listen(3001);
    await flushPromises();

    // WHEN / THEN
    expect(() => getBean(NotABean)).toThrow(
      'Cannot get instance from NotABean. Make sure that NotABean has @Bean as class decorator',
    );
  });
});
