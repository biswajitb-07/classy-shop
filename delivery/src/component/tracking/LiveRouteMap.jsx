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
const INDIA_BOUNDS = {
  minLatitude: 6,
  maxLatitude: 38.5,
  minLongitude: 68,
  maxLongitude: 98,
};
const ROUTE_FETCH_TIMEOUT_MS = 6000;
const MARKER_ANIMATION_DURATION_MS = 900;
const SHORT_ROUTE_DISTANCE_KM = 0.25;

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

const toPoint = (location) =>
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

const calculateBearingDegrees = (fromPoint, toPointValue) => {
  if (!fromPoint || !toPointValue) return null;

  const startLatitude = (Number(fromPoint.latitude ?? fromPoint[0]) * Math.PI) / 180;
  const startLongitude = (Number(fromPoint.longitude ?? fromPoint[1]) * Math.PI) / 180;
  const endLatitude = (Number(toPointValue.latitude ?? toPointValue[0]) * Math.PI) / 180;
  const endLongitude =
    (Number(toPointValue.longitude ?? toPointValue[1]) * Math.PI) / 180;
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
      <div style="position:relative;width:40px;height:54px;">
        ${
          heading !== null
            ? `<span style="position:absolute;left:50%;top:2px;transform:translateX(-50%) rotate(${heading}deg);transform-origin:center center;color:${color};font-size:16px;font-weight:900;line-height:1;">▲</span>`
            : ""
        }
        <span style="position:absolute;inset:4px;border-radius:999px;background:${pulseColor};opacity:.32;transform:scale(1.22);"></span>
        <span style="position:absolute;inset:0;border-radius:999px;background:${color};border:4px solid white;box-shadow:0 14px 30px rgba(15,23,42,.24);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:800;">${label}</span>
      </div>
    `,
  });

const destinationIcon = createMarkerIcon({
  color: "#0f172a",
  pulseColor: "rgba(15,23,42,.18)",
  label: "C",
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
        (frameTime - startTime) / MARKER_ANIMATION_DURATION_MS,
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
    [map],
  );

  return null;
};

const RouteViewport = ({ points, followPoint }) => {
  const map = useMap();
  const hasMountedRef = useRef(false);
  const lastFollowKeyRef = useRef("");

  useEffect(() => {
    const resizeTick = setTimeout(() => {
      map.invalidateSize();
    }, 120);

    if (!points?.length) {
      return () => clearTimeout(resizeTick);
    }

    const followKey = followPoint
      ? `${Number(followPoint[0]).toFixed(5)},${Number(followPoint[1]).toFixed(5)}`
      : "";

    if (!hasMountedRef.current) {
      if (points.length === 1) {
        map.setView(points[0], 15, { animate: true });
      } else {
        map.fitBounds(points, { padding: [54, 54], animate: true });
      }
      hasMountedRef.current = true;
      lastFollowKeyRef.current = followKey;
      return () => clearTimeout(resizeTick);
    }

    if (followPoint && lastFollowKeyRef.current !== followKey) {
      map.panTo(followPoint, { animate: true, duration: 0.8 });
      lastFollowKeyRef.current = followKey;
    }

    return () => clearTimeout(resizeTick);
  }, [map, points, followPoint]);

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
  restrictToIndia = false,
  heading = null,
  onRouteMetaChange,
}) => {
  const [routePoints, setRoutePoints] = useState([]);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [isFallbackRoute, setIsFallbackRoute] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);

  const startLocation =
    restrictToIndia && hasCoordinate(origin) && !isWithinIndiaBounds(origin)
      ? null
      : origin;
  const endLocation =
    restrictToIndia && hasCoordinate(destination) && !isWithinIndiaBounds(destination)
      ? null
      : destination;

  const hasStart = hasCoordinate(startLocation);
  const hasEnd = hasCoordinate(endLocation);
  const startPoint = toPoint(startLocation);
  const endPoint = toPoint(endLocation);
  const connectorPoints =
    hasStart && hasEnd
      ? [startPoint, endPoint]
      : hasStart
      ? [startPoint]
      : hasEnd
      ? [endPoint]
      : [];
  const directDistanceKm = calculateDistanceKm(startLocation, endLocation);

  const sanitizedTrailPoints = (trailPoints || [])
    .filter((point) => hasCoordinate(point))
    .filter((point) => !restrictToIndia || isWithinIndiaBounds(point))
    .map((point) => [Number(point.latitude), Number(point.longitude)]);

  const riderHeading = useMemo(() => {
    const explicitHeading = normalizeHeading(heading);
    if (explicitHeading !== null) return explicitHeading;

    if (sanitizedTrailPoints.length >= 2) {
      return calculateBearingDegrees(
        sanitizedTrailPoints[sanitizedTrailPoints.length - 2],
        sanitizedTrailPoints[sanitizedTrailPoints.length - 1],
      );
    }

    if (startPoint && endPoint) {
      return calculateBearingDegrees(startPoint, endPoint);
    }

    return null;
  }, [heading, sanitizedTrailPoints, startPoint, endPoint]);

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
    if (!hasStart || !hasEnd) {
      setRoutePoints([]);
      setIsFallbackRoute(false);
      setIsRouteLoading(false);
      onRouteMetaChange?.(null);
      return undefined;
    }

    const controller = new AbortController();
    let isActive = true;
    const timeoutId = setTimeout(() => controller.abort(), ROUTE_FETCH_TIMEOUT_MS);

    const applyFallbackRoute = () => {
      if (!isActive) return;
      setRoutePoints(connectorPoints);
      setIsFallbackRoute(true);
      onRouteMetaChange?.({
        distanceKm: directDistanceKm,
        durationMinutes: directDistanceKm !== null ? 1 : null,
        isFallback: true,
        updatedAt: new Date().toISOString(),
      });
    };

    const loadRoute = async () => {
      try {
        setIsRouteLoading(true);

        if (
          Number.isFinite(Number(directDistanceKm)) &&
          Number(directDistanceKm) <= SHORT_ROUTE_DISTANCE_KM
        ) {
          setRoutePoints(connectorPoints);
          setIsFallbackRoute(false);
          onRouteMetaChange?.({
            distanceKm: directDistanceKm,
            durationMinutes: 1,
            isFallback: false,
            updatedAt: new Date().toISOString(),
          });
          return;
        }

        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${startLocation.longitude},${startLocation.latitude};${endLocation.longitude},${endLocation.latitude}?overview=full&geometries=geojson`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Route request failed");
        }

        const data = await response.json();
        const primaryRoute = data?.routes?.[0];
        const rawCoordinates =
          primaryRoute?.geometry?.coordinates?.map(([longitude, latitude]) => [
            latitude,
            longitude,
          ]) || [];

        if (!rawCoordinates.length) {
          applyFallbackRoute();
          return;
        }

        const normalizedCoordinates = normalizeRouteDirection({
          coordinates: rawCoordinates,
          expectedStart: startLocation,
          expectedEnd: endLocation,
        });

        if (!isActive) return;

        setRoutePoints(normalizedCoordinates);
        setIsFallbackRoute(false);
        onRouteMetaChange?.({
          distanceKm: Number(((primaryRoute?.distance || 0) / 1000).toFixed(3)),
          durationMinutes: Math.max(
            1,
            Math.round(Number(primaryRoute?.duration || 0) / 60),
          ),
          isFallback: false,
          updatedAt: new Date().toISOString(),
        });
      } catch (_error) {
        applyFallbackRoute();
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
    hasStart,
    hasEnd,
    startLocation?.latitude,
    startLocation?.longitude,
    endLocation?.latitude,
    endLocation?.longitude,
    directDistanceKm,
    onRouteMetaChange,
  ]);

  const center = startPoint || endPoint || INDIA_CENTER;
  const visibleRoutePoints =
    routePoints.length >= 2
      ? routePoints
      : connectorPoints.length >= 2
      ? connectorPoints
      : [];
  const viewportPoints = visibleRoutePoints.length ? visibleRoutePoints : [center];

  const focusRoute = () => {
    if (!mapInstance) return;

    mapInstance.invalidateSize();

    if (viewportPoints.length === 1) {
      mapInstance.flyTo(viewportPoints[0], 16, {
        animate: true,
        duration: 0.8,
      });
      return;
    }

    mapInstance.fitBounds(viewportPoints, {
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

        <RouteViewport points={viewportPoints} followPoint={startPoint} />

        {visibleRoutePoints.length >= 2 ? (
          <>
            <Polyline
              positions={visibleRoutePoints}
              pathOptions={{
                color: isFallbackRoute ? "#93c5fd" : "#1e3a8a",
                weight: isFallbackRoute ? 12 : 15,
                opacity: isFallbackRoute ? 0.42 : 0.36,
                lineCap: "round",
                lineJoin: "round",
                dashArray: isFallbackRoute ? "12 12" : undefined,
              }}
            />
            <Polyline
              positions={visibleRoutePoints}
              pathOptions={{
                color: "#ffffff",
                weight: isFallbackRoute ? 8 : 10,
                opacity: 0.92,
                lineCap: "round",
                lineJoin: "round",
                dashArray: isFallbackRoute ? "12 12" : undefined,
              }}
            />
            <Polyline
              positions={visibleRoutePoints}
              pathOptions={{
                color: "#2563eb",
                weight: isFallbackRoute ? 5 : 7,
                opacity: 0.98,
                lineCap: "round",
                lineJoin: "round",
                dashArray: isFallbackRoute ? "12 12" : undefined,
              }}
            />
          </>
        ) : null}

        {endPoint ? <Marker position={endPoint} icon={destinationIcon} /> : null}
        {startPoint ? <AnimatedMarker position={startPoint} icon={riderIcon} /> : null}
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
    </div>
  );
};

export default LiveRouteMap;
