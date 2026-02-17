/**
 * Requirement message structure
 * Persists to .planning/telegram-queue/requirements.jsonl
 */
export interface RequirementMessage {
    message: string;
    timestamp: string;
    processed: boolean;
}
/**
 * Append new requirement to queue
 * @param message Requirement text (from user message or voice transcription)
 * @returns Created requirement object
 */
export declare function appendRequirement(message: string): Promise<RequirementMessage>;
/**
 * Load all requirements from JSONL
 * @returns Array of all requirements
 */
export declare function loadRequirements(): Promise<RequirementMessage[]>;
/**
 * Load only unprocessed requirements
 * @returns Array of unprocessed requirements
 */
export declare function loadUnprocessedRequirements(): Promise<RequirementMessage[]>;
/**
 * Mark requirement as processed
 * @param timestamp Requirement timestamp (unique identifier)
 */
export declare function markProcessed(timestamp: string): Promise<void>;
/**
 * Clear all requirements (optional cleanup)
 */
export declare function clearRequirements(): Promise<void>;
/**
 * Get requirements as raw NDJSON string (for MCP resource)
 * @returns Raw JSONL file content
 */
export declare function getRequirementsAsNDJSON(): Promise<string>;
