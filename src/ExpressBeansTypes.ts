import { Router } from 'express';

export interface ExpressBean {
  _className: string,
  _instance: any,
  _beanUUID: string,
}

export interface ExpressRouterBean extends ExpressBean {
  _routerConfig: { path: string, router: Router},
}

export interface ExpressBeansOptions {
  listen: boolean,
  port: number,
  routerBeans: Array<any>,
  onInitialized?: () => Promise<void> | void,
  onError?: (err: Error) => Promise<void> | void,
  logRequests?: boolean,
  baseURL?: string
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

export declare type Cache = {
  type?: 'memory',
  duration: number,
}
