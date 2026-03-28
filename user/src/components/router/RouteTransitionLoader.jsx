import { useEffect, useState } from "react";
import { useNavigation } from "react-router-dom";

const RouteTransitionLoader = () => {
  const navigation = useNavigation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (navigation.state === "idle") {
      const timeoutId = window.setTimeout(() => setVisible(false), 150);
      return () => window.clearTimeout(timeoutId);
    }

    setVisible(true);
    return undefined;
  }, [navigation.state]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[90]">
      <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-transparent">
        <div className="route-transition-loader h-full w-1/3 rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-red-500 shadow-[0_0_18px_rgba(249,115,22,0.45)]" />
      </div>
    </div>
  );
};

export default RouteTransitionLoader;
