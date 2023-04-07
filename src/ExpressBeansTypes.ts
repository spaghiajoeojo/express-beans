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
  beans: any[],
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
