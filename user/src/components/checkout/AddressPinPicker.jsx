import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DEFAULT_CENTER = [20.5937, 78.9629];

const MapSync = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    if (!position?.latitude || !position?.longitude) return;
    map.setView([position.latitude, position.longitude], Math.max(map.getZoom(), 14), {
      animate: true,
      duration: 0.8,
    });
  }, [map, position?.latitude, position?.longitude]);

  return null;
};

const PinSelector = ({ onSelect }) => {
  useMapEvents({
    click(event) {
      onSelect({
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });

  return null;
};

const AddressPinPicker = ({ value, onChange }) => {
  const markerPosition =
    value?.latitude !== null &&
    value?.latitude !== undefined &&
    value?.longitude !== null &&
    value?.longitude !== undefined
      ? [value.latitude, value.longitude]
      : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">Map Pin Selection</p>
          <p className="text-xs text-gray-500">
            Map par click karke exact delivery pin choose karo.
          </p>
        </div>
        {markerPosition ? (
          <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
            {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}
          </span>
        ) : null}
      </div>

      <div className="h-72 w-full">
        <MapContainer
          center={markerPosition || DEFAULT_CENTER}
          zoom={markerPosition ? 14 : 5}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <PinSelector onSelect={onChange} />
          <MapSync position={value} />
          {markerPosition ? <Marker position={markerPosition} /> : null}
        </MapContainer>
      </div>
    </div>
  );
};

export default AddressPinPicker;
