import Sidebar from "../component/Navbar/Sidebar";
import Header from "../component/Navbar/Header";
import { Outlet } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { setSidebarOpen } from "../features/authSlice";
import { useState, useEffect } from "react";

const MainLayout = () => {
  const { isOpen } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowOverlay(true);
    } else {
      const timeout = setTimeout(() => setShowOverlay(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  const handleOverlayClick = () => {
    dispatch(setSidebarOpen(false));
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[var(--app-bg)] text-[var(--app-text)] transition-colors duration-300">
      {/* Sidebar - fixed */}
      <Sidebar />

      {/* Overlay */}
      {showOverlay && (
        <div
          className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ${
            isOpen ? "opacity-40" : "opacity-0 pointer-events-none"
          }`}
          onClick={handleOverlayClick}
        />
      )}

      <div className="h-full overflow-y-auto">
        <Header />
        <main className="pt-24 px-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
