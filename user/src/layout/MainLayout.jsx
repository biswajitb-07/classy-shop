import { Outlet } from "react-router-dom";
import Header from "../components/navbar/Header.jsx";
import BottomNav from "../components/navbar/BottomNav.jsx";
import Contact from "../components/contact/Contact.jsx";
import Footer from "../components/footer/Footer.jsx";
import OAuthToast from "../pages/user/auth/OAuthToast.jsx";
import Features from "../components/Features.jsx";
import CategoryPanel from "../components/category/CategoryPanel.jsx";
import { useEffect, useState } from "react";
import { useGetVendorCategoriesQuery } from "../features/api/categoryApi.js";

const MainLayout = () => {
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [visible, setVisible] = useState(true);
  const [isOpenCatPanel, setIsOpenCatPanel] = useState(false);

  const { data } = useGetVendorCategoriesQuery();
  const categoryData = data?.[0]?.categories || [];

  const openCategoryPanel = () => {
    setIsOpenCatPanel(!isOpenCatPanel);
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.pageYOffset;
      const isScrollingUp = currentScrollPos < prevScrollPos;

      if (currentScrollPos > 200) {
        setVisible(isScrollingUp);
      } else {
        setVisible(true);
      }

      setPrevScrollPos(currentScrollPos);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [prevScrollPos]);

  return (
    <>
      <div>
        <OAuthToast />
        <Header
          visible={visible}
          openCategoryPanel={openCategoryPanel}
          isOpenCatPanel={isOpenCatPanel}
          categories={categoryData}
        />
        <BottomNav />
        <CategoryPanel
          openCategoryPanel={openCategoryPanel}
          isOpenCatPanel={isOpenCatPanel}
          categories={categoryData}
        />
      </div>
      <div
        className={`${
          visible ? "mt-[5rem] md:mt-[5.5rem] lg:mt-[13.5rem] z-0" : "mt-0"
        } overflow-hidden`}
      >
        <Outlet />
      </div>

      <div>
        <Features />
        <Contact />
        <Footer />
      </div>
    </>
  );
};

export default MainLayout;
