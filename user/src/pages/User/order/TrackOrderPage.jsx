import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  MapPinned,
  Navigation,
  Route,
  Timer,
} from "lucide-react";
import toast from "react-hot-toast";
import { connectUserSocket } from "../../../lib/socket.js";
import {
  useGetUserOrdersQuery,
  useSaveCustomerLiveLocationMutation,
} from "../../../features/api/orderApi.js";
import { useTheme } from "../../../context/ThemeContext.jsx";
import LiveRouteMap from "../../../components/tracking/LiveRouteMap.jsx";
import PageLoader from "../../../components/Loader/PageLoader.jsx";
import ErrorMessage from "../../../components/error/ErrorMessage.jsx";
import { getBestCurrentLocation } from "../../../utils/geolocation.js";

const INDIA_BOUNDS = {
  minLatitude: 6,
  maxLatitude: 38.5,
  minLongitude: 68,
  maxLongitude: 98,
};
const MAX_CUSTOMER_LOCATION_ACCURACY_METERS = 1200;
const MIN_REASONABLE_ROUTE_SPEED_KMH = 8;
const MAX_REASONABLE_ROUTE_SPEED_KMH = 120;

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

  return Number((earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))).toFixed(1));
};

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
    (point) => !restrictToIndia || isWithinIndiaBounds(point),
  );

  return validCandidate || null;
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

const isReliableCustomerLocation = (location) => {
  if (!hasCoordinate(location?.latitude, location?.longitude)) return false;

  if (
    location?.accuracy !== null &&
    location?.accuracy !== undefined &&
    Number.isFinite(Number(location.accuracy)) &&
    Number(location.accuracy) > MAX_CUSTOMER_LOCATION_ACCURACY_METERS
  ) {
    return false;
  }

  return true;
};

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

const formatDistance = (distanceKm) => {
  if (distanceKm === null || distanceKm === undefined) return "Mapping route";
  if (distanceKm < 1) return `${Math.max(100, Math.round(distanceKm * 1000))} m left`;
  return `${distanceKm.toFixed(1)} km left`;
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
      detail: "Customer pin sync hone ke baad live direction update dikhegi.",
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
      detail: "Delivery partner ka next live ping aate hi movement trend show hoga.",
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
    };
  }

  const deltaKm = Number((previousDistance - latestDistance).toFixed(2));
  const deltaMeters = Math.round(Math.abs(deltaKm) * 1000);

  if (deltaKm > 0.05) {
    return {
      label: "Approaching you",
      detail: `Last update me rider lagbhag ${deltaMeters} m aur paas aaya hai.`,
    };
  }

  if (deltaKm < -0.05) {
    return {
      label: "Moving away",
      detail: `Last update me rider lagbhag ${deltaMeters} m door gaya hai.`,
    };
  }

  return {
    label: "Holding nearby",
    detail: "Movement stable hai, next ping par fresh direction milegi.",
  };
};

