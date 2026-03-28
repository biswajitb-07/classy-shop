import { useEffect, useState } from "react";
import { useNavigation } from "react-router-dom";

const RouteTransitionLoader = () => {
  const navigation = useNavigation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (navigation.state === "idle") {
      const timeoutId = window.setTimeout(() => setVisible(false), 180);
      return () => window.clearTimeout(timeoutId);
    }

    const timeoutId = window.setTimeout(() => setVisible(true), 120);
    return () => window.clearTimeout(timeoutId);
  }, [navigation.state]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70]">
      <div className="vendor-route-transition-track h-[3px] overflow-hidden">
        <div className="vendor-route-transition-loader h-full w-[34%] rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#60a5fa_52%,#818cf8_100%)] shadow-[0_0_16px_rgba(96,165,250,0.45)]" />
      </div>
    </div>
  );
};

export default RouteTransitionLoader;
