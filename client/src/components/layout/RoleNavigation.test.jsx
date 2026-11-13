import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import RoleNavigation from "./RoleNavigation.jsx";

function NavigationHistory() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      <button type="button" onClick={() => navigate("/farmer/products/new")}>Open Add Product</button>
      <button type="button" onClick={() => navigate(-1)}>Back</button>
      <button type="button" onClick={() => navigate(1)}>Forward</button>
      <output data-testid="current-path">{location.pathname}</output>
      <RoleNavigation role="farmer" />
    </>
  );
}

describe("RoleNavigation", () => {
  it("limits guest navigation to public routes and marks the active offer filter", () => {
    render(
      <MemoryRouter initialEntries={["/shop?offers=true"]}>
        <RoleNavigation role="guest" />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Offers" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("link", { name: "Admin Dashboard" })).not.toBeInTheDocument();
  });

  it("shows admin routes and highlights the current admin page", () => {
    render(
      <MemoryRouter initialEntries={["/admin/offers"]}>
        <RoleNavigation role="admin" />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "Offers Management" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Farmers" })).toHaveAttribute("href", "/admin/farmers");
    expect(screen.queryByRole("link", { name: "Register" })).not.toBeInTheDocument();
  });

  it("shows customer tools without exposing farmer or admin management routes", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/customer/orders"]}>
        <RoleNavigation role="customer" />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "Customer Dashboard" })).toHaveAttribute("href", "/customer/dashboard");
    expect(screen.getByRole("link", { name: "My Orders" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Notifications" })).toHaveAttribute("href", "/notifications");
    expect(screen.getByRole("link", { name: "Cart" })).toHaveAttribute("href", "/cart");
    expect(screen.queryByRole("link", { name: "My Offers" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Admin Dashboard" })).not.toBeInTheDocument();
    const shopLink = screen.getByRole("link", { name: "Shop" });
    const offersLink = screen.getByRole("link", { name: "Offers" });
    expect(shopLink).toHaveAttribute("href", "/shop");
    expect(offersLink).toHaveAttribute("href", "/customer/offers");
    expect(shopLink).toHaveClass("w-full", "h-11", "items-center", "justify-start", "gap-3", "px-3");
    expect(offersLink).toHaveClass("w-full", "h-11", "items-center", "justify-start", "gap-3", "px-3");
    expect(shopLink.querySelector("span")).toHaveClass("h-[18px]", "w-[18px]", "items-center", "justify-center");
    expect(offersLink.querySelector("span")).toHaveClass("h-[18px]", "w-[18px]", "items-center", "justify-center");
  });

  it.each([
    ["/shop", "Shop"],
    ["/customer/offers", "Offers"],
  ])("aligns and highlights the %s navigation link at %s", (path, activeLabel) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <RoleNavigation role="customer" />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: activeLabel })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: activeLabel })).toHaveClass("h-11", "w-full", "justify-start");
  });

  it.each([
    ["/farmer/products/new", "Add Product"],
    ["/farmer/products/new/", "Add Product"],
    ["/farmer/products?view=all", "My Products"],
    ["/farmer/dashboard", "Farmer Dashboard"],
    ["/farmer/orders", "Orders"],
    ["/farmer/inventory-management/adjustments", "Inventory"],
  ])("highlights only the most specific farmer link at %s", (path, activeLabel) => {
    const { container } = render(
      <MemoryRouter initialEntries={[path]}>
        <RoleNavigation role="farmer" />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: activeLabel })).toHaveAttribute("aria-current", "page");
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    if (activeLabel === "Add Product") {
      expect(screen.getByRole("link", { name: "My Products" })).not.toHaveAttribute("aria-current", "page");
    }
  });

  it("updates the active farmer link during navigation and browser history changes", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/farmer/products"]}>
        <NavigationHistory />
      </MemoryRouter>
    );
    const expectOnlyActive = (label) => {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
      expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    };

    expectOnlyActive("My Products");
    fireEvent.click(screen.getByRole("button", { name: "Open Add Product" }));
    expectOnlyActive("Add Product");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expectOnlyActive("My Products");
    fireEvent.click(screen.getByRole("button", { name: "Forward" }));
    expectOnlyActive("Add Product");
  });
});
