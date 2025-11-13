import {
  NextFunction, Request, RequestHandler, Response,
} from 'express';
import { ExpressRouterBean, HTTPMethod } from '@/ExpressBeansTypes';
import {
  logger, registeredMethods,
} from '@/core';
import { RouterMethods } from '@/core/RouterMethods';
import { Executor } from '@/core/executor';

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
    Executor.setExecution('routing', () => {
      const bean = registeredMethods.get(method) as ExpressRouterBean;
      if (bean._routerConfig) {
        const { _routerConfig } = bean;
        const { router } = _routerConfig;
        logger.debug(`Mapping ${bean._className}.${String(context.name)} with ${httpMethod} ${_routerConfig.path}${path}`);
        router[RouterMethods[httpMethod]](path, ...options.middlewares, async (req, res, next) => {
          await Executor.getExecutionPhase('init');
          const result = (bean as any)[context.name].bind(bean)(req, res);
          Promise.resolve(result).catch(next);
        });
      }
    });
    return method;
  };
}
