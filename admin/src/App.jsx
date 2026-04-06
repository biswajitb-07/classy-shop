import { lazy } from "react";
import { createBrowserRouter, Navigate, RouterProvider, useLocation, useParams } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

import Home from "./pages/Vendor/vedorPage/Home";
const Login = lazy(() => import("./pages/Vendor/auth/Login"));
const ForgotPassword = lazy(() => import("./pages/Vendor/auth/ForgetPassword"));
import {
  VendorRoute,
  PublicRoute,
} from "./component/protectRoute/ProtectedRoutes";
import MainLayout from "./layout/MainLayout";
const Category = lazy(() => import("./pages/Vendor/category/Category"));
const Profile = lazy(() => import("./pages/Vendor/profile/Profile"));
const CategoryList = lazy(() => import("./pages/Vendor/category/CategoryList"));
const BrandsHub = lazy(() => import("./pages/Vendor/vedorPage/BrandsHub"));
const ProductsHub = lazy(() => import("./pages/Vendor/vedorPage/ProductsHub"));
const Error = lazy(() => import("./component/error/Error"));
const Orders = lazy(() => import("./pages/Vendor/vedorPage/Orders"));
const OrderDetailsPage = lazy(
  () => import("./pages/Vendor/vedorPage/OrderDetailsPage"),
);
const Users = lazy(() => import("./pages/Vendor/vedorPage/community/Users"));
const Admins = lazy(() => import("./pages/Vendor/vedorPage/community/Admins"));
const Vendors = lazy(() => import("./pages/Vendor/vedorPage/community/Vendors"));
const NewsletterSubscribers = lazy(
  () => import("./pages/Vendor/vedorPage/community/NewsletterSubscribers")
);
const Settings = lazy(() => import("./pages/Vendor/Settings"));
const SupportChats = lazy(() => import("./pages/Vendor/vedorPage/SupportChats"));
const SiteContentManager = lazy(
  () => import("./pages/Vendor/vedorPage/SiteContentManager"),
);
const Coupons = lazy(() => import("./pages/Vendor/vedorPage/Coupons"));
const DeliveryPartners = lazy(
  () => import("./pages/Vendor/vedorPage/DeliveryPartners"),
);
const Payouts = lazy(() => import("./pages/Vendor/vedorPage/Payouts"));
const Reports = lazy(() => import("./pages/Vendor/vedorPage/Reports"));
import { getVendorOrderPath } from "./utils/orderRouting";

const LegacyVendorOrderRedirect = () => {
  const { orderId } = useParams();
  const location = useLocation();

  return (
    <Navigate
      replace
      to={getVendorOrderPath({ _id: orderId }, { mode: "query", search: location.search })}
    />
  );
};

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
        path: "/orders/details",
        element: <OrderDetailsPage />,
      },
      {
        path: "/orders/details/:orderSlug",
        element: <OrderDetailsPage />,
      },
      {
        path: "/order/:orderId",
        element: <LegacyVendorOrderRedirect />,
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
        path: "/brands",
        element: <BrandsHub />,
      },
      {
        path: "/products",
        element: <ProductsHub />,
      },
      {
        path: "/fashion-brand-list",
        element: <BrandsHub />,
      },
      {
        path: "/fashion-products",
        element: <ProductsHub />,
      },
      {
        path: "/electronic-brand-list",
        element: <BrandsHub />,
      },
      {
        path: "/electronic-products",
        element: <ProductsHub />,
      },
      {
        path: "/bag-brand-list",
        element: <BrandsHub />,
      },
      {
        path: "/bag-products",
        element: <ProductsHub />,
      },
      {
        path: "/grocery-brand-list",
        element: <BrandsHub />,
      },
      {
        path: "/grocery-products",
        element: <ProductsHub />,
      },
      {
        path: "/footwear-brand-list",
        element: <BrandsHub />,
      },
      {
        path: "/footwear-products",
        element: <ProductsHub />,
      },
      {
        path: "/beauty-brand-list",
        element: <BrandsHub />,
      },
      {
        path: "/beauty-products",
        element: <ProductsHub />,
      },
      {
        path: "/wellness-brand-list",
        element: <BrandsHub />,
      },
      {
        path: "/wellness-products",
        element: <ProductsHub />,
      },
      {
        path: "/jewellery-brand-list",
        element: <BrandsHub />,
      },
      {
        path: "/jewellery-products",
        element: <ProductsHub />,
      },
      {
        path: "/community/admins",
        element: <Admins />,
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
      {
        path: "/coupons",
        element: <Coupons />,
      },
      {
        path: "/delivery-partners",
        element: <DeliveryPartners />,
      },
      {
        path: "/payouts",
        element: <Payouts />,
      },
      {
        path: "/reports",
        element: <Reports />,
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
