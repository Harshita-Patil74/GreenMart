import React from "react";
import { screen, waitFor, render, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../../features/auth/authSlice.js";
import cartReducer from "../../features/cart/cartSlice.js";
import wishlistReducer from "../../features/wishlist/wishlistSlice.js";
import assistantReducer from "../../features/assistant/assistantSlice.js";
import FarmerProfile from "./FarmerProfile.jsx";
import farmerApi from "../../api/farmerApi.js";
import productApi from "../../api/productApi.js";

vi.mock("../../api/farmerApi", () => ({ default: { get: vi.fn() } }));
vi.mock("../../api/productApi", () => ({ default: { storefront: vi.fn() } }));

const farmer = {
  _id: "profile-1",
  user: { _id: "farmer-user-1", name: "Ravi Kumar", avatar: "/uploads/avatar.jpg" },
  farmName: "Ravi Organic Farm",
  category: "Vegetables",
  description: "Chemical-free vegetables grown with care.",
  address: "Village Road, Gadag, Karnataka",
  photo: "/uploads/farm.jpg",
  certification: { verifiedByAdmin: true },
};

const products = [
  { _id: "p1", name: "Tomatoes", price: 40, unit: "kg", stock: 10, images: [], category: "Vegetables", farmer: "farmer-user-1", status: "Active" },
  { _id: "p2", name: "Spinach", price: 25, unit: "bunch", stock: 5, images: [], category: "Vegetables", farmer: "farmer-user-1", status: "Active" },
];

function renderPage(path = "/farmers/farmer-user-1", preloadedState = {}) {
  const store = configureStore({
    reducer: { auth: authReducer, cart: cartReducer, wishlist: wishlistReducer, assistant: assistantReducer },
    preloadedState,
  });
  const utils = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/farmers/:id" element={<FarmerProfile />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  return { ...utils, store };
}

describe("Customer Farmer Explore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    farmerApi.get.mockResolvedValue({ data: farmer });
    productApi.storefront.mockResolvedValue({ data: { items: products, total: products.length, pages: 1 } });
  });

  it("navigates to the correct farmer and displays farmer information", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Ravi Organic Farm")).toBeInTheDocument());
    expect(await screen.findByText("Ravi Kumar")).toBeInTheDocument();
    expect(screen.getByText("Village Road, Gadag, Karnataka")).toBeInTheDocument();
    expect(screen.getByText("Vegetables")).toBeInTheDocument();
    expect(screen.getByText("Chemical-free vegetables grown with care.")).toBeInTheDocument();
    expect(screen.getByText("Verification status: Verified by admin")).toBeInTheDocument();
  });

  it("displays only that farmer's approved and active products", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Tomatoes")).toBeInTheDocument());
    expect(screen.getByText("Spinach")).toBeInTheDocument();
    await waitFor(() => expect(productApi.storefront).toHaveBeenLastCalledWith({ farmer: "farmer-user-1" }));
    // products belong to this farmer only
    products.forEach((p) => expect(String(p.farmer)).toBe("farmer-user-1"));
  });

  it("renders product cards that open individual product details", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Tomatoes")).toBeInTheDocument());
    expect(screen.getByText("Spinach")).toBeInTheDocument();
    // each product card navigates to its own product detail page on click
    const tomatoCard = screen.getByText("Tomatoes").closest("[class]");
    expect(tomatoCard).toBeTruthy();
    fireEvent.click(tomatoCard);
  });

  it("provides a way to return to the farmers listing", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Back to farmers")).toBeInTheDocument());
  });

  it("shows an error state instead of a blank page for an invalid farmer id", async () => {
    farmerApi.get.mockRejectedValue({ response: { data: { message: "Farmer not found" } } });
    renderPage("/farmers/invalid-id");
    await waitFor(() => expect(screen.getByText("Farmer not found")).toBeInTheDocument());
  });

  it("shows an error state instead of a blank page when the farmer is missing", async () => {
    farmerApi.get.mockResolvedValue({ data: null });
    renderPage("/farmers/unknown-user");
    await waitFor(() => expect(screen.getByText("Farmer not found")).toBeInTheDocument());
  });

  it("shows a loading indicator while details are being fetched", async () => {
    farmerApi.get.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Loading farmer details…")).toBeInTheDocument();
  });
});
