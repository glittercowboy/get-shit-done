import { archiveQuestion, getPendingById, PendingQuestion } from '../storage/question-queue.js';
import path from 'path';

/**
 * Input schema for mark_question_answered tool
 */
export interface MarkAnsweredInput {
  question_id: string;
}

/**
 * Output schema for mark_question_answered tool
 */
export interface MarkAnsweredOutput {
  success: boolean;
  archived_to: string;  // Daily log path
}

/**
 * MCP tool definition for mark_question_answered
 */
export const MARK_ANSWERED_TOOL_DEF = {
  name: "mark_question_answered",
  description: "Archive an answered question to daily log and remove from pending queue.",
  inputSchema: {
    type: "object",
    properties: {
      question_id: {
        type: "string",
        description: "The question ID to mark as answered"
      }
    },
    required: ["question_id"]
  }
};

/**
 * Handler for mark_question_answered tool
 *
 * Archives an answered question to the daily log file.
 * Note: The question must already have status="answered" and answer populated
 * (typically set by the Telegram bot when user responds).
 *
 * @param args Input arguments conforming to MarkAnsweredInput
 * @returns Output conforming to MarkAnsweredOutput
 * @throws Error if question not found or validation fails
 */
export async function markQuestionAnsweredHandler(
  args: unknown
): Promise<MarkAnsweredOutput> {
  // Validate input
  if (!args || typeof args !== 'object') {
    throw new Error('Invalid input: expected object');
  }

  const input = args as Partial<MarkAnsweredInput>;

  // Validate question_id
  if (!input.question_id || typeof input.question_id !== 'string') {
    throw new Error('Invalid input: question_id is required and must be a string');
  }

  const questionId = input.question_id.trim();
  if (!questionId) {
    throw new Error('Invalid input: question_id cannot be empty');
  }

  // Get the question from pending queue
  const question = await getPendingById(questionId);
  if (!question) {
    throw new Error(`Question not found: ${questionId}`);
  }

  // Verify question has been answered
  if (question.status !== 'answered') {
    throw new Error(`Question ${questionId} is not answered yet (status: ${question.status})`);
  }

  if (!question.answer) {
    throw new Error(`Question ${questionId} is marked answered but has no answer text`);
  }

  // Archive the question
  await archiveQuestion(question);

  // Build archive path (YYYY-MM-DD.jsonl)
  const today = new Date().toISOString().split('T')[0];
  const archivePath = path.join('.planning/telegram-sessions', `${today}.jsonl`);

  return {
    success: true,
    archived_to: archivePath
  };
}
