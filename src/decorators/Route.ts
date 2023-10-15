import {
  NextFunction, Request, RequestHandler, Response,
} from 'express';
import { ExpressRouterBean, HTTPMethod } from '@/ExpressBeansTypes';
import { logger, registeredMethods } from '@/decorators';
import { RouterMethods } from '@/RouterMethods';

// Return type here should be "void | Promise<void>" but it is not possible to do it.
// Using "any" instead
// https://github.com/microsoft/TypeScript/issues/43921
declare type RouterBeanHandler = (req: Request, res: Response, next?: NextFunction) => any;
declare type RouteOptions = { middlewares: Array<RequestHandler> }

/**
 * Registers a RequestHandler
 * @param httpMethod
 * @param path {string}
 * @param options {RouteOptions}
 * @decorator
 */
export function Route<This>(
  httpMethod: HTTPMethod,
  path: string,
  options: RouteOptions = { middlewares: [] },
) {
  return (
    method: RouterBeanHandler,
    context: ClassMethodDecoratorContext<This, RouterBeanHandler>,
  ) => {
    setImmediate(() => {
      const bean = registeredMethods.get(method) as ExpressRouterBean;
      if (bean?.routerConfig) {
        const { routerConfig } = bean;
        const { router } = routerConfig;
        logger.debug(`Mapping ${bean.className}.${String(context.name)} with ${httpMethod} ${routerConfig.path}${path}`);
        router[RouterMethods[httpMethod]](path, ...options.middlewares, method.bind(bean));
      }
    });
    return method;
  };
}
