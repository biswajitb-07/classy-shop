import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaShoppingBag,
  FaMapMarkerAlt,
  FaCreditCard,
  FaMoneyBillWave,
} from "react-icons/fa";
import { useGetCartQuery } from "../../../features/api/cartApi.js";
import {
  useCreateOrderMutation,
  useConfirmPaymentMutation,
} from "../../../features/api/orderApi.js";
import PageLoader from "../../../components/Loader/PageLoader.jsx";
import AuthButtonLoader from "../../../components/Loader/AuthButtonLoader.jsx";
import { toast } from "react-hot-toast";
import ErrorMessage from "../../../components/error/ErrorMessage.jsx";
import { useSelector } from "react-redux";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);

  const {
    data: cartData,
    isLoading: cartLoading,
    isError: cartError,
    refetch: refetchCart,
  } = useGetCartQuery();
  const [createOrder, { isLoading: createLoading }] = useCreateOrderMutation();
  const [confirmPayment] = useConfirmPaymentMutation();

  const cart = cartData?.cart || [];
  const [shippingAddress, setShippingAddress] = useState({
    fullName: user?.name?.toString() || "",
    addressLine1: "",
    village: (user?.addresses?.[0]?.village?.toString() || "").toString() || "",
    city: (user?.addresses?.[0]?.city?.toString() || "").toString() || "",
    district:
      (user?.addresses?.[0]?.district?.toString() || "").toString() || "",
    state: (user?.addresses?.[0]?.state?.toString() || "").toString() || "",
    postalCode:
      (user?.addresses?.[0]?.postalCode?.toString() || "").toString() || "",
    country:
      (user?.addresses?.[0]?.country?.toString() || "India").toString() || "",
    phone: (user?.phone?.toString() || "").toString() || "",
  });
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    console.log("Initial shippingAddress:", shippingAddress);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShippingAddress((prev) => ({ ...prev, [name]: value }));
  };

  const calculateSubtotal = () =>
    cart.reduce(
      (total, group) =>
        total +
        group.variants.reduce(
          (sub, v) => sub + group.product.discountedPrice * v.quantity,
          0
        ),
      0
    );

  const totalItems = cart.reduce(
    (total, group) =>
      total + group.variants.reduce((sub, v) => sub + v.quantity, 0),
    0
  );

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async () => {
    if (!validateAddress()) return;

    setLoading(true);
    try {
      const response = await createOrder({
        shippingAddress,
        paymentMethod,
      }).unwrap();

      if (paymentMethod === "cod") {
        toast.success("Order placed successfully!");
        refetchCart();
        navigate("/orders");
      } else {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          toast.error("Failed to load Razorpay SDK");
          return;
        }

        const options = {
          key: response.key,
          amount: response.amount,
          currency: response.currency,
          name: "ClassyShop",
          description: "Order Payment",
          order_id: response.razorpayOrderId,
          handler: async (razorpayResponse) => {
            try {
              await confirmPayment({
                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                razorpay_order_id: razorpayResponse.razorpay_order_id,
                razorpay_signature: razorpayResponse.razorpay_signature,
              }).unwrap();
              toast.success("Payment successful! Order confirmed.");
              refetchCart();
              navigate("/orders");
            } catch (err) {
              toast.error("Payment confirmation failed");
            }
          },
          prefill: {
            name: shippingAddress.fullName,
            email: user.email,
            contact: shippingAddress.phone,
          },
          theme: { color: "#F56565" },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  const validateAddress = () => {
    const requiredFields = [
      "fullName",
      "village",
      "city",
      "district",
      "state",
      "postalCode",
      "country",
      "phone",
    ];
    for (let field of requiredFields) {
      const value = (shippingAddress[field] || "").toString();
      if (!value.trim()) {
        toast.error(
          `Please fill in ${field.replace(/([A-Z])/g, " $1").trim()}`
        );
        return false;
      }
    }
    return true;
  };

  if (cartError) return <ErrorMessage onRetry={refetchCart} />;

  if (cartLoading || createLoading || loading) {
    return (
      <div className="h-[26rem] grid place-items-center bg-gradient-to-br from-gray-50 to-gray-100">
        <PageLoader message="Loading checkout..." />
      </div>
    );
  }

  if (!cart.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center bg-white rounded-2xl shadow-xl p-8">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-red-100 to-pink-100 rounded-full flex items-center justify-center">
              <FaShoppingBag className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Your cart is empty
            </h2>
            <p className="text-gray-600 mb-8">
              Add items to proceed to checkout
            </p>
            <button
              onClick={() => navigate("/")}
              className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg cursor-pointer"
            >
              Start Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-[7rem]">
      <div className="container">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg md:text-2xl font-bold text-gray-800 flex items-center gap-3">
              <FaShoppingBag className="text-red-500" />
              Checkout
            </h1>
            <div className="bg-white px-4 py-2 rounded-full shadow-md">
              <span className="text-sm text-gray-600 font-medium">
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </span>
            </div>
          </div>
          <div className="w-24 h-1 bg-gradient-to-r from-red-500 to-pink-500 rounded-full"></div>
        </div>

        <div className="grid lg:grid-cols-6 gap-8">
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FaMapMarkerAlt className="text-red-500" />
                Shipping Address
              </h3>
              <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={shippingAddress.fullName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-red-500"
                    placeholder="John Doe"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 1 (optional)
                  </label>
                  <input
                    type="text"
                    name="addressLine1"
                    value={shippingAddress.addressLine1}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-red-500"
                    placeholder="123 Main Street"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Village <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="village"
                    value={shippingAddress.village}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-red-500"
                    placeholder="Village Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={shippingAddress.city}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-red-500"
                    placeholder="Mumbai"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    District <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="district"
                    value={shippingAddress.district}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-red-500"
                    placeholder="District Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={shippingAddress.state}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-red-500"
                    placeholder="Maharashtra"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    value={shippingAddress.postalCode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-red-500"
                    placeholder="400001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={shippingAddress.country}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-red-500"
                    placeholder="India"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={shippingAddress.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-red-500"
                    placeholder="+91 9876543210"
                  />
                </div>
              </form>

              <div className="mt-8">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <FaCreditCard className="text-red-500" />
                  Payment Method
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 p-4 border border-gray-300 rounded-xl cursor-pointer hover:border-red-500 transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                      className="form-radio text-red-500"
                    />
                    <div className="flex items-center gap-2">
                      <FaMoneyBillWave className="text-green-500" />
                      <span className="font-medium text-gray-800">
                        Cash on Delivery
                      </span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 border border-gray-300 rounded-xl cursor-pointer hover:border-red-500 transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="razorpay"
                      checked={paymentMethod === "razorpay"}
                      onChange={() => setPaymentMethod("razorpay")}
                      className="form-radio text-red-500"
                    />
                    <div className="flex items-center gap-2">
                      <FaCreditCard className="text-blue-500" />
                      <span className="font-medium text-gray-800">
                        Pay with Razorpay
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="sticky top-8">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Order Summary
                </h3>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Items ({totalItems})</span>
                    <span>₹{calculateSubtotal().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className="text-green-500 font-medium">Free</span>
                  </div>
                  <hr className="border-gray-200" />
                  <div className="flex justify-between text-xl font-bold text-gray-800">
                    <span>Total</span>
                    <span className="text-red-500">
                      ₹{calculateSubtotal().toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {loading ? <AuthButtonLoader /> : "Place Order"}
                </button>

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Secure Payment
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Free Returns
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
