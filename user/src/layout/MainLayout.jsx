import { Outlet } from "react-router-dom";
import Header from "../components/navbar/Header.jsx";
import BottomNav from "../components/navbar/BottomNav.jsx";
import Contact from "../components/contact/Contact.jsx";
import Footer from "../components/footer/Footer.jsx";
import OAuthToast from "../pages/User/auth/OAuthToast.jsx";
import Features from "../components/Features.jsx";
import CategoryPanel from "../components/category/CategoryPanel.jsx";
import SearchPanel from "../components/search/SearchPanel.jsx";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useGetVendorCategoriesQuery } from "../features/api/categoryApi.js";
import ScrollToTop from "../components/router/ScrollToTop.jsx";

const AIChatbotWidget = lazy(() => import("../components/ai/AIChatbotWidget.jsx"));
const SupportFloatingButton = lazy(
  () => import("../components/support/SupportFloatingButton.jsx"),
);

const MainLayout = () => {
  const [visible, setVisible] = useState(true);
  const [isOpenCatPanel, setIsOpenCatPanel] = useState(false);
  const [isOpenSearchPanel, setIsOpenSearchPanel] = useState(false);
  const [shouldRenderAI, setShouldRenderAI] = useState(false);
  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);
  const visibleRef = useRef(true);

  const { data } = useGetVendorCategoriesQuery();
  const categoryData = data?.[0]?.categories || [];

  const openCategoryPanel = () => {
    // One toggle drives both desktop category exposure and the slide-in mobile
    // category drawer so the navigation data stays in sync.
    setIsOpenCatPanel(!isOpenCatPanel);
  };

  const openSearchPanel = () => {
    setIsOpenSearchPanel(!isOpenSearchPanel);
  };

  useEffect(() => {
    // On mobile, updating React state on every scroll frame makes the page feel
    // sticky. We use refs + requestAnimationFrame so header visibility changes
    // only when the direction actually changes.
    const handleScroll = () => {
      const currentScrollPos = window.pageYOffset;

      if (tickingRef.current) return;

      tickingRef.current = true;
      window.requestAnimationFrame(() => {
        const isScrollingUp = currentScrollPos < lastScrollYRef.current;
        const nextVisible = currentScrollPos <= 200 ? true : isScrollingUp;

        if (visibleRef.current !== nextVisible) {
          visibleRef.current = nextVisible;
          setVisible(nextVisible);
        }

        lastScrollYRef.current = currentScrollPos;
        tickingRef.current = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // The AI assistant is helpful, but it does not need to block first paint on
    // every page. Defer loading until the browser is idle or shortly after boot.
    const scheduleRender = () => setShouldRenderAI(true);

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(scheduleRender, {
        timeout: 1200,
      });

      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(scheduleRender, 900);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <>
      <div className="user-shell bg-[var(--app-bg)] text-[var(--app-text)] transition-colors duration-300">
        <ScrollToTop />
        <OAuthToast />
        {/* Header, bottom nav, and category panel all share the same category
            payload so navigation stays consistent on desktop and mobile. */}
        <Header
          visible={visible}
          openCategoryPanel={openCategoryPanel}
          isOpenCatPanel={isOpenCatPanel}
          categories={categoryData}
        />
        <BottomNav
          openSearchPanel={openSearchPanel}
          isOpenSearchPanel={isOpenSearchPanel}
        />
        <CategoryPanel
          openCategoryPanel={openCategoryPanel}
          isOpenCatPanel={isOpenCatPanel}
          categories={categoryData}
        />
        <SearchPanel
          openSearchPanel={openSearchPanel}
          isOpenSearchPanel={isOpenSearchPanel}
        />
      </div>
      <div className="mt-[5rem] md:mt-[5.5rem] lg:mt-[13.5rem] overflow-hidden">
        {/* Keep the content offset stable while the fixed header slides in/out.
            That avoids layout jumps and makes mobile upward scrolling smoother. */}
        {/* Route content is rendered here under the shared storefront chrome. */}
        <Outlet />
      </div>
      {/* The AI widget lives outside Outlet so it remains available across most
          storefront pages without duplicating it in each screen. */}
      {shouldRenderAI ? (
        <Suspense fallback={null}>
          <SupportFloatingButton />
          <AIChatbotWidget />
        </Suspense>
      ) : null}

      <div className="user-shell-muted transition-colors duration-300">
        <Features />
        <Contact />
        <Footer />
      </div>
    </>
  );
};

export default MainLayout;
