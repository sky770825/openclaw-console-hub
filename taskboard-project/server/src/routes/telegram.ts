import { Router, Request, Response } from "express";
import { logger } from "../utils/logger.js";

const router = Router();

// Telegram API Response Types
interface TelegramApiResponse {
  ok: boolean;
  result?: {
    message_id?: number;
    id?: number;
    username?: string;
    first_name?: string;
  };
  description?: string;
}

/**
 * POST /api/telegram/notify
 * Send a notification via Telegram
 * Requires: message in body
 */
router.post("/notify", async (req: Request, res: Response) => {
  const { message, chatId, parseMode = "HTML" } = req.body;

  if (!message) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const defaultChatId = process.env.TELEGRAM_CHAT_ID;
    const targetChatId = chatId || defaultChatId;

    if (!botToken) {
      res.status(500).json({ error: "Telegram bot token not configured" });
      return;
    }

    if (!targetChatId) {
      res.status(400).json({ error: "Chat ID not provided and no default configured" });
      return;
    }

    // Call Telegram Bot API
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: message,
        parse_mode: parseMode,
      }),
    });

    const data = (await response.json()) as TelegramApiResponse;

    if (!response.ok) {
      logger.error({ category: "telegram", apiResponse: data }, "Telegram API error");
      res.status(500).json({
        error: "Failed to send Telegram message",
        details: data.description,
      });
      return;
    }

    res.json({
      success: true,
      message: "Notification sent",
      messageId: data.result?.message_id,
      chatId: targetChatId,
    });
  } catch (error) {
    logger.error({ category: "telegram", error: error instanceof Error ? error.message : String(error) }, "Error sending notification");
    res.status(500).json({ error: "Failed to send notification" });
  }
});

/**
 * GET /api/telegram/status
 * Check Telegram bot status
 */
router.get("/status", async (_req: Request, res: Response) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const allowAnyChat = process.env.TELEGRAM_ALLOW_ANY_CHAT !== 'false';

  if (!botToken) {
    res.json({
      configured: false,
      message: "Bot token not configured",
    });
    return;
  }

  try {
    // Get bot info from Telegram API
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = (await response.json()) as TelegramApiResponse;

    if (data.ok) {
      res.json({
        configured: true,
        bot: {
          id: data.result?.id,
          username: data.result?.username,
          firstName: data.result?.first_name,
        },
        defaultChatId: chatId || null,
        security: {
          restrictedToDefaultChat: !allowAnyChat,
        },
      });
    } else {
      res.status(500).json({
        configured: false,
        error: "Invalid bot token",
        details: data.description,
      });
    }
  } catch (error) {
    logger.error({ category: "telegram", error: error instanceof Error ? error.message : String(error) }, "Error checking status");
    res.status(500).json({
      configured: false,
      error: "Failed to check bot status",
    });
  }
});

/**
 * POST /api/telegram/webhook
 * Handle incoming updates from Telegram (for bot interactions)
 */
router.post("/webhook", async (req: Request, res: Response) => {
  const update = req.body;

  // Acknowledge receipt immediately
  res.sendStatus(200);

  // Process the update asynchronously
  try {
    logger.info({ category: "telegram", update: JSON.stringify(update).substring(0, 500) }, "Webhook received");

    if (update.message) {
      const { message } = update;
      const chatId = message.chat.id;
      const text = message.text || "";

      // Simple command handling
      if (text.startsWith("/")) {
        const command = text.split(" ")[0].toLowerCase();

        switch (command) {
          case "/start":
            // Handle start command
            logger.info({ category: "telegram", username: message.from?.username }, "User started the bot");
            break;
          case "/status":
            // Handle status command
            logger.info({ category: "telegram", username: message.from?.username }, "Status request");
            break;
          default:
            logger.info({ category: "telegram", command }, "Unknown command received");
        }
      }
    }
  } catch (error) {
    logger.error({ category: "telegram", error: error instanceof Error ? error.message : String(error) }, "Error processing webhook");
  }
});

export { router as telegramRouter };
