#!/usr/bin/env node

/**
 * Telegram Haiku Monitor
 *
 * Main Haiku agent that monitors Telegram bot continuously.
 * Handles menu interactions, routes to subagents, provides status.
 */

const { Markup } = require('telegraf');
const { gatherRequirements, executeDecision } = require('./telegram-requirement-gatherer.js');
const { logMessage, logBotResponse } = require('./telegram-session-logger.js');
const { getPendingQuestions } = require('./telegram-conversation.js');

let monitorActive = false;
let currentConversationMode = null; // 'requirements', 'pending', null
let requirementGatheringActive = false;

/**
 * Main menu keyboard
 */
const MAIN_MENU = Markup.inlineKeyboard([
  [
    Markup.button.callback('📊 Status', 'menu:status'),
    Markup.button.callback('❓ Pending', 'menu:pending'),
    Markup.button.callback('✨ New Requirements', 'menu:requirements')
  ]
]);

/**
 * Start Haiku monitor
 */
function startHaikuMonitor(bot) {
  if (monitorActive) {
    console.log('Haiku monitor already running');
    return;
  }

  monitorActive = true;
  console.log('Haiku monitor started');

  // Register menu button handlers
  bot.action('menu:status', handleStatusMenu);
  bot.action('menu:pending', handlePendingMenu);
  bot.action('menu:requirements', handleRequirementsMenu);

  // Register back button
  bot.action('back:main', async (ctx) => {
    currentConversationMode = null;
    requirementGatheringActive = false;
    await ctx.editMessageText('Main Menu:', MAIN_MENU);
  });

  // Override text handler to route based on mode
  bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    const userId = ctx.from.id;
    const username = ctx.from.username;

    logMessage(userId, username, 'text', text);

    // Route based on current mode
    if (currentConversationMode === 'requirements' && requirementGatheringActive) {
      // Handled by requirement gathering flow
      return;
    }

    // Check for pending questions (auto-match if only 1)
    const pending = getPendingQuestions();
    if (pending.length === 1) {
      // Auto-match to single pending question
      const conversation = require('./telegram-conversation.js');
      conversation.handleResponse(pending[0].questionId, {
        type: 'text',
        content: text
      });
      await ctx.reply(`✅ Response recorded for: "${pending[0].question.slice(0, 50)}..."\n\nResuming execution...`);
      logBotResponse('Response auto-matched to pending question');
      return;
    } else if (pending.length > 1) {
      // Multiple pending - show menu
      await showPendingQuestionsMenu(ctx);
      return;
    }

    // No pending questions, no active conversation - show main menu
    await ctx.reply('What would you like to do?', MAIN_MENU);
  });

  // Override voice handler
  bot.on('voice', async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username;
    const duration = ctx.message.voice.duration;

    logMessage(userId, username, 'voice', { duration });

    if (currentConversationMode === 'requirements' && requirementGatheringActive) {
      // Transcribe and continue requirement gathering
      const { transcribeAudio, checkWhisperModel } = require('./whisper-transcribe.js');

      const modelStatus = await checkWhisperModel();
      if (!modelStatus.available) {
        await ctx.reply(`❌ Voice not available: ${modelStatus.message}`);
        return;
      }

      await ctx.reply('🎤 Transcribing voice message...');
      const fileLink = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
      const transcription = await transcribeAudio(fileLink.href);
      await ctx.reply(`Transcribed: "${transcription}"`);

      // Continue with transcribed text
      return;
    }

    // Check for pending questions
    const pending = getPendingQuestions();
    if (pending.length > 0) {
      // Transcribe for blocking question response
      // ... (similar to text handler)
    }

    await ctx.reply('Please select an option:', MAIN_MENU);
  });
}

/**
 * Stop Haiku monitor
 */
function stopHaikuMonitor() {
  monitorActive = false;
  currentConversationMode = null;
  requirementGatheringActive = false;
  console.log('Haiku monitor stopped');
}

/**
 * Handle Status menu
 */
