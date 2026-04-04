import React, { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Send, Trash2, X } from "lucide-react";
import {
  useDeleteUserSupportConversationMutation,
  useDeleteVendorSupportConversationMutation,
  useGetUserSupportConversationDetailsQuery,
  useGetUserSupportConversationsQuery,
  useGetVendorSupportConversationDetailsQuery,
  useGetVendorSupportConversationsQuery,
  useSendUserSupportReplyMutation,
  useSendVendorSupportReplyMutation,
} from "../../../features/api/supportApi";
import { connectVendorSocket } from "../../../lib/socket";
import {
  playChatReceiveSound,
  playChatSendSound,
  primeUiFeedbackSounds,
  waitForNextPaint,
} from "../../../utils/uiFeedbackSounds";

const ROLE_TABS = [
  { key: "user", label: "User Inbox" },
  { key: "vendor", label: "Vendor Inbox" },
];

const formatStamp = (value) => {
  if (!value) return "No activity yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No activity yet";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const normalizeMessages = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item?._id || `${item?.senderRole}-${item?.createdAt}-${item?.text || ""}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getContactName = (conversation, tab) =>
  tab === "user"
    ? conversation?.user?.name || conversation?.user?.fullname || conversation?.user?.email || "User"
    : conversation?.vendor?.name ||
      conversation?.vendor?.storeName ||
      conversation?.vendor?.email ||
      "Vendor";

const getContactEmail = (conversation, tab) =>
  tab === "user" ? conversation?.user?.email || "No email" : conversation?.vendor?.email || "No email";

const getContactId = (conversation, tab) =>
  tab === "user" ? String(conversation?.user?._id || "") : String(conversation?.vendor?._id || "");

const getLastMessage = (conversation) => {
  if (conversation?.lastMessage?.trim()) return conversation.lastMessage.trim();
  if (conversation?.lastMessageText?.trim()) return conversation.lastMessageText.trim();
  return "No conversation yet";
};

const getClassificationTone = (priority) => {
  if (priority === "high") {
    return "bg-rose-500/15 text-rose-200 border border-rose-500/20";
  }
  if (priority === "medium") {
    return "bg-amber-500/15 text-amber-100 border border-amber-500/20";
  }
  return "bg-cyan-500/15 text-cyan-100 border border-cyan-500/20";
};

const MessageBubble = ({ item, isAdmin }) => (
  <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
    <div
      className={`max-w-[85%] rounded-[28px] px-5 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.14)] ${
        isAdmin
          ? "bg-gradient-to-br from-cyan-500 via-sky-500 to-indigo-500 text-white"
          : "border border-slate-200 bg-white text-slate-900"
      }`}
    >
      {item?.text ? <p className="whitespace-pre-wrap text-sm leading-6">{item.text}</p> : null}
      {Array.isArray(item?.attachments)
        ? item.attachments.map((attachment, index) => (
            <img
              key={`${item._id || item.createdAt}-${attachment?.url || index}`}
              src={attachment?.url}
              alt={attachment?.fileName || "Support attachment"}
              className="mt-3 max-h-72 w-full rounded-2xl object-cover"
            />
          ))
        : null}
      <div className={`mt-3 flex items-center justify-between gap-3 text-[11px] font-medium ${isAdmin ? "text-cyan-50/90" : "text-slate-500"}`}>
        <span>{formatStamp(item?.createdAt)}</span>
        {item?.status ? (
          <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${isAdmin ? "bg-white/15 text-white/90" : "bg-slate-100 text-slate-500"}`}>
            {item.status === "sent" ? "read" : item.status}
          </span>
        ) : null}
      </div>
    </div>
  </div>
);

