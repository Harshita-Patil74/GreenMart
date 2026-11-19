import { vi, beforeEach, afterEach, describe, it, expect } from "vitest";
import {
  routingService,
  RoutingService,
  calculateRouteWithDebounce,
  formatDistance,
  formatDuration,
} from "./routingService.js";

const successResponse = {
  code: "Ok",
  routes: [
    {
      distance: 5000,
      duration: 300,
      geometry: {
        type: "LineString",
        coordinates: [
          [77.59, 12.97],
          [77.595, 12.972],
          [77.6, 12.975],
        ],
      },
    },
  ],
};

const noRouteResponse = { code: "NoRoute", routes: [] };
const malformedResponse = { code: "Ok", routes: [{ distance: 100, duration: 60 }] };

describe("routingService", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    routingService.clearRoute();
    routingService.cancelPending();
    vi.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("calculates a successful OSRM route with GeoJSON geometry", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(successResponse), { status: 200 })),
    );
    global.fetch = fetchMock;

    const result = await routingService.calculateRoute(
      { lat: 12.97, lng: 77.59 },
      { lat: 12.975, lng: 77.6 },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("77.59,12.97;77.6,12.975"),
      expect.any(Object),
    );
    expect(result.code).toBeUndefined();
    expect(result.features[0].geometry.type).toBe("LineString");
    // OSRM returns [lng, lat]; Leaflet needs [lat, lng]
    expect(result.features[0].geometry.coordinates[0]).toEqual([12.97, 77.59]);
    expect(result.routeInfo.distanceKm).toBe("5.00");
    expect(result.routeInfo.durationMin).toBe("5.0");
  });

  it("rejects with invalid coordinates", async () => {
    await expect(
      routingService.calculateRoute({ lat: 200, lng: 77.59 }, { lat: 12.975, lng: 77.6 }),
    ).rejects.toThrow("Invalid coordinates");
  });

  it("rejects when OSRM returns no route found", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(noRouteResponse), { status: 200 })),
    );
    global.fetch = fetchMock;

    await expect(
      routingService.calculateRoute({ lat: 12.97, lng: 77.59 }, { lat: 12.975, lng: 77.6 }),
    ).rejects.toThrow("No route found");
  });

  it("rejects on network failure", async () => {
    const fetchMock = vi.fn(() => Promise.reject(new TypeError("Failed to fetch")));
    global.fetch = fetchMock;

    await expect(
      routingService.calculateRoute({ lat: 12.97, lng: 77.59 }, { lat: 12.975, lng: 77.6 }),
    ).rejects.toThrow("Failed to fetch");
  });

  it("rejects on network failure (simulating timeout)", async () => {
    const fetchMock = vi.fn(() => Promise.reject(new TypeError("Network error")));
    global.fetch = fetchMock;

    await expect(
      routingService.calculateRoute({ lat: 12.97, lng: 77.59 }, { lat: 12.975, lng: 77.6 }),
    ).rejects.toThrow("Network error");
  });

  it("rejects on malformed response (missing geometry)", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(malformedResponse), { status: 200 })),
    );
    global.fetch = fetchMock;

    await expect(
      routingService.calculateRoute({ lat: 12.97, lng: 77.59 }, { lat: 12.975, lng: 77.6 }),
    ).rejects.toThrow("Malformed route geometry");
  });

  it("ignores outdated responses when a newer request has been made", async () => {
    let resolveFirst;
    const firstPromise = new Promise((res) => { resolveFirst = res; });
    const fetchMock = vi.fn(() => firstPromise);
    global.fetch = fetchMock;

    const p1 = routingService.calculateRoute({ lat: 12.97, lng: 77.59 }, { lat: 12.975, lng: 77.6 });
    routingService.lastRequestId += 1; // simulate newer request
    resolveFirst(new Response(JSON.stringify(successResponse), { status: 200 }));
    await expect(p1).resolves.toBeNull(); // outdated, returns null
  });

  it("detects significant farmer movement for debounce reuse", () => {
    routingService.updateLastFarmerLocation({ lat: 12.97, lng: 77.59 });
    // 0.0001 deg lng ≈ 10m (< 50m threshold) → not significant
    expect(routingService.hasSignificantMovement({ lat: 12.97, lng: 77.5901 })).toBe(false);
    // 0.001 deg lng ≈ 108m (> 50m threshold) → significant
    expect(routingService.hasSignificantMovement({ lat: 12.97, lng: 77.591 })).toBe(true);
    expect(routingService.hasSignificantMovement(null)).toBe(true);
  });

  it("getLastRoute returns null when no route calculated", () => {
    expect(routingService.getLastRoute()).toBeNull();
  });
});

