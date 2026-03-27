import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import ScrollToTop from "../router/ScrollToTop.jsx";
import { useLoadUserQuery } from "../../features/api/authApi.js";

export const UserRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((s) => s.auth);
  const { isLoading } = useLoadUserQuery();

  // Auth API se response aane tak wait karo — reload par white page na aaye
  if (isLoading) return null;

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
  const { isLoading } = useLoadUserQuery();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const allowLoginMessage =
    params.get("blocked") === "1" || params.get("google") === "blocked";

  // Auth API se response aane tak wait karo
  if (isLoading) return null;

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
