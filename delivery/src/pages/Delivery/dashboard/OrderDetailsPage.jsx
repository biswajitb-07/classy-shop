import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Ban,
  Clock3,
  MapPin,
  PackageCheck,
  RotateCcw,
} from "lucide-react";
import {
  useGetAssignedOrdersQuery,
  useSendDeliveryCompletionOtpMutation,
  useUpdateOrderStatusMutation,
  useVerifyDeliveryCompletionOtpMutation,
} from "../../../features/api/orderApi";
import PageLoader from "../../../component/Loader/PageLoader";
import ErrorMessage from "../../../component/error/ErrorMessage";
import AuthButtonLoader from "../../../component/Loader/AuthButtonLoader";
import ConfirmDialog from "../../../component/ConfirmDialog";
import { resolveDeliveryOrderIdFromRoute } from "../../../utils/orderRouting";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatStatus = (value) =>
  String(value || "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDateTime = (value) => {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getMapUrl = (latitude, longitude) =>
  `https://www.google.com/maps?q=${latitude},${longitude}`;

const INDIA_BOUNDS = {
  minLatitude: 6,
  maxLatitude: 38.5,
  minLongitude: 68,
  maxLongitude: 98,
};

const buildDirectionsUrl = (origin, destination) => {
  if (!hasCoordinate(destination?.latitude, destination?.longitude)) return "";

  if (hasCoordinate(origin?.latitude, origin?.longitude)) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`;
};

const hasCoordinate = (latitude, longitude) =>
  latitude !== null &&
  latitude !== undefined &&
  longitude !== null &&
  longitude !== undefined;

const isWithinIndiaBounds = (location) =>
  hasCoordinate(location?.latitude, location?.longitude) &&
  Number(location.latitude) >= INDIA_BOUNDS.minLatitude &&
  Number(location.latitude) <= INDIA_BOUNDS.maxLatitude &&
  Number(location.longitude) >= INDIA_BOUNDS.minLongitude &&
  Number(location.longitude) <= INDIA_BOUNDS.maxLongitude;

const toRadians = (value) => (Number(value) * Math.PI) / 180;

const calculateDistanceKm = (origin, destination) => {
  if (
    !hasCoordinate(origin?.latitude, origin?.longitude) ||
    !hasCoordinate(destination?.latitude, destination?.longitude)
  ) {
    return null;
  }

  const earthRadiusKm = 6371;
  const latDiff = toRadians(destination.latitude - origin.latitude);
  const lonDiff = toRadians(destination.longitude - origin.longitude);
  const a =
    Math.sin(latDiff / 2) * Math.sin(latDiff / 2) +
    Math.cos(toRadians(origin.latitude)) *
      Math.cos(toRadians(destination.latitude)) *
      Math.sin(lonDiff / 2) *
      Math.sin(lonDiff / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((earthRadiusKm * c).toFixed(1));
};

const formatDistance = (distanceKm) => {
  if (distanceKm === null || distanceKm === undefined) return "Route syncing";
  if (distanceKm < 1) return `${Math.max(100, Math.round(distanceKm * 1000))} m left`;
  return `${distanceKm.toFixed(1)} km left`;
};

const estimateEtaMinutes = (distanceKm, speedMetersPerSecond) => {
  if (!Number.isFinite(Number(distanceKm))) return null;

  const liveSpeedKmh =
    speedMetersPerSecond !== null &&
    speedMetersPerSecond !== undefined &&
    Number(speedMetersPerSecond) > 0
      ? Number(speedMetersPerSecond) * 3.6
      : 24;

  return Math.max(3, Math.round((Number(distanceKm) / liveSpeedKmh) * 60));
};

const formatEta = (etaMinutes) => {
  if (!etaMinutes) return "ETA updating";
  if (etaMinutes < 60) return `${etaMinutes} mins`;

  const hours = Math.floor(etaMinutes / 60);
  const minutes = etaMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
};

const formatRelativePingTime = (value) => {
  if (!value) return "Waiting for live ping";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Waiting for live ping";

  const diffMs = Date.now() - date.getTime();
  if (diffMs <= 0) return "Last updated just now";

  const diffSeconds = Math.round(diffMs / 1000);
  if (diffSeconds < 10) return "Last updated just now";
  if (diffSeconds < 60) return `Last updated ${diffSeconds} sec ago`;

  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `Last updated ${diffMinutes} min ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Last updated ${diffHours} hr ago`;

  return `Last updated ${Math.round(diffHours / 24)} day ago`;
};

const sanitizeTrackingPoints = (points = [], restrictToIndia = false) =>
  (points || [])
    .filter((point) => hasCoordinate(point?.latitude, point?.longitude))
    .filter((point) => !restrictToIndia || isWithinIndiaBounds(point))
    .map((point) => ({
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
      at: point.at || point.updatedAt || null,
    }));

const getResolvedTrackingLocation = ({
  liveLocation,
  trailPoints = [],
  currentLocation,
  restrictToIndia = false,
}) => {
  const candidates = [
    liveLocation,
    ...(Array.isArray(trailPoints) ? [...trailPoints].reverse() : []),
    currentLocation,
  ].filter((point) => hasCoordinate(point?.latitude, point?.longitude));

  const validCandidate = candidates.find(
    (point) => !restrictToIndia || isWithinIndiaBounds(point)
  );

  return validCandidate || null;
};

const getDistanceTrend = ({ trailPoints = [], currentLocation, destination }) => {
  if (!hasCoordinate(destination?.latitude, destination?.longitude)) {
    return {
      label: "Waiting for route",
      detail: "Customer pin sync hote hi movement direction update hogi.",
      tone: "neutral",
    };
  }

  const normalizedTrail = sanitizeTrackingPoints([...(trailPoints || []), currentLocation]);
  const uniqueTrail = normalizedTrail.filter((point, index, list) => {
    const previous = list[index - 1];
    if (!previous) return true;
    return (
      Number(previous.latitude).toFixed(5) !== Number(point.latitude).toFixed(5) ||
      Number(previous.longitude).toFixed(5) !== Number(point.longitude).toFixed(5)
    );
  });

  if (uniqueTrail.length < 2) {
    return {
      label: "Waiting for movement",
      detail: "Next live ping ke baad movement direction show hogi.",
      tone: "neutral",
    };
  }

  const latestPoint = uniqueTrail[uniqueTrail.length - 1];
  const previousPoint = uniqueTrail[uniqueTrail.length - 2];
  const latestDistance = calculateDistanceKm(latestPoint, destination);
  const previousDistance = calculateDistanceKm(previousPoint, destination);

  if (latestDistance === null || previousDistance === null) {
    return {
      label: "Checking movement",
      detail: "Latest route data analyse ho raha hai.",
      tone: "neutral",
    };
  }

  const deltaKm = Number((previousDistance - latestDistance).toFixed(2));
  const deltaMeters = Math.round(Math.abs(deltaKm) * 1000);

  if (deltaKm > 0.05) {
    return {
      label: "Approaching customer",
      detail: `Last update me aap lagbhag ${deltaMeters} m aur paas aaye ho.`,
      tone: "approaching",
    };
  }

  if (deltaKm < -0.05) {
    return {
      label: "Moving away",
      detail: `Last update me route se lagbhag ${deltaMeters} m door gaye ho.`,
      tone: "away",
    };
  }

  return {
    label: "Holding nearby",
    detail: "Movement stable hai, next ping par fresh direction milegi.",
    tone: "steady",
  };
};

const getNearbyState = (distanceKm, isTrackingActive) => {
  if (!Number.isFinite(Number(distanceKm))) {
    return {
      label: isTrackingActive ? "Waiting for route" : "Waiting for ping",
      detail: isTrackingActive
        ? "Road route sync hote hi nearby state update hogi."
        : "Tracking restart hote hi nearby state dikhegi.",
      tone: "neutral",
      priority: false,
    };
  }

  if (distanceKm <= 0.03) {
    return {
      label: "Arriving now",
      detail: "Aap customer drop point ke bilkul paas ho.",
      tone: "arrived",
      priority: true,
    };
  }

  if (distanceKm <= 0.1) {
    return {
      label: "Within 100 m",
      detail: "Customer handoff point bahut paas hai.",
      tone: "nearby",
      priority: true,
    };
  }

  if (distanceKm <= 0.5) {
    return {
      label: "Within 500 m",
      detail: "Customer drop point nearby hai.",
      tone: "nearby",
      priority: true,
    };
  }

  return {
    label: "En route",
    detail: "Aap route par ho aur destination ki taraf move kar rahe ho.",
    tone: "neutral",
    priority: false,
  };
};

const getTrackingMilestones = (status, isTrackingActive) => {
  const normalizedStatus = String(status || "");
  const isReturnTrip = normalizedStatus === "return_approved";

  return isReturnTrip
    ? [
        { label: "Pickup approved", done: true, active: false },
        {
          label: "Return in transit",
          done: normalizedStatus === "return_completed",
          active: normalizedStatus === "return_approved" || isTrackingActive,
        },
        {
          label: "Return closed",
          done: normalizedStatus === "return_completed",
          active: normalizedStatus === "return_completed",
        },
      ]
    : [
        { label: "Ready to dispatch", done: true, active: false },
        {
          label: "Rider en route",
          done: normalizedStatus === "delivered",
          active: normalizedStatus === "out_for_delivery" || isTrackingActive,
        },
        {
          label: "Delivered",
          done: normalizedStatus === "delivered",
          active: normalizedStatus === "delivered",
        },
      ];
};

const OrderDetailsPage = () => {
  const navigate = useNavigate();
  const { orderId: routeOrderId, orderSlug } = useParams();
  const [searchParams] = useSearchParams();
  const orderId = resolveDeliveryOrderIdFromRoute({
    routeOrderId,
    orderSlug,
    searchParams,
  });
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useGetAssignedOrdersQuery();
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpMeta, setOtpMeta] = useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [sendDeliveryCompletionOtp, { isLoading: isSendingOtp }] =
    useSendDeliveryCompletionOtpMutation();
  const [updateOrderStatus, { isLoading: isUpdatingStatus }] =
    useUpdateOrderStatusMutation();
  const [verifyDeliveryCompletionOtp, { isLoading: isVerifyingOtp }] =
    useVerifyDeliveryCompletionOtpMutation();

  const order = useMemo(
    () => (data?.orders || []).find((item) => item._id === orderId),
    [data?.orders, orderId]
  );

  const timeline = useMemo(() => {
    if (!order) return [];

    const entries = [...(order.statusHistory || [])].sort(
      (a, b) => new Date(a.at || 0) - new Date(b.at || 0)
    );

    if (!entries.length) {
      return [
        {
          to: order.orderStatus,
          at: order.updatedAt || order.createdAt,
          reason: "Assigned order loaded into delivery dashboard",
        },
      ];
    }

    return entries;
  }, [order]);

  const canMarkDelivered = order?.orderStatus === "out_for_delivery";
  const canCancelOrder = ["processing", "shipped", "out_for_delivery"].includes(
    order?.orderStatus
  );
  const canCompleteReturn = order?.orderStatus === "return_approved";
  const otpPurpose = canCompleteReturn ? "return" : "delivery";
  const isReturnRequested = order?.orderStatus === "return_requested";

  const handleSendOtp = async () => {
    try {
      const response = await sendDeliveryCompletionOtp(orderId).unwrap();
      setOtpMeta(response?.deliveryConfirmation || null);
      setOtpCode("");
      setOtpDialogOpen(true);
      toast.success(
        response?.message ||
          (canCompleteReturn ? "Return OTP sent" : "Delivery OTP sent")
      );
    } catch (error) {
      toast.error(error?.data?.message || "Failed to send delivery OTP");
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      toast.error("Please enter OTP");
      return;
    }

    try {
      await verifyDeliveryCompletionOtp({
        orderId,
        otp: otpCode.trim(),
      }).unwrap();
      toast.success(
        canCompleteReturn
          ? "OTP verified and return pickup completed"
          : "OTP verified and order marked delivered"
      );
      setOtpDialogOpen(false);
      setOtpCode("");
      setOtpMeta(null);
      refetch();
    } catch (error) {
      toast.error(error?.data?.message || "OTP verification failed");
    }
  };

  const handleStatusUpdate = async ({
    status,
    reason,
    successMessage,
  }) => {
    try {
      await updateOrderStatus({
        orderId,
        body: {
          status,
          reason,
        },
      }).unwrap();
      toast.success(successMessage);
      refetch();
    } catch (error) {
      toast.error(error?.data?.message || "Status update failed");
    }
  };

  if (isLoading) {
    return <PageLoader message="Loading order details..." />;
  }

  if (isError) {
    return (
      <ErrorMessage
        message="Order details load nahi ho pa rahe."
        onRetry={refetch}
      />
    );
  }

  if (!order) {
    return (
      <ErrorMessage title="Order not found" message="Ye order aapko assign nahi hai." />
    );
  }

  const timelineMoments = timeline.slice(-4).reverse();

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/orders")}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
      >
        <ArrowLeft size={16} />
        Back to orders
      </button>

      <div className="grid gap-6 xl:grid-cols-[1.28fr_0.72fr]">
        <section className="order-2 rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6 xl:order-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                Order details
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white">#{order.orderId}</h1>
            </div>
            <span className="rounded-full bg-indigo-500/15 px-4 py-2 text-sm font-medium text-indigo-200">
              {formatStatus(order.orderStatus)}
            </span>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-600">
                Customer
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {order.shippingAddress?.fullName}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {order.shippingAddress?.phone}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-600">
                Order value
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {formatCurrency(order.totalAmount)}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Payment: {String(order.paymentMethod || "").toUpperCase()}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="flex items-center gap-3">
              <MapPin className="text-indigo-300" size={20} />
              <h2 className="text-lg font-semibold text-white">Delivery address</h2>
            </div>
            <div className="mt-4 space-y-1 text-sm text-slate-300">
              <p>{order.shippingAddress?.addressLine1}</p>
              <p>
                {order.shippingAddress?.village}, {order.shippingAddress?.city},{" "}
                {order.shippingAddress?.district}
              </p>
              <p>
                {order.shippingAddress?.state} - {order.shippingAddress?.postalCode}
              </p>
              <p>{order.shippingAddress?.country}</p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
            <h2 className="text-lg font-semibold text-white">Items</h2>
            <div className="mt-4 space-y-3">
              {order.items?.map((item, index) => (
                <div
                  key={`${item.productId}_${index}`}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-4"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={item.product?.image?.[0] || "/logo-light.png"}
                      alt={item.product?.name || "Product"}
                      className="h-16 w-16 rounded-2xl object-cover"
                    />
                    <div>
                      <p className="font-semibold text-white">
                        {item.product?.name || "Product"}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Qty: {item.quantity} • {item.productType}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    {formatCurrency(item.subtotal)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="order-1 space-y-6 xl:order-1">
          <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Delivery progress</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Live map tracking completely remove kar diya gaya hai. Ab delivery handling
                  status updates, OTP verification, aur return actions se manage hoga.
                </p>
              </div>
              <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-200">
                {formatStatus(order.orderStatus)}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-600">
                  Delivery stage
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {canCompleteReturn
                    ? "Return pickup"
                    : canMarkDelivered
                    ? "Final delivery"
                    : "Order handling"}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-600">
                  Customer
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {order.shippingAddress?.fullName || "Customer"}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-600">
                  Destination
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {order.shippingAddress?.city}, {order.shippingAddress?.state}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-600">
                  Last update
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {formatDateTime(order.updatedAt || order.createdAt)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {timelineMoments.length ? (
                timelineMoments.map((entry, index) => (
                  <div
                    key={`${entry.to || entry.at || index}`}
                    className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-600">
                      {formatStatus(entry.to || order.orderStatus)}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {entry.reason || "Status updated successfully."}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatDateTime(entry.at || order.updatedAt || order.createdAt)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-700 px-5 py-10 text-center text-sm text-slate-500 md:col-span-2">
                  Timeline updates abhi kam hain. Jaise-jaise status change hoga, summary
                  yahan dikh jayegi.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-lg font-semibold text-white">Quick delivery actions</h2>
            <div className="mt-5 grid gap-3">
              {canMarkDelivered ? (
                <button
                  onClick={handleSendOtp}
                  disabled={!canMarkDelivered || isSendingOtp || isVerifyingOtp}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSendingOtp && canMarkDelivered ? (
                    <AuthButtonLoader className="border-slate-950/30 border-t-slate-950" />
                  ) : (
                    <PackageCheck size={18} />
                  )}
                  Send Delivery OTP
                </button>
              ) : null}

              {canCancelOrder ? (
                <button
                  onClick={() => setCancelDialogOpen(true)}
                  disabled={isUpdatingStatus || isSendingOtp || isVerifyingOtp}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUpdatingStatus ? <AuthButtonLoader /> : <Ban size={18} />}
                  Cancel Order
                </button>
              ) : null}

              {canCompleteReturn ? (
                <button
                  onClick={handleSendOtp}
                  disabled={!canCompleteReturn || isSendingOtp || isVerifyingOtp}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSendingOtp && canCompleteReturn ? (
                    <AuthButtonLoader className="border-slate-950/30 border-t-slate-950" />
                  ) : (
                    <RotateCcw size={18} />
                  )}
                  Send Return Pickup OTP
                </button>
              ) : null}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              {canMarkDelivered
                ? "Customer ke email par OTP jayega. Package handover ke baad OTP verify karne par hi order delivered mark hoga."
                : canCompleteReturn
                ? "Vendor ne return approve kar diya hai. Return package receive karne ke baad OTP verify karne par hi pickup complete hoga."
                : isReturnRequested
                ? "Customer ne return request bheji hai. Vendor approval ke baad pickup action yahan show hoga."
                : canCancelOrder
                ? "Agar delivery issue ho to delivery partner yahan se order cancel kar sakta hai."
                : "Is status par delivery-side koi direct action available nahi hai."}
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex items-center gap-3">
              <Clock3 className="text-indigo-300" size={18} />
              <h2 className="text-lg font-semibold text-white">Tracking timeline</h2>
            </div>
            <div className="mt-5 space-y-4">
              {timeline.map((entry, index) => (
                <div key={`${entry.to}_${entry.at || index}`} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-3.5 w-3.5 rounded-full bg-indigo-400" />
                    {index !== timeline.length - 1 ? (
                      <div className="mt-1 h-full min-h-10 w-px bg-slate-800" />
                    ) : null}
                  </div>
                  <div className="pb-2">
                    <p className="text-sm font-semibold text-white">
                      {formatStatus(entry.to)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(entry.at)}
                    </p>
                    {entry.reason ? (
                      <p className="mt-2 text-sm text-slate-400">{entry.reason}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {otpDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (!isSendingOtp && !isVerifyingOtp) {
                setOtpDialogOpen(false);
              }
            }}
          />
          <div className="relative z-10 w-full max-w-md rounded-[2rem] border border-slate-800 bg-slate-950 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <h3 className="text-xl font-bold text-white">
              {otpPurpose === "return"
                ? "Verify Return Pickup OTP"
                : "Verify Delivery OTP"}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              OTP customer ke email
              {otpMeta?.sentTo ? ` ${otpMeta.sentTo}` : ""} par bheja gaya hai.
              {otpPurpose === "return"
                ? " Return package receive karne ke baad OTP lekar yahan verify karo."
                : " Product handover hone ke baad OTP lekar yahan verify karo."}
            </p>

            {otpMeta?.otpExpireAt ? (
              <p className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
                OTP valid till{" "}
                {new Date(otpMeta.otpExpireAt).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            ) : null}

            <div className="mt-5">
              <label className="text-sm font-medium text-slate-200">
                {otpPurpose === "return"
                  ? "Enter return pickup OTP"
                  : "Enter customer OTP"}
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(event) =>
                  setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="6-digit OTP"
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400"
              />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSendingOtp || isVerifyingOtp}
                className="inline-flex min-h-[3rem] items-center justify-center rounded-2xl border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSendingOtp ? <AuthButtonLoader size={16} /> : "Resend OTP"}
              </button>
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={!otpCode.trim() || isVerifyingOtp || isSendingOtp}
                className="inline-flex min-h-[3rem] items-center justify-center rounded-2xl bg-emerald-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isVerifyingOtp ? (
                  <AuthButtonLoader
                    size={16}
                    className="border-slate-950/30 border-t-slate-950"
                  />
                ) : (
                  otpPurpose === "return"
                    ? "Verify & Complete Return"
                    : "Verify & Mark Delivered"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={cancelDialogOpen}
        title="Cancel Order"
        description="Kya aap sure ho ki is order ko cancel karna hai?"
        confirmText="Yes, Cancel"
        cancelText="Keep Order"
        loading={isUpdatingStatus}
        onCancel={() => {
          if (!isUpdatingStatus) {
            setCancelDialogOpen(false);
          }
        }}
        onConfirm={async () => {
          await handleStatusUpdate({
            status: "cancelled",
            reason: "Cancelled by delivery partner due to delivery issue",
            successMessage: "Order cancelled successfully",
          });
          setCancelDialogOpen(false);
        }}
      />
    </div>
  );
};

export default OrderDetailsPage;

