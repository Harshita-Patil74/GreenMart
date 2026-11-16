const deliveryCache = new Map();

const CACHE_TTL_MS = 86400 * 1000;

function cacheKey(originLat, originLng, destLat, destLng) {
  return `dist:${originLat.toFixed(6)}:${originLng.toFixed(6)}:${destLat.toFixed(6)}:${destLng.toFixed(6)}`;
}

function getCached(key) {
  const entry = deliveryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    deliveryCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCached(key, value) {
  deliveryCache.set(key, { value, ts: Date.now() });
}

const OSRM_BASE_URL = process.env.OSRM_BASE_URL || "https://router.project-osrm.org";

class RoutingUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = "RoutingUnavailableError";
    this.isRoutingError = true;
  }
}

async function osrmDistanceKm(originLat, originLng, destLat, destLng) {
  const coords = `${originLng},${originLat};${destLng},${destLat}`;
  const url = `${OSRM_BASE_URL}/route/v1/driving/${coords}?overview=false`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new RoutingUnavailableError(`Routing provider returned ${res.status}`);
    }
    const data = await res.json();
    if (!data || !data.routes || !data.routes.length) {
      throw new RoutingUnavailableError("No route found.");
    }
    return Math.round((data.routes[0].distance / 1000) * 100) / 100;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new RoutingUnavailableError("Routing request timed out.");
    }
    if (err.isRoutingError) throw err;
    throw new RoutingUnavailableError(`Routing calculation failed: ${err.message}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function calculateDistanceKm(originLat, originLng, destLat, destLng) {
  const key = cacheKey(originLat, originLng, destLat, destLng);
  const cached = getCached(key);
  if (cached != null) return cached;

  const distance = await osrmDistanceKm(originLat, originLng, destLat, destLng);
  setCached(key, distance);
  return distance;
}

function deliveryOptionsForDistance(distanceKm, settings) {
  const standardMax = Number(settings?.standardMaxKm) || 5;
  const expressMax = Number(settings?.expressMaxKm) || 10;
  const maxRemote = Number(settings.maxRemoteDistanceKm) || 50;

  const options = [];
  if (distanceKm <= standardMax) {
    options.push({
      option: "standard",
      label: "Standard Delivery",
      eligible: true,
      charge: Number(settings.deliveryCharge) || 0,
      maxKm: standardMax,
    });
  }
  if (distanceKm > standardMax && distanceKm <= expressMax) {
    options.push({
      option: "express",
      label: "Express Delivery",
      eligible: true,
      charge: Number(settings.expressDeliveryCharge) || 0,
      maxKm: expressMax,
    });
  }
  if (distanceKm > expressMax && distanceKm <= maxRemote) {
    options.push({
      option: "remote",
      label: "Remote Area Delivery",
      eligible: true,
      charge: Number(settings.remoteAreaDeliveryCharge) || 0,
      maxKm: maxRemote,
    });
  }
  return options;
}

function eligibleDeliveryCharge(selectedOption, options, settings) {
  const match = options.find((o) => o.option === selectedOption && o.eligible);
  if (!match) return { charge: 0, option: null, eligible: false };
  return { charge: match.charge, option: match.option, eligible: true };
}

function clearDeliveryCache() {
  deliveryCache.clear();
}

module.exports = {
  calculateDistanceKm,
  deliveryOptionsForDistance,
  eligibleDeliveryCharge,
  RoutingUnavailableError,
  OSRM_BASE_URL,
  osrmDistanceKm,
  deliveryCache,
  clearDeliveryCache,
};
