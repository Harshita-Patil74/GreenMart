import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import categoryApi from "../../api/categoryApi.js";
import Footer from "./Footer.jsx";

function renderFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  );
}

describe("GreenMart footer", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows the official brand and links only to existing public, customer, farmer, and admin routes", async () => {
    vi.spyOn(categoryApi, "list").mockResolvedValueOnce({
      data: [{ _id: "category-1", name: "Vegetables" }],
    });
    renderFooter();

    expect(screen.getByRole("img", { name: "GreenMart — Organic Products E-Commerce Platform" }))
      .toHaveAttribute("src", "/images/greenmart-logo.png");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Shop" })).toHaveAttribute("href", "/shop");
    expect(screen.getByRole("link", { name: "About Us" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "Contact Us" })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: "My Account" })).toHaveAttribute("href", "/customer/dashboard");
    expect(screen.getByRole("link", { name: "My Orders" })).toHaveAttribute("href", "/customer/orders");
    expect(screen.getByRole("link", { name: "Track Order" })).toHaveAttribute("href", "/track-order");
    expect(screen.getByRole("link", { name: "Farmer Login" })).toHaveAttribute("href", "/login?role=farmer");
    expect(screen.getByRole("link", { name: "Become a Farmer" })).toHaveAttribute("href", "/register?role=farmer");
    expect(screen.getByRole("link", { name: "Admin Login" })).toHaveAttribute("href", "/admin/login");
    expect(screen.getByRole("link", { name: "Manage Users" })).toHaveAttribute("href", "/admin/users");
    expect(screen.getByRole("link", { name: "Reports" })).toHaveAttribute("href", "/admin/reports");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/admin/settings");
    expect(await screen.findByRole("link", { name: "Vegetables" })).toHaveAttribute("href", "/shop?category=Vegetables");
    expect(screen.getByRole("link", { name: "support@greenmart.org" })).toHaveAttribute("href", "mailto:support@greenmart.org");
    expect(screen.getByRole("link", { name: /\+91 96118 43210/ })).toHaveAttribute("href", "tel:+919611843210");
    expect(screen.getByText(/Go Green/)).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toHaveClass("bg-[#B7D9BC]");
    expect(screen.queryByRole("link", { name: /blog|faq|return|refund|payment|privacy|terms|guidelines/i })).not.toBeInTheDocument();
  });

  it("shows a clear message if configured categories cannot be loaded", async () => {
    vi.spyOn(categoryApi, "list").mockRejectedValueOnce(new Error("API unavailable"));
    renderFooter();

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Categories are temporarily unavailable."));
  });
});
