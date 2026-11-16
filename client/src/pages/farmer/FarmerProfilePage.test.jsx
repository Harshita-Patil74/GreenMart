import React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { createStore } from "../../tests/testUtils.jsx";
import FarmerProfilePage from "./FarmerProfilePage.jsx";

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
  ToastProvider: ({ children }) => children,
}));
vi.mock("../../api/authApi.js", () => ({
  default: { me: vi.fn() },
}));
vi.mock("../../api/farmerApi.js", () => ({
  default: { get: vi.fn(), profile: vi.fn(), updateLocation: vi.fn(), resubmitApplication: vi.fn(), uploadCertificate: vi.fn() },
}));

import authApi from "../../api/authApi.js";
import farmerApi from "../../api/farmerApi.js";
import toast from "react-hot-toast";

const renderPage = (preloaded = {}) => {
  const store = createStore(preloaded);
  const utils = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/farmer/profile"]}>
        <FarmerProfilePage />
      </MemoryRouter>
    </Provider>
  );
  return { ...utils, store, container: utils.container };
};

describe("Farmer profile dispatch location", () => {
  const farmerUser = {
    _id: "farmer-1",
    name: "Ramesh Gouda",
    email: "ramesh.farm@example.test",
    role: "farmer",
    status: "Active",
    phone: "9876543210",
  };

  const farm = {
    _id: "farm-1",
    user: "farmer-1",
    farmName: "Ramesh Farm",
    address: "",
    category: "Vegetables",
    description: "",
    photo: "",
    certification: { verifiedByAdmin: true },
    location: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    authApi.me.mockResolvedValue({ data: { user: farmerUser } });
    farmerApi.get.mockResolvedValue({ data: farm });
    farmerApi.profile.mockResolvedValue({ data: {} });
  });

  it("saves a valid dispatch address, latitude and longitude", async () => {
    farmerApi.updateLocation.mockResolvedValue({
      data: { location: { lat: 12.97, lng: 77.59 }, address: "Hosur Road, Bangalore" },
    });

    const { container } = renderPage({ auth: { user: farmerUser, token: "test-token" } });

    fireEvent.click(screen.getByRole("button", { name: /Dispatch Location/i }));
    await waitFor(() => expect(screen.getByText(/Dispatch location not set/i)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Dispatch Address/i), { target: { value: "Hosur Road, Bangalore" } });
    fireEvent.change(screen.getByLabelText(/Latitude/i), { target: { value: "12.97" } });
    fireEvent.change(screen.getByLabelText(/Longitude/i), { target: { value: "77.59" } });

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(farmerApi.updateLocation).toHaveBeenCalledTimes(1));
    expect(farmerApi.updateLocation).toHaveBeenCalledWith({
      lat: 12.97,
      lng: 77.59,
      address: "Hosur Road, Bangalore",
    });

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Dispatch location saved."));
    await waitFor(() => expect(screen.getByText(/Dispatch location configured/i)).toBeInTheDocument());
    expect(screen.getByText(/12\.97/)).toBeInTheDocument();
    expect(screen.getByText(/77\.59/)).toBeInTheDocument();
  });

  it("rejects out-of-range coordinates and shows the backend validation message", async () => {
    farmerApi.updateLocation.mockImplementation(() => Promise.reject({ response: { status: 400, data: { message: "Latitude is required and must be between -90 and 90." } } }));

    const { container } = renderPage({ auth: { user: farmerUser, token: "test-token" } });

    fireEvent.click(screen.getByRole("button", { name: /Dispatch Location/i }));
    await waitFor(() => expect(screen.getByText(/Dispatch location not set/i)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Dispatch Address/i), { target: { value: "Hosur Road, Bangalore" } });
    fireEvent.change(screen.getByLabelText(/Latitude/i), { target: { value: "200" } });
    fireEvent.change(screen.getByLabelText(/Longitude/i), { target: { value: "77.59" } });

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Enter a valid latitude (-90 to 90)."));
    expect(farmerApi.updateLocation).not.toHaveBeenCalled();
    expect(screen.getByText(/Dispatch location not set/i)).toBeInTheDocument();
  });

  it("rejects a missing dispatch address before calling the backend", async () => {
    const { container } = renderPage({ auth: { user: farmerUser, token: "test-token" } });

    fireEvent.click(screen.getByRole("button", { name: /Dispatch Location/i }));
    await waitFor(() => expect(screen.getByText(/Dispatch location not set/i)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Latitude/i), { target: { value: "12.97" } });
    fireEvent.change(screen.getByLabelText(/Longitude/i), { target: { value: "77.59" } });

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Dispatch address is required."));
    expect(farmerApi.updateLocation).not.toHaveBeenCalled();
    expect(screen.getByText(/Dispatch location not set/i)).toBeInTheDocument();
  });
});
