// File guide: ScrollToTop source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [pathname, search]);

  return null;
};

export default ScrollToTop;
