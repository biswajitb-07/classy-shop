import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaCreditCard,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaShoppingBag,
  FaTag,
  FaWallet,
} from "react-icons/fa";
import { FiCheck, FiMapPin, FiPlus } from "react-icons/fi";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { useGetCartQuery } from "../../../features/api/cartApi.js";
import {
  useConfirmPaymentMutation,
  useCreateOrderMutation,
  useValidateCouponMutation,
} from "../../../features/api/orderApi.js";
import {
  useLoadUserQuery,
  useUpdateUserAddressesMutation,
} from "../../../features/api/authApi.js";
import PageLoader from "../../../components/Loader/PageLoader.jsx";
import AuthButtonLoader from "../../../components/Loader/AuthButtonLoader.jsx";
import ErrorMessage from "../../../components/error/ErrorMessage.jsx";
import {
  clearBuyNowCheckout,
  persistBuyNowCheckout,
  readBuyNowCheckout,
} from "../../../utils/buyNow.js";

const emptyShippingAddress = {
  type: "home",
  label: "",
  fullName: "",
  addressLine1: "",
  landmark: "",
  village: "",
  city: "",
  district: "",
  state: "",
  postalCode: "",
  country: "India",
  phone: "",
  location: {
    latitude: null,
    longitude: null,
    label: "",
    source: "",
    updatedAt: null,
  },
};

const normalizeAddress = (address = {}, fallbackUser = {}) => ({
  type: String(address.type || "home").toLowerCase(),
  label: String(address.label || "").trim(),
  fullName: String(address.fullName || fallbackUser?.name || "").trim(),
  addressLine1: String(address.addressLine1 || "").trim(),
  landmark: String(address.landmark || "").trim(),
  village: String(address.village || "").trim(),
  city: String(address.city || "").trim(),
  district: String(address.district || "").trim(),
  state: String(address.state || "").trim(),
  postalCode: String(address.postalCode || "").trim(),
  country: String(address.country || "India").trim(),
  phone: String(address.phone || fallbackUser?.phone || "").trim(),
  location: {
    latitude:
      address?.location?.latitude !== null &&
      address?.location?.latitude !== undefined
        ? Number(address.location.latitude)
        : null,
    longitude:
      address?.location?.longitude !== null &&
      address?.location?.longitude !== undefined
        ? Number(address.location.longitude)
        : null,
    label: String(address?.location?.label || "").trim(),
    source: String(address?.location?.source || "").trim(),
    updatedAt: address?.location?.updatedAt || null,
  },
});

const buildAddressBookPayload = ({ currentAddress, savedAddresses, selectedIndex }) => {
  const normalizedCurrent = normalizeAddress(currentAddress);
  const nextAddresses = Array.isArray(savedAddresses) ? [...savedAddresses] : [];

  if (selectedIndex !== null && selectedIndex >= 0 && nextAddresses[selectedIndex]) {
    nextAddresses[selectedIndex] = {
      ...nextAddresses[selectedIndex],
      ...normalizedCurrent,
      isDefault: true,
    };
  } else {
    nextAddresses.unshift({
      ...normalizedCurrent,
      isDefault: true,
    });
  }

  return nextAddresses.map((address, index) => ({
    ...normalizeAddress(address),
    isDefault: index === 0,
  }));
};

