import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Ban,
  Clock3,
  LocateFixed,
  LocateOff,
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
import { getDeliverySocket } from "../../../lib/socket";
import LiveRouteMap from "../../../component/tracking/LiveRouteMap";

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
  const { orderId } = useParams();
  const trackingWatchRef = useRef(null);
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useGetAssignedOrdersQuery();
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpMeta, setOtpMeta] = useState(null);
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [isStartingTracking, setIsStartingTracking] = useState(false);
  const [isStoppingTracking, setIsStoppingTracking] = useState(false);
  const [liveLocation, setLiveLocation] = useState(null);
  const [liveDestination, setLiveDestination] = useState(null);
  const [trackingError, setTrackingError] = useState("");
  const [routeMeta, setRouteMeta] = useState(null);
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

  const isIndiaDeliveryOrder = String(order?.shippingAddress?.country || "")
    .trim()
    .toLowerCase()
    .includes("india");
  const trackingInfo = order?.deliveryTracking || {};
  const recentTrailPoints = useMemo(
    () => sanitizeTrackingPoints(trackingInfo?.recentPoints || [], isIndiaDeliveryOrder),
    [isIndiaDeliveryOrder, trackingInfo?.recentPoints]
  );
  const rawDestinationLocation =
    liveDestination ||
    order?.customerLiveLocation ||
    order?.shippingAddress?.location;
  const destinationLocation =
    isIndiaDeliveryOrder &&
    rawDestinationLocation &&
    !isWithinIndiaBounds(rawDestinationLocation)
      ? order?.shippingAddress?.location || null
      : rawDestinationLocation;
  const hasCustomerLiveDestination = Boolean(
    liveDestination?.source === "customer_live" ||
      (order?.customerLiveLocation?.latitude !== null &&
        order?.customerLiveLocation?.latitude !== undefined &&
        order?.customerLiveLocation?.longitude !== null &&
        order?.customerLiveLocation?.longitude !== undefined)
  );
  const canMarkDelivered = order?.orderStatus === "out_for_delivery";
  const canCancelOrder = ["processing", "shipped", "out_for_delivery"].includes(
    order?.orderStatus
  );
  const canCompleteReturn = order?.orderStatus === "return_approved";
  const otpPurpose = canCompleteReturn ? "return" : "delivery";
  const isReturnRequested = order?.orderStatus === "return_requested";
  const canShareLiveLocation = ["out_for_delivery", "return_approved"].includes(
    order?.orderStatus
  );

  useEffect(() => {
    if (!order) return;

    const currentLocation = order.deliveryTracking?.currentLocation;
    setLiveLocation(
      currentLocation?.latitude !== null &&
        currentLocation?.latitude !== undefined &&
        currentLocation?.longitude !== null &&
        currentLocation?.longitude !== undefined
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
    setIsTrackingActive(Boolean(order.deliveryTracking?.isLive));
    setRouteMeta(null);
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

  const stopLiveTracking = ({ silent = false } = {}) => {
    setIsStoppingTracking(true);

    if (trackingWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(trackingWatchRef.current);
      trackingWatchRef.current = null;
    }

    const socket = getDeliverySocket();
    if (socket.connected && orderId) {
      socket.emit("delivery:location:stop", { orderId });
    }

    setIsTrackingActive(false);
    setIsStartingTracking(false);

    if (!silent) {
      toast.success("Live tracking stopped");
    }

    setTimeout(() => {
      setIsStoppingTracking(false);
    }, 250);
  };

  useEffect(() => {
    if (canShareLiveLocation) return undefined;

    stopLiveTracking({ silent: true });
    return undefined;
  }, [canShareLiveLocation]);

  useEffect(
    () => () => {
      stopLiveTracking({ silent: true });
    },
    []
  );

  useEffect(() => {
    const socket = getDeliverySocket();

    const handleTrackingUpdate = (payload) => {
      if (payload?.orderId !== orderId) return;
      setLiveLocation(payload.location || null);
      setIsTrackingActive(Boolean(payload?.tracking?.isLive));
      setIsStartingTracking(false);
      setIsStoppingTracking(false);
    };

    const handleTrackingStop = (payload) => {
      if (payload?.orderId !== orderId) return;
      setIsTrackingActive(false);
      setIsStartingTracking(false);
      setIsStoppingTracking(false);
    };

    const handleDestinationUpdate = (payload) => {
      if (payload?.orderId !== orderId) return;
      setLiveDestination(payload.destination || order?.shippingAddress?.location || null);
    };

    const handleTrackingError = (payload) => {
      if (payload?.orderId !== orderId) return;
      setTrackingError(
        payload?.message ||
          "Live location update reject ho gaya. Browser location settings check karo."
      );
      setIsTrackingActive(false);
      setIsStartingTracking(false);
      setIsStoppingTracking(false);
      toast.error(
        payload?.message ||
          "Live location update reject ho gaya. Browser location settings check karo."
      );
    };

    socket.on("delivery:tracking:update", handleTrackingUpdate);
    socket.on("delivery:tracking:stopped", handleTrackingStop);
    socket.on("order:destination:update", handleDestinationUpdate);
    socket.on("delivery:tracking:error", handleTrackingError);

    return () => {
      socket.off("delivery:tracking:update", handleTrackingUpdate);
      socket.off("delivery:tracking:stopped", handleTrackingStop);
      socket.off("order:destination:update", handleDestinationUpdate);
      socket.off("delivery:tracking:error", handleTrackingError);
    };
  }, [orderId, order?.shippingAddress?.location]);

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
      stopLiveTracking({ silent: true });
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

      if (["cancelled", "return_completed"].includes(status)) {
        stopLiveTracking({ silent: true });
      }

      toast.success(successMessage);
      refetch();
    } catch (error) {
      toast.error(error?.data?.message || "Status update failed");
    }
  };

  const handleStartLiveTracking = async () => {
    if (!canShareLiveLocation) {
      toast.error("Live tracking is available only during delivery or return pickup");
      return;
    }

    if (!navigator.geolocation) {
      toast.error("Location tracking is not supported on this device");
      return;
    }

    if (trackingWatchRef.current !== null) {
      return;
    }

    setIsStartingTracking(true);

    const socket = getDeliverySocket();
    if (!socket.connected) {
      socket.connect();
    }

    trackingWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const nextLocation = {
          latitude: Number(position.coords.latitude),
          longitude: Number(position.coords.longitude),
          accuracy: Number(position.coords.accuracy || 0),
          heading:
            position.coords.heading === null || position.coords.heading === undefined
              ? null
              : Number(position.coords.heading),
          speed:
            position.coords.speed === null || position.coords.speed === undefined
              ? null
              : Number(position.coords.speed),
          updatedAt: new Date().toISOString(),
        };

        const isIndiaDeliveryOrder = String(order?.shippingAddress?.country || "")
          .trim()
          .toLowerCase()
          .includes("india");

        if (isIndiaDeliveryOrder && !isWithinIndiaBounds(nextLocation)) {
          const message =
            "Current device location India ke bahar detect ho rahi hai. Browser location settings ya GPS check karke phir try karo.";
          setTrackingError(message);
          setIsTrackingActive(false);
          setIsStartingTracking(false);
          toast.error(message);
          return;
        }

        setTrackingError("");
        setLiveLocation(nextLocation);
        setIsTrackingActive(true);
        setIsStartingTracking(false);
        socket.emit("delivery:location:update", {
          orderId,
          ...nextLocation,
        });
      },
      (error) => {
        const message =
          error?.code === 1
            ? "Location permission denied. Browser me location allow karo."
            : error?.code === 2
            ? "Current location detect nahi ho pa rahi."
            : "Live location track karne me issue aa raha hai.";
        setTrackingError(message);
        setIsTrackingActive(false);
        setIsStartingTracking(false);
        toast.error(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );

    toast.success(
      canCompleteReturn
        ? "Return pickup live tracking started"
        : "Delivery live tracking started"
    );
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

  const rawMapLocation = getResolvedTrackingLocation({
    liveLocation,
    trailPoints: recentTrailPoints,
    currentLocation: trackingInfo.currentLocation,
    restrictToIndia: isIndiaDeliveryOrder,
  });
  const mapLocation =
    isIndiaDeliveryOrder &&
    rawMapLocation &&
    !isWithinIndiaBounds(rawMapLocation)
      ? null
      : rawMapLocation;
  const hasMapLocation = Boolean(
    mapLocation?.latitude !== null &&
      mapLocation?.latitude !== undefined &&
      mapLocation?.longitude !== null &&
      mapLocation?.longitude !== undefined
  );
  const hasDestinationLocation = Boolean(
    hasCoordinate(destinationLocation?.latitude, destinationLocation?.longitude)
  );
  const mapLink = hasMapLocation
    ? getMapUrl(mapLocation.latitude, mapLocation.longitude)
    : "";
  const directionsUrl = buildDirectionsUrl(mapLocation, destinationLocation);
  const fallbackDistanceKm =
    hasMapLocation && hasDestinationLocation
      ? calculateDistanceKm(mapLocation, destinationLocation)
      : null;
  const distanceKm =
    routeMeta?.distanceKm !== null && routeMeta?.distanceKm !== undefined
      ? routeMeta.distanceKm
      : fallbackDistanceKm;
  const fallbackEtaMinutes = estimateEtaMinutes(
    fallbackDistanceKm,
    mapLocation?.speed
  );
  const etaMinutes =
    routeMeta?.durationMinutes !== null && routeMeta?.durationMinutes !== undefined
      ? routeMeta.durationMinutes
      : fallbackEtaMinutes;
  const movementTrend = getDistanceTrend({
    trailPoints: recentTrailPoints,
    currentLocation: mapLocation,
    destination: destinationLocation,
  });
  const nearbyState = getNearbyState(distanceKm, isTrackingActive);
  const activeMovementState = nearbyState.priority ? nearbyState : movementTrend;
  const relativePingLabel = formatRelativePingTime(
    mapLocation?.updatedAt ||
      mapLocation?.at ||
      trackingInfo?.lastSharedAt ||
      trackingInfo?.updatedAt
  );
  const trackingMilestones = getTrackingMilestones(
    order.orderStatus,
    isTrackingActive
  );
  const isTrackingActionLoading = isStartingTracking || isStoppingTracking;

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
                <h2 className="text-lg font-semibold text-white">Live map tracking</h2>
                <p className="mt-2 text-sm text-slate-400">
                  {canCompleteReturn
                    ? "Return pickup route share karne ke liye live location start karo."
                    : "Out-for-delivery orders ke liye live location share karo."}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                  isTrackingActive
                    ? "bg-cyan-500/15 text-cyan-300"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {isTrackingActive ? "Tracking live" : "Tracking paused"}
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                      Destination
                    </p>
                    <p className="mt-2 text-lg font-bold text-white">
                      {order.shippingAddress?.fullName}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {order.shippingAddress?.city}, {order.shippingAddress?.state}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                      Estimated arrival
                    </p>
                    <p className="mt-2 text-lg font-bold text-white">
                      {formatEta(etaMinutes)}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {formatDistance(distanceKm)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {trackingMilestones.map((step) => (
                    <div
                      key={step.label}
                      className={`rounded-2xl border px-4 py-3 ${
                        step.done
                          ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
                          : step.active
                          ? "border-cyan-400/25 bg-cyan-500/10 text-cyan-300"
                          : "border-slate-800 bg-slate-950/60 text-slate-400"
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

              {false ? (
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-slate-800 bg-slate-950/80 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                          Live navigation map
                        </p>
                        <h3 className="mt-2 text-2xl font-black text-white">
                          {etaMinutes
                            ? `Reach in ${formatEta(etaMinutes)}`
                            : hasDestinationLocation
                            ? "Navigate to customer"
                            : "Waiting for customer pin"}
                        </h3>
                        <p className="mt-2 text-sm text-slate-400">
                          {hasDestinationLocation
                            ? "Zoom, recenter aur live route follow karke exact road path dekho."
                            : "Customer saved/live pin sync hote hi full route line draw ho jayegi."}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                            Tracking
                          </p>
                          <p className="mt-2 text-sm font-bold text-white">
                            {isTrackingActive ? "Live now" : "Paused"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {relativePingLabel}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                            Distance
                          </p>
                          <p className="mt-2 text-sm font-bold text-white">
                            {formatDistance(distanceKm)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                            Nearby
                          </p>
                          <p className="mt-2 text-sm font-bold text-white">
                            {nearbyState.label}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {nearbyState.detail}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <LiveRouteMap
                    key={`${Number(mapLocation?.latitude || 0).toFixed(6)}:${Number(
                      mapLocation?.longitude || 0,
                    ).toFixed(6)}-${Number(destinationLocation?.latitude || 0).toFixed(6)}:${Number(
                      destinationLocation?.longitude || 0,
                    ).toFixed(6)}`}
                    origin={mapLocation}
                    destination={destinationLocation}
                    trailPoints={recentTrailPoints}
                    heightClass="h-[24rem] md:h-[30rem]"
                    restrictToIndia={isIndiaDeliveryOrder}
                    riderLabel="Your live location"
                    destinationLabel={
                      hasCustomerLiveDestination
                        ? "Customer live location"
                        : order.shippingAddress?.fullName || "Customer"
                    }
                    statusLabel={
                      isTrackingActive
                        ? canCompleteReturn
                          ? "Tracking return pickup"
                          : "Tracking delivery"
                        : "Tracking paused"
                    }
                    headline={
                      etaMinutes
                        ? `Reach in ${formatEta(etaMinutes)}`
                        : hasDestinationLocation
                        ? "Navigate to customer"
                        : "Waiting for customer pin"
                    }
                    subheadline={
                      routeMeta?.isFallback
                        ? "Road route sync ho raha hai. Filhaal fallback connector active hai."
                        : hasDestinationLocation
                        ? "Blue route aapki live movement ke hisaab se update hoti rahegi."
                        : "Customer saved/live pin sync hote hi full route draw ho jayega."
                    }
                    etaLabel={formatEta(etaMinutes)}
                    distanceLabel={formatDistance(distanceKm)}
                    movementLabel={activeMovementState.label}
                    heading={mapLocation?.heading || trackingInfo?.currentLocation?.heading}
                    onRouteMetaChange={setRouteMeta}
                  />
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-700 px-5 py-10 text-center text-sm text-slate-500">
                  Live location start karte hi map yahan show hoga.
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-600">
                    Last shared
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {relativePingLabel}
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-600">
                    Coordinates
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {hasMapLocation
                      ? `${Number(mapLocation.latitude).toFixed(5)}, ${Number(
                          mapLocation.longitude
                        ).toFixed(5)}`
                      : "Not shared yet"}
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-600">
                    Distance left
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {formatDistance(distanceKm)}
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-600">
                    Movement
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {activeMovementState.label}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {activeMovementState.detail}
                  </p>
                </div>
              </div>

              {trackingError ? (
                <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {trackingError}
                </div>
              ) : null}

              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
                Live map tracking remove kar diya gaya hai. Order handling ab status, OTP, cancel, aur return actions se manage hoga.
              </div>
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
