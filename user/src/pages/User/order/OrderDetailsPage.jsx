import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaBoxOpen,
  FaCreditCard,
  FaFileInvoice,
  FaHistory,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaRoute,
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
import { getBestCurrentLocation } from "../../../utils/geolocation.js";

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
const MAX_CUSTOMER_LOCATION_ACCURACY_METERS = 1200;
const MIN_REASONABLE_ROUTE_SPEED_KMH = 8;
const MAX_REASONABLE_ROUTE_SPEED_KMH = 120;
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

const getLocationTimestamp = (location) => {
  const rawValue = location?.updatedAt || location?.at || null;
  if (!rawValue) return 0;
  const parsed = new Date(rawValue).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const getTrackingSnapshotTimestamp = (snapshot) => {
  if (!snapshot) return 0;

  const currentLocationTimestamp = getLocationTimestamp(snapshot.currentLocation);
  const lastSharedTimestamp = getLocationTimestamp({
    updatedAt: snapshot.lastSharedAt || snapshot.updatedAt,
  });
  const latestTrailTimestamp = Array.isArray(snapshot.recentPoints)
    ? snapshot.recentPoints.reduce(
        (latestTimestamp, point) =>
          Math.max(latestTimestamp, getLocationTimestamp(point)),
        0,
      )
    : 0;

  return Math.max(
    currentLocationTimestamp,
    lastSharedTimestamp,
    latestTrailTimestamp,
  );
};

const getFreshestTrackingSnapshot = (...snapshots) =>
  snapshots
    .filter(Boolean)
    .sort(
      (left, right) =>
        getTrackingSnapshotTimestamp(right) - getTrackingSnapshotTimestamp(left),
    )[0] || null;

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

  const latestFirstCandidates = [...candidates].sort(
    (left, right) => getLocationTimestamp(right) - getLocationTimestamp(left)
  );

  const validCandidate = latestFirstCandidates.find(
    (point) => !restrictToIndia || isWithinIndiaBounds(point),
  );

  return validCandidate || null;
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

const isReliableCustomerLocation = (location) =>
  hasCoordinate(location?.latitude, location?.longitude);

const resolveEtaMinutes = ({
  routeDurationMinutes,
  routeDistanceKm,
  fallbackDistanceKm,
  speedMetersPerSecond,
  isFallbackRoute = false,
}) => {
  const normalizedRouteDuration = Number(routeDurationMinutes);
  const normalizedRouteDistance = Number(routeDistanceKm);
  const distanceForFallbackEta = Number.isFinite(normalizedRouteDistance)
    ? normalizedRouteDistance
    : fallbackDistanceKm;
  const fallbackEtaMinutes = estimateEtaMinutes(
    distanceForFallbackEta,
    speedMetersPerSecond
  );

  if (isFallbackRoute) return fallbackEtaMinutes;
  if (!Number.isFinite(normalizedRouteDuration) || normalizedRouteDuration <= 0) {
    return fallbackEtaMinutes;
  }

  if (!Number.isFinite(normalizedRouteDistance) || normalizedRouteDistance <= 0) {
    return Math.max(3, Math.round(normalizedRouteDuration));
  }

  const averageRouteSpeedKmh =
    normalizedRouteDistance / Math.max(normalizedRouteDuration / 60, 0.01);
  const looksImplausible =
    averageRouteSpeedKmh < MIN_REASONABLE_ROUTE_SPEED_KMH ||
    averageRouteSpeedKmh > MAX_REASONABLE_ROUTE_SPEED_KMH ||
    (Number.isFinite(Number(fallbackEtaMinutes)) &&
      normalizedRouteDuration > Number(fallbackEtaMinutes) * 4 &&
      normalizedRouteDistance <= 30);

  return looksImplausible
    ? fallbackEtaMinutes
    : Math.max(3, Math.round(normalizedRouteDuration));
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

const getNearbyState = (distanceKm, isTrackingActive) => {
  if (!Number.isFinite(Number(distanceKm))) {
    return {
      label: isTrackingActive ? "Waiting for route" : "Waiting for ping",
      detail: isTrackingActive
        ? "Road route sync hote hi nearby state update hogi."
        : "Rider ki next live location aate hi nearby state show hogi.",
      tone: "neutral",
      priority: false,
      alertMessage: "",
    };
  }

  if (distanceKm <= 0.03) {
    return {
      label: "Arriving now",
      detail: "Delivery partner bilkul aapke pickup point ke paas pahunch gaya hai.",
      tone: "arrived",
      priority: true,
      alertMessage: "Delivery partner has arrived nearby.",
    };
  }

  if (distanceKm <= 0.1) {
    return {
      label: "Within 100 m",
      detail: "Rider bahut paas hai. Delivery receive karne ke liye ready raho.",
      tone: "nearby",
      priority: true,
      alertMessage: "Delivery partner is within 100 meters.",
    };
  }

  if (distanceKm <= 0.5) {
    return {
      label: "Within 500 m",
      detail: "Delivery partner nearby hai aur kuch hi der me pahunch sakta hai.",
      tone: "nearby",
      priority: true,
      alertMessage: "Delivery partner is nearby.",
    };
  }

  return {
    label: "En route",
    detail: "Delivery partner abhi route par hai aur aapki taraf aa raha hai.",
    tone: "neutral",
    priority: false,
    alertMessage: "",
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
  } = useGetUserOrdersQuery(undefined, {
    pollingInterval: 5000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

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
  const [routeMeta, setRouteMeta] = useState(null);
  const nearbyAlertRef = useRef("");
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
    setIsLiveTrackingActive(Boolean(order.deliveryTracking?.isLive));
    setRouteMeta(null);
    nearbyAlertRef.current = "";
  }, [
    order?._id,
    order?.deliveryTracking?.isLive,
    order?.deliveryTracking?.currentLocation?.latitude,
    order?.deliveryTracking?.currentLocation?.longitude,
    order?.deliveryTracking?.currentLocation?.updatedAt,
  ]);

  useEffect(() => {
    if (!order) return;

    setLiveDestination((currentDestination) => {
      const nextDestination =
        order.customerLiveLocation?.latitude !== null &&
        order.customerLiveLocation?.latitude !== undefined &&
        order.customerLiveLocation?.longitude !== null &&
        order.customerLiveLocation?.longitude !== undefined
          ? order.customerLiveLocation
          : order.shippingAddress?.location || null;

      const currentTimestamp = getLocationTimestamp(currentDestination);
      const nextTimestamp = getLocationTimestamp(nextDestination);

      if (
        currentDestination &&
        currentTimestamp > nextTimestamp &&
        currentDestination?.source === "customer_live"
      ) {
        return currentDestination;
      }

      return nextDestination;
    });
  }, [
    order?._id,
    order?.customerLiveLocation?.latitude,
    order?.customerLiveLocation?.longitude,
    order?.customerLiveLocation?.updatedAt,
    order?.shippingAddress?.location?.latitude,
    order?.shippingAddress?.location?.longitude,
  ]);

  useEffect(() => {
    if (!order?._id) return undefined;

    const socket = connectUserSocket();
    socket.emit("join:user:order", order._id);

    const handleLocationUpdate = (payload) => {
      if (payload?.orderId !== order._id) return;
      setLiveLocation(payload.location || payload?.tracking?.currentLocation || null);
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
      socket.emit("leave:user:order", order._id);
      socket.off("order:location:update", handleLocationUpdate);
      socket.off("order:location:stopped", handleLocationStop);
      socket.off("order:destination:update", handleDestinationUpdate);
    };
  }, [order?._id]);

  useEffect(() => {
    setRouteMeta(null);
    nearbyAlertRef.current = "";
  }, [
    liveDestination?.latitude,
    liveDestination?.longitude,
    liveDestination?.updatedAt,
  ]);

  useEffect(() => {
    setRouteMeta(null);
  }, [
    liveLocation?.latitude,
    liveLocation?.longitude,
    liveLocation?.updatedAt,
    trackingSnapshot?.lastSharedAt,
    trackingSnapshot?.currentLocation?.latitude,
    trackingSnapshot?.currentLocation?.longitude,
    trackingSnapshot?.currentLocation?.updatedAt,
  ]);

  useEffect(() => {
    if (!order?._id) return;
    const isIndiaOrder = String(order.shippingAddress?.country || "")
      .trim()
      .toLowerCase()
      .includes("india");
    const trackingInfoLocal = trackingSnapshot || order.deliveryTracking || {};
    const recentTrailPointsLocal = sanitizeTrackingPoints(
      trackingInfoLocal?.recentPoints,
      isIndiaOrder
    );
    const trackingLocationLocal = getResolvedTrackingLocation({
      liveLocation,
      trailPoints: recentTrailPointsLocal,
      currentLocation: trackingInfoLocal.currentLocation,
      restrictToIndia: isIndiaOrder,
    });
    const rawDestinationLocationLocal =
      liveDestination ||
      order.customerLiveLocation ||
      order.shippingAddress?.location;
    const destinationLocationLocal =
      isIndiaOrder &&
      rawDestinationLocationLocal &&
      !isWithinIndiaBounds(rawDestinationLocationLocal)
        ? order.shippingAddress?.location || null
        : rawDestinationLocationLocal;
    const fallbackDistanceKm =
      hasCoordinate(trackingLocationLocal?.latitude, trackingLocationLocal?.longitude) &&
      hasCoordinate(destinationLocationLocal?.latitude, destinationLocationLocal?.longitude)
        ? calculateDistanceKm(trackingLocationLocal, destinationLocationLocal)
        : null;
    const effectiveDistanceKm =
      routeMeta?.distanceKm !== null && routeMeta?.distanceKm !== undefined
        ? routeMeta.distanceKm
        : fallbackDistanceKm;
    const localNearbyState = getNearbyState(effectiveDistanceKm, isLiveTrackingActive);

    if (!localNearbyState.priority) return;
    if (nearbyAlertRef.current === localNearbyState.label) return;

    toast.success(localNearbyState.alertMessage || "Delivery partner is nearby.", {
      id: `delivery-nearby-${order._id}-${localNearbyState.label}`,
    });
    nearbyAlertRef.current = localNearbyState.label;
  }, [
    isLiveTrackingActive,
    liveDestination,
    liveLocation,
    order,
    routeMeta?.distanceKm,
    trackingSnapshot,
  ]);

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
  const walletAppliedAmount = Number(order.walletApplied?.amountUsed || 0);
  const couponDiscountAmount = Number(order.discountAmount || 0);
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
  const trackingInfo =
    getFreshestTrackingSnapshot(trackingSnapshot, order.deliveryTracking) || {};
  const recentTrailPoints = sanitizeTrackingPoints(
    trackingInfo?.recentPoints,
    isIndiaOrder
  );
  const trackingLocation = getResolvedTrackingLocation({
    liveLocation,
    trailPoints: recentTrailPoints,
    currentLocation: trackingInfo.currentLocation,
    restrictToIndia: isIndiaOrder,
  });
  const rawDestinationLocation =
    (isReliableCustomerLocation(liveDestination) ? liveDestination : null) ||
    (isReliableCustomerLocation(order.customerLiveLocation)
      ? order.customerLiveLocation
      : null) ||
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
  const shouldRenderRouteMap = Boolean(hasTrackingLocation || hasDestinationLocation);
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
  const fallbackDistanceKm =
    hasTrackingLocation && hasDestinationLocation
      ? calculateDistanceKm(trackingLocation, destinationLocation)
      : null;
  const distanceKm =
    routeMeta?.distanceKm !== null && routeMeta?.distanceKm !== undefined
      ? routeMeta.distanceKm
      : fallbackDistanceKm;
  const etaMinutes = resolveEtaMinutes({
    routeDurationMinutes: routeMeta?.durationMinutes,
    routeDistanceKm: routeMeta?.distanceKm,
    fallbackDistanceKm,
    speedMetersPerSecond: trackingLocation?.speed,
    isFallbackRoute: Boolean(routeMeta?.isFallback),
  });
  const movementTrend = getDistanceTrend({
    trailPoints: recentTrailPoints,
    currentLocation: trackingLocation,
    destination: destinationLocation,
  });
  const nearbyState = getNearbyState(distanceKm, isLiveTrackingActive);
  const activeMovementState = nearbyState.priority ? nearbyState : movementTrend;
  const lastPingAt =
    trackingLocation?.updatedAt ||
    trackingLocation?.at ||
    trackingInfo?.lastSharedAt ||
    trackingInfo?.updatedAt ||
    null;
  const relativePingLabel = formatRelativePingTime(lastPingAt);
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

  const handleDownloadInvoice = () => {
    const invoiceWindow = window.open("", "_blank", "width=960,height=800");
    if (!invoiceWindow) {
      toast.error("Invoice window open nahi hua. Browser popup allow karo.");
      return;
    }

    const itemsMarkup = order.items
      .map(
        (item) => `
          <tr>
            <td style="padding:12px;border-bottom:1px solid #e2e8f0;">${item.productName}</td>
            <td style="padding:12px;border-bottom:1px solid #e2e8f0;">${item.variant || "Default"}</td>
            <td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.quantity}</td>
            <td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;">Rs ${Number(item.price || 0).toLocaleString()}</td>
            <td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;">Rs ${Number(item.subtotal || 0).toLocaleString()}</td>
          </tr>
        `,
      )
      .join("");

    invoiceWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${order.orderId}</title>
          <meta charset="utf-8" />
        </head>
        <body style="font-family: Arial, sans-serif; padding: 32px; color: #0f172a;">
          <div style="max-width: 900px; margin: 0 auto;">
            <div style="display:flex;justify-content:space-between;gap:24px;align-items:flex-start;">
              <div>
                <p style="letter-spacing:0.3em;font-size:12px;color:#64748b;margin:0;">CLASSYSHOP</p>
                <h1 style="margin:12px 0 0;font-size:32px;">Tax Invoice</h1>
                <p style="margin:8px 0 0;color:#475569;">Order #${order.orderId}</p>
              </div>
              <div style="text-align:right;">
                <p style="margin:0;color:#475569;">Date</p>
                <p style="margin:8px 0 0;font-weight:700;">${new Date(order.createdAt).toLocaleString("en-IN")}</p>
                <p style="margin:16px 0 0;color:#475569;">Payment</p>
                <p style="margin:8px 0 0;font-weight:700;">${getStatusLabel(order.paymentStatus)}</p>
              </div>
            </div>

            <div style="margin-top:28px;padding:20px;border:1px solid #e2e8f0;border-radius:20px;">
              <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.2em;color:#64748b;">BILL TO</p>
              <p style="margin:0;font-weight:700;">${order.shippingAddress.fullName}</p>
              <p style="margin:8px 0 0;color:#475569;">
                ${[
                  order.shippingAddress.addressLine1,
                  order.shippingAddress.village,
                  order.shippingAddress.city,
                  order.shippingAddress.district,
                  order.shippingAddress.state,
                  order.shippingAddress.postalCode,
                  order.shippingAddress.country,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <p style="margin:8px 0 0;color:#475569;">Phone: ${order.shippingAddress.phone}</p>
            </div>

            <table style="width:100%;margin-top:28px;border-collapse:collapse;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="padding:12px;text-align:left;">Item</th>
                  <th style="padding:12px;text-align:left;">Variant</th>
                  <th style="padding:12px;text-align:center;">Qty</th>
                  <th style="padding:12px;text-align:right;">Price</th>
                  <th style="padding:12px;text-align:right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>${itemsMarkup}</tbody>
            </table>

            <div style="margin-top:28px;display:flex;justify-content:flex-end;">
              <div style="width:320px;">
                <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e2e8f0;">
                  <span>Subtotal</span>
                  <strong>Rs ${Number(order.subtotalAmount || order.totalAmount).toLocaleString()}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e2e8f0;">
                  <span>Coupon Discount</span>
                  <strong>- Rs ${couponDiscountAmount.toLocaleString()}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e2e8f0;">
                  <span>Wallet Applied</span>
                  <strong>- Rs ${walletAppliedAmount.toLocaleString()}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding:14px 0;font-size:20px;">
                  <span>Total</span>
                  <strong>Rs ${Number(order.totalAmount || 0).toLocaleString()}</strong>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    invoiceWindow.document.close();
    invoiceWindow.focus();
    invoiceWindow.print();
  };

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
              {relativePingLabel}
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
                activeMovementState.tone === "approaching"
                  ? "text-emerald-500"
                  : activeMovementState.tone === "away"
                  ? "text-rose-500"
                  : activeMovementState.tone === "nearby" ||
                    activeMovementState.tone === "arrived" ||
                    activeMovementState.tone === "steady"
                  ? "text-cyan-500"
                  : headingText
              }`}
            >
              {activeMovementState.label}
            </p>
            <p className={`mt-1 text-xs ${mutedText}`}>
              {activeMovementState.detail}
            </p>
          </div>
          <div className={`${isDark ? "bg-slate-950/70 border-slate-800" : "bg-white border-cyan-100"} rounded-2xl border p-4`}>
            <p className={`text-xs uppercase tracking-[0.22em] ${mutedText}`}>
              Nearby state
            </p>
            <p className={`mt-2 text-sm font-semibold ${headingText}`}>
              {nearbyState.label}
            </p>
            <p className={`mt-1 text-xs ${mutedText}`}>
              {nearbyState.detail}
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

      {shouldRenderRouteMap ? (
        <div className="mt-5">
          <div
            className={`mb-4 rounded-[24px] border p-4 ${
              isDark ? "border-slate-700 bg-slate-950/70" : "border-slate-200 bg-slate-50/90"
            }`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className={`text-xs uppercase tracking-[0.22em] ${mutedText}`}>
                  Live delivery map
                </p>
                <h3 className={`mt-2 text-2xl font-black ${headingText}`}>
                  {etaMinutes
                    ? `Arriving in ${formatEta(etaMinutes)}`
                    : hasDestinationLocation
                    ? "Delivery partner is on the way"
                    : "Waiting for destination pin"}
                </h3>
                <p className={`mt-2 text-sm ${mutedText}`}>
                  {hasDestinationLocation
                    ? "Map ab live route, rider movement aur zoom controls ke saath update hota rahega."
                    : "Destination pin sync hote hi full route line automatically draw hogi."}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div
                  className={`rounded-2xl border px-4 py-3 ${
                    isDark ? "border-slate-800 bg-slate-900/80" : "border-slate-200 bg-white"
                  }`}
                >
                  <p className={`text-[11px] uppercase tracking-[0.18em] ${mutedText}`}>
                    Tracking
                  </p>
                  <p className={`mt-2 text-sm font-bold ${headingText}`}>
                    {isLiveTrackingActive ? "Live now" : "Waiting for ping"}
                  </p>
                  <p className={`mt-1 text-xs ${mutedText}`}>{relativePingLabel}</p>
                </div>
                <div
                  className={`rounded-2xl border px-4 py-3 ${
                    isDark ? "border-slate-800 bg-slate-900/80" : "border-slate-200 bg-white"
                  }`}
                >
                  <p className={`text-[11px] uppercase tracking-[0.18em] ${mutedText}`}>
                    Distance
                  </p>
                  <p className={`mt-2 text-sm font-bold ${headingText}`}>
                    {formatDistance(distanceKm)}
                  </p>
                </div>
                <div
                  className={`rounded-2xl border px-4 py-3 ${
                    isDark ? "border-slate-800 bg-slate-900/80" : "border-slate-200 bg-white"
                  }`}
                >
                  <p className={`text-[11px] uppercase tracking-[0.18em] ${mutedText}`}>
                    Nearby
                  </p>
                  <p className={`mt-2 text-sm font-bold ${headingText}`}>
                    {nearbyState.label}
                  </p>
                  <p className={`mt-1 text-xs ${mutedText}`}>{nearbyState.detail}</p>
                </div>
              </div>
            </div>
          </div>

          <LiveRouteMap
            origin={trackingLocation}
            destination={hasDestinationLocation ? destinationLocation : null}
            trailPoints={recentTrailPoints}
            heightClass="h-[24rem] md:h-[30rem]"
            reverseRouteDirection
            restrictToIndia={isIndiaOrder}
            riderLabel={order.assignedDeliveryPartner?.name || "Delivery partner"}
            destinationLabel={
              hasUserLiveDestination
                ? "Your live location"
                : order.shippingAddress?.fullName || "Customer"
            }
            statusLabel={
              isLiveTrackingActive ? "Tracking your order" : "Waiting for live ping"
            }
            headline={
              etaMinutes
                ? `Arriving in ${etaMinutes < 60 ? `${etaMinutes} mins` : `${Math.floor(etaMinutes / 60)}h ${etaMinutes % 60 ? `${etaMinutes % 60}m` : ""}`.trim()}`
                : hasDestinationLocation
                ? "Delivery partner is on the way"
                : "Waiting for destination pin"
            }
            subheadline={
              routeMeta?.isFallback
                ? "Road route sync ho raha hai. Filhaal fallback connector active hai."
                : hasDestinationLocation
                ? "Blue route rider ke live position ke hisaab se update hoti rahegi."
                : "Customer destination pin sync hote hi full route draw ho jayega."
            }
            etaLabel={formatEta(etaMinutes)}
            distanceLabel={formatDistance(distanceKm)}
            movementLabel={activeMovementState.label}
            heading={trackingLocation?.heading || trackingInfo?.currentLocation?.heading}
            onRouteMetaChange={setRouteMeta}
          />
        </div>
      ) : null}

      {!hasDestinationLocation ? (
        <div
          className={`mt-4 rounded-2xl border border-dashed p-4 text-sm ${mutedText} ${
            isDark ? "border-slate-700 bg-slate-950/60" : "border-gray-200 bg-gray-50"
          }`}
        >
          Customer destination pin sync hote hi solid blue route line bhi show hone lagegi.
          Abhi rider ki live location map par visible rahegi.
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
          Blue line current route hai. Rider aage ya piche move karega to trend, nearby state aur map sab live update honge.
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

    getBestCurrentLocation({
      acceptableAccuracy: MAX_CUSTOMER_LOCATION_ACCURACY_METERS,
    })
      .then(async (position) => {
        try {
          const payload = {
            latitude: Number(position.latitude.toFixed(6)),
            longitude: Number(position.longitude.toFixed(6)),
            accuracy: Number(position.accuracy || 0),
            label: "Customer live location",
          };

          setRouteMeta(null);

          const response = await saveCustomerLiveLocation({
            orderId: order._id,
            body: payload,
          }).unwrap();

          setLiveDestination(
            response?.destination || {
              ...payload,
              source: "customer_live",
              updatedAt: new Date().toISOString(),
            }
          );
          await refetch();
          if (
            Number.isFinite(payload.accuracy) &&
            payload.accuracy > MAX_CUSTOMER_LOCATION_ACCURACY_METERS
          ) {
            toast.success(
              `Current location updated. GPS signal weak tha, exactness around ${Math.round(
                payload.accuracy
              )} m ho sakti hai.`
            );
          } else {
          toast.success("Your current delivery location has been saved");
          }
        } catch (error) {
          toast.error(
            error?.data?.message || "Failed to save current delivery location"
          );
        } finally {
          setIsResolvingCustomerLocation(false);
        }
      })
      .catch((error) => {
        setIsResolvingCustomerLocation(false);
        const message =
          error?.code === 1
            ? "Browser me location permission allow karo"
            : error?.message || "Current location detect nahi ho pa rahi";
        toast.error(message);
      });
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
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className={`text-xl font-bold ${headingText}`}>Order Summary</h2>
                <button
                  type="button"
                  onClick={handleDownloadInvoice}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-red-300 hover:text-red-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  <FaFileInvoice className="text-red-500" />
                  Download Invoice
                </button>
                {[
                  "shipped",
                  "out_for_delivery",
                  "return_approved",
                  "delivered",
                ].includes(order.orderStatus) ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/track-order/${order._id}`)}
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-600"
                  >
                    <FaRoute />
                    Open Track View
                  </button>
                ) : null}
              </div>
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
                <div className="flex justify-between">
                  <span>Coupon Discount</span>
                  <span className="font-medium text-emerald-500">
                    - ₹{couponDiscountAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Wallet Applied</span>
                  <span className="font-medium text-emerald-500">
                    - ₹{walletAppliedAmount.toLocaleString()}
                  </span>
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
                  {order.paymentMethod === "wallet" ? (
                    <span className="inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-500">
                      Wallet
                    </span>
                  ) : order.paymentMethod === "razorpay" ? (
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
                {walletAppliedAmount > 0 ? (
                  <div className="flex justify-between gap-3">
                    <span>Wallet used</span>
                    <span className="text-right break-all">
                      ₹{walletAppliedAmount.toLocaleString()}
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
