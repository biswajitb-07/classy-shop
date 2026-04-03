import { lazy } from "react";
import { createBrowserRouter, Navigate, RouterProvider, useLocation, useParams } from "react-router-dom";
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
const Profile = lazy(() => import("./pages/Vendor/profile/Profile"));
const ProductsHub = lazy(() => import("./pages/Vendor/vedorPage/ProductsHub"));
const Error = lazy(() => import("./component/error/Error"));
const Orders = lazy(() => import("./pages/Vendor/vedorPage/Orders"));
const OrderDetailsPage = lazy(
  () => import("./pages/Vendor/vedorPage/OrderDetailsPage"),
);
const Settings = lazy(() => import("./pages/Vendor/Settings"));
const SupportChats = lazy(() => import("./pages/Vendor/vedorPage/SupportChats"));
const Payouts = lazy(() => import("./pages/Vendor/vedorPage/Payouts"));
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
        path: "/products",
        element: <ProductsHub />,
      },
      {
        path: "/fashion-products",
        element: <ProductsHub />,
      },
      {
        path: "/electronic-products",
        element: <ProductsHub />,
      },
      {
        path: "/bag-products",
        element: <ProductsHub />,
      },
      {
        path: "/grocery-products",
        element: <ProductsHub />,
      },
      {
        path: "/footwear-products",
        element: <ProductsHub />,
      },
      {
        path: "/beauty-products",
        element: <ProductsHub />,
      },
      {
        path: "/wellness-products",
        element: <ProductsHub />,
      },
      {
        path: "/jewellery-products",
        element: <ProductsHub />,
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
        path: "/support-chats",
        element: <SupportChats />,
      },
      {
        path: "/payouts",
        element: <Payouts />,
      },
      {
        path: "/settings",
        element: <Settings />,
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
