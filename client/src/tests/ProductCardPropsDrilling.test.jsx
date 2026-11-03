import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ProductCard from "../components/admin/ProductCard.jsx";
import ProductList from "../components/admin/ProductList.jsx";
import ProductManagementSection from "../components/admin/ProductManagementSection.jsx";

const sampleProduct = {
  _id: "prod-1",
  name: "Organic Tomatoes",
  category: "Vegetables",
  price: 40,
  stock: 28,
  status: "Active",
  images: ["https://example.com/tomato.jpg"],
  farmer: { name: "Green Farm" },
};

describe("ProductCard props drilling", () => {
  it("displays product data from props", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<ProductCard product={sampleProduct} onEdit={onEdit} onDelete={onDelete} isLoading={false} />);
    expect(screen.getByText("Organic Tomatoes")).toBeInTheDocument();
    expect(screen.getByText("Vegetables")).toBeInTheDocument();
    expect(screen.getByText("₹40")).toBeInTheDocument();
    expect(screen.getByText("28")).toBeInTheDocument();
  });

  it("invokes onEdit callback when Edit button is clicked", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<ProductCard product={sampleProduct} onEdit={onEdit} onDelete={onDelete} isLoading={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Edit Organic Tomatoes/i }));
    expect(onEdit).toHaveBeenCalledWith(sampleProduct);
  });

  it("invokes onDelete callback when Delete button is clicked", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<ProductCard product={sampleProduct} onEdit={onEdit} onDelete={onDelete} isLoading={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Delete Organic Tomatoes/i }));
    expect(onDelete).toHaveBeenCalledWith(sampleProduct);
  });

  it("disables buttons when isLoading is true", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<ProductCard product={sampleProduct} onEdit={onEdit} onDelete={onDelete} isLoading={true} />);
    expect(screen.getByRole("button", { name: /Edit Organic Tomatoes/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Delete Organic Tomatoes/i })).toBeDisabled();
  });
});

describe("ProductList props drilling", () => {
  it("renders ProductCard for each product", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<ProductList products={[sampleProduct, { ...sampleProduct, _id: "prod-2", name: "Carrots" }]} onEdit={onEdit} onDelete={onDelete} isLoading={false} />);
    expect(screen.getByText("Organic Tomatoes")).toBeInTheDocument();
    expect(screen.getByText("Carrots")).toBeInTheDocument();
  });

  it("shows empty state when no products", () => {
    render(<ProductList products={[]} onEdit={vi.fn()} onDelete={vi.fn()} isLoading={false} />);
    expect(screen.getByText("No products match these filters.")).toBeInTheDocument();
  });
});

describe("ProductManagementSection props drilling", () => {
  it("passes products and handlers through to ProductList", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<ProductManagementSection products={[sampleProduct]} onEdit={onEdit} onDelete={onDelete} isLoading={false} />);
    expect(screen.getByText("Organic Tomatoes")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Edit Organic Tomatoes/i }));
    expect(onEdit).toHaveBeenCalledWith(sampleProduct);
  });
});