const buildDirectionsUrl = (origin, destination) => {
  if (!hasCoordinate(destination?.latitude, destination?.longitude)) return "";

  if (hasCoordinate(origin?.latitude, origin?.longitude)) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`;
};

const formatDateTime = (value) => {
  if (!value) return "Time unavailable";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Time unavailable";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
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
      detail: "Delivery partner bilkul aapke paas pahunch gaya hai.",
      tone: "arrived",
      priority: true,
      alertMessage: "Delivery partner has arrived nearby.",
    };
  }

  if (distanceKm <= 0.1) {
    return {
      label: "Within 100 m",
      detail: "Rider bahut paas hai. Order receive karne ke liye ready raho.",
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
    detail: "Delivery partner route par hai aur aapki taraf aa raha hai.",
    tone: "neutral",
    priority: false,
    alertMessage: "",
  };
};

const TrackOrderPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { data, isLoading, isError, refetch } = useGetUserOrdersQuery();
  const [saveCustomerLiveLocation, { isLoading: isSavingCustomerLocation }] =
    useSaveCustomerLiveLocationMutation();

  const [liveLocation, setLiveLocation] = useState(null);
  const [liveDestination, setLiveDestination] = useState(null);
  const [trackingSnapshot, setTrackingSnapshot] = useState(null);
  const [isLiveTrackingActive, setIsLiveTrackingActive] = useState(false);
  const [isResolvingCustomerLocation, setIsResolvingCustomerLocation] = useState(false);
  const [routeMeta, setRouteMeta] = useState(null);
  const nearbyAlertRef = useRef("");

  const order = (data?.orders || []).find((item) => item._id === orderId);

  useEffect(() => {
    if (!order) return;

    const currentLocation = order.deliveryTracking?.currentLocation;
    setTrackingSnapshot(order.deliveryTracking || null);
    setLiveLocation(
      hasCoordinate(currentLocation?.latitude, currentLocation?.longitude)
        ? currentLocation
        : null,
    );
    setLiveDestination(
      hasCoordinate(
        order.customerLiveLocation?.latitude,
        order.customerLiveLocation?.longitude,
      )
        ? order.customerLiveLocation
        : order.shippingAddress?.location || null,
    );
    setIsLiveTrackingActive(Boolean(order.deliveryTracking?.isLive));
    setRouteMeta(null);
    nearbyAlertRef.current = "";
  }, [
    order?._id,
    order?.customerLiveLocation?.latitude,
    order?.customerLiveLocation?.longitude,
    order?.customerLiveLocation?.updatedAt,
    order?.deliveryTracking,
    order?.shippingAddress?.location,
  ]);

  useEffect(() => {
    if (!order?._id) return undefined;

    const socket = connectUserSocket();
    socket.emit("join:user:order", order._id);

    const handleLocationUpdate = (payload) => {
      if (payload?.orderId !== order._id) return;
      setLiveLocation(payload.location || payload?.tracking?.currentLocation || null);
      setTrackingSnapshot(payload.tracking || null);
      setIsLiveTrackingActive(Boolean(payload.tracking?.isLive));
    };

    const handleLocationStopped = (payload) => {
      if (payload?.orderId !== order._id) return;
      setTrackingSnapshot((current) => ({
        ...(current || {}),
        ...(payload.tracking || {}),
      }));
      setIsLiveTrackingActive(false);
    };

    const handleDestinationUpdate = (payload) => {
      if (payload?.orderId !== order._id) return;
      setLiveDestination(payload.destination || null);
    };

    socket.on("order:location:update", handleLocationUpdate);
    socket.on("order:location:stopped", handleLocationStopped);
    socket.on("order:destination:update", handleDestinationUpdate);

    return () => {
      socket.emit("leave:user:order", order._id);
      socket.off("order:location:update", handleLocationUpdate);
      socket.off("order:location:stopped", handleLocationStopped);
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

  const destinationLocation = useMemo(() => {
    if (isReliableCustomerLocation(liveDestination)) {
      return liveDestination;
    }
    if (isReliableCustomerLocation(order?.customerLiveLocation)) {
      return order.customerLiveLocation;
    }
    return order?.shippingAddress?.location || null;
  }, [liveDestination, order?.customerLiveLocation, order?.shippingAddress?.location]);

  const recentTrailPoints = useMemo(
    () => sanitizeTrackingPoints(trackingSnapshot?.recentPoints || [], true),
    [trackingSnapshot?.recentPoints],
  );

  const trackingLocation = useMemo(
    () =>
      getResolvedTrackingLocation({
        liveLocation,
        trailPoints: recentTrailPoints,
        currentLocation: trackingSnapshot?.currentLocation,
        restrictToIndia: true,
      }),
    [liveLocation, recentTrailPoints, trackingSnapshot?.currentLocation],
  );

  const trackingInfo = useMemo(() => {
    const fallbackDistanceKm = calculateDistanceKm(trackingLocation, destinationLocation);
    const distanceKm =
      routeMeta?.distanceKm !== null && routeMeta?.distanceKm !== undefined
        ? routeMeta.distanceKm
        : fallbackDistanceKm;
    const etaMinutes = resolveEtaMinutes({
      routeDurationMinutes: routeMeta?.durationMinutes,
      routeDistanceKm: routeMeta?.distanceKm,
      fallbackDistanceKm,
      speedMetersPerSecond: trackingSnapshot?.currentLocation?.speed,
      isFallbackRoute: Boolean(routeMeta?.isFallback),
    });
    const trend = getDistanceTrend({
      trailPoints: recentTrailPoints,
      currentLocation: trackingLocation,
      destination: destinationLocation,
    });
    const nearbyState = getNearbyState(distanceKm, isLiveTrackingActive);
    const activeMovementState = nearbyState.priority ? nearbyState : trend;
    const lastPingLabel = formatRelativePingTime(
      trackingLocation?.updatedAt ||
        trackingLocation?.at ||
        trackingSnapshot?.lastSharedAt ||
        trackingSnapshot?.updatedAt,
    );

    return {
      trailPoints: recentTrailPoints,
      distanceKm,
      etaMinutes,
      trend: activeMovementState,
      nearbyState,
      lastPingLabel,
      isFallback: Boolean(routeMeta?.isFallback),
      directionsUrl: buildDirectionsUrl(trackingLocation, destinationLocation),
    };
  }, [
    destinationLocation,
    isLiveTrackingActive,
    recentTrailPoints,
    routeMeta?.distanceKm,
    routeMeta?.durationMinutes,
    routeMeta?.isFallback,
    trackingLocation,
    trackingSnapshot,
  ]);

  useEffect(() => {
    if (!order?._id) return;
    if (!trackingInfo.nearbyState?.priority) return;
    if (nearbyAlertRef.current === trackingInfo.nearbyState.label) return;

    toast.success(
      trackingInfo.nearbyState.alertMessage || "Delivery partner is nearby.",
      {
        id: `track-nearby-${order._id}-${trackingInfo.nearbyState.label}`,
      },
    );
    nearbyAlertRef.current = trackingInfo.nearbyState.label;
  }, [
    order?._id,
    trackingInfo.nearbyState?.alertMessage,
    trackingInfo.nearbyState?.label,
    trackingInfo.nearbyState?.priority,
  ]);

  const handleSaveCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Browser geolocation support nahi karta.");
      return;
    }

    setIsResolvingCustomerLocation(true);

    getBestCurrentLocation({
      acceptableAccuracy: MAX_CUSTOMER_LOCATION_ACCURACY_METERS,
    })
      .then(async (position) => {
        try {
          const latitude = Number(position.latitude.toFixed(6));
          const longitude = Number(position.longitude.toFixed(6));
          const accuracy = Number(position.accuracy || 0);

          if (
            Number.isFinite(accuracy) &&
            accuracy > MAX_CUSTOMER_LOCATION_ACCURACY_METERS
          ) {
            toast.error(
              `Current location accurate nahi mili. GPS accuracy ${Math.round(
                accuracy
              )} m hai, precise location on karke phir try karo.`
            );
            return;
          }

          setRouteMeta(null);

          const response = await saveCustomerLiveLocation({
            orderId,
            body: {
              latitude,
              longitude,
              accuracy,
              label: "Customer live location",
            },
          }).unwrap();

          setLiveDestination(
            response?.destination || {
              latitude,
              longitude,
              accuracy,
              source: "customer_live",
              updatedAt: new Date().toISOString(),
            }
          );
          await refetch();
          toast.success("Current delivery pin updated");
        } catch (error) {
          toast.error(error?.data?.message || "Current location save nahi hui.");
        } finally {
          setIsResolvingCustomerLocation(false);
        }
      })
      .catch((error) => {
        toast.error(error?.message || "Current location access allow karo.");
        setIsResolvingCustomerLocation(false);
      });
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (isLoading) return <PageLoader message="Loading live tracking..." />;
  if (isError) return <ErrorMessage onRetry={refetch} />;
  if (!order)
    return (
      <ErrorMessage
        message="Trackable order not found"
        onRetry={() => navigate("/orders")}
      />
    );

  const canUpdateCustomerLocation = [
    "shipped",
    "out_for_delivery",
    "return_approved",
  ].includes(order.orderStatus);
  const cardSurface = isDark
    ? "border-slate-800 bg-slate-900 text-white"
    : "border-slate-200 bg-white text-slate-950";
  const secondarySurface = isDark
    ? "border-slate-800 bg-slate-950 text-slate-100"
    : "border-slate-200 bg-slate-50 text-slate-800";

  return (
    <section className="container mx-auto px-4 pb-10 md:px-3">
      <div
        className={`overflow-hidden rounded-[34px] border shadow-[0_18px_70px_rgba(15,23,42,0.08)] ${
          isDark ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-white"
        }`}
      >
        <div
          className={`px-6 py-10 md:px-10 lg:px-12 ${
            isDark
              ? "bg-[linear-gradient(135deg,#020617_0%,#0f172a_55%,#082f49_100%)] text-white"
              : "bg-[linear-gradient(135deg,#ecfeff_0%,#ffffff_45%,#eff6ff_100%)] text-slate-950"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={() => navigate(`/order/${order._id}`)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] ${
                  isDark
                    ? "bg-white text-slate-950"
                    : "bg-slate-950 text-white"
                }`}
              >
                <ArrowLeft size={14} />
                Back to order details
              </button>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-cyan-500">
                Track order
              </p>
              <h1 className="mt-3 text-4xl font-black md:text-5xl">
                Order #{order.orderId}
              </h1>
              <p className={`mt-4 max-w-3xl text-base leading-7 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                Delivery partner ki live movement, distance left, ETA, aur customer
                pin updates yahan full-screen view me dekh sakte ho.
              </p>
            </div>

            <div
              className={`rounded-[26px] border px-5 py-4 ${
                isDark ? "border-slate-800 bg-slate-900/80" : "border-white bg-white/80"
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Current status
              </p>
              <p className="mt-3 text-2xl font-black capitalize">
                {String(order.orderStatus || "pending").replace(/_/g, " ")}
              </p>
              <p className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                Last update {formatDateTime(order.updatedAt || order.createdAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 px-6 py-8 md:px-10 lg:grid-cols-[1.18fr_0.82fr]">
          <div className="space-y-6">
            <div className={`rounded-[30px] border p-5 ${cardSurface}`}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-500">
                    Live route
                  </p>
                  <h2 className="mt-2 text-2xl font-black">Delivery partner movement</h2>
                </div>
                {trackingInfo.directionsUrl ? (
                  <a
                    href={trackingInfo.directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                      isDark
                        ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                        : "bg-slate-950 text-white hover:bg-slate-800"
                    }`}
                  >
                    <Navigation size={15} />
                    Open route
                  </a>
                ) : null}
              </div>

              <div
                className={`mb-4 rounded-[24px] border p-4 ${
                  isDark ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-slate-50/90"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-500">
                      Live route map
                    </p>
                    <h2 className="mt-2 text-2xl font-black">
                      {trackingInfo.etaMinutes
                        ? `Arriving in ${formatEta(trackingInfo.etaMinutes)}`
                        : hasCoordinate(
                            destinationLocation?.latitude,
                            destinationLocation?.longitude,
                          )
                        ? "Delivery partner is on the way"
                        : "Waiting for destination pin"}
                    </h2>
                    <p className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      Zoom aur recenter se aap full road path dekh sakte ho. Rider movement ke saath route line update hoti rahegi.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className={`rounded-2xl border px-4 py-3 ${secondarySurface}`}>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Tracking
                      </p>
                      <p className="mt-2 text-sm font-bold">
                        {isLiveTrackingActive ? "Live now" : "Waiting for ping"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {trackingInfo.lastPingLabel}
                      </p>
                    </div>
                    <div className={`rounded-2xl border px-4 py-3 ${secondarySurface}`}>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Distance
                      </p>
                      <p className="mt-2 text-sm font-bold">
                        {formatDistance(trackingInfo.distanceKm)}
                      </p>
                    </div>
                    <div className={`rounded-2xl border px-4 py-3 ${secondarySurface}`}>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Nearby
                      </p>
                      <p className="mt-2 text-sm font-bold">
                        {trackingInfo.nearbyState.label}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {trackingInfo.nearbyState.detail}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <LiveRouteMap
                origin={trackingLocation}
                destination={destinationLocation}
                trailPoints={trackingInfo.trailPoints}
                heightClass="h-[24rem] md:h-[32rem]"
                reverseRouteDirection
                riderLabel="Delivery boy live location"
                destinationLabel={
                  hasCoordinate(
                    liveDestination?.latitude,
                    liveDestination?.longitude,
                  )
                    ? "Customer live location"
                    : "Saved delivery address"
                }
                restrictToIndia
                statusLabel={
                  isLiveTrackingActive ? "Tracking your order" : "Waiting for live ping"
                }
                headline={
                  trackingInfo.etaMinutes
                    ? `Arriving in ${formatEta(trackingInfo.etaMinutes)}`
                    : hasCoordinate(
                        destinationLocation?.latitude,
                        destinationLocation?.longitude,
                      )
                    ? "Delivery partner is on the way"
                    : "Waiting for destination pin"
                }
                subheadline={
                  trackingInfo.isFallback
                    ? "Road route sync ho raha hai. Filhaal fallback connector active hai."
                    : hasCoordinate(
                        destinationLocation?.latitude,
                        destinationLocation?.longitude,
                      )
                    ? "Blue route line delivery boy ke live movement ke saath update hoti rahegi."
                    : "Customer pin sync hote hi full route yahan draw ho jayega."
                }
                etaLabel={formatEta(trackingInfo.etaMinutes)}
                distanceLabel={formatDistance(trackingInfo.distanceKm)}
                movementLabel={trackingInfo.trend.label}
                heading={trackingLocation?.heading || trackingSnapshot?.currentLocation?.heading}
                onRouteMetaChange={setRouteMeta}
              />

              <div className="mt-5 grid gap-4 md:grid-cols-4">
                <div className={`rounded-[22px] border p-4 ${secondarySurface}`}>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    Distance left
                  </p>
                  <p className="mt-3 text-2xl font-black text-cyan-500">
                    {formatDistance(trackingInfo.distanceKm)}
                  </p>
                </div>
                <div className={`rounded-[22px] border p-4 ${secondarySurface}`}>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    Route ETA
                  </p>
                  <p className="mt-3 text-2xl font-black text-emerald-500">
                    {formatEta(trackingInfo.etaMinutes)}
                  </p>
                </div>
                <div className={`rounded-[22px] border p-4 ${secondarySurface}`}>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    Nearby state
                  </p>
                  <p className="mt-3 text-xl font-black text-orange-500">
                    {trackingInfo.nearbyState.label}
                  </p>
                </div>
                <div className={`rounded-[22px] border p-4 ${secondarySurface}`}>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    Last shared
                  </p>
                  <p className="mt-3 text-lg font-black">
                    {trackingInfo.lastPingLabel}
                  </p>
                </div>
              </div>

              <div
                className={`mt-5 rounded-[24px] border p-5 ${
                  isDark
                    ? "border-slate-800 bg-slate-950"
                    : "border-cyan-100 bg-cyan-50/60"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-500">
                  Live insight
                </p>
                <h3 className="mt-2 text-xl font-black">{trackingInfo.trend.label}</h3>
                <p className={`mt-2 text-sm leading-7 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  {trackingInfo.trend.detail}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className={`rounded-[28px] border p-5 ${cardSurface}`}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-500">
                Tracking summary
              </p>
              <div className="mt-5 space-y-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className={isDark ? "text-slate-300" : "text-slate-600"}>Delivery partner</span>
                  <span className="font-semibold">
                    {order.assignedDeliveryPartner?.fullName || "Awaiting assignment"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className={isDark ? "text-slate-300" : "text-slate-600"}>Tracking status</span>
                  <span className="font-semibold">
                    {isLiveTrackingActive ? "Live now" : "Waiting for next ping"}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className={isDark ? "text-slate-300" : "text-slate-600"}>Destination</span>
                  <span className="max-w-[14rem] text-right font-semibold">
                    {hasCoordinate(
                      liveDestination?.latitude,
                      liveDestination?.longitude,
                    )
                      ? "Customer current live location"
                      : `${order.shippingAddress?.city}, ${order.shippingAddress?.district}, ${order.shippingAddress?.state}`}
                  </span>
                </div>
              </div>
            </div>

            {canUpdateCustomerLocation ? (
              <div className={`rounded-[28px] border p-5 ${cardSurface}`}>
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl ${
                      isDark ? "bg-slate-800 text-cyan-300" : "bg-cyan-50 text-cyan-700"
                    }`}
                  >
                    <MapPinned size={20} />
                  </span>
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-500">
                      Customer pin
                    </p>
                    <h2 className="mt-2 text-xl font-black">Update current location</h2>
                    <p className={`mt-2 text-sm leading-7 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      Agar delivery address se alag current point par receive karna hai to
                      yahan se live pin save karo.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveCurrentLocation}
                  disabled={isSavingCustomerLocation}
                  className="mt-5 inline-flex min-h-[3rem] w-full items-center justify-center rounded-2xl bg-cyan-500 px-6 text-sm font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingCustomerLocation ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/35 border-t-white animate-spin" />
                      {isResolvingCustomerLocation ? "Detecting..." : "Saving..."}
                    </span>
                  ) : (
                    "Use current location"
                  )}
                </button>
              </div>
            ) : null}

            <div className={`rounded-[28px] border p-5 ${cardSurface}`}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-500">
                Quick links
              </p>
              <div className="mt-4 space-y-3">
                <Link
                  to={`/order/${order._id}`}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold ${
                    isDark
                      ? "border-slate-700 bg-slate-950 text-slate-100"
                      : "border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                >
                  Full order details
                  <ExternalLink size={16} />
                </Link>
                <Link
                  to="/orders"
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold ${
                    isDark
                      ? "border-slate-700 bg-slate-950 text-slate-100"
                      : "border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                >
                  Back to my orders
                  <Route size={16} />
                </Link>
                <Link
                  to="/help-center"
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold ${
                    isDark
                      ? "border-slate-700 bg-slate-950 text-slate-100"
                      : "border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                >
                  Help center
                  <Timer size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrackOrderPage;
