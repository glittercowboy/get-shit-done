/**
 * Telegram Bot with Middleware-Based Menu Handlers
 *
 * CRITICAL FIX: Uses session middleware instead of .once() listeners
 * to avoid the Phase 8 bug where menu buttons only work once.
 */

import { Telegraf, Markup, session } from 'telegraf';
import type { Context } from 'telegraf';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import {
  startSession,
  endSession,
  logMessage,
  logBotResponse,
  logBlockingQuestion,
  logBlockingResponse
} from './session-logger.js';
import { transcribeAudio, checkWhisperModel } from './transcription.js';
import { loadPendingQuestionsLegacy as loadPendingQuestions, getPendingById, markAnsweredLegacy as markAnswered } from '../storage/question-queue.js';

// Load environment variables
dotenv.config();

// Session data interface
interface SessionData {
  awaitingQuestionResponse: string | null; // Question ID user is responding to
}

interface BotContext extends Context {
  session: SessionData;
}

// Bot instance (lazy-initialized in startBot)
let bot: Telegraf<BotContext> | null = null;
let botStarted = false;
let ownerChatId: number | null = null;

// Set owner chat ID from env
if (process.env.TELEGRAM_OWNER_ID) {
  ownerChatId = parseInt(process.env.TELEGRAM_OWNER_ID, 10);
}

/**
 * Main menu keyboard (New Requirements DISABLED per user decision)
 */
export const MAIN_MENU = Markup.inlineKeyboard([
  [
    Markup.button.callback('📊 Status', 'menu:status'),
    Markup.button.callback('❓ Pending', 'menu:pending')
  ]
]);

/**
 * Get GSD status from STATE.md
 */
async function getGSDStatus(): Promise<string> {
  try {
    const projectRoot = process.env.PROJECT_ROOT || process.cwd();
    const statePath = path.join(projectRoot, '.planning', 'STATE.md');

    if (!existsSync(statePath)) {
      return 'No active execution (STATE.md not found)';
    }

    const state = await fs.readFile(statePath, 'utf8');
    const positionMatch = state.match(/## Current Position\n\n([\s\S]*?)\n\n##/);

    if (positionMatch) {
      return `📊 **Current Status**\n\n${positionMatch[1].slice(0, 300)}`;
    }

    return 'Unable to parse STATE.md';
  } catch (err: any) {
    return `Error reading status: ${err.message}`;
  }
}

/**
 * Initialize bot instance with handlers
 */
function initializeBot(): Telegraf<BotContext> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN not set in environment');
  }

  const botInstance = new Telegraf<BotContext>(process.env.TELEGRAM_BOT_TOKEN);

  // Add session middleware
  botInstance.use(session({
    defaultSession: (): SessionData => ({
      awaitingQuestionResponse: null
    })
  }));

  // Register all handlers
  setupHandlers(botInstance);

  return botInstance;
}

/**
 * Setup all bot command and message handlers
 */
