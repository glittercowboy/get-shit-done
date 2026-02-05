/**
 * Centralized error message templates with actionable guidance
 */

export const ERROR_MESSAGES = {
  // Config errors
  CONFIG_NOT_FOUND: (path: string) =>
    `Config file not found at ${path}\n` +
    `  This is normal for new installations.\n` +
    `  To create config: echo '{"version": "1.0.0", "services": []}' > ${path}`,

  CONFIG_INVALID_JSON: (path: string, error: string) =>
    `Invalid JSON in config file ${path}:\n` +
    `  ${error}\n` +
    `  Fix: Validate your JSON at jsonlint.com`,

  CONFIG_PERMISSION_DENIED: (path: string) =>
    `Cannot read config at ${path}\n` +
    `  Fix: chmod 644 ${path}`,

  CONFIG_VALIDATION_FAILED: (path: string, errors: string[]) =>
    `Config validation failed at ${path}:\n` +
    errors.map(e => `  - ${e}`).join('\n') + '\n' +
    `  Fix: Review the schema requirements and update your config`,

  // Standards errors
  STANDARDS_REPO_TIMEOUT: (url: string) =>
    `Standards repository clone timed out after 30 seconds\n` +
    `  Repository: ${url}\n` +
    `  Possible fixes:\n` +
    `  - Check your network connection\n` +
    `  - Verify the repository URL is correct\n` +
    `  - Ensure you have access to the repository`,

  STANDARDS_REPO_AUTH_FAILED: (url: string) =>
    `Authentication failed for standards repository\n` +
    `  Repository: ${url}\n` +
    `  Fixes for SSH: Ensure your SSH key is added to ssh-agent\n` +
    `  Fixes for HTTPS: Check your credentials or token`,

  STANDARDS_FILE_INVALID: (file: string, error: string) =>
    `Invalid format in standards file ${file}:\n` +
    `  ${error}\n` +
    `  Fix: Check the file follows the expected JSON format`,

  STANDARDS_FILE_NOT_FOUND: (file: string) =>
    `Standards file not found: ${file}\n` +
    `  This may indicate an incomplete standards repository.\n` +
    `  Fix: Ensure the standards repository contains all required files`,

  // Service matching errors
  SERVICE_NO_MATCHES: (serviceName: string) =>
    `No configuration found for service "${serviceName}"\n` +
    `  To add this service, update ~/.gsd/company.json`,

  SERVICE_AMBIGUOUS_MATCH: (serviceName: string, matches: string[]) =>
    `Multiple possible matches for service "${serviceName}":\n` +
    matches.map(m => `  - ${m}`).join('\n') + '\n' +
    `  Fix: Use a more specific service name`,

  // Git errors
  GIT_OPERATION_FAILED: (operation: string, error: string) =>
    `Git ${operation} failed:\n` +
    `  ${error}\n` +
    `  Fix: Check your git configuration and repository state`,

  GIT_REPO_NOT_FOUND: (path: string) =>
    `Not a git repository: ${path}\n` +
    `  Fix: Run 'git init' or ensure you're in the correct directory`,

  // Cache errors
  CACHE_WRITE_FAILED: (path: string) =>
    `Failed to write cache at ${path}\n` +
    `  Fix: Ensure the directory exists and is writable`,

  // Generic
  UNEXPECTED_ERROR: (context: string, error: string) =>
    `Unexpected error in ${context}:\n` +
    `  ${error}\n` +
    `  This is likely a bug. Please report it.`,

  FEATURE_UNAVAILABLE: (feature: string, reason: string) =>
    `Feature "${feature}" is currently unavailable:\n` +
    `  ${reason}\n` +
    `  The system will continue with reduced functionality.`
};