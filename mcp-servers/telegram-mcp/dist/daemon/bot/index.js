/**
 * Telegram Bot initialization for the Telegram MCP daemon.
 *
 * Supports webhook mode (when TELEGRAM_WEBHOOK_URL is set) and
 * long polling mode (default). Forum topic creation, thread messaging,
 * and session connect/disconnect notifications are handled here.
 *
 * Pattern: Lazy initialization — bot is NOT created at import time.
 * Call initializeBot() first, then startBot(sessionService, getQuestions)
 * to wire handlers and start receiving updates.
 */
import http from 'http';
import { Telegraf, session } from 'telegraf';
import { createLogger } from '../../shared/logger.js';
import { setupHandlers } from './handlers.js';
import ngrok from '@ngrok/ngrok';
const log = createLogger('bot');
// ─── Module state ──────────────────────────────────────────────────────────────
/** Singleton bot instance — created once in initializeBot() */
let bot = null;
/** HTTP server used in webhook mode (null in polling mode) */
let webhookServer = null;
/** ngrok tunnel listener — non-null only when auto-ngrok is active */
let ngrokListener = null;
// ─── Bot lifecycle ─────────────────────────────────────────────────────────────
/**
 * Create the Telegraf instance with session middleware.
 *
 * Does NOT register handlers — handlers depend on sessionService
 * and getQuestions which are only available in startBot().
 *
 * @returns The configured bot instance (not yet launched)
 */
export function initializeBot() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');
    }
    const instance = new Telegraf(token);
    instance.use(session({
        defaultSession: () => ({ _placeholder: true }),
    }));
    bot = instance;
    log.info('Bot instance created (handlers not yet registered)');
    return instance;
}
/**
 * Wire handlers and start the bot in webhook or long polling mode.
 *
 * @param sessionService In-memory session registry (provides getAllSessions and events)
 * @param getQuestions   Callback returning current pending questions (from Plan 04)
 */
export async function startBot(sessionService, getQuestions) {
    if (!bot) {
        initializeBot();
    }
    const botInstance = bot;
    // Wire handlers — this must happen AFTER sessionService is available
    // Cast to Context to satisfy setupHandlers' generic signature
    setupHandlers(botInstance, sessionService, getQuestions);
    // ─── Session event notifications ─────────────────────────────────────────
    sessionService.on('session:connected', async (session) => {
        log.info({ sessionId: session.id, label: session.label }, 'Session connected — sending notification');
        try {
            await sendToGroup(`Claude connected \u2014 ${session.label}`);
        }
        catch (err) {
            log.error({ err: err.message }, 'Failed to send session:connected notification');
        }
    });
    sessionService.on('session:disconnected', async (session) => {
        log.info({ sessionId: session.id, label: session.label }, 'Session disconnected — sending notification');
        try {
            await sendToGroup(`Claude disconnected \u2014 ${session.label}`);
        }
        catch (err) {
            log.error({ err: err.message }, 'Failed to send session:disconnected notification');
        }
    });
    // ─── Forum setup validation ───────────────────────────────────────────────
    const groupChatId = process.env.TELEGRAM_GROUP_CHAT_ID;
    if (groupChatId) {
        try {
            const chat = await botInstance.telegram.getChat(groupChatId);
            // @ts-ignore — is_forum is not in all Telegraf chat type definitions
            if (chat.type !== 'supergroup' || !chat.is_forum) {
                log.error({ chatId: groupChatId }, 'TELEGRAM_GROUP_CHAT_ID is not a forum supergroup. ' +
                    'To enable forum threads: open group → Edit → Enable Topics. ' +
                    'Bot will continue but thread features will not work.');
            }
            else {
                log.info({ chatId: groupChatId }, 'Forum supergroup validated — thread features enabled');
            }
        }
        catch (err) {
            log.error({ chatId: groupChatId, err: err.message }, 'Failed to validate forum group. Check TELEGRAM_GROUP_CHAT_ID and bot admin permissions.');
        }
    }
    else {
        log.warn('TELEGRAM_GROUP_CHAT_ID not set — forum thread features disabled. ' +
            'Falling back to TELEGRAM_OWNER_ID DM mode.');
    }
    // ─── Webhook vs polling ───────────────────────────────────────────────────
    // Priority: manual TELEGRAM_WEBHOOK_URL > auto ngrok (NGROK_AUTHTOKEN) > long polling
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
    const ngrokAuthtoken = process.env.NGROK_AUTHTOKEN;
    if (webhookUrl) {
        await startWebhookMode(botInstance, webhookUrl);
    }
    else if (ngrokAuthtoken) {
        const port = parseInt(process.env.PORT ?? '3333', 10);
        const tunnelUrl = await startNgrokTunnel(port);
        await startWebhookMode(botInstance, tunnelUrl);
    }
    else {
        await startPollingMode(botInstance);
    }
}
async function startWebhookMode(botInstance, webhookUrl) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const port = parseInt(process.env.PORT ?? '3333', 10);
    const hookPath = `/bot${token}`;
    // Create a plain Node.js HTTP server — express not needed for a single endpoint
    webhookServer = http.createServer(async (req, res) => {
        if (req.method === 'POST' && req.url === hookPath) {
            const chunks = [];
            req.on('data', (chunk) => chunks.push(chunk));
            req.on('end', async () => {
                try {
                    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                    await botInstance.handleUpdate(body);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end('{"ok":true}');
                }
                catch (err) {
                    log.error({ err: err.message }, 'Error processing webhook update');
                    res.writeHead(500);
                    res.end();
                }
            });
        }
        else {
            res.writeHead(404);
            res.end();
        }
    });
    await botInstance.telegram.setWebhook(`${webhookUrl}/bot${token}`);
    await new Promise((resolve) => {
        webhookServer.listen(port, () => {
            log.info({ port }, `Bot started in webhook mode on port ${port}`);
            resolve();
        });
    });
}
async function startPollingMode(botInstance) {
    await botInstance.telegram.deleteWebhook();
    await botInstance.launch({ dropPendingUpdates: true });
    log.info('Bot started in long polling mode');
}
/**
 * Start an ngrok tunnel and return the public HTTPS URL.
 *
 * Requires NGROK_AUTHTOKEN to be set. The tunnel forwards to localhost:{port}.
 * The returned URL is used as the Telegram webhook base URL.
 *
 * @param port Local port to tunnel (same as webhook HTTP server port)
 * @returns Public HTTPS URL (e.g. "https://abc123.ngrok-free.app")
 */
