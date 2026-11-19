import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import orderApi from "../../api/orderApi.js";
import { subscribeOrderLocation } from "../../socket/socketClient.js";
import { routingService, calculateRouteWithDebounce } from "../../utils/routingService.js";
import TrackOrder from "./TrackOrder.jsx";

vi.mock("../../api/orderApi.js", () => ({
  __esModule: true,
  default: { get: vi.fn() },
}));

vi.mock("../../socket/socketClient.js", () => ({
  __esModule: true,
  subscribeOrderLocation: vi.fn(() => vi.fn()),
  subscribeOrderStatus: vi.fn(() => vi.fn()),
}));

vi.mock("../../utils/routingService.js", () => ({
  __esModule: true,
  routingService: {
    calculateRoute: vi.fn(),
    cancelPending: vi.fn(),
    getLastRoute: vi.fn(() => null),
    clearRoute: vi.fn(),
  },
  calculateRouteWithDebounce: vi.fn(),
  formatDistance: vi.fn((km) => `${km} km`),
  formatDuration: vi.fn((min) => `${min} min`),
}));

const dispatchLocationOrder = {
  _id: "ord-dispatch",
  orderNumber: "GM100001",
  status: "Out for Delivery",
  currentLocation: null,
  deliverySnapshot: {
    dispatchLocations: [
      {
        farmerId: "farmer-1",
        farmerName: "Green Valley Farms",
        location: { lat: 15.408, lng: 75.119 },
      },
    ],
    destinationCoordinates: { lat: 12.97, lng: 77.59 },
  },
  items: [
    { _id: "i1", product: "p1", name: "Fresh Organic Litchi", price: 180, quantity: 1, farmer: "farmer-1" },
    { _id: "i2", product: "p2", name: "Fresh Pomegranates", price: 160, quantity: 1, farmer: "farmer-1" },
  ],
};

const liveLocationOrder = {
  _id: "ord-live",
  orderNumber: "GM100002",
  status: "Out for Delivery",
  currentLocation: { lat: 13.0, lng: 77.6, updatedAt: "2026-01-01T10:00:00Z" },
  deliverySnapshot: {
    dispatchLocations: [
      {
        farmerId: "farmer-1",
        farmerName: "Green Valley Farms",
        location: { lat: 15.408, lng: 75.119 },
      },
    ],
    destinationCoordinates: { lat: 12.97, lng: 77.59 },
  },
  items: [
    { _id: "i1", product: "p1", name: "Product A", price: 100, quantity: 1, farmer: "farmer-1" },
  ],
};

const noLocationOrder = {
  _id: "ord-none",
  orderNumber: "GM100003",
  status: "Order Placed",
  currentLocation: null,
  deliverySnapshot: {
    dispatchLocations: [],
    destinationCoordinates: null,
  },
  items: [
    { _id: "i1", product: "p1", name: "Product A", price: 100, quantity: 1, farmer: "farmer-1" },
  ],
};

