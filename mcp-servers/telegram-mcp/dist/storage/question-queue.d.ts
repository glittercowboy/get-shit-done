/**
 * Pending question structure
 * Persists to .planning/telegram-questions/pending.jsonl
 */
export interface PendingQuestion {
    id: string;
    question: string;
    context?: string;
    status: "pending" | "answered";
    created_at: string;
    answer?: string;
    answered_at?: string;
}
/**
 * Load all pending questions from JSONL
 * @returns Array of pending questions
 */
export declare function loadPendingQuestions(): Promise<PendingQuestion[]>;
/**
 * Append new question to queue
 * @param question Question details (without id, created_at, status - auto-generated)
 * @returns Full question object with generated fields
 */
export declare function appendQuestion(question: Omit<PendingQuestion, 'id' | 'created_at' | 'status'>): Promise<PendingQuestion>;
/**
 * Mark question as answered
 * @param questionId Question UUID
 * @param answer User's answer
 */
export declare function markAnswered(questionId: string, answer: string): Promise<void>;
/**
 * Archive answered question to daily log
 * @param question Answered question to archive
 */
export declare function archiveQuestion(question: PendingQuestion): Promise<void>;
/**
 * Get single pending question by ID
 * @param questionId Question UUID
 * @returns Question or null if not found
 */
export declare function getPendingById(questionId: string): Promise<PendingQuestion | null>;
