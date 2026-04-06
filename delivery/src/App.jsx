import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import Login from "./pages/Delivery/auth/Login";
import Home from "./pages/Delivery/dashboard/Home";
import Orders from "./pages/Delivery/dashboard/Orders";
import OrderDetailsPage from "./pages/Delivery/dashboard/OrderDetailsPage";
import Payouts from "./pages/Delivery/dashboard/Payouts";
import Profile from "./pages/Delivery/profile/Profile";
import {
  DeliveryRoute,
  PublicRoute,
} from "./component/protectRoute/ProtectedRoutes";
import { getDeliveryOrderPath } from "./utils/orderRouting";

const LegacyDeliveryOrderRedirect = () => {
  const { orderId } = useParams();
  const location = useLocation();

  return (
    <Navigate
      replace
      to={getDeliveryOrderPath({ _id: orderId }, { mode: "query", search: location.search })}
    />
  );
};

const App = () => {
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
        <Route path="/orders/details" element={<OrderDetailsPage />} />
        <Route path="/orders/details/:orderSlug" element={<OrderDetailsPage />} />
        <Route path="/orders/:orderId" element={<LegacyDeliveryOrderRedirect />} />
        <Route path="/payouts" element={<Payouts />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  );
};

export default App;
