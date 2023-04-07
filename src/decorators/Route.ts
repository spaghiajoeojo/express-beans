import { HTTPMethod } from '@/ExpressBeansTypes';
import { logger, registeredBeans } from '@/decorators';
import { RouterMethods } from '@/RouterMethods';

/**
 * Registers a RequestHandler
 * @param path {string}
 * @param method {HTTPMethod}
 * @constructor
 */
export function Route(method: HTTPMethod, path: string) {
  return (prototype: any, functionName: string) => {
    setImmediate(() => {
      const className = prototype.constructor.name;
      const bean = registeredBeans.get(className);
      if (bean && bean.routerConfig) {
        const { routerConfig } = bean;
        const { router } = routerConfig;
        logger.debug(`Mapping ${className}.${functionName} with ${method} ${routerConfig.path}${path}`);
        router[RouterMethods[method]](path, prototype[functionName].bind(bean));
      }
    });
  };
}
