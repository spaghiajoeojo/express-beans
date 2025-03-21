import express, { Express, Request } from 'express';
import { pinoHttp, startTime } from 'pino-http';
import { ServerResponse, IncomingMessage } from 'http';
import { CreateExpressBeansOptions, ExpressBeansOptions, ExpressRouterBean } from '@/ExpressBeansTypes';
import { logger, registeredBeans } from '@/core';

export default class ExpressBeans {
  private readonly app: Express;

  private onInitialized: (() => void) | undefined;

  /**
   * Creates a new ExpressBeans application
   * @param options {ExpressBeansOptions}
   */
  static createApp(options?: Partial<CreateExpressBeansOptions>): Promise<ExpressBeans> {
    return new Promise((resolve, reject) => {
      let app: ExpressBeans;
      const onInitialized = () => {
        resolve(app);
      };
      app = new ExpressBeans({ ...options, onInitialized, onError: reject });
    });
  }

  /**
   * Constructor of ExpressBeans application
   * @constructor
   * @param options {ExpressBeansOptions}
   */
  constructor(options?: Partial<ExpressBeansOptions>) {
    this.app = express();
    this.app.disable('x-powered-by');
    this.app.use(pinoHttp(
      {
        logger,
        customSuccessMessage: this.serializeRequest.bind(this),
        customErrorMessage: this.serializeRequest.bind(this),
      },
    ));
    this.initialize(options ?? {});
  }

  private serializeRequest(req: IncomingMessage, res: ServerResponse) {
    const request: Request = req as Request;
    const remoteAddress = request.headers['x-forwarded-for'] ?? request.socket.remoteAddress;
    const { method, originalUrl, httpVersion } = request;
    const responseTime = Date.now() - res[startTime];
    const optionals = [
      res.statusCode,
      res.getHeader('content-length'),
      res.getHeader('content-type'),
      request.headers.referer,
      request.headers['user-agent'],
    ]
      .filter((i) => !!i)
      .join(' ');
    return `${remoteAddress} - "${method} ${originalUrl} HTTP/${httpVersion}" ${optionals} - ${responseTime}ms`;
  }

  /**
   * Initializes the application and checks
   * if all beans are valid
   * @param listen {boolean}
   * @param port {number}
   * @param beans {Object[]}
   * @param onInitialized {Function}
   * @private
   */
  private initialize({
    listen = true,
    port = 8080,
    routerBeans = [],
    onInitialized,
    onError,
  }: Partial<ExpressBeansOptions>) {
    this.onInitialized = onInitialized;
    this.checkRouterBeans(routerBeans);
    setImmediate(() => {
      try {
        this.registerRouters();
        if (listen) {
          this.listen(port);
        }
      } catch (err: any) {
        if (onError) {
          onError(err);
        } else {
          logger.error(new Error('Critical error', { cause: err }));
          process.exit(1);
        }
      }
    });
  }

  /**
   * Starts the server and calls onInitialized callback
   * @param {number} port
   */
  listen(port: number) {
    return this.app.listen(port, () => {
      logger.info(`Server listening on port ${port}`);
      if (this.onInitialized) {
        this.onInitialized();
      }
    });
  }

  private registerRouters() {
    Array.from(registeredBeans.values())
      .map((bean) => bean as ExpressRouterBean)
      .filter((bean) => bean._routerConfig)
      .forEach((bean) => {
        try {
          const {
            path,
            router,
          } = bean._routerConfig;
          logger.debug(`Registering router ${bean._className}`);
          this.app.use(path, router);
        } catch (e) {
          logger.error(e);
          throw new Error(`Router ${bean._className} not initialized correctly`);
        }
      });
  }

  private checkRouterBeans(routerBeans: Array<ExpressRouterBean>) {
    const invalidBeans = routerBeans
      .filter(((bean) => !bean._beanUUID))
      .map((object: any) => object.prototype.constructor.name);
    if (invalidBeans.length > 0) {
      throw new Error(`Trying to use something that is not an ExpressBean: ${invalidBeans.join(', ')}`);
    }
  }

  /**
   * Gets Express application
   * @returns {Express}
   */
  getApp() {
    return this.app;
  }

  /**
   * Exposes use function of Express application
   * @param handlers
   */
  use(...handlers: any) {
    this.app.use(...handlers);
  }
}
