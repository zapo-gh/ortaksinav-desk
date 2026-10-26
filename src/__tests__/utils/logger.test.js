/**
 * Logger Test Suite
 * Tests the logger utility with proper mocking of console methods
 */

// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};

// Mock console methods
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

describe('Logger Utility', () => {
  let logger;

  beforeEach(async () => {
    // Replace console with mocks before importing logger
    global.console = {
      ...originalConsole,
      ...mockConsole,
    };

    // Clear all mocks
    vi.clearAllMocks();

    // Reset NODE_ENV
    delete process.env.NODE_ENV;
    delete process.env.REACT_APP_DEBUG;

    // Clear module cache to force re-import
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original console
    global.console = originalConsole;
  });

  describe('Development Mode', () => {
    beforeEach(async () => {
      process.env.NODE_ENV = 'development';
      process.env.REACT_APP_DEBUG = undefined;
      // Re-import logger to get fresh instance
      logger = (await import('../../utils/logger')).default;
    });

    it('should call console.log when logger.log is called', async () => {
      logger.log('Test message');
      expect(mockConsole.log).toHaveBeenCalledWith('Test message');
    });

    it('should call console.info when logger.info is called', async () => {
      logger.info('Test info');
      expect(mockConsole.info).toHaveBeenCalledWith('Test info');
    });

    it('should call console.warn when logger.warn is called', async () => {
      logger.warn('Test warning');
      expect(mockConsole.warn).toHaveBeenCalledWith('Test warning');
    });

    it('should call console.debug when logger.debug is called', async () => {
      logger.debug('Test debug');
      expect(mockConsole.debug).toHaveBeenCalledWith('Test debug');
    });
  });

  describe('Production Mode', () => {
    beforeEach(async () => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_DEBUG = undefined;
      logger = (await import('../../utils/logger')).default;
    });

    it('should not call console.log when logger.log is called in production', async () => {
      logger.log('Test message');
      expect(mockConsole.log).not.toHaveBeenCalled();
    });

    it('should not call console.info when logger.info is called in production', async () => {
      logger.info('Test info');
      expect(mockConsole.info).not.toHaveBeenCalled();
    });

    it('should not call console.warn when logger.warn is called in production', async () => {
      logger.warn('Test warning');
      expect(mockConsole.warn).not.toHaveBeenCalled();
    });

    it('should not call console.debug when logger.debug is called in production', async () => {
      logger.debug('Test debug');
      expect(mockConsole.debug).not.toHaveBeenCalled();
    });
  });

  describe('Debug Mode (REACT_APP_DEBUG=true)', () => {
    beforeEach(async () => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_DEBUG = 'true';
      logger = (await import('../../utils/logger')).default;
    });

    it('should call console.log when REACT_APP_DEBUG is true (even in production)', async () => {
      logger.log('Test message');
      expect(mockConsole.log).toHaveBeenCalledWith('Test message');
    });

    it('should call console.debug when REACT_APP_DEBUG is true (even in production)', async () => {
      logger.debug('Test debug');
      expect(mockConsole.debug).toHaveBeenCalledWith('Test debug');
    });

    it('should call console.info when REACT_APP_DEBUG is true (even in production)', async () => {
      logger.info('Test info');
      expect(mockConsole.info).toHaveBeenCalledWith('Test info');
    });

    it('should call console.warn when REACT_APP_DEBUG is true (even in production)', async () => {
      logger.warn('Test warning');
      expect(mockConsole.warn).toHaveBeenCalledWith('Test warning');
    });
  });

  describe('Error Logging', () => {
    it('should always call console.error regardless of environment (development)', async () => {
      process.env.NODE_ENV = 'development';
      process.env.REACT_APP_DEBUG = undefined;
      logger = (await import('../../utils/logger')).default;

      logger.error('Test error');
      expect(mockConsole.error).toHaveBeenCalledWith('Test error');
    });

    it('should always call console.error regardless of environment (production)', async () => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_DEBUG = undefined;
      logger = (await import('../../utils/logger')).default;

      logger.error('Test error');
      expect(mockConsole.error).toHaveBeenCalledWith('Test error');
    });

    it('should handle multiple arguments in error logging', async () => {
      process.env.NODE_ENV = 'development';
      process.env.REACT_APP_DEBUG = undefined;
      logger = (await import('../../utils/logger')).default;

      logger.error('Error:', 'Additional info', { code: 500 });
      expect(mockConsole.error).toHaveBeenCalledWith('Error:', 'Additional info', { code: 500 });
    });
  });

  describe('Multiple Arguments', () => {
    beforeEach(async () => {
      process.env.NODE_ENV = 'development';
      process.env.REACT_APP_DEBUG = undefined;
      logger = (await import('../../utils/logger')).default;
    });

    it('should handle multiple arguments in log', async () => {
      logger.log('Message:', 'Additional info', { data: 'test' });
      expect(mockConsole.log).toHaveBeenCalledWith('Message:', 'Additional info', { data: 'test' });
    });

    it('should handle multiple arguments in info', async () => {
      logger.info('Info:', 'Additional info', { data: 'test' });
      expect(mockConsole.info).toHaveBeenCalledWith('Info:', 'Additional info', { data: 'test' });
    });

    it('should handle multiple arguments in warn', async () => {
      logger.warn('Warning:', 'Additional info', { data: 'test' });
      expect(mockConsole.warn).toHaveBeenCalledWith('Warning:', 'Additional info', { data: 'test' });
    });

    it('should handle multiple arguments in debug', async () => {
      logger.debug('Debug:', 'Additional info', { data: 'test' });
      expect(mockConsole.debug).toHaveBeenCalledWith('Debug:', 'Additional info', { data: 'test' });
    });
  });

  describe('Logger API', () => {
    beforeEach(async () => {
      process.env.NODE_ENV = 'development';
      logger = (await import('../../utils/logger')).default;
    });

    it('should export default logger object', async () => {
      expect(logger).toBeDefined();
      expect(typeof logger).toBe('object');
    });

    it('should have all required methods', async () => {
      expect(typeof logger.log).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
    });

    it('should not have methods that do not exist in implementation', async () => {
      // These methods were tested but don't exist in logger.js
      expect(logger.table).toBeUndefined();
      expect(logger.group).toBeUndefined();
      expect(logger.groupEnd).toBeUndefined();
      expect(logger.time).toBeUndefined();
      expect(logger.timeEnd).toBeUndefined();
    });
  });
});