function setupHandlers(botInstance: Telegraf<BotContext>): void {
  /**
   * Menu action handler: Status
   */
  botInstance.action('menu:status', async (ctx) => {
    await ctx.answerCbQuery();

    const status = await getGSDStatus();
    const backButton = Markup.inlineKeyboard([
      Markup.button.callback('« Back to Menu', 'back:main')
    ]);

    await ctx.editMessageText(status, { parse_mode: 'Markdown', ...backButton });
    logBotResponse(status, 'menu');
  });

  /**
   * Menu action handler: Pending Questions
   */
  botInstance.action('menu:pending', async (ctx) => {
    await ctx.answerCbQuery();

    const questions = await loadPendingQuestions();

    if (questions.length === 0) {
      const backButton = Markup.inlineKeyboard([
        Markup.button.callback('« Back to Menu', 'back:main')
      ]);
      await ctx.editMessageText('No pending questions. All clear! ✓', backButton);
      logBotResponse('No pending questions', 'menu');
      return;
    }

    // Show questions with answer buttons
    let text = `❓ **Pending Questions** (${questions.length})\n\nClick to respond:\n\n`;

    const buttons = questions.map((q, idx) => {
      const preview = q.question.slice(0, 40);
      return [Markup.button.callback(`${idx + 1}. ${preview}...`, `answer:${q.id}`)];
    });

    buttons.push([Markup.button.callback('« Back to Menu', 'back:main')]);

    const keyboard = Markup.inlineKeyboard(buttons);
    await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
    logBotResponse(`Showed ${questions.length} pending questions`, 'menu');
  });

  /**
   * Answer button handler (dynamic - registers for any question ID)
   */
  botInstance.action(/^answer:(.+)$/, async (ctx) => {
    const questionId = ctx.match[1];
    await ctx.answerCbQuery();

    const question = await getPendingById(questionId);
    if (!question) {
      await ctx.reply('Question not found or already answered.');
      return;
    }

    // Set session state to await response
    ctx.session.awaitingQuestionResponse = questionId;

    await ctx.reply(
      `**Question:** ${question.question}\n\n` +
      `Send your response (text or voice):`,
      { parse_mode: 'Markdown' }
    );

    logBotResponse(`Awaiting response for question: ${questionId}`, 'menu');
  });

  /**
   * Back to main menu handler
   */
  botInstance.action('back:main', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.awaitingQuestionResponse = null;
    await ctx.editMessageText('Main Menu:', MAIN_MENU);
    logBotResponse('Returned to main menu', 'menu');
  });

  /**
   * Command: /start
   */
  botInstance.command('start', async (ctx) => {
  const chatId = ctx.from.id;
  const username = ctx.from.username || 'unknown';

  // Store chat ID if owner
  if (!process.env.TELEGRAM_OWNER_ID || chatId.toString() === process.env.TELEGRAM_OWNER_ID) {
    ownerChatId = chatId;
    await ctx.reply(
      `👋 Welcome ${username}!\n\n` +
      `I'm your GSD assistant powered by MCP.\n\n` +
      `Use the menu below to:\n` +
      `• Check execution status\n` +
      `• Respond to pending questions\n\n` +
      `Voice messages are supported! 🎤`,
      MAIN_MENU
    );
    logMessage(chatId, username, 'text', '/start');
    logBotResponse('Sent welcome message', 'menu');
  } else {
    await ctx.reply('Unauthorized. This bot is private.');
    logMessage(chatId, username, 'text', '/start (unauthorized)');
  }
});

/**
 * Text message handler
 */
botInstance.on('text', async (ctx) => {
  const text = ctx.message.text;
  const userId = ctx.from.id;
  const username = ctx.from.username || 'unknown';

  // Skip commands
  if (text.startsWith('/')) {
    return;
  }

  logMessage(userId, username, 'text', text);

  // If awaiting response for specific question
  if (ctx.session.awaitingQuestionResponse) {
    const questionId = ctx.session.awaitingQuestionResponse;

    try {
      await markAnswered(questionId, text);
      ctx.session.awaitingQuestionResponse = null;

      await ctx.reply('✅ Response recorded! Resuming execution...');
      logBlockingResponse(questionId, text);
      return;
    } catch (err: any) {
      await ctx.reply(`Error recording response: ${err.message}`);
      ctx.session.awaitingQuestionResponse = null;
      return;
    }
  }

  // Check for single pending question (auto-match)
  const pending = await loadPendingQuestions();
  if (pending.length === 1) {
    const questionId = pending[0].id;

    try {
      await markAnswered(questionId, text);
      await ctx.reply(
        `✅ Response recorded for: "${pending[0].question.slice(0, 50)}..."\n\n` +
        `Resuming execution...`
      );
      logBlockingResponse(questionId, text);
      return;
    } catch (err: any) {
      await ctx.reply(`Error recording response: ${err.message}`);
      return;
    }
  }

  // Multiple pending or none - show menu
  await ctx.reply('What would you like to do?', MAIN_MENU);
});

/**
 * Voice message handler
 */
