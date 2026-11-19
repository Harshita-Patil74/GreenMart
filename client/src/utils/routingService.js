const ROUTING_API_URL = import.meta.env.VITE_ROUTING_API_URL || "https://router.project-osrm.org";

const REQUEST_TIMEOUT_MS = 10000;
const MIN_MOVEMENT_METERS = 50;

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isValidCoord(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export class RoutingService {
  constructor(baseUrl = ROUTING_API_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.lastRequestId = 0;
    this.lastFarmerLocation = null;
    this.lastRoute = null;
    this.debounceTimer = null;
  }

  calculateRoute(farmerLocation, customerLocation) {
    if (
      !farmerLocation ||
      !customerLocation ||
      !isValidCoord(farmerLocation.lat, farmerLocation.lng) ||
      !isValidCoord(customerLocation.lat, customerLocation.lng)
    ) {
      return Promise.reject(new Error("Invalid coordinates"));
    }

    const requestId = ++this.lastRequestId;
    const url = `${this.baseUrl}/route/v1/driving/${farmerLocation.lng},${farmerLocation.lat};${customerLocation.lng},${customerLocation.lat}?overview=full&geometries=geojson&steps=true`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    return fetch(url, { signal: controller.signal })
      .then((response) => {
        clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error(`Routing request failed: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (requestId !== this.lastRequestId) return null; // outdated response
        if (!data || data.code !== "Ok" || !data.routes || data.routes.length === 0) {
          throw new Error("No route found");
        }
        const route = data.routes[0];
        const geometry = route.geometry;
        if (!geometry || geometry.type !== "LineString" || !geometry.coordinates || geometry.coordinates.length < 2) {
          throw new Error("Malformed route geometry");
        }

        // OSRM returns [lng, lat]; Leaflet needs [lat, lng]
        const coordinates = geometry.coordinates.map(([lng, lat]) => [lat, lng]);

        const routeInfo = {
          distanceKm: Number((route.distance || 0) / 1000).toFixed(2),
          durationMin: Number((route.duration || 0) / 60).toFixed(1),
          calculatedAt: new Date().toISOString(),
        };

        const result = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: routeInfo,
              geometry: { type: "LineString", coordinates },
            },
          ],
          routeInfo,
        };

        this.lastRoute = result;
        return result;
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        if (requestId !== this.lastRequestId) return null; // outdated response
        if (error.name === "AbortError") {
          throw new Error("Routing request timed out");
        }
        throw error;
      });
  }

  hasSignificantMovement(newLocation) {
    if (!newLocation) return true;
    if (!this.lastFarmerLocation) return true;
    return haversineMeters(
      this.lastFarmerLocation.lat,
      this.lastFarmerLocation.lng,
      newLocation.lat,
      newLocation.lng,
    ) >= MIN_MOVEMENT_METERS;
  }

  updateLastFarmerLocation(location) {
    this.lastFarmerLocation = location;
  }

  getLastRoute() {
    return this.lastRoute;
  }

  clearRoute() {
    this.lastRoute = null;
    this.lastFarmerLocation = null;
  }

  cancelPending() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.lastRequestId += 1;
  }
}

export const routingService = new RoutingService();

export function calculateRouteWithDebounce(farmerLocation, customerLocation, onResult, delayMs = 1500) {
  if (
    !farmerLocation ||
    !customerLocation ||
    !isValidCoord(farmerLocation.lat, farmerLocation.lng) ||
    !isValidCoord(customerLocation.lat, customerLocation.lng)
  ) {
    onResult(null, null, "Invalid coordinates");
    return;
  }

  // If the farmer hasn't moved meaningfully, reuse the last valid route
  if (
    routingService.getLastRoute() &&
    !routingService.hasSignificantMovement(farmerLocation)
  ) {
    onResult(routingService.getLastRoute(), routingService.getLastRoute().routeInfo, null);
    return;
  }

  if (routingService.debounceTimer) {
    clearTimeout(routingService.debounceTimer);
  }

  routingService.debounceTimer = setTimeout(() => {
    routingService.debounceTimer = null;
    routingService.updateLastFarmerLocation(farmerLocation);
    routingService
      .calculateRoute(farmerLocation, customerLocation)
      .then((result) => {
        onResult(result, result.routeInfo, null);
      })
      .catch((error) => {
        // Preserve last valid route on failure
        const lastRoute = routingService.getLastRoute();
        if (lastRoute) {
          onResult(lastRoute, lastRoute.routeInfo, null);
        } else {
          onResult(null, null, error.message || "Route calculation failed");
        }
      });
  }, delayMs);
}

export function formatDistance(km) {
  const value = km == null ? NaN : Number(km);
  if (!Number.isFinite(value)) return "–";
  if (value < 1) return `${Math.round(value * 1000)} m`;
  return `${value} km`;
}

export function formatDuration(min) {
  const value = min == null ? NaN : Number(min);
  if (!Number.isFinite(value)) return "–";
  if (value < 60) return `${Math.round(value)} min`;
  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes} min`;
}
