import { useEffect, useMemo } from "react";
import { useGetSiteContentQuery } from "../features/api/contentApi.js";

let lastResolvedSiteContent = null;

export const useStableSiteContent = () => {
  const query = useGetSiteContentQuery();
  const liveContent = query.data?.content ?? null;

  useEffect(() => {
    if (liveContent) {
      lastResolvedSiteContent = liveContent;
    }
  }, [liveContent]);

  const content = useMemo(() => {
    return liveContent || lastResolvedSiteContent;
  }, [liveContent]);

  return {
    ...query,
    content,
  };
};

export default useStableSiteContent;
