import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProductIdentifier from "./ProductIdentifier.jsx";
import toast from "react-hot-toast";

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const productId = "672a8f1234567890abcdef12";

describe("ProductIdentifier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("shortens the displayed ID while copying the complete identifier", async () => {
    render(<ProductIdentifier productId={{ _id: productId }} compact />);

    expect(screen.getByText("Product ID: 672a8f...ef12")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy Product ID" }));

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(productId));
    expect(toast.success).toHaveBeenCalledWith("Product ID copied.");
  });

  it("reports clipboard failures without throwing", async () => {
    navigator.clipboard.writeText.mockRejectedValueOnce(new Error("denied"));
    render(<ProductIdentifier productId={productId} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy Product ID" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't copy the Product ID."));
  });
});
