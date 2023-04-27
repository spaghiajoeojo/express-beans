import express, { Express } from 'express';
import { CreateExpressBeansOptions, ExpressBeansOptions, ExpressRouterBean } from '@/ExpressBeansTypes';
import { logger, registeredBeans } from '@/decorators';

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
    this.initialize(options || {});
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
    const invalidBeans = routerBeans
      .filter(((bean) => !bean.isExpressBean))
      .map((object) => object.prototype.constructor.name);
    if (invalidBeans.length > 0) {
      throw new Error(`Trying to use something that is not an ExpressBean: ${invalidBeans.join(', ')}`);
    }
    setImmediate(async () => {
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
      .filter((bean) => bean.routerConfig)
      .forEach((bean) => {
        try {
          const {
            path,
            router,
          } = bean.routerConfig;
          logger.debug(`Registering router ${bean.className}`);
          this.app.use(path, router);
        } catch (e) {
          logger.error(e);
          throw new Error(`Router ${bean.className} not initialized correctly`);
        }
      });
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
