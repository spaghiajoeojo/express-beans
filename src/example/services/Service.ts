import { Bean } from '@/main';

@Bean
export default class Service {
  hello() {
    return 'Hello from Service!';
  }
}
