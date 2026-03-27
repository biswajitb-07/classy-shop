import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { Provider } from "react-redux";
import { appStore } from "./app/store.js";
import { useLoadUserQuery } from "./features/api/authApi.js";
import { Suspense } from "react";
import LoadingSpinner from "./components/Loader/LoadingSpinner.jsx";

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
    return <LoadingSpinner />;
  }
  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
    </ChunkErrorBoundary>
  );
};

createRoot(document.getElementById("root")).render(
  <Provider store={appStore}>
    <Custom>
      <App />
    </Custom>
  </Provider>
);
