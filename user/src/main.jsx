import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { Provider } from "react-redux";
import { appStore } from "./app/store.js";
import { useLoadUserQuery } from "./features/api/authApi.js";
import { Suspense } from "react";
import LoadingSpinner from "./components/Loader/LoadingSpinner.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { useTheme } from "./context/ThemeContext.jsx";

const CHUNK_RELOAD_KEY = "user-app-chunk-reload";

const isRecoverableChunkError = (error) => {
  const message = String(
    error?.message || error?.reason?.message || error?.reason || "",
  ).toLowerCase();

  return (
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("importing a module script failed") ||
    message.includes("chunkloaderror") ||
    message.includes("dynamically imported module")
  );
};

const reloadForChunkError = () => {
  const reloadKey = `${CHUNK_RELOAD_KEY}:${window.location.pathname}`;

  if (sessionStorage.getItem(reloadKey)) {
    return false;
  }

  sessionStorage.setItem(reloadKey, "1");
  window.location.reload();
  return true;
};

const SkeletonBlock = ({ className }) => (
  <div className={`animate-pulse rounded-[24px] ${className}`} />
);

class ChunkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    if (isRecoverableChunkError(error)) {
      reloadForChunkError();
    }
  }

  render() {
    if (this.state.hasError) {
      return <LoadingSpinner message="Refreshing app..." />;
    }

    return this.props.children;
  }
}

const UserShellFallback = () => {
  const { isDark } = useTheme();
  const path = window.location.pathname;
  const isHomeRoute = path === "/";

  return (
    <div
      className={`min-h-screen ${
        isDark
          ? "bg-[linear-gradient(180deg,#020617_0%,#081120_45%,#111827_100%)]"
          : "bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_45%,#fff1f2_100%)]"
      }`}
    >
      <div
        className={`fixed inset-x-0 top-0 z-10 h-[5.25rem] border-b md:h-[5.5rem] lg:h-[9rem] ${
          isDark ? "border-slate-800 bg-slate-950/95" : "border-slate-200 bg-white/95"
        }`}
      />
      <main className="pt-[6.5rem] md:pt-[7rem] lg:pt-[14rem]">
        <div className="container mx-auto px-4 pb-10">
          {isHomeRoute ? (
            <div className="space-y-8">
              <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
                <SkeletonBlock
                  className={`h-[15rem] md:h-[19rem] ${
                    isDark ? "bg-slate-900/80" : "bg-white/85"
                  }`}
                />
                <div className="hidden gap-5 lg:grid">
                  <SkeletonBlock
                    className={`h-[9rem] ${
                      isDark ? "bg-slate-900/80" : "bg-white/85"
                    }`}
                  />
                  <SkeletonBlock
                    className={`h-[9rem] ${
                      isDark ? "bg-slate-900/80" : "bg-white/85"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className={`rounded-[24px] p-4 ${
                      isDark ? "bg-slate-900/80" : "bg-white/85"
                    }`}
                  >
                    <SkeletonBlock
                      className={`mx-auto h-12 w-12 rounded-full ${
                        isDark ? "bg-slate-800" : "bg-slate-100"
                      }`}
                    />
                    <SkeletonBlock
                      className={`mx-auto mt-4 h-4 w-20 rounded-full ${
                        isDark ? "bg-slate-800" : "bg-slate-100"
                      }`}
                    />
                  </div>
                ))}
              </div>

              {Array.from({ length: 3 }).map((_, sectionIndex) => (
                <div key={sectionIndex} className="space-y-4">
                  <div className="space-y-3 text-center">
                    <SkeletonBlock
                      className={`mx-auto h-9 w-64 rounded-full ${
                        isDark ? "bg-slate-900/80" : "bg-white/85"
                      }`}
                    />
                    <SkeletonBlock
                      className={`mx-auto h-4 w-80 max-w-full rounded-full ${
                        isDark ? "bg-slate-800" : "bg-slate-100"
                      }`}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((__, cardIndex) => (
                      <div
                        key={`${sectionIndex}-${cardIndex}`}
                        className={`rounded-[28px] p-4 ${
                          isDark ? "bg-slate-900/80" : "bg-white/85"
                        }`}
                      >
                        <SkeletonBlock
                          className={`h-52 ${
                            isDark ? "bg-slate-800" : "bg-slate-100"
                          }`}
                        />
                        <SkeletonBlock
                          className={`mt-4 h-5 w-32 ${
                            isDark ? "bg-slate-800" : "bg-slate-100"
                          }`}
                        />
                        <SkeletonBlock
                          className={`mt-3 h-4 w-full ${
                            isDark ? "bg-slate-800" : "bg-slate-100"
                          }`}
                        />
                        <SkeletonBlock
                          className={`mt-3 h-4 w-24 ${
                            isDark ? "bg-slate-800" : "bg-slate-100"
                          }`}
                        />
                        <SkeletonBlock
                          className={`mt-5 h-11 ${
                            isDark ? "bg-slate-800" : "bg-slate-100"
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <SkeletonBlock
                className={`h-14 w-56 ${
                  isDark ? "bg-slate-900/80" : "bg-white/85"
                }`}
              />
              <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
                <SkeletonBlock
                  className={`h-[16rem] ${
                    isDark ? "bg-slate-900/80" : "bg-white/85"
                  }`}
                />
                <div className="space-y-5">
                  <SkeletonBlock
                    className={`h-28 ${
                      isDark ? "bg-slate-900/80" : "bg-white/85"
                    }`}
                  />
                  <SkeletonBlock
                    className={`h-28 ${
                      isDark ? "bg-slate-900/80" : "bg-white/85"
                    }`}
                  />
                  <SkeletonBlock
                    className={`h-28 ${
                      isDark ? "bg-slate-900/80" : "bg-white/85"
                    }`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={`mt-8 ${isDark ? "bg-slate-950/70" : "bg-white/75"}`}>
          <div className="container mx-auto space-y-6 px-4 py-8">
            <SkeletonBlock
              className={`h-28 ${
                isDark ? "bg-slate-900/80" : "bg-white/85"
              }`}
            />
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <SkeletonBlock
                  key={index}
                  className={`h-36 ${
                    isDark ? "bg-slate-900/80" : "bg-white/85"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const Custom = ({ children }) => {
  const { isLoading } = useLoadUserQuery();

  React.useEffect(() => {
    const reloadKey = `${CHUNK_RELOAD_KEY}:${window.location.pathname}`;
    sessionStorage.removeItem(reloadKey);

    const handleError = (event) => {
      if (isRecoverableChunkError(event.error)) {
        reloadForChunkError();
      }
    };

    const handleUnhandledRejection = (event) => {
      if (isRecoverableChunkError(event.reason)) {
        reloadForChunkError();
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  if (isLoading) {
    return <LoadingSpinner message="Loading Classy Store..." />;
  }
  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<UserShellFallback />}>{children}</Suspense>
    </ChunkErrorBoundary>
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
