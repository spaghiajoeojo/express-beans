import { Hook } from './Hook';

export const Setup = Hook('init');
export const PostConstruct = Hook('init');
export const Shutdown = Hook('exit');
export const PreDestroy = Hook('exit');
