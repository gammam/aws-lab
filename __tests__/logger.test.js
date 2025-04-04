const { Logger } = require('../src/services/Logger');

describe('Logger', () => {
  let logger;
  let consoleSpy;

  beforeEach(() => {
    logger = new Logger();
    consoleSpy = {
      debug: jest.spyOn(console, 'debug').mockImplementation(),
      log: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('debug dovrebbe formattare il messaggio e usare console.debug', () => {
    logger.debug('Test debug');
    expect(consoleSpy.debug).toHaveBeenCalled();
    expect(consoleSpy.debug.mock.calls[0][0]).toMatch(/\[DEBUG\] Test debug/);
  });

  test('info dovrebbe formattare il messaggio e usare console.log', () => {
    logger.info('Test info');
    expect(consoleSpy.log).toHaveBeenCalled();
    expect(consoleSpy.log.mock.calls[0][0]).toMatch(/\[INFO\] Test info/);
  });

  test('warn dovrebbe formattare il messaggio e usare console.warn', () => {
    logger.warn('Test warn');
    expect(consoleSpy.warn).toHaveBeenCalled();
    expect(consoleSpy.warn.mock.calls[0][0]).toMatch(/\[WARN\] Test warn/);
  });

  test('error dovrebbe formattare il messaggio e usare console.error', () => {
    logger.error('Test error');
    expect(consoleSpy.error).toHaveBeenCalled();
    expect(consoleSpy.error.mock.calls[0][0]).toMatch(/\[ERROR\] Test error/);
  });
});