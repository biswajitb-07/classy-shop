import { Headset } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const SupportFloatingButton = () => {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname === "/support") {
    return null;
  }

  return (
    <div className="fixed bottom-[9.5rem] right-3 z-40 md:right-4 lg:bottom-[5.2rem] lg:right-5">
      <button
        type="button"
        onClick={() => navigate("/support")}
        className="group ml-auto flex items-center gap-3 rounded-full bg-gradient-to-r from-orange-500 via-rose-500 to-red-500 px-4 py-3 text-sm font-bold text-white shadow-[0_14px_40px_rgba(244,63,94,0.28)] transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-105 hover:shadow-[0_20px_48px_rgba(244,63,94,0.36)] active:scale-95 lg:px-5 lg:py-4"
      >
        <Headset
          size={18}
          className="transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110"
        />
      </button>
    </div>
  );
};

export default SupportFloatingButton;
