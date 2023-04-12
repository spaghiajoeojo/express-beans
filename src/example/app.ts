import { ExpressBeans } from '@/main';
import Router from '@/example/routers/Router';

ExpressBeans.createApp({
  routerBeans: [Router],
});
