import { flushPromises } from '@test/utils/testUtils';
import { registeredBeans, registeredMethods } from '@/core';
import { Order, Setup } from '@/main';
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

describe('Order.ts', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    registeredMethods.clear();
    registeredBeans.clear();
    Executor.stopLifecycle();
  });

  it('sets a hook order', async () => {
    // GIVEN
    const mock = jest.fn();

    class Class {
      @Setup
      @Order(1)
      init() {
        mock();
      }
    }

    // WHEN
    const bean: any = new Class();
    registeredMethods.set(bean.init, bean);
    registeredBeans.set('Class', bean);
    await flushPromises();
    await Executor.execute();

    // THEN
    expect(Executor.getTask(bean.init)?.order)
      .toBe(1);
    expect(mock).toHaveBeenCalled();
  });

  it('sets a default order', async () => {
    // GIVEN
    const mock = jest.fn();

    class Class {
      @Setup
      init() {
        mock();
      }
    }

    // WHEN
    const bean: any = new Class();
    registeredMethods.set(bean.init, bean);
    registeredBeans.set('Class', bean);
    await flushPromises();
    await Executor.execute();

    // THEN
    expect(Executor.getTask(bean.init)?.order)
      .toBe(0);
    expect(mock).toHaveBeenCalled();
  });

  it('sets a negative order', async () => {
    // GIVEN
    const mock = jest.fn();

    class Class {
      @Setup
      @Order(-1)
      init() {
        mock();
      }
    }

    // WHEN
    const bean: any = new Class();
    registeredMethods.set(bean.init, bean);
    registeredBeans.set('Class', bean);
    await flushPromises();
    await Executor.execute();

    // THEN
    expect(Executor.getTask(bean.init)?.order)
      .toBe(-1);
    expect(mock).toHaveBeenCalled();
  });

  it('fails to set a order on a generic function', async () => {
    // GIVEN
    const mock = jest.fn();

    class Class {
      @Order(1)
      init() {
        mock();
      }
    }

    // WHEN
    const bean: any = new Class();
    registeredMethods.set(bean.init, bean);
    registeredBeans.set('Class', bean);
    await flushPromises();
    Executor.on('error', (error) => {
      expect(error).toEqual(new Error('Method not registered for execution'));
    });
    Executor.startLifecycle();
    await Executor.execution;
    await flushPromises();

    // THEN
    expect(mock).not.toHaveBeenCalled();
    expect.assertions(2);
  });
});