describe("TrackOrder location flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routingService.calculateRoute.mockReset();
    routingService.cancelPending.mockClear();
    routingService.getLastRoute.mockReturnValue(null);
    vi.mocked(calculateRouteWithDebounce).mockClear();
  });

  it("shows farmer marker from dispatch location on initial load when currentLocation is absent", async () => {
    orderApi.get.mockResolvedValue({ data: dispatchLocationOrder });
    render(
      <MemoryRouter initialEntries={["/track-order/GM100001"]}>
        <Routes>
          <Route path="/track-order/:id" element={<TrackOrder />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/GM100001/)).toBeInTheDocument());
    expect(document.querySelector(".leaflet-container")).toBeInTheDocument();
  });

  it("shows empty state when no farmer dispatch location and no currentLocation", async () => {
    orderApi.get.mockResolvedValue({ data: noLocationOrder });
    render(
      <MemoryRouter initialEntries={["/track-order/GM100003"]}>
        <Routes>
          <Route path="/track-order/:id" element={<TrackOrder />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/no live location available for this order yet/i)).toBeInTheDocument());
  });

  it("prefers currentLocation over dispatch location when both are present", async () => {
    orderApi.get.mockResolvedValue({ data: liveLocationOrder });
    render(
      <MemoryRouter initialEntries={["/track-order/GM100002"]}>
        <Routes>
          <Route path="/track-order/:id" element={<TrackOrder />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/GM100002/)).toBeInTheDocument());
    expect(orderApi.get).toHaveBeenCalledWith("GM100002");
  });

  it("renders the tracking page with customer destination coordinates present", async () => {
    orderApi.get.mockResolvedValue({ data: dispatchLocationOrder });
    render(
      <MemoryRouter initialEntries={["/track-order/GM100001"]}>
        <Routes>
          <Route path="/track-order/:id" element={<TrackOrder />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/GM100001/)).toBeInTheDocument());
    expect(document.querySelector(".leaflet-container")).toBeInTheDocument();
  });

  it("applies Socket.IO location update for the matching order only", async () => {
    const listener = vi.fn();
    subscribeOrderLocation.mockImplementation((cb) => { listener.mockImplementation(cb); return vi.fn(); });
    orderApi.get.mockResolvedValue({ data: dispatchLocationOrder });
    render(
      <MemoryRouter initialEntries={["/track-order/GM100001"]}>
        <Routes>
          <Route path="/track-order/:id" element={<TrackOrder />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/GM100001/)).toBeInTheDocument());

    listener({ orderId: "ord-other", location: { lat: 99, lng: 99 }, updatedAt: new Date().toISOString() });
    listener({
      orderId: "ord-dispatch",
      location: { lat: 14.5, lng: 76.5 },
      updatedAt: new Date().toISOString(),
    });
    expect(subscribeOrderLocation).toHaveBeenCalled();
  });

  it("cleans up Socket listener on unmount", async () => {
    const unsubscribe = vi.fn();
    subscribeOrderLocation.mockReturnValue(unsubscribe);
    orderApi.get.mockResolvedValue({ data: dispatchLocationOrder });
    const { unmount } = render(
      <MemoryRouter initialEntries={["/track-order/GM100001"]}>
        <Routes>
          <Route path="/track-order/:id" element={<TrackOrder />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/GM100001/)).toBeInTheDocument());
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});

describe("TrackOrder routing integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routingService.calculateRoute.mockReset();
    routingService.cancelPending.mockClear();
    vi.mocked(calculateRouteWithDebounce).mockClear();
  });

  it("calculates initial route when both farmer and customer locations are available", async () => {
    const mockRoute = {
      type: "FeatureCollection",
      features: [{ geometry: { type: "LineString", coordinates: [[15.408, 75.119]] } }],
      routeInfo: { distanceKm: "5.00", durationMin: "5.0", calculatedAt: new Date().toISOString() },
    };
    vi.mocked(calculateRouteWithDebounce).mockImplementation((farmer, customer, onResult) => {
      onResult(mockRoute, mockRoute.routeInfo, null);
    });
    orderApi.get.mockResolvedValue({ data: dispatchLocationOrder });
    render(
      <MemoryRouter initialEntries={["/track-order/GM100001"]}>
        <Routes>
          <Route path="/track-order/:id" element={<TrackOrder />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/GM100001/)).toBeInTheDocument());
    await waitFor(() => {
      expect(vi.mocked(calculateRouteWithDebounce)).toHaveBeenCalled();
    });
    const call = vi.mocked(calculateRouteWithDebounce).mock.calls[0];
    expect(call[0]).toEqual({ lat: 15.408, lng: 75.119 });
    expect(call[1]).toEqual({ lat: 12.97, lng: 77.59 });
  });

  it("cancels pending routing requests on unmount", async () => {
    orderApi.get.mockResolvedValue({ data: dispatchLocationOrder });
    const { unmount } = render(
      <MemoryRouter initialEntries={["/track-order/GM100001"]}>
        <Routes>
          <Route path="/track-order/:id" element={<TrackOrder />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/GM100001/)).toBeInTheDocument());
    unmount();
    expect(routingService.cancelPending).toHaveBeenCalled();
  });
});
