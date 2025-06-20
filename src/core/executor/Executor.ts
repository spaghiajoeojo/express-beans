import EventEmitter from 'events';
import { logger } from '@/core';
import {
  isError, Result, wrap,
} from '@/core/errors';
import { Task } from './Task';

const phases = {
  0: 'start',
  1: 'register',
  2: 'routing',
  3: 'init',
  4: 'run',
  5: 'exit',
} as const;
export type ExecutorPhase = typeof phases[keyof typeof phases];

type ExecutorEventMap = {
  [phase in ExecutorPhase]: [Result<void>[]];
} & {
  error: [Error];
};

class ExecutorImpl extends EventEmitter<ExecutorEventMap> {
  public readonly PHASES = phases;

  private tasks: Map<ExecutorPhase, Array<Task>> = new Map();

  private phasePromises: Map<ExecutorPhase, Promise<Result<void>[]>> = new Map();

  private started = false;

  execution: Promise<Result<void>[]> | null = null;

  private taskMap: Map<any, Task> = new Map();

  constructor() {
    super();
  }

  /**
 * Registers a task to be executed in a given phase.
 * @param task {() => Promise<void> | void} function to be executed, can return a Promise or void
 * @param phase {ExecutorPhase} phase in which the task should be executed
 */
  setExecution(phase: ExecutorPhase, taskFn: () => Promise<void> | void, contextKey?: any, order = 0) {
    let phaseTasks = this.tasks.get(phase) ?? [];
    const task = new Task({ task: taskFn, phase, order });
    if (contextKey) {
      this.taskMap.set(contextKey, task);
    }
    phaseTasks.push(task);
    this.tasks.set(phase, phaseTasks);
  }

  getExecutionPhase(phase: ExecutorPhase) {
    return this.phasePromises.get(phase) ?? new Promise((resolve) => {
      this.once(phase, resolve);
    });
  }

  getTask(contextKey: any) {
    return this.taskMap.get(contextKey);
  }

  /**
 * Executes all registered tasks in a defined sequence based on phases.
 * Tasks are sorted by their phase index and executed concurrently within each phase.
 * Debug logs are generated for each phase indicating the number of tasks being executed.
 */
  async execute(): Promise<Result<void, Error>[]> {
    this.started = true;
    const phasesToExecute = Object.entries(phases)
      .filter(([, phase]) => phase !== 'exit')
      .map(([idx, phase]) => [Number(idx), phase] as const)
      .sort(([a], [b]) => a - b)
      .map(([, phase]) => phase);

    const results = [];
    for (const phase of phasesToExecute) {
      const result = await this.executePhase(phase);
      results.push(...result);
    }

    return results;
  }

  /**
   * Groups tasks by their execution order
   * @param tasks
   * @returns {{ [order: number]: (() => Promise<void> | void)[] }}}
   */
  private groupByOrder(tasks: Array<Task>): { [order: number]: (() => Promise<void> | void)[] } {
    return tasks.reduce((acc, taskObj) => {
      const { order, task } = taskObj;
      acc[order] = acc[order] ?? [];
      acc[order].push(task);
      return acc;
    }, {} as { [order: number]: (() => Promise<void> | void)[] });
  }

  /**
   * Executes all tasks in a given phase
   * @param phase {ExecutorPhase}
   * @returns {Promise<Result<void>[]>}
   */
  private async executePhase(phase: ExecutorPhase) {
    const tasksToExecute = this.tasks.get(phase) ?? [];
    logger.debug(`Executing phase ${phase} with ${tasksToExecute.length} tasks`);

    const groupedTasks = this.groupByOrder(tasksToExecute);

    const allResults: Result<void>[] = [];

    const sortedGroups = Object.entries(groupedTasks)
      .sort(([a], [b]) => Number(a) - Number(b));

    for (const [, tasks] of sortedGroups) {
      const wrappedTasks = tasks.map((task) => wrap(task));
      const groupResults = await Promise.all(wrappedTasks);

      allResults.push(...groupResults);
    }
    const processedResults = this.processPhaseResults(allResults, phase);

    const phasePromise = Promise.resolve(processedResults);
    this.phasePromises.set(phase, phasePromise);

    const result = await phasePromise;
    this.emit(phase, result);

    return result;
  }

  private processPhaseResults(results: Result<void>[], phase: ExecutorPhase): Result<void>[] {
    return results.map((result, index) => {
      if (isError(result)) {
        logger.error(new Error(`Task ${index} in phase ${phase} failed`, { cause: result.error }));
        this.emit('error', result.error);
      }
      return result;
    });
  }

  private async beforeExit() {
    await this.stopLifecycle();
  }

  private async gracefulShutdown() {
    logger.debug('Graceful shutdown');
    await this.stopLifecycle();
    logger.info('Graceful shutdown completed');
    process.exit(0);
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
      process.on('beforeExit', this.beforeExit.bind(this));
      process.on('SIGTERM', this.gracefulShutdown.bind(this));
      process.on('SIGINT', this.gracefulShutdown.bind(this));
      this.execution = this.execute();
    });
  }

  /**
 * Stops the lifecycle of the ExpressBeans application.
 * All tasks are cleared and the lifecycle is stopped.
 * USE ONLY IF YOU KNOW WHAT YOU ARE DOING
 * @returns {Promise<void>}
 */
  async stopLifecycle(): Promise<void> {
    logger.debug('Stopping lifecycle');
    await this.executePhase('exit').then(() => {
      this.phasePromises.clear();
      this.tasks.clear();
      this.started = false;
      this.execution = null;
      this.removeAllListeners();
      logger.debug('Lifecycle stopped');
      process.removeAllListeners();
    });
  }
}

type ExecutorType = typeof ExecutorImpl & ExecutorImpl;
let instance: ExecutorImpl | null = null;

function getInstance() {
  instance ??= new ExecutorImpl();
  return instance as ExecutorType;
}

export const Executor: ExecutorType = getInstance();