const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const { refetch: refetchUser } = useLoadUserQuery();

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
  const [updateUserAddresses, { isLoading: savingAddresses }] =
    useUpdateUserAddressesMutation();

  const savedAddresses = user?.addresses || [];
  const defaultSavedAddress =
    savedAddresses.find((address) => address.isDefault) || savedAddresses[0];

  const [selectedAddressIndex, setSelectedAddressIndex] = useState(
    defaultSavedAddress
      ? savedAddresses.findIndex((address) => address === defaultSavedAddress)
      : null,
  );
  const [hasManualAddressChanges, setHasManualAddressChanges] = useState(false);
  const [shippingAddress, setShippingAddress] = useState(() =>
    normalizeAddress(defaultSavedAddress || emptyShippingAddress, user),
  );
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [useWallet, setUseWallet] = useState(false);
  const [pricingPreview, setPricingPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [buyNowItems, setBuyNowItems] = useState(() => {
    const stateItems =
      Array.isArray(location.state?.buyNowItems) && location.state.buyNowItems.length
        ? location.state.buyNowItems
        : [];
    if (stateItems.length) return stateItems;
    return new URLSearchParams(location.search).get("mode") === "buy-now"
      ? readBuyNowCheckout()
      : [];
  });

  const cart = cartData?.cart || [];
  const walletBalance = Number(user?.wallet?.balance || 0);
  const isBuyNowMode = useMemo(
    () => new URLSearchParams(location.search).get("mode") === "buy-now",
    [location.search],
  );

  useEffect(() => {
    if (!isBuyNowMode) {
      clearBuyNowCheckout();
      setBuyNowItems([]);
      return;
    }

    const nextItems =
      Array.isArray(location.state?.buyNowItems) && location.state.buyNowItems.length
        ? location.state.buyNowItems
        : readBuyNowCheckout();

    setBuyNowItems(nextItems);

    if (nextItems.length) {
      persistBuyNowCheckout(nextItems);
    }
  }, [isBuyNowMode, location.state]);

  const checkoutItems = useMemo(() => {
    if (buyNowItems.length) {
      return buyNowItems.map((item) => ({
        product: {
          discountedPrice: Number(item.price || 0),
          name: item.productName || "",
        },
        variants: [
          {
            variant: item.variant || "default",
            quantity: Number(item.quantity || 1),
          },
        ],
      }));
    }

    return cart;
  }, [buyNowItems, cart]);

  const isBuyNowCheckout = buyNowItems.length > 0;

  const subtotal = useMemo(
    () =>
      checkoutItems.reduce(
        (total, group) =>
          total +
          group.variants.reduce(
            (sum, variant) =>
              sum + Number(group.product.discountedPrice || 0) * variant.quantity,
            0,
          ),
        0,
      ),
    [checkoutItems],
  );

  const totalItems = useMemo(
    () =>
      checkoutItems.reduce(
        (total, group) =>
          total + group.variants.reduce((sum, variant) => sum + variant.quantity, 0),
        0,
      ),
    [checkoutItems],
  );

  const discountAmount = Number(
    pricingPreview?.discountAmount ?? appliedCoupon?.discountAmount ?? 0,
  );
  const walletUsed = Number(pricingPreview?.walletAmountUsed || 0);
  const totalAmount = Number(
    pricingPreview?.totalAmount ?? Math.max(0, subtotal - discountAmount - walletUsed),
  );
  const effectivePaymentMethod =
    totalAmount === 0 && walletUsed > 0 ? "wallet" : paymentMethod;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (hasManualAddressChanges) return;

    const nextDefault =
      savedAddresses.find((address) => address.isDefault) || savedAddresses[0];

    if (!nextDefault) {
      setSelectedAddressIndex(null);
      setShippingAddress(normalizeAddress(emptyShippingAddress, user));
      return;
    }

    const defaultIndex = savedAddresses.findIndex((address) => address === nextDefault);
    setSelectedAddressIndex(defaultIndex);
    setShippingAddress(normalizeAddress(nextDefault, user));
  }, [hasManualAddressChanges, user?.addresses, user?.name, user?.phone]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setHasManualAddressChanges(true);
    setShippingAddress((prev) => ({ ...prev, [name]: value }));
  };

  const refreshPricing = async ({
    nextCouponCode = appliedCoupon?.code || "",
    nextUseWallet = useWallet,
  } = {}) => {
    if (!checkoutItems.length) return;

    try {
      const response = await validateCoupon({
        code: nextCouponCode,
        useWallet: nextUseWallet,
        items: isBuyNowCheckout ? buyNowItems : undefined,
      }).unwrap();
      setPricingPreview({
        subtotalAmount: response.subtotalAmount,
        discountAmount: response.discountAmount,
        walletAmountUsed: response.walletAmountUsed,
        totalAmount: response.totalAmount,
      });
      if (response.coupon) {
        setAppliedCoupon(response.coupon);
      } else if (!nextCouponCode) {
        setAppliedCoupon(null);
      }
    } catch (error) {
      setPricingPreview(null);
      if (nextCouponCode) {
        setAppliedCoupon(null);
      }
      toast.error(error?.data?.message || "Failed to update pricing");
    }
  };

  const handleSelectSavedAddress = (index) => {
    setSelectedAddressIndex(index);
    setHasManualAddressChanges(false);
    setShippingAddress(normalizeAddress(savedAddresses[index], user));
  };

  const handleCreateNewAddress = () => {
    setSelectedAddressIndex(null);
    setHasManualAddressChanges(false);
    setShippingAddress(
      normalizeAddress(
        {
          ...emptyShippingAddress,
          fullName: user?.name || "",
          phone: user?.phone || "",
        },
        user,
      ),
    );
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
    clearBuyNowCheckout();

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
      const result = await validateCoupon({
        code: normalizedCode,
        useWallet,
        items: isBuyNowCheckout ? buyNowItems : undefined,
      }).unwrap();
      setAppliedCoupon(result?.coupon || null);
      setCouponCode(result?.coupon?.code || normalizedCode);
      setPricingPreview({
        subtotalAmount: result.subtotalAmount,
        discountAmount: result.discountAmount,
        walletAmountUsed: result.walletAmountUsed,
        totalAmount: result.totalAmount,
      });
      toast.success(result?.message || "Coupon applied");
    } catch (error) {
      setAppliedCoupon(null);
      setPricingPreview(null);
      toast.error(error?.data?.message || "Failed to apply coupon");
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponCode("");
    setAppliedCoupon(null);
    if (useWallet) {
      await refreshPricing({ nextCouponCode: "", nextUseWallet: true });
    } else {
      setPricingPreview(null);
    }
  };

  const handleToggleWallet = async () => {
    const nextUseWallet = !useWallet;
    setUseWallet(nextUseWallet);

    if (!nextUseWallet && !appliedCoupon) {
      setPricingPreview(null);
      return;
    }

    await refreshPricing({
      nextCouponCode: appliedCoupon?.code || "",
      nextUseWallet,
    });
  };

  const handleSaveAddress = async () => {
    if (!validateAddress()) return;

    try {
      const nextAddresses = buildAddressBookPayload({
        currentAddress: shippingAddress,
        savedAddresses,
        selectedIndex: selectedAddressIndex,
      });
      await updateUserAddresses(nextAddresses).unwrap();
      setHasManualAddressChanges(false);
      toast.success(
        selectedAddressIndex !== null
          ? "Saved address updated"
          : "New address saved successfully",
      );
      setSelectedAddressIndex(0);
    } catch (error) {
      toast.error(error?.data?.message || "Failed to save address");
    }
  };

  const handlePlaceOrder = async () => {
    if (!validateAddress()) return;

    setLoading(true);
    let shouldResetLoading = true;

    try {
      const response = await createOrder({
        shippingAddress,
        paymentMethod: effectivePaymentMethod,
        couponCode: appliedCoupon?.code || "",
        useWallet,
        items: isBuyNowCheckout ? buyNowItems : undefined,
      }).unwrap();

      if (effectivePaymentMethod === "cod" || effectivePaymentMethod === "wallet") {
        await refetchUser();
        toast.success(
          effectivePaymentMethod === "wallet"
            ? "Order placed using wallet successfully!"
            : "Order placed successfully!",
        );
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
                items: isBuyNowCheckout ? buyNowItems : undefined,
              }).unwrap();
              await refetchUser();
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
            email: user?.email,
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

  if (cartError && !isBuyNowCheckout) return <ErrorMessage onRetry={refetchCart} />;

  if (cartLoading && !isBuyNowCheckout) {
    return <PageLoader message="Loading checkout..." />;
  }

  if (!checkoutItems.length) {
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
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h1 className="text-lg md:text-2xl font-bold text-gray-800 flex items-center gap-3">
              <FaShoppingBag className="text-red-500" />
              Checkout
            </h1>
            <div className="flex items-center gap-3">
              <div className="bg-white px-4 py-2 rounded-full shadow-md">
                <span className="text-sm text-gray-600 font-medium">
                  {totalItems} {totalItems === 1 ? "item" : "items"}
                </span>
              </div>
              <div className="bg-emerald-50 px-4 py-2 rounded-full shadow-sm">
                <span className="text-sm font-semibold text-emerald-700">
                  Wallet Rs {walletBalance.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <div className="w-24 h-1 bg-gradient-to-r from-red-500 to-pink-500 rounded-full" />
        </div>

        <div className="grid lg:grid-cols-6 gap-8">
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FaMapMarkerAlt className="text-red-500" />
                  Saved Addresses
                </h3>
                <button
                  type="button"
                  onClick={handleCreateNewAddress}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-red-300 hover:text-red-500"
                >
                  <FiPlus />
                  Add New Address
                </button>
              </div>

              {savedAddresses.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {savedAddresses.map((address, index) => {
                    const isSelected = index === selectedAddressIndex;

                    return (
                      <button
                        key={`${address._id || "address"}_${index}`}
                        type="button"
                        onClick={() => handleSelectSavedAddress(index)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          isSelected
                            ? "border-red-500 bg-red-50 shadow-md"
                            : "border-gray-200 bg-white hover:border-red-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
                              {address.label || address.type || "Address"}
                            </p>
                            <h4 className="mt-2 text-base font-bold text-gray-900">
                              {address.fullName || user?.name || "Saved address"}
                            </h4>
                          </div>
                          {isSelected ? (
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white">
                              <FiCheck />
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm text-gray-600">
                          {[address.addressLine1, address.village, address.city, address.state]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {address.phone || user?.phone || "Phone missing"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                  Abhi koi saved address nahi hai. Neeche form fill karke first address save kar sakte ho.
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FiMapPin className="text-red-500" />
                  Delivery Address + Map Pin
                </h3>
                <button
                  type="button"
                  onClick={handleSaveAddress}
                  disabled={savingAddresses}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {savingAddresses ? "Saving..." : "Save Address"}
                </button>
              </div>

              <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Type
                  </label>
                  <select
                    name="type"
                    value={shippingAddress.type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-red-500"
                  >
                    <option value="home">Home</option>
                    <option value="work">Work</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    name="label"
                    value={shippingAddress.label}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-red-500"
                    placeholder="Home / Office / Hostel"
                  />
                </div>
                <div className="md:col-span-2">
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
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    name="addressLine1"
                    value={shippingAddress.addressLine1}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-red-500"
                    placeholder="House no, street, area"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Landmark
                  </label>
                  <input
                    type="text"
                    name="landmark"
                    value={shippingAddress.landmark}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-red-500"
                    placeholder="Near temple, school, mall"
                  />
                </div>
                {["village", "city", "district", "state", "postalCode", "country", "phone"].map((field) => (
                  <div key={field} className={field === "phone" ? "md:col-span-2" : ""}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field === "postalCode"
                        ? "Postal Code"
                        : field.charAt(0).toUpperCase() + field.slice(1)}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={field === "phone" ? "tel" : "text"}
                      name={field}
                      value={shippingAddress[field]}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-red-500"
                      placeholder={field === "phone" ? "+91 9876543210" : ""}
                    />
                  </div>
                ))}
              </form>

            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FaCreditCard className="text-red-500" />
                Payment Method
              </h3>
              {walletUsed > 0 ? (
                <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  Wallet se Rs {walletUsed.toLocaleString()} apply ho raha hai.
                  {totalAmount === 0
                    ? " Is order ko aapka wallet poora cover kar raha hai."
                    : ` Remaining payable Rs ${totalAmount.toLocaleString()}.`}
                </div>
              ) : null}
              <div className="space-y-4">
                <label className="flex items-center justify-between gap-3 p-4 border border-gray-300 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={useWallet}
                      onChange={handleToggleWallet}
                      disabled={!walletBalance || couponLoading}
                      className="h-4 w-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                    />
                    <div className="flex items-center gap-2">
                      <FaWallet className="text-emerald-500" />
                      <span className="font-medium text-gray-800">
                        Use wallet balance
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700">
                    Rs {walletBalance.toLocaleString()}
                  </span>
                </label>

                {totalAmount > 0 ? (
                  <>
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
                  </>
                ) : (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-700">
                    Wallet payment selected automatically because remaining total is Rs 0.
                  </div>
                )}
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
                  <></>
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
                  <div className="flex justify-between text-gray-600">
                    <span>Wallet Applied</span>
                    <span className="font-medium text-emerald-600">
                      - Rs {walletUsed.toLocaleString()}
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
                  {loading || createLoading ? (
                    <AuthButtonLoader />
                  ) : effectivePaymentMethod === "wallet" ? (
                    "Place Order with Wallet"
                  ) : (
                    "Place Order"
                  )}
                </button>

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="space-y-2 text-sm text-gray-500">
                    <div className="flex items-center justify-between">
                      <span>Payment mode</span>
                      <span className="font-semibold text-gray-800">
                        {effectivePaymentMethod === "wallet"
                          ? "Wallet"
                          : paymentMethod === "cod"
                            ? "Cash on Delivery"
                            : "Razorpay"}
                      </span>
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
