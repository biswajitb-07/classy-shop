import { useEffect, useMemo, useRef, useState } from "react";
import { Headset, ImagePlus, Search, Send, ShieldCheck, Store, Trash2, UserRound, X } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  useGetUsersQuery,
  useGetVendorsQuery,
} from "../../../features/api/authApi";
import {
  useDeleteUserSupportConversationMutation,
  useDeleteVendorSupportConversationMutation,
  useEnsureUserSupportConversationMutation,
  useEnsureVendorSupportConversationMutation,
  useGetUserSupportConversationDetailsQuery,
  useGetUserSupportConversationsQuery,
  useGetVendorSupportConversationDetailsQuery,
  useGetVendorSupportConversationsQuery,
  useSendUserSupportReplyMutation,
  useSendVendorSupportReplyMutation,
} from "../../../features/api/supportApi";
import { useTheme } from "../../../context/ThemeContext";
import AuthButtonLoader from "../../../component/Loader/AuthButtonLoader.jsx";

const formatTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "No activity yet";

const tabs = [
  { id: "users", label: "User Support", icon: UserRound },
  { id: "vendors", label: "Vendor Support", icon: Store },
];

const SupportChats = () => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState("users");
  const [search, setSearch] = useState("");
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [draft, setDraft] = useState("");
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState("");
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  const { data: usersData, isLoading: isUsersLoading } = useGetUsersQuery();
  const { data: vendorsData, isLoading: isVendorsLoading } = useGetVendorsQuery();

  const {
    data: userConversationsData,
    isLoading: isUserConversationsLoading,
    refetch: refetchUserConversations,
  } = useGetUserSupportConversationsQuery();
  const {
    data: vendorConversationsData,
    isLoading: isVendorConversationsLoading,
    refetch: refetchVendorConversations,
  } = useGetVendorSupportConversationsQuery();

  const [ensureUserSupportConversation, { isLoading: isEnsuringUserConversation }] =
    useEnsureUserSupportConversationMutation();
  const [ensureVendorSupportConversation, { isLoading: isEnsuringVendorConversation }] =
    useEnsureVendorSupportConversationMutation();
  const [sendUserSupportReply, { isLoading: isSendingUserReply }] =
    useSendUserSupportReplyMutation();
  const [sendVendorSupportReply, { isLoading: isSendingVendorReply }] =
    useSendVendorSupportReplyMutation();
  const [deleteUserSupportConversation, { isLoading: isDeletingUserConversation }] =
    useDeleteUserSupportConversationMutation();
  const [deleteVendorSupportConversation, { isLoading: isDeletingVendorConversation }] =
    useDeleteVendorSupportConversationMutation();

  const users = usersData?.users || [];
  const vendors = vendorsData?.vendors || [];
  const userConversations = userConversationsData?.conversations || [];
  const vendorConversations = vendorConversationsData?.conversations || [];

  const userConversationMap = useMemo(
    () =>
      new Map(
        userConversations
          .filter((item) => item?.user?._id)
          .map((item) => [String(item.user._id), item]),
      ),
    [userConversations],
  );
  const vendorConversationMap = useMemo(
    () =>
      new Map(
        vendorConversations
          .filter((item) => item?.vendor?._id)
          .map((item) => [String(item.vendor._id), item]),
      ),
    [vendorConversations],
  );

  const directoryEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const source = activeTab === "users" ? users : vendors;
    const conversationMap =
      activeTab === "users" ? userConversationMap : vendorConversationMap;

    return source
      .filter((item) => {
        if (!normalizedSearch) return true;
        return [item?.name, item?.email, item?.phone]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));
      })
      .map((item) => ({
        contact: item,
        conversation: conversationMap.get(String(item._id)) || null,
      }))
      .sort((a, b) => {
        const aTime = a.conversation?.lastMessageAt
          ? new Date(a.conversation.lastMessageAt).getTime()
          : 0;
        const bTime = b.conversation?.lastMessageAt
          ? new Date(b.conversation.lastMessageAt).getTime()
          : 0;
        return bTime - aTime;
      });
  }, [activeTab, search, userConversationMap, users, vendorConversationMap, vendors]);

  useEffect(() => {
    if (!directoryEntries.length) {
      setSelectedContactId(null);
      setSelectedConversationId(null);
      return;
    }

    const selectedStillExists = directoryEntries.some(
      (entry) => String(entry.contact._id) === String(selectedContactId),
    );

    if (!selectedContactId || !selectedStillExists) {
      const next = directoryEntries[0];
      setSelectedContactId(next.contact._id);
      setSelectedConversationId(next.conversation?._id || null);
      return;
    }

    const selectedEntry = directoryEntries.find(
      (entry) => String(entry.contact._id) === String(selectedContactId),
    );
    setSelectedConversationId(selectedEntry?.conversation?._id || null);
  }, [directoryEntries, selectedContactId]);

  const {
    data: userDetailsData,
    isFetching: isUserDetailsFetching,
    refetch: refetchUserDetails,
  } = useGetUserSupportConversationDetailsQuery(selectedConversationId, {
    skip: activeTab !== "users" || !selectedConversationId,
  });
  const {
    data: vendorDetailsData,
    isFetching: isVendorDetailsFetching,
    refetch: refetchVendorDetails,
  } = useGetVendorSupportConversationDetailsQuery(selectedConversationId, {
    skip: activeTab !== "vendors" || !selectedConversationId,
  });

  const detailsData = activeTab === "users" ? userDetailsData : vendorDetailsData;
  const conversation = detailsData?.conversation || null;
  const messages = detailsData?.messages || [];
  const isDetailsFetching =
    activeTab === "users" ? isUserDetailsFetching : isVendorDetailsFetching;
  const isSending = activeTab === "users" ? isSendingUserReply : isSendingVendorReply;
  const isDeleting =
    activeTab === "users" ? isDeletingUserConversation : isDeletingVendorConversation;
  const isEnsuring =
    activeTab === "users" ? isEnsuringUserConversation : isEnsuringVendorConversation;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!attachmentFile) {
      setAttachmentPreview("");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(attachmentFile);
    setAttachmentPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [attachmentFile]);

  const selectedEntry = directoryEntries.find(
    (entry) => String(entry.contact._id) === String(selectedContactId),
  );
  const selectedContact = selectedEntry?.contact || null;

  const prepareConversation = async (contactId = selectedContactId) => {
    if (!contactId) return null;

    if (activeTab === "users") {
      const response = await ensureUserSupportConversation(contactId).unwrap();
      await refetchUserConversations();
      setSelectedConversationId(response?.conversation?._id || null);
      return response?.conversation || null;
    }

    const response = await ensureVendorSupportConversation(contactId).unwrap();
    await refetchVendorConversations();
    setSelectedConversationId(response?.conversation?._id || null);
    return response?.conversation || null;
  };

  const handleSelectContact = async (contactId) => {
    setSelectedContactId(contactId);
    const entry = directoryEntries.find(
      (item) => String(item.contact._id) === String(contactId),
    );
    setSelectedConversationId(entry?.conversation?._id || null);
  };

  const handleSend = async () => {
    if (!selectedContactId) {
      toast.error(
        activeTab === "users"
          ? "Please select a user first"
          : "Please select a vendor first",
      );
      return;
    }

    if (!draft.trim() && !attachmentFile) {
      toast.error("Write a message or choose an image");
      return;
    }

    let conversationId = selectedConversationId;
    if (!conversationId) {
      const prepared = await prepareConversation(selectedContactId);
      conversationId = prepared?._id || null;
    }

    if (!conversationId) {
      toast.error("Conversation could not be prepared");
      return;
    }

    const formData = new FormData();
    if (draft.trim()) formData.append("text", draft.trim());
    if (attachmentFile) formData.append("attachments", attachmentFile);

    try {
      if (activeTab === "users") {
        await sendUserSupportReply({ conversationId, formData }).unwrap();
        await refetchUserConversations();
        await refetchUserDetails();
      } else {
        await sendVendorSupportReply({ conversationId, formData }).unwrap();
        await refetchVendorConversations();
        await refetchVendorDetails();
      }

      setSelectedConversationId(conversationId);
      setDraft("");
      setAttachmentFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      toast.success("Message sent");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to send message");
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedConversationId) return;

    try {
      if (activeTab === "users") {
        await deleteUserSupportConversation(selectedConversationId).unwrap();
        await refetchUserConversations();
      } else {
        await deleteVendorSupportConversation(selectedConversationId).unwrap();
        await refetchVendorConversations();
      }
      setSelectedConversationId(null);
      setDraft("");
      toast.success("Conversation deleted");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete conversation");
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

  const shellClass = isDark
    ? "border-violet-400/25 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.18),transparent_18%),radial-gradient(circle_at_bottom_left,rgba(244,63,94,0.12),transparent_22%),linear-gradient(180deg,#0b1021_0%,#11172f_48%,#161b35_100%)]"
    : "border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.08),transparent_18%),radial-gradient(circle_at_bottom_left,rgba(244,63,94,0.08),transparent_22%),linear-gradient(180deg,#f8fbff_0%,#eef2ff_52%,#fff7f8_100%)]";
  const cardClass = isDark
    ? "border-violet-400/18 bg-slate-950/45"
    : "border-slate-200 bg-white/88";
  const headingClass = isDark ? "text-white" : "text-slate-900";
  const mutedClass = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <section className="pb-8">
      <div className={`rounded-[34px] border p-4 shadow-[0_28px_90px_rgba(2,6,23,0.18)] md:p-5 ${shellClass}`}>
        <div className="mb-5 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/5 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-300">
              Admin support
            </p>
            <h1 className={`mt-2 text-[1.95rem] font-black md:text-[2.35rem] ${headingClass}`}>
              Unified conversation console
            </h1>
            <p className={`mt-2 max-w-3xl text-sm ${mutedClass}`}>
              User aur vendor dono chats ab admin se handle hongi. Vendor only admin se
              baat karega, aur user bhi sirf admin desk tak limited rahega.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200">
            <ShieldCheck size={16} />
            Multi-channel admin desk
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-3">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveTab(id);
                setSearch("");
                setDraft("");
                setAttachmentFile(null);
              }}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                activeTab === id
                  ? "border-sky-400 bg-sky-500/10 text-sky-200"
                  : isDark
                    ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[24rem_minmax(0,1fr)]">
          <aside className={`flex min-h-[40rem] flex-col rounded-[28px] border p-4 ${cardClass}`}>
            <div className="mb-4 flex items-center gap-3">
              {activeTab === "users" ? (
                <UserRound className="text-sky-300" size={18} />
              ) : (
                <Store className="text-sky-300" size={18} />
              )}
              <div>
                <p className={`text-sm font-bold ${headingClass}`}>
                  {activeTab === "users" ? "Users directory" : "Vendors directory"}
                </p>
                <p className={`text-xs ${mutedClass}`}>
                  Select a contact and start or continue support
                </p>
              </div>
            </div>

            <div className={`mb-4 flex items-center gap-2 rounded-[20px] border px-4 py-3 ${isDark ? "border-white/10 bg-slate-950/35" : "border-slate-200 bg-white"}`}>
              <Search size={16} className={mutedClass} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={activeTab === "users" ? "Search users..." : "Search vendors..."}
                className={`w-full bg-transparent text-sm outline-none ${isDark ? "text-white placeholder:text-slate-500" : "text-slate-800 placeholder:text-slate-400"}`}
              />
            </div>

            <div className="themed-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {(activeTab === "users" ? isUsersLoading || isUserConversationsLoading : isVendorsLoading || isVendorConversationsLoading) ? (
                <div className={`rounded-[22px] border px-4 py-6 text-center text-sm ${mutedClass}`}>
                  Loading directory...
                </div>
              ) : directoryEntries.length ? (
                directoryEntries.map(({ contact, conversation: itemConversation }) => {
                  const unread = Number(
                    activeTab === "users"
                      ? itemConversation?.unreadForAdmin || 0
                      : itemConversation?.unreadForAdmin || 0,
                  );

                  return (
                    <button
                      key={contact._id}
                      type="button"
                      onClick={() => handleSelectContact(contact._id)}
                      className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                        String(selectedContactId) === String(contact._id)
                          ? "border-sky-400 bg-sky-500/10"
                          : isDark
                            ? "border-violet-400/14 bg-white/5 hover:bg-white/10"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={`truncate text-base font-bold ${headingClass}`}>
                            {contact.name}
                          </p>
                          <p className={`mt-1 truncate text-xs ${mutedClass}`}>{contact.email}</p>
                        </div>
                        {unread ? (
                          <span className="rounded-full bg-rose-500 px-2.5 py-1 text-xs font-bold text-white">
                            {unread}
                          </span>
                        ) : null}
                      </div>
                      <p className={`mt-3 line-clamp-2 text-sm ${mutedClass}`}>
                        {itemConversation?.lastMessage || "No conversation yet"}
                      </p>
                      <p className={`mt-3 text-xs ${mutedClass}`}>
                        {formatTime(itemConversation?.lastMessageAt)}
                      </p>
                    </button>
                  );
                })
              ) : (
                <div className={`rounded-[22px] border border-dashed px-4 py-8 text-center text-sm ${mutedClass}`}>
                  No matches found.
                </div>
              )}
            </div>
          </aside>

          <div className={`flex min-h-[40rem] min-w-0 flex-col rounded-[28px] border ${cardClass}`}>
            <div className="border-b border-white/10 px-5 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-rose-300">
                    Selected contact
                  </p>
                  <h2 className={`mt-2 text-2xl font-black ${headingClass}`}>
                    {selectedContact?.name ||
                      (activeTab === "users" ? "Choose a user" : "Choose a vendor")}
                  </h2>
                  <p className={`mt-1 text-sm ${mutedClass}`}>
                    {selectedContact?.email ||
                      (activeTab === "users"
                        ? "Select a user to start a support thread"
                        : "Select a vendor to start a support thread")}
                  </p>
                </div>
                {selectedConversationId ? (
                  <button
                    type="button"
                    onClick={handleDeleteConversation}
                    disabled={isDeleting}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-60"
                  >
                    {isDeleting ? <AuthButtonLoader color="#ffffff" size={16} /> : <><Trash2 size={16} />Delete</>}
                  </button>
                ) : null}
              </div>
            </div>

            <div ref={scrollRef} className="themed-scrollbar min-h-[18rem] flex-1 space-y-4 overflow-y-auto px-4 py-5 md:px-5">
              {!selectedContact ? (
                <div className="flex h-full items-center justify-center">
                  <div className={`rounded-[24px] border border-dashed px-6 py-10 text-center text-sm ${mutedClass}`}>
                    Left side se contact choose karo, phir admin support yahan open hoga.
                  </div>
                </div>
              ) : isDetailsFetching ? (
                <div className="flex h-full items-center justify-center">
                  <div className={`rounded-[24px] border px-6 py-10 text-center text-sm ${mutedClass}`}>
                    Loading conversation...
                  </div>
                </div>
              ) : messages.length ? (
                messages.map((message) => {
                  const isOwn = message.senderRole === "admin";
                  return (
                    <div
                      key={message._id}
                      className={`max-w-[88%] rounded-[24px] px-5 py-4 shadow-[0_14px_30px_rgba(2,6,23,0.16)] ${
                        isOwn
                          ? "ml-auto bg-[linear-gradient(135deg,#2563eb,#3b82f6_55%,#7c3aed)] text-white"
                          : isDark
                            ? "border border-violet-400/14 bg-slate-900/80 text-slate-100"
                            : "border border-slate-200 bg-white text-slate-800"
                      }`}
                    >
                      {message.text ? <p className="text-sm leading-7">{message.text}</p> : null}
                      {message.attachments?.length ? (
                        <div className={message.text ? "mt-3" : ""}>
                          {message.attachments.map((attachment, index) => (
                            <a
                              key={`${message._id}-${attachment.url}-${index}`}
                              href={attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className="block overflow-hidden rounded-[18px] border border-white/10"
                            >
                              <img
                                src={attachment.url}
                                alt={attachment.fileName || "Attachment"}
                                className="max-h-72 w-full object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      ) : null}
                      <p className={`mt-3 text-xs ${isOwn ? "text-white/80" : mutedClass}`}>
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className={`rounded-[24px] border border-dashed px-6 py-10 text-center text-sm ${mutedClass}`}>
                    No messages yet. Admin yahin se first message start kar sakta hai.
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 px-4 py-4 md:px-5">
              <div className={`rounded-[24px] border p-3 ${isDark ? "border-violet-400/16 bg-slate-950/35" : "border-slate-200 bg-white"}`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                  <div className="flex-1 rounded-[20px] border border-white/10 px-4 py-3">
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          if (!isSending && !isEnsuring) handleSend();
                        }
                      }}
                      placeholder={
                        activeTab === "users"
                          ? "Write a clear support reply for the user..."
                          : "Write a clear admin message for the vendor..."
                      }
                      className={`min-h-[6rem] w-full resize-none bg-transparent text-sm outline-none ${isDark ? "text-white placeholder:text-slate-500" : "text-slate-800 placeholder:text-slate-400"}`}
                    />
                    {attachmentPreview ? (
                      <div className="relative mt-3 inline-flex overflow-hidden rounded-[18px] border border-white/10">
                        <img src={attachmentPreview} alt="Preview" className="h-20 w-20 object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setAttachmentFile(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = "";
                            }
                          }}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/80 text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : null}
                    <div className="mt-3">
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
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold ${isDark ? "border-violet-400/20 bg-white/6 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-700"}`}
                      >
                        <ImagePlus size={16} />
                        Add image
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!selectedContact || isSending || isEnsuring}
                    className="flex h-[3.5rem] w-full items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(135deg,#2563eb,#3b82f6_55%,#7c3aed)] px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(59,130,246,0.28)] transition hover:brightness-110 disabled:bg-slate-600 disabled:shadow-none md:w-[10rem]"
                  >
                    {isSending || isEnsuring ? (
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

export default SupportChats;