async function startNgrokTunnel(port) {
    const authtoken = process.env.NGROK_AUTHTOKEN;
    ngrokListener = await ngrok.forward({
        addr: port,
        authtoken,
    });
    const url = ngrokListener.url();
    if (!url) {
        throw new Error('ngrok tunnel started but returned no URL');
    }
    log.info({ url, port }, 'ngrok tunnel established');
    return url;
}
/**
 * Stop the bot gracefully (polling or webhook mode).
 */
export async function stopBot() {
    if (!bot) {
        log.warn('stopBot() called but bot not initialized');
        return;
    }
    bot.stop('SIGTERM');
    if (webhookServer) {
        webhookServer.close();
        webhookServer = null;
    }
    if (ngrokListener) {
        await ngrokListener.close();
        ngrokListener = null;
        log.info('ngrok tunnel closed');
    }
    log.info('Bot stopped');
}
/**
 * Return the current bot instance, or null if not yet initialized.
 */
export function getBot() {
    return bot;
}
// ─── Messaging helpers ─────────────────────────────────────────────────────────
/**
 * React to a message with an emoji (requires Bot API 7.0+).
 *
 * Used to mark a user's reply as "read" — gives immediate visual feedback
 * without a text response cluttering the thread.
 *
 * @param messageId  The message_id of the message to react to
 * @param emoji      Emoji to use as reaction (default: ✅)
 */
export async function reactToMessage(messageId, emoji = '✅') {
    if (!bot) {
        throw new Error('Bot not initialized. Call startBot() first.');
    }
    const chatId = process.env.TELEGRAM_GROUP_CHAT_ID;
    if (!chatId) {
        throw new Error('TELEGRAM_GROUP_CHAT_ID is not set — cannot react to messages');
    }
    // setMessageReaction requires Bot API 7.0+ — use `as any` since older Telegraf
    // type definitions may not include it yet.
    await bot.telegram.setMessageReaction(chatId, messageId, [
        { type: 'emoji', emoji },
    ]);
}
/**
 * Send a plain message to the Telegram group chat.
 *
 * Falls back to TELEGRAM_OWNER_ID if TELEGRAM_GROUP_CHAT_ID is not set.
 *
 * @param text    Message text
 * @param options Optional Telegraf sendMessage options
 */
export async function sendToGroup(text, options) {
    if (!bot) {
        throw new Error('Bot not initialized. Call startBot() first.');
    }
    const chatId = process.env.TELEGRAM_GROUP_CHAT_ID ?? process.env.TELEGRAM_OWNER_ID;
    if (!chatId) {
        throw new Error('Neither TELEGRAM_GROUP_CHAT_ID nor TELEGRAM_OWNER_ID is set');
    }
    await bot.telegram.sendMessage(chatId, text, options);
}
/**
 * Create a new forum topic (thread) in the group chat.
 *
 * @param title Topic title shown as the thread name in Telegram
 * @returns The message_thread_id of the created topic
 */
export async function createForumTopic(title) {
    if (!bot) {
        throw new Error('Bot not initialized. Call startBot() first.');
    }
    const chatId = process.env.TELEGRAM_GROUP_CHAT_ID;
    if (!chatId) {
        throw new Error('TELEGRAM_GROUP_CHAT_ID is not set — cannot create forum topics');
    }
    const topic = await bot.telegram.createForumTopic(chatId, title);
    log.info({ chatId, title, threadId: topic.message_thread_id }, 'Forum topic created');
    return topic.message_thread_id;
}
/**
 * Send a message to a specific forum thread.
 *
 * @param threadId     The message_thread_id of the target thread
 * @param text         Message text
 * @param options      Optional Telegraf sendMessage options
 */
export async function sendToThread(threadId, text, options) {
    if (!bot) {
        throw new Error('Bot not initialized. Call startBot() first.');
    }
    const chatId = process.env.TELEGRAM_GROUP_CHAT_ID;
    if (!chatId) {
        throw new Error('TELEGRAM_GROUP_CHAT_ID is not set — cannot send to forum threads');
    }
    await bot.telegram.sendMessage(chatId, text, {
        ...options,
        message_thread_id: threadId,
    });
}
