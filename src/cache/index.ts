import { CacheEntry } from '@/cache/types';

export const caches = new Map<string | symbol, Map<string, CacheEntry>>();

export { Cached } from '@/cache/decorators/Cached';
export { InvalidateCache } from '@/cache/decorators/InvalidateCache';

