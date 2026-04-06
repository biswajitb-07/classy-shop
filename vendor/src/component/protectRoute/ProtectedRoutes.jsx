import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useLoadUserQuery } from "../../features/api/authApi";

export const VendorRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((store) => store.auth);
  const { isLoading } = useLoadUserQuery();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((store) => store.auth);
  const { isLoading } = useLoadUserQuery();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const allowLoginMessage =
    params.get("blocked") === "1" || params.get("google") === "blocked";

  if (isLoading) {
    return null;
  }

  if (isAuthenticated && !allowLoginMessage) {
    return <Navigate to="/" replace />;
  }

  return children;
};
