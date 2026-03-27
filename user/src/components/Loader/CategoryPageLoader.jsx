import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import PageLoader from "./PageLoader.jsx";

const CategoryPageLoader = ({ isLoading, message = "Loading products..." }) => {
  const location = useLocation();

  if (!location.state?.showProductPageLoader || !isLoading) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/78 backdrop-blur-sm">
      <PageLoader message={message} />
    </div>,
    document.body,
  );
};

export default CategoryPageLoader;
