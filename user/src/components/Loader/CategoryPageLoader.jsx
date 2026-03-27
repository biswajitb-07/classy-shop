import { useLocation } from "react-router-dom";
import PageLoader from "./PageLoader.jsx";

const CategoryPageLoader = ({ isLoading, message = "Loading products..." }) => {
  const location = useLocation();

  if (!location.state?.showProductPageLoader || !isLoading) {
    return null;
  }

  return <PageLoader message={message} />;
};

export default CategoryPageLoader;
