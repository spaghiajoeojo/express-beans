import { NextFunction, Request, Response } from 'express';
import { ExpressRouterBean, HTTPMethod } from '@/ExpressBeansTypes';
import { logger, registeredMethods } from '@/decorators';
import { RouterMethods } from '@/RouterMethods';

// Return type here should be "void | Promise<void>" but it is not possible to do it.
// Using "any" instead
// https://github.com/microsoft/TypeScript/issues/43921
declare type RouterBeanHandler = (req: Request, res: Response, next?: NextFunction) => any;

/**
 * Registers a RequestHandler
 * @param httpMethod
 * @param path {string}
 * @decorator
 */
export function Route<This>(httpMethod: HTTPMethod, path: string) {
  return (
    method: RouterBeanHandler,
    context: ClassMethodDecoratorContext<This, RouterBeanHandler>,
  ) => {
    setImmediate(() => {
      const bean = registeredMethods.get(method) as ExpressRouterBean;
      if (bean && bean.routerConfig) {
        const { routerConfig } = bean;
        const { router } = routerConfig;
        logger.debug(`Mapping ${bean.className}.${String(context.name)} with ${httpMethod} ${routerConfig.path}${path}`);
        router[RouterMethods[httpMethod]](path, method.bind(bean));
      }
    });
    return method;
  };
}
