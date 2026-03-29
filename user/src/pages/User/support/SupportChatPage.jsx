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
import { useTheme } from "../../../context/ThemeContext.jsx";
import { connectUserSocket } from "../../../lib/socket.js";
import AuthButtonLoader from "../../../components/Loader/AuthButtonLoader.jsx";
import {
  playChatReceiveSound,
  playChatSendSound,
  primeUiFeedbackSounds,
  waitForNextPaint,
} from "../../../utils/uiFeedbackSounds.js";

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
  const { isDark } = useTheme();
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
  const hasHydratedMessagesRef = useRef(false);

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
    primeUiFeedbackSounds();
  }, []);

  useEffect(() => {
    const socket = connectUserSocket();
    const syncChatList = () => {
      if (!isCleanupReady) return;
      return refetchList();
    };

    const syncSelectedConversation = (conversationId) => {
      if (
        selectedIdRef.current &&
        conversationId &&
        String(conversationId) === String(selectedIdRef.current)
      ) {
        return refetchDetails();
      }

      return Promise.resolve();
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

    const handleDisconnect = () => {
      setSupportOnline(false);
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
    socket.on("support:message", async (payload) => {
      await Promise.all([
        syncChatList(),
        syncSelectedConversation(payload?.conversationId),
      ]);

      if (
        payload?.message?.senderRole === "vendor" &&
        String(payload?.conversationId) === String(selectedIdRef.current)
      ) {
        await waitForNextPaint();
        playChatReceiveSound();
      }
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
    socket.on("disconnect", handleDisconnect);

    if (socket.connected) {
      handleConnect();
    } else {
      socket.connect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("support:message");
      socket.off("support:conversation:update");
      socket.off("vendor_presence_snapshot", handleVendorPresence);
      socket.off("vendor_online", handleVendorPresence);
      socket.off("vendor_offline", handleVendorPresence);
      socket.off("typing", handleTyping);
      socket.off("stop_typing", handleStopTyping);
    };
  }, [isCleanupReady, refetchList, refetchDetails]);

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
    if (!messages.length) {
      hasHydratedMessagesRef.current = true;
      return;
    }

    if (!hasHydratedMessagesRef.current) {
      hasHydratedMessagesRef.current = true;
    }
  }, [messages]);

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
      await Promise.all([
        isCleanupReady ? refetchList() : Promise.resolve(),
        conversationId && selectedIdRef.current ? refetchDetails() : Promise.resolve(),
      ]);
      await waitForNextPaint();
      playChatSendSound();
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
      if (isCleanupReady) {
        refetchList();
      }
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
      if (isCleanupReady) {
        refetchList();
      }
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

  const selectedConversation = conversations.find(
    (item) => item._id === selectedId,
  );
  const shellClass = isDark
    ? "border-white/10 bg-[linear-gradient(135deg,rgba(10,14,34,0.96),rgba(24,22,58,0.94)_45%,rgba(19,30,54,0.94))] shadow-[0_30px_90px_rgba(0,0,0,0.4)]"
    : "border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(255,245,252,0.94)_45%,rgba(240,248,255,0.92))] shadow-[0_30px_90px_rgba(106,88,255,0.16)]";
  const shellGlowClass = isDark
    ? "bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.18),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(103,196,255,0.14),transparent_26%),radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_30%)]"
    : "bg-[radial-gradient(circle_at_top_right,rgba(255,112,166,0.25),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(103,196,255,0.18),transparent_26%),radial-gradient(circle_at_top_left,rgba(255,255,255,0.85),transparent_30%)]";
  const contentPanelClass = isDark
    ? "bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(17,24,39,0.8))]"
    : "bg-[linear-gradient(180deg,rgba(255,255,255,0.62),rgba(255,255,255,0.36))]";
  const borderSoftClass = isDark ? "border-white/10" : "border-slate-200/70";
  const headingClass = isDark ? "text-white" : "text-slate-900";
  const mutedClass = isDark ? "text-slate-400" : "text-slate-500";
  const incomingBubbleClass = isDark
    ? "border border-white/10 bg-[linear-gradient(180deg,rgba(30,41,59,0.92),rgba(15,23,42,0.88))] text-slate-100 backdrop-blur-xl"
    : "border border-white/80 bg-white/85 text-slate-800 backdrop-blur-xl";
  const emptyCardClass = isDark
    ? "border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(17,24,39,0.84))] shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl"
    : "border border-white/80 bg-white/75 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl";
  const composerWrapClass = isDark
    ? "border-white/10 bg-slate-950/30"
    : "border-slate-200/70 bg-white/35";
  const composerShellClass = isDark
    ? "border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(30,41,59,0.88))] shadow-[0_18px_45px_rgba(0,0,0,0.28)]"
    : "border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(245,244,255,0.8))] shadow-[0_18px_45px_rgba(135,102,255,0.12)]";
  const inputCardClass = isDark
    ? "border-white/10 bg-slate-950/35"
    : "border-slate-200/80 bg-white/90";
  const textareaClass = isDark
    ? "min-h-[4.5rem] w-full resize-none bg-transparent text-base text-slate-100 outline-none placeholder:text-slate-500"
    : "min-h-[4.5rem] w-full resize-none bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-400";
  const attachmentButtonClass = isDark
    ? "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-100 transition hover:border-white/20 hover:bg-white/10"
    : "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f3f4ff)] px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50";
  const supportProfileClass = isDark
    ? "border-white/10 bg-white/5"
    : "border-slate-200/80 bg-white/70";
  const supportAvatarClass = isDark
    ? "bg-[linear-gradient(135deg,#38bdf8,#6366f1_55%,#7c3aed)] text-white"
    : "bg-[linear-gradient(135deg,#2563eb,#7c3aed)] text-white";

  return (
    <section className="container mx-auto px-4 pb-10 pt-6 md:px-6 lg:px-8">
      <div className={`relative overflow-hidden rounded-[38px] border backdrop-blur-xl ${shellClass}`}>
        <div className={`pointer-events-none absolute inset-0 ${shellGlowClass}`} />

        <div className="relative grid min-h-[48rem] gap-0 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="relative flex flex-col overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(66,153,225,0.34),transparent_18%),radial-gradient(circle_at_bottom_center,rgba(255,72,145,0.16),transparent_28%),linear-gradient(180deg,#121936_0%,#171d40_55%,#1d1736_100%)] p-5 text-white lg:border-b-0 lg:border-r lg:border-r-white/10 lg:p-7">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_22%,transparent_78%,rgba(255,111,171,0.08))]" />

            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-300/90">
                Chat list
              </p>
              <h1 className="mt-5 max-w-[9rem] text-[2.2rem] font-black leading-[1.04] text-white">
                Support Chats
              </h1>
            </div>

            <button
              type="button"
              onClick={handleStartNewChat}
              disabled={isCreatingChat}
              className="relative mt-8 inline-flex w-full items-center justify-between rounded-full border border-sky-300/35 bg-[linear-gradient(180deg,rgba(60,91,170,0.55),rgba(29,38,77,0.88))] px-5 py-4 text-left text-lg font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_0_1px_rgba(56,189,248,0.18),0_12px_30px_rgba(37,99,235,0.18)] transition hover:scale-[1.01] disabled:opacity-60"
            >
              {isCreatingChat ? (
                <span className="mx-auto">
                  <AuthButtonLoader color="#ffffff" size={18} />
                </span>
              ) : (
                <>
                  <span className="inline-flex items-center gap-3">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[10px] text-emerald-950">
                      <span className="h-2 w-2 rounded-full bg-emerald-950/70" />
                    </span>
                    New Chat
                  </span>
                  <Plus size={22} />
                </>
              )}
            </button>

            <div className="relative mt-10 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-slate-300">Recent chats</p>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400/80">
                  {conversations.length}
                </span>
              </div>

              <div className="mt-4 space-y-4">
                {isListLoading ? (
                  <div className="rounded-[28px] border border-white/10 bg-white/8 px-4 py-5 text-sm text-slate-200 backdrop-blur-xl">
                    Loading conversations...
                  </div>
                ) : conversations.length ? (
                  conversations.map((item) => (
                    <div
                      key={item._id}
                      className={`rounded-[26px] border px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition ${
                        selectedId === item._id
                          ? "border-sky-300/45 bg-[linear-gradient(180deg,rgba(145,109,255,0.22),rgba(255,255,255,0.08))] shadow-[0_14px_30px_rgba(71,85,180,0.28)]"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedId(item._id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-[1.05rem] font-bold text-white">
                            {item.lastMessage || "Support conversation"}
                          </p>
                          <p className="mt-2 text-sm text-slate-300">
                            {formatTime(item.lastMessageAt)}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteConversation(item._id)}
                          disabled={deletingConversationId === item._id}
                          className="flex h-11 w-11 items-center justify-center rounded-full border border-rose-300/25 bg-rose-400/10 text-rose-100 transition hover:bg-rose-400/20 disabled:opacity-60"
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
                          <span className="rounded-full bg-rose-500/90 px-2.5 py-1 text-[11px] font-bold text-white">
                            {item.unreadForUser} unread
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-[28px] border border-dashed border-white/15 bg-white/5 px-4 py-6 text-sm leading-6 text-slate-300">
                    No support conversations yet. Send your first message to create one.
                  </div>
                )}
              </div>
            </div>

            <div className="relative mt-6 flex items-center justify-between rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,111,171,0.08))] px-4 py-4 text-sm backdrop-blur-xl">
              <div className="flex items-center gap-3 text-slate-200">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
                  <MessageSquareText size={15} />
                </span>
                <div>
                  <p className="font-semibold">
                    {supportOnline ? "Online Support" : "Offline Support"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {supportOnline ? "Ready to reply" : "Replies may take longer"}
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-slate-400">
                {conversations.length} chats
              </span>
            </div>
          </aside>

          <div className={`relative flex min-h-[48rem] flex-col ${contentPanelClass}`}>
            <div className={`border-b px-5 py-6 md:px-8 ${borderSoftClass}`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-rose-500">
                    {user?.name
                      ? `${user.name.toUpperCase()}'S SUPPORT CHAT`
                      : "SUPPORT CHAT"}
                  </p>
                  <h2 className={`mt-3 text-3xl font-black tracking-[-0.03em] md:text-[2.6rem] ${headingClass}`}>
                    {selectedId
                      ? "Your full chat history"
                      : "Start a support conversation"}
                  </h2>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-semibold ${mutedClass}`}>
                    {conversations.length} chat{conversations.length === 1 ? "" : "s"}
                  </p>
                  {selectedConversation?.lastMessageAt ? (
                    <p className={`mt-1 text-sm ${mutedClass}`}>
                      Active: {formatTime(selectedConversation.lastMessageAt)}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className={`mt-5 inline-flex items-center gap-3 rounded-[22px] border px-4 py-3 ${supportProfileClass}`}>
                <div className={`flex h-12 w-12 items-center justify-center rounded-full text-base font-black ${supportAvatarClass}`}>
                  ST
                </div>
                <div>
                  <p className={`text-lg font-bold ${headingClass}`}>
                    Support Team
                  </p>
                  <div className={`mt-1 flex items-center gap-2 text-sm ${mutedClass}`}>
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        supportOnline ? "bg-emerald-400" : "bg-slate-500"
                      }`}
                    />
                    {supportOnline ? "Online" : "Offline"}
                  </div>
                </div>
              </div>
            </div>

            <div
              ref={scrollRef}
              className="relative flex-1 space-y-5 overflow-y-auto px-4 py-6 md:px-8 md:py-7"
            >
              {selectedId ? (
                isDetailsLoading ? (
                  <div className={`flex h-full items-center justify-center ${mutedClass}`}>
                    Loading conversation...
                  </div>
                ) : messages.length ? (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message._id}
                        className={`max-w-[92%] rounded-[30px] px-6 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] md:max-w-[78%] ${
                          message.senderRole === "user"
                            ? "ml-auto bg-[linear-gradient(90deg,#ff8a00_0%,#ff4f68_72%,#ff477e_100%)] text-white"
                            : incomingBubbleClass
                        }`}
                      >
                        {message.text ? (
                          <p className="text-base font-semibold leading-7">
                            {message.text}
                          </p>
                        ) : null}
                        {message.attachments?.length ? (
                          <div className={message.text ? "mt-4" : ""}>
                            {message.attachments.map((attachment, index) => (
                              <a
                                key={`${message._id}-${attachment.url}-${index}`}
                                href={attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className={`block overflow-hidden rounded-[22px] border ${
                                  message.senderRole === "user"
                                    ? "border-white/20 bg-white/10"
                                    : "border-slate-200 bg-slate-100"
                                }`}
                              >
                                <img
                                  src={attachment.url}
                                  alt={attachment.fileName || "Support attachment"}
                                  className="max-h-80 w-full object-cover"
                                />
                              </a>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-4 flex items-center justify-between gap-3 text-xs">
                          <span
                            className={
                              message.senderRole === "user"
                                ? "text-white/80"
                                : mutedClass
                            }
                          >
                            {formatTime(message.createdAt)}
                          </span>
                          <span
                            className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${
                              message.senderRole === "user"
                                ? "bg-white/18 text-white"
                                : messageStatusClass[message.status] ||
                                  (isDark
                                    ? "bg-white/10 text-slate-200"
                                    : "bg-slate-100 text-slate-600")
                            }`}
                          >
                            {message.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {vendorTyping ? (
                      <div className={`max-w-[13rem] rounded-[24px] px-5 py-4 backdrop-blur-xl ${incomingBubbleClass}`}>
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
                    <div className={`max-w-md rounded-[30px] px-7 py-10 text-center ${emptyCardClass}`}>
                      <p className={`text-xl font-black ${headingClass}`}>
                        No messages in this conversation
                      </p>
                      <p className={`mt-3 text-sm leading-7 ${mutedClass}`}>
                        This chat is ready. Send your first message below.
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className={`max-w-md rounded-[30px] px-7 py-10 text-center ${emptyCardClass}`}>
                    <MessageSquareText className="mx-auto text-slate-400" size={28} />
                    <p className={`mt-4 text-xl font-black ${headingClass}`}>
                      Start your first support chat
                    </p>
                    <p className={`mt-3 text-sm leading-7 ${mutedClass}`}>
                      Send a message below and your support conversation will be created automatically.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className={`border-t px-4 py-4 backdrop-blur-xl md:px-6 md:py-5 ${borderSoftClass} ${composerWrapClass}`}>
              <div className={`rounded-[34px] border p-3 ${composerShellClass}`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                  <div className={`flex-1 rounded-[28px] border px-5 py-4 ${inputCardClass}`}>
                    <textarea
                      value={draft}
                      onChange={(event) => handleDraftChange(event.target.value)}
                      onBlur={() => emitTyping(false)}
                      placeholder="Describe your issue, ask for product help, or share order concerns..."
                      className={textareaClass}
                    />
                    {attachmentPreview ? (
                      <div className="relative mt-4 inline-flex overflow-hidden rounded-[20px] border border-slate-200 bg-slate-100 shadow-sm">
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
                    <div className="mt-4 flex flex-wrap items-center gap-3">
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
                        className={attachmentButtonClass}
                      >
                        <ImagePlus size={17} />
                        Add image
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSending || isCreatingChat}
                    className="flex h-[3.9rem] w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#2d3f93,#4338ca_52%,#7c3aed)] px-6 text-lg font-bold text-white shadow-[0_16px_32px_rgba(76,29,149,0.25)] transition hover:scale-[1.01] disabled:scale-100 disabled:opacity-60 md:w-[10rem]"
                  >
                    {isSending || isCreatingChat ? (
                      <AuthButtonLoader color="#ffffff" size={18} />
                    ) : (
                      <>
                        <Send size={18} />
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
