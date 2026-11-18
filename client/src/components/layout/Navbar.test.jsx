import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { Provider } from "react-redux";
import { createStore, renderWithStore } from "../../tests/testUtils.jsx";
import Navbar from "./Navbar.jsx";

function CurrentPath() {
  return <div data-testid="current-path">{useLocation().pathname}</div>;
}

const guestState = { auth: { user: null, token: null }, cart: { items: [] } };
const customerState = {
  auth: { user: { _id: "customer-1", name: "Customer", role: "customer" }, token: "abc123" },
  cart: { items: [] },
};

function renderWithRouter(ui, preloadedState = guestState) {
  const store = createStore(preloadedState);
  const utils = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/"]}>
        {ui}
      </MemoryRouter>
    </Provider>
  );
  return { ...utils, store };
}

describe("Navbar", () => {
  it("renders without crashing", () => {
    renderWithStore(<Navbar />, guestState);

    expect(screen.getByPlaceholderText("Search products...")).toBeInTheDocument();
    expect(document.querySelector('a[href="/cart"]')).toBeInTheDocument();
  });

  it("renders hamburger menu button on mobile", () => {
    renderWithStore(<Navbar />, guestState);

    expect(screen.getByRole("button", { name: "Open navigation menu" })).toBeInTheDocument();
  });

  it("renders the GreenMart logo on the left of the header", () => {
    renderWithStore(<Navbar />, guestState);

    expect(screen.getByAltText("GreenMart — Organic Products E-Commerce Platform")).toBeInTheDocument();
  });

  it("renders the Wishlist icon in the mobile header", () => {
    renderWithStore(<Navbar />, guestState);

    const wishlist = screen.getByRole("link", { name: "Wishlist" });
    expect(wishlist).toBeInTheDocument();
    expect(wishlist).toHaveAttribute("href", "/customer/wishlist");
    expect(wishlist).toHaveAttribute("title", "Wishlist");
  });

  it("keeps the Wishlist icon visible on desktop", () => {
    renderWithStore(<Navbar />, guestState);

    expect(screen.getByRole("link", { name: "Wishlist" })).toBeInTheDocument();
    expect(screen.queryAllByRole("link", { name: "Wishlist" })).toHaveLength(1);
  });

  it("navigates to the Wishlist page when the Wishlist icon is clicked", () => {
    renderWithRouter(
      <>
        <CurrentPath />
        <Routes>
          <Route path="/" element={<Navbar />} />
          <Route path="/customer/wishlist" element={<div data-testid="wishlist-page">Wishlist page</div>} />
        </Routes>
      </>
    );

    fireEvent.click(screen.getByRole("link", { name: "Wishlist" }));

    expect(screen.getByTestId("current-path")).toHaveTextContent("/customer/wishlist");
    expect(screen.getByTestId("wishlist-page")).toBeInTheDocument();
  });

  it("renders the cart icon with its item-count badge", () => {
    renderWithStore(<Navbar />, {
      auth: { user: null, token: null },
      cart: { items: [{ product: { _id: "product-1" }, quantity: 2 }] },
    });

    const cart = document.querySelector('a[href="/cart"]');
    expect(cart).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("redirects a guest to the Login page when the cart icon is clicked", () => {
    renderWithRouter(
      <>
        <CurrentPath />
        <Routes>
          <Route path="/" element={<Navbar />} />
          <Route path="/cart" element={<div data-testid="cart-page">Cart page</div>} />
          <Route path="/login" element={<div data-testid="login-page">Login page</div>} />
        </Routes>
      </>,
      guestState
    );

    fireEvent.click(document.querySelector('a[href="/cart"]'));

    expect(screen.getByTestId("current-path")).toHaveTextContent("/login");
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
    expect(screen.queryByTestId("cart-page")).not.toBeInTheDocument();
  });

  it("navigates an authenticated customer to the cart when the cart icon is clicked", () => {
    renderWithRouter(
      <>
        <CurrentPath />
        <Routes>
          <Route path="/" element={<Navbar />} />
          <Route path="/cart" element={<div data-testid="cart-page">Cart page</div>} />
          <Route path="/login" element={<div data-testid="login-page">Login page</div>} />
        </Routes>
      </>,
      customerState
    );

    fireEvent.click(document.querySelector('a[href="/cart"]'));

    expect(screen.getByTestId("current-path")).toHaveTextContent("/cart");
    expect(screen.getByTestId("cart-page")).toBeInTheDocument();
    expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
  });

  it("renders cart and profile icons alongside the Wishlist icon", () => {
    renderWithStore(<Navbar />, customerState);

    expect(screen.getByRole("button", { name: "Open navigation menu" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Wishlist" })).toBeInTheDocument();
    expect(document.querySelector('a[href="/cart"]')).toBeInTheDocument();
  });

  it("keeps logo, hamburger, Wishlist, cart and profile present together without responsive hiding", () => {
    renderWithStore(<Navbar />, {
      auth: { user: { _id: "customer-1", name: "Customer", role: "customer" }, token: null },
      cart: { items: [{ product: { _id: "product-1" }, quantity: 3 }] },
    });

    expect(screen.getByAltText("GreenMart — Organic Products E-Commerce Platform")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open navigation menu" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Wishlist" })).toBeInTheDocument();
    expect(document.querySelector('a[href="/cart"]')).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
