/**
 * Single export point for error utilities
 */

export { ERROR_MESSAGES } from './messages';
export {
  formatConfigError,
  formatGitError,
  formatStandardsError,
  formatServiceError,
  formatFeatureWarning
} from './formatter';