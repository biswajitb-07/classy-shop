import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { Provider } from "react-redux";
import { appStore } from "./app/store.js";
import LoadingSpinner from "./component/Loader/LoadingSpinner.jsx";
import { useLoadUserQuery } from "./features/api/authApi.js";
import { Suspense } from "react";
import { ThemeProvider } from "./context/ThemeContext.jsx";

const Custom = ({ children }) => {
  const { isLoading } = useLoadUserQuery();

  // Hold the shell until the vendor session is resolved, so protected routes
  // do not flash the wrong state during boot.
  return isLoading ? (
    <LoadingSpinner />
  ) : (
    <Suspense fallback={null}>
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
