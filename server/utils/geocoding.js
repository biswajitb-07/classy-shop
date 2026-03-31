const hasCoordinate = (value) =>
  value !== null &&
  value !== undefined &&
  String(value).trim() !== "" &&
  Number.isFinite(Number(value));

const normalizeAddressPart = (value) => String(value || "").trim();

const buildShippingAddressQuery = (shippingAddress = {}) =>
  [
    shippingAddress.addressLine1,
    shippingAddress.village,
    shippingAddress.city,
    shippingAddress.district,
    shippingAddress.state,
    shippingAddress.postalCode,
    shippingAddress.country,
  ]
    .map(normalizeAddressPart)
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .join(", ");

export const geocodeShippingAddress = async (shippingAddress = {}) => {
  if (
    hasCoordinate(shippingAddress?.location?.latitude) &&
    hasCoordinate(shippingAddress?.location?.longitude)
  ) {
    return shippingAddress;
  }

  const query = buildShippingAddressQuery(shippingAddress);
  if (!query) {
    return shippingAddress;
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(
        query
      )}`,
      {
        headers: {
          "User-Agent": "ClassyShop/1.0 (tracking@classyshop.site)",
          Accept: "application/json",
          "Accept-Language": "en-IN",
        },
      }
    );

    if (!response.ok) {
      return shippingAddress;
    }

    const results = await response.json();
    const firstMatch = Array.isArray(results) ? results[0] : null;
    const latitude = Number(firstMatch?.lat);
    const longitude = Number(firstMatch?.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return shippingAddress;
    }

    return {
      ...shippingAddress,
      location: {
        latitude,
        longitude,
        label: firstMatch?.display_name || query,
        source: "nominatim",
        geocodedAt: new Date(),
      },
    };
  } catch (error) {
    console.error("Shipping address geocoding failed:", error);
    return shippingAddress;
  }
};

export const ensureOrderShippingLocation = async (order) => {
  if (!order?.shippingAddress) return false;

  const nextShippingAddress = await geocodeShippingAddress(order.shippingAddress);
  const hasNewLocation =
    hasCoordinate(nextShippingAddress?.location?.latitude) &&
    hasCoordinate(nextShippingAddress?.location?.longitude);

  if (!hasNewLocation) {
    return false;
  }

  order.shippingAddress = nextShippingAddress;
  return true;
};
