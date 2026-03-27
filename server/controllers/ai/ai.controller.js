// File guide: ai.controller source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import { generateAiCatalogReply } from "../../services/aiCatalogChat.service.js";

export const getAiCatalogChatReply = async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const reply = await generateAiCatalogReply({
      message,
      messages,
    });

    return res.status(200).json({
      success: true,
      reply,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate AI response",
    });
  }
};
