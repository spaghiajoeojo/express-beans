import { flushPromises } from '@test/utils/testUtils';
import { registeredBeans, registeredMethods } from '@/core';
import { Shutdown } from '@/main';
import { Executor } from '@/core/executor';

jest.mock('@/core', () => ({
  registeredBeans: new Map(),
  registeredMethods: new Map(),
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Shutdown.ts', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    registeredMethods.clear();
    registeredBeans.clear();
    Executor.stopLifecycle();
  });

  it('execute a Shutdown function', async () => {
    // GIVEN
    const mock = jest.fn();
    class Class {
      exited: boolean = false;

      @Shutdown
      exit() {
        this.exited = true;
        mock();
      }
    }
    const bean: any = new Class();
    registeredMethods.set(bean.exit, bean);
    registeredBeans.set('Class', bean);
    await flushPromises();
    await Executor.execute();
    await Executor.stopLifecycle();

    // THEN
    expect(bean.exited)
      .toBe(true);
    expect(mock).toHaveBeenCalled();
  });

  it('execute a Shutdown async function', async () => {
    // GIVEN
    const mock = jest.fn();
    class Class {
      exited: boolean = false;

      @Shutdown
      async exit() {
        this.exited = true;
        mock();
      }
    }
    const bean: any = new Class();
    registeredMethods.set(bean.exit, bean);
    registeredBeans.set('Class', bean);
    await flushPromises();
    await Executor.execute();
    await Executor.stopLifecycle();

    // THEN
    expect(bean.exited)
      .toBe(true);
    expect(mock).toHaveBeenCalled();
  });
});
