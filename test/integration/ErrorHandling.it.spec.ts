import { flushPromises } from '@test/utils/testUtils';
import * as http from 'http';
import { Request, Response } from 'express';
import request from 'supertest';
import ExpressBeans from '@/core/ExpressBeans';
import { Route, RouterBean } from '@/main';
import { Executor } from '@/core/Executor';

describe('Error Handling integration tests', () => {
  let server: http.Server;
  let application: ExpressBeans;
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    server.close();
    Executor.stopLifecycle();
  });

  test('error handling on synchronous routes', async () => {
    // GIVEN
    @RouterBean('/test')
    class TestRouter {
      @Route('GET', '/42')
      test(_req: Request, res: Response) {
        res.send('42 is the answer');
      }

      @Route('GET', '/error')
      error(_req: Request, _res: Response) {
        throw new Error('ops!');
      }
    }
    application = new ExpressBeans({ listen: false, routerBeans: [TestRouter] });
    await flushPromises();
    server = application.listen(3001);
    await flushPromises();

    // WHEN
    await request(server).get('/test/error').expect(500);

    // THEN
    const { text } = await request(server).get('/test/42').expect(200);
    expect(text).toBe('42 is the answer');
  });

  test('error handling on asynchronous routes', async () => {
    // GIVEN
    @RouterBean('/test')
    class TestRouter {
      @Route('GET', '/42')
      test(_req: Request, res: Response) {
        res.send('42 is the answer');
      }

      @Route('GET', '/error')
      async error(_req: Request, _res: Response) {
        throw new Error('ops!');
      }
    }
    application = new ExpressBeans({ listen: false, routerBeans: [TestRouter] });
    await flushPromises();
    server = application.listen(3001);
    await flushPromises();

    // WHEN
    await request(server).get('/test/error').expect(500);

    // THEN
    const { text } = await request(server).get('/test/42').expect(200);
    expect(text).toBe('42 is the answer');
  });
});
