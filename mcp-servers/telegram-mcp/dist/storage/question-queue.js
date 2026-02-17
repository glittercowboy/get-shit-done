import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
// Base directory for question storage
const QUESTIONS_DIR = path.join(process.cwd(), '.planning/telegram-questions');
const PENDING_FILE = path.join(QUESTIONS_DIR, 'pending.jsonl');
const SESSIONS_DIR = path.join(process.cwd(), '.planning/telegram-sessions');
/**
 * Ensure storage directories exist
 */
async function ensureDirectories() {
    if (!existsSync(QUESTIONS_DIR)) {
        await fs.mkdir(QUESTIONS_DIR, { recursive: true });
    }
    if (!existsSync(SESSIONS_DIR)) {
        await fs.mkdir(SESSIONS_DIR, { recursive: true });
    }
}
/**
 * Atomic write using temp file + rename
 */
async function writeAtomic(filePath, content) {
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, content, 'utf8');
    await fs.rename(tempPath, filePath);
}
/**
 * Load all pending questions from JSONL
 * @returns Array of pending questions
 */
export async function loadPendingQuestions() {
    await ensureDirectories();
    if (!existsSync(PENDING_FILE)) {
        await fs.writeFile(PENDING_FILE, '', 'utf8');
        return [];
    }
    const content = await fs.readFile(PENDING_FILE, 'utf8');
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
            console.error('[question-queue] Malformed JSON line, skipping:', line);
            return null;
        }
    })
        .filter((q) => q !== null && q.status === 'pending');
}
/**
 * Append new question to queue
 * @param question Question details (without id, created_at, status - auto-generated)
 * @returns Full question object with generated fields
 */
export async function appendQuestion(question) {
    await ensureDirectories();
    const fullQuestion = {
        id: randomUUID(),
        question: question.question,
        context: question.context,
        status: 'pending',
        created_at: new Date().toISOString(),
    };
    // Append to JSONL (atomic on POSIX)
    await fs.appendFile(PENDING_FILE, JSON.stringify(fullQuestion) + '\n', 'utf8');
    return fullQuestion;
}
/**
 * Mark question as answered
 * @param questionId Question UUID
 * @param answer User's answer
 */
export async function markAnswered(questionId, answer) {
    const questions = await loadPendingQuestions();
    // Find and update the question
    let updatedQuestion = null;
    const updatedQuestions = questions.map(q => {
        if (q.id === questionId) {
            updatedQuestion = {
                ...q,
                status: 'answered',
                answer,
                answered_at: new Date().toISOString(),
            };
            return updatedQuestion;
        }
        return q;
    });
    if (!updatedQuestion) {
        throw new Error(`Question not found: ${questionId}`);
    }
    // Filter out answered question, keep only pending
    const stillPending = updatedQuestions.filter(q => q.status === 'pending');
    // Atomic rewrite
    const content = stillPending.map(q => JSON.stringify(q)).join('\n');
    await writeAtomic(PENDING_FILE, content ? content + '\n' : '');
    // Archive the answered question
    await archiveQuestion(updatedQuestion);
}
/**
 * Archive answered question to daily log
 * @param question Answered question to archive
 */
export async function archiveQuestion(question) {
    await ensureDirectories();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const archivePath = path.join(SESSIONS_DIR, `${today}.jsonl`);
    // Append to daily log
    await fs.appendFile(archivePath, JSON.stringify(question) + '\n', 'utf8');
}
/**
 * Get single pending question by ID
 * @param questionId Question UUID
 * @returns Question or null if not found
 */
export async function getPendingById(questionId) {
    const questions = await loadPendingQuestions();
    return questions.find(q => q.id === questionId) || null;
}
