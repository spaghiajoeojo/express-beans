import Logger from '@/Logger';
import { ExpressBean } from '@/ExpressBeansTypes';

export const registeredBeans = new Map<string, ExpressBean>();
export const injections = new Map<string, Map<string, object>>();
export const logger = Logger.create('ExpressBeans');
