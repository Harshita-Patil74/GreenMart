import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import orderApi from "../../api/orderApi.js";
import FarmerTrackingControls from "./FarmerTrackingControls.jsx";

vi.mock("../../api/orderApi.js", () => ({
  __esModule: true,
  default: { updateLocation: vi.fn() },
}));

vi.mock("../../utils/alertUtils.js", () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
  showInfo: vi.fn(),
}));

const orderOutForDelivery = {
  _id: "order-1",
  orderNumber: "GM-1001",
  status: "Out for Delivery",
  items: [
    { _id: "item-1", farmer: "farmer-1", name: "Tomatoes", price: 40, quantity: 1 },
  ],
};

const orderNotEligible = {
  _id: "order-2",
  orderNumber: "GM-1002",
  status: "Delivered",
  items: [
    { _id: "item-2", farmer: "farmer-1", name: "Potatoes", price: 30, quantity: 2 },
  ],
};

const orderOtherFarmer = {
  _id: "order-3",
  orderNumber: "GM-1003",
  status: "Out for Delivery",
  items: [
    { _id: "item-3", farmer: "farmer-2", name: "Onions", price: 50, quantity: 1 },
  ],
};

function renderControls(order, farmerId = "farmer-1") {
  return render(<FarmerTrackingControls order={order} farmerId={farmerId} />);
}

describe("FarmerTrackingControls", () => {
  const originalGeolocation = navigator.geolocation;

  afterEach(() => {
    navigator.geolocation = originalGeolocation;
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("renders nothing for orders not eligible for tracking", () => {
    const { container } = renderControls(orderNotEligible);
    expect(container.children.length).toBe(0);
  });

  it("renders nothing for orders belonging to another farmer", () => {
    const { container } = renderControls(orderOtherFarmer, "farmer-1");
    expect(container.children.length).toBe(0);
  });

  it("shows start tracking button for eligible orders", () => {
    renderControls(orderOutForDelivery);
    expect(screen.getByRole("button", { name: "Start Live Tracking" })).toBeInTheDocument();
  });

  it("explains GPS permission requirement", () => {
    renderControls(orderOutForDelivery);
    expect(screen.getByText(/GPS permission is required/i)).toBeInTheDocument();
  });

  it("starts tracking when button is clicked and grants geolocation permission", () => {
    const mockGeo = {
      watchPosition: vi.fn(() => 1),
      clearWatch: vi.fn(),
    };
    navigator.geolocation = mockGeo;
    renderControls(orderOutForDelivery);
    fireEvent.click(screen.getByRole("button", { name: "Start Live Tracking" }));
    expect(mockGeo.watchPosition).toHaveBeenCalled();
    expect(screen.getByText("Live Location Active")).toBeInTheDocument();
  });

  it("stops tracking when stop button is clicked", () => {
    const mockGeo = {
      watchPosition: vi.fn(() => 1),
      clearWatch: vi.fn(),
    };
    navigator.geolocation = mockGeo;
    renderControls(orderOutForDelivery);
    fireEvent.click(screen.getByRole("button", { name: "Start Live Tracking" }));
    expect(screen.getByText("Live Location Active")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Stop Live Tracking" }));
    expect(mockGeo.clearWatch).toHaveBeenCalledWith(1);
    expect(screen.queryByText("Live Location Active")).not.toBeInTheDocument();
  });

  it("shows GPS error when permission is denied", () => {
    const mockGeo = {
      watchPosition: vi.fn((success, failure) => failure({ code: 1, message: "User denied" })),
      clearWatch: vi.fn(),
    };
    navigator.geolocation = mockGeo;
    renderControls(orderOutForDelivery);
    fireEvent.click(screen.getByRole("button", { name: "Start Live Tracking" }));
    expect(screen.getByText(/location access was denied/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry Tracking" })).toBeInTheDocument();
  });

  it("shows GPS error when geolocation is unsupported", () => {
    navigator.geolocation = undefined;
    renderControls(orderOutForDelivery);
    fireEvent.click(screen.getByRole("button", { name: "Start Live Tracking" }));
    expect(screen.getByText(/not supported by your browser/i)).toBeInTheDocument();
  });

  it("sends location to backend on position update", async () => {
    const mockGeo = {
      watchPosition: vi.fn((success) => {
        success({ coords: { latitude: 12.97, longitude: 77.59 } });
        return 1;
      }),
      clearWatch: vi.fn(),
    };
    navigator.geolocation = mockGeo;
    vi.spyOn(orderApi, "updateLocation").mockResolvedValue({ data: {} });
    renderControls(orderOutForDelivery);
    fireEvent.click(screen.getByRole("button", { name: "Start Live Tracking" }));
    await waitFor(() => expect(orderApi.updateLocation).toHaveBeenCalledWith("order-1", { lat: 12.97, lng: 77.59 }));
  });

  it("shows API error when location update fails", async () => {
    const mockGeo = {
      watchPosition: vi.fn((success) => {
        success({ coords: { latitude: 12.97, longitude: 77.59 } });
        return 1;
      }),
      clearWatch: vi.fn(),
    };
    navigator.geolocation = mockGeo;
    vi.spyOn(orderApi, "updateLocation").mockRejectedValue(new Error("Network error"));
    renderControls(orderOutForDelivery);
    fireEvent.click(screen.getByRole("button", { name: "Start Live Tracking" }));
    await waitFor(() => expect(screen.getByText(/network error/i)).toBeInTheDocument());
  });

  it("displays last location and update time", async () => {
    const mockGeo = {
      watchPosition: vi.fn((success) => {
        success({ coords: { latitude: 12.97, longitude: 77.59 } });
        return 1;
      }),
      clearWatch: vi.fn(),
    };
    navigator.geolocation = mockGeo;
    vi.spyOn(orderApi, "updateLocation").mockResolvedValue({ data: {} });
    renderControls(orderOutForDelivery);
    fireEvent.click(screen.getByRole("button", { name: "Start Live Tracking" }));
    await waitFor(() => expect(screen.getByText(/12\.9700, 77\.5900/)).toBeInTheDocument());
  });

  it("cleans up watcher on unmount", () => {
    const mockGeo = {
      watchPosition: vi.fn(() => 1),
      clearWatch: vi.fn(),
    };
    navigator.geolocation = mockGeo;
    const { unmount } = renderControls(orderOutForDelivery);
    fireEvent.click(screen.getByRole("button", { name: "Start Live Tracking" }));
    unmount();
    expect(mockGeo.clearWatch).toHaveBeenCalledWith(1);
  });

  it("stops tracking when order becomes ineligible", () => {
    const mockGeo = {
      watchPosition: vi.fn(() => 1),
      clearWatch: vi.fn(),
    };
    navigator.geolocation = mockGeo;
    const { rerender } = renderControls(orderOutForDelivery);
    fireEvent.click(screen.getByRole("button", { name: "Start Live Tracking" }));
    expect(screen.getByText("Live Location Active")).toBeInTheDocument();
    rerender(<FarmerTrackingControls order={orderNotEligible} farmerId="farmer-1" />);
    expect(screen.queryByText("Live Location Active")).not.toBeInTheDocument();
  });
});