describe("calculateRouteWithDebounce", () => {
  beforeEach(() => {
    routingService.clearRoute();
    routingService.cancelPending();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("calls onResult with null for invalid coordinates", () => {
    const onResult = vi.fn();
    calculateRouteWithDebounce({ lat: 200, lng: 77.59 }, { lat: 12.975, lng: 77.6 }, onResult);
    expect(onResult).toHaveBeenCalledWith(null, null, "Invalid coordinates");
  });

  it("reuses last route when farmer hasn't moved significantly", async () => {
    const lastRoute = {
      features: [{ geometry: { type: "LineString", coordinates: [[12.97, 77.59]] } }],
      routeInfo: { distanceKm: "5.00", durationMin: "5.0", calculatedAt: new Date().toISOString() },
    };
    vi.spyOn(routingService, "getLastRoute").mockReturnValue(lastRoute);
    routingService.updateLastFarmerLocation({ lat: 12.97, lng: 77.59 });
    const onResult = vi.fn();
    calculateRouteWithDebounce(
      { lat: 12.97, lng: 77.5901 },
      { lat: 12.975, lng: 77.6 },
      onResult,
    );
    expect(onResult).toHaveBeenCalledWith(lastRoute, lastRoute.routeInfo, null);
    vi.restoreAllMocks();
  });

  it("calculates route after debounce delay", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(successResponse), { status: 200 })),
    );
    global.fetch = fetchMock;
    const onResult = vi.fn();

    calculateRouteWithDebounce(
      { lat: 12.97, lng: 77.59 },
      { lat: 12.975, lng: 77.6 },
      onResult,
      1500,
    );
    expect(onResult).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1500);
    await vi.waitFor(() => {
      expect(onResult).toHaveBeenCalled();
    });
    const call = onResult.mock.calls[0];
    expect(call[0].routeInfo.distanceKm).toBe("5.00");
    expect(call[2]).toBeNull();
  });

  it("preserves last valid route on routing failure", async () => {
    routingService.lastRoute = {
      features: [{ geometry: { type: "LineString", coordinates: [[12.97, 77.59]] } }],
      routeInfo: { distanceKm: "5.00", durationMin: "5.0", calculatedAt: new Date().toISOString() },
    };
    const fetchMock = vi.fn(() => Promise.reject(new Error("Network error")));
    global.fetch = fetchMock;
    const onResult = vi.fn();

    calculateRouteWithDebounce(
      { lat: 12.97, lng: 77.59 },
      { lat: 12.975, lng: 77.6 },
      onResult,
      1500,
    );
    vi.advanceTimersByTime(1500);
    await vi.waitFor(() => {
      expect(onResult).toHaveBeenCalled();
    });
    const call = onResult.mock.calls[0];
    expect(call[0]).toBe(routingService.lastRoute);
    expect(call[2]).toBeNull();
  });

  it("cancels pending debounce timer on cleanup", () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify(successResponse), { status: 200 })));
    global.fetch = fetchMock;
    const onResult = vi.fn();

    calculateRouteWithDebounce(
      { lat: 12.97, lng: 77.59 },
      { lat: 12.975, lng: 77.6 },
      onResult,
      1500,
    );
    routingService.cancelPending();
    vi.advanceTimersByTime(5000);
    expect(onResult).not.toHaveBeenCalled();
  });
});

describe("formatDistance", () => {
  it("formats kilometers", () => {
    expect(formatDistance("5.00")).toBe("5 km");
    expect(formatDistance("0.5")).toBe("500 m");
  });
  it("returns dash for invalid", () => {
    expect(formatDistance(null)).toBe("–");
    expect(formatDistance(undefined)).toBe("–");
  });
});