async function handleStatusMenu(ctx) {
  await ctx.answerCbQuery();

  // Load current execution status
  let statusText = '📊 **Current Status**\n\n';

  try {
    const state = require('fs').readFileSync('.planning/STATE.md', 'utf8');
    const positionMatch = state.match(/## Current Position\n\n([\s\S]*?)\n\n##/);
    if (positionMatch) {
      statusText += positionMatch[1].slice(0, 200);
    }
  } catch (err) {
    statusText += 'No active execution';
  }

  const backButton = Markup.inlineKeyboard([
    Markup.button.callback('« Back to Menu', 'back:main')
  ]);

  await ctx.editMessageText(statusText, { parse_mode: 'Markdown', ...backButton });
  logBotResponse(statusText);
}

/**
 * Handle Pending Questions menu
 */
async function handlePendingMenu(ctx) {
  await ctx.answerCbQuery();

  const pending = getPendingQuestions();

  if (pending.length === 0) {
    const backButton = Markup.inlineKeyboard([
      Markup.button.callback('« Back to Menu', 'back:main')
    ]);
    await ctx.editMessageText('No pending questions.', backButton);
    return;
  }

  await showPendingQuestionsMenu(ctx, true);
}

/**
 * Show pending questions with buttons
 */
async function showPendingQuestionsMenu(ctx, isEdit = false) {
  const pending = getPendingQuestions();

  let text = `❓ **Pending Questions** (${pending.length})\n\nClick to respond:\n\n`;

  const buttons = pending.map((q, idx) => {
    const preview = q.question.slice(0, 40);
    return [Markup.button.callback(`${idx + 1}. ${preview}...`, `answer:${q.questionId}`)];
  });

  buttons.push([Markup.button.callback('« Back to Menu', 'back:main')]);

  const keyboard = Markup.inlineKeyboard(buttons);

  if (isEdit) {
    await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
  } else {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  }

  // Register answer handlers
  pending.forEach(q => {
    ctx.telegram.bot.action(`answer:${q.questionId}`, async (answerCtx) => {
      await answerCtx.answerCbQuery();
      await answerCtx.reply(`**Question:** ${q.question}\n\nSend your response (text or voice):`);

      // Set up one-time handler for next message
      const conversation = require('./telegram-conversation.js');
      const originalHandler = ctx.telegram.bot.on('text');

      ctx.telegram.bot.once('text', async (responseCtx) => {
        const response = responseCtx.message.text;
        conversation.handleResponse(q.questionId, { type: 'text', content: response });
        await responseCtx.reply(`✅ Response recorded!\n\nResuming execution...`);
        logBotResponse('Response matched to selected question');
      });
    });
  });
}

/**
 * Handle New Requirements menu
 */
async function handleRequirementsMenu(ctx) {
  await ctx.answerCbQuery();
  currentConversationMode = 'requirements';
  requirementGatheringActive = true;

  await ctx.editMessageText(
    '✨ **New Requirements**\n\n' +
    'Describe what you want to build. I\'ll ask clarifying questions.\n\n' +
    'Send your first message or type "cancel" to abort.'
  );

  logBotResponse('Started requirement gathering mode');

  // Set up requirement gathering flow
  const sendMessage = async (text) => {
    await ctx.telegram.sendMessage(ctx.from.id, text);
  };

  const waitForResponse = () => {
    return new Promise((resolve) => {
      const handler = (responseCtx) => {
        const text = responseCtx.message.text;
        logMessage(responseCtx.from.id, responseCtx.from.username, 'text', text);
        ctx.telegram.bot.removeListener('text', handler);
        resolve(text);
      };
      ctx.telegram.bot.once('text', handler);
    });
  };

  // Wait for first message
  const initialMessage = await waitForResponse();

  if (/^cancel$/i.test(initialMessage.trim())) {
    await sendMessage('❌ Cancelled.');
    requirementGatheringActive = false;
    currentConversationMode = null;
    await ctx.telegram.sendMessage(ctx.from.id, 'Main Menu:', MAIN_MENU);
    return;
  }

  // Start requirement gathering
  try {
    const decision = await gatherRequirements(sendMessage, waitForResponse, initialMessage);

    if (decision) {
      await executeDecision(decision, sendMessage);
    }
  } catch (error) {
    await sendMessage(`❌ Error: ${error.message}`);
  } finally {
    requirementGatheringActive = false;
    currentConversationMode = null;
    await ctx.telegram.sendMessage(ctx.from.id, 'Main Menu:', MAIN_MENU);
  }
}

/**
 * Get monitor status
 */
function getMonitorStatus() {
  return {
    active: monitorActive,
    conversation_mode: currentConversationMode,
    requirement_gathering: requirementGatheringActive
  };
}

module.exports = {
  startHaikuMonitor,
  stopHaikuMonitor,
  getMonitorStatus,
  MAIN_MENU
};