const SupportChats = () => {
  const [activeTab, setActiveTab] = useState("user");
  const [searchText, setSearchText] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState("");
  const [liveMessages, setLiveMessages] = useState([]);
  const [supportOnline, setSupportOnline] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [onlineVendors, setOnlineVendors] = useState([]);
  const selectedConversationIdRef = useRef("");
  const fileInputRef = useRef(null);

  const userConversationsQuery = useGetUserSupportConversationsQuery(undefined, {
    pollingInterval: 5000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    refetchOnMountOrArgChange: true,
  });

  const vendorConversationsQuery = useGetVendorSupportConversationsQuery(undefined, {
    pollingInterval: 5000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    refetchOnMountOrArgChange: true,
  });

  const conversations = useMemo(() => {
    const base =
      activeTab === "user"
        ? userConversationsQuery.data?.conversations || []
        : vendorConversationsQuery.data?.conversations || [];

    return base
      .filter((conversation) => {
        const lastMessage = getLastMessage(conversation);
        return (Boolean(conversation?.lastMessageAt) || Boolean(conversation?.lastMessage)) && lastMessage !== "No conversation yet";
      })
      .filter((conversation) => {
        if (!searchText.trim()) return true;
        const query = searchText.trim().toLowerCase();
        return (
          getContactName(conversation, activeTab).toLowerCase().includes(query) ||
          getContactEmail(conversation, activeTab).toLowerCase().includes(query) ||
          getLastMessage(conversation).toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const aTime = new Date(a?.lastMessageAt || a?.updatedAt || 0).getTime();
        const bTime = new Date(b?.lastMessageAt || b?.updatedAt || 0).getTime();
        return bTime - aTime;
      });
  }, [
    activeTab,
    searchText,
    userConversationsQuery.data?.conversations,
    vendorConversationsQuery.data?.conversations,
  ]);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    if (!conversations.length) {
      setSelectedConversationId("");
      return;
    }
    if (!selectedConversationId || !conversations.some((item) => item._id === selectedConversationId)) {
      setSelectedConversationId(conversations[0]._id);
    }
  }, [conversations, selectedConversationId]);

  const userDetailsQuery = useGetUserSupportConversationDetailsQuery(selectedConversationId, {
    skip: !selectedConversationId || activeTab !== "user",
    pollingInterval: 4000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const vendorDetailsQuery = useGetVendorSupportConversationDetailsQuery(selectedConversationId, {
    skip: !selectedConversationId || activeTab !== "vendor",
    pollingInterval: 4000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const [sendUserReply, sendUserReplyState] = useSendUserSupportReplyMutation();
  const [sendVendorReply, sendVendorReplyState] = useSendVendorSupportReplyMutation();
  const [deleteUserConversation] = useDeleteUserSupportConversationMutation();
  const [deleteVendorConversation] = useDeleteVendorSupportConversationMutation();

  const activeDetails =
    activeTab === "user" ? userDetailsQuery.data?.conversation : vendorDetailsQuery.data?.conversation;
  const messages =
    activeTab === "user"
      ? userDetailsQuery.data?.messages || []
      : vendorDetailsQuery.data?.messages || [];

  const loadingConversations =
    activeTab === "user" ? userConversationsQuery.isLoading : vendorConversationsQuery.isLoading;
  const loadingDetails = activeTab === "user" ? userDetailsQuery.isLoading : vendorDetailsQuery.isLoading;
  const sending = sendUserReplyState.isLoading || sendVendorReplyState.isLoading;

  useEffect(() => {
    setLiveMessages(normalizeMessages(messages));
  }, [messages, selectedConversationId, activeTab]);

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
    primeUiFeedbackSounds();
  }, []);

  useEffect(() => {
    const socket = connectVendorSocket();

    const syncActive = async (conversationId) => {
      if (!conversationId) return;
      if (activeTab === "user") {
        await userConversationsQuery.refetch();
        if (String(selectedConversationIdRef.current) === String(conversationId)) {
          await userDetailsQuery.refetch();
        }
      } else {
        await vendorConversationsQuery.refetch();
        if (String(selectedConversationIdRef.current) === String(conversationId)) {
          await vendorDetailsQuery.refetch();
        }
      }
    };

    const appendIncoming = (payload) => {
      if (String(payload?.conversationId) !== String(selectedConversationIdRef.current) || !payload?.message) {
        return;
      }
      setLiveMessages((current) => {
        const filtered = current.filter(
          (item) =>
            item._id !== `temp-admin-${payload.conversationId}` &&
            String(item._id) !== String(payload.message._id)
        );
        return normalizeMessages([...filtered, payload.message]);
      });
    };

    const handleUserSupportMessage = async (payload) => {
      if (activeTab !== "user") return;
      appendIncoming(payload);
      await syncActive(payload?.conversationId);
      if (payload?.message?.senderRole !== "admin" && String(payload?.conversationId) === String(selectedConversationIdRef.current)) {
        await waitForNextPaint();
        playChatReceiveSound();
      }
    };

    const handleVendorSupportMessage = async (payload) => {
      if (activeTab !== "vendor") return;
      appendIncoming(payload);
      await syncActive(payload?.conversationId);
      if (payload?.message?.senderRole !== "admin" && String(payload?.conversationId) === String(selectedConversationIdRef.current)) {
        await waitForNextPaint();
        playChatReceiveSound();
      }
    };

    const handlePresence = (payload) => {
      setSupportOnline(Boolean(payload?.online));
    };

    const handleUserPresenceSnapshot = (payload) => {
      setOnlineUsers((payload?.users || []).map(String));
    };

    const handleVendorPresenceSnapshot = (payload) => {
      setOnlineVendors((payload?.vendors || []).map(String));
    };

    const handleUserOnline = (payload) => {
      if (!payload?.userId) return;
      setOnlineUsers((current) =>
        payload.online
          ? Array.from(new Set([...current, String(payload.userId)]))
          : current.filter((id) => id !== String(payload.userId))
      );
    };

    const handleVendorOnline = (payload) => {
      if (!payload?.vendorId) return;
      setOnlineVendors((current) =>
        payload.online
          ? Array.from(new Set([...current, String(payload.vendorId)]))
          : current.filter((id) => id !== String(payload.vendorId))
      );
    };

    const handleConnect = () => {
      setSupportOnline(true);
      socket.emit("sync_presence");
      socket.emit("support_presence_active", { active: true });
      if (selectedConversationIdRef.current) {
        socket.emit("join_support_chat", { chatId: selectedConversationIdRef.current });
      }
    };

    const handleDisconnect = () => {
      setSupportOnline(false);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("support:message", handleUserSupportMessage);
    socket.on("support:conversation:update", syncActive);
    socket.on("vendor-support:message", handleVendorSupportMessage);
    socket.on("vendor-support:conversation:update", syncActive);
    socket.on("admin-support:presence", handlePresence);
    socket.on("user_presence_snapshot", handleUserPresenceSnapshot);
    socket.on("vendor_presence_snapshot", handleVendorPresenceSnapshot);
    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOnline);
    socket.on("vendor_online", handleVendorOnline);
    socket.on("vendor_offline", handleVendorOnline);

    if (socket.connected) handleConnect();
    else socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("support:message", handleUserSupportMessage);
      socket.off("support:conversation:update", syncActive);
      socket.off("vendor-support:message", handleVendorSupportMessage);
      socket.off("vendor-support:conversation:update", syncActive);
      socket.off("admin-support:presence", handlePresence);
      socket.off("user_presence_snapshot", handleUserPresenceSnapshot);
      socket.off("vendor_presence_snapshot", handleVendorPresenceSnapshot);
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOnline);
      socket.off("vendor_online", handleVendorOnline);
      socket.off("vendor_offline", handleVendorOnline);
    };
  }, [activeTab]);

  useEffect(() => {
    const socket = connectVendorSocket();

    const handleConnect = () => {
      setSupportOnline(true);
      socket.emit("support_presence_active", { active: true });
    };

    const handleDisconnect = () => {
      setSupportOnline(false);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    if (socket.connected) {
      handleConnect();
    } else {
      socket.connect();
    }

    return () => {
      socket.emit("support_presence_active", { active: false });
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

  useEffect(() => {
    const socket = connectVendorSocket();
    if (!selectedConversationId) {
      socket.emit("leave_support_chat");
      return undefined;
    }
    socket.emit("join_support_chat", { chatId: selectedConversationId });
    return () => {
      socket.emit("leave_support_chat", { chatId: selectedConversationId });
    };
  }, [selectedConversationId]);

  const handleSelectAttachment = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFeedback({ type: "error", text: "Only image files are allowed." });
      event.target.value = "";
      return;
    }
    setAttachmentFile(file);
  };

  const handleRemoveAttachment = () => {
    setAttachmentFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    const text = message.trim();
    if (!selectedConversationId || (!text && !attachmentFile)) return;

    try {
      const formData = new FormData();
      if (text) formData.append("text", text);
      if (attachmentFile) formData.append("attachments", attachmentFile);

      const now = new Date().toISOString();
      const tempId = `temp-admin-${selectedConversationId}`;
      setLiveMessages((current) =>
        normalizeMessages([
          ...current,
          {
            _id: tempId,
            senderRole: "admin",
            text,
            attachments: attachmentPreview
              ? [{ url: attachmentPreview, fileName: attachmentFile?.name || "attachment" }]
              : [],
            createdAt: now,
            status: "sending",
          },
        ])
      );
      playChatSendSound();

      let response;
      if (activeTab === "user") {
        response = await sendUserReply({ conversationId: selectedConversationId, formData }).unwrap();
      } else {
        response = await sendVendorReply({ conversationId: selectedConversationId, formData }).unwrap();
      }

      if (response?.message) {
        setLiveMessages((current) =>
          normalizeMessages(
            current.map((item) =>
              item._id === tempId ? { ...response.message, status: "delivered" } : item
            )
          )
        );
      }

      setMessage("");
      setAttachmentFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFeedback({ type: "success", text: "Reply send ho gaya." });
    } catch (error) {
      setLiveMessages((current) => current.filter((item) => item._id !== `temp-admin-${selectedConversationId}`));
      setFeedback({ type: "error", text: error?.data?.message || "Message send nahi ho paya." });
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedConversationId) return;
    try {
      if (activeTab === "user") {
        await deleteUserConversation(selectedConversationId).unwrap();
      } else {
        await deleteVendorConversation(selectedConversationId).unwrap();
      }
      setSelectedConversationId("");
      setLiveMessages([]);
      setFeedback({ type: "success", text: "Conversation delete ho gaya." });
    } catch (error) {
      setFeedback({ type: "error", text: error?.data?.message || "Conversation delete nahi ho paya." });
    }
  };

  const currentOnline =
    activeTab === "user"
      ? onlineUsers.includes(getContactId(activeDetails, activeTab))
      : onlineVendors.includes(getContactId(activeDetails, activeTab));

  return (
    <div className="min-h-screen bg-[#070b1a] px-4 py-5 text-white md:px-6 xl:px-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
        <div className="rounded-[34px] border border-cyan-500/15 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_30%),linear-gradient(135deg,_rgba(15,23,42,0.96),_rgba(10,15,33,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.45em] text-cyan-300/80">Admin Support Desk</p>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">Live support workspace</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                  Yahan user aur vendor dono ke support chats milenge, realtime online status ke saath.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">User Chats</p>
                <p className="mt-3 text-3xl font-black text-white">{userConversationsQuery.data?.conversations?.length || 0}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Vendor Chats</p>
                <p className="mt-3 text-3xl font-black text-white">{vendorConversationsQuery.data?.conversations?.length || 0}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin</p>
                <p className="mt-3 text-3xl font-black text-white">{supportOnline ? "Online" : "Offline"}</p>
              </div>
            </div>
          </div>
        </div>

        {feedback.text ? (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${feedback.type === "error" ? "border-rose-500/30 bg-rose-500/10 text-rose-100" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"}`}>
            {feedback.text}
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="rounded-[32px] border border-white/10 bg-slate-950/70 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
            <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1">
              {ROLE_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.key);
                    setSearchText("");
                    setSelectedConversationId("");
                  }}
                  className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    activeTab === tab.key ? "bg-cyan-500 text-slate-950" : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <input
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder={`Search ${activeTab} conversations`}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-400"
              />
            </div>

            <div className="mt-4 max-h-[72vh] space-y-3 overflow-y-auto pr-1">
              {loadingConversations ? (
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-300">Conversations load ho rahe hain...</div>
              ) : null}

              {!loadingConversations && !conversations.length ? (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-slate-400">
                  Is inbox me abhi koi active conversation nahi hai.
                </div>
              ) : null}

              {conversations.map((conversation) => (
                <button
                  key={conversation._id}
                  type="button"
                  onClick={() => setSelectedConversationId(conversation._id)}
                  className={`w-full rounded-[28px] border px-5 py-4 text-left transition ${
                    conversation._id === selectedConversationId
                      ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]"
                      : "border-white/10 bg-white/[0.03] hover:border-cyan-500/40 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-xl font-bold text-white">{getContactName(conversation, activeTab)}</h3>
                      <p className="truncate text-sm text-slate-400">{getContactEmail(conversation, activeTab)}</p>
                    </div>
                    {conversation?.classification?.label ? (
                      <div className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${getClassificationTone(conversation.classification.priority)}`}>
                        {conversation.classification.label}
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-300">{getLastMessage(conversation)}</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                      {formatStamp(conversation?.lastMessageAt || conversation?.updatedAt)}
                    </p>
                    {conversation?.classification?.priority ? (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        {conversation.classification.priority} priority
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section className="rounded-[32px] border border-white/10 bg-slate-950/70 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
            {!selectedConversationId || !activeDetails ? (
              <div className="flex min-h-[72vh] items-center justify-center px-8 text-center">
                <div className="max-w-xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-300/80">Support Workspace</p>
                  <h2 className="mt-4 text-3xl font-black text-white">Open a live conversation</h2>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[72vh] flex-col">
                <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-7">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300/80">
                      {activeTab === "user" ? "User Conversation" : "Vendor Conversation"}
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-white">{getContactName(activeDetails, activeTab)}</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {getContactEmail(activeDetails, activeTab)}
                      <span className="ml-3 inline-flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${currentOnline ? "bg-emerald-400" : "bg-slate-500"}`} />
                        {currentOnline ? `${activeTab} online` : `${activeTab} offline`}
                      </span>
                      <span className="ml-3 inline-flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${supportOnline ? "bg-emerald-400" : "bg-slate-500"}`} />
                        {supportOnline ? "Admin online" : "Admin offline"}
                      </span>
                    </p>
                    {activeDetails?.classification?.summary ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] ${getClassificationTone(activeDetails.classification.priority)}`}>
                          {activeDetails.classification.label}
                        </span>
                        <span className="text-sm text-slate-400">
                          {activeDetails.classification.summary}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteConversation}
                    className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20"
                  >
                    Delete Conversation
                  </button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 md:px-7">
                  {loadingDetails ? (
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-300">Messages load ho rahe hain...</div>
                  ) : null}
                  {!loadingDetails && !liveMessages.length ? (
                    <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm leading-6 text-slate-400">
                      Is conversation me abhi koi message nahi hai.
                    </div>
                  ) : null}

                  {liveMessages.map((item) => (
                    <MessageBubble key={item._id || `${item.senderRole}-${item.createdAt}`} item={item} isAdmin={item?.senderRole === "admin"} />
                  ))}
                </div>

                <div className="border-t border-white/10 px-5 py-5 md:px-7">
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-3">
                    <textarea
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Reply as admin..."
                      rows={4}
                      className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-white outline-none placeholder:text-slate-400"
                    />

                    {attachmentPreview ? (
                      <div className="relative mt-3 inline-flex overflow-hidden rounded-[20px] border border-white/10">
                        <img src={attachmentPreview} alt="Selected attachment preview" className="h-20 w-20 object-cover" />
                        <button
                          type="button"
                          onClick={handleRemoveAttachment}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/80 text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : null}

                    <div className="mt-3 flex justify-end">
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
                        className="mr-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
                      >
                        <span className="inline-flex items-center gap-2">
                          <ImagePlus size={16} />
                          Add image
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={(!message.trim() && !attachmentFile) || sending}
                        onClick={handleSend}
                        className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 text-sm font-bold text-slate-950 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Send size={16} />
                          {sending ? "Sending..." : "Send Reply"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default SupportChats;
