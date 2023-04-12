import { flushPromises } from '@test/utils/testUtils';
import * as http from 'http';
import { Request, Response } from 'express';
import supertest from 'supertest';
import ExpressBeans from '@/ExpressBeans';
import { Route, RouterBean } from '@/main';

describe('ExpressBeans.ts', () => {
  let server: http.Server;
  let application: ExpressBeans;
  beforeEach(async () => {
    vi.resetModules();
    application = new ExpressBeans({ listen: false });
    server = application.getApp().listen(8080);
    await flushPromises();
  });

  afterEach(() => {
    server.close();
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
    server = application.getApp().listen(8080);

    // WHEN
    const { body } = supertest(server).get('/test/42');

    // THEN
    expect(body).toBe(true);
  });

  test('creation of a new application', async () => {
    // WHEN
    await flushPromises();

    // THEN
    expect(application instanceof ExpressBeans).toBe(true);
  });
});
