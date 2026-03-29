import { useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, Send, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { buildProductPath } from "../../utils/aiShopping.js";

const AI_CHAT_STREAM_URL = `${import.meta.env.VITE_API_URL}/api/v1/product/ai-chat/stream`;
const TYPING_FRAME_MS = 18;
const TYPING_CHARS_PER_FRAME = 3;
const QUICK_PROMPT_POOL = [
  "50% off items dikhao",
  "30% off fashion products dikhao",
  "4 star se upar fashion products dikhao",
  "Mujhe cheap fashion items suggest karo",
  "Under Rs 1000 ke products dikhao",
  "Order kaise track kare",
  "Theme change kaise kare",
  "Terms and conditions samjhao",
  "Mera latest order batao",
  "Wishlist kaise use kare",
  "Cart me item kaise add kare",
  "Above 40% off products dikhao",
];

const getDailyQuickPrompts = () => {
  const now = new Date();
  const daySeed = Number(
    `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate(),
    ).padStart(2, "0")}`,
  );
  const prompts = [];
  let offset = daySeed % QUICK_PROMPT_POOL.length;

  while (prompts.length < 3 && prompts.length < QUICK_PROMPT_POOL.length) {
    const prompt = QUICK_PROMPT_POOL[offset % QUICK_PROMPT_POOL.length];
    if (!prompts.includes(prompt)) {
      prompts.push(prompt);
    }
    offset += 3;
  }

  return prompts;
};

const getProductDiscountPercent = (product) => {
  const originalPrice = Number(product?.originalPrice || 0);
  const discountedPrice = Number(product?.discountedPrice || 0);

  if (!originalPrice || discountedPrice >= originalPrice) {
    return 0;
  }

  return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
};

const readSseResponse = async ({ response, onEvent }) => {
  if (!response.body) {
    throw new Error("Streaming response body is unavailable");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const flushEvent = async (rawEvent) => {
    const lines = rawEvent.split("\n").filter(Boolean);
    if (!lines.length) return;

    const eventName =
      lines.find((line) => line.startsWith("event:"))?.slice(6).trim() || "message";
    const dataText = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");

    await onEvent({
      event: eventName,
      data: dataText ? JSON.parse(dataText) : null,
    });
  };

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      await flushEvent(part);
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    await flushEvent(buffer);
  }
};

const AIChatbotWidget = () => {
  const quickPrompts = getDailyQuickPrompts();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeStreamId, setActiveStreamId] = useState(null);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi, main aapka ClassyShop AI shopping assistant hoon. Products, discounts, order guidance, ya website navigation me help kar sakta hoon.",
    },
  ]);
  const requestControllerRef = useRef(null);
  const latestRequestIdRef = useRef(0);
  const messagesContainerRef = useRef(null);
  const messageEndRef = useRef(null);
  const typingQueueRef = useRef("");
  const typingTimerRef = useRef(null);
  const typingDrainResolversRef = useRef([]);
  const activeStreamIdRef = useRef(null);

  const resolveTypingDrains = () => {
    typingDrainResolversRef.current.forEach((resolve) => resolve());
    typingDrainResolversRef.current = [];
  };

  const updateMessageById = (messageId, updater) => {
    setMessages((current) =>
      current.map((item) =>
        item.id === messageId ? updater(item) : item,
      ),
    );
  };

  const clearTypingTimer = () => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  };

  const finishStreamingVisuals = (messageId = null) => {
    const finalMessageId = messageId || activeStreamIdRef.current;
    clearTypingTimer();
    typingQueueRef.current = "";
    resolveTypingDrains();
    activeStreamIdRef.current = null;
    setActiveStreamId((current) =>
      current === finalMessageId ? null : current,
    );
  };

  const waitForTypingDrain = () =>
    new Promise((resolve) => {
      if (!typingQueueRef.current && !typingTimerRef.current) {
        resolve();
        return;
      }

      typingDrainResolversRef.current.push(resolve);
    });

  const startTypingPump = (messageId) => {
    if (typingTimerRef.current) return;

    const pump = () => {
      if (!typingQueueRef.current) {
        typingTimerRef.current = null;
        resolveTypingDrains();
        return;
      }

      const nextSlice = typingQueueRef.current.slice(0, TYPING_CHARS_PER_FRAME);
      typingQueueRef.current = typingQueueRef.current.slice(TYPING_CHARS_PER_FRAME);

      updateMessageById(messageId, (item) => ({
        ...item,
        text: `${item.text || ""}${nextSlice}`,
      }));

      typingTimerRef.current = setTimeout(pump, TYPING_FRAME_MS);
    };

    typingTimerRef.current = setTimeout(pump, TYPING_FRAME_MS);
  };

  const queueTypingChunk = (messageId, chunk) => {
    if (!chunk) return;

    typingQueueRef.current += chunk;
    startTypingPump(messageId);
  };

  const removeMessageById = (messageId) => {
    setMessages((current) => current.filter((item) => item.id !== messageId));
  };

  const cancelActiveStream = ({ removeMessage = false } = {}) => {
    const messageId = activeStreamIdRef.current;

    if (requestControllerRef.current) {
      requestControllerRef.current.abort();
      requestControllerRef.current = null;
    }

    clearTypingTimer();
    typingQueueRef.current = "";
    resolveTypingDrains();

    if (removeMessage && messageId) {
      removeMessageById(messageId);
    }

    activeStreamIdRef.current = null;
    setActiveStreamId(null);
    setIsTyping(false);
  };

  useEffect(() => {
    // Abort the in-flight AI request if the widget unmounts so React does not
    // try to update state after navigation or layout teardown.
    return () => {
      cancelActiveStream();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Keep the latest user message and AI reply visible without forcing the
    // user to manually scroll the chat window after every response.
    messageEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });

    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [isOpen, messages, isTyping]);

  const handleSend = async () => {
    if (!message.trim()) return;

    const currentMessage = message.trim();
    const currentRequestId = Date.now();
    latestRequestIdRef.current = currentRequestId;
    const userMessage = { role: "user", content: message.trim() };
    // Keep a short rolling conversation window so the AI gets enough context
    // without sending an ever-growing payload on every message.
    const nextMessages = [...messages, userMessage].slice(-8);
    setMessages(nextMessages);
    setMessage("");
    setIsTyping(true);

    if (requestControllerRef.current) {
      // Only the latest prompt should win. Cancelling the older request avoids
      // stale replies appearing after the user sends a new message quickly.
      cancelActiveStream({ removeMessage: true });
    }

    const controller = new AbortController();
    requestControllerRef.current = controller;
    const assistantMessageId = `assistant-${currentRequestId}`;
    activeStreamIdRef.current = assistantMessageId;
    setActiveStreamId(assistantMessageId);

    setMessages((current) =>
      [
        ...current,
        {
          id: assistantMessageId,
          role: "assistant",
          text: "",
          products: [],
        },
      ].slice(-8),
    );

    try {
      let receivedDoneEvent = false;
      const response = await fetch(AI_CHAT_STREAM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify({
          message: currentMessage,
          messages: nextMessages,
        }),
      });

      if (latestRequestIdRef.current !== currentRequestId) {
        return;
      }

      if (!response.ok) {
        throw new Error("AI request failed");
      }

      await readSseResponse({
        response,
        onEvent: async ({ event, data }) => {
          if (latestRequestIdRef.current !== currentRequestId) {
            return;
          }

          if (event === "start") {
            return;
          }

          if (event === "chunk") {
            setIsTyping(false);
            queueTypingChunk(assistantMessageId, data?.chunk || "");
            return;
          }

          if (event === "done") {
            receivedDoneEvent = true;
            await waitForTypingDrain();
            finishStreamingVisuals(assistantMessageId);

            updateMessageById(assistantMessageId, (item) => ({
              ...item,
              text:
                data?.reply?.reply ||
                item.text ||
                "I could not generate a response right now. Please try again.",
              products: data?.reply?.products || [],
            }));
            return;
          }

          if (event === "error") {
            throw new Error(data?.message || "AI request failed");
          }
        },
      });

      if (!receivedDoneEvent && latestRequestIdRef.current === currentRequestId) {
        throw new Error("AI stream ended before completion");
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      finishStreamingVisuals(assistantMessageId);
      updateMessageById(assistantMessageId, (item) => ({
        ...item,
        text:
          "AI support is unavailable right now. Please try again in a moment.",
        products: [],
      }));
    } finally {
      setIsTyping(false);
      if (latestRequestIdRef.current === currentRequestId) {
        requestControllerRef.current = null;
      }
    }
  };

  return (
    // On mobile and tablet the widget sits above the bottom nav; on desktop it
    // returns to a normal bottom-right floating position.
    <div className="fixed bottom-[5.5rem] right-3 z-40 md:right-4 lg:bottom-5 lg:right-5">
      {isOpen ? (
        <div className="mb-3 w-[min(22rem,calc(100vw-1.25rem))] rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.18)] lg:mb-4">
          <div className="flex items-center justify-between rounded-t-[28px] bg-slate-950 px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-2">
                <Bot size={18} />
              </div>
              <div>
                <p className="text-sm font-bold">AI Support Chatbot</p>
                <p className="text-xs text-slate-300">Website-aware support</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold"
            >
              Close
            </button>
          </div>

          <div
            ref={messagesContainerRef}
            className="max-h-80 space-y-3 overflow-y-auto px-4 py-4"
          >
            {messages.map((item, index) => (
              <div
                key={item.id || `${item.role}-${index}`}
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  item.role === "assistant"
                    ? "bg-slate-100 text-slate-700"
                    : "ml-auto bg-gradient-to-r from-orange-500 to-rose-500 text-white"
                }`}
              >
                {item.id === activeStreamId && !(item.content || item.text) ? (
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className="h-2.5 w-2.5 animate-bounce rounded-full bg-slate-400"
                        style={{ animationDelay: `${dot * 0.15}s` }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">
                    {item.content || item.text}
                    {item.id === activeStreamId ? (
                      <span className="ml-1 inline-block h-4 w-2 animate-pulse rounded-sm bg-current align-middle opacity-70" />
                    ) : null}
                  </p>
                )}
                {item.products?.length ? (
                  <div className="mt-3 space-y-2">
                    {item.products.map((product) => (
                      <Link
                        key={product._id}
                        to={buildProductPath(product)}
                        className="block rounded-2xl border border-slate-200 bg-white px-3 py-3 text-slate-800 transition hover:border-orange-300 hover:bg-orange-50"
                      >
                        <p className="line-clamp-1 text-sm font-semibold">
                          {product.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {product.brand || product.sourceLabel || product.category}
                        </p>
                        <p className="mt-2 text-xs text-slate-600">
                          {product.discountedPrice || product.originalPrice
                            ? `Rs ${Number(
                                product.discountedPrice || product.originalPrice || 0,
                              ).toLocaleString("en-IN")}`
                            : "Price unavailable"}
                          {getProductDiscountPercent(product)
                            ? ` • ${getProductDiscountPercent(product)}% off`
                            : ""}
                          {product.rating ? ` • ${product.rating} rating` : ""}
                        </p>
                        <p className="mt-1 text-xs font-medium text-orange-500">
                          Open product
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {isTyping && !activeStreamId ? (
              <div className="max-w-[85%] rounded-2xl bg-slate-100 px-4 py-3 text-slate-700">
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="h-2.5 w-2.5 animate-bounce rounded-full bg-slate-400"
                      style={{ animationDelay: `${dot * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            <div ref={messageEndRef} />
          </div>

          <div className="border-t border-slate-200 px-4 py-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {quickPrompts.map(
                (prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    // Quick prompts help mobile users start with realistic
                    // website-supported questions instead of a blank field.
                    onClick={() => setMessage(prompt)}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                  >
                    {prompt}
                  </button>
                ),
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSend();
                }}
                placeholder="Products, orders, ya website help poochhiye..."
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-400"
              />
              <button
                type="button"
                onClick={handleSend}
                className="rounded-2xl bg-slate-950 px-4 text-white"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="group ml-auto flex items-center gap-3 rounded-full bg-gradient-to-r from-orange-500 via-rose-500 to-red-500 px-4 py-3 text-sm font-bold text-white shadow-[0_14px_40px_rgba(244,63,94,0.28)] transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-105 hover:shadow-[0_20px_48px_rgba(244,63,94,0.36)] active:scale-95 lg:px-5 lg:py-4"
      >
        <MessageCircle
          size={18}
          className="transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110"
        />
        <span className="transition-transform duration-300 group-hover:translate-x-0.5">
          AI Chat
        </span>
        <Sparkles
          size={16}
          className="transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110"
        />
      </button>
    </div>
  );
};

export default AIChatbotWidget;
