const MIN_LAT = -90;
const MAX_LAT = 90;
const MIN_LNG = -180;
const MAX_LNG = 180;

/**
 * Extract latitude/longitude from a persisted farmer dispatch location.
 * Supports both existing formats:
 *  1. { lat, lng }
 *  2. GeoJSON Point { type: "Point", coordinates: [longitude, latitude] }
 *
 * GeoJSON coordinates are longitude first, latitude second. This helper always
 * returns { lat, lng } in degrees.
 */
function extractCoordinates(location) {
  if (!location || typeof location !== "object") return null;

  if (location.type === "Point" && Array.isArray(location.coordinates) && location.coordinates.length >= 2) {
    const lng = Number(location.coordinates[0]);
    const lat = Number(location.coordinates[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return null;
  }

  const lat = Number(location.lat);
  const lng = Number(location.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return null;
}

function isValidCoordinates(lat, lng) {
  return (
    Number.isFinite(lat) && lat >= MIN_LAT && lat <= MAX_LAT &&
    Number.isFinite(lng) && lng >= MIN_LNG && lng <= MAX_LNG
  );
}

function coordinateKey(lat, lng) {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

module.exports = { extractCoordinates, isValidCoordinates, coordinateKey, MIN_LAT, MAX_LAT, MIN_LNG, MAX_LNG };
