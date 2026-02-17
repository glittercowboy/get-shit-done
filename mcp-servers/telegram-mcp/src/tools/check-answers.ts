import { loadPendingQuestionsLegacy as loadPendingQuestions, PendingQuestion } from '../storage/question-queue.js';

/**
 * Input schema for check_question_answers tool
 */
export interface CheckAnswersInput {
  question_ids?: string[];    // Filter by IDs (empty = all pending)
  wait_seconds?: number;      // Long poll timeout (default: 60, max: 300)
}

/**
 * Output schema for check_question_answers tool
 */
export interface CheckAnswersOutput {
  answers: Array<{
    question_id: string;
    question: string;
    answer: string;
    answered_at: string;
  }>;
  pending_count: number;
}

/**
 * MCP tool definition for check_question_answers
 */
export const CHECK_ANSWERS_TOOL_DEF = {
  name: "check_question_answers",
  description: "Poll for answers to pending blocking questions. Supports long polling with configurable timeout.",
  inputSchema: {
    type: "object",
    properties: {
      question_ids: {
        type: "array",
        items: { type: "string" },
        description: "Specific question IDs to check. If empty or not provided, checks all pending questions."
      },
      wait_seconds: {
        type: "number",
        description: "Long poll timeout in seconds (default: 60, max: 300)",
        default: 60,
        maximum: 300
      }
    }
  }
};

/**
 * Sleep utility for polling
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Poll for answered questions with timeout
 *
 * @param questionIds Filter by specific IDs (empty = all)
 * @param timeoutMs Maximum time to poll in milliseconds
 * @returns Array of answered questions (only from this session)
 */
async function pollForAnswers(
  questionIds: string[],
  timeoutMs: number
): Promise<PendingQuestion[]> {
  const startTime = Date.now();
  const pollInterval = 5000; // 5 seconds
  const mySessionId = `pid-${process.pid}`;

  while (Date.now() - startTime < timeoutMs) {
    const questions = await loadPendingQuestions();

    // Find answered questions FROM THIS SESSION ONLY
    const answered = questions.filter(q => {
      const matchesSession = q.session_id === mySessionId || q.session_id.endsWith(`-${process.pid}`);
      const matchesFilter = questionIds.length === 0 || questionIds.includes(q.id);
      return q.status === 'answered' && matchesSession && matchesFilter;
    });

    // If we found answers, return immediately
    if (answered.length > 0) {
      return answered;
    }

    // Calculate remaining time
    const elapsed = Date.now() - startTime;
    const remaining = timeoutMs - elapsed;

    // If less than poll interval remaining, do one final check after waiting
    if (remaining > 0 && remaining < pollInterval) {
      await sleep(remaining);
      // Final check (only this session's questions)
      const finalQuestions = await loadPendingQuestions();
      return finalQuestions.filter(q => {
        const matchesSession = q.session_id === mySessionId || q.session_id.endsWith(`-${process.pid}`);
        const matchesFilter = questionIds.length === 0 || questionIds.includes(q.id);
        return q.status === 'answered' && matchesSession && matchesFilter;
      });
    }

    // Wait before next poll
    if (remaining >= pollInterval) {
      await sleep(pollInterval);
    }
  }

  // Timeout reached, no answers found
  return [];
}

/**
 * Handler for check_question_answers tool
 *
 * Checks for answered questions with optional long polling.
 * If wait_seconds > 0, polls every 5 seconds until answers found or timeout.
 *
 * @param args Input arguments conforming to CheckAnswersInput
 * @returns Output conforming to CheckAnswersOutput
 */
export async function checkQuestionAnswersHandler(
  args: unknown
): Promise<CheckAnswersOutput> {
  // Validate and parse input
  const input = (args || {}) as Partial<CheckAnswersInput>;

  // Validate question_ids if provided
  let questionIds: string[] = [];
  if (input.question_ids !== undefined) {
    if (!Array.isArray(input.question_ids)) {
      throw new Error('Invalid input: question_ids must be an array');
    }
    questionIds = input.question_ids.filter(id => typeof id === 'string' && id.trim());
  }

  // Validate and cap wait_seconds (max 300 = 5 minutes)
  let waitSeconds = input.wait_seconds ?? 60;
  if (typeof waitSeconds !== 'number' || waitSeconds < 0) {
    waitSeconds = 60;
  }
  waitSeconds = Math.min(waitSeconds, 300);

  // Load pending questions
  let answeredQuestions: PendingQuestion[];
  const mySessionId = `pid-${process.pid}`;

  if (waitSeconds > 0) {
    // Long polling mode
    answeredQuestions = await pollForAnswers(questionIds, waitSeconds * 1000);
  } else {
    // Immediate check (no polling, only this session's questions)
    const questions = await loadPendingQuestions();
    answeredQuestions = questions.filter(q => {
      const matchesSession = q.session_id === mySessionId || q.session_id.endsWith(`-${process.pid}`);
      const matchesFilter = questionIds.length === 0 || questionIds.includes(q.id);
      return q.status === 'answered' && matchesSession && matchesFilter;
    });
  }

  // Get count of remaining pending questions
  const allQuestions = await loadPendingQuestions();
  const pendingCount = allQuestions.filter(q => q.status === 'pending').length;

  // Format answers
  const answers = answeredQuestions
    .filter(q => q.answer && q.answered_at) // Safety check
    .map(q => ({
      question_id: q.id,
      question: q.question,
      answer: q.answer!,
      answered_at: q.answered_at!
    }));

  return {
    answers,
    pending_count: pendingCount
  };
}
