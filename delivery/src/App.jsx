import { Route, Routes } from "react-router-dom";
import { useLoadUserQuery } from "./features/api/authApi";
import MainLayout from "./layout/MainLayout";
import Login from "./pages/Delivery/auth/Login";
import Home from "./pages/Delivery/dashboard/Home";
import Orders from "./pages/Delivery/dashboard/Orders";
import OrderDetailsPage from "./pages/Delivery/dashboard/OrderDetailsPage";
import Profile from "./pages/Delivery/profile/Profile";
import PageLoader from "./component/Loader/PageLoader";
import {
  DeliveryRoute,
  PublicRoute,
} from "./component/protectRoute/ProtectedRoutes";

const App = () => {
  const { isLoading } = useLoadUserQuery();

  if (isLoading) {
    return <PageLoader message="Preparing delivery dashboard..." />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route
        element={
          <DeliveryRoute>
            <MainLayout />
          </DeliveryRoute>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:orderId" element={<OrderDetailsPage />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  );
};

export default App;
