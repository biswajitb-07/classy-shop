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
      <div className="rounded-[32px] border border-slate-700/70 bg-[linear-gradient(180deg,#0b1120_0%,#101826_100%)] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.32)] md:p-5">
        <div className="mb-5 flex flex-col gap-3 rounded-[28px] border border-slate-700/70 bg-[linear-gradient(135deg,#172554_0%,#0f172a_45%,#111827_100%)] px-5 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">
              Support center
            </p>
            <h1 className="mt-2 text-3xl font-black text-white">
              Realtime customer conversations
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100">
            <Sparkles size={16} />
            {conversations.length} active conversations
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[28px] border border-slate-700/70 bg-slate-950/60 p-4">
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
                <div className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-6 text-center text-slate-400">
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
                      className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                        selectedId === item._id
                          ? "border-sky-400 bg-sky-500/10"
                          : "border-slate-700 bg-slate-900/70 hover:border-slate-500"
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
                      <p className="mt-3 line-clamp-2 text-sm text-slate-300">
                        {item.lastMessage || "No messages yet"}
                      </p>
                      <p className="mt-3 text-xs text-slate-500">
                        {formatTime(item.lastMessageAt)}
                      </p>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-8 text-center text-slate-400">
                  No support conversations yet.
                </div>
              )}
            </div>
          </div>

          <div className="flex min-h-[42rem] flex-col rounded-[28px] border border-slate-700/70 bg-slate-950/60">
            <div className="border-b border-slate-700 px-5 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-300">
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
                    className="inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-60"
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
                      className={`max-w-[88%] rounded-[24px] px-4 py-4 ${
                        message.senderRole === "vendor"
                          ? "ml-auto bg-gradient-to-r from-sky-500 to-cyan-500 text-white"
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
                              className={`block overflow-hidden rounded-[18px] border ${
                                message.senderRole === "vendor"
                                  ? "border-white/20 bg-white/10"
                                  : "border-slate-200 bg-slate-50"
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
                            : "text-slate-500"
                        }`}
                      >
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  ))}
                  {userTyping ? (
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
                  <div className="rounded-[28px] border border-dashed border-slate-700 bg-slate-900/70 px-6 py-10 text-center text-slate-400">
                    Choose a conversation to read and reply.
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-700 bg-slate-950/50 px-4 py-4 md:px-5">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="flex-1">
                  <div className="rounded-[24px] border border-slate-700 bg-slate-900 px-4 py-4 focus-within:border-sky-400">
                    <textarea
                      value={reply}
                      onChange={(event) => handleReplyChange(event.target.value)}
                      onBlur={() => emitTyping(false)}
                      placeholder="Write a professional reply for the customer..."
                      className="min-h-[6rem] w-full resize-none bg-transparent text-sm text-white outline-none"
                    />
                    {attachmentPreview ? (
                      <div className="mt-3 inline-flex relative overflow-hidden rounded-[18px] border border-slate-700 bg-slate-950">
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
                        className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
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
                    onClick={handleReply}
                    disabled={!selectedId || isSending}
                    className="flex w-full items-center justify-center gap-2 rounded-[22px] bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:bg-slate-600"
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
