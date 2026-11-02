import React from "react";
import { screen } from "@testing-library/react";
import { renderWithStore } from "../../tests/testUtils.jsx";
import Navbar from "./Navbar.jsx";

describe("Navbar", () => {
  it("renders without crashing", () => {
    renderWithStore(<Navbar />, {
      auth: { user: null, token: null },
      cart: { items: [] },
    });

    expect(screen.getByPlaceholderText("Search products...")).toBeInTheDocument();
    expect(document.querySelector('a[href="/cart"]')).toBeInTheDocument();
  });

  it("renders hamburger menu button on mobile", () => {
    renderWithStore(<Navbar />, {
      auth: { user: null, token: null },
      cart: { items: [] },
    });

    expect(screen.getByRole("button", { name: "Open navigation menu" })).toBeInTheDocument();
  });
});
