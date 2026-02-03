/**
 * Tests for error message templates
 */

import { ERROR_MESSAGES } from '../../src/errors/messages';

describe('ERROR_MESSAGES', () => {
  describe('Config errors', () => {
    it('should format CONFIG_NOT_FOUND with actionable guidance', () => {
      const message = ERROR_MESSAGES.CONFIG_NOT_FOUND('/home/user/.gsd/company.json');
      expect(message).toContain('Config file not found at /home/user/.gsd/company.json');
      expect(message).toContain('This is normal for new installations');
      expect(message).toContain('echo \'{"version": "1.0.0", "services": []}\' >');
    });

    it('should format CONFIG_INVALID_JSON with fix suggestion', () => {
      const message = ERROR_MESSAGES.CONFIG_INVALID_JSON('/path/to/config.json', 'Unexpected token');
      expect(message).toContain('Invalid JSON in config file /path/to/config.json');
      expect(message).toContain('Unexpected token');
      expect(message).toContain('Fix: Validate your JSON at jsonlint.com');
    });

    it('should format CONFIG_PERMISSION_DENIED with chmod command', () => {
      const message = ERROR_MESSAGES.CONFIG_PERMISSION_DENIED('/etc/config.json');
      expect(message).toContain('Cannot read config at /etc/config.json');
      expect(message).toContain('Fix: chmod 644 /etc/config.json');
    });

    it('should format CONFIG_VALIDATION_FAILED with error list', () => {
      const errors = ['version: Required', 'services: Must be an array'];
      const message = ERROR_MESSAGES.CONFIG_VALIDATION_FAILED('/path/config.json', errors);
      expect(message).toContain('Config validation failed at /path/config.json');
      expect(message).toContain('- version: Required');
      expect(message).toContain('- services: Must be an array');
      expect(message).toContain('Fix: Review the schema requirements');
    });
  });

  describe('Standards errors', () => {
    it('should format STANDARDS_REPO_TIMEOUT with network troubleshooting', () => {
      const message = ERROR_MESSAGES.STANDARDS_REPO_TIMEOUT('git@github.com:company/standards.git');
      expect(message).toContain('Standards repository clone timed out after 30 seconds');
      expect(message).toContain('Repository: git@github.com:company/standards.git');
      expect(message).toContain('Check your network connection');
      expect(message).toContain('Verify the repository URL is correct');
      expect(message).toContain('Ensure you have access to the repository');
    });

    it('should format STANDARDS_REPO_AUTH_FAILED with auth fixes', () => {
      const message = ERROR_MESSAGES.STANDARDS_REPO_AUTH_FAILED('https://github.com/company/standards.git');
      expect(message).toContain('Authentication failed for standards repository');
      expect(message).toContain('Repository: https://github.com/company/standards.git');
      expect(message).toContain('Fixes for SSH: Ensure your SSH key is added to ssh-agent');
      expect(message).toContain('Fixes for HTTPS: Check your credentials or token');
    });

    it('should format STANDARDS_FILE_INVALID with format guidance', () => {
      const message = ERROR_MESSAGES.STANDARDS_FILE_INVALID('services.json', 'Missing closing brace');
      expect(message).toContain('Invalid format in standards file services.json');
      expect(message).toContain('Missing closing brace');
      expect(message).toContain('Fix: Check the file follows the expected JSON format');
    });

    it('should format STANDARDS_FILE_NOT_FOUND with repository check', () => {
      const message = ERROR_MESSAGES.STANDARDS_FILE_NOT_FOUND('standards/services.json');
      expect(message).toContain('Standards file not found: standards/services.json');
      expect(message).toContain('This may indicate an incomplete standards repository');
      expect(message).toContain('Fix: Ensure the standards repository contains all required files');
    });
  });

  describe('Service matching errors', () => {
    it('should format SERVICE_NO_MATCHES with config update instruction', () => {
      const message = ERROR_MESSAGES.SERVICE_NO_MATCHES('unknown-service');
      expect(message).toContain('No configuration found for service "unknown-service"');
      expect(message).toContain('To add this service, update ~/.gsd/company.json');
    });

    it('should format SERVICE_AMBIGUOUS_MATCH with match list', () => {
      const matches = ['user-service', 'user-api', 'user-manager'];
      const message = ERROR_MESSAGES.SERVICE_AMBIGUOUS_MATCH('user', matches);
      expect(message).toContain('Multiple possible matches for service "user"');
      expect(message).toContain('- user-service');
      expect(message).toContain('- user-api');
      expect(message).toContain('- user-manager');
      expect(message).toContain('Fix: Use a more specific service name');
    });
  });

  describe('Git errors', () => {
    it('should format GIT_OPERATION_FAILED with operation context', () => {
      const message = ERROR_MESSAGES.GIT_OPERATION_FAILED('pull', 'Merge conflict');
      expect(message).toContain('Git pull failed');
      expect(message).toContain('Merge conflict');
      expect(message).toContain('Fix: Check your git configuration and repository state');
    });

    it('should format GIT_REPO_NOT_FOUND with init suggestion', () => {
      const message = ERROR_MESSAGES.GIT_REPO_NOT_FOUND('/path/to/dir');
      expect(message).toContain('Not a git repository: /path/to/dir');
      expect(message).toContain('Fix: Run \'git init\'');
      expect(message).toContain('ensure you\'re in the correct directory');
    });
  });

  describe('Cache errors', () => {
    it('should format CACHE_WRITE_FAILED with permission fix', () => {
      const message = ERROR_MESSAGES.CACHE_WRITE_FAILED('/var/cache/gsd');
      expect(message).toContain('Failed to write cache at /var/cache/gsd');
      expect(message).toContain('Fix: Ensure the directory exists and is writable');
    });
  });

  describe('Generic errors', () => {
    it('should format UNEXPECTED_ERROR with bug report suggestion', () => {
      const message = ERROR_MESSAGES.UNEXPECTED_ERROR('service loading', 'null pointer exception');
      expect(message).toContain('Unexpected error in service loading');
      expect(message).toContain('null pointer exception');
      expect(message).toContain('This is likely a bug. Please report it');
    });

    it('should format FEATURE_UNAVAILABLE with degradation notice', () => {
      const message = ERROR_MESSAGES.FEATURE_UNAVAILABLE('standards enrichment', 'Config not found');
      expect(message).toContain('Feature "standards enrichment" is currently unavailable');
      expect(message).toContain('Config not found');
      expect(message).toContain('The system will continue with reduced functionality');
    });
  });

  describe('Placeholder replacement', () => {
    it('should replace all placeholders correctly', () => {
      const path = '/test/path/config.json';
      const message = ERROR_MESSAGES.CONFIG_NOT_FOUND(path);
      expect(message).toContain(path);
      expect(message.match(/\/test\/path\/config\.json/g)).toHaveLength(2); // Path appears twice
    });

    it('should handle special characters in placeholders', () => {
      const path = '/path/with spaces/and-special_chars$.json';
      const message = ERROR_MESSAGES.CONFIG_NOT_FOUND(path);
      expect(message).toContain(path);
    });
  });

  describe('Actionable guidance', () => {
    it('should provide actionable fix for every error type', () => {
      // Check that all messages contain "Fix:" or "Fixes" or actionable instructions
      const testCases = [
        ERROR_MESSAGES.CONFIG_NOT_FOUND('/path'),
        ERROR_MESSAGES.CONFIG_INVALID_JSON('/path', 'error'),
        ERROR_MESSAGES.CONFIG_PERMISSION_DENIED('/path'),
        ERROR_MESSAGES.CONFIG_VALIDATION_FAILED('/path', ['error']),
        ERROR_MESSAGES.STANDARDS_REPO_TIMEOUT('url'),
        ERROR_MESSAGES.STANDARDS_REPO_AUTH_FAILED('url'),
        ERROR_MESSAGES.STANDARDS_FILE_INVALID('file', 'error'),
        ERROR_MESSAGES.STANDARDS_FILE_NOT_FOUND('file'),
        ERROR_MESSAGES.SERVICE_NO_MATCHES('service'),
        ERROR_MESSAGES.SERVICE_AMBIGUOUS_MATCH('service', ['match1']),
        ERROR_MESSAGES.GIT_OPERATION_FAILED('op', 'error'),
        ERROR_MESSAGES.GIT_REPO_NOT_FOUND('/path'),
        ERROR_MESSAGES.CACHE_WRITE_FAILED('/path'),
        ERROR_MESSAGES.FEATURE_UNAVAILABLE('feature', 'reason')
      ];

      testCases.forEach(message => {
        const hasActionableGuidance =
          message.includes('Fix:') ||
          message.includes('Fixes') ||
          message.includes('To create') ||
          message.includes('To add') ||
          message.includes('Possible fixes') ||
          message.includes('will continue');

        expect(hasActionableGuidance).toBe(true);
      });
    });
  });
});