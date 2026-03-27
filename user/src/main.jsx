import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { Provider } from "react-redux";
import { appStore } from "./app/store.js";
import { useLoadUserQuery } from "./features/api/authApi.js";
import { Suspense } from "react";
import LoadingSpinner from "./components/Loader/LoadingSpinner.jsx";

const Custom = ({ children }) => {
  const { isLoading } = useLoadUserQuery();

  if (isLoading) {
    return <LoadingSpinner />;
  }
  return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>;
};

createRoot(document.getElementById("root")).render(
  <Provider store={appStore}>
    <Custom>
      <App />
    </Custom>
  </Provider>
);
