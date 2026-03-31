import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCreditCard,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaShoppingBag,
  FaTag,
} from "react-icons/fa";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { useGetCartQuery } from "../../../features/api/cartApi.js";
import {
  useConfirmPaymentMutation,
  useCreateOrderMutation,
  useValidateCouponMutation,
} from "../../../features/api/orderApi.js";
import PageLoader from "../../../components/Loader/PageLoader.jsx";
import AuthButtonLoader from "../../../components/Loader/AuthButtonLoader.jsx";
import ErrorMessage from "../../../components/error/ErrorMessage.jsx";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const {
    data: cartData,
    isLoading: cartLoading,
    isError: cartError,
    refetch: refetchCart,
  } = useGetCartQuery();
  const [createOrder, { isLoading: createLoading }] = useCreateOrderMutation();
  const [confirmPayment] = useConfirmPaymentMutation();
  const [validateCoupon, { isLoading: couponLoading }] =
    useValidateCouponMutation();

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
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [loading, setLoading] = useState(false);

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (total, group) =>
          total +
          group.variants.reduce(
            (sum, variant) =>
              sum + Number(group.product.discountedPrice || 0) * variant.quantity,
            0,
          ),
        0,
      ),
    [cart],
  );

  const totalItems = useMemo(
    () =>
      cart.reduce(
        (total, group) =>
          total + group.variants.reduce((sum, variant) => sum + variant.quantity, 0),
        0,
      ),
    [cart],
  );

  const discountAmount = Number(appliedCoupon?.discountAmount || 0);
  const totalAmount = Math.max(0, subtotal - discountAmount);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!appliedCoupon) return;
    setAppliedCoupon(null);
  }, [subtotal, totalItems]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setShippingAddress((prev) => ({ ...prev, [name]: value }));
  };

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const redirectToOrder = (orderId) => {
    if (!orderId) {
      navigate("/orders", { replace: true });
      return;
    }

    navigate("/cart", { replace: true });
    window.setTimeout(() => {
      navigate(`/order/${orderId}`);
    }, 0);
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

    for (const field of requiredFields) {
      const value = (shippingAddress[field] || "").toString();
      if (!value.trim()) {
        toast.error(
          `Please fill in ${field.replace(/([A-Z])/g, " $1").trim()}`,
        );
        return false;
      }
    }

    return true;
  };

  const handleApplyCoupon = async () => {
    const normalizedCode = couponCode.trim().toUpperCase();
    if (!normalizedCode) {
      toast.error("Enter a coupon code");
      return;
    }

    try {
      const result = await validateCoupon({ code: normalizedCode }).unwrap();
      setAppliedCoupon(result?.coupon || null);
      setCouponCode(result?.coupon?.code || normalizedCode);
      toast.success(result?.message || "Coupon applied");
    } catch (error) {
      setAppliedCoupon(null);
      toast.error(error?.data?.message || "Failed to apply coupon");
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setAppliedCoupon(null);
  };

  const handlePlaceOrder = async () => {
    if (!validateAddress()) return;

    setLoading(true);
    let shouldResetLoading = true;

    try {
      const response = await createOrder({
        shippingAddress,
        paymentMethod,
        couponCode: appliedCoupon?.code || "",
      }).unwrap();

      if (paymentMethod === "cod") {
        toast.success("Order placed successfully!");
        redirectToOrder(response?.order?._id);
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
              const confirmedOrder = await confirmPayment({
                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                razorpay_order_id: razorpayResponse.razorpay_order_id,
                razorpay_signature: razorpayResponse.razorpay_signature,
              }).unwrap();
              toast.success("Payment successful! Order confirmed.");
              redirectToOrder(confirmedOrder?.order?._id);
            } catch (error) {
              setLoading(false);
              toast.error(
                error?.data?.message || "Payment confirmation failed",
              );
            }
          },
          prefill: {
            name: shippingAddress.fullName,
            email: user.email,
            contact: shippingAddress.phone,
          },
          modal: {
            ondismiss: () => {
              setLoading(false);
            },
          },
          theme: { color: "#F56565" },
        };

        const rzp = new window.Razorpay(options);
        shouldResetLoading = false;
        rzp.on("payment.failed", () => {
          setLoading(false);
        });
        rzp.open();
      }
    } catch (error) {
      toast.error(error?.data?.message || "Failed to place order");
    } finally {
      if (shouldResetLoading) {
        setLoading(false);
      }
    }
  };

  if (cartError) return <ErrorMessage onRetry={refetchCart} />;

  if (cartLoading) {
    return <PageLoader message="Loading checkout..." />;
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
      {(createLoading || loading) && (
        <PageLoader message="Placing your order..." />
      )}
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
          <div className="w-24 h-1 bg-gradient-to-r from-red-500 to-pink-500 rounded-full" />
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
            <div className="sticky top-8 space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FaTag className="text-red-500" />
                  <h3 className="text-lg font-bold text-gray-800">Coupon Code</h3>
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                    placeholder="ENTER CODE"
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading}
                    className="rounded-xl bg-red-500 px-4 py-3 font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
                  >
                    {couponLoading ? "Applying..." : "Apply"}
                  </button>
                </div>

                {appliedCoupon ? (
                  <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-green-700">
                          {appliedCoupon.code} applied
                        </p>
                        <p className="text-sm text-green-600">
                          You saved Rs {discountAmount.toLocaleString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-sm font-semibold text-green-700 underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-gray-500">
                    Create coupons from the vendor dashboard and apply them here.
                  </p>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  Order Summary
                </h3>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({totalItems} items)</span>
                    <span>Rs {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className="text-green-500 font-medium">Free</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Coupon Discount</span>
                    <span className="font-medium text-green-600">
                      - Rs {discountAmount.toLocaleString()}
                    </span>
                  </div>
                  <hr className="border-gray-200" />
                  <div className="flex justify-between text-xl font-bold text-gray-800">
                    <span>Total</span>
                    <span className="text-red-500">
                      Rs {totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={loading || createLoading}
                  className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {loading || createLoading ? <AuthButtonLoader /> : "Place Order"}
                </button>

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      Secure Payment
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
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
