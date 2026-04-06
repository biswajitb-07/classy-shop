import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useLoadUserQuery } from "../../features/api/authApi";

export const DeliveryRoute = ({ children }) => {
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

  if (isLoading) {
    return null;
  }

  if (isAuthenticated && location.pathname === "/login") {
    return <Navigate to="/" replace />;
  }

  return children;
};
