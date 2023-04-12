import { Request, Response } from 'express';
import Service from '@/example/services/Service';
import { RouterBean, InjectBean, Route } from '@/main';

@RouterBean('/example')
export default class Router {
  @InjectBean(Service)
    service!: Service;

  @Route('GET', '/hello')
  helloRoute(_req: Request, res: Response) {
    res.send(this.service.hello());
  }
}
