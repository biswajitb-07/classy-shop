import { lazy } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

const Home = lazy(() => import("./pages/Vendor/vedorPage/Home"));
const Login = lazy(() => import("./pages/Vendor/auth/Login"));
const ForgotPassword = lazy(() => import("./pages/Vendor/auth/ForgetPassword"));
import {
  VendorRoute,
  PublicRoute,
} from "./component/protectRoute/ProtectedRoutes";
const MainLayout = lazy(() => import("./layout/MainLayout"));
const Category = lazy(() => import("./pages/Vendor/category/Category"));
const Profile = lazy(() => import("./pages/Vendor/profile/Profile"));
const CategoryList = lazy(() => import("./pages/Vendor/category/CategoryList"));
const FashionBrandManager = lazy(
  () => import("./pages/Vendor/vedorPage/fashion/FashionBrandManager"),
);
const ShowAllFashionProduct = lazy(
  () => import("./pages/Vendor/vedorPage/fashion/ShowAllFashionProduct"),
);
const ElectronicBrandManager = lazy(
  () => import("./pages/Vendor/vedorPage/electronic/ElectronicBrandManager"),
);
const Error = lazy(() => import("./component/error/Error"));
const ShowAllElectronicProduct = lazy(
  () => import("./pages/Vendor/vedorPage/electronic/ShowAllElectronicProduct"),
);
const BagBrandManager = lazy(
  () => import("./pages/Vendor/vedorPage/bag/BagBrandManager"),
);
const GroceryBrandManager = lazy(
  () => import("./pages/Vendor/vedorPage/grocery/GroceryBrandManager"),
);
const FootwearBrandManager = lazy(
  () => import("./pages/Vendor/vedorPage/footwear/FootwearBrandManager"),
);
const ShowAllGroceryProduct = lazy(
  () => import("./pages/Vendor/vedorPage/grocery/ShowAllGroceryProduct"),
);
const ShowAllFootwearProduct = lazy(
  () => import("./pages/Vendor/vedorPage/footwear/ShowAllFootwearProduct"),
);
const BeautyBrandManager = lazy(
  () => import("./pages/Vendor/vedorPage/beauty/BeautyBrandManager"),
);
const WellnessBrandManager = lazy(
  () => import("./pages/Vendor/vedorPage/wellness/wellnessBrandManager"),
);
const ShowAllBeautyProduct = lazy(
  () => import("./pages/Vendor/vedorPage/beauty/ShowAllBeautyProduct"),
);
const ShowAllWellnessProduct = lazy(
  () => import("./pages/Vendor/vedorPage/wellness/ShowAllWellnessProduct"),
);
const JewelleryBrandManager = lazy(
  () => import("./pages/Vendor/vedorPage/jewellery/jewelleryBrandManager"),
);
const ShowAllJewelleryProduct = lazy(
  () => import("./pages/Vendor/vedorPage/jewellery/ShowAllJewelleryProduct"),
);
const ShowAllBagProduct = lazy(
  () => import("./pages/Vendor/vedorPage/bag/ShowAllBagProduct"),
);
const Orders = lazy(() => import("./pages/Vendor/vedorPage/Orders"));
const OrderDetailsPage = lazy(
  () => import("./pages/Vendor/vedorPage/OrderDetailsPage"),
);
const Users = lazy(() => import("./pages/Vendor/vedorPage/community/Users"));
const Vendors = lazy(() => import("./pages/Vendor/vedorPage/community/Vendors"));
const NewsletterSubscribers = lazy(
  () => import("./pages/Vendor/vedorPage/community/NewsletterSubscribers")
);
const Settings = lazy(() => import("./pages/Vendor/Settings"));
const SupportChats = lazy(() => import("./pages/Vendor/vedorPage/SupportChats"));
const SiteContentManager = lazy(
  () => import("./pages/Vendor/vedorPage/SiteContentManager"),
);

const appRouter = createBrowserRouter([
  {
    path: "*",
    element: <Error />,
  },
  {
    path: "/login",
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
    ),
  },
  {
    path: "/reset-password",
    element: (
      <PublicRoute>
        <ForgotPassword />
      </PublicRoute>
    ),
  },
  {
    path: "/",
    element: (
      <VendorRoute>
        <MainLayout />
      </VendorRoute>
    ),
    // Once authenticated, vendors stay inside the dashboard shell and switch
    // between analytics, catalog, orders, support, and settings as child routes.
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/profile",
        element: <Profile />,
      },
      {
        path: "/orders",
        element: <Orders />,
      },
      {
        path: "/order/:orderId",
        element: <OrderDetailsPage />,
      },
      {
        path: "/category",
        element: <Category />,
      },
      {
        path: "/category-list",
        element: <CategoryList />,
      },
      {
        path: "/fashion-brand-list",
        element: <FashionBrandManager />,
      },
      {
        path: "/fashion-products",
        element: <ShowAllFashionProduct />,
      },
      {
        path: "/electronic-brand-list",
        element: <ElectronicBrandManager />,
      },
      {
        path: "/electronic-products",
        element: <ShowAllElectronicProduct />,
      },
      {
        path: "/bag-brand-list",
        element: <BagBrandManager />,
      },
      {
        path: "/bag-products",
        element: <ShowAllBagProduct />,
      },
      {
        path: "/grocery-brand-list",
        element: <GroceryBrandManager />,
      },
      {
        path: "/grocery-products",
        element: <ShowAllGroceryProduct />,
      },
      {
        path: "/footwear-brand-list",
        element: <FootwearBrandManager />,
      },
      {
        path: "/footwear-products",
        element: <ShowAllFootwearProduct />,
      },
      {
        path: "/beauty-brand-list",
        element: <BeautyBrandManager />,
      },
      {
        path: "/beauty-products",
        element: <ShowAllBeautyProduct />,
      },
      {
        path: "/wellness-brand-list",
        element: <WellnessBrandManager />,
      },
      {
        path: "/wellness-products",
        element: <ShowAllWellnessProduct />,
      },
      {
        path: "/jewellery-brand-list",
        element: <JewelleryBrandManager />,
      },
      {
        path: "/jewellery-products",
        element: <ShowAllJewelleryProduct />,
      },
      {
        path: "/community/users",
        element: <Users />,
      },
      {
        path: "/community/vendors",
        element: <Vendors />,
      },
      {
        path: "/community/newsletter",
        element: <NewsletterSubscribers />,
      },
      {
        path: "/settings",
        element: <Settings />,
      },
      {
        path: "/support-chats",
        element: <SupportChats />,
      },
      {
        path: "/site-content",
        element: <SiteContentManager />,
      },
    ],
  },
]);

const App = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // The vendor dashboard uses the same global connectivity guard so actions
    // like order updates or support replies do not fail silently when offline.
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Back online!", { position: "top-center", duration: 3000 });
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error("No internet connection", {
        position: "top-center",
        duration: 5000,
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] transition-colors duration-300">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2000,
        }}
      />
      {isOnline ? (
        <RouterProvider router={appRouter} />
      ) : (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white">
          <WifiOff
            className="w-28 h-28 text-sky-400 animate-pulse"
            strokeWidth={0.5}
          />
          <h1 className="mt-6 text-3xl font-bold tracking-tight">
            You're offline
          </h1>
          <p className="mt-2 text-slate-300 text-center max-w-xs">
            Check your connection to continue using the site.
          </p>
        </div>
      )}
    </main>
  );
};

export default App;
