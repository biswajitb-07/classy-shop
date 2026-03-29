import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { Provider } from "react-redux";
import { appStore } from "./app/store.js";
import LoadingSpinner from "./component/Loader/LoadingSpinner.jsx";
import { useLoadUserQuery } from "./features/api/authApi.js";
import { Suspense } from "react";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { useTheme } from "./context/ThemeContext.jsx";

const SkeletonBlock = ({ className }) => (
  <div className={`animate-pulse rounded-[24px] ${className}`} />
);

const DashboardContentSkeleton = ({ isDark }) => (
  <main className="flex-1 px-5 pb-8 pt-28">
    <div className="mx-auto max-w-9xl space-y-6">
      <SkeletonBlock
        className={`h-44 ${
          isDark ? "bg-slate-900/80" : "bg-white/85"
        }`}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock
            key={index}
            className={`h-32 ${
              isDark ? "bg-slate-900/80" : "bg-white/85"
            }`}
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <SkeletonBlock
          className={`h-[24rem] ${
            isDark ? "bg-slate-900/80" : "bg-white/85"
          }`}
        />
        <SkeletonBlock
          className={`h-[24rem] ${
            isDark ? "bg-slate-900/80" : "bg-white/85"
          }`}
        />
      </div>
      <SkeletonBlock
        className={`h-[18rem] ${
          isDark ? "bg-slate-900/80" : "bg-white/85"
        }`}
      />
    </div>
  </main>
);

