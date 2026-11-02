import { screen, waitFor } from "@testing-library/react";
import { renderWithStore } from "../../tests/testUtils.jsx";
import Topbar from "./Topbar.jsx";

describe("Topbar profile photo", () => {
  it("resolves a saved farmer avatar path to the server upload URL", () => {
    renderWithStore(<Topbar />, {
      auth: {
        user: {
          _id: "farmer-1",
          name: "Green Farm",
          role: "farmer",
          avatar: "/uploads/avatars/farmer-profile.png",
        },
        token: null,
      },
      cart: { items: [] },
    });

    const avatar = document.querySelector('header img[alt=""]');
    expect(avatar).not.toBeNull();
    const apiOrigin = new URL(import.meta.env.VITE_API_URL || "http://localhost:5000/api").origin;
    expect(avatar).toHaveAttribute("src", `${apiOrigin}/uploads/avatars/farmer-profile.png`);
  });

  it("places farmer notifications and profile actions in the right-aligned header group", () => {
    renderWithStore(<Topbar />, {
      auth: {
        user: { _id: "farmer-1", name: "Green Farm", role: "farmer" },
        token: null,
      },
      cart: { items: [] },
    });

    expect(screen.getByRole("link", { name: "Notifications" })).toHaveAttribute("href", "/farmer/notifications");
    expect(screen.getByRole("link", { name: "Open profile" })).toHaveAttribute("href", "/farmer/profile");
    expect(screen.getByRole("link", { name: "Notifications" }).parentElement).toHaveClass("ml-auto");
  });

  it("shows customer cart in the header", () => {
    renderWithStore(<Topbar />, {
      auth: {
        user: { _id: "customer-1", name: "Customer", role: "customer" },
        token: null,
      },
      cart: {
        items: [
          { product: { _id: "product-1" }, quantity: 2 },
          { product: { _id: "product-2" }, quantity: 1 },
        ],
      },
    });

    expect(screen.getByRole("link", { name: "Cart, 3 items" })).toHaveClass("h-10", "w-10");
  });

  it("renders hamburger menu button on mobile header", () => {
    renderWithStore(<Topbar />, {
      auth: { user: null, token: null },
      cart: { items: [] },
    });

    expect(screen.getByRole("button", { name: "Open navigation menu" })).toBeInTheDocument();
  });
});
