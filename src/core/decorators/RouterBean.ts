import express from 'express';
import { Bean } from '@/core/decorators/Bean';

/**
 * Creates an ExpressBean and a Router for this class
 * @param path {string}
 * @decorator
 */
export function RouterBean(path: string, middlewares: Array<express.RequestHandler> = []) {
  return (target: any, context: any) => {
    Bean(target, context);
    const router = express.Router();
    if (middlewares.length > 0) {
      router.use(...middlewares);
    }
    Reflect.defineProperty(target._instance, '_routerConfig', {
      get: () => ({ path, router }),
    });
  };
}
