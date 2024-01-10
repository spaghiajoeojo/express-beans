import { flushPromises } from '@test/utils/testUtils';
import { InjectLogger } from '@/decorators/InjectLogger';
import { Bean, Logger as PinoLogger } from '@/main';
import Logger from '@/Logger';

jest.mock('@/decorators', () => ({
  registeredBeans: new Map(),
  registeredMethods: new Map(),
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock('@/Logger');

describe('InjectLogger.ts', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (Logger as jest.Mock).mockImplementation(jest.requireActual('@/Logger').default);
  });

  it('injects a logger', async () => {
    // GIVEN
    class Class {
      @InjectLogger()
      private logger!: PinoLogger;

      getLogger() {
        return this.logger;
      }
    }

    // WHEN
    const instance = new Class();
    await flushPromises();

    // THEN
    expect(instance.getLogger()).toBeDefined();
  });

  it('injects a logger with a scope', async () => {
    // GIVEN
    @Bean
    class ClassBean {
      @InjectLogger('ClassBean')
      private logger!: PinoLogger;

      getLogger() {
        return this.logger;
      }
    }

    // WHEN
    const instance = new ClassBean();
    await flushPromises();
    await flushPromises();
    await flushPromises();

    // THEN
    instance.getLogger().debug('ciao');
    expect(instance.getLogger()).toBeDefined();
    expect(Logger).toHaveBeenCalledWith('ClassBean');
  });
});
