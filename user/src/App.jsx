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
const Profile = lazy(() => import("./pages/User/profile/Profile.jsx"));
const Settings = lazy(() => import("./pages/User/Settings.jsx"));
const ForgotPassword = lazy(
  () => import("./pages/User/auth/ForgetPassword.jsx"),
);
const Bag = lazy(() => import("./pages/User/product/bag/Bag.jsx"));
const Grocery = lazy(() => import("./pages/User/product/grocery/Grocery.jsx"));
const Beauty = lazy(() => import("./pages/User/product/beauty/Beauty.jsx"));
const Jewellery = lazy(
  () => import("./pages/User/product/jewellery/Jewellery.jsx"),
);
const Fashion = lazy(() => import("./pages/User/product/fashion/Fashion.jsx"));
const Footwear = lazy(
  () => import("./pages/User/product/footwear/Footwear.jsx"),
);
const Wellness = lazy(
  () => import("./pages/User/product/wellness/Wellness.jsx"),
);
const Error = lazy(() => import("./components/error/Error.jsx"));
const BagProductDetails = lazy(
  () => import("./pages/User/product/bag/BagProductDetails.jsx"),
);
const GroceryProductDetails = lazy(
  () => import("./pages/User/product/grocery/GroceryProductDetails.jsx"),
);
const BeautyProductDetails = lazy(
  () => import("./pages/User/product/beauty/BeautyProductDetails.jsx"),
);
const JewelleryProductDetails = lazy(
  () => import("./pages/User/product/jewellery/JewelleryProductDetails.jsx"),
);
const FashionProductDetails = lazy(
  () => import("./pages/User/product/fashion/FashionProductDetails.jsx"),
);
const FootwearProductDetails = lazy(
  () => import("./pages/User/product/footwear/FootwearProductDetails.jsx"),
);
const WellnessProductDetails = lazy(
  () => import("./pages/User/product/wellness/WellnessProductDetails.jsx"),
);
const WishlistPage = lazy(
  () => import("./components/products/WishlistPage.jsx"),
);
const CartPage = lazy(() => import("./components/shipping/CartPage.jsx"));
const Electronics = lazy(
  () => import("./pages/User/product/electronic/Electronics.jsx"),
);
const ElectronicsProductDetails = lazy(
  () => import("./pages/User/product/electronic/ElectronicsProductDetails.jsx"),
);
const CheckoutPage = lazy(() => import("./pages/User/order/CheckoutPage.jsx"));
const OrderListPage = lazy(
  () => import("./pages/User/order/OrderListPage.jsx"),
);
const OrderDetailsPage = lazy(
  () => import("./pages/User/order/OrderDetailsPage.jsx"),
);
const SearchResultsPage = lazy(
  () => import("./pages/User/SearchResultsPage.jsx"),
);
const InfoPage = lazy(() => import("./pages/User/support/InfoPage.jsx"));
const SupportChatPage = lazy(
  () => import("./pages/User/support/SupportChatPage.jsx"),
);

// The app router keeps public auth pages outside the shared storefront layout,
// while category/product/order pages live under MainLayout.
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
    path: "/reset-password",
    element: <ForgotPassword />,
  },
  {
    path: "/",
    element: <MainLayout />,
    children: [
      // Once the layout is active, nested routes inherit the full storefront
      // chrome instead of rebuilding header/footer on every page.
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/settings",
        element: <Settings />,
      },
      {
        path: "/search",
        element: <SearchResultsPage />,
      },
      {
        path: "/company/:slug",
        element: <InfoPage />,
      },
      {
        path: "/support",
        element: (
          <UserRoute>
            <SupportChatPage />
          </UserRoute>
        ),
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
        path: "/bag",
        element: <Bag />,
      },
      {
        path: "/grocery",
        element: <Grocery />,
      },
      {
        path: "/groceries",
        element: <Grocery />,
      },
      {
        path: "/beauty",
        element: <Beauty />,
      },
      {
        path: "/jewellery",
        element: <Jewellery />,
      },
      {
        path: "/bags",
        element: <Bag />,
      },
      {
        path: "/wellness",
        element: <Wellness />,
      },
      {
        path: "/bag/:subcategory",
        element: <Bag />,
      },
      {
        path: "/grocery/:subcategory",
        element: <Grocery />,
      },
      {
        path: "/groceries/:subcategory",
        element: <Grocery />,
      },
      {
        path: "/beauty/:subcategory",
        element: <Beauty />,
      },
      {
        path: "/jewellery/:subcategory",
        element: <Jewellery />,
      },
      {
        path: "/bags/:subcategory",
        element: <Bag />,
      },
      {
        path: "/wellness/:subcategory",
        element: <Wellness />,
      },
      {
        path: "/bag/:subcategory/:thirdcategory",
        element: <Bag />,
      },
      {
        path: "/grocery/:subcategory/:thirdcategory",
        element: <Grocery />,
      },
      {
        path: "/groceries/:subcategory/:thirdcategory",
        element: <Grocery />,
      },
      {
        path: "/beauty/:subcategory/:thirdcategory",
        element: <Beauty />,
      },
      {
        path: "/jewellery/:subcategory/:thirdcategory",
        element: <Jewellery />,
      },
      {
        path: "/bags/:subcategory/:thirdcategory",
        element: <Bag />,
      },
      {
        path: "/wellness/:subcategory/:thirdcategory",
        element: <Wellness />,
      },
      {
        path: "/bag/bag-product-details/:productId",
        element: <BagProductDetails />,
      },
      {
        path: "/grocery/grocery-product-details/:productId",
        element: <GroceryProductDetails />,
      },
      {
        path: "/groceries/grocery-product-details/:productId",
        element: <GroceryProductDetails />,
      },
      {
        path: "/beauty/beauty-product-details/:productId",
        element: <BeautyProductDetails />,
      },
      {
        path: "/jewellery/jewellery-product-details/:productId",
        element: <JewelleryProductDetails />,
      },
      {
        path: "/bags/bag-product-details/:productId",
        element: <BagProductDetails />,
      },
      {
        path: "/wellness/wellness-product-details/:productId",
        element: <WellnessProductDetails />,
      },
      {
        path: "/fashion",
        element: <Fashion />,
      },
      {
        path: "/footwear",
        element: <Footwear />,
      },
      {
        path: "/fashion/:subcategory",
        element: <Fashion />,
      },
      {
        path: "/footwear/:subcategory",
        element: <Footwear />,
      },
      {
        path: "/fashion/:subcategory/:thirdcategory",
        element: <Fashion />,
      },
      {
        path: "/footwear/:subcategory/:thirdcategory",
        element: <Footwear />,
      },
      {
        path: "/fashion/fashion-product-details/:productId",
        element: <FashionProductDetails />,
      },
      {
        path: "/footwear/footwear-product-details/:productId",
        element: <FootwearProductDetails />,
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
]);

const App = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // We surface browser online/offline state globally so the storefront can
    // fail gracefully before users hit broken network requests.
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
        // A dedicated offline screen is less confusing than rendering pages
        // that depend on data the browser cannot fetch at all.
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
