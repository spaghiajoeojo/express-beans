export { default as ExpressBeans } from '@/core/ExpressBeans';
export { Bean } from '@/core/decorators/Bean';
export * as types from '@/ExpressBeansTypes';
export { InjectBean } from '@/core/decorators/InjectBean';
export { Route } from '@/core/decorators/Route';
export { RouterBean } from '@/core/decorators/RouterBean';
export { InjectLogger } from '@/logging/decorators/InjectLogger';
export { Cached } from '@/cache/decorators/Cached';
export { Order } from '@/core/decorators/Order';
export type { Logger } from 'pino';
export { createLogger } from '@/logging/Logger';

/* aliases (Springboot like) */
export { Bean as Component } from '@/core/decorators/Bean';
export { Bean as Service } from '@/core/decorators/Bean';
export { RouterBean as Controller } from '@/core/decorators/RouterBean';
export { Route as Mapping } from '@/core/decorators/Route';
export { InjectBean as Autowired } from '@/core/decorators/InjectBean';

export * from '@/hooks/decorators';
