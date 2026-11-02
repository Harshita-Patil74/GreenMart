import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RoleNavigation from "./RoleNavigation.jsx";

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
    render(
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
  });
});
