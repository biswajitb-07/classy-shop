import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaBoxOpen,
  FaCreditCard,
  FaHistory,
  FaMapMarkerAlt,
  FaMoneyBillWave,
} from "react-icons/fa";
import toast from "react-hot-toast";
import {
  useGetUserOrdersQuery,
  useSaveCustomerLiveLocationMutation,
  useUpdateOrderStatusMutation,
} from "../../../features/api/orderApi.js";
import PageLoader from "../../../components/Loader/PageLoader.jsx";
import ErrorMessage from "../../../components/error/ErrorMessage.jsx";
import ConfirmDialog from "../../../components/ConfirmDialog.jsx";
import AuthButtonLoader from "../../../components/Loader/AuthButtonLoader.jsx";
import { useTheme } from "../../../context/ThemeContext.jsx";
import { connectUserSocket } from "../../../lib/socket.js";
import LiveRouteMap from "../../../components/tracking/LiveRouteMap.jsx";

const STATUS_LABELS = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  return_requested: "Return Requested",
  return_approved: "Return Approved",
  return_rejected: "Return Rejected",
  return_completed: "Return Completed",
  completed: "Completed",
  failed: "Failed",
  refund: "Refund In Progress",
};

const STATUS_SEQUENCE = [
  "pending",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
];

const RETURN_POLICY_DAYS = 10;
const RETURN_POLICY_MS = RETURN_POLICY_DAYS * 24 * 60 * 60 * 1000;
const INDIA_BOUNDS = {
  minLatitude: 6,
  maxLatitude: 38.5,
  minLongitude: 68,
  maxLongitude: 98,
};

const getStatusLabel = (status) => {
  if (!status) return "Unknown";
  return (
    STATUS_LABELS[status] ||
    String(status)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
};

const getStatusColor = (status) => {
  if (!status) return "bg-gray-500 text-white";

  switch (status) {
    case "pending":
      return "bg-yellow-500 text-white";
    case "processing":
      return "bg-blue-500 text-white";
    case "shipped":
      return "bg-purple-500 text-white";
    case "out_for_delivery":
      return "bg-orange-500 text-white";
    case "delivered":
    case "completed":
      return "bg-green-500 text-white";
    case "cancelled":
    case "failed":
    case "return_rejected":
      return "bg-red-500 text-white";
    case "return_requested":
      return "bg-yellow-500 text-white";
    case "return_approved":
      return "bg-orange-500 text-white";
    case "return_completed":
    case "refund":
      return "bg-emerald-600 text-white";
    default:
      return "bg-gray-500 text-white";
  }
};

const getTimelineDotColor = (status) => {
  if (!status) return "bg-gray-400";

  switch (status) {
    case "pending":
      return "bg-yellow-500";
    case "processing":
      return "bg-blue-500";
    case "shipped":
      return "bg-purple-500";
    case "out_for_delivery":
      return "bg-orange-500";
    case "delivered":
    case "completed":
      return "bg-green-500";
    case "cancelled":
    case "failed":
    case "return_rejected":
      return "bg-red-500";
    case "return_requested":
      return "bg-amber-500";
    case "return_approved":
      return "bg-orange-500";
    case "return_completed":
    case "refund":
      return "bg-emerald-600";
    default:
      return "bg-slate-400";
  }
};

const formatTimelineActor = (role) => {
  switch (role) {
    case "user":
      return "Customer";
    case "vendor":
      return "Vendor";
    case "system":
      return "System";
    default:
      return "Update";
  }
};

const formatTimelineTime = (value) => {
  if (!value) return "Time unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getMapUrl = (latitude, longitude) =>
  `https://www.google.com/maps?q=${latitude},${longitude}`;

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
  if (distanceKm === null || distanceKm === undefined) return "Mapping route";
  if (distanceKm < 1) return `${Math.max(100, Math.round(distanceKm * 1000))} m away`;
  return `${distanceKm.toFixed(1)} km away`;
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

const sanitizeTrackingPoints = (points = [], restrictToIndia = false) =>
  (points || [])
    .filter((point) => hasCoordinate(point?.latitude, point?.longitude))
    .filter((point) => !restrictToIndia || isWithinIndiaBounds(point))
    .map((point) => ({
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
      at: point.at || point.updatedAt || null,
    }));

const getDistanceTrend = ({ trailPoints = [], currentLocation, destination }) => {
  if (!hasCoordinate(destination?.latitude, destination?.longitude)) {
    return {
      label: "Waiting for route",
      detail: "Destination pin sync hone ke baad movement insight dikh jayega.",
      tone: "neutral",
    };
  }

  const normalizedTrail = sanitizeTrackingPoints([
    ...(trailPoints || []),
    currentLocation,
  ]);

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
      detail: "Delivery boy ka next live location aate hi movement direction update hogi.",
      tone: "neutral",
    };
  }

  const latestPoint = uniqueTrail[uniqueTrail.length - 1];
  const previousPoint = uniqueTrail[uniqueTrail.length - 2];
  const latestDistance = calculateDistanceKm(latestPoint, destination);
  const previousDistance = calculateDistanceKm(previousPoint, destination);

  if (
    latestDistance === null ||
    latestDistance === undefined ||
    previousDistance === null ||
    previousDistance === undefined
  ) {
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
      label: "Approaching you",
      detail: `Last update me rider lagbhag ${deltaMeters} m aur paas aaya hai.`,
      tone: "approaching",
    };
  }

  if (deltaKm < -0.05) {
    return {
      label: "Moving away",
      detail: `Last update me rider lagbhag ${deltaMeters} m door gaya hai.`,
      tone: "away",
    };
  }

  return {
    label: "Holding nearby",
    detail: "Rider ki movement stable hai, next ping par fresh direction milegi.",
    tone: "steady",
  };
};

const getTrackingMilestones = (status, isLiveTrackingActive) => {
  const normalizedStatus = String(status || "");

  return [
    {
      label: "Packed",
      done: [
        "shipped",
        "out_for_delivery",
        "delivered",
        "return_requested",
        "return_approved",
        "return_completed",
        "return_rejected",
      ].includes(normalizedStatus),
    },
    {
      label: "On the way",
      done: ["delivered"].includes(normalizedStatus),
      active:
        ["out_for_delivery", "return_approved"].includes(normalizedStatus) ||
        isLiveTrackingActive,
    },
    {
      label: "Delivered",
      done: normalizedStatus === "delivered",
      active: normalizedStatus === "delivered",
    },
  ];
};

const getInitialStatusGuess = (order) => {
  if (!order) return "pending";
  return order.paymentMethod === "razorpay" ? "processing" : "pending";
};

const getInitialStatusReason = (order, status) => {
  if (status === "processing" && order?.paymentMethod === "razorpay") {
    return "Payment confirmed via Razorpay";
  }

  if (status === "pending" && order?.paymentMethod === "cod") {
    return "Order placed with Cash on Delivery";
  }

  return "Order tracking started";
};

const buildTimelineEntries = (order) => {
  if (!order) return [];

  const history = [...(order.statusHistory || [])]
    .filter((entry) => entry?.to)
    .sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0))
    .map((entry) => ({
      ...entry,
      synthetic: false,
    }));

  const entries = [...history];
  const hasExplicitInitialEntry = entries.some((entry) => !entry.from);
  const initialStatus = getInitialStatusGuess(order);

  if (!hasExplicitInitialEntry) {
    entries.unshift({
      from: "",
      to: initialStatus,
      role: "system",
      reason: getInitialStatusReason(order, initialStatus),
      at: order.createdAt,
      synthetic: true,
    });
  }

  const firstRealEntry = history[0];
  if (
    firstRealEntry?.from &&
    firstRealEntry.from !== initialStatus &&
    !entries.some(
      (entry) => entry.synthetic && entry.to === firstRealEntry.from,
    )
  ) {
    entries.splice(1, 0, {
      from: initialStatus,
      to: firstRealEntry.from,
      role: "system",
      reason: "Earlier order milestones were not fully tracked yet.",
      at: firstRealEntry.at || order.updatedAt || order.createdAt,
      synthetic: true,
    });
  }

  const latestTrackedStatus = entries[entries.length - 1]?.to;
  if (latestTrackedStatus !== order.orderStatus) {
    entries.push({
      from: latestTrackedStatus || "",
      to: order.orderStatus,
      role: "system",
      reason: "Current status synced from the order record.",
      at: order.updatedAt || order.createdAt,
      synthetic: true,
    });
  }

  return entries;
};

const getDeliveredAtForReturnPolicy = (order) => {
  const deliveredEntry = [...(order?.statusHistory || [])]
    .filter((entry) => entry?.to === "delivered" && entry?.at)
    .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))[0];

  const candidates = [
    deliveredEntry?.at,
    order?.deliveryConfirmation?.otpVerifiedAt,
    order?.orderStatus === "delivered" ? order?.updatedAt : null,
  ].filter(Boolean);

  const firstValidDate = candidates.find((value) => {
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime());
  });

  return firstValidDate ? new Date(firstValidDate) : null;
};

const getReturnPolicyState = (order) => {
  const deliveredAt = getDeliveredAtForReturnPolicy(order);
  if (!deliveredAt) {
    return {
      deliveredAt: null,
      expiresAt: null,
      daysLeft: null,
      isEligible: false,
    };
  }

  const expiresAt = new Date(deliveredAt.getTime() + RETURN_POLICY_MS);
  const remainingMs = expiresAt.getTime() - Date.now();

  return {
    deliveredAt,
    expiresAt,
    daysLeft: Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000))),
    isEligible: remainingMs >= 0,
  };
};

const getReturnRequestInfo = (order) => {
  if (order?.returnRequest?.reason) {
    return {
      reason: order.returnRequest.reason,
      requestedAt: order.returnRequest.requestedAt,
    };
  }

  const lastReturnRequest = [...(order?.statusHistory || [])]
    .filter((entry) => entry?.to === "return_requested")
    .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))[0];

  if (!lastReturnRequest) return null;

  return {
    reason: lastReturnRequest.reason || "",
    requestedAt: lastReturnRequest.at || null,
  };
};

