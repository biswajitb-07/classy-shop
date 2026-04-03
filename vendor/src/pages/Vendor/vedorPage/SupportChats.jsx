import { useEffect, useMemo, useRef, useState } from "react";
import { Headset, ImagePlus, Send, ShieldCheck, Trash2, X } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  useDeleteSupportConversationMutation,
  useGetSupportConversationDetailsQuery,
  useGetSupportConversationsQuery,
  useSendSupportReplyMutation,
} from "../../../features/api/supportApi";
import AuthButtonLoader from "../../../component/Loader/AuthButtonLoader.jsx";
import { useTheme } from "../../../context/ThemeContext";

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
  const { isDark } = useTheme();
  const [selectedId, setSelectedId] = useState(null);
  const [reply, setReply] = useState("");
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState("");
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  const { data: listData, isLoading, refetch: refetchList } =
    useGetSupportConversationsQuery();
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

  const { data: detailsData, refetch: refetchDetails } =
    useGetSupportConversationDetailsQuery(selectedId, {
      skip: !selectedId,
    });

  const [sendSupportReply, { isLoading: isSending }] = useSendSupportReplyMutation();
  const [deleteSupportConversation, { isLoading: isDeleting }] =
    useDeleteSupportConversationMutation();

  const conversation = detailsData?.conversation || null;
  const messages = useMemo(() => detailsData?.messages || [], [detailsData?.messages]);

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
      await sendSupportReply({ conversationId: selectedId, formData }).unwrap();
      setReply("");
      setAttachmentFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await refetchList();
      await refetchDetails();
      toast.success("Message sent to admin");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to send message");
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedId) return;

    try {
      await deleteSupportConversation(selectedId).unwrap();
      setSelectedId(null);
      setReply("");
      setAttachmentFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await refetchList();
      toast.success("Conversation deleted");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete conversation");
    }
  };

  const shellClass = isDark
    ? "border-violet-400/25 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_20%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.18),transparent_24%),linear-gradient(180deg,#090d1f_0%,#101530_52%,#111938_100%)]"
    : "border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent_18%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.1),transparent_22%),linear-gradient(180deg,#f8fbff_0%,#eef2ff_50%,#fdf2f8_100%)]";
  const panelClass = isDark
    ? "border-violet-400/20 bg-slate-950/45"
    : "border-slate-200 bg-white/90";
  const headingClass = isDark ? "text-white" : "text-slate-900";
  const mutedClass = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <section className="pb-8">
      <div className={`rounded-[34px] border p-4 shadow-[0_28px_90px_rgba(2,6,23,0.18)] md:p-5 ${shellClass}`}>
        <div className="mb-5 flex flex-col gap-3 rounded-[28px] border border-white/10 bg-white/5 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-300">
              Vendor support
            </p>
            <h1 className={`mt-2 text-[1.9rem] font-black md:text-[2.2rem] ${headingClass}`}>
              Admin conversation desk
            </h1>
            <p className={`mt-2 max-w-2xl text-sm ${mutedClass}`}>
              Yahan se sirf admin team ke saath baat hogi. Customer chats ab vendor panel me
              nahi aayengi.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200">
            <ShieldCheck size={16} />
            Admin-only channel
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className={`flex min-h-[34rem] flex-col rounded-[28px] border p-4 ${panelClass}`}>
            <div className="mb-4 flex items-center gap-3">
              <Headset className="text-sky-300" size={18} />
              <div>
                <p className={`text-sm font-bold ${headingClass}`}>Conversations</p>
                <p className={`text-xs ${mutedClass}`}>Your admin support thread</p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              <div className="themed-scrollbar h-full space-y-3 overflow-y-auto pr-1">
                {isLoading ? (
                  <div className={`rounded-[22px] border px-4 py-6 text-center text-sm ${mutedClass}`}>
                    Loading conversation...
                  </div>
                ) : conversations.length ? (
                  conversations.map((item) => {
                    const unread = Number(item.unreadForVendor || 0);
                    return (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => setSelectedId(item._id)}
                        className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                          String(selectedId) === String(item._id)
                            ? "border-sky-400 bg-sky-500/10"
                            : isDark
                              ? "border-violet-400/14 bg-white/5 hover:bg-white/10"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`truncate text-base font-bold ${headingClass}`}>
                              Admin Support
                            </p>
                            <p className={`mt-1 truncate text-xs ${mutedClass}`}>
                              {item.lastMessage || "Start your first message"}
                            </p>
                          </div>
                          {unread ? (
                            <span className="rounded-full bg-rose-500 px-2.5 py-1 text-xs font-bold text-white">
                              {unread}
                            </span>
                          ) : null}
                        </div>
                        <p className={`mt-3 text-xs ${mutedClass}`}>
                          {formatTime(item.lastMessageAt)}
                        </p>
                      </button>
                    );
                  })
                ) : (
                  <div className={`rounded-[22px] border border-dashed px-4 py-8 text-center text-sm ${mutedClass}`}>
                    Support channel ready hai. First message bhejte hi thread active ho jayega.
                  </div>
                )}
              </div>
            </div>
          </aside>

          <div className={`flex min-h-[34rem] min-w-0 flex-col rounded-[28px] border ${panelClass}`}>
            <div className="border-b border-white/10 px-5 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-rose-300">
                    Active desk
                  </p>
                  <h2 className={`mt-2 text-2xl font-black ${headingClass}`}>Admin Support Team</h2>
                  <p className={`mt-1 text-sm ${mutedClass}`}>
                    Business, payout, policy, ya dashboard support yahin handle hoga.
                  </p>
                </div>
                {selectedId ? (
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
              {selectedId ? (
                messages.length ? (
                  messages.map((message) => {
                    const isVendorMessage = message.senderRole === "vendor";
                    return (
                      <div
                        key={message._id}
                        className={`max-w-[88%] rounded-[24px] px-5 py-4 shadow-[0_14px_30px_rgba(2,6,23,0.16)] ${
                          isVendorMessage
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
                        <p className={`mt-3 text-xs ${isVendorMessage ? "text-white/80" : mutedClass}`}>
                          {formatTime(message.createdAt)}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className={`rounded-[24px] border border-dashed px-6 py-10 text-center text-sm ${mutedClass}`}>
                      No messages yet. Send your first note to admin.
                    </div>
                  </div>
                )
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className={`rounded-[24px] border border-dashed px-6 py-10 text-center text-sm ${mutedClass}`}>
                    Conversation loading...
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 px-4 py-4 md:px-5">
              <div className={`rounded-[24px] border p-3 ${isDark ? "border-violet-400/16 bg-slate-950/35" : "border-slate-200 bg-white"}`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                  <div className="flex-1 rounded-[20px] border border-white/10 px-4 py-3">
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
                      className={`min-h-[6rem] w-full resize-none bg-transparent text-sm outline-none ${isDark ? "text-white placeholder:text-slate-500" : "text-slate-800 placeholder:text-slate-400"}`}
                    />
                    {attachmentPreview ? (
                      <div className="relative mt-3 inline-flex overflow-hidden rounded-[18px] border border-white/10">
                        <img src={attachmentPreview} alt="Preview" className="h-20 w-20 object-cover" />
                        <button
                          type="button"
                          onClick={handleRemoveAttachment}
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
                    onClick={handleReply}
                    disabled={!selectedId || isSending}
                    className="flex h-[3.5rem] w-full items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(135deg,#2563eb,#3b82f6_55%,#7c3aed)] px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(59,130,246,0.28)] transition hover:brightness-110 disabled:bg-slate-600 disabled:shadow-none md:w-[10rem]"
                  >
                    {isSending ? <AuthButtonLoader color="#ffffff" size={18} /> : <><Send size={16} />Send</>}
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
