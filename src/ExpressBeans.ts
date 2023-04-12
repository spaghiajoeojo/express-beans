import express, { Express } from 'express';
import { ExpressBeansOptions } from '@/ExpressBeansTypes';
import { logger, registeredBeans } from '@/decorators';

export default class ExpressBeans {
  private readonly app: Express;

  /**
   * Creates a new ExpressBeans application
   * @param options {ExpressBeansOptions}
   */
  static createApp(options?: Partial<ExpressBeansOptions>) {
    return new ExpressBeans(options);
  }

  /**
   * Constructor of ExpressBeans application
   * @constructor
   * @param options {ExpressBeansOptions}
   * @param onInitialized {Function}
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
    const invalidBeans = routerBeans
      .filter(((bean) => !bean.isExpressBean))
      .map((object) => object.prototype.constructor.name);
    if (invalidBeans.length > 0) {
      throw new Error(`Trying to use something that is not an ExpressBean: ${invalidBeans.join(', ')}`);
    }
    setImmediate(() => {
      try {
        Array.from(registeredBeans.values())
          .filter((bean) => bean.routerConfig)
          .forEach((bean) => {
            try {
              const { path, router } = bean.routerConfig!;
              logger.debug(`Registering router ${bean.className}`);
              this.app.use(path, router);
            } catch (e) {
              logger.error(e);
              throw new Error(`Router ${bean.className} not initialized correctly`);
            }
          });
        if (listen) {
          this.app.listen(port, () => {
            logger.info(`Server listening on port ${port}`);
            if (onInitialized) {
              onInitialized();
            }
          });
        }
      } catch (err: any) {
        if (onError) {
          onError(err);
        } else {
          throw err;
        }
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
