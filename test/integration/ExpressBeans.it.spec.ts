import { flushPromises } from '@test/utils/testUtils';
import * as http from 'http';
import { Request, Response } from 'express';
import request from 'supertest';
import ExpressBeans from '@/ExpressBeans';
import { Route, RouterBean } from '@/main';

describe('ExpressBeans.ts', () => {
  let server: http.Server;
  let application: ExpressBeans;
  beforeEach(() => {
    jest.resetModules();
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
    await flushPromises();
    server = application.listen(3001);
    await flushPromises();

    // WHEN
    const { text } = await request(server).get('/test/42').expect(200);

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
});
