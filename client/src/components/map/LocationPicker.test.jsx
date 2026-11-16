import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { renderWithStore } from "../../tests/testUtils.jsx";
import LocationPicker from "../../components/map/LocationPicker.jsx";

const mockFetch = vi.fn();

vi.stubGlobal("fetch", mockFetch);

describe("LocationPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const waitForDebounce = () => new Promise((resolve) => setTimeout(resolve, 400));

  it("renders latitude and longitude input fields", () => {
    renderWithStore(<LocationPicker />);
    expect(screen.getByPlaceholderText("Enter latitude")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter longitude")).toBeInTheDocument();
  });

  it("shows placeholders on both inputs", () => {
    renderWithStore(<LocationPicker />);
    expect(screen.getByPlaceholderText("Enter latitude")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter longitude")).toBeInTheDocument();
  });

  it("calls onChange only when both valid latitude and longitude are entered", async () => {
    const onChange = vi.fn();
    renderWithStore(<LocationPicker onChange={onChange} />);
    const latInput = screen.getByPlaceholderText("Enter latitude");
    const lngInput = screen.getByPlaceholderText("Enter longitude");

    fireEvent.change(latInput, { target: { value: "15.352386" } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(lngInput, { target: { value: "75.096516" } });

    await waitForDebounce();

    expect(onChange).toHaveBeenCalledWith({ lat: 15.352386, lng: 75.096516 });
  });

  it("longitude never becomes 0 when only latitude is entered", async () => {
    const onChange = vi.fn();
    renderWithStore(<LocationPicker onChange={onChange} />);
    const latInput = screen.getByPlaceholderText("Enter latitude");
    const lngInput = screen.getByPlaceholderText("Enter longitude");

    fireEvent.change(latInput, { target: { value: "15.352386" } });

    await waitForDebounce();

    expect(onChange).not.toHaveBeenCalled();
    expect(lngInput.value).toBe("");
  });

  it("latitude never becomes 0 when only longitude is entered", async () => {
    const onChange = vi.fn();
    renderWithStore(<LocationPicker onChange={onChange} />);
    const latInput = screen.getByPlaceholderText("Enter latitude");
    const lngInput = screen.getByPlaceholderText("Enter longitude");

    fireEvent.change(lngInput, { target: { value: "75.096516" } });

    await waitForDebounce();

    expect(onChange).not.toHaveBeenCalled();
    expect(latInput.value).toBe("");
  });

  it("validates latitude range", async () => {
    const onChange = vi.fn();
    renderWithStore(<LocationPicker onChange={onChange} />);
    const latInput = screen.getByPlaceholderText("Enter latitude");
    const lngInput = screen.getByPlaceholderText("Enter longitude");

    fireEvent.change(latInput, { target: { value: "91" } });
    fireEvent.change(lngInput, { target: { value: "75.096516" } });

    await waitForDebounce();

    expect(screen.getByText(/latitude must be between -90 and 90/i)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("validates longitude range", async () => {
    const onChange = vi.fn();
    renderWithStore(<LocationPicker onChange={onChange} />);
    const lngInput = screen.getByPlaceholderText("Enter longitude");
    const latInput = screen.getByPlaceholderText("Enter latitude");

    fireEvent.change(latInput, { target: { value: "15.352386" } });
    fireEvent.change(lngInput, { target: { value: "181" } });

    await waitForDebounce();

    expect(screen.getByText(/longitude must be between -180 and 180/i)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("loads existing coordinates when value is provided", () => {
    renderWithStore(<LocationPicker value={{ lat: 12.97, lng: 77.59 }} />);
    expect(screen.getByPlaceholderText("Enter latitude").value).toBe("12.97");
    expect(screen.getByPlaceholderText("Enter longitude").value).toBe("77.59");
  });

  it("does not call onChange with invalid coordinates", async () => {
    const onChange = vi.fn();
    renderWithStore(<LocationPicker onChange={onChange} />);
    const latInput = screen.getByPlaceholderText("Enter latitude");
    const lngInput = screen.getByPlaceholderText("Enter longitude");

    fireEvent.change(latInput, { target: { value: "invalid" } });
    fireEvent.change(lngInput, { target: { value: "also-invalid" } });

    await waitForDebounce();

    expect(onChange).not.toHaveBeenCalled();
  });

  it("geocodes address when Locate Address is clicked", async () => {
    const onChange = vi.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          display_name: "Gokul Road, Hubli, Karnataka, India",
          lat: "15.352386",
          lon: "75.096516",
        },
      ],
    });

    renderWithStore(<LocationPicker onChange={onChange} street="Gokul Road" city="Hubli" />);

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const fetchCall = mockFetch.mock.calls[0][0];
    expect(fetchCall).toContain("Gokul%20Road");
    expect(fetchCall).toContain("Hubli");
  });

  it("updates coordinates when a geocode result is selected", async () => {
    const onChange = vi.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          display_name: "Gokul Road, Hubli, Karnataka, India",
          lat: "15.352386",
          lon: "75.096516",
        },
      ],
    });

    renderWithStore(<LocationPicker onChange={onChange} street="Gokul Road" city="Hubli" />);

    await waitFor(() => expect(screen.getByText(/Select a location:/)).toBeInTheDocument());

    fireEvent.click(screen.getByText("Gokul Road, Hubli, Karnataka, India"));

    expect(onChange).toHaveBeenCalledWith({ lat: 15.352386, lng: 75.096516 });
  });

  it("shows error when geocoding finds no results", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    renderWithStore(<LocationPicker street="Nonexistent Place" city="Nowhere" />);

    await waitFor(() => expect(screen.getByText(/could not be found/i)).toBeInTheDocument());
  });

  it("displays geocode error when service fails", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    renderWithStore(<LocationPicker street="Gokul Road" city="Hubli" />);

    await waitFor(() => expect(screen.getByText(/Network error/i)).toBeInTheDocument());
  });

  it("manual coordinates are not overwritten by stale geocoding responses", async () => {
    const onChange = vi.fn();
    let resolveGeocode;
    mockFetch.mockImplementation(() =>
      new Promise((resolve) => {
        resolveGeocode = resolve;
      })
    );

    renderWithStore(<LocationPicker onChange={onChange} street="Gokul Road" city="Hubli" />);

    // Wait for geocoding to start
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    // Enter manual coordinates first
    const latInput = screen.getByPlaceholderText("Enter latitude");
    const lngInput = screen.getByPlaceholderText("Enter longitude");
    fireEvent.change(latInput, { target: { value: "12.97" } });
    fireEvent.change(lngInput, { target: { value: "77.59" } });

    await waitForDebounce();
    expect(onChange).toHaveBeenCalledWith({ lat: 12.97, lng: 77.59 });
    onChange.mockClear();

    // Now resolve geocoding with different coordinates
    resolveGeocode({
      ok: true,
      json: async () => [
        {
          display_name: "Somewhere Else",
          lat: "20.0",
          lon: "80.0",
        },
      ],
    });

    await waitForDebounce();

    // Manual coordinates should NOT be overwritten
    expect(latInput.value).toBe("12.97");
    expect(lngInput.value).toBe("77.59");
    expect(onChange).not.toHaveBeenCalled();
  });
});
