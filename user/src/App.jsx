import React, { lazy, useState, useEffect } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { WifiOff } from "lucide-react";
import {
  PublicRoute,
  UserRoute,
} from "./components/protectRoute/ProtectedRoutes.jsx";

const MainLayout = lazy(() => import("./layout/MainLayout.jsx"));
const Home = lazy(() => import("./pages/Home.jsx"));
const Login = lazy(() => import("./pages/User/auth/Login.jsx"));
const Profile = lazy(() => import("./pages/user/profile/Profile.jsx"));
const ForgotPassword = lazy(() => import("./pages/user/auth/ForgetPassword.jsx"));
const Fashion = lazy(() => import("./pages/User/product/fashion/Fashion.jsx"));
const Error = lazy(() => import("./components/error/Error.jsx"));
const FashionProductDetails = lazy(() =>
  import("./pages/User/product/fashion/FashionProductDetails.jsx")
);
const WishlistPage = lazy(() => import("./components/products/WishlistPage.jsx"));
const CartPage = lazy(() => import("./components/shipping/CartPage.jsx"));
const Electronics = lazy(() =>
  import("./pages/User/product/electronic/Electronics.jsx")
);
const ElectronicsProductDetails = lazy(() =>
  import("./pages/User/product/electronic/ElectronicsProductDetails.jsx")
);
const CheckoutPage = lazy(() => import("./pages/User/order/CheckOutPage.jsx"));
const OrderListPage = lazy(() => import("./pages/User/order/OrderListPage.jsx"));
const OrderDetailsPage = lazy(() =>
  import("./pages/User/order/OrderDetailsPage.jsx")
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
    path: "/profile",
    element: (
      <UserRoute>
        <Profile />
      </UserRoute>
    ),
  },
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/product-wishlist",
        element: (
          <UserRoute>
            <WishlistPage />
          </UserRoute>
        ),
      },
      {
        path: "/fashion",
        element: <Fashion />,
      },
      {
        path: "/fashion/:subcategory",
        element: <Fashion />,
      },
      {
        path: "/fashion/:subcategory/:thirdcategory",
        element: <Fashion />,
      },
      {
        path: "/fashion/fashion-product-details/:productId",
        element: <FashionProductDetails />,
      },
      {
        path: "/electronics",
        element: <Electronics />,
      },
      {
        path: "/electronics/:subcategory",
        element: <Electronics />,
      },
      {
        path: "/electronics/:subcategory/:thirdcategory",
        element: <Electronics />,
      },
      {
        path: "/electronics/electronics-product-details/:productId",
        element: <ElectronicsProductDetails />,
      },
      {
        path: "/cart",
        element: (
          <UserRoute>
            <CartPage />
          </UserRoute>
        ),
      },
      {
        path: "/checkout",
        element: (
          <UserRoute>
            <CheckoutPage />
          </UserRoute>
        ),
      },
      {
        path: "/orders",
        element: (
          <UserRoute>
            <OrderListPage />
          </UserRoute>
        ),
      },
      {
        path: "/order/:orderId",
        element: (
          <UserRoute>
            <OrderDetailsPage />
          </UserRoute>
        ),
      },
    ],
  },
  {
    path: "/reset-password",
    element: <ForgotPassword />,
  },
]);

const App = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
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
    <main className="min-h-screen bg-gray-100">
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
