import { Router } from 'express';

export interface ExpressBean {
  className: string,
  instance: any,
  routerConfig?: { path: string, router: Router},
  isExpressBean: boolean,
}

export interface ExpressBeansOptions {
  listen: boolean,
  port: number,
  routerBeans: Array<any>,
  onInitialized?: () => void,
  onError?: (err: Error) => void,
}

export declare type HTTPMethod =
  'GET' |
  'HEAD' |
  'POST' |
  'PUT' |
  'DELETE' |
  'CONNECT' |
  'OPTIONS' |
  'TRACE' |
  'PATCH';
