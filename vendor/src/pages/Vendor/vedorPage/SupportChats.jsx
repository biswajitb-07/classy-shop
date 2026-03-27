import { useEffect, useMemo, useRef, useState } from "react";
import {
  Headset,
  ImagePlus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { connectVendorSocket, getVendorSocket } from "../../../lib/socket";
import {
  useDeleteSupportConversationMutation,
  useGetSupportConversationDetailsQuery,
  useGetSupportConversationsQuery,
  useSendSupportReplyMutation,
} from "../../../features/api/supportApi";
import AuthButtonLoader from "../../../component/Loader/AuthButtonLoader";

const formatTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "No activity yet";

const SupportChats = () => {
  const [selectedId, setSelectedId] = useState(null);
  const [reply, setReply] = useState("");
  const [userTyping, setUserTyping] = useState(false);
  const [onlineMap, setOnlineMap] = useState({});
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState("");
  const [joinedChatId, setJoinedChatId] = useState(null);
  const scrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const selectedIdRef = useRef(null);

  const { data: listData, isLoading, refetch: refetchList } =
    useGetSupportConversationsQuery();
  const conversations = listData?.conversations || [];

  useEffect(() => {
    if (!conversations.length) {
      if (selectedId !== null) {
        setSelectedId(null);
      }
      return;
    }

    // Keep a usable selection after refetches: prefer the current chat if it
    // still exists, otherwise fall back to the first available conversation.
    const hasSelectedConversation = conversations.some(
      (item) => item._id === selectedId,
    );

    if (!selectedId || !hasSelectedConversation) {
      setSelectedId(conversations[0]._id);
    }
  }, [conversations, selectedId]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const { data: detailsData, refetch: refetchDetails } =
    useGetSupportConversationDetailsQuery(selectedId, {
      skip: !selectedId,
    });
  const [sendSupportReply, { isLoading: isSending }] =
    useSendSupportReplyMutation();
  const [deleteSupportConversation, { isLoading: isDeleting }] =
    useDeleteSupportConversationMutation();

  const messages = useMemo(() => detailsData?.messages || [], [detailsData?.messages]);
  const conversation = detailsData?.conversation;

  useEffect(() => {
    const socket = getVendorSocket();
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
        // Rejoin the active room on reconnect so presence and typing indicators
        // start working again after refresh or temporary network loss.
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

    const handleTyping = (payload) => {
      if (
        payload?.senderRole === "user" &&
        String(payload?.chatId) === String(selectedIdRef.current) &&
        String(payload?.senderId) ===
          String(
            detailsData?.conversation?.user?._id ||
              detailsData?.conversation?.user ||
              "",
          )
      ) {
        // Typing dots are intentionally limited to the selected conversation;
        // messages from other users should not light up this open chat.
        setUserTyping(true);
      }
    };

    const handleStopTyping = (payload) => {
      if (
        payload?.senderRole === "user" &&
        String(payload?.chatId) === String(selectedIdRef.current)
      ) {
        setUserTyping(false);
      }
    };

    const handlePresence = (payload) => {
      setOnlineMap((current) => ({
        ...current,
        [payload.userId]: payload.online,
      }));
    };

    const handlePresenceSnapshot = (payload) => {
      const onlineUsers = Object.fromEntries(
        (payload?.users || []).map((userId) => [userId, true]),
      );
      setOnlineMap(onlineUsers);
    };

    socket.on("connect", handleConnect);
    socket.on("support:message", (payload) => {
      syncChatList();
      syncSelectedConversation(payload?.conversationId);
    });
    socket.on("support:conversation:update", (payload) => {
      syncChatList();
      syncSelectedConversation(payload?.conversationId);
    });
    socket.on("typing", handleTyping);
    socket.on("stop_typing", handleStopTyping);
    socket.on("user_online", handlePresence);
    socket.on("user_offline", handlePresence);
    socket.on("user_presence_snapshot", handlePresenceSnapshot);
    connectVendorSocket();
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
      socket.off("typing", handleTyping);
      socket.off("stop_typing", handleStopTyping);
      socket.off("user_online", handlePresence);
      socket.off("user_offline", handlePresence);
      socket.off("user_presence_snapshot", handlePresenceSnapshot);
    };
  }, [detailsData?.conversation?.user, refetchList, refetchDetails]);

  useEffect(() => {
    const socket = connectVendorSocket();

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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, userTyping]);

  useEffect(() => {
    setUserTyping(false);
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
    if (
      !selectedId ||
      !conversation?.user?._id ||
      String(joinedChatId) !== String(selectedId)
    ) {
      return;
    }
    // The backend only forwards typing to the joined chat room, which prevents
    // a vendor typing in one thread from leaking indicators into others.
    const socket = connectVendorSocket();
    socket.emit(isTyping ? "typing" : "stop_typing", {
      chatId: selectedId,
      senderId: conversation.assignedVendor?._id,
      senderRole: "vendor",
    });
  };

  const handleReplyChange = (value) => {
    setReply(value);
    emitTyping(Boolean(value.trim()));

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(false);
    }, 1200);
  };

  const handleReply = async () => {
    if (!selectedId) return;
    if (!reply.trim() && !attachmentFile) {
      toast.error("Write a reply or choose an image");
      return;
    }

    const formData = new FormData();
    if (reply.trim()) {
      formData.append("text", reply.trim());
    }
    if (attachmentFile) {
      formData.append("attachments", attachmentFile);
    }

    try {
      await sendSupportReply({ conversationId: selectedId, formData }).unwrap();
      setReply("");
      setAttachmentFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      emitTyping(false);
      refetchList();
      refetchDetails();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to send reply");
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedId) return;

    try {
      await deleteSupportConversation(selectedId).unwrap();
      toast.success("Conversation deleted");
      setSelectedId(null);
      setReply("");
      setUserTyping(false);
      setAttachmentFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      refetchList();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete support conversation");
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

  const selectedUserId = conversation?.user?._id;
  const isSelectedUserOnline = selectedUserId
    ? onlineMap[selectedUserId] ?? conversation?.userOnline ?? false
    : false;

  return (
    <section className="px-4 py-8 md:px-6">
      <div className="relative overflow-hidden rounded-[34px] border border-violet-400/25 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.18),transparent_18%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.18),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(244,114,182,0.12),transparent_24%),linear-gradient(180deg,#090b1e_0%,#0f1130_45%,#121538_100%)] p-4 shadow-[0_28px_90px_rgba(2,6,23,0.58)] md:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_22%,transparent_76%,rgba(56,189,248,0.04))]" />

        <div className="relative mb-5 flex flex-col gap-3 rounded-[28px] border border-violet-400/20 bg-[linear-gradient(135deg,rgba(35,41,91,0.92),rgba(25,22,60,0.9)_55%,rgba(41,18,63,0.88))] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_40px_rgba(0,0,0,0.22)] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-300">
              Support center
            </p>
            <h1 className="mt-3 text-3xl font-black text-white md:text-[2.55rem]">
              Realtime customer conversations
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold text-slate-100">
            <Sparkles size={16} />
            {conversations.length} active conversations
          </div>
        </div>

        <div className="relative grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[28px] border border-violet-400/25 bg-[linear-gradient(180deg,rgba(16,18,48,0.96),rgba(19,16,54,0.92))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="mb-4 flex items-center gap-3">
              <Headset className="text-sky-300" size={18} />
              <div>
                <p className="text-sm font-bold text-white">User conversations</p>
                <p className="text-xs text-slate-400">
                  Open any chat to review full history
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {isLoading ? (
                <div className="rounded-2xl border border-violet-400/20 bg-slate-950/70 px-4 py-6 text-center text-slate-400">
                  Loading support chats...
                </div>
              ) : conversations.length ? (
                conversations.map((item) => {
                  const userId = item.user?._id;
                  const isOnline = userId
                    ? onlineMap[userId] ?? item.userOnline ?? false
                    : false;

                  return (
                    <button
                      key={item._id}
                      type="button"
                      onClick={() => setSelectedId(item._id)}
                      className={`w-full rounded-[24px] border px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition ${
                        selectedId === item._id
                          ? "border-sky-400 bg-[linear-gradient(135deg,rgba(17,34,90,0.96),rgba(26,42,96,0.92)_48%,rgba(76,29,149,0.42))] shadow-[0_0_0_1px_rgba(56,189,248,0.18),0_0_24px_rgba(56,189,248,0.38)]"
                          : "border-violet-400/18 bg-[linear-gradient(180deg,rgba(16,18,44,0.86),rgba(17,15,47,0.84))] hover:border-violet-300/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-base font-bold text-white">
                              {item.user?.name}
                            </p>
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                isOnline ? "bg-emerald-400" : "bg-slate-500"
                              }`}
                            />
                          </div>
                          <p className="truncate text-xs text-slate-400">
                            {isOnline ? "Online" : "Offline"}
                          </p>
                        </div>
                        {item.unreadForVendor ? (
                          <span className="rounded-full bg-rose-500 px-2.5 py-1 text-xs font-bold text-white">
                            {item.unreadForVendor}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm text-slate-200">
                        {item.lastMessage || "No messages yet"}
                      </p>
                      <p className="mt-3 text-xs text-slate-400">
                        {formatTime(item.lastMessageAt)}
                      </p>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-violet-400/20 px-4 py-8 text-center text-slate-400">
                  No support conversations yet.
                </div>
              )}
            </div>

            <div className="mt-14 flex items-center justify-between rounded-[22px] border border-violet-400/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(236,72,153,0.08))] px-4 py-3 text-sm">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                Online Support
              </div>
              <span className="text-slate-400">{conversations.length} chats</span>
            </div>
          </div>

          <div className="flex min-h-[42rem] flex-col rounded-[28px] border border-violet-400/25 bg-[linear-gradient(180deg,rgba(16,18,48,0.96),rgba(19,16,54,0.92))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="border-b border-violet-400/16 px-5 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-rose-300">
                    Selected chat
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    {conversation?.user?.name || "Choose a conversation"}
                  </h2>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        isSelectedUserOnline ? "bg-emerald-400" : "bg-slate-500"
                      }`}
                    />
                    {isSelectedUserOnline ? "Online" : "Offline"}
                  </div>
                </div>
                {selectedId ? (
                  <button
                    type="button"
                    onClick={handleDeleteConversation}
                    disabled={isDeleting}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-60"
                  >
                    {isDeleting ? (
                      <AuthButtonLoader color="#ffffff" size={16} />
                    ) : (
                      <>
                        <Trash2 size={16} />
                        Delete chat
                      </>
                    )}
                  </button>
                ) : null}
              </div>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 space-y-4 overflow-y-auto px-4 py-5 md:px-5"
            >
              {selectedId && messages.length ? (
                <>
                  {messages.map((message) => (
                    <div
                      key={message._id}
                      className={`max-w-[88%] rounded-[24px] px-5 py-4 shadow-[0_14px_34px_rgba(2,6,23,0.24)] ${
                        message.senderRole === "vendor"
                          ? "ml-auto bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_58%,#7c3aed_100%)] text-white"
                          : "border border-violet-400/14 bg-[linear-gradient(180deg,rgba(25,29,66,0.96),rgba(22,25,58,0.92))] text-slate-100"
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
                                className={`block overflow-hidden rounded-[18px] border ${
                                  message.senderRole === "vendor"
                                    ? "border-white/20 bg-white/10"
                                    : "border-violet-400/16 bg-slate-950/50"
                                }`}
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
                      <p
                        className={`mt-3 text-xs ${
                          message.senderRole === "vendor"
                            ? "text-white/80"
                            : "text-slate-400"
                        }`}
                      >
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  ))}
                  {userTyping ? (
                    <div className="max-w-[12rem] rounded-[24px] border border-violet-400/18 bg-[linear-gradient(180deg,rgba(25,29,66,0.96),rgba(22,25,58,0.92))] px-4 py-4 shadow-sm">
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
                    <div className="rounded-[28px] border border-dashed border-violet-400/20 bg-slate-950/60 px-6 py-10 text-center text-slate-400">
                      {selectedId
                        ? "No messages yet in this conversation."
                        : "Choose a conversation to read and reply."}
                    </div>
                  </div>
                )}
              </div>

            <div className="border-t border-violet-400/16 bg-slate-950/35 px-4 py-4 md:px-5">
              <div className="rounded-[28px] border border-violet-400/18 bg-[linear-gradient(180deg,rgba(22,25,58,0.95),rgba(25,21,62,0.9))] p-3">
                <div className="mb-3 flex items-center gap-3 rounded-[22px] border border-violet-400/14 bg-white/4 px-3 py-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#38bdf8,#8b5cf6)] text-base font-black text-white">
                    {conversation?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">
                      {conversation?.user?.name || "Customer"}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          isSelectedUserOnline ? "bg-emerald-400" : "bg-slate-500"
                        }`}
                      />
                      {isSelectedUserOnline ? "Online" : "Offline"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 md:flex-row">
                  <div className="flex-1">
                    <div className="rounded-[24px] border border-violet-400/18 bg-slate-950/35 px-4 py-4 focus-within:border-sky-400">
                      <textarea
                        value={reply}
                        onChange={(event) => handleReplyChange(event.target.value)}
                        onBlur={() => emitTyping(false)}
                        placeholder="Write a professional reply for the customer..."
                        className="min-h-[6rem] w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                      />
                      {attachmentPreview ? (
                        <div className="relative mt-3 inline-flex overflow-hidden rounded-[18px] border border-violet-400/18 bg-slate-950">
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
                      <div className="mt-3 flex items-center gap-3">
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
                          className="inline-flex items-center gap-2 rounded-full border border-violet-400/24 bg-white/6 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                        >
                          <ImagePlus size={16} />
                          Add image
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleReply}
                    disabled={!selectedId || isSending}
                    className="flex w-full items-center justify-center gap-2 rounded-[22px] bg-[linear-gradient(135deg,#2563eb,#3b82f6_55%,#7c3aed)] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(59,130,246,0.28)] transition hover:brightness-110 disabled:bg-slate-600 disabled:shadow-none md:w-[12rem]"
                  >
                    {isSending ? (
                      <AuthButtonLoader color="#ffffff" size={18} />
                    ) : (
                      <>
                        <Send size={16} />
                        Reply
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

export default SupportChats;