const OrderTimelineCard = ({
  entries,
  headingText,
  bodyText,
  mutedText,
  surface,
  lineColor,
}) => (
  <div className={`${surface} rounded-2xl shadow-md p-6`}>
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
        <FaHistory className="text-red-500" />
      </div>
      <div>
        <h2 className={`text-xl font-bold ${headingText}`}>Tracking Timeline</h2>
        <p className={`text-sm ${mutedText}`}>
          Every order update appears here with time and reason.
        </p>
      </div>
    </div>

    <div className="space-y-0">
      {entries.map((entry, index) => {
        const isLast = index === entries.length - 1;

        return (
          <div key={`${entry.to}_${entry.at || index}_${index}`} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`w-4 h-4 rounded-full ring-4 ring-white dark:ring-slate-900 ${getTimelineDotColor(
                  entry.to,
                )}`}
              />
              {!isLast ? <div className={`w-px flex-1 min-h-14 ${lineColor}`} /> : null}
            </div>

            <div className={isLast ? "pb-0" : "pb-6"}>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                    entry.to,
                  )}`}
                >
                  {getStatusLabel(entry.to)}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    lineColor.includes("slate")
                      ? "bg-slate-800 text-slate-200"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {formatTimelineActor(entry.role)}
                </span>
              </div>

              <p className={`mt-2 text-sm ${mutedText}`}>
                {formatTimelineTime(entry.at)}
              </p>

              {entry.reason ? (
                <p className={`mt-2 text-sm ${bodyText}`}>{entry.reason}</p>
              ) : null}

              {entry.from ? (
                <p className={`mt-1 text-xs ${mutedText}`}>
                  Changed from {getStatusLabel(entry.from)}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const {
    data: ordersData,
    isLoading,
    isError,
    refetch,
  } = useGetUserOrdersQuery();

  const [updateOrderStatus, { isLoading: isUpdating }] =
    useUpdateOrderStatusMutation();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [isResolvingCustomerLocation, setIsResolvingCustomerLocation] =
    useState(false);
  const [confirmMeta, setConfirmMeta] = useState({
    type: null,
    title: "",
    description: "",
  });
  const [liveLocation, setLiveLocation] = useState(null);
  const [liveDestination, setLiveDestination] = useState(null);
  const [trackingSnapshot, setTrackingSnapshot] = useState(null);
  const [isLiveTrackingActive, setIsLiveTrackingActive] = useState(false);
  const [saveCustomerLiveLocation, { isLoading: isSavingCustomerLocation }] =
    useSaveCustomerLiveLocationMutation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const pageBg = isDark
    ? "bg-slate-950"
    : "bg-gradient-to-br from-gray-50 to-gray-100";
  const surface = isDark
    ? "bg-slate-900 border border-slate-700"
    : "bg-white";
  const headingText = isDark ? "text-white" : "text-gray-800";
  const bodyText = isDark ? "text-slate-300" : "text-gray-600";
  const mutedText = isDark ? "text-slate-400" : "text-gray-500";
  const tableHeadBg = isDark
    ? "bg-slate-800 border-b border-slate-700"
    : "bg-gray-50 border-b border-gray-200";
  const tableRowHover = isDark ? "hover:bg-slate-800/70" : "hover:bg-gray-50";
  const tableDivide = isDark ? "divide-slate-700" : "divide-gray-100";
  const progressTrack = isDark ? "bg-slate-700" : "bg-green-200";
  const summaryRule = isDark ? "border-slate-700" : "border-gray-200";
  const timelineLine = isDark ? "bg-slate-700" : "bg-gray-200";

  const orders = ordersData?.orders || [];
  const order = orders.find((item) => item._id === orderId);

  useEffect(() => {
    if (!order) return;

    const currentLocation = order.deliveryTracking?.currentLocation;
    setTrackingSnapshot(order.deliveryTracking || null);
    setLiveLocation(
      currentLocation?.latitude !== null && currentLocation?.longitude !== null
        ? currentLocation
        : null
    );
    setLiveDestination(
      order.customerLiveLocation?.latitude !== null &&
        order.customerLiveLocation?.latitude !== undefined &&
        order.customerLiveLocation?.longitude !== null &&
        order.customerLiveLocation?.longitude !== undefined
        ? order.customerLiveLocation
        : order.shippingAddress?.location || null
    );
    setIsLiveTrackingActive(Boolean(order.deliveryTracking?.isLive));
  }, [
    order?._id,
    order?.customerLiveLocation?.latitude,
    order?.customerLiveLocation?.longitude,
    order?.customerLiveLocation?.updatedAt,
    order?.shippingAddress?.location?.latitude,
    order?.shippingAddress?.location?.longitude,
    order?.deliveryTracking?.isLive,
    order?.deliveryTracking?.currentLocation?.latitude,
    order?.deliveryTracking?.currentLocation?.longitude,
    order?.deliveryTracking?.currentLocation?.updatedAt,
  ]);

  useEffect(() => {
    if (!order?._id) return undefined;

    const socket = connectUserSocket();

    const handleLocationUpdate = (payload) => {
      if (payload?.orderId !== order._id) return;
      setLiveLocation(payload.location || null);
      setTrackingSnapshot(payload?.tracking || null);
      setIsLiveTrackingActive(Boolean(payload?.tracking?.isLive));
    };

    const handleLocationStop = (payload) => {
      if (payload?.orderId !== order._id) return;
      setTrackingSnapshot(payload?.tracking || null);
      setIsLiveTrackingActive(false);
    };

    const handleDestinationUpdate = (payload) => {
      if (payload?.orderId !== order._id) return;
      setLiveDestination(payload.destination || order.shippingAddress?.location || null);
    };

    socket.on("order:location:update", handleLocationUpdate);
    socket.on("order:location:stopped", handleLocationStop);
    socket.on("order:destination:update", handleDestinationUpdate);

    return () => {
      socket.off("order:location:update", handleLocationUpdate);
      socket.off("order:location:stopped", handleLocationStop);
      socket.off("order:destination:update", handleDestinationUpdate);
    };
  }, [order?._id]);

  const getVariantDisplay = (productType, variant) => {
    if (!variant || variant === "default") return null;

    if (productType === "Fashion" || productType === "Footwear") {
      const [key, value] = variant.split(":");
      if (key === "size" && value) return `Size: ${value}`;
      return variant.replace(":", ": ");
    }

    if (productType === "Electronics") {
      const pairs = variant.split("|").map((pair) => pair.split(":"));
      const ram = pairs.find(([key]) => key === "ram")?.[1];
      const storage = pairs.find(([key]) => key === "storage")?.[1];
      const parts = [];

      if (ram) parts.push(`RAM: ${ram}`);
      if (storage) parts.push(`Storage: ${storage}`);

      return parts.length ? parts.join(", ") : variant;
    }

    return variant;
  };

  if (isError) return <ErrorMessage onRetry={refetch} />;
  if (isLoading) {
    return <PageLoader message="Loading order details..." />;
  }

  if (!order) {
    return (
      <div className={`min-h-screen ${pageBg}`}>
        <div className="container mx-auto px-4 py-16">
          <div
            className={`max-w-md mx-auto text-center ${surface} rounded-2xl shadow-xl p-8`}
          >
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-red-100 to-pink-100 rounded-full flex items-center justify-center dark:from-red-950 dark:to-pink-950">
              <FaBoxOpen className="w-12 h-12 text-red-500" />
            </div>
            <h2 className={`text-2xl font-bold ${headingText} mb-4`}>
              Order Not Found
            </h2>
            <p className={`${bodyText} mb-8`}>
              The order you are looking for does not exist.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalItems = order.items.reduce((total, item) => total + item.quantity, 0);
  const timelineEntries = buildTimelineEntries(order);
  const isReturnFlow = order.orderStatus?.startsWith("return");
  const isCancelled = order.orderStatus === "cancelled";
  const canUserCancel = ["pending", "processing"].includes(order.orderStatus);
  const returnPolicy = getReturnPolicyState(order);
  const returnRequestInfo = getReturnRequestInfo(order);
  const canUserRequestReturn =
    order.orderStatus === "delivered" && returnPolicy.isEligible;
  const isIndiaOrder = String(order.shippingAddress?.country || "")
    .trim()
    .toLowerCase()
    .includes("india");
  const showReturnPolicyCard = [
    "delivered",
    "return_requested",
    "return_approved",
    "return_rejected",
    "return_completed",
  ].includes(order.orderStatus);
  const trackingInfo = trackingSnapshot || order.deliveryTracking || {};
  const rawTrackingLocation = liveLocation || trackingInfo.currentLocation;
  const trackingLocation =
    isIndiaOrder &&
    rawTrackingLocation &&
    !isWithinIndiaBounds(rawTrackingLocation)
      ? null
      : rawTrackingLocation;
  const rawDestinationLocation =
    liveDestination ||
    order.customerLiveLocation ||
    order.shippingAddress?.location;
  const destinationLocation =
    isIndiaOrder &&
    rawDestinationLocation &&
    !isWithinIndiaBounds(rawDestinationLocation)
      ? order.shippingAddress?.location || null
      : rawDestinationLocation;
  const hasUserLiveDestination = Boolean(
    liveDestination?.source === "customer_live" ||
      (order.customerLiveLocation?.latitude !== null &&
        order.customerLiveLocation?.latitude !== undefined &&
        order.customerLiveLocation?.longitude !== null &&
        order.customerLiveLocation?.longitude !== undefined)
  );
  const hasTrackingLocation = Boolean(
    trackingLocation?.latitude !== null &&
      trackingLocation?.latitude !== undefined &&
      trackingLocation?.longitude !== null &&
      trackingLocation?.longitude !== undefined
  );
  const hasDestinationLocation = Boolean(
    hasCoordinate(destinationLocation?.latitude, destinationLocation?.longitude)
  );
  const showTrackingCard =
    hasTrackingLocation ||
    isLiveTrackingActive ||
    order.orderStatus === "out_for_delivery" ||
    order.orderStatus === "return_approved";
  const mapUrl = hasTrackingLocation
    ? getMapUrl(trackingLocation.latitude, trackingLocation.longitude)
    : "";
  const directionsUrl = buildDirectionsUrl(trackingLocation, destinationLocation);
  const fallbackMapUrl = buildDirectionsUrl(null, destinationLocation);
  const primaryMapUrl = mapUrl || fallbackMapUrl;
  const distanceKm =
    hasTrackingLocation && hasDestinationLocation
      ? calculateDistanceKm(trackingLocation, destinationLocation)
      : null;
  const etaMinutes = estimateEtaMinutes(distanceKm, trackingLocation?.speed);
  const recentTrailPoints = sanitizeTrackingPoints(
    trackingInfo?.recentPoints,
    isIndiaOrder
  );
  const movementTrend = getDistanceTrend({
    trailPoints: recentTrailPoints,
    currentLocation: trackingLocation,
    destination: destinationLocation,
  });
  const trackingMilestones = getTrackingMilestones(
    order.orderStatus,
    isLiveTrackingActive
  );
  const canUpdateCustomerLocation = ![
    "delivered",
    "cancelled",
    "return_completed",
    "return_rejected",
  ].includes(order.orderStatus);
  const isUpdatingCustomerLocation =
    isResolvingCustomerLocation || isSavingCustomerLocation;

  const progressForStatus = (status) => {
    if (!status) return 0;
    if (status === "cancelled") return 0;

    if (status.startsWith("return")) {
      if (status === "return_requested") return 50;
      if (status === "return_approved") return 75;
      if (status === "return_completed") return 100;
      if (status === "return_rejected") return 50;
      return 50;
    }

    const idx = STATUS_SEQUENCE.indexOf(status);
    return idx >= 0 ? ((idx + 1) / STATUS_SEQUENCE.length) * 100 : 0;
  };

  const progressPercentage = progressForStatus(order.orderStatus);

  const renderLiveTrackingCard = () => (
    <div className={`${surface} rounded-2xl shadow-md p-6`}>
      <h2
        className={`text-xl font-bold ${headingText} mb-4 flex items-center gap-2`}
      >
        <FaMapMarkerAlt className="text-cyan-500" />
        Live Delivery Tracking
      </h2>

      <div
        className={`rounded-3xl border p-4 ${
          isDark
            ? "border-cyan-500/20 bg-cyan-500/10"
            : "border-cyan-100 bg-cyan-50/70"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${mutedText}`}>
              Delivery partner
            </p>
            <p className={`mt-2 text-lg font-bold ${headingText}`}>
              {order.assignedDeliveryPartner?.name || "Rider details updating"}
            </p>
            <p className={`mt-1 text-sm ${bodyText}`}>
              {order.assignedDeliveryPartner?.vehicleType
                ? `${order.assignedDeliveryPartner.vehicleType} • `
                : ""}
              {isLiveTrackingActive
                ? "Live location sharing on, map par rider ki current movement visible hai"
                : "Waiting for next location ping from delivery partner"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.2em] ${
                isLiveTrackingActive
                  ? "bg-cyan-500 text-white"
                  : isDark
                  ? "bg-slate-800 text-slate-200"
                  : "bg-white text-gray-700"
              }`}
            >
              {isLiveTrackingActive ? "Live now" : "Last shared"}
            </span>
            <span className={`text-sm ${mutedText}`}>
              {formatTimelineTime(
                trackingLocation?.updatedAt || trackingInfo?.lastSharedAt
              )}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className={`${isDark ? "bg-slate-950/70 border-slate-800" : "bg-white border-cyan-100"} rounded-2xl border p-4`}>
            <p className={`text-xs uppercase tracking-[0.22em] ${mutedText}`}>
              Distance left
            </p>
            <p className={`mt-2 text-lg font-bold ${headingText}`}>
              {hasTrackingLocation ? formatDistance(distanceKm) : "Waiting for rider"}
            </p>
          </div>
          <div className={`${isDark ? "bg-slate-950/70 border-slate-800" : "bg-white border-cyan-100"} rounded-2xl border p-4`}>
            <p className={`text-xs uppercase tracking-[0.22em] ${mutedText}`}>
              ETA
            </p>
            <p className={`mt-2 text-lg font-bold ${headingText}`}>
              {hasTrackingLocation ? formatEta(etaMinutes) : "Will update soon"}
            </p>
          </div>
          <div className={`${isDark ? "bg-slate-950/70 border-slate-800" : "bg-white border-cyan-100"} rounded-2xl border p-4`}>
            <p className={`text-xs uppercase tracking-[0.22em] ${mutedText}`}>
              Movement
            </p>
            <p
              className={`mt-2 text-sm font-semibold ${
                movementTrend.tone === "approaching"
                  ? "text-emerald-500"
                  : movementTrend.tone === "away"
                  ? "text-rose-500"
                  : headingText
              }`}
            >
              {movementTrend.label}
            </p>
            <p className={`mt-1 text-xs ${mutedText}`}>
              {movementTrend.detail}
            </p>
          </div>
          <div className={`${isDark ? "bg-slate-950/70 border-slate-800" : "bg-white border-cyan-100"} rounded-2xl border p-4`}>
            <p className={`text-xs uppercase tracking-[0.22em] ${mutedText}`}>
              Destination
            </p>
            <p className={`mt-2 text-sm font-semibold ${headingText}`}>
              {order.shippingAddress?.city || "Customer address"}
            </p>
            <p className={`mt-1 text-xs ${mutedText}`}>
              {hasDestinationLocation ? "Route mapped" : "Address pin syncing"}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {trackingMilestones.map((step) => (
            <div
              key={step.label}
              className={`rounded-2xl border px-4 py-3 ${
                step.done
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                  : step.active
                  ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300"
                  : isDark
                  ? "border-slate-800 bg-slate-950/60 text-slate-400"
                  : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                {step.done ? "Done" : step.active ? "Active" : "Next"}
              </p>
              <p className="mt-2 text-sm font-semibold">{step.label}</p>
            </div>
          ))}
        </div>
      </div>

      {hasDestinationLocation ? (
        <div className="mt-5">
          <LiveRouteMap
            origin={trackingLocation}
            destination={destinationLocation}
            trailPoints={recentTrailPoints}
            heightClass="h-72"
            restrictToIndia={isIndiaOrder}
            riderLabel={order.assignedDeliveryPartner?.name || "Delivery partner"}
            destinationLabel={
              hasUserLiveDestination
                ? "Your live location"
                : order.shippingAddress?.fullName || "Customer"
            }
          />
        </div>
      ) : null}

      {!hasTrackingLocation ? (
        <div
          className={`mt-4 rounded-2xl border border-dashed p-5 text-sm ${mutedText} ${
            isDark ? "border-slate-700 bg-slate-950/60" : "border-gray-200 bg-gray-50"
          }`}
        >
          Delivery boy ne abhi live location share start nahi ki hai. Jaise hi first ping aayegi,
          distance, ETA aur movement automatically update honge.
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div
          className={`rounded-2xl border p-4 ${
            isDark ? "border-slate-700 bg-slate-950/60" : "border-gray-200 bg-gray-50"
          }`}
        >
          <p className={`text-xs uppercase tracking-[0.22em] ${mutedText}`}>
            Rider position
          </p>
          <p className={`mt-2 text-sm font-semibold ${headingText}`}>
            {hasTrackingLocation
              ? `${Number(trackingLocation.latitude).toFixed(5)}, ${Number(
                  trackingLocation.longitude
                ).toFixed(5)}`
              : "Waiting for live rider ping"}
          </p>
        </div>
        <div
          className={`rounded-2xl border p-4 ${
            isDark ? "border-slate-700 bg-slate-950/60" : "border-gray-200 bg-gray-50"
          }`}
        >
          <p className={`text-xs uppercase tracking-[0.22em] ${mutedText}`}>
            Delivery destination
          </p>
          <p className={`mt-2 text-sm font-semibold ${headingText}`}>
            {hasUserLiveDestination
              ? "Your live delivery pin"
              : order.shippingAddress?.addressLine1 || order.shippingAddress?.village}
          </p>
          <p className={`mt-1 text-xs ${mutedText}`}>
            {hasUserLiveDestination
              ? `${Number(destinationLocation?.latitude || 0).toFixed(5)}, ${Number(
                  destinationLocation?.longitude || 0
                ).toFixed(5)}`
              : `${order.shippingAddress?.city}, ${order.shippingAddress?.state}`}
          </p>
        </div>
      </div>

      <div
        className={`mt-4 rounded-2xl border p-4 ${
          isDark ? "border-slate-700 bg-slate-950/60" : "border-gray-200 bg-gray-50"
        }`}
      >
        <p className={`text-xs uppercase tracking-[0.22em] ${mutedText}`}>
          Live route feel
        </p>
        <p className={`mt-2 text-sm font-semibold ${headingText}`}>
          Dashed cyan trail rider ke recent movement ko dikhata hai.
        </p>
        <p className={`mt-1 text-xs ${mutedText}`}>
          Blue line current route hai. Rider aage ya piche move karega to trend aur map dono live update honge.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <a
          href={primaryMapUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-full items-center justify-center rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-600"
        >
          Open Live Map
        </a>
        <a
          href={directionsUrl || primaryMapUrl}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition ${
            isDark
              ? "border border-slate-700 text-slate-100 hover:bg-slate-900"
              : "border border-gray-200 text-gray-800 hover:bg-gray-50"
          }`}
        >
          Open Route View
        </a>
      </div>
    </div>
  );

  const openCancelDialog = () => {
    setConfirmMeta({
      type: "cancel",
      title: "Cancel Order",
      description:
        "Are you sure you want to cancel this order? This action cannot be undone.",
    });
    setConfirmOpen(true);
  };

  const openReturnDialog = () => {
    if (!canUserRequestReturn) return;
    setReturnReason(returnRequestInfo?.reason || "");
    setReturnDialogOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    if (!confirmMeta.type) return;

    const payload = { status: "cancelled", reason: "Cancelled by user" };

    try {
      await updateOrderStatus({ orderId: order._id, body: payload }).unwrap();
      toast.success(
        "Order cancelled successfully",
      );
      await refetch();
    } catch (error) {
      const message =
        error?.data?.message || error?.message || "Something went wrong";
      toast.error(message);
    }
  };

  const handleSaveCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location access is not supported on this device");
      return;
    }

    setIsResolvingCustomerLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const payload = {
            latitude: Number(position.coords.latitude),
            longitude: Number(position.coords.longitude),
            accuracy: Number(position.coords.accuracy || 0),
            label: "Customer live location",
          };

          await saveCustomerLiveLocation({
            orderId: order._id,
            body: payload,
          }).unwrap();

          setLiveDestination({
            ...payload,
            source: "customer_live",
            updatedAt: new Date().toISOString(),
          });
          toast.success("Your current delivery location has been saved");
        } catch (error) {
          toast.error(
            error?.data?.message || "Failed to save current delivery location"
          );
        } finally {
          setIsResolvingCustomerLocation(false);
        }
      },
      (error) => {
        setIsResolvingCustomerLocation(false);
        const message =
          error?.code === 1
            ? "Browser me location permission allow karo"
            : "Current location detect nahi ho pa rahi";
        toast.error(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );
  };

  const handleReturnRequest = async () => {
    const trimmedReason = returnReason.trim();

    if (!trimmedReason) {
      toast.error("Please add a return reason");
      return;
    }

    try {
      await updateOrderStatus({
        orderId: order._id,
        body: { status: "return_requested", reason: trimmedReason },
      }).unwrap();

      toast.success("Return requested successfully");
      setReturnDialogOpen(false);
      setReturnReason("");
      await refetch();
    } catch (error) {
      const message =
        error?.data?.message || error?.message || "Something went wrong";
      toast.error(message);
    }
  };

  return (
    <div className={`min-h-screen ${pageBg} pb-16`}>
      <div className="container px-4 mx-auto">
        <div className="flex items-center justify-between mt-8 mb-6">
          <h1
            className={`text-xl md:text-2xl font-bold ${headingText} flex items-center gap-2`}
          >
            <FaBoxOpen className="text-red-500" />
            Order Details #{order.orderId}
          </h1>
        </div>

        <div className="w-24 h-1 bg-gradient-to-r from-red-500 to-pink-500 rounded-full mb-8" />

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)] gap-6">
          <div className="space-y-6 min-w-0">
            <div className={`${surface} rounded-2xl shadow-md overflow-hidden p-6`}>
              <div className="mb-6">
                <div className="relative mb-2 h-6">
                  <div
                    className={`absolute top-1/2 left-0 w-full h-1 ${progressTrack} rounded-full transform -translate-y-1/2`}
                  />
                  <div
                    className={`absolute top-1/2 left-0 h-1 rounded-full transform -translate-y-1/2 transition-all duration-700 ease-in-out ${
                      isReturnFlow
                        ? "bg-orange-500"
                        : isCancelled
                          ? "bg-red-500"
                          : "bg-green-500"
                    }`}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between items-center gap-3">
                  <div className={`text-sm ${bodyText}`}>Current status</div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      order.orderStatus,
                    )}`}
                  >
                    {getStatusLabel(order.orderStatus)}
                  </div>
                </div>
              </div>

              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className={tableHeadBg}>
                    <tr>
                      <th
                        className={`px-6 py-4 text-left font-semibold ${bodyText} uppercase`}
                      >
                        Product
                      </th>
                      <th
                        className={`px-6 py-4 text-left font-semibold ${bodyText} uppercase`}
                      >
                        Variant
                      </th>
                      <th
                        className={`px-6 py-4 text-center font-semibold ${bodyText} uppercase`}
                      >
                        Qty
                      </th>
                      <th
                        className={`px-6 py-4 text-right font-semibold ${bodyText} uppercase`}
                      >
                        Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${tableDivide}`}>
                    {order.items.map((item, index) => (
                      <tr
                        key={`${item.productId}_${index}`}
                        className={tableRowHover}
                      >
                        <td className="px-6 py-4">
                          <div
                            onClick={() =>
                              navigate(
                                `/${item.productType.toLowerCase()}/${item.productType.toLowerCase()}-product-details/${
                                  item.product._id
                                }`,
                              )
                            }
                            className="flex items-center gap-4 cursor-pointer group"
                          >
                            <img
                              src={item.product.image?.[0] || "/fallback-image.jpg"}
                              alt={item.product.name}
                              className="w-16 h-16 object-cover rounded-lg group-hover:scale-105 transition"
                            />
                            <div>
                              <h4
                                className={`font-semibold ${headingText} group-hover:text-red-500`}
                              >
                                {item.product.name}
                              </h4>
                              <p className={`text-xs ${mutedText} mt-1`}>
                                {item.productType}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getVariantDisplay(item.productType, item.variant) || (
                            <span className={`${mutedText} text-sm`}>Default</span>
                          )}
                        </td>
                        <td
                          className={`px-6 py-4 text-center font-bold ${headingText}`}
                        >
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-red-500 font-bold">
                            ₹{item.subtotal.toLocaleString()}
                          </p>
                          <p className={`text-sm ${mutedText}`}>
                            ₹{item.price.toLocaleString()} each
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={`md:hidden divide-y ${tableDivide}`}>
                {order.items.map((item, index) => (
                  <div
                    key={`${item.productId}_${index}`}
                    className="p-4 flex flex-col gap-3"
                  >
                    <div
                      onClick={() =>
                        navigate(
                          `/${item.productType.toLowerCase()}/${item.productType.toLowerCase()}-product-details/${
                            item.product._id
                          }`,
                        )
                      }
                      className="flex gap-4 items-center group cursor-pointer"
                    >
                      <img
                        src={item.product.image?.[0] || "/fallback-image.jpg"}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded-lg group-hover:scale-105 transition"
                      />
                      <div>
                        <h4
                          className={`font-semibold ${headingText} group-hover:text-red-500`}
                        >
                          {item.product.name}
                        </h4>
                        <p className={`text-xs ${mutedText}`}>{item.productType}</p>
                        {getVariantDisplay(item.productType, item.variant) ? (
                          <p
                            className={`text-xs ${
                              isDark ? "text-cyan-300" : "text-blue-600"
                            }`}
                          >
                            {getVariantDisplay(item.productType, item.variant)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={`text-sm ${bodyText}`}>Qty: {item.quantity}</p>
                      <div className="text-right">
                        <p className="text-red-500 font-bold">
                          ₹{item.subtotal.toLocaleString()}
                        </p>
                        <p className={`text-xs ${mutedText}`}>
                          ₹{item.price.toLocaleString()} each
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <OrderTimelineCard
              entries={timelineEntries}
              headingText={headingText}
              bodyText={bodyText}
              mutedText={mutedText}
              surface={surface}
              lineColor={timelineLine}
            />

            {showTrackingCard ? renderLiveTrackingCard() : null}
          </div>

          <div className="space-y-6">
            <div className={`${surface} rounded-2xl shadow-md p-6`}>
              <h2 className={`text-xl font-bold ${headingText} mb-4`}>
                Order Summary
              </h2>
              <div className={`space-y-3 ${bodyText} text-sm`}>
                <div className="flex justify-between">
                  <span>Order ID</span>
                  <span>#{order.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date</span>
                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Update</span>
                  <span>{formatTimelineTime(order.updatedAt || order.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Items</span>
                  <span>{totalItems}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-green-500 font-medium">Free</span>
                </div>
                <hr className={`${summaryRule} my-2`} />
                <div
                  className={`flex justify-between text-base font-bold ${headingText}`}
                >
                  <span>Total</span>
                  <span className="text-red-500">
                    ₹{order.totalAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-3">
                  <span>Status</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      order.orderStatus,
                    )}`}
                  >
                    {getStatusLabel(order.orderStatus)}
                  </span>
                </div>
              </div>
            </div>

            <div className={`${surface} rounded-2xl shadow-md p-6`}>
              <h2
                className={`text-xl font-bold ${headingText} mb-4 flex items-center gap-2`}
              >
                <FaMapMarkerAlt className="text-red-500" />
                Shipping Address
              </h2>
              <div className={`text-sm space-y-1 ${bodyText}`}>
                <p className="font-medium">{order.shippingAddress.fullName}</p>
                {order.shippingAddress.addressLine1 ? (
                  <p>{order.shippingAddress.addressLine1}</p>
                ) : null}
                <p>
                  {order.shippingAddress.village}, {order.shippingAddress.city},{" "}
                  {order.shippingAddress.district}, {order.shippingAddress.state} -{" "}
                  {order.shippingAddress.postalCode}
                </p>
                <p>{order.shippingAddress.country}</p>
                <p>{order.shippingAddress.phone}</p>
              </div>
            </div>

            {canUpdateCustomerLocation ? (
              <div className={`${surface} rounded-2xl shadow-md p-6`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className={`text-xl font-bold ${headingText}`}>
                      Delivery Location
                    </h2>
                    <p className={`mt-2 text-sm ${bodyText}`}>
                      Zomato-style route ke liye aap apni current location save kar sakte ho.
                      Save hone ke baad delivery partner ka route isi pin tak dikhega.
                    </p>
                    <p className={`mt-3 text-sm font-medium ${headingText}`}>
                      {hasUserLiveDestination
                        ? "Current live pin saved"
                        : "Currently using shipping address pin"}
                    </p>
                    <p className={`mt-1 text-xs ${mutedText}`}>
                      {destinationLocation?.updatedAt
                        ? `Last updated ${formatTimelineTime(destinationLocation.updatedAt)}`
                        : "Update your live pin when you want delivery near your current position."}
                    </p>
                  </div>

                  <button
                    onClick={handleSaveCurrentLocation}
                    disabled={isUpdatingCustomerLocation}
                    className="inline-flex min-h-[3rem] w-full items-center justify-center rounded-xl bg-cyan-500 px-6 text-sm font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap sm:w-auto sm:min-w-[13rem]"
                  >
                    {isUpdatingCustomerLocation ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-white/35 border-t-white animate-spin" />
                        {isResolvingCustomerLocation ? "Detecting..." : "Saving..."}
                      </span>
                    ) : hasUserLiveDestination ? (
                      "Update Current Location"
                    ) : (
                      "Use Current Location"
                    )}
                  </button>
                </div>
              </div>
            ) : null}

            <div className={`${surface} rounded-2xl shadow-md p-6`}>
              <h2
                className={`text-xl font-bold ${headingText} mb-4 flex items-center gap-2`}
              >
                {order.paymentMethod === "cod" ? (
                  <FaMoneyBillWave className="text-green-500" />
                ) : (
                  <FaCreditCard className="text-blue-500" />
                )}
                Payment Info
              </h2>
              <div className={`text-sm space-y-2 ${bodyText}`}>
                <div className="flex justify-between items-center gap-4">
                  <span>Method</span>
                  {order.paymentMethod === "razorpay" ? (
                    <img
                      src="/razorpay-icon.png"
                      alt="razorpay"
                      className="w-20"
                    />
                  ) : (
                    <img src="/cod-icon.png" alt="cod" className="w-12 md:w-20" />
                  )}
                </div>
                <div className="flex justify-between items-start gap-3">
                  <span>Status</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      order.paymentStatus,
                    )}`}
                  >
                    {getStatusLabel(order.paymentStatus)}
                  </span>
                </div>
                {order.razorpayOrderId ? (
                  <div className="flex justify-between gap-3">
                    <span>Razorpay Order ID</span>
                    <span className="text-right break-all">
                      {order.razorpayOrderId}
                    </span>
                  </div>
                ) : null}
                {order.razorpayPaymentId ? (
                  <div className="flex justify-between gap-3">
                    <span>Razorpay Payment ID</span>
                    <span className="text-right break-all">
                      {order.razorpayPaymentId}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {order.orderStatus !== "cancelled" ? (
              <div className={`${surface} rounded-2xl shadow-md p-6 flex flex-col gap-4`}>
                {showReturnPolicyCard ? (
                  <div
                    className={`rounded-2xl border p-4 ${
                      isDark
                        ? "border-orange-500/20 bg-orange-500/10"
                        : "border-orange-100 bg-orange-50/80"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${mutedText}`}>
                          {RETURN_POLICY_DAYS}-day returns
                        </p>
                        <h3 className={`mt-2 text-lg font-bold ${headingText}`}>
                          Return policy for delivered orders
                        </h3>
                        <p className={`mt-2 text-sm ${bodyText}`}>
                          Delivered date se {RETURN_POLICY_DAYS} days ke andar return request
                          submit ki ja sakti hai. Reason dena required hai.
                        </p>
                      </div>

                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          returnPolicy.isEligible
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {returnPolicy.isEligible
                          ? `${returnPolicy.daysLeft} day${returnPolicy.daysLeft === 1 ? "" : "s"} left`
                          : "Window closed"}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div
                        className={`rounded-2xl border p-4 ${
                          isDark ? "border-slate-800 bg-slate-950/60" : "border-white bg-white/80"
                        }`}
                      >
                        <p className={`text-xs uppercase tracking-[0.2em] ${mutedText}`}>
                          Delivered on
                        </p>
                        <p className={`mt-2 text-sm font-semibold ${headingText}`}>
                          {returnPolicy.deliveredAt
                            ? formatTimelineTime(returnPolicy.deliveredAt)
                            : "Delivery date syncing"}
                        </p>
                      </div>
                      <div
                        className={`rounded-2xl border p-4 ${
                          isDark ? "border-slate-800 bg-slate-950/60" : "border-white bg-white/80"
                        }`}
                      >
                        <p className={`text-xs uppercase tracking-[0.2em] ${mutedText}`}>
                          Return deadline
                        </p>
                        <p className={`mt-2 text-sm font-semibold ${headingText}`}>
                          {returnPolicy.expiresAt
                            ? formatTimelineTime(returnPolicy.expiresAt)
                            : "Will appear after delivery"}
                        </p>
                      </div>
                    </div>

                    {returnRequestInfo?.reason ? (
                      <div
                        className={`mt-4 rounded-2xl border p-4 ${
                          isDark ? "border-slate-800 bg-slate-950/70" : "border-orange-100 bg-white"
                        }`}
                      >
                        <p className={`text-xs uppercase tracking-[0.2em] ${mutedText}`}>
                          Return reason
                        </p>
                        <p className={`mt-2 text-sm font-semibold ${headingText}`}>
                          {returnRequestInfo.reason}
                        </p>
                        {returnRequestInfo.requestedAt ? (
                          <p className={`mt-2 text-xs ${mutedText}`}>
                            Requested on {formatTimelineTime(returnRequestInfo.requestedAt)}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {!returnPolicy.isEligible && order.orderStatus === "delivered" ? (
                      <p className={`mt-4 text-sm ${bodyText}`}>
                        Return request window close ho chuki hai. New requests ab accept nahi hongi.
                      </p>
                    ) : null}

                    {isReturnFlow ? (
                      <p className={`mt-4 text-sm ${bodyText}`}>
                        Current return status:{" "}
                        <span className="font-semibold">
                          {getStatusLabel(order.orderStatus)}
                        </span>
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {canUserCancel ? (
                  <button
                    onClick={openCancelDialog}
                    disabled={isUpdating}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                  >
                    {isUpdating ? <AuthButtonLoader /> : "Cancel Order"}
                  </button>
                ) : null}

                {order.orderStatus === "delivered" ? (
                  <button
                    onClick={openReturnDialog}
                    disabled={isUpdating || !returnPolicy.isEligible}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                  >
                    {isUpdating ? (
                      <AuthButtonLoader />
                    ) : returnPolicy.isEligible ? (
                      "Request Return"
                    ) : (
                      "Return Window Closed"
                    )}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={confirmMeta.title}
        description={confirmMeta.description}
        confirmText="Cancel Order"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        loading={isUpdating}
      />

      {returnDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              if (!isUpdating) {
                setReturnDialogOpen(false);
              }
            }}
          />
          <div
            className={`relative w-full max-w-lg rounded-3xl border p-6 shadow-2xl ${
              isDark
                ? "border-slate-700 bg-slate-900"
                : "border-gray-200 bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${mutedText}`}>
                  Return request
                </p>
                <h3 className={`mt-2 text-2xl font-bold ${headingText}`}>
                  Add your return reason
                </h3>
                <p className={`mt-2 text-sm ${bodyText}`}>
                  Vendor ko clearly samajh aana chahiye ki aap return kyun request kar rahe ho.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReturnDialogOpen(false)}
                disabled={isUpdating}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-lg ${
                  isDark
                    ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                ×
              </button>
            </div>

            <div
              className={`mt-5 rounded-2xl border p-4 ${
                isDark ? "border-slate-800 bg-slate-950/60" : "border-orange-100 bg-orange-50/70"
              }`}
            >
              <p className={`text-sm font-semibold ${headingText}`}>
                Return request should be raised before{" "}
                {returnPolicy.expiresAt
                  ? formatTimelineTime(returnPolicy.expiresAt)
                  : "the policy deadline"}
              </p>
              <p className={`mt-1 text-xs ${mutedText}`}>
                Examples: damaged item, wrong size, missing part, product not as described.
              </p>
            </div>

            <div className="mt-5">
              <label className={`mb-2 block text-sm font-semibold ${headingText}`}>
                Reason
              </label>
              <textarea
                value={returnReason}
                onChange={(event) => setReturnReason(event.target.value)}
                rows={5}
                maxLength={300}
                placeholder="Example: Product size mismatch hai aur fitting expected jaisi nahi hai."
                className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
                  isDark
                    ? "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-orange-400"
                    : "border-gray-200 bg-white text-gray-800 placeholder:text-gray-400 focus:border-orange-400"
                }`}
              />
              <div className={`mt-2 flex items-center justify-between text-xs ${mutedText}`}>
                <span>Minimum ek clear reason likhiye.</span>
                <span>{returnReason.trim().length}/300</span>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setReturnDialogOpen(false)}
                disabled={isUpdating}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                  isDark
                    ? "border-slate-700 text-slate-100 hover:bg-slate-800"
                    : "border-gray-200 text-gray-800 hover:bg-gray-50"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReturnRequest}
                disabled={isUpdating}
                className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUpdating ? <AuthButtonLoader /> : "Submit Return Request"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default OrderDetailsPage;
