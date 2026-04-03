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
import {
  useDeleteSupportConversationMutation,
  useGetSupportConversationDetailsQuery,
  useGetSupportConversationsQuery,
  useSendSupportReplyMutation,
} from "../../../features/api/supportApi";
import { useTheme } from "../../../context/ThemeContext";
import { connectVendorSocket } from "../../../lib/socket";
import AuthButtonLoader from "../../../component/Loader/AuthButtonLoader.jsx";
import {
  playChatReceiveSound,
  playChatSendSound,
  primeUiFeedbackSounds,
  waitForNextPaint,
} from "../../../utils/uiFeedbackSounds";

const formatTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "No activity yet";

const normalizeMessages = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item?._id || `${item?.senderRole}-${item?.createdAt}-${item?.text || ""}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const SupportChats = () => {
  const { isDark } = useTheme();
  const [selectedId, setSelectedId] = useState(null);
  const [reply, setReply] = useState("");
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState("");
  const [supportOnline, setSupportOnline] = useState(false);
  const [liveMessages, setLiveMessages] = useState([]);
  const [deletingConversationId, setDeletingConversationId] = useState(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const selectedIdRef = useRef(null);

  const {
    data: listData,
    isLoading: isListLoading,
    refetch: refetchList,
  } = useGetSupportConversationsQuery();
  const conversations = listData?.conversations || [];

  useEffect(() => {
    if (!conversations.length) {
      setSelectedId(null);
      return;
    }

    const exists = conversations.some((item) => String(item._id) === String(selectedId));
    if (!selectedId || !exists) {
      setSelectedId(conversations[0]._id);
    }
  }, [conversations, selectedId]);

  const {
    data: detailsData,
    isLoading: isDetailsLoading,
    refetch: refetchDetails,
  } = useGetSupportConversationDetailsQuery(selectedId, {
    skip: !selectedId,
  });

  const [sendSupportReply, { isLoading: isSending }] = useSendSupportReplyMutation();
  const [deleteSupportConversation] = useDeleteSupportConversationMutation();

  const messages = useMemo(() => detailsData?.messages || [], [detailsData?.messages]);
  const selectedConversation = detailsData?.conversation || null;

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    setLiveMessages(normalizeMessages(messages));
  }, [messages, selectedId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [liveMessages]);

  useEffect(() => {
    primeUiFeedbackSounds();
  }, []);

  useEffect(() => {
    if (!attachmentFile) {
      setAttachmentPreview("");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(attachmentFile);
    setAttachmentPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [attachmentFile]);

  useEffect(() => {
    const socket = connectVendorSocket();

    const handleConnect = () => {
      socket.emit("sync_presence");
      if (selectedIdRef.current) {
        socket.emit("join_support_chat", { chatId: selectedIdRef.current });
      }
    };

    const handlePresence = (payload) => {
      setSupportOnline(Boolean(payload?.online));
    };

    const handleVendorSupportMessage = async (payload) => {
      if (!payload?.conversationId) return;

      if (
        String(payload.conversationId) === String(selectedIdRef.current) &&
        payload?.message
      ) {
        setLiveMessages((current) => {
          const filtered = current.filter(
            (item) =>
              item._id !== `temp-vendor-${payload.conversationId}` &&
              String(item._id) !== String(payload.message._id)
          );
          return normalizeMessages([...filtered, payload.message]);
        });
      }

      await refetchList();
      if (String(payload.conversationId) === String(selectedIdRef.current)) {
        await refetchDetails();
      }

      if (
        payload?.message?.senderRole === "admin" &&
        String(payload.conversationId) === String(selectedIdRef.current)
      ) {
        await waitForNextPaint();
        playChatReceiveSound();
      }
    };

    const handleConversationUpdate = async (payload) => {
      if (!payload?.conversationId) return;
      await refetchList();
      if (String(payload.conversationId) === String(selectedIdRef.current)) {
        await refetchDetails();
      }
    };

    socket.on("connect", handleConnect);
    socket.on("admin-support:presence", handlePresence);
    socket.on("vendor-support:message", handleVendorSupportMessage);
    socket.on("vendor-support:conversation:update", handleConversationUpdate);

    if (socket.connected) handleConnect();
    else socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("admin-support:presence", handlePresence);
      socket.off("vendor-support:message", handleVendorSupportMessage);
      socket.off("vendor-support:conversation:update", handleConversationUpdate);
    };
  }, [refetchDetails, refetchList]);

  useEffect(() => {
    const socket = connectVendorSocket();

    if (!selectedId) {
      socket.emit("leave_support_chat");
      return undefined;
    }

    socket.emit("join_support_chat", { chatId: selectedId });

    return () => {
      socket.emit("leave_support_chat", { chatId: selectedId });
    };
  }, [selectedId]);

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

  const handleReply = async () => {
    if (!selectedId) return;
    if (!reply.trim() && !attachmentFile) {
      toast.error("Write a message or choose an image");
      return;
    }

    const formData = new FormData();
    if (reply.trim()) formData.append("text", reply.trim());
    if (attachmentFile) formData.append("attachments", attachmentFile);

    try {
      const now = new Date().toISOString();
      const tempId = `temp-vendor-${selectedId}`;

      setLiveMessages((current) =>
        normalizeMessages([
          ...current,
          {
            _id: tempId,
            senderRole: "vendor",
            text: reply.trim(),
            attachments: attachmentPreview
              ? [{ url: attachmentPreview, fileName: attachmentFile?.name || "attachment" }]
              : [],
            createdAt: now,
            status: "sending",
          },
        ])
      );

      playChatSendSound();

      const response = await sendSupportReply({ conversationId: selectedId, formData }).unwrap();
      if (response?.message) {
        setLiveMessages((current) =>
          normalizeMessages(
            current.map((item) =>
              item._id === tempId ? { ...response.message, status: "delivered" } : item
            )
          )
        );
      }

      setReply("");
      setAttachmentFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await refetchList();
      await refetchDetails();
    } catch (error) {
      setLiveMessages((current) =>
        current.filter((item) => item._id !== `temp-vendor-${selectedId}`)
      );
      toast.error(error?.data?.message || "Failed to send message");
    }
  };

  const handleDeleteConversation = async (conversationId = selectedId) => {
    if (!conversationId) return;

    try {
      setDeletingConversationId(conversationId);
      await deleteSupportConversation(conversationId).unwrap();
      setSelectedId(null);
      setReply("");
      setAttachmentFile(null);
      setLiveMessages([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await refetchList();
      toast.success("Conversation deleted");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete conversation");
    } finally {
      setDeletingConversationId(null);
    }
  };

  const shellClass = isDark
    ? "border-violet-400/25 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_20%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.18),transparent_24%),linear-gradient(180deg,#090d1f_0%,#101530_52%,#111938_100%)]"
    : "border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent_18%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.1),transparent_22%),linear-gradient(180deg,#f8fbff_0%,#eef2ff_50%,#fdf2f8_100%)]";
  const contentPanelClass = isDark
    ? "border-white/10 bg-[linear-gradient(180deg,rgba(12,18,38,0.96),rgba(15,23,42,0.94))]"
    : "border-slate-200 bg-white/92";
  const sidebarClass = isDark
    ? "border-white/10 bg-[linear-gradient(180deg,#1f2d59_0%,#1a2148_55%,#1d214b_100%)] text-white"
    : "border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#e9efff_100%)] text-slate-900";
  const borderSoftClass = isDark ? "border-white/10" : "border-slate-200";
  const headingClass = isDark ? "text-white" : "text-slate-900";
  const mutedClass = isDark ? "text-slate-400" : "text-slate-500";
  const supportProfileClass = isDark
    ? "border-white/10 bg-white/5 text-white"
    : "border-slate-200 bg-white text-slate-900";
  const supportAvatarClass = isDark
    ? "bg-[linear-gradient(135deg,#4f46e5,#7c3aed)] text-white"
    : "bg-[linear-gradient(135deg,#4f46e5,#6366f1)] text-white";
  const incomingBubbleClass = isDark
    ? "border border-white/10 bg-white/[0.05] text-slate-100"
    : "border border-slate-200 bg-white text-slate-800";
  const emptyCardClass = isDark
    ? "border border-white/10 bg-white/[0.04] text-slate-300"
    : "border border-slate-200 bg-white text-slate-600";
  const composerWrapClass = isDark
    ? "bg-[linear-gradient(180deg,rgba(7,11,26,0.85),rgba(17,24,39,0.95))]"
    : "bg-[linear-gradient(180deg,rgba(255,255,255,0.75),rgba(248,250,252,0.96))]";
  const composerShellClass = isDark
    ? "border-white/10 bg-white/[0.04]"
    : "border-slate-200 bg-white";
  const inputCardClass = isDark
    ? "border-white/10 bg-[#0d1330]"
    : "border-slate-200 bg-slate-50";
  const textareaClass = `min-h-[7rem] w-full resize-none bg-transparent text-sm outline-none ${
    isDark ? "text-white placeholder:text-slate-500" : "text-slate-800 placeholder:text-slate-400"
  }`;
  const attachmentButtonClass = isDark
    ? "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
    : "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200";

  return (
    <section className="pb-8">
      <div className={`rounded-[34px] border p-4 shadow-[0_28px_90px_rgba(2,6,23,0.18)] md:p-5 ${shellClass}`}>
        <div className="grid gap-4 lg:grid-cols-[25rem_minmax(0,1fr)]">
          <aside className={`relative flex min-h-[42rem] flex-col overflow-hidden rounded-[30px] border p-6 ${sidebarClass}`}>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-slate-300">
                Chat List
              </p>
              <h2 className="mt-4 text-[2.25rem] font-black leading-[0.95]">Support Chats</h2>
            </div>

            <button
              type="button"
              onClick={() => {
                if (conversations[0]?._id) {
                  setSelectedId(conversations[0]._id);
                }
              }}
              className="mt-10 flex h-[5rem] items-center justify-between rounded-full border border-sky-300/25 bg-[linear-gradient(180deg,rgba(65,102,190,0.45),rgba(57,72,144,0.45))] px-8 text-xl font-bold text-white shadow-[0_22px_50px_rgba(37,99,235,0.18)]"
            >
              <span className="inline-flex items-center gap-3">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[10px] text-emerald-950">
                  <span className="h-2 w-2 rounded-full bg-emerald-950/70" />
                </span>
                New Chat
              </span>
              <Plus size={22} />
            </button>

            <div className="relative mt-10 flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-slate-300">Recent chats</p>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400/80">
                  {conversations.length}
                </span>
              </div>

              <div className="themed-scrollbar mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
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
                            {item.lastMessage || "Admin support conversation"}
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
                      {item.unreadForVendor ? (
                        <div className="mt-3">
                          <span className="rounded-full bg-rose-500/90 px-2.5 py-1 text-[11px] font-bold text-white">
                            {item.unreadForVendor} unread
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

            <div className="relative mt-4 flex shrink-0 items-center justify-between rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,111,171,0.08))] px-4 py-4 text-sm backdrop-blur-xl">
              <div className="flex items-center gap-3 text-slate-200">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
                  <MessageSquareText size={15} />
                </span>
                <div>
                  <p className="font-semibold">
                    {supportOnline ? "Online Support" : "Offline Support"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {supportOnline ? "Admin is active now" : "Replies may take longer"}
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-slate-400">
                {conversations.length} chats
              </span>
            </div>
          </aside>

          <div className={`relative flex min-h-[42rem] min-w-0 flex-col overflow-hidden rounded-[30px] border ${contentPanelClass}`}>
            <div className={`border-b px-5 py-4 md:px-8 ${borderSoftClass}`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-rose-500 md:text-xs">
                    VENDOR SUPPORT CHAT
                  </p>
                  <h2 className={`mt-2 text-[1.75rem] font-black tracking-[-0.03em] md:text-[2.05rem] ${headingClass}`}>
                    {selectedId ? "Your full chat history" : "Start a support conversation"}
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
              <div className={`mt-3 inline-flex items-center gap-3 rounded-[20px] border px-4 py-2.5 ${supportProfileClass}`}>
                <div className={`flex h-11 w-11 items-center justify-center rounded-full text-base font-black ${supportAvatarClass}`}>
                  ST
                </div>
                <div>
                  <p className={`text-base font-bold ${headingClass}`}>Support Team</p>
                  <div className={`mt-1 flex items-center gap-2 text-sm ${mutedClass}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${supportOnline ? "bg-emerald-400" : "bg-slate-500"}`} />
                    {supportOnline ? "Online" : "Offline"}
                  </div>
                </div>
              </div>
              {selectedId ? (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => handleDeleteConversation(selectedId)}
                    disabled={deletingConversationId === selectedId}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-rose-300/25 bg-rose-400/10 px-5 text-sm font-bold text-rose-100 transition hover:bg-rose-400/20 disabled:opacity-60"
                  >
                    {deletingConversationId === selectedId ? (
                      <AuthButtonLoader color="#ffffff" size={16} />
                    ) : (
                      <>
                        <Trash2 size={16} />
                        Delete Conversation
                      </>
                    )}
                  </button>
                </div>
              ) : null}
            </div>

            <div
              ref={scrollRef}
              className="themed-scrollbar relative min-h-[18rem] flex-1 space-y-5 overflow-y-auto px-4 py-5 md:min-h-[22rem] md:px-8 md:py-6 lg:max-h-[42rem]"
            >
              {selectedId ? (
                isDetailsLoading ? (
                  <div className={`flex h-full items-center justify-center ${mutedClass}`}>
                    Loading conversation...
                  </div>
                ) : liveMessages.length ? (
                  <>
                    {liveMessages.map((messageItem) => (
                      <div
                        key={messageItem._id}
                        className={`max-w-[92%] rounded-[30px] px-6 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] md:max-w-[78%] ${
                          messageItem.senderRole === "vendor"
                            ? "ml-auto bg-[linear-gradient(90deg,#3b82f6_0%,#4f46e5_72%,#7c3aed_100%)] text-white"
                            : incomingBubbleClass
                        }`}
                      >
                        {messageItem.text ? (
                          <p className="text-base font-semibold leading-7">
                            {messageItem.text}
                          </p>
                        ) : null}
                        {messageItem.attachments?.length ? (
                          <div className={messageItem.text ? "mt-4" : ""}>
                            {messageItem.attachments.map((attachment, index) => (
                              <a
                                key={`${messageItem._id}-${attachment.url}-${index}`}
                                href={attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className={`block overflow-hidden rounded-[22px] border ${
                                  messageItem.senderRole === "vendor"
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
                          <span className={messageItem.senderRole === "vendor" ? "text-white/80" : mutedClass}>
                            {formatTime(messageItem.createdAt)}
                          </span>
                          <span
                            className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${
                              messageItem.senderRole === "vendor"
                                ? "bg-white/18 text-white"
                                : isDark
                                  ? "bg-white/10 text-slate-200"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {messageItem.status === "sent" ? "read" : messageItem.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className={`max-w-md rounded-[30px] px-7 py-10 text-center ${emptyCardClass}`}>
                      <p className={`text-xl font-black ${headingClass}`}>No messages in this conversation</p>
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
                    <p className={`mt-4 text-xl font-black ${headingClass}`}>Start your first support chat</p>
                    <p className={`mt-3 text-sm leading-7 ${mutedClass}`}>
                      Send a message below and your support conversation will be created automatically.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className={`border-t px-4 py-3 backdrop-blur-xl md:px-6 md:py-4 ${borderSoftClass} ${composerWrapClass}`}>
              <div className={`rounded-[30px] border p-3 ${composerShellClass}`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                  <div className={`flex-1 rounded-[24px] border px-5 py-3 ${inputCardClass}`}>
                    <textarea
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          if (!isSending) handleReply();
                        }
                      }}
                      placeholder="Write your message for admin..."
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
                    onClick={handleReply}
                    disabled={isSending}
                    className="flex h-[3.5rem] w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#2d3f93,#4338ca_52%,#7c3aed)] px-6 text-base font-bold text-white shadow-[0_16px_32px_rgba(76,29,149,0.25)] transition hover:scale-[1.01] disabled:scale-100 disabled:opacity-60 md:w-[9.5rem]"
                  >
                    {isSending ? (
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

export default SupportChats;
