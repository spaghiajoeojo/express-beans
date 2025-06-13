import EventEmitter from 'events';
import { logger } from '@/core';
import {
  isError, Result, wrap,
} from '@/core/errors';

const phases = {
  0: 'start',
  1: 'register',
  2: 'decorate',
  3: 'init',
} as const;
export type ExecutorPhase = typeof phases[keyof typeof phases];

type ExecutorEventMap = {
  [phase in ExecutorPhase]: [Result<void>[]];
} & {
  error: [Error];
  finished: [];
};

class ExecutorImpl {
  static readonly PHASES = phases;

  tasks: Map<ExecutorPhase, Array<() => Promise<void> | void>> = new Map();

  eventEmitter = new EventEmitter<ExecutorEventMap>();

  phasePromises: Map<ExecutorPhase, Promise<Result<void>[]>> = new Map();

  started = false;

  execution: Promise<Result<void>[]> | null = null;



  /**
 * Registers a task to be executed in a given phase.
 * @param task {() => Promise<void> | void} function to be executed, can return a Promise or void
 * @param phase {ExecutorPhase} phase in which the task should be executed
 */
  setExecution(phase: ExecutorPhase, task: () => Promise<void> | void) {
    if (!this.tasks.has(phase)) {
      this.tasks.set(phase, []);
    }
    this.tasks.get(phase)?.push(task);
  }

  getExecutionPhase(phase: ExecutorPhase) {
    return this.phasePromises.get(phase) ?? new Promise((resolve) => {
      this.eventEmitter.once(phase, resolve);
    });
  }

  /**
 * Executes all registered tasks in a defined sequence based on phases.
 * Tasks are sorted by their phase index and executed concurrently within each phase.
 * Debug logs are generated for each phase indicating the number of tasks being executed.
 */
  async execute(): Promise<Result<void, Error>[]> {
    this.started = true;
    return Object.entries(phases)
      .map(([idx, phase]) => [Number(idx), phase] as const)
      .sort(([a], [b]) => a - b)
      .map(([, phase]) => phase)
      .reduce((
        previous: {
          promise: Promise<Result<void>[]>, phase: ExecutorPhase
        },
        currentPhase,
        currentIndex,
      ) => ({
        promise: previous.promise.then(
          async () => {
            this.eventEmitter.emit(previous.phase, await previous.promise);
            const tasksToExecute = this.tasks.get(currentPhase) ?? [];
            logger.debug(`Executing phase ${currentPhase} with ${tasksToExecute.length} tasks`);
            const wrappedTasks = tasksToExecute.map(async (task) => {
              const result = wrap(task);
              return Promise.resolve(result);
            });

            const resultMap = async (result: Result<void>, index: number) => {
              if (isError(result)) {
                logger.error(`Task ${index} in phase ${currentPhase} failed`, { cause: result.error });
                this.eventEmitter.emit('error', result.error);
              }
              return result;
            };

            const phasePromise = Promise.all(wrappedTasks)
              .then((results) => Promise.all(results.map(resultMap)));

            this.phasePromises.set(currentPhase, phasePromise);
            if (currentIndex === Object.keys(phases).length - 1) {
              this.eventEmitter.emit(currentPhase, await phasePromise);
            }
            return phasePromise;
          },
        ),
        phase: currentPhase,
      }), { promise: Promise.resolve<Result<void, Error>[]>([]), phase: 'start' })
      .promise;
  }

  /**
 * Starts the lifecycle of the ExpressBeans application.
 * If there are tasks to execute, they are executed in the defined sequence.
 * If execution is already in progress, the function does nothing.
 * @returns {void}
 */
  startLifecycle(): void {
    setImmediate(() => {
      if (this.started) {
        return;
      }
      logger.debug('Starting lifecycle');
      this.execution = this.execute();
    });
  }

  /**
 * Stops the lifecycle of the ExpressBeans application.
 * All tasks are cleared and the lifecycle is stopped.
 * USE ONLY IF YOU KNOW WHAT YOU ARE DOING
 * @returns {void}
 */
  stopLifecycle(): void {
    logger.debug('Stopping lifecycle');
    this.phasePromises.clear();
    this.tasks.clear();
    this.started = false;
    this.execution = null;
    this.eventEmitter.removeAllListeners();
    this.eventEmitter = new EventEmitter<ExecutorEventMap>();
    logger.debug('Lifecycle stopped');
  }
}

type ExecutorType = typeof ExecutorImpl & ExecutorImpl;
let instance: ExecutorImpl | null = null;

function getInstance() {
  if (!instance) {
    instance = new ExecutorImpl();
  }
  return instance;
}

export const Executor: ExecutorType = new Proxy(ExecutorImpl, {
  get(target, prop, receiver) {
    if (prop in target) {
      return Reflect.get(target, prop, receiver);
    }

    const inst = getInstance();
    const value = Reflect.get(inst, prop, inst);

    if (typeof value === 'function') {
      return value.bind(inst);
    }

    return value;
  },

  set(target, prop, value, receiver) {
    if (prop in target) {
      return Reflect.set(target, prop, value, receiver);
    }

    const inst = getInstance();
    return Reflect.set(inst, prop, value, inst);
  },

  has(target, prop) {
    return Reflect.has(target, prop) || Reflect.has(getInstance(), prop);
  },

  ownKeys(target) {
    const classKeys = Reflect.ownKeys(target);
    const instanceKeys = Reflect.ownKeys(getInstance());
    return [...classKeys, ...instanceKeys];
  },

  getOwnPropertyDescriptor(target, prop) {
    return Reflect.getOwnPropertyDescriptor(target, prop)
           || Reflect.getOwnPropertyDescriptor(getInstance(), prop);
  },
}) as ExecutorType;
