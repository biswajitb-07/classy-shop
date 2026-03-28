import { useEffect, useState } from "react";
import { useNavigation } from "react-router-dom";
import PageLoader from "../Loader/PageLoader.jsx";

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

  return <PageLoader message="Loading page..." />;
};

export default RouteTransitionLoader;