describe("formatDuration", () => {
  it("formats minutes", () => {
    expect(formatDuration("5.0")).toBe("5 min");
    expect(formatDuration("90")).toBe("1h 30min");
  });
  it("returns dash for invalid", () => {
    expect(formatDuration(null)).toBe("–");
  });
});

describe("OSRM URL construction", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    routingService.clearRoute();
    routingService.cancelPending();
    vi.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("constructs URL with longitude,latitude ordering in path", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ code: "Ok", routes: [{ distance: 1000, duration: 60, geometry: { type: "LineString", coordinates: [[77.59, 12.97], [77.6, 12.98]] } }] }), { status: 200 })),
    );
    global.fetch = fetchMock;

    await routingService.calculateRoute(
      { lat: 12.97, lng: 77.59 },
      { lat: 12.98, lng: 77.6 },
    );

    const calledUrl = fetchMock.mock.calls[0][0];
    const url = new URL(calledUrl);
    // Path should be /route/v1/driving/{lng},{lat};{lng},{lat}
    expect(url.pathname).toBe("/route/v1/driving/77.59,12.97;77.6,12.98");
    // Host should be the OSRM router
    expect(url.hostname).toBe("router.project-osrm.org");
    // Protocol should be https
    expect(url.protocol).toBe("https:");
  });

  it("includes correct query parameters", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ code: "Ok", routes: [{ distance: 1000, duration: 60, geometry: { type: "LineString", coordinates: [[77.59, 12.97], [77.6, 12.98]] } }] }), { status: 200 })),
    );
    global.fetch = fetchMock;

    await routingService.calculateRoute(
      { lat: 12.97, lng: 77.59 },
      { lat: 12.98, lng: 77.6 },
    );

    const calledUrl = fetchMock.mock.calls[0][0];
    const url = new URL(calledUrl);
    expect(url.searchParams.get("overview")).toBe("full");
    expect(url.searchParams.get("geometries")).toBe("geojson");
    expect(url.searchParams.get("steps")).toBe("true");
  });

  it("uses https protocol when base URL has https", async () => {
    const secureService = new RoutingService("https://router.project-osrm.org");
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ code: "Ok", routes: [{ distance: 1000, duration: 60, geometry: { type: "LineString", coordinates: [[77.59, 12.97], [77.6, 12.98]] } }] }), { status: 200 })),
    );
    global.fetch = fetchMock;

    await secureService.calculateRoute(
      { lat: 12.97, lng: 77.59 },
      { lat: 12.98, lng: 77.6 },
    );

    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toContain("https://");
  });

  it("rejects with error when base URL has no valid protocol", async () => {
    const badService = new RoutingService("router.project-osrm.org");
    await expect(
      badService.calculateRoute({ lat: 12.97, lng: 77.59 }, { lat: 12.98, lng: 77.6 }),
    ).rejects.toThrow(/Invalid routing API URL/);
  });

  it("rejects with error when base URL has ftp protocol", async () => {
    const badService = new RoutingService("ftp://router.project-osrm.org");
    await expect(
      badService.calculateRoute({ lat: 12.97, lng: 77.59 }, { lat: 12.98, lng: 77.6 }),
    ).rejects.toThrow(/Invalid routing API URL/);
  });

  it("handles OSRM InvalidQuery error with actionable message", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ code: "InvalidQuery", message: "Query string malformed close to position 64" }), { status: 200 })),
    );
    global.fetch = fetchMock;

    await expect(
      routingService.calculateRoute({ lat: 12.97, lng: 77.59 }, { lat: 12.98, lng: 77.6 }),
    ).rejects.toThrow(/OSRM InvalidQuery/);
  });

  it("handles OSRM InvalidUrl error with actionable message", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ code: "InvalidUrl", message: "URL string malformed close to position 1: \"/\"" }), { status: 200 })),
    );
    global.fetch = fetchMock;

    await expect(
      routingService.calculateRoute({ lat: 12.97, lng: 77.59 }, { lat: 12.98, lng: 77.6 }),
    ).rejects.toThrow(/OSRM InvalidUrl/);
  });

  it("handles empty base URL gracefully", async () => {
    const emptyService = new RoutingService("");
    await expect(
      emptyService.calculateRoute({ lat: 12.97, lng: 77.59 }, { lat: 12.98, lng: 77.6 }),
    ).rejects.toThrow(/Invalid routing API URL/);
  });
});
