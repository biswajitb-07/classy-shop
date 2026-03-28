import { useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, Send, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { buildProductPath } from "../../utils/aiShopping.js";

const AI_CHAT_URL = `${import.meta.env.VITE_API_URL}/api/v1/product/ai-chat`;

const AIChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
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

  useEffect(() => {
    // Abort the in-flight AI request if the widget unmounts so React does not
    // try to update state after navigation or layout teardown.
    return () => {
      if (requestControllerRef.current) {
        requestControllerRef.current.abort();
      }
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
      requestControllerRef.current.abort();
    }

    const controller = new AbortController();
    requestControllerRef.current = controller;

    try {
      const response = await fetch(AI_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

      const data = await response.json();
      const reply = {
        role: "assistant",
        text:
          data?.reply?.reply ||
          "I could not generate a response right now. Please try again.",
        products: data?.reply?.products || [],
      };

      // We append the assistant reply only if it still belongs to the most
      // recent request; aborted older requests should never win the race.
      setMessages((current) => [...current, reply].slice(-8));
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      setMessages((current) =>
        [
          ...current,
          {
            role: "assistant",
            text:
              "AI support is unavailable right now. Please try again in a moment.",
          },
        ].slice(-8),
      );
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
                key={`${item.role}-${index}`}
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  item.role === "assistant"
                    ? "bg-slate-100 text-slate-700"
                    : "ml-auto bg-gradient-to-r from-orange-500 to-rose-500 text-white"
                }`}
              >
                <p>{item.content || item.text}</p>
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
                        <p className="mt-1 text-xs font-medium text-orange-500">
                          Open product
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {isTyping ? (
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
              {[
                "50% off items dikhao",
                "Mujhe cheap fashion items suggest karo",
                "Order kaise track kare",
              ].map(
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
