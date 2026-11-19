import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import useGeolocation from "./useGeolocation.js";

function Probe({ requestOnMount = false }) {
  const geo = useGeolocation({ requestOnMount });
  return (
    <div>
      <span data-testid="position">{geo.position ? JSON.stringify(geo.position) : "none"}</span>
      <span data-testid="loading">{String(geo.loading)}</span>
      <span data-testid="error">{geo.error || "none"}</span>
      <span data-testid="supported">{String(geo.isSupported)}</span>
      <button data-testid="request" onClick={geo.requestLocation}>request</button>
      <button data-testid="start" onClick={geo.startTracking}>start</button>
      <button data-testid="stop" onClick={geo.stopTracking}>stop</button>
      <button data-testid="clear" onClick={geo.clearError}>clear</button>
    </div>
  );
}

describe("useGeolocation", () => {
  const originalGeolocation = navigator.geolocation;

  afterEach(() => {
    navigator.geolocation = originalGeolocation;
    vi.restoreAllMocks();
  });

  it("reports unsupported when geolocation is unavailable", () => {
    navigator.geolocation = undefined;
    render(<Probe />);
    expect(screen.getByTestId("position")).toHaveTextContent("none");
    expect(screen.getByTestId("supported")).toHaveTextContent("false");
    fireEvent.click(screen.getByTestId("request"));
    expect(screen.getByTestId("error")).toHaveTextContent(/not supported by your browser/);
  });

  it("handles permission denial", () => {
    const mockGeo = {
      getCurrentPosition: vi.fn((success, failure) => failure({ code: 1, message: "User denied" })),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    };
    navigator.geolocation = mockGeo;
    render(<Probe requestOnMount />);
    expect(screen.getByTestId("error")).toHaveTextContent(/location access was denied/i);
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("handles position unavailable", () => {
    const mockGeo = {
      getCurrentPosition: vi.fn((success, failure) => failure({ code: 2, message: "Position unavailable" })),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    };
    navigator.geolocation = mockGeo;
    render(<Probe requestOnMount />);
    expect(screen.getByTestId("error")).toHaveTextContent(/location information is unavailable/i);
  });

  it("handles timeout", () => {
    const mockGeo = {
      getCurrentPosition: vi.fn((success, failure) => failure({ code: 3, message: "Timeout" })),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    };
    navigator.geolocation = mockGeo;
    render(<Probe requestOnMount />);
    expect(screen.getByTestId("error")).toHaveTextContent(/location request timed out/i);
  });

  it("sets position on success and does not request on mount by default", async () => {
    const mockGeo = {
      getCurrentPosition: vi.fn((success) => success({ coords: { latitude: 12.97, longitude: 77.59 } })),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    };
    navigator.geolocation = mockGeo;
    render(<Probe />);
    expect(screen.getByTestId("position")).toHaveTextContent("none");
    expect(mockGeo.getCurrentPosition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("request"));
    await waitFor(() => {
      expect(screen.getByTestId("position")).toHaveTextContent(/12\.97.*77\.59/);
    });
  });

  it("clears error", () => {
    const mockGeo = {
      getCurrentPosition: vi.fn((success, failure) => failure({ code: 1, message: "User denied" })),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    };
    navigator.geolocation = mockGeo;
    render(<Probe requestOnMount />);
    expect(screen.getByTestId("error")).toHaveTextContent(/location access was denied/i);
    fireEvent.click(screen.getByTestId("clear"));
    expect(screen.getByTestId("error")).toHaveTextContent("none");
  });

  it("startTracking calls watchPosition and stopTracking calls clearWatch", () => {
    const mockGeo = {
      getCurrentPosition: vi.fn(),
      watchPosition: vi.fn(() => 42),
      clearWatch: vi.fn(),
    };
    navigator.geolocation = mockGeo;
    render(<Probe />);
    fireEvent.click(screen.getByTestId("start"));
    expect(mockGeo.watchPosition).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("stop"));
    expect(mockGeo.clearWatch).toHaveBeenCalledWith(42);
  });
});
