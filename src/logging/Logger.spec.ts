import pino from 'pino';
import Logger from '@/logging/Logger';
import Mock = jest.Mock;

jest.mock('pino');
jest.mock('pino-pretty');

describe('Logger.ts', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('creates a logger', async () => {
    // GIVEN
    process.env.NODE_ENV = '';
    const pinoMock: any = {};
    const pinoConstructor = pino as unknown as Mock;
    pinoConstructor.mockReturnValue(pinoMock);

    // WHEN
    Logger('test-scope');

    // THEN
    expect(pino).toHaveBeenCalledWith({ msgPrefix: '[test-scope] ' }, undefined);
    expect(pinoMock.level).toBe('debug');
  });

  it('creates a logger with level info for production', async () => {
    // GIVEN
    process.env.NODE_ENV = 'production';
    const pinoMock: any = {};
    const pinoConstructor = pino as unknown as Mock;
    pinoConstructor.mockReturnValue(pinoMock);

    // WHEN
    Logger('test-scope');

    // THEN
    expect(pino).toHaveBeenCalledWith({ msgPrefix: '[test-scope] ' }, undefined);
    expect(pinoMock.level).toBe('info');
  });
});
