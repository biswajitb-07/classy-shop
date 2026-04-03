import { createPortal } from "react-dom";
import { useTheme } from "../../context/ThemeContext.jsx";

const PageLoader = ({ message = "Loading products..." }) => {
  const { isDark } = useTheme();

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm ${
        isDark ? "bg-slate-950/55" : "bg-white/55"
      }`}
    >
      <div
        className={`rounded-3xl px-8 py-7 shadow-[0_24px_80px_rgba(15,23,42,0.22)] ${
          isDark
            ? "border border-slate-700 bg-slate-900"
            : "border border-white/80 bg-white"
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="h-12 w-12 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="12" cy="3" r="1.5" fill={isDark ? "#38BDF8" : "#EF4444"} opacity="1" />
                <circle cx="16.95" cy="5.05" r="1.5" fill={isDark ? "#38BDF8" : "#EF4444"} opacity="0.8" />
                <circle cx="21" cy="12" r="1.5" fill={isDark ? "#38BDF8" : "#EF4444"} opacity="0.6" />
                <circle
                  cx="16.95"
                  cy="18.95"
                  r="1.5"
                  fill={isDark ? "#38BDF8" : "#EF4444"}
                  opacity="0.4"
                />
                <circle cx="12" cy="21" r="1.5" fill={isDark ? "#38BDF8" : "#EF4444"} opacity="0.3" />
                <circle cx="7.05" cy="18.95" r="1.5" fill={isDark ? "#38BDF8" : "#EF4444"} opacity="0.2" />
                <circle cx="3" cy="12" r="1.5" fill={isDark ? "#38BDF8" : "#EF4444"} opacity="0.1" />
                <circle cx="7.05" cy="5.05" r="1.5" fill={isDark ? "#38BDF8" : "#EF4444"} opacity="0.05" />
              </svg>
            </div>
          </div>
          {message ? (
            <p className={`text-sm ${isDark ? "text-slate-300" : "text-gray-600"}`}>
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default PageLoader;
