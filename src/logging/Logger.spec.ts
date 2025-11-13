import pino from 'pino';
import { createLogger } from '@/logging/Logger';
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
    createLogger('test-scope');

    // THEN
    expect(pino).toHaveBeenCalledWith({
      msgPrefix: '[test-scope] ',
      'transport': {
        'options': {
          'colorize': true,
        },
        'target': 'pino-pretty',
      },
    });
    expect(pinoMock.level).toBe('debug');
  });

  it('creates a logger with level info for production', async () => {
    // GIVEN
    process.env.NODE_ENV = 'production';
    const pinoMock: any = {};
    const pinoConstructor = pino as unknown as Mock;
    pinoConstructor.mockReturnValue(pinoMock);

    // WHEN
    createLogger('test-scope');

    // THEN
    expect(pino).toHaveBeenCalledWith({
      msgPrefix: '[test-scope] ',
      'redact': {
        'censor': '****',
        'paths': [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-api-key"]',
          'req.headers["x-access-token"]',
          'res.headers.set-cookie',
        ],
      },
    });
    expect(pinoMock.level).toBe('info');
  });
});
