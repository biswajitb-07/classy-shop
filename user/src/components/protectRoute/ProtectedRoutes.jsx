import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import ScrollToTop from "../router/ScrollToTop.jsx";

export const UserRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((s) => s.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <ScrollToTop />
      {children}
    </>
  );
};

export const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((store) => store.auth);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const allowLoginMessage =
    params.get("blocked") === "1" || params.get("google") === "blocked";

  if (isAuthenticated && !allowLoginMessage) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <ScrollToTop />
      {children}
    </>
  );
};
