import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Suspense } from "react";
import "./index.css";
import App from "./App";
import { appStore } from "./app/store";
import { useLoadUserQuery } from "./features/api/authApi";

document.documentElement.setAttribute("data-theme", "dark");

const SkeletonBlock = ({ className, style }) => (
  <div className={`animate-pulse rounded-[24px] ${className}`} style={style} />
);

const DeliveryShellFallback = () => (
  <div className="min-h-screen bg-[linear-gradient(180deg,#050816_0%,#0f172a_52%,#111827_100%)] text-slate-100">
    <div className="fixed inset-x-0 top-0 z-10 h-[5.5rem] border-b border-slate-800 bg-slate-950/95" />
    <main className="px-4 pb-8 pt-28 sm:px-5 lg:px-7">
      <div className="space-y-6">
        <section className="rounded-[1.75rem] border border-slate-800 bg-slate-950/70 p-5 shadow-[0_20px_45px_rgba(2,6,23,0.35)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <SkeletonBlock className="h-3 w-24 bg-slate-800" />
              <SkeletonBlock className="h-10 w-72 bg-slate-900" />
              <SkeletonBlock className="h-4 w-[28rem] max-w-full bg-slate-900" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-4"
                >
                  <SkeletonBlock className="h-3 w-20 bg-slate-800" />
                  <SkeletonBlock className="mt-3 h-8 w-16 bg-slate-800" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[1.5rem] border border-slate-800 bg-slate-900/70 p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <SkeletonBlock className="h-6 w-40 bg-slate-800" />
                    <SkeletonBlock className="h-8 w-28 rounded-full bg-slate-800" />
                  </div>
                  <SkeletonBlock className="h-4 w-52 bg-slate-900" />
                  <SkeletonBlock className="h-4 w-64 bg-slate-900" />
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[22rem]">
                  {Array.from({ length: 3 }).map((__, cardIndex) => (
                    <div key={cardIndex} className="rounded-2xl bg-slate-950 px-4 py-3">
                      <SkeletonBlock className="h-3 w-16 bg-slate-800" />
                      <SkeletonBlock className="mt-3 h-5 w-24 bg-slate-800" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5 flex items-center justify-end">
                <SkeletonBlock className="h-10 w-32 rounded-2xl bg-indigo-500/25" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  </div>
);

const AppBoot = ({ children }) => {
  const { isLoading } = useLoadUserQuery();

  if (isLoading) {
    return <DeliveryShellFallback />;
  }

  return <Suspense fallback={<DeliveryShellFallback />}>{children}</Suspense>;
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={appStore}>
      <BrowserRouter>
        <AppBoot>
          <App />
        </AppBoot>
        <Toaster position="top-right" />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
