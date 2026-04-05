import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeHelp,
  FileText,
  Headset,
  LocateFixed,
  PackageSearch,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { companyPageList, companyPages } from "../../../utils/siteSupport.js";
import { useTheme } from "../../../context/ThemeContext.jsx";

const quickActions = [
  {
    title: "Track my order",
    description: "Order movement, live tracking, ETA, and delivery status dekho.",
    icon: LocateFixed,
    to: "/orders",
    accent: "from-cyan-500 to-blue-500",
  },
  {
    title: "Contact support",
    description: "Chat support se issue raise karo ya order help lo.",
    icon: Headset,
    to: "/support",
    accent: "from-fuchsia-500 to-pink-500",
  },
  {
    title: "Compare products",
    description: "Shortlisted products ko side-by-side compare karo.",
    icon: PackageSearch,
    to: "/compare-products",
    accent: "from-amber-500 to-orange-500",
  },
  {
    title: "Wallet & referrals",
    description: "Wallet balance, rewards, aur invite earnings check karo.",
    icon: Wallet,
    to: "/profile",
    accent: "from-emerald-500 to-teal-500",
  },
];

const primaryFaqs = [
  {
    question: "How do I track my order live?",
    answer:
      "Order details ya dedicated Track Order page par jaake delivery partner ka live route, ETA, aur movement direction dekh sakte ho.",
    icon: LocateFixed,
  },
  {
    question: "How do returns work on ClassyShop?",
    answer:
      "Delivered orders par return request raise ki ja sakti hai. Vendor approval ke baad pickup assignment aur OTP-based return completion flow chalta hai.",
    icon: FileText,
  },
  {
    question: "Can I compare products before buying?",
    answer:
      "Haan. Product detail pages se Compare add karo aur Compare Products page par price, rating, shipping, aur specs side-by-side dekho.",
    icon: PackageSearch,
  },
  {
    question: "Is payment and wallet usage secure?",
    answer:
      "Checkout me secure payment flow aur wallet deduction summary dono dikhte hain. Order details me payment method aur invoice bhi available hai.",
    icon: ShieldCheck,
  },
];