const SupportChatsSkeleton = ({ isDark }) => (
  <main className="flex-1 px-5 pb-8 pt-28">
    <div
      className={`mx-auto max-w-[1400px] rounded-[34px] border p-4 md:p-5 ${
        isDark
          ? "border-violet-400/25 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.18),transparent_18%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.18),transparent_26%),linear-gradient(180deg,#090b1e_0%,#0f1130_45%,#121538_100%)]"
          : "border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.1),transparent_18%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.1),transparent_24%),linear-gradient(180deg,#f8fbff_0%,#eef2ff_45%,#fdf2f8_100%)]"
      }`}
    >
      <div
        className={`mb-5 rounded-[28px] border px-5 py-5 ${
          isDark
            ? "border-violet-400/20 bg-[linear-gradient(135deg,rgba(35,41,91,0.92),rgba(25,22,60,0.9)_55%,rgba(41,18,63,0.88))]"
            : "border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(238,242,255,0.94)_55%,rgba(253,242,248,0.94))]"
        }`}
      >
        <SkeletonBlock
          className={`h-4 w-40 rounded-full ${
            isDark ? "bg-sky-400/25" : "bg-sky-100"
          }`}
        />
        <SkeletonBlock
          className={`mt-4 h-10 w-full max-w-[32rem] ${
            isDark ? "bg-white/10" : "bg-white/90"
          }`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(22rem,0.92fr)_minmax(0,1.08fr)]">
        <div
          className={`flex min-h-[32rem] flex-col rounded-[28px] border p-4 lg:min-h-[42rem] ${
            isDark
              ? "border-violet-400/25 bg-[linear-gradient(180deg,rgba(16,18,48,0.96),rgba(19,16,54,0.92))]"
              : "border-slate-200 bg-white/90"
          }`}
        >
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className={`rounded-[24px] border p-4 ${
                  index === 0
                    ? isDark
                      ? "border-sky-400 bg-[linear-gradient(135deg,rgba(17,34,90,0.96),rgba(26,42,96,0.92)_48%,rgba(76,29,149,0.42))]"
                      : "border-sky-300 bg-[linear-gradient(135deg,#eff6ff,#eef2ff_55%,#fdf2f8)]"
                    : isDark
                      ? "border-violet-400/18 bg-[linear-gradient(180deg,rgba(16,18,44,0.86),rgba(17,15,47,0.84))]"
                      : "border-slate-200 bg-white"
                }`}
              >
                <SkeletonBlock
                  className={`h-5 w-40 ${
                    isDark ? "bg-white/12" : "bg-slate-100"
                  }`}
                />
                <SkeletonBlock
                  className={`mt-3 h-3 w-20 rounded-full ${
                    isDark ? "bg-white/10" : "bg-slate-100"
                  }`}
                />
                <SkeletonBlock
                  className={`mt-4 h-4 w-full ${
                    isDark ? "bg-white/10" : "bg-slate-100"
                  }`}
                />
                <SkeletonBlock
                  className={`mt-3 h-3 w-28 rounded-full ${
                    isDark ? "bg-white/10" : "bg-slate-100"
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        <div
          className={`flex min-h-[42rem] min-w-0 flex-col rounded-[28px] border ${
            isDark
              ? "border-violet-400/25 bg-[linear-gradient(180deg,rgba(16,18,48,0.96),rgba(19,16,54,0.92))]"
              : "border-slate-200 bg-white/90"
          }`}
        >
          <div
            className={`border-b px-5 py-4 ${
              isDark ? "border-violet-400/16" : "border-slate-200"
            }`}
          >
            <SkeletonBlock
              className={`h-4 w-28 rounded-full ${
                isDark ? "bg-rose-300/20" : "bg-rose-100"
              }`}
            />
            <SkeletonBlock
              className={`mt-3 h-9 w-52 ${
                isDark ? "bg-white/10" : "bg-slate-100"
              }`}
            />
            <SkeletonBlock
              className={`mt-3 h-3 w-20 rounded-full ${
                isDark ? "bg-white/10" : "bg-slate-100"
              }`}
            />
          </div>

          <div className="flex-1 space-y-4 px-4 py-5 md:px-5">
            <SkeletonBlock
              className={`h-24 w-[70%] ${
                isDark ? "bg-white/8" : "bg-slate-100"
              }`}
            />
            <SkeletonBlock
              className={`ml-auto h-28 w-[58%] ${
                isDark ? "bg-sky-500/25" : "bg-sky-100"
              }`}
            />
            <SkeletonBlock
              className={`h-20 w-[62%] ${
                isDark ? "bg-white/8" : "bg-slate-100"
              }`}
            />
          </div>

          <div
            className={`border-t px-4 py-4 md:px-5 ${
              isDark
                ? "border-violet-400/16 bg-slate-950/35"
                : "border-slate-200 bg-slate-50/70"
            }`}
          >
            <div
              className={`rounded-[28px] border p-3 ${
                isDark
                  ? "border-violet-400/18 bg-[linear-gradient(180deg,rgba(22,25,58,0.95),rgba(25,21,62,0.9))]"
                  : "border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)]"
              }`}
            >
              <div
                className={`mb-3 rounded-[22px] border px-3 py-3 ${
                  isDark
                    ? "border-violet-400/14 bg-white/4"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <SkeletonBlock
                    className={`h-12 w-12 rounded-full ${
                      isDark ? "bg-white/10" : "bg-slate-200"
                    }`}
                  />
                  <div className="space-y-2">
                    <SkeletonBlock
                      className={`h-5 w-40 ${
                        isDark ? "bg-white/10" : "bg-slate-200"
                      }`}
                    />
                    <SkeletonBlock
                      className={`h-3 w-16 rounded-full ${
                        isDark ? "bg-white/10" : "bg-slate-200"
                      }`}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 md:flex-row">
                <SkeletonBlock
                  className={`h-40 flex-1 ${
                    isDark ? "bg-slate-950/40" : "bg-slate-100"
                  }`}
                />
                <SkeletonBlock
                  className={`h-14 w-full md:w-[12rem] ${
                    isDark ? "bg-sky-500/25" : "bg-sky-100"
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
);

const DashboardShellFallback = () => {
  const { isDark } = useTheme();
  const path = window.location.pathname;
  const isSupportRoute = path.startsWith("/support-chats");

  return (
    <div
      className={`min-h-screen ${
        isDark
          ? "bg-[linear-gradient(180deg,#050816_0%,#0f172a_55%,#111827_100%)]"
          : "bg-[linear-gradient(180deg,#fffaf8_0%,#f8fafc_55%,#eef2ff_100%)]"
      }`}
    >
      <div
        className={`fixed inset-x-0 top-0 z-10 h-[5.5rem] border-b ${
          isDark ? "border-slate-800 bg-slate-900/95" : "border-slate-200 bg-white/95"
        }`}
      />
      <div className="min-h-screen overflow-y-auto">
        {isSupportRoute ? (
          <SupportChatsSkeleton isDark={isDark} />
        ) : (
          <DashboardContentSkeleton isDark={isDark} />
        )}
      </div>
    </div>
  );
};

const Custom = ({ children }) => {
  const { isLoading } = useLoadUserQuery();

  // Hold the shell until the vendor session is resolved, so protected routes
  // do not flash the wrong state during boot.
  return isLoading ? (
    <LoadingSpinner />
  ) : (
    <Suspense fallback={<DashboardShellFallback />}>
      {children}
    </Suspense>
  );
};

createRoot(document.getElementById("root")).render(
  <Provider store={appStore}>
    <ThemeProvider>
      <Custom>
        <App />
      </Custom>
    </ThemeProvider>
  </Provider>
);