botInstance.on('voice', async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username || 'unknown';
  const duration = ctx.message.voice.duration;

  logMessage(userId, username, 'voice', { duration });

  // Check Whisper availability
  const modelStatus = await checkWhisperModel();
  if (!modelStatus.available) {
    await ctx.reply(`❌ Voice not available: ${modelStatus.message}`);
    return;
  }

  // Get file link
  const fileId = ctx.message.voice.file_id;
  const fileSize = ctx.message.voice.file_size;

  // Check size limit (20MB)
  if (fileSize && fileSize > 20 * 1024 * 1024) {
    await ctx.reply('Voice message too large (>20MB). Please send a shorter clip.');
    return;
  }

  await ctx.reply('🎤 Transcribing voice message...');

  try {
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const transcription = await transcribeAudio(fileLink.href);

    await ctx.reply(`Transcribed: "${transcription}"`);

    // If awaiting response, use transcription as answer
    if (ctx.session.awaitingQuestionResponse) {
      const questionId = ctx.session.awaitingQuestionResponse;

      try {
        await markAnswered(questionId, transcription);
        ctx.session.awaitingQuestionResponse = null;

        await ctx.reply('✅ Response recorded! Resuming execution...');
        logBlockingResponse(questionId, transcription);
        return;
      } catch (err: any) {
        await ctx.reply(`Error recording response: ${err.message}`);
        ctx.session.awaitingQuestionResponse = null;
        return;
      }
    }

    // Check for single pending question
    const pending = await loadPendingQuestions();
    if (pending.length === 1) {
      const questionId = pending[0].id;

      try {
        await markAnswered(questionId, transcription);
        await ctx.reply(
          `✅ Response recorded for: "${pending[0].question.slice(0, 50)}..."\n\n` +
          `Resuming execution...`
        );
        logBlockingResponse(questionId, transcription);
        return;
      } catch (err: any) {
        await ctx.reply(`Error recording response: ${err.message}`);
        return;
      }
    }

    // Show menu
    await ctx.reply('What would you like to do?', MAIN_MENU);
  } catch (err: any) {
    await ctx.reply(`Transcription error: ${err.message}`);
  }
  });
}

/**
 * Send message to owner
 */
export async function sendMessage(text: string, extra?: any): Promise<void> {
  if (!bot) {
    throw new Error('Bot not initialized. Call startBot() first.');
  }

  if (!ownerChatId) {
    throw new Error('Owner chat ID not set. User must send /start to bot first.');
  }

  await bot.telegram.sendMessage(ownerChatId, text, extra);
}

/**
 * Send blocking question to owner
 */
export async function sendBlockingQuestion(
  question: string,
  options: { context?: string; timeout?: number } = {}
): Promise<string> {
  if (!bot) {
    throw new Error('Bot not initialized. Call startBot() first.');
  }

  if (!ownerChatId) {
    throw new Error('Owner chat ID not set. User must send /start to bot first.');
  }

  // Append question to queue (handled by MCP tools)
  // This function is called by MCP server when blocking question is asked
  const { appendQuestionLegacy: appendQuestion } = await import('../storage/question-queue.js');

  const questionObj = await appendQuestion({
    question,
    context: options.context
  });

  logBlockingQuestion(questionObj.id, question, 'mcp-server');

  // Send to Telegram
  let message = `❓ ${question}\n\nID: ${questionObj.id}`;
  if (options.context) {
    message += `\n\nContext: ${options.context}`;
  }

  await bot.telegram.sendMessage(ownerChatId, message, {
    parse_mode: 'Markdown'
  });

  // Poll for answer (with timeout)
  const timeout = options.timeout || 300000; // 5 minutes default
  const startTime = Date.now();
  const pollInterval = 1000; // 1 second

  while (Date.now() - startTime < timeout) {
    const q = await getPendingById(questionObj.id);

    if (q && q.status === 'answered' && q.answer) {
      return q.answer;
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Question timeout after ${timeout}ms`);
}

/**
 * Start bot in polling mode
 */
export async function startBot(): Promise<void> {
  if (botStarted) {
    console.error('[telegram-bot] Bot already running');
    return;
  }

  // Initialize bot if not already done
  if (!bot) {
    bot = initializeBot();
  }

  const sessionPath = startSession();
  console.error('[telegram-bot] Session log:', sessionPath);

  await bot.launch();
  botStarted = true;
  console.error('[telegram-bot] Bot started in polling mode');
}

/**
 * Stop bot gracefully
 */
export function stopBot(): void {
  if (!botStarted || !bot) {
    console.error('[telegram-bot] Bot not running');
    return;
  }

  const sessionPath = endSession();
  console.error('[telegram-bot] Session ended:', sessionPath);

  bot.stop('SIGTERM');
  botStarted = false;
  console.error('[telegram-bot] Bot stopped');
}

/**
 * Get bot instance (for advanced use)
 */
export function getBot(): Telegraf<BotContext> | null {
  return bot;
}

// Graceful shutdown
process.once('SIGINT', () => stopBot());
process.once('SIGTERM', () => stopBot());
