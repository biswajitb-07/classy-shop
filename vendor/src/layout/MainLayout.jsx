import Sidebar from "../component/Navbar/Sidebar";
import Header from "../component/Navbar/Header";
import { Outlet } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { toggleSidebar } from "../features/authSlice";
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
    dispatch(toggleSidebar());
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Sidebar - fixed */}
      <Sidebar />

      {/* Overlay */}
      {showOverlay && (
        <div
          className={`fixed top-0 left-[18rem] right-0 bottom-0 bg-black z-60 lg:hidden transition-opacity duration-300 ${
            isOpen ? "opacity-40" : "opacity-0 pointer-events-none"
          }`}
          onClick={handleOverlayClick}
        />
      )}

      <div
        className={`h-full overflow-y-auto transition-all duration-300 ${
          isOpen ? "lg:ml-[18rem]" : "ml-0"
        }`}
      >
        <Header />
        <main className="pt-24 px-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
