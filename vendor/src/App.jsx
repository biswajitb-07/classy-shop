import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

import Home from "./pages/Vendor/vedorPage/Home";
import Login from "./pages/Vendor/auth/Login";
import {
  VendorRoute,
  PublicRoute,
} from "./component/protectRoute/ProtectedRoutes";
import MainLayout from "./layout/MainLayout";
import AddProduct from "./component/product/AddProduct";
import Category from "./pages/Vendor/category/Category";
import Profile from "./pages/Vendor/profile/Profile";
import CategoryList from "./pages/Vendor/category/CategoryList";
import FashionBrandManager from "./pages/Vendor/vedorPage/fashion/FashionBrandManager";
import ShowAllFashionProduct from "./pages/Vendor/vedorPage/fashion/ShowAllFashionProduct";
import ElectronicBrandManager from "./pages/Vendor/vedorPage/electronic/ElectronicBrandManager";
import Error from "./component/error/Error";
import ShowAllElectronicProduct from "./pages/Vendor/vedorPage/electronic/ShowAllElectronicProduct";
import BagBrandManager from "./pages/Vendor/vedorPage/bag/BagBrandManager";
import GroceryBrandManager from "./pages/Vendor/vedorPage/grocery/GroceryBrandManager";
import FootwearBrandManager from "./pages/Vendor/vedorPage/footwear/FootwearBrandManager";
import BeautyBrandManager from "./pages/Vendor/vedorPage/beauty/BeautyBrandManager";
import WellnessBrandManager from "./pages/Vendor/vedorPage/wellness/wellnessBrandManager";
import JewelleryBrandManager from "./pages/Vendor/vedorPage/jewellery/jewelleryBrandManager";
import ShowAllBagProduct from "./pages/Vendor/vedorPage/bag/ShowAllBagProduct";
import Orders from "./pages/Vendor/vedorPage/Orders";
import OrderDetailsPage from "./pages/Vendor/vedorPage/OrderDetailsPage";

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
    path: "/",
    element: (
      <VendorRoute>
        <MainLayout />
      </VendorRoute>
    ),
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
        element: (
            <OrderDetailsPage />
        ),
      },
      {
        path: "/add-product",
        element: <AddProduct />,
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
        path: "/footwear-brand-list",
        element: <FootwearBrandManager />,
      },
      {
        path: "/beauty-brand-list",
        element: <BeautyBrandManager />,
      },
      {
        path: "/wellness-brand-list",
        element: <WellnessBrandManager/>
      },
      {
        path: "/jewellery-brand-list",
        element: <JewelleryBrandManager/>
      },
    ],
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
