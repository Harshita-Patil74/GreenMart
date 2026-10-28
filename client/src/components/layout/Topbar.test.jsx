import { screen } from "@testing-library/react";
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

    const avatar = document.querySelector("header img");
    expect(avatar).not.toBeNull();
    const apiOrigin = new URL(import.meta.env.VITE_API_URL || "http://localhost:5000/api").origin;
    expect(avatar).toHaveAttribute("src", `${apiOrigin}/uploads/avatars/farmer-profile.png`);
  });
});
