// File guide: ProtectedRoutes source file.
// This file belongs to the vendor app architecture and has a focused responsibility within its module/folder.
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

export const VendorRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((store) => store.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
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

  return children;
};
