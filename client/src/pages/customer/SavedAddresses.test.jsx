import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import addressApi from "../../api/addressApi";
import Checkout from "../../pages/shared/Checkout.jsx";

vi.mock("../../api/addressApi.js", () => ({
  default: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), setDefault: vi.fn() },
}));

const addressesWithCoords = [
  {
    _id: "addr-1",
    name: "Home",
    line1: "123 Main Street",
    city: "Bangalore",
    phone: "555-0100",
    coordinates: { lat: 12.97, lng: 77.59 },
    isDefault: true,
  },
];

const addressesWithoutCoords = [
  {
    _id: "addr-1",
    name: "Home",
    line1: "123 Main Street",
    city: "Bangalore",
    phone: "555-0100",
    coordinates: null,
    isDefault: true,
  },
];

function renderWithAuth(ui, cartItems = []) {
  const store = configureStore({
    reducer: {
      auth: () => ({ user: { id: "customer-1", email: "customer@example.test", role: "customer" }, token: "test-token" }),
      cart: () => ({ items: cartItems, deliveryCharge: null, totals: null, loaded: true, loading: false }),
    },
    preloadedState: {},
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/checkout"]}>{ui}</MemoryRouter>
    </Provider>
  );
}

describe("Address coordinates persistence", () => {
  afterEach(() => vi.restoreAllMocks());

  it("Checkout reloads addresses on navigation", async () => {
    addressApi.list.mockResolvedValue({ data: addressesWithCoords });
    renderWithAuth(<Checkout />);
    await waitFor(() => expect(screen.getByText("Delivery Address")).toBeInTheDocument());
    expect(addressApi.list).toHaveBeenCalled();
  });

  it("Checkout shows address details for address with coordinates", async () => {
    addressApi.list.mockResolvedValue({ data: addressesWithCoords });
    renderWithAuth(<Checkout />);
    await waitFor(() => expect(screen.getByText(/123 Main Street, Bangalore/)).toBeInTheDocument());
  });

  it("Checkout does not show coordinates indicator for address without coords", async () => {
    addressApi.list.mockResolvedValue({ data: addressesWithoutCoords });
    renderWithAuth(<Checkout />);
    await waitFor(() => screen.getByText("Delivery Address"));
    expect(screen.queryByText("Coordinates set")).not.toBeInTheDocument();
  });

  it("Checkout shows delivery unavailability error when address has no coordinates", async () => {
    addressApi.list.mockResolvedValue({ data: addressesWithoutCoords });
    renderWithAuth(<Checkout />, [{ product: { _id: "p1", name: "Test Product", price: 10 }, quantity: 1 }]);
    await waitFor(() => screen.getByText(/no location coordinates/i));
  });
});
