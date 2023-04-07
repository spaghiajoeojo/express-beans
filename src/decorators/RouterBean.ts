import express from 'express';
import { Bean } from '@/decorators/Bean';

/**
 * Creates an ExpressBean and a Router for this class
 * @param path {string}
 * @decorator
 */
export function RouterBean(path: string) {
  return (target: any) => {
    Bean(target);
    const router = express.Router();
    Reflect.defineProperty(target.instance, 'routerConfig', {
      get: () => ({ path, router }),
    });
  };
}
