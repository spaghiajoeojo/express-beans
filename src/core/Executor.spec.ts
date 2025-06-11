import { Executor } from '@/core/Executor';

describe('Executor.ts', () => {
  beforeEach(() => {
    Executor.stopLifecycle();
  });

  it.each([
    'start', 'register', 'decorate', 'init',
  ] as const)('emits events when a phase is executed: %s', async (phase) => {
    const mock = jest.fn();
    Executor.eventEmitter.on(phase, mock);
    Executor.startLifecycle();
    await Executor.getExecutionPhase(phase);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it.each([
    'start', 'register', 'decorate', 'init',
  ] as const)('execute tasks when a phase is executed: %s', async (phase) => {
    const mock = jest.fn();
    Executor.setExecution(phase, () => mock());
    Executor.startLifecycle();
    await Executor.getExecutionPhase(phase);
    expect(mock).toHaveBeenCalledTimes(1);
  });
});
