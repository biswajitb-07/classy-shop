import { useCallback, useEffect } from "react";

/** Make an open mobile drawer dismissible with the browser's Back button. */
const useBackDismissibleOverlay = (isOpen, closeOverlay, overlayId) => {
  useEffect(() => {
    if (!isOpen) return undefined;

    const currentState = window.history.state || {};
    if (currentState.__storeOverlay !== overlayId) {
      window.history.pushState(
        { ...currentState, __storeOverlay: overlayId },
        "",
        window.location.href,
      );
    }

    const handlePopState = () => {
      if (window.history.state?.__storeOverlay !== overlayId) {
        closeOverlay();
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [closeOverlay, isOpen, overlayId]);

  return useCallback(() => {
    if (window.history.state?.__storeOverlay === overlayId) {
      window.history.back();
    } else {
      closeOverlay();
    }
  }, [closeOverlay, overlayId]);
};

export default useBackDismissibleOverlay;
