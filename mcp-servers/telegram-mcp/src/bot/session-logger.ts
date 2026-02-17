/**
 * Telegram Session Logger
 *
 * Logs all bot activity (messages, questions, decisions) to daily JSONL files.
 * One daily file per day in .planning/telegram-sessions/
 */

import fs from 'fs/promises';
import { existsSync, appendFileSync } from 'fs';
import path from 'path';

// Project root resolution (env var or path traversal)
function getProjectRoot(): string {
  if (process.env.PROJECT_ROOT) {
    return process.env.PROJECT_ROOT;
  }
  // Traverse up from mcp-servers/telegram-mcp to project root
  const currentDir = process.cwd();
  if (currentDir.includes('mcp-servers/telegram-mcp')) {
    return path.resolve(currentDir, '../..');
  }
  return currentDir;
}

const PROJECT_ROOT = getProjectRoot();

let currentSessionPath: string | null = null;
let sessionStartTime: number | null = null;

/**
 * Get daily log path
 */
function getDailyLogPath(): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const sessionsDir = path.join(PROJECT_ROOT, '.planning', 'telegram-sessions');

  // Ensure directory exists (sync for simplicity)
  if (!existsSync(sessionsDir)) {
    fs.mkdir(sessionsDir, { recursive: true });
  }

  return path.join(sessionsDir, `${date}.jsonl`);
}

/**
 * Start new session log
 */
export function startSession(): string {
  currentSessionPath = getDailyLogPath();
  sessionStartTime = Date.now();

  logEvent({
    type: 'session_start',
    timestamp: new Date().toISOString()
  });

  return currentSessionPath;
}

/**
 * Log any event to current session
 */
export function logEvent(event: Record<string, any>): void {
  if (!currentSessionPath) {
    currentSessionPath = getDailyLogPath();
    sessionStartTime = Date.now();
  }

  const entry = {
    ...event,
    session_time_ms: sessionStartTime ? Date.now() - sessionStartTime : 0,
    timestamp: event.timestamp || new Date().toISOString()
  };

  // Use synchronous append for atomic writes
  appendFileSync(currentSessionPath, JSON.stringify(entry) + '\n');
}

/**
 * Log user message
 */
export function logMessage(
  userId: number,
  username: string,
  messageType: 'text' | 'voice' | 'button',
  content: string | { duration: number }
): void {
  logEvent({
    type: 'user_message',
    user_id: userId,
    username,
    message_type: messageType,
    content: messageType === 'voice'
      ? `[voice:${(content as { duration: number }).duration}s]`
      : content
  });
}

/**
 * Log bot response
 */
export function logBotResponse(content: string, messageType: 'text' | 'menu' = 'text'): void {
  logEvent({
    type: 'bot_response',
    message_type: messageType,
    content
  });
}

/**
 * Log Haiku decision
 */
export function logDecision(
  decisionType: string,
  reasoning: string,
  action: string
): void {
  logEvent({
    type: 'haiku_decision',
    decision_type: decisionType,
    reasoning,
    action
  });
}

/**
 * Log blocking question
 */
export function logBlockingQuestion(
  questionId: string,
  question: string,
  source: string
): void {
  logEvent({
    type: 'blocking_question',
    question_id: questionId,
    question,
    source
  });
}

/**
 * Log blocking question response
 */
export function logBlockingResponse(questionId: string, response: string): void {
  logEvent({
    type: 'blocking_response',
    question_id: questionId,
    response
  });
}

/**
 * End current session
 */
export function endSession(): string | null {
  if (currentSessionPath && sessionStartTime) {
    logEvent({
      type: 'session_end',
      duration_ms: Date.now() - sessionStartTime
    });
  }

  const path = currentSessionPath;
  currentSessionPath = null;
  sessionStartTime = null;
  return path;
}

/**
 * Get current session path
 */
export function getSessionPath(): string | null {
  return currentSessionPath;
}

/**
 * Get all session files
 */
export async function getAllSessions(): Promise<string[]> {
  const sessionsDir = path.join(PROJECT_ROOT, '.planning', 'telegram-sessions');

  if (!existsSync(sessionsDir)) {
    return [];
  }

  const files = await fs.readdir(sessionsDir);
  return files
    .filter(f => f.endsWith('.jsonl'))
    .map(f => path.join(sessionsDir, f))
    .sort()
    .reverse(); // Most recent first
}

/**
 * Read session log
 */
export async function readSession(sessionPath: string): Promise<any[]> {
  const content = await fs.readFile(sessionPath, 'utf8');
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      try {
        return JSON.parse(line);
      } catch (err) {
        console.error('[session-logger] Malformed JSON line, skipping:', line);
        return null;
      }
    })
    .filter(entry => entry !== null);
}
