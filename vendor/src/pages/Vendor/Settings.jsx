// File guide: Settings source file.
// This file belongs to the vendor app architecture and has a focused responsibility within its module/folder.
import { FiMoon, FiSettings, FiSun } from "react-icons/fi";
import { useTheme } from "../../context/ThemeContext";

const Settings = () => {
  const { theme, toggleTheme, isDark } = useTheme();
  const pageBg = isDark
    ? "bg-slate-950 text-[#e5e7eb]"
    : "bg-[#f8fafc] text-[#0f172a]";
  const panelSurface = isDark
    ? "bg-slate-900 border-slate-700 shadow-[0_18px_50px_rgba(2,6,23,0.45)]"
    : "bg-white border-slate-200 shadow-[0_18px_50px_rgba(15,23,42,0.06)]";
  const cardSurface = isDark
    ? "bg-slate-950 border-slate-700"
    : "bg-slate-50 border-slate-100";
  const titleText = isDark ? "text-[#f8fafc]" : "text-[#020617]";
  const bodyText = isDark ? "text-[#cbd5e1]" : "text-[#475569]";
  const mutedText = isDark ? "text-[#94a3b8]" : "text-[#64748b]";

  return (
    <div className={`mx-auto max-w-5xl px-1 py-2 transition-colors duration-300 ${pageBg}`}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className={`mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] shadow-sm ${isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"} ${mutedText}`}>
            <FiSettings size={13} /> Settings
          </p>
          <h1 className={`text-3xl font-black tracking-tight ${titleText}`}>
            Appearance & experience
          </h1>
          <p className={`mt-2 max-w-2xl text-sm ${bodyText}`}>
            I kept this simple: one smooth theme switch, designed for low-friction day
            and night browsing.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.9fr]">
        <section className={`rounded-[32px] border p-6 transition-colors duration-300 ${panelSurface}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className={`text-sm font-semibold uppercase tracking-[0.16em] ${mutedText}`}>
                Theme
              </p>
              <h2 className={`mt-2 text-2xl font-black ${titleText}`}>
                {isDark ? "Night mode" : "Day mode"}
              </h2>
              <p className={`mt-2 text-sm ${bodyText}`}>
                Switch between brighter daytime browsing and softer nighttime comfort.
              </p>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className={`group flex h-16 w-28 items-center rounded-full border px-2 shadow-inner transition-all duration-300 ${
                isDark
                  ? "justify-end border-slate-700 bg-slate-950"
                  : "justify-start border-slate-200 bg-slate-100"
              }`}
              aria-label="Toggle theme"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg transition-transform duration-300 group-active:scale-95">
                {isDark ? <FiMoon size={18} /> : <FiSun size={18} />}
              </span>
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className={`rounded-[24px] border p-4 ${cardSurface}`}>
              <p className={`text-xs font-bold uppercase tracking-[0.16em] ${mutedText}`}>
                Smooth transitions
              </p>
              <p className={`mt-2 text-sm ${bodyText}`}>
                Theme changes animate softly, so the UI does not feel jumpy.
              </p>
            </div>
            <div className={`rounded-[24px] border p-4 ${cardSurface}`}>
              <p className={`text-xs font-bold uppercase tracking-[0.16em] ${mutedText}`}>
                Preference
              </p>
              <p className={`mt-2 text-sm ${bodyText}`}>
                Your choice is saved automatically for the next visit.
              </p>
            </div>
          </div>
        </section>

        <aside className={`rounded-[32px] border p-6 transition-colors duration-300 ${isDark ? "bg-slate-900 border-slate-700 shadow-[0_18px_50px_rgba(2,6,23,0.45)]" : "bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] border-slate-200 shadow-[0_18px_50px_rgba(15,23,42,0.06)]"}`}>
          <p className={`text-sm font-semibold uppercase tracking-[0.16em] ${mutedText}`}>
            Recommended
          </p>
          <h3 className={`mt-2 text-2xl font-black ${titleText}`}>
            Best default for most users
          </h3>
          <p className={`mt-3 text-sm leading-7 ${bodyText}`}>
            Keep <span className={`font-bold ${titleText}`}>Day mode</span> while working in
            bright rooms, and switch to <span className={`font-bold ${titleText}`}>Night mode</span>{" "}
            during long dashboard sessions or low-light browsing.
          </p>
          <div className={`mt-6 rounded-[24px] border p-4 ${isDark ? "border-emerald-900 bg-emerald-950 text-emerald-200" : "border-emerald-100 bg-emerald-50 text-emerald-800"}`}>
            <p className="text-sm font-bold">Current mode</p>
            <p className="mt-1 text-sm">{theme === "dark" ? "Night mode enabled" : "Day mode enabled"}</p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Settings;
