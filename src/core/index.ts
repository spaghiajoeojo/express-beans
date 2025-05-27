import Logger from '@/logging/Logger';
import type { ExpressBean } from '@/ExpressBeansTypes';

export const registeredBeans = new Map<string, ExpressBean>();
export const registeredMethods = new Map<any, ExpressBean>();
export const logger = Logger();

const phases = {
  1: 'register',
  2: 'decorate',
  3: 'init',
} as const;

export type ExecutorPhase = typeof phases[keyof typeof phases];
const tasks: Map<ExecutorPhase, Array<() => Promise<void> | void>> = new Map();
const phasePromises: Map<ExecutorPhase, Promise<void | void[]>> = new Map();

/**
 * Registers a task to be executed in a given phase.
 * @param task {() => Promise<void> | void} function to be executed, can return a Promise or void
 * @param phase {ExecutorPhase} phase in which the task should be executed
 */
export const setExecution = (phase: ExecutorPhase, task: () => Promise<void> | void) => {
  if (!tasks.has(phase)) {
    tasks.set(phase, []);
  }
  tasks.get(phase)?.push(task);
};

export const executionPhase = (phase: ExecutorPhase) => {
  const promise = phasePromises.get(phase);
  if (promise) {
    return promise;
  }
  return Promise.reject(new Error(`Phase ${phase} not executed yet`));
};

/**
 * Executes all registered tasks in a defined sequence based on phases.
 * Tasks are sorted by their phase index and executed concurrently within each phase.
 * Debug logs are generated for each phase indicating the number of tasks being executed.
 */
const execute = async () => {
  Object.entries(phases)
    .map(([idx, phase]) => [Number(idx), phase] as const)
    .sort(([a], [b]) => a - b)
    .forEach(async ([_, phase]) => {
      const tasksToExecute = tasks.get(phase) ?? [];
      logger.debug(`Executing ${tasksToExecute.length} tasks for phase ${phase}`);
      const phasePromise = Promise.all(tasksToExecute.map((task) => task() ?? Promise.resolve()));
      phasePromises.set(phase, phasePromise);
    });
};

/**
 * Starts the lifecycle of the ExpressBeans application.
 * If there are tasks to execute, they are executed in the defined sequence.
 * If execution is already in progress, the function does nothing.
 * @returns {void}
 */
export const startLifecycle = (): void => {
  setImmediate(() => {
    if (phasePromises.size > 0) {
      return;
    }
    logger.debug('Starting lifecycle');
    execute();
  });
};

/**
 * Stops the lifecycle of the ExpressBeans application.
 * All tasks are cleared and the lifecycle is stopped.
 * USE ONLY IF YOU KNOW WHAT YOU ARE DOING
 * @returns {void}
 */
export const stopLifecycle = (): void => {
  logger.debug('Stopping lifecycle');
  phasePromises.clear();
  tasks.clear();
};
