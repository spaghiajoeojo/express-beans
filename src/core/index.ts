import { createLogger } from '@/logging/Logger';
import type { ExpressBean } from '@/ExpressBeansTypes';

export const registeredBeans = new Map<string, ExpressBean>();
export const registeredMethods = new Map<any, ExpressBean>();
export const logger = createLogger();
