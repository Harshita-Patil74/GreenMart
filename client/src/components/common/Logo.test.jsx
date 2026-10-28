import { render, screen } from "@testing-library/react";
import Logo from "./Logo.jsx";

describe("GreenMart logo", () => {
  it("uses the supplied full logo and tagline in brand areas", () => {
    render(<Logo to={null} />);

    expect(screen.getByRole("img", { name: "GreenMart — Organic Products E-Commerce Platform" }))
      .toHaveAttribute("src", "/images/greenmart-logo.png");
  });

  it("uses the compact crop in constrained header areas", () => {
    render(<Logo to={null} subtitle={false} size="sm" />);

    expect(screen.getByRole("img", { name: "GreenMart — Organic Products E-Commerce Platform" }))
      .toHaveAttribute("src", "/images/greenmart-logo-compact.png");
    expect(screen.getByRole("img")).toHaveClass("w-[132px]");
  });

  it("uses the supplied leafy logo on a green dashboard brand background", () => {
    render(<Logo dashboard to={null} />);

    expect(screen.getByRole("img", { name: "GreenMart — Organic Products E-Commerce Platform" }))
      .toHaveAttribute("src", "/images/greenmart-dashboard-logo.png");
    expect(screen.getByRole("img").parentElement).not.toHaveClass("bg-[#E5F1D4]");
  });
});
