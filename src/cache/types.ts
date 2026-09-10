export type BeanFunction = (...args: any) => any
export type CacheEntry = {
  data: ReturnType<BeanFunction>,
  expiration: number,
}
