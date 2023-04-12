import { NextFunction, Request, Response } from 'express';
import { ExpressRouterBean, HTTPMethod } from '@/ExpressBeansTypes';
import { logger, registeredMethods } from '@/decorators';
import { RouterMethods } from '@/RouterMethods';

declare type RouterBeanHandler = (req: Request, res: Response, next?: NextFunction) => void;

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
