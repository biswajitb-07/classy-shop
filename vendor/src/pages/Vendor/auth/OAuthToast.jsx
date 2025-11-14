import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";

export default function OAuthToast() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const status = searchParams.get("google");
    const msg = searchParams.get("message");

    if (status === "success") {
      toast.success(decodeURIComponent(msg || "Welcome to Falcon Shop!"));
    } else if (status === "error") {
      toast.error(decodeURIComponent(msg || "Google login failed"));
    }

    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  return null;
}
