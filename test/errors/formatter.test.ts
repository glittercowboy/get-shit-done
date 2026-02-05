/**
 * Tests for error formatting utilities
 */

import {
  formatConfigError,
  formatGitError,
  formatStandardsError,
  formatServiceError,
  formatFeatureWarning
} from '../../src/errors/formatter';

describe('Error Formatters', () => {
  describe('formatConfigError', () => {
    it('should format ENOENT errors with helpful message', () => {
      const error = { code: 'ENOENT', path: '/home/user/.gsd/company.json' };
      const message = formatConfigError(error);
      expect(message).toContain('Config file not found');
      expect(message).toContain('/home/user/.gsd/company.json');
      expect(message).toContain('This is normal for new installations');
    });

    it('should use default path when not provided', () => {
      const error = { code: 'ENOENT' };
      const message = formatConfigError(error);
      expect(message).toContain('~/.gsd/company.json');
    });

    it('should format EACCES errors with permission fix', () => {
      const error = { code: 'EACCES', path: '/etc/config.json' };
      const message = formatConfigError(error);
      expect(message).toContain('Cannot read config');
      expect(message).toContain('chmod 644');
    });

    it('should format EPERM errors same as EACCES', () => {
      const error = { code: 'EPERM', path: '/etc/config.json' };
      const message = formatConfigError(error);
      expect(message).toContain('Cannot read config');
      expect(message).toContain('chmod 644');
    });

    it('should format SyntaxError with JSON validation tip', () => {
      const error: any = new SyntaxError('Unexpected token } at position 42');
      error.path = '/path/to/config.json';
      const message = formatConfigError(error);
      expect(message).toContain('Invalid JSON');
      expect(message).toContain('Unexpected token } at position 42');
      expect(message).toContain('jsonlint.com');
    });

    it('should handle errors with name property as SyntaxError', () => {
      const error = { name: 'SyntaxError', message: 'Invalid JSON', path: '/config.json' };
      const message = formatConfigError(error);
      expect(message).toContain('Invalid JSON');
      expect(message).toContain('jsonlint.com');
    });

    it('should format ZodError with field-level errors', () => {
      const error = {
        name: 'ZodError',
        errors: [
          { path: ['version'], message: 'Required' },
          { path: ['services', 0, 'name'], message: 'Must be a string' },
          { path: [], message: 'Invalid object' }
        ]
      };
      const message = formatConfigError(error);
      expect(message).toContain('Config validation failed');
      expect(message).toContain('version: Required');
      expect(message).toContain('services.0.name: Must be a string');
      expect(message).toContain('Invalid object');
    });

    it('should fall back to UNEXPECTED_ERROR for unknown errors', () => {
      const error = { message: 'Something went wrong' };
      const message = formatConfigError(error);
      expect(message).toContain('Unexpected error in config loading');
      expect(message).toContain('Something went wrong');
      expect(message).toContain('likely a bug');
    });

    it('should handle errors without message property', () => {
      const error = { toString: () => 'Custom error' };
      const message = formatConfigError(error);
      expect(message).toContain('Unexpected error');
      expect(message).toContain('Custom error');
    });

    it('should never expose stack traces', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at Object.<anonymous> (/path/to/file.js:10:15)';
      const message = formatConfigError(error);
      expect(message).not.toContain('at Object');
      expect(message).not.toContain('/path/to/file.js');
      expect(message).toContain('Test error');
    });
  });

  describe('formatGitError', () => {
    it('should format timeout errors with network troubleshooting', () => {
      const error = { name: 'GitTimeoutError', message: 'Operation timed out' };
      const message = formatGitError(error, 'git@github.com:org/repo.git');
      expect(message).toContain('timed out after 30 seconds');
      expect(message).toContain('git@github.com:org/repo.git');
      expect(message).toContain('Check your network connection');
    });

    it('should detect timeout in error message', () => {
      const error = { message: 'Git operation timeout exceeded' };
      const message = formatGitError(error, 'https://github.com/org/repo.git');
      expect(message).toContain('timed out after 30 seconds');
    });

    it('should format authentication errors with SSH/HTTPS fixes', () => {
      const error = { message: 'Authentication failed' };
      const message = formatGitError(error, 'git@github.com:org/repo.git');
      expect(message).toContain('Authentication failed');
      expect(message).toContain('SSH key is added to ssh-agent');
      expect(message).toContain('Check your credentials or token');
    });

    it('should detect various auth error patterns', () => {
      const patterns = [
        'Permission denied (publickey)',
        'Could not read from remote repository',
        'Authentication required'
      ];

      patterns.forEach(pattern => {
        const error = { message: pattern };
        const message = formatGitError(error);
        expect(message).toContain('Authentication failed');
      });
    });

    it('should format repository not found errors', () => {
      const error = { message: 'Repository not found' };
      const message = formatGitError(error, '/path/to/repo');
      expect(message).toContain('Not a git repository');
      expect(message).toContain('/path/to/repo');
      expect(message).toContain('git init');
    });

    it('should handle "does not exist" pattern', () => {
      const error = { message: 'Remote repository does not exist' };
      const message = formatGitError(error);
      expect(message).toContain('Not a git repository');
    });

    it('should format generic git operation failures', () => {
      const error = { message: 'Merge conflict', operation: 'pull' };
      const message = formatGitError(error);
      expect(message).toContain('Git pull failed');
      expect(message).toContain('Merge conflict');
      expect(message).toContain('Check your git configuration');
    });

    it('should use default operation when not specified', () => {
      const error = { message: 'Unknown error' };
      const message = formatGitError(error);
      expect(message).toContain('Git operation failed');
    });

    it('should handle missing URL gracefully', () => {
      const error = { name: 'GitTimeoutError' };
      const message = formatGitError(error);
      expect(message).toContain('Repository: unknown');
    });
  });

  describe('formatStandardsError', () => {
    it('should format ENOENT as file not found', () => {
      const error = { code: 'ENOENT', path: 'standards/services.json' };
      const message = formatStandardsError(error, 'loading standards');
      expect(message).toContain('Standards file not found: standards/services.json');
      expect(message).toContain('incomplete standards repository');
    });

    it('should use context when path not available', () => {
      const error = { code: 'ENOENT' };
      const message = formatStandardsError(error, 'standards/teams.json');
      expect(message).toContain('Standards file not found: standards/teams.json');
    });

    it('should format SyntaxError as invalid format', () => {
      const error = new SyntaxError('Unexpected end of JSON');
      const message = formatStandardsError(error, 'services.json');
      expect(message).toContain('Invalid format in standards file services.json');
      expect(message).toContain('Unexpected end of JSON');
      expect(message).toContain('Check the file follows the expected JSON format');
    });

    it('should handle name property as SyntaxError', () => {
      const error = { name: 'SyntaxError', message: 'Bad JSON' };
      const message = formatStandardsError(error, 'config.json');
      expect(message).toContain('Invalid format');
      expect(message).toContain('Bad JSON');
    });

    it('should format permission errors as cache write failure', () => {
      const error = { code: 'EACCES' };
      const message = formatStandardsError(error, '/var/cache/standards');
      expect(message).toContain('Failed to write cache at /var/cache/standards');
      expect(message).toContain('Ensure the directory exists and is writable');
    });

    it('should handle EPERM same as EACCES', () => {
      const error = { code: 'EPERM' };
      const message = formatStandardsError(error, '/cache/path');
      expect(message).toContain('Failed to write cache');
    });

    it('should fall back to UNEXPECTED_ERROR', () => {
      const error = { message: 'Unknown standards error' };
      const message = formatStandardsError(error, 'standards loading');
      expect(message).toContain('Unexpected error in standards loading');
      expect(message).toContain('Unknown standards error');
    });

    it('should never expose stack traces', () => {
      const error = new Error('Test');
      error.stack = 'Error: Test\n    at someFunction';
      const message = formatStandardsError(error, 'test');
      expect(message).not.toContain('at someFunction');
    });
  });

  describe('formatServiceError', () => {
    it('should format no matches error', () => {
      const message = formatServiceError('unknown-service');
      expect(message).toContain('No configuration found for service "unknown-service"');
      expect(message).toContain('update ~/.gsd/company.json');
    });

    it('should handle empty matches array', () => {
      const message = formatServiceError('service-name', []);
      expect(message).toContain('No configuration found for service "service-name"');
    });

    it('should format ambiguous match error', () => {
      const matches = ['user-service', 'user-api', 'user-auth'];
      const message = formatServiceError('user', matches);
      expect(message).toContain('Multiple possible matches for service "user"');
      expect(message).toContain('- user-service');
      expect(message).toContain('- user-api');
      expect(message).toContain('- user-auth');
      expect(message).toContain('Use a more specific service name');
    });

    it('should handle unexpected single match gracefully', () => {
      const message = formatServiceError('service', ['single-match']);
      expect(message).toContain('Unexpected error in service matching');
      expect(message).toContain('Invalid match state');
    });
  });

  describe('formatFeatureWarning', () => {
    it('should format feature unavailability warning', () => {
      const message = formatFeatureWarning('standards enrichment', 'Configuration not found');
      expect(message).toContain('Feature "standards enrichment" is currently unavailable');
      expect(message).toContain('Configuration not found');
      expect(message).toContain('system will continue with reduced functionality');
    });

    it('should include both feature name and reason', () => {
      const message = formatFeatureWarning('custom feature', 'Network timeout');
      expect(message).toContain('custom feature');
      expect(message).toContain('Network timeout');
    });
  });

  describe('Stack trace protection', () => {
    it('should never expose stack traces in any formatter', () => {
      const errorWithStack = new Error('Test error');
      errorWithStack.stack = `Error: Test error
        at Object.<anonymous> (/Users/test/file.js:10:15)
        at Module._compile (node:internal/modules/cjs/loader:1159:14)`;

      const formatters = [
        () => formatConfigError(errorWithStack),
        () => formatGitError(errorWithStack),
        () => formatStandardsError(errorWithStack, 'context'),
      ];

      formatters.forEach(formatter => {
        const message = formatter();
        expect(message).not.toContain('at Object');
        expect(message).not.toContain('at Module');
        expect(message).not.toContain('/Users/test/file.js');
        expect(message).not.toContain('node:internal');
        expect(message).toContain('Test error'); // Should contain the message though
      });
    });
  });

  describe('Fallback behavior', () => {
    it('should handle null and undefined gracefully', () => {
      const testCases = [
        () => formatConfigError(null),
        () => formatConfigError(undefined),
        () => formatGitError(null),
        () => formatGitError(undefined),
        () => formatStandardsError(null, 'context'),
        () => formatStandardsError(undefined, 'context')
      ];

      testCases.forEach(testCase => {
        const message = testCase();
        expect(message).toContain('Unexpected error');
        expect(message).not.toContain('null');
        expect(message).not.toContain('undefined');
      });
    });

    it('should handle objects without toString', () => {
      const weirdError = Object.create(null);
      const message = formatConfigError(weirdError);
      expect(message).toContain('Unexpected error');
    });
  });
});