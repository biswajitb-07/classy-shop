import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Route changes should snap instantly to the top. On mobile, forcing a
    // smooth animation during navigation can make the UI feel laggy.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, search]);

  return null;
};

export default ScrollToTop;
