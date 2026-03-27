import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";

export default function OAuthToast() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const status = searchParams.get("google");
    const blocked = searchParams.get("blocked");
    const msg = searchParams.get("message");

    if (status === "success") {
      toast.success(decodeURIComponent(msg || "Welcome to Falcon Shop!"));
    } else if (status === "error") {
      toast.error(decodeURIComponent(msg || "Google login failed"));
    } else if (blocked === "1" || status === "blocked") {
      toast.error(
        decodeURIComponent(
          msg || "Your account has been blocked plz contact customer care"
        )
      );
    }

    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  return null;
}
