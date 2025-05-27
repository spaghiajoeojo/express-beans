import express, { Express, Request, Router } from 'express';
import { pinoHttp, startTime } from 'pino-http';
import { ServerResponse, IncomingMessage } from 'http';
import EventEmitter from 'events';
import { ExpressBeansOptions, ExpressRouterBean } from '@/ExpressBeansTypes';
import { logger, setExecution, startLifecycle } from '@/core';

export default class ExpressBeans extends EventEmitter {
  private readonly app: Express;

  private readonly router: Router;

  /**
   * Creates a new ExpressBeans application
   * @param options {ExpressBeansOptions}
   */
  static async createApp(options?: Partial<ExpressBeansOptions>): Promise<ExpressBeans> {
    const app = new ExpressBeans({ ...options });
    return app;
  }

  /**
   * Constructor of ExpressBeans application
   * @constructor
   * @param options {ExpressBeansOptions}
   */
  constructor(options?: Partial<ExpressBeansOptions>) {
    super();
    this.router = express.Router();
    this.app = express();
    this.app.disable('x-powered-by');
    this.app.use(options?.baseURL ?? '/', this.router);
    if (options?.logRequests === undefined || options.logRequests) {
      this.router.use(pinoHttp(
        {
          logger,
          customSuccessMessage: this.serializeRequest.bind(this),
          customErrorMessage: this.serializeRequest.bind(this),
        },
      ));
    }
    setExecution('init', () => this.initialize(options ?? {}));
    startLifecycle();
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
  private async initialize({
    listen = true,
    port = 8080,
    routerBeans = [],
    onInitialized,
    onError,
  }: Partial<ExpressBeansOptions>) {
    if (onInitialized) {
      this.on('initialized', onInitialized);
    }
    if (onError) {
      this.on('error', onError);
    }
    return Promise.resolve(routerBeans as Array<ExpressRouterBean>)
      .then(this.checkRouterBeans.bind(this))
      .then(this.registerRouters.bind(this))
      .then(() => {
        if (listen) {
          try {
            this.listen(port);
          } catch (err) {
            if (onError) {
              this.emit('error', err);
            } else {
              logger.error(new Error('Critical error', { cause: err }));
              process.exit(1);
            }
          }
        }
      })
      .catch((err) => {
        if (onError) {
          this.emit('error', err);
        } else {
          logger.error(new Error('Critical error', { cause: err }));
          process.exit(1);
        }
      });
  }

  /**
   * Starts the server and emits the initialized event
   * @param {number} port
   */
  listen(port: number) {
    return this.app.listen(port, (error) => {
      if (error) {
        throw error;
      }
      logger.info(`Server listening on port ${port}`);
      this.emit('initialized');
    });
  }

  /**
   * Registers all routers
   * @param routers {Array<ExpressRouterBean>}
   * @private
   */
  private registerRouters(routers: Array<ExpressRouterBean>) {
    Array.from(routers)
      .map((bean) => bean._instance)
      .forEach((instance) => {
        try {
          const {
            path,
            router,
          } = instance._routerConfig;
          logger.debug(`Registering router ${instance._className}`);
          this.router.use(path, router);
        } catch (e) {
          logger.error(e);
          throw new Error(`Router ${instance._className} not initialized correctly`);
        }
      });
  }

  /**
   * Checks if all beans are valid
   * @param routerBeans {Array<ExpressRouterBean>}
   * @returns {Array<ExpressRouterBean>}
   * @throws {Error}
   * @private
   */
  private async checkRouterBeans(routerBeans: Array<ExpressRouterBean>):
  Promise<ExpressRouterBean[]> {
    const invalidBeans = routerBeans
      .filter(((bean) => !bean._beanUUID))
      .map((object: any) => object.prototype.constructor.name);
    if (invalidBeans.length > 0) {
      throw new Error(`Trying to use something that is not an ExpressBean: ${invalidBeans.join(', ')}`);
    }
    return routerBeans;
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
