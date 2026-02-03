/**
 * Error formatting utilities for consistent error messages
 */

import { ERROR_MESSAGES } from './messages';

/**
 * Format config-related errors with actionable guidance
 */
export function formatConfigError(error: any): string {
  // Handle null/undefined
  if (!error) {
    return ERROR_MESSAGES.UNEXPECTED_ERROR('config loading', 'Unknown error');
  }

  const configPath = error.path || '~/.gsd/company.json';

  // File not found
  if (error.code === 'ENOENT') {
    return ERROR_MESSAGES.CONFIG_NOT_FOUND(configPath);
  }

  // Permission denied
  if (error.code === 'EACCES' || error.code === 'EPERM') {
    return ERROR_MESSAGES.CONFIG_PERMISSION_DENIED(configPath);
  }

  // JSON parsing error
  if (error instanceof SyntaxError || error.name === 'SyntaxError') {
    return ERROR_MESSAGES.CONFIG_INVALID_JSON(configPath, error.message);
  }

  // Validation error (from Zod)
  if (error.name === 'ZodError' && (error.errors || error.issues)) {
    const issues = error.issues || error.errors;
    const errors = issues.map((e: any) => {
      const path = e.path.join('.');
      return path ? `${path}: ${e.message}` : e.message;
    });
    return ERROR_MESSAGES.CONFIG_VALIDATION_FAILED(configPath, errors);
  }

  // Unexpected error - safely get error message
  let errorMessage = 'Unknown error';
  if (error.message) {
    errorMessage = error.message;
  } else {
    try {
      errorMessage = String(error);
    } catch {
      // If even String() fails, use default message
    }
  }
  return ERROR_MESSAGES.UNEXPECTED_ERROR('config loading', errorMessage);
}

/**
 * Format git operation errors with helpful context
 */
export function formatGitError(error: any, url?: string): string {
  // Handle null/undefined
  if (!error) {
    return ERROR_MESSAGES.UNEXPECTED_ERROR('git operation', 'Unknown error');
  }

  const errorMessage = error.message || String(error);

  // Timeout error
  if (error.name === 'GitTimeoutError' || errorMessage.includes('timeout')) {
    return ERROR_MESSAGES.STANDARDS_REPO_TIMEOUT(url || 'unknown');
  }

  // Authentication error
  if (errorMessage.includes('Authentication') ||
      errorMessage.includes('Permission denied') ||
      errorMessage.includes('Could not read from remote')) {
    return ERROR_MESSAGES.STANDARDS_REPO_AUTH_FAILED(url || 'unknown');
  }

  // Repository not found
  if (errorMessage.includes('Repository not found') ||
      errorMessage.includes('does not exist')) {
    return ERROR_MESSAGES.GIT_REPO_NOT_FOUND(url || 'unknown');
  }

  // Generic git operation failure
  const operation = error.operation || 'operation';
  return ERROR_MESSAGES.GIT_OPERATION_FAILED(operation, errorMessage);
}

/**
 * Format standards-related errors
 */
export function formatStandardsError(error: any, context: string): string {
  // Handle null/undefined
  if (!error) {
    return ERROR_MESSAGES.UNEXPECTED_ERROR(context, 'Unknown error');
  }

  const errorMessage = error.message || String(error);

  // File not found
  if (error.code === 'ENOENT') {
    const file = error.path || context;
    return ERROR_MESSAGES.STANDARDS_FILE_NOT_FOUND(file);
  }

  // JSON parsing error in standards file
  if (error instanceof SyntaxError || error.name === 'SyntaxError') {
    return ERROR_MESSAGES.STANDARDS_FILE_INVALID(context, errorMessage);
  }

  // Permission error
  if (error.code === 'EACCES' || error.code === 'EPERM') {
    return ERROR_MESSAGES.CACHE_WRITE_FAILED(context);
  }

  // Unexpected error
  return ERROR_MESSAGES.UNEXPECTED_ERROR(context, errorMessage);
}

/**
 * Format service matching errors
 */
export function formatServiceError(serviceName: string, matches?: string[]): string {
  if (!matches || matches.length === 0) {
    return ERROR_MESSAGES.SERVICE_NO_MATCHES(serviceName);
  }

  if (matches.length > 1) {
    return ERROR_MESSAGES.SERVICE_AMBIGUOUS_MATCH(serviceName, matches);
  }

  // This shouldn't happen, but handle gracefully
  return ERROR_MESSAGES.UNEXPECTED_ERROR('service matching', 'Invalid match state');
}

/**
 * Format feature unavailability warnings
 */
export function formatFeatureWarning(feature: string, reason: string): string {
  return ERROR_MESSAGES.FEATURE_UNAVAILABLE(feature, reason);
}