import { CacheEntry } from '@/cache/types';
import { ExpressBean } from '@/ExpressBeansTypes';

export const caches = new Map<string | symbol, Map<string, CacheEntry>>();

export { Cached } from '@/cache/decorators/Cached';
export { InvalidateCache } from '@/cache/decorators/InvalidateCache';

export const computeCacheName = (bean: ExpressBean, method: string | symbol) => `${bean?._beanUUID}:${String(method)}`;