const HelpCenterPage = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [query, setQuery] = useState("");

  const allFaqs = useMemo(() => {
    const supportFaqs = primaryFaqs.map((item) => ({
      ...item,
      section: "Help center",
    }));

    const companyFaqs = companyPageList.flatMap(({ slug, label }) =>
      (companyPages[slug]?.faqs || []).map((faq) => ({
        ...faq,
        icon: BadgeHelp,
        section: label,
      })),
    );

    return [...supportFaqs, ...companyFaqs];
  }, []);

  const filteredFaqs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return allFaqs;

    return allFaqs.filter(
      (item) =>
        item.question.toLowerCase().includes(normalizedQuery) ||
        item.answer.toLowerCase().includes(normalizedQuery) ||
        item.section.toLowerCase().includes(normalizedQuery),
    );
  }, [allFaqs, query]);

  return (
    <section
      className={`container mx-auto px-4 pb-10 md:px-3 ${
        isDark ? "text-white" : "text-slate-950"
      }`}
    >
      <div
        className={`overflow-hidden rounded-[34px] border shadow-[0_18px_70px_rgba(15,23,42,0.08)] ${
          isDark
            ? "border-slate-800 bg-slate-950"
            : "border-slate-200 bg-white"
        }`}
      >
        <div
          className={`px-6 py-7 md:px-10 md:py-8 lg:px-12 lg:py-9 ${
            isDark
              ? "bg-[linear-gradient(135deg,#020617_0%,#0f172a_48%,#082f49_100%)]"
              : "bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_45%,#fef3c7_100%)]"
          }`}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white dark:bg-white dark:text-slate-950">
            <BadgeHelp size={14} />
            Help Center
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
            <div>
              <h1 className="max-w-3xl text-3xl font-black leading-tight md:text-4xl lg:text-[3.25rem]">
                Answers, tracking help, and support shortcuts in one place.
              </h1>
              <p
                className={`mt-3 max-w-3xl text-[15px] leading-7 ${
                  isDark ? "text-slate-300" : "text-slate-600"
                }`}
              >
                Order status, returns, payments, compare help, wallet, aur store
                policies ke liye yahin se quick path mil jayega.
              </p>
            </div>

            <div
              className={`rounded-[26px] border p-4 shadow-sm lg:p-5 ${
                isDark
                  ? "border-slate-800 bg-slate-900/80"
                  : "border-white bg-white/80"
              }`}
            >
              <label
                htmlFor="help-search"
                className={`text-xs font-bold uppercase tracking-[0.18em] ${
                  isDark ? "text-cyan-300" : "text-blue-700"
                }`}
              >
                Search help articles
              </label>
              <input
                id="help-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try: track order, wallet, compare, return"
                className={`mt-3 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
                  isDark
                    ? "border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:border-cyan-400"
                    : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-400"
                }`}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {["Track order", "Returns", "Compare", "Wallet"].map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setQuery(term)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      isDark
                        ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 px-6 py-10 md:px-10 lg:grid-cols-[1.06fr_0.94fr]">
          <div>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p
                  className={`text-xs font-bold uppercase tracking-[0.18em] ${
                    isDark ? "text-cyan-300" : "text-blue-700"
                  }`}
                >
                  Quick actions
                </p>
                <h2 className="mt-2 text-2xl font-black">Popular shortcuts</h2>
              </div>
              <button
                type="button"
                onClick={() => navigate("/support")}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isDark
                    ? "bg-white text-slate-950 hover:bg-slate-200"
                    : "bg-slate-950 text-white hover:bg-slate-800"
                }`}
              >
                Open support
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {quickActions.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.title}
                    to={item.to}
                    className={`group rounded-[26px] border p-5 transition hover:-translate-y-0.5 ${
                      isDark
                        ? "border-slate-800 bg-slate-900 hover:border-slate-700"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.accent} text-white shadow-lg`}
                    >
                      <Icon size={22} />
                    </div>
                    <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
                    <p
                      className={`mt-2 text-sm leading-6 ${
                        isDark ? "text-slate-300" : "text-slate-600"
                      }`}
                    >
                      {item.description}
                    </p>
                    <span
                      className={`mt-4 inline-flex items-center gap-2 text-sm font-semibold ${
                        isDark ? "text-cyan-300" : "text-blue-700"
                      }`}
                    >
                      Open
                      <ArrowRight size={15} />
                    </span>
                  </Link>
                );
              })}
            </div>

            <div
              className={`mt-8 rounded-[28px] border p-6 ${
                isDark
                  ? "border-slate-800 bg-slate-900"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <p
                className={`text-xs font-bold uppercase tracking-[0.18em] ${
                  isDark ? "text-fuchsia-300" : "text-fuchsia-700"
                }`}
              >
                Store policies
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {companyPageList.map((page) => (
                  <Link
                    key={page.slug}
                    to={`/company/${page.slug}`}
                    className={`rounded-2xl border px-4 py-4 text-sm font-semibold transition ${
                      isDark
                        ? "border-slate-800 bg-slate-950 text-slate-100 hover:border-slate-700"
                        : "border-white bg-white text-slate-800 hover:border-slate-200"
                    }`}
                  >
                    {page.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-5">
              <p
                className={`text-xs font-bold uppercase tracking-[0.18em] ${
                  isDark ? "text-amber-300" : "text-orange-600"
                }`}
              >
                Frequently asked questions
              </p>
              <h2 className="mt-2 text-2xl font-black">
                {filteredFaqs.length} answer{filteredFaqs.length === 1 ? "" : "s"} found
              </h2>
            </div>

            <div className="space-y-4">
              {filteredFaqs.length ? (
                filteredFaqs.map((item) => {
                  const Icon = item.icon || BadgeHelp;

                  return (
                    <details
                      key={`${item.section}-${item.question}`}
                      className={`group rounded-[24px] border px-5 py-5 shadow-sm ${
                        isDark
                          ? "border-slate-800 bg-slate-900"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                        <div className="flex gap-3">
                          <span
                            className={`mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl ${
                              isDark
                                ? "bg-slate-800 text-cyan-300"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            <Icon size={18} />
                          </span>
                          <div>
                            <p
                              className={`text-[11px] font-bold uppercase tracking-[0.18em] ${
                                isDark ? "text-slate-400" : "text-slate-500"
                              }`}
                            >
                              {item.section}
                            </p>
                            <h3 className="mt-2 text-base font-bold md:text-lg">
                              {item.question}
                            </h3>
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition group-open:rotate-180 ${
                            isDark
                              ? "bg-slate-800 text-slate-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          ↓
                        </span>
                      </summary>
                      <p
                        className={`mt-4 pl-[3.25rem] text-sm leading-7 ${
                          isDark ? "text-slate-300" : "text-slate-600"
                        }`}
                      >
                        {item.answer}
                      </p>
                    </details>
                  );
                })
              ) : (
                <div
                  className={`rounded-[26px] border border-dashed p-8 text-center ${
                    isDark
                      ? "border-slate-700 bg-slate-900"
                      : "border-slate-300 bg-slate-50"
                  }`}
                >
                  <BadgeHelp
                    className={`mx-auto h-12 w-12 ${
                      isDark ? "text-slate-500" : "text-slate-400"
                    }`}
                  />
                  <h3 className="mt-4 text-xl font-bold">No match found</h3>
                  <p
                    className={`mt-2 text-sm ${
                      isDark ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    Try another keyword like payment, return, compare, or wallet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HelpCenterPage;
