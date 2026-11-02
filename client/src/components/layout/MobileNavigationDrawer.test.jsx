import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithStore } from "../../tests/testUtils.jsx";
import MobileNavigationDrawer from "./MobileNavigationDrawer.jsx";

describe("MobileNavigationDrawer", () => {
  it("renders guest navigation when not authenticated", () => {
    renderWithStore(
      <MobileNavigationDrawer open onClose={() => {}} id="test-drawer" label="Test drawer" drawerRef={null} />,
      {
        auth: { user: null, token: null },
        cart: { items: [] },
      },
    );

    expect(screen.getByRole("dialog", { name: "Test drawer" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Shop" })).toHaveAttribute("href", "/shop");
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Register" })).toHaveAttribute("href", "/register");
  });

  it("renders customer navigation with dashboard, shop, orders, cart, profile, logout", () => {
    renderWithStore(
      <MobileNavigationDrawer open onClose={() => {}} id="test-drawer" label="Customer drawer" drawerRef={null} />,
      {
        auth: { user: { _id: "cust-1", name: "Test Customer", role: "customer" }, token: "abc123" },
        cart: { items: [] },
      },
    );

    expect(screen.getByRole("dialog", { name: "Customer drawer" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Shop" })).toHaveAttribute("href", "/shop");
    expect(screen.getByRole("link", { name: "Offers" })).toHaveAttribute("href", "/shop?offers=true");
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "Farmers" })).toHaveAttribute("href", "/farmers");
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("button", { name: /Logout/ })).toBeInTheDocument();
  });

  it("renders farmer navigation with dashboard, products, inventory, orders, offers, profile, logout", () => {
    renderWithStore(
      <MobileNavigationDrawer open onClose={() => {}} id="test-drawer" label="Farmer drawer" drawerRef={null} />,
      {
        auth: { user: { _id: "farm-1", name: "Test Farmer", role: "farmer" }, token: "abc123" },
        cart: { items: [] },
      },
    );

    expect(screen.getByRole("dialog", { name: "Farmer drawer" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Farmer Dashboard" })).toHaveAttribute("href", "/farmer/dashboard");
    expect(screen.getByRole("link", { name: "My Products" })).toHaveAttribute("href", "/farmer/products");
    expect(screen.getByRole("link", { name: "Add Product" })).toHaveAttribute("href", "/farmer/products/new");
    expect(screen.getByRole("link", { name: "Inventory" })).toHaveAttribute("href", "/farmer/inventory-management");
    expect(screen.getByRole("link", { name: "My Orders" })).toHaveAttribute("href", "/farmer/orders");
    expect(screen.getByRole("link", { name: "My Offers" })).toHaveAttribute("href", "/farmer/offers");
    expect(screen.getByRole("link", { name: "Farm Details" })).toHaveAttribute("href", "/farmer/profile");
    expect(screen.getByRole("link", { name: "Notifications" })).toHaveAttribute("href", "/farmer/notifications");
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/farmer/profile");
    expect(screen.getByRole("button", { name: /Logout/ })).toBeInTheDocument();
  });

  it("renders admin navigation with dashboard, products, orders, users, farmers, inventory, offers, reports, notifications, settings, logout", () => {
    renderWithStore(
      <MobileNavigationDrawer open onClose={() => {}} id="test-drawer" label="Admin drawer" drawerRef={null} />,
      {
        auth: { user: { _id: "adm-1", name: "Test Admin", role: "admin" }, token: "abc123" },
        cart: { items: [] },
      },
    );

    expect(screen.getByRole("dialog", { name: "Admin drawer" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin Dashboard" })).toHaveAttribute("href", "/admin/dashboard");
    expect(screen.getByRole("link", { name: "Products Management" })).toHaveAttribute("href", "/admin/products");
    expect(screen.getByRole("link", { name: "Orders Management" })).toHaveAttribute("href", "/admin/orders");
    expect(screen.getByRole("link", { name: "Users Management" })).toHaveAttribute("href", "/admin/users");
    expect(screen.getByRole("link", { name: "Farmer Management" })).toHaveAttribute("href", "/admin/farmers");
    expect(screen.getByRole("link", { name: "Inventory Management" })).toHaveAttribute("href", "/admin/inventory");
    expect(screen.getByRole("link", { name: "Offers Management" })).toHaveAttribute("href", "/admin/offers");
    expect(screen.getByRole("link", { name: "Reports and Analytics" })).toHaveAttribute("href", "/admin/reports");
    expect(screen.getByRole("link", { name: "Notifications" })).toHaveAttribute("href", "/admin/notifications");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/admin/settings");
    expect(screen.getByRole("button", { name: /Logout/ })).toBeInTheDocument();
  });

  it("does not show role-specific links for other roles", () => {
    renderWithStore(
      <MobileNavigationDrawer open onClose={() => {}} id="test-drawer" label="Customer drawer" drawerRef={null} />,
      {
        auth: { user: { _id: "cust-1", name: "Test Customer", role: "customer" }, token: "abc123" },
        cart: { items: [] },
      },
    );

    expect(screen.queryByRole("link", { name: "Admin Dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Farmer Dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Products Management" })).not.toBeInTheDocument();
  });

  it("displays user name, avatar placeholder, and role when authenticated", () => {
    renderWithStore(
      <MobileNavigationDrawer open onClose={() => {}} id="test-drawer" label="Farmer drawer" drawerRef={null} />,
      {
        auth: { user: { _id: "farm-1", name: "Green Farm", role: "farmer" }, token: "abc123" },
        cart: { items: [] },
      },
    );

    expect(screen.getByText("Green Farm")).toBeInTheDocument();
    expect(screen.getByText("Farmer")).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", () => {
    const onCloseMock = vi.fn();
    renderWithStore(
      <MobileNavigationDrawer open onClose={onCloseMock} id="test-drawer" label="Test drawer" drawerRef={null} />,
      { auth: { user: null, token: null }, cart: { items: [] } },
    );

    expect(screen.getByRole("dialog", { name: "Test drawer" })).toBeInTheDocument();

    const closeButton = screen.getByRole("button", { name: "Close navigation" });
    fireEvent.click(closeButton);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
