import {
  generateAiCatalogReply,
  generateAiCatalogReplyStream,
} from "../../services/aiCatalogChat.service.js";

const writeSseEvent = (res, event, data) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

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
      userId: req.id,
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

export const streamAiCatalogChatReply = async (req, res) => {
  const message = String(req.body?.message || "").trim();
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];

  if (!message) {
    return res.status(400).json({
      success: false,
      message: "Message is required",
    });
  }

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const abortController = new AbortController();
  const handleClientAbort = () => abortController.abort();
  const handleResponseClose = () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  };

  req.on("aborted", handleClientAbort);
  res.on("close", handleResponseClose);
  writeSseEvent(res, "start", { ok: true });

  try {
    for await (const event of generateAiCatalogReplyStream({
      message,
      messages,
      signal: abortController.signal,
      userId: req.id,
    })) {
      if (event.type === "chunk") {
        writeSseEvent(res, "chunk", { chunk: event.chunk });
        continue;
      }

      if (event.type === "done") {
        writeSseEvent(res, "done", { reply: event.reply });
      }
    }
  } catch (error) {
    if (error?.name !== "AbortError") {
      writeSseEvent(res, "error", {
        message: error.message || "Failed to generate AI response",
      });
    }
  } finally {
    req.off("aborted", handleClientAbort);
    res.off("close", handleResponseClose);
    res.end();
  }
};
