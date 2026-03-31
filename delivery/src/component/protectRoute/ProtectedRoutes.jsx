import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

export const DeliveryRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((store) => store.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((store) => store.auth);
  const location = useLocation();

  if (isAuthenticated && location.pathname === "/login") {
    return <Navigate to="/" replace />;
  }

  return children;
};
