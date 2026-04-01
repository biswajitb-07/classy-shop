import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { LocateFixed } from "lucide-react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const INDIA_CENTER = [20.5937, 78.9629];
const MARKER_ANIMATION_DURATION_MS = 900;
const ROUTE_FETCH_TIMEOUT_MS = 6000;
const INDIA_BOUNDS = {
  minLatitude: 6,
  maxLatitude: 38.5,
  minLongitude: 68,
  maxLongitude: 98,
};

const hasCoordinate = (location) =>
  location?.latitude !== null &&
  location?.latitude !== undefined &&
  location?.longitude !== null &&
  location?.longitude !== undefined;

const isWithinIndiaBounds = (location) =>
  hasCoordinate(location) &&
  Number(location.latitude) >= INDIA_BOUNDS.minLatitude &&
  Number(location.latitude) <= INDIA_BOUNDS.maxLatitude &&
  Number(location.longitude) >= INDIA_BOUNDS.minLongitude &&
  Number(location.longitude) <= INDIA_BOUNDS.maxLongitude;

const toPointArray = (location) =>
  hasCoordinate(location)
    ? [Number(location.latitude), Number(location.longitude)]
    : null;

const toRadians = (value) => (Number(value) * Math.PI) / 180;

const calculateDistanceKm = (origin, destination) => {
  if (!hasCoordinate(origin) || !hasCoordinate(destination)) return null;

  const earthRadiusKm = 6371;
  const latDiff = toRadians(Number(destination.latitude) - Number(origin.latitude));
  const lonDiff = toRadians(Number(destination.longitude) - Number(origin.longitude));
  const a =
    Math.sin(latDiff / 2) * Math.sin(latDiff / 2) +
    Math.cos(toRadians(origin.latitude)) *
      Math.cos(toRadians(destination.latitude)) *
      Math.sin(lonDiff / 2) *
      Math.sin(lonDiff / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((earthRadiusKm * c).toFixed(3));
};

const pointDistanceScore = (point, location) => {
  if (!point || !hasCoordinate(location)) return Number.POSITIVE_INFINITY;
  return (
    Math.abs(Number(point[0]) - Number(location.latitude)) +
    Math.abs(Number(point[1]) - Number(location.longitude))
  );
};

const normalizeRouteDirection = ({ coordinates = [], expectedStart, expectedEnd }) => {
  if (coordinates.length < 2) return coordinates;

  const firstPoint = coordinates[0];
  const lastPoint = coordinates[coordinates.length - 1];
  const currentDirectionScore =
    pointDistanceScore(firstPoint, expectedStart) +
    pointDistanceScore(lastPoint, expectedEnd);
  const reversedDirectionScore =
    pointDistanceScore(firstPoint, expectedEnd) +
    pointDistanceScore(lastPoint, expectedStart);

  return reversedDirectionScore < currentDirectionScore
    ? [...coordinates].reverse()
    : coordinates;
};

const normalizeHeading = (heading) => {
  if (!Number.isFinite(Number(heading))) return null;
  const normalized = Number(heading) % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

const calculateBearingDegrees = (fromPoint, toPoint) => {
  if (!fromPoint || !toPoint) return null;

  const startLatitude = (Number(fromPoint.latitude ?? fromPoint[0]) * Math.PI) / 180;
  const startLongitude = (Number(fromPoint.longitude ?? fromPoint[1]) * Math.PI) / 180;
  const endLatitude = (Number(toPoint.latitude ?? toPoint[0]) * Math.PI) / 180;
  const endLongitude = (Number(toPoint.longitude ?? toPoint[1]) * Math.PI) / 180;
  const longitudeDelta = endLongitude - startLongitude;
  const y = Math.sin(longitudeDelta) * Math.cos(endLatitude);
  const x =
    Math.cos(startLatitude) * Math.sin(endLatitude) -
    Math.sin(startLatitude) * Math.cos(endLatitude) * Math.cos(longitudeDelta);

  return normalizeHeading((Math.atan2(y, x) * 180) / Math.PI);
};

const createMarkerIcon = ({ color, pulseColor, label, heading = null }) =>
  L.divIcon({
    className: "",
    iconSize: [40, 54],
    iconAnchor: [20, 28],
    popupAnchor: [0, -18],
    html: `
      <div class="tracking-map-marker-icon" style="position:relative;width:40px;height:54px;">
        ${
          heading !== null
            ? `<span style="position:absolute;left:50%;top:2px;transform:translateX(-50%) rotate(${heading}deg);transform-origin:center center;color:${color};font-size:16px;font-weight:900;line-height:1;text-shadow:0 8px 18px rgba(15,23,42,.18);">▲</span>`
            : ""
        }
        <span style="position:absolute;inset:4px;border-radius:999px;background:${pulseColor};opacity:.32;transform:scale(1.22);"></span>
        <span style="position:absolute;inset:0;border-radius:999px;background:${color};border:4px solid white;box-shadow:0 14px 30px rgba(15,23,42,.24);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:800;">${label}</span>
      </div>
    `,
  });

const userIcon = createMarkerIcon({
  color: "#0f172a",
  pulseColor: "rgba(15,23,42,.18)",
  label: "U",
});

const AnimatedMarker = ({ position, icon }) => {
  const map = useMap();
  const markerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const currentPositionRef = useRef(null);

  useEffect(() => {
    if (!position) return undefined;

    const nextLatLng = L.latLng(position[0], position[1]);

    if (!markerRef.current) {
      markerRef.current = L.marker(nextLatLng, { icon }).addTo(map);
      currentPositionRef.current = nextLatLng;
      return undefined;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const marker = markerRef.current;
    marker.setIcon(icon);
    const startLatLng = currentPositionRef.current || marker.getLatLng();
    const startTime = performance.now();

    const animate = (frameTime) => {
      const progress = Math.min(
        1,
        (frameTime - startTime) / MARKER_ANIMATION_DURATION_MS
      );
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const latitude =
        startLatLng.lat + (nextLatLng.lat - startLatLng.lat) * easedProgress;
      const longitude =
        startLatLng.lng + (nextLatLng.lng - startLatLng.lng) * easedProgress;

      marker.setLatLng([latitude, longitude]);
      currentPositionRef.current = L.latLng(latitude, longitude);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      animationFrameRef.current = null;
      currentPositionRef.current = nextLatLng;
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return undefined;
  }, [icon, map, position]);

  useEffect(
    () => () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    },
    [map]
  );

  return null;
};

const RouteViewport = ({ points, origin, destination }) => {
  const map = useMap();
  const hasMountedRef = useRef(false);
  const lastOriginKeyRef = useRef("");
  const lastDestinationKeyRef = useRef("");

  const originKey = useMemo(
    () =>
      origin ? `${Number(origin[0]).toFixed(5)},${Number(origin[1]).toFixed(5)}` : "",
    [origin]
  );
  const destinationKey = useMemo(
    () =>
      destination
        ? `${Number(destination[0]).toFixed(5)},${Number(destination[1]).toFixed(5)}`
        : "",
    [destination]
  );

  useEffect(() => {
    const resizeTick = setTimeout(() => {
      map.invalidateSize();
    }, 120);

    if (!points?.length) {
      return () => clearTimeout(resizeTick);
    }

    const shouldFitBounds =
      !hasMountedRef.current || lastDestinationKeyRef.current !== destinationKey;

    if (points.length === 1) {
      map.setView(points[0], 15, { animate: true });
      hasMountedRef.current = true;
      lastOriginKeyRef.current = originKey;
      lastDestinationKeyRef.current = destinationKey;
      return () => clearTimeout(resizeTick);
    }

    if (shouldFitBounds) {
      map.fitBounds(points, {
        padding: [54, 54],
        animate: true,
      });
      hasMountedRef.current = true;
      lastOriginKeyRef.current = originKey;
      lastDestinationKeyRef.current = destinationKey;
      return () => clearTimeout(resizeTick);
    }

    if (origin && lastOriginKeyRef.current !== originKey) {
      map.panTo(origin, {
        animate: true,
        duration: 0.8,
      });
      lastOriginKeyRef.current = originKey;
    }

    return () => clearTimeout(resizeTick);
  }, [map, points, origin, destination, originKey, destinationKey]);

  return null;
};

const CaptureMapInstance = ({ onMapReady }) => {
  const map = useMap();

  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);

  return null;
};

const LiveRouteMap = ({
  origin,
  destination,
  trailPoints = [],
  heightClass = "h-64",
  riderLabel = "Delivery Partner",
  destinationLabel = "Customer Address",
  restrictToIndia = false,
  headline = "Tracking your order",
  statusLabel = "Live tracking",
  subheadline = "Blue route shows the rider path toward your destination.",
  etaLabel = "ETA updating",
  distanceLabel = "Mapping route",
  movementLabel = "Waiting for movement",
  reverseRouteDirection = false,
  heading = null,
  onRouteMetaChange,
}) => {
  const [routePoints, setRoutePoints] = useState([]);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [isFallbackRoute, setIsFallbackRoute] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);

  const sanitizedOrigin =
    restrictToIndia && hasCoordinate(origin) && !isWithinIndiaBounds(origin)
      ? null
      : origin;
  const sanitizedDestination =
    restrictToIndia && hasCoordinate(destination) && !isWithinIndiaBounds(destination)
      ? null
      : destination;

  const hasOrigin = hasCoordinate(sanitizedOrigin);
  const hasDestination = hasCoordinate(sanitizedDestination);
  const hasInvalidIndiaCoordinate =
    restrictToIndia &&
    ((hasCoordinate(origin) && !hasOrigin) ||
      (hasCoordinate(destination) && !hasDestination));

  const sanitizedTrailPoints = (trailPoints || [])
    .filter((point) => hasCoordinate(point))
    .filter((point) => !restrictToIndia || isWithinIndiaBounds(point))
    .map((point) => [Number(point.latitude), Number(point.longitude)]);

  const directConnectorPoints =
    hasOrigin && hasDestination
      ? [
          [Number(sanitizedOrigin.latitude), Number(sanitizedOrigin.longitude)],
          [Number(sanitizedDestination.latitude), Number(sanitizedDestination.longitude)],
        ]
      : hasOrigin
      ? [[Number(sanitizedOrigin.latitude), Number(sanitizedOrigin.longitude)]]
      : hasDestination
      ? [[Number(sanitizedDestination.latitude), Number(sanitizedDestination.longitude)]]
      : [];

  const normalizedConnectorPoints = reverseRouteDirection
    ? [...directConnectorPoints].reverse()
    : directConnectorPoints;
  const requestStartLocation = reverseRouteDirection
    ? sanitizedDestination
    : sanitizedOrigin;
  const requestEndLocation = reverseRouteDirection
    ? sanitizedOrigin
    : sanitizedDestination;
  const requestStartPoint = toPointArray(requestStartLocation);
  const requestEndPoint = toPointArray(requestEndLocation);
  const directDistanceKm = calculateDistanceKm(
    requestStartLocation,
    requestEndLocation,
  );
  const riderHeading = useMemo(() => {
    const explicitHeading = normalizeHeading(heading);
    if (explicitHeading !== null) return explicitHeading;

    if (sanitizedTrailPoints.length >= 2) {
      return calculateBearingDegrees(
        sanitizedTrailPoints[sanitizedTrailPoints.length - 2],
        sanitizedTrailPoints[sanitizedTrailPoints.length - 1],
      );
    }

    return null;
  }, [heading, sanitizedTrailPoints]);
  const riderIcon = useMemo(
    () =>
      createMarkerIcon({
        color: "#2563eb",
        pulseColor: "rgba(37,99,235,.35)",
        label: "R",
        heading: riderHeading,
      }),
    [riderHeading],
  );

  useEffect(() => {
    if (!hasOrigin || !hasDestination) {
      setRoutePoints([]);
      setIsFallbackRoute(false);
      setIsRouteLoading(false);
      onRouteMetaChange?.(null);
      return undefined;
    }

    const controller = new AbortController();
    let isActive = true;
    const timeoutId = setTimeout(() => controller.abort(), ROUTE_FETCH_TIMEOUT_MS);

    const loadRoute = async () => {
      try {
        setIsRouteLoading(true);
        setRoutePoints(normalizedConnectorPoints);
        setIsFallbackRoute(true);

        if (
          Number.isFinite(Number(directDistanceKm)) &&
          Number(directDistanceKm) <= 0.25
        ) {
          if (isActive) {
            setRoutePoints(normalizedConnectorPoints);
            setIsFallbackRoute(false);
            onRouteMetaChange?.({
              distanceKm: Number(directDistanceKm.toFixed(3)),
              durationMinutes: 1,
              isFallback: false,
              updatedAt: new Date().toISOString(),
            });
          }
          return;
        }

        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${requestStartLocation.longitude},${requestStartLocation.latitude};${requestEndLocation.longitude},${requestEndLocation.latitude}?overview=full&geometries=geojson`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Route request failed");
        }

        const data = await response.json();
        const primaryRoute = data?.routes?.[0];
        const coordinates =
          primaryRoute?.geometry?.coordinates?.map(([longitude, latitude]) => [
            latitude,
            longitude,
          ]) || [];

        if (isActive) {
          const normalizedCoordinates = normalizeRouteDirection({
            coordinates,
            expectedStart: requestStartLocation,
            expectedEnd: requestEndLocation,
          });

          if (coordinates.length >= 2) {
            setRoutePoints(normalizedCoordinates);
            setIsFallbackRoute(false);
            onRouteMetaChange?.({
              distanceKm: Number(((primaryRoute?.distance || 0) / 1000).toFixed(1)),
              durationMinutes: Math.max(
                1,
                Math.round(Number(primaryRoute?.duration || 0) / 60),
              ),
              isFallback: false,
              updatedAt: new Date().toISOString(),
            });
          } else {
            setRoutePoints(normalizedConnectorPoints);
            setIsFallbackRoute(true);
            onRouteMetaChange?.({
              distanceKm: null,
              durationMinutes: null,
              isFallback: true,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        if (isActive) {
          setRoutePoints(normalizedConnectorPoints);
          setIsFallbackRoute(true);
          onRouteMetaChange?.({
            distanceKm: null,
            durationMinutes: null,
            isFallback: true,
            updatedAt: new Date().toISOString(),
          });
        }
      } finally {
        clearTimeout(timeoutId);
        if (isActive) {
          setIsRouteLoading(false);
        }
      }
    };

    loadRoute();
    return () => {
      isActive = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    hasOrigin,
    hasDestination,
    requestStartLocation?.latitude,
    requestStartLocation?.longitude,
    requestEndLocation?.latitude,
    requestEndLocation?.longitude,
    directDistanceKm,
    onRouteMetaChange,
    reverseRouteDirection,
  ]);

  const center = requestStartPoint
    ? requestStartPoint
    : requestEndPoint
    ? requestEndPoint
    : INDIA_CENTER;

  const visibleRoutePoints =
    routePoints.length >= 2
      ? routePoints
      : isFallbackRoute && normalizedConnectorPoints.length >= 2
      ? normalizedConnectorPoints
      : [];

  const viewportPoints = visibleRoutePoints.length
    ? visibleRoutePoints
    : normalizedConnectorPoints.length
    ? normalizedConnectorPoints
    : [center];
  const focusRoute = () => {
    if (!mapInstance) return;

    const focusPoints = viewportPoints.length ? viewportPoints : [center];
    mapInstance.invalidateSize();

    if (focusPoints.length === 1) {
      mapInstance.flyTo(focusPoints[0], 15, {
        animate: true,
        duration: 0.8,
      });
      return;
    }

    mapInstance.fitBounds(focusPoints, {
      padding: [54, 54],
      animate: true,
    });
  };

  return (
    <div
      className={`tracking-map-shell relative z-0 isolate overflow-hidden rounded-[2rem] border border-slate-200 bg-[#eef3f8] shadow-[0_24px_70px_rgba(15,23,42,0.14)] ${heightClass}`}
    >
      <MapContainer
        center={center}
        zoom={13}
        zoomControl={false}
        scrollWheelZoom
        preferCanvas
        zoomSnap={0.5}
        zoomDelta={0.5}
        className={`tracking-map-canvas w-full ${heightClass}`}
      >
        <CaptureMapInstance onMapReady={setMapInstance} />
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains={["a", "b", "c", "d"]}
        />

        <RouteViewport
          points={viewportPoints}
          origin={requestStartPoint}
          destination={requestEndPoint}
        />

        {sanitizedTrailPoints.length >= 2 ? (
          <Polyline
            positions={sanitizedTrailPoints}
            pathOptions={{
              color: "#38bdf8",
              weight: 5,
              opacity: 0.85,
              lineCap: "round",
              lineJoin: "round",
              dashArray: "10 12",
            }}
          />
        ) : null}

        {visibleRoutePoints.length >= 2 ? (
          <>
            <Polyline
              positions={visibleRoutePoints}
              pathOptions={{
                color: isFallbackRoute ? "#93c5fd" : "#1e3a8a",
                weight: isFallbackRoute ? 10 : 15,
                opacity: isFallbackRoute ? 0.5 : 0.38,
                lineCap: "round",
                lineJoin: "round",
                dashArray: isFallbackRoute ? "12 14" : undefined,
              }}
            />
            <Polyline
              positions={visibleRoutePoints}
              pathOptions={{
                color: "#ffffff",
                weight: isFallbackRoute ? 7 : 10,
                opacity: isFallbackRoute ? 0.72 : 0.9,
                lineCap: "round",
                lineJoin: "round",
                dashArray: isFallbackRoute ? "12 14" : undefined,
              }}
            />
            <Polyline
              positions={visibleRoutePoints}
              pathOptions={{
                color: isFallbackRoute ? "#2563eb" : "#1d4ed8",
                weight: isFallbackRoute ? 5 : 7,
                opacity: 0.96,
                lineCap: "round",
                lineJoin: "round",
                dashArray: isFallbackRoute ? "12 14" : undefined,
              }}
            />
          </>
        ) : null}

        {requestStartPoint ? (
          <Marker
            position={requestStartPoint}
            icon={userIcon}
          />
        ) : null}

        {requestEndPoint ? (
          <AnimatedMarker
            position={requestEndPoint}
            icon={riderIcon}
          />
        ) : null}
      </MapContainer>

      <div className="absolute right-4 top-4 z-[500] flex items-start justify-end">
        <button
          type="button"
          onClick={focusRoute}
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/95 text-slate-700 shadow-xl backdrop-blur transition hover:bg-slate-50"
          aria-label="Recenter route"
        >
          <LocateFixed size={18} />
        </button>
      </div>

      {isRouteLoading ? (
        <div className="absolute left-4 top-4 z-[500] rounded-full bg-cyan-500/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-950 shadow-lg">
          Route syncing
        </div>
      ) : null}

      {hasInvalidIndiaCoordinate ? (
        <div className="absolute left-4 top-4 z-[500] rounded-full bg-amber-500 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-lg">
          Location refresh needed
        </div>
      ) : null}
    </div>
  );
};

export default LiveRouteMap;
