// File guide: SupportChatPage source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ImagePlus,
  MessageSquareText,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useSelector } from "react-redux";
import {
  useCreateSupportConversationMutation,
  useDeleteSupportConversationMutation,
  useGetSupportConversationDetailsQuery,
  useGetSupportConversationsQuery,
  useSendSupportMessageMutation,
} from "../../../features/api/supportApi.js";
import { connectUserSocket, getUserSocket } from "../../../lib/socket.js";
import AuthButtonLoader from "../../../components/Loader/AuthButtonLoader.jsx";

const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api/v1/user`;

const formatTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "No activity yet";

const messageStatusClass = {
  sent: "bg-amber-100 text-amber-700",
  delivered: "bg-sky-100 text-sky-700",
  read: "bg-emerald-100 text-emerald-700",
};

const SupportChatPage = () => {
  const { user } = useSelector((state) => state.auth);
  const [draft, setDraft] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [supportOnline, setSupportOnline] = useState(false);
  const [vendorTyping, setVendorTyping] = useState(false);
  const [deletingConversationId, setDeletingConversationId] = useState(null);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState("");
  const [joinedChatId, setJoinedChatId] = useState(null);
  const [pendingSelectedId, setPendingSelectedId] = useState(null);
  const [isCleanupReady, setIsCleanupReady] = useState(false);
  const scrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const selectedIdRef = useRef(null);

  const {
    data: listData,
    isLoading: isListLoading,
    refetch: refetchList,
  } = useGetSupportConversationsQuery(undefined, {
    skip: !isCleanupReady,
  });
  const conversations = listData?.conversations || [];

  useEffect(() => {
    if (!conversations.length) {
      if (!pendingSelectedId && selectedId !== null) {
        setSelectedId(null);
      }
      if (pendingSelectedId !== null) {
        return;
      }
      return;
    }

    if (pendingSelectedId) {
      const hasPendingConversation = conversations.some(
        (item) => item._id === pendingSelectedId,
      );

      if (hasPendingConversation) {
        if (selectedId !== pendingSelectedId) {
          setSelectedId(pendingSelectedId);
        }
        setPendingSelectedId(null);
      }

      return;
    }

    const hasSelectedConversation = conversations.some(
      (item) => item._id === selectedId,
    );

    if (!selectedId || !hasSelectedConversation) {
      setSelectedId(conversations[0]._id);
    }
  }, [conversations, pendingSelectedId, selectedId]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const {
    data: detailsData,
    isLoading: isDetailsLoading,
    refetch: refetchDetails,
  } = useGetSupportConversationDetailsQuery(selectedId, {
    skip: !selectedId,
  });

  const [sendSupportMessage, { isLoading: isSending }] =
    useSendSupportMessageMutation();
  const [createSupportConversation, { isLoading: isCreatingChat }] =
    useCreateSupportConversationMutation();
  const [deleteSupportConversation] = useDeleteSupportConversationMutation();

  const messages = useMemo(() => detailsData?.messages || [], [detailsData?.messages]);

  const cleanupEmptyChats = async ({ keepalive = false } = {}) => {
    try {
      await fetch(`${API_BASE_URL}/support/conversations/empty`, {
        method: "DELETE",
        credentials: "include",
        keepalive,
      });
    } catch (_error) {
      // Ignore cleanup errors so chat UI remains responsive.
    }
  };

  useEffect(() => {
    let isMounted = true;

    const prepareSupportPage = async () => {
      await cleanupEmptyChats();

      if (isMounted) {
        setIsCleanupReady(true);
      }
    };

    prepareSupportPage();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const socket = getUserSocket();
    const syncChatList = () => {
      refetchList();
    };

    const syncSelectedConversation = (conversationId) => {
      if (
        conversationId &&
        String(conversationId) === String(selectedIdRef.current)
      ) {
        refetchDetails();
      }
    };

    const handleConnect = () => {
      syncChatList();
      socket.emit("sync_presence");
      if (selectedIdRef.current) {
        socket.emit(
          "join_support_chat",
          { chatId: selectedIdRef.current },
          (response) => {
            if (response?.ok) {
              setJoinedChatId(response.chatId || null);
            }
          },
        );
        refetchDetails();
      }
    };

    const handleVendorPresence = (payload) => {
      setSupportOnline(Boolean(payload?.online));
    };

    const handleTyping = (payload) => {
      if (String(payload?.chatId) === String(selectedIdRef.current)) {
        setVendorTyping(true);
      }
    };

    const handleStopTyping = (payload) => {
      if (String(payload?.chatId) === String(selectedIdRef.current)) {
        setVendorTyping(false);
      }
    };

    socket.on("connect", handleConnect);
    socket.on("support:message", (payload) => {
      syncChatList();
      syncSelectedConversation(payload?.conversationId);
    });
    socket.on("support:conversation:update", (payload) => {
      syncChatList();
      if (!selectedIdRef.current && payload?.conversationId) {
        setSelectedId(payload.conversationId);
      }
    });
    socket.on("vendor_presence_snapshot", handleVendorPresence);
    socket.on("vendor_online", handleVendorPresence);
    socket.on("vendor_offline", handleVendorPresence);
    socket.on("typing", handleTyping);
    socket.on("stop_typing", handleStopTyping);
    connectUserSocket();
    socket.emit("sync_presence");
    if (selectedIdRef.current) {
      socket.emit("join_support_chat", { chatId: selectedIdRef.current }, (response) => {
        if (response?.ok) {
          setJoinedChatId(response.chatId || null);
        }
      });
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("support:message");
      socket.off("support:conversation:update");
      socket.off("vendor_presence_snapshot", handleVendorPresence);
      socket.off("vendor_online", handleVendorPresence);
      socket.off("vendor_offline", handleVendorPresence);
      socket.off("typing", handleTyping);
      socket.off("stop_typing", handleStopTyping);
    };
  }, [refetchList, refetchDetails]);

  useEffect(() => {
    const socket = connectUserSocket();

    if (!selectedId) {
      setJoinedChatId(null);
      socket.emit("leave_support_chat");
      return undefined;
    }

    socket.emit("join_support_chat", { chatId: selectedId }, (response) => {
      setJoinedChatId(response?.ok ? response.chatId || selectedId : null);
    });

    return () => {
      setJoinedChatId((current) =>
        String(current) === String(selectedId) ? null : current,
      );
      socket.emit("leave_support_chat", { chatId: selectedId });
    };
  }, [selectedId]);

  useEffect(() => {
    const handlePageLeave = () => {
      if (!selectedIdRef.current) return;

      fetch(`${API_BASE_URL}/support/conversations/empty`, {
        method: "DELETE",
        credentials: "include",
        keepalive: true,
      }).catch(() => {});
    };

    window.addEventListener("pagehide", handlePageLeave);

    return () => {
      handlePageLeave();
      window.removeEventListener("pagehide", handlePageLeave);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, vendorTyping]);

  useEffect(() => {
    setVendorTyping(false);
  }, [selectedId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!attachmentFile) {
      setAttachmentPreview("");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(attachmentFile);
    setAttachmentPreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [attachmentFile]);

  const emitTyping = (isTyping) => {
    if (!selectedId || String(joinedChatId) !== String(selectedId)) return;
    const socket = connectUserSocket();
    socket.emit(isTyping ? "typing" : "stop_typing", {
      chatId: selectedId,
      senderId: user?._id,
      senderRole: "user",
    });
  };

  const handleDraftChange = (value) => {
    setDraft(value);
    emitTyping(Boolean(value.trim()));

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(false);
    }, 1200);
  };

  const handleSubmit = async () => {
    if (!draft.trim() && !attachmentFile) {
      toast.error("Write a message or choose an image");
      return;
    }

    const formData = new FormData();
    let conversationId = selectedId;

    if (!conversationId) {
      const created = await createSupportConversation().unwrap();
      conversationId = created?.conversation?._id;
      setSelectedId(conversationId);
    }

    if (draft.trim()) {
      formData.append("text", draft.trim());
    }
    if (attachmentFile) {
      formData.append("attachments", attachmentFile);
    }
    if (conversationId) {
      formData.append("conversationId", conversationId);
    }

    try {
      await sendSupportMessage(formData).unwrap();
      setDraft("");
      setAttachmentFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      emitTyping(false);
      refetchList();
      if (conversationId) {
        refetchDetails();
      }
    } catch (error) {
      toast.error(error?.data?.message || "Failed to send support message");
    }
  };

  const handleDeleteConversation = async (conversationId = selectedId) => {
    if (!conversationId) return;

    try {
      setDeletingConversationId(conversationId);
      await deleteSupportConversation(conversationId).unwrap();
      toast.success("Conversation deleted");
      if (selectedId === conversationId) {
        setSelectedId(null);
      }
      setVendorTyping(false);
      setDraft("");
      setAttachmentFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      refetchList();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete conversation");
    } finally {
      setDeletingConversationId(null);
    }
  };

  const handleStartNewChat = async () => {
    try {
      setVendorTyping(false);
      setDraft("");
      setAttachmentFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      const created = await createSupportConversation().unwrap();
      const createdId = created?.conversation?._id || null;
      setPendingSelectedId(createdId);
      setSelectedId(createdId);
      refetchList();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to start new chat");
    }
  };

  const handleSelectAttachment = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      event.target.value = "";
      return;
    }

    setAttachmentFile(file);
  };

  const handleRemoveAttachment = () => {
    setAttachmentFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <section className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_18px_70px_rgba(15,23,42,0.08)]">
        <div className="grid gap-0 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className="border-r border-slate-200 bg-slate-950 p-5 text-white md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">
                  Chat list
                </p>
                <h1 className="mt-2 text-2xl font-black text-white">
                  Support chats
                </h1>
              </div>
              <button
                type="button"
                onClick={handleStartNewChat}
                disabled={isCreatingChat}
                className="inline-flex items-center gap-2 rounded-full border border-sky-300/25 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/20 disabled:opacity-60"
              >
                {isCreatingChat ? (
                  <AuthButtonLoader color="#ffffff" size={16} />
                ) : (
                  <>
                    <Plus size={16} />
                    New Chat
                  </>
                )}
              </button>
            </div>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  supportOnline ? "bg-emerald-400" : "bg-slate-400"
                }`}
              />
              {supportOnline ? "Support online" : "Support offline"}
            </div>

            <div className="mt-6 space-y-3">
                {isListLoading ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-200">
                    Loading conversations...
                  </div>
                ) : conversations.length ? (
                  conversations.map((item) => (
                    <div
                      key={item._id}
                      className={`rounded-[24px] border px-4 py-4 transition ${
                        selectedId === item._id
                          ? "border-sky-300 bg-white/15"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedId(item._id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-sm font-bold text-white">
                            {item.lastMessage || "Support conversation"}
                          </p>
                          <p className="mt-2 text-xs text-slate-300">
                            {formatTime(item.lastMessageAt)}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteConversation(item._id)}
                          disabled={deletingConversationId === item._id}
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-300/20 bg-rose-500/10 text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-60"
                        >
                          {deletingConversationId === item._id ? (
                            <AuthButtonLoader color="#ffffff" size={16} />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                      {item.unreadForUser ? (
                        <div className="mt-3">
                          <span className="rounded-full bg-rose-500 px-2 py-1 text-[11px] font-bold text-white">
                            {item.unreadForUser} unread
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/15 px-4 py-6 text-sm text-slate-300">
                    No support conversations yet. Send your first message to create one.
                  </div>
                )}
            </div>
          </aside>

          <div className="flex min-h-[44rem] flex-col bg-slate-50">
            <div className="border-b border-slate-200 bg-white px-5 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-500">
                    {user?.name ? `${user.name}'s support chat` : "Support chat"}
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    {selectedId ? "Your full chat history" : "Start a support conversation"}
                  </h2>
                </div>
                <p className="text-sm font-semibold text-slate-500">
                  {conversations.length} chat{conversations.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 space-y-4 overflow-y-auto px-4 py-5 md:px-5"
            >
              {selectedId ? (
                isDetailsLoading ? (
                  <div className="flex h-full items-center justify-center text-slate-500">
                    Loading conversation...
                  </div>
                ) : messages.length ? (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message._id}
                        className={`max-w-[88%] rounded-[24px] px-4 py-4 shadow-sm ${
                          message.senderRole === "user"
                            ? "ml-auto bg-gradient-to-r from-orange-500 to-rose-500 text-white"
                            : "bg-white text-slate-800"
                        }`}
                      >
                        {message.text ? (
                          <p className="text-sm leading-7">{message.text}</p>
                        ) : null}
                        {message.attachments?.length ? (
                          <div className={message.text ? "mt-3" : ""}>
                            {message.attachments.map((attachment, index) => (
                              <a
                                key={`${message._id}-${attachment.url}-${index}`}
                                href={attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block overflow-hidden rounded-[18px] border border-white/20 bg-white/10"
                              >
                                <img
                                  src={attachment.url}
                                  alt={attachment.fileName || "Support attachment"}
                                  className="max-h-72 w-full object-cover"
                                />
                              </a>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                          <span
                            className={
                              message.senderRole === "user"
                                ? "text-white/80"
                                : "text-slate-500"
                            }
                          >
                            {formatTime(message.createdAt)}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 font-semibold ${
                              message.senderRole === "user"
                                ? "bg-white/20 text-white"
                                : messageStatusClass[message.status] ||
                                  "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {message.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {vendorTyping ? (
                      <div className="max-w-[12rem] rounded-[24px] bg-white px-4 py-4 shadow-sm">
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
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="max-w-md rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
                      <p className="text-lg font-bold text-slate-950">
                        No messages in this conversation
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-md rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
                    <MessageSquareText className="mx-auto text-slate-400" size={26} />
                    <p className="mt-4 text-lg font-bold text-slate-950">
                      Start your first support chat
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-500">
                      Send a message below and your support conversation will be created automatically.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-white px-4 py-4 md:px-5">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="flex-1">
                  <div className="rounded-[24px] border border-slate-200 px-4 py-4 focus-within:border-orange-400">
                    <textarea
                      value={draft}
                      onChange={(event) => handleDraftChange(event.target.value)}
                      onBlur={() => emitTyping(false)}
                      placeholder="Describe your issue, ask for product help, or share order concerns..."
                      className="min-h-[6rem] w-full resize-none text-sm outline-none"
                    />
                    {attachmentPreview ? (
                      <div className="relative mt-3 inline-flex overflow-hidden rounded-[18px] border border-slate-200 bg-slate-100">
                        <img
                          src={attachmentPreview}
                          alt="Selected attachment preview"
                          className="h-20 w-20 object-cover"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveAttachment}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/80 text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleSelectAttachment}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        <ImagePlus size={16} />
                        Add image
                      </button>
                    </div>
                  </div>
                </div>
                <div className="md:w-[12rem]">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSending || isCreatingChat}
                    className="flex w-full items-center justify-center gap-2 rounded-[22px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:bg-slate-400"
                  >
                    {isSending || isCreatingChat ? (
                      <AuthButtonLoader color="#ffffff" size={18} />
                    ) : (
                      <>
                        <Send size={16} />
                        Send
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SupportChatPage;
