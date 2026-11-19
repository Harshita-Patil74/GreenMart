import { render, screen } from "@testing-library/react";
import React from "react";
import { DeliveryTrackingMap } from "../../components/map/MapView.jsx";

const sampleRoute = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { distanceKm: "5.00", durationMin: "5.0", calculatedAt: new Date().toISOString() },
      geometry: { type: "LineString", coordinates: [[12.97, 77.59], [12.975, 77.595], [12.98, 77.6]] },
    },
  ],
  routeInfo: { distanceKm: "5.00", durationMin: "5.0", calculatedAt: new Date().toISOString() },
};

describe("DeliveryTrackingMap", () => {
  it("shows empty state when no location data is provided", () => {
    render(<DeliveryTrackingMap />);
    expect(screen.getByText(/no live location available/i)).toBeInTheDocument();
  });

  it("renders a farmer marker when only farmer location is provided", () => {
    const { container } = render(
      <DeliveryTrackingMap farmerLocation={{ lat: 12.97, lng: 77.59 }} farmerLabel="Farmer" />,
    );
    const markers = container.querySelectorAll(".leaflet-marker-icon");
    expect(markers.length).toBeGreaterThanOrEqual(1);
  });

  it("renders a customer marker when only customer location is provided", () => {
    const { container } = render(
      <DeliveryTrackingMap customerLocation={{ lat: 12.97, lng: 77.59 }} customerLabel="Delivery destination" />,
    );
    const markers = container.querySelectorAll(".leaflet-marker-icon");
    expect(markers.length).toBeGreaterThanOrEqual(1);
  });

  it("renders two markers when both locations are provided", () => {
    const { container } = render(
      <DeliveryTrackingMap
        farmerLocation={{ lat: 12.97, lng: 77.59 }}
        customerLocation={{ lat: 13.0, lng: 77.6 }}
        farmerLabel="Farmer"
        customerLabel="Delivery destination"
      />,
    );
    const markers = container.querySelectorAll(".leaflet-marker-icon");
    expect(markers.length).toBeGreaterThanOrEqual(2);
  });

  it("renders route distance and duration info when route is provided", () => {
    const { container } = render(
      <DeliveryTrackingMap
        farmerLocation={{ lat: 12.97, lng: 77.59 }}
        customerLocation={{ lat: 12.98, lng: 77.6 }}
        route={sampleRoute}
        routeInfo={sampleRoute.routeInfo}
      />,
    );
    expect(container.textContent).toContain("5 km");
    expect(container.textContent).toContain("5 min");
  });

  it("shows route error message when routing fails", () => {
    const { container } = render(
      <DeliveryTrackingMap
        farmerLocation={{ lat: 12.97, lng: 77.59 }}
        customerLocation={{ lat: 12.98, lng: 77.6 }}
        routeStatus="error"
        routeError="No route found"
      />,
    );
    expect(container.textContent).toContain("No route found");
  });

  it("shows calculating state when route is being calculated", () => {
    const { container } = render(
      <DeliveryTrackingMap
        farmerLocation={{ lat: 12.97, lng: 77.59 }}
        customerLocation={{ lat: 12.98, lng: 77.6 }}
        routeStatus="calculating"
      />,
    );
    expect(container.textContent).toContain("Calculating route");
  });

  it("preserves markers when route fails", () => {
    const { container } = render(
      <DeliveryTrackingMap
        farmerLocation={{ lat: 12.97, lng: 77.59 }}
        customerLocation={{ lat: 12.98, lng: 77.6 }}
        routeStatus="error"
        routeError="Network error"
      />,
    );
    const markers = container.querySelectorAll(".leaflet-marker-icon");
    expect(markers.length).toBeGreaterThanOrEqual(2);
  });

  it("renders map container with custom height", () => {
    const { container } = render(
      <DeliveryTrackingMap farmerLocation={{ lat: 12.97, lng: 77.59 }} height="320px" />,
    );
    const map = container.querySelector(".leaflet-container");
    expect(map).toBeInTheDocument();
    expect(map).toHaveStyle("height: 100%");
  });
});
