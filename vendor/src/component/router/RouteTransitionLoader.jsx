import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

const RouteTransitionLoader = () => {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return undefined;
    }

    setVisible(true);
    const timeoutId = window.setTimeout(() => setVisible(false), 520);
    return () => window.clearTimeout(timeoutId);
  }, [location.pathname, location.search, location.hash]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70]">
      <div className="vendor-route-transition-track h-[7px] overflow-hidden">
        <div className="vendor-route-transition-loader vendor-route-transition-bar h-full w-[46%] rounded-full" />
      </div>
    </div>
  );
};

export default RouteTransitionLoader;
