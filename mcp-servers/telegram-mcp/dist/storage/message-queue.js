import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
// Base directory for message queue
const QUEUE_DIR = path.join(process.cwd(), '.planning/telegram-queue');
const REQUIREMENTS_FILE = path.join(QUEUE_DIR, 'requirements.jsonl');
/**
 * Ensure queue directory exists
 */
async function ensureDirectory() {
    if (!existsSync(QUEUE_DIR)) {
        await fs.mkdir(QUEUE_DIR, { recursive: true });
    }
}
/**
 * Append new requirement to queue
 * @param message Requirement text (from user message or voice transcription)
 * @returns Created requirement object
 */
export async function appendRequirement(message) {
    await ensureDirectory();
    const requirement = {
        message,
        timestamp: new Date().toISOString(),
        processed: false,
    };
    // Append-only (atomic on POSIX)
    await fs.appendFile(REQUIREMENTS_FILE, JSON.stringify(requirement) + '\n', 'utf8');
    return requirement;
}
/**
 * Load all requirements from JSONL
 * @returns Array of all requirements
 */
export async function loadRequirements() {
    await ensureDirectory();
    if (!existsSync(REQUIREMENTS_FILE)) {
        await fs.writeFile(REQUIREMENTS_FILE, '', 'utf8');
        return [];
    }
    const content = await fs.readFile(REQUIREMENTS_FILE, 'utf8');
    if (!content.trim()) {
        return [];
    }
    return content
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
        try {
            return JSON.parse(line);
        }
        catch (err) {
            console.error('[message-queue] Malformed JSON line, skipping:', line);
            return null;
        }
    })
        .filter((req) => req !== null);
}
/**
 * Load only unprocessed requirements
 * @returns Array of unprocessed requirements
 */
export async function loadUnprocessedRequirements() {
    const all = await loadRequirements();
    return all.filter(req => !req.processed);
}
/**
 * Mark requirement as processed
 * @param timestamp Requirement timestamp (unique identifier)
 */
export async function markProcessed(timestamp) {
    const requirements = await loadRequirements();
    // Find and update the requirement
    const updated = requirements.map(req => {
        if (req.timestamp === timestamp) {
            return { ...req, processed: true };
        }
        return req;
    });
    // Check if requirement was found
    const wasFound = updated.some(req => req.timestamp === timestamp && req.processed);
    if (!wasFound) {
        throw new Error(`Requirement not found: ${timestamp}`);
    }
    // Atomic rewrite
    const content = updated.map(req => JSON.stringify(req)).join('\n');
    const tempPath = `${REQUIREMENTS_FILE}.tmp`;
    await fs.writeFile(tempPath, content ? content + '\n' : '', 'utf8');
    await fs.rename(tempPath, REQUIREMENTS_FILE);
}
/**
 * Clear all requirements (optional cleanup)
 */
export async function clearRequirements() {
    await ensureDirectory();
    await fs.writeFile(REQUIREMENTS_FILE, '', 'utf8');
}
/**
 * Get requirements as raw NDJSON string (for MCP resource)
 * @returns Raw JSONL file content
 */
export async function getRequirementsAsNDJSON() {
    await ensureDirectory();
    if (!existsSync(REQUIREMENTS_FILE)) {
        return '';
    }
    return await fs.readFile(REQUIREMENTS_FILE, 'utf8');
}
