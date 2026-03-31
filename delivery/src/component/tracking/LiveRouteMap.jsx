import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const INDIA_CENTER = [20.5937, 78.9629];
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

const createMarkerIcon = ({ color, label }) =>
  L.divIcon({
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
    html: `<div style="width:34px;height:34px;border-radius:999px;background:${color};display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 10px 24px rgba(15,23,42,.28);color:white;font-size:12px;font-weight:700;">${label}</div>`,
  });

const riderIcon = createMarkerIcon({ color: "#0ea5e9", label: "R" });
const destinationIcon = createMarkerIcon({ color: "#ef4444", label: "C" });

const RouteViewport = ({ points }) => {
  const map = useMap();
  const boundsKey = useMemo(
    () =>
      (points || [])
        .map((point) => `${Number(point[0]).toFixed(5)},${Number(point[1]).toFixed(5)}`)
        .join("|"),
    [points]
  );

  useEffect(() => {
    if (!points?.length) return;

    if (points.length === 1) {
      map.setView(points[0], 15, { animate: true });
      return;
    }

    map.fitBounds(points, {
      padding: [32, 32],
      animate: true,
    });
  }, [map, boundsKey, points]);

  return null;
};

const LiveRouteMap = ({
  origin,
  destination,
  heightClass = "h-64",
  riderLabel = "Delivery Partner",
  destinationLabel = "Customer Address",
  restrictToIndia = false,
}) => {
  const [routePoints, setRoutePoints] = useState([]);
  const [isRouteLoading, setIsRouteLoading] = useState(false);

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

  useEffect(() => {
    if (!hasOrigin || !hasDestination) {
      setRoutePoints([]);
      return undefined;
    }

    const controller = new AbortController();

    const loadRoute = async () => {
      try {
        setIsRouteLoading(true);
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${sanitizedOrigin.longitude},${sanitizedOrigin.latitude};${sanitizedDestination.longitude},${sanitizedDestination.latitude}?overview=full&geometries=geojson`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Route request failed");
        }

        const data = await response.json();
        const coordinates =
          data?.routes?.[0]?.geometry?.coordinates?.map(([longitude, latitude]) => [
            latitude,
            longitude,
          ]) || [];

        setRoutePoints(coordinates);
      } catch (error) {
        if (error?.name !== "AbortError") {
          setRoutePoints([
            [Number(sanitizedOrigin.latitude), Number(sanitizedOrigin.longitude)],
            [Number(sanitizedDestination.latitude), Number(sanitizedDestination.longitude)],
          ]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsRouteLoading(false);
        }
      }
    };

    loadRoute();
    return () => controller.abort();
  }, [
    hasOrigin,
    hasDestination,
    sanitizedOrigin?.latitude,
    sanitizedOrigin?.longitude,
    sanitizedDestination?.latitude,
    sanitizedDestination?.longitude,
  ]);

  const center = hasOrigin
    ? [Number(sanitizedOrigin.latitude), Number(sanitizedOrigin.longitude)]
    : hasDestination
    ? [Number(sanitizedDestination.latitude), Number(sanitizedDestination.longitude)]
    : INDIA_CENTER;

  const fallbackPoints = [];
  if (hasOrigin) {
    fallbackPoints.push([Number(sanitizedOrigin.latitude), Number(sanitizedOrigin.longitude)]);
  }
  if (hasDestination) {
    fallbackPoints.push([Number(sanitizedDestination.latitude), Number(sanitizedDestination.longitude)]);
  }

  const visibleRoutePoints = routePoints.length >= 2 ? routePoints : fallbackPoints;

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-slate-800 ${heightClass}`}>
      {isRouteLoading ? (
        <div className="pointer-events-none absolute left-4 top-4 z-[500] rounded-full bg-slate-950/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
          Route syncing
        </div>
      ) : null}
      {hasInvalidIndiaCoordinate ? (
        <div className="pointer-events-none absolute right-4 top-4 z-[500] rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
          Location refresh needed
        </div>
      ) : null}

      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        className={`w-full ${heightClass}`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RouteViewport points={visibleRoutePoints.length ? visibleRoutePoints : [center]} />

        {visibleRoutePoints.length >= 2 ? (
          <Polyline
            positions={visibleRoutePoints}
            pathOptions={{
              color: "#38bdf8",
              weight: 6,
              opacity: 0.9,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        ) : null}

        {hasOrigin ? (
          <Marker
            position={[Number(sanitizedOrigin.latitude), Number(sanitizedOrigin.longitude)]}
            icon={riderIcon}
          />
        ) : null}

        {hasDestination ? (
          <Marker
            position={[Number(sanitizedDestination.latitude), Number(sanitizedDestination.longitude)]}
            icon={destinationIcon}
          />
        ) : null}
      </MapContainer>

      <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-[500] flex flex-wrap gap-2">
        <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm">
          {riderLabel}
        </span>
        <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm">
          {destinationLabel}
        </span>
      </div>
    </div>
  );
};

export default LiveRouteMap;
