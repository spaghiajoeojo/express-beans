import { flushPromises } from '@test/utils/testUtils';
import { registeredBeans, registeredMethods } from '@/core';
import { Setup } from '@/main';
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

describe('Setup.ts', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    registeredMethods.clear();
    registeredBeans.clear();
    Executor.stopLifecycle();
  });

  it('execute a setup function', async () => {
    // GIVEN
    const mock = jest.fn();
    class Class {
      initialized: boolean = false;

      @Setup
      init() {
        this.initialized = true;
        mock();
      }
    }
    const bean: any = new Class();
    registeredMethods.set(bean.init, bean);
    registeredBeans.set('Class', bean);
    await flushPromises();
    await Executor.execute();

    // THEN
    expect(bean.initialized)
      .toBe(true);
    expect(mock).toHaveBeenCalled();
  });

  it('execute a setup async function', async () => {
    // GIVEN
    const mock = jest.fn();
    class Class {
      initialized: boolean = false;

      @Setup
      async init() {
        this.initialized = true;
        mock();
      }
    }
    const bean: any = new Class();
    registeredMethods.set(bean.init, bean);
    registeredBeans.set('Class', bean);
    await flushPromises();
    await Executor.execute();

    // THEN
    expect(bean.initialized)
      .toBe(true);
    expect(mock).toHaveBeenCalled();
  });
});
