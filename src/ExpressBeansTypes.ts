import { Router } from 'express';

export interface ExpressBean {
  _className: string,
  _instance: any,
  _beanUUID: string,
  _interceptors: Map<string, (target: unknown, prop: string) => unknown>,
  _mappers: Map<string, (original: unknown) => any>,
}

export interface ExpressRouterBean extends ExpressBean {
  _routerConfig: { path: string, router: Router},
}

export interface ExpressBeansOptions {
  listen: boolean,
  port: number,
  routerBeans: Array<any>,
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
