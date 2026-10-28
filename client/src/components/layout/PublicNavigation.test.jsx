import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import PublicNavigation from "./PublicNavigation.jsx";

function CurrentPath() {
  return <div data-testid="current-path">{useLocation().pathname}</div>;
}

describe("PublicNavigation", () => {
  it("keeps Home, Shop, Farmers, and Contact available and navigates to Shop directly", () => {
    render(
      <MemoryRouter initialEntries={["/customer/dashboard"]}>
        <PublicNavigation />
        <CurrentPath />
        <Routes>
          <Route path="/customer/dashboard" element={<p>Customer Dashboard</p>} />
          <Route path="/shop" element={<p>Shop catalogue</p>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Farmers" })).toHaveAttribute("href", "/farmers");
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Shop" }));

    expect(screen.getByText("Shop catalogue")).toBeInTheDocument();
    expect(screen.getByTestId("current-path")).toHaveTextContent("/shop");
  });

  it("highlights the active nested route", () => {
    render(
      <MemoryRouter initialEntries={["/farmers/farmer-123"]}>
        <PublicNavigation />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "Farmers" })).toHaveAttribute("aria-current", "page");
  });
});
