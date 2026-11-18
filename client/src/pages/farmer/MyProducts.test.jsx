import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { createStore, renderWithStore } from "../../tests/testUtils.jsx";
import MyProducts from "./MyProducts.jsx";

vi.mock("../../api/productApi", () => ({
  default: {
    mine: vi.fn(),
    restore: vi.fn(),
    restoreAll: vi.fn(),
    remove: vi.fn(),
    update: vi.fn(),
  },
}));

import productApi from "../../api/productApi";

const activeProduct = {
  _id: "active-id",
  name: "Organic Mango",
  category: "Fruits",
  price: 20,
  stock: 5,
  status: "Active",
  isDeleted: false,
};

const deletedProduct = {
  _id: "deleted-id",
  name: "Fresh Coconut",
  category: "Fruits",
  price: 30,
  stock: 4,
  status: "Inactive",
  isDeleted: true,
};

const unrelatedStatusProduct = {
  _id: "pending-id",
  name: "Natural Honey",
  category: "Others",
  price: 45,
  stock: 3,
  status: "Pending",
  isDeleted: false,
};

const deletedActiveProduct = {
  _id: "deleted-active-id",
  name: "Rotten Cabbage",
  category: "Vegetables",
  price: 15,
  stock: 0,
  status: "Active",
  isDeleted: true,
};

const inactiveProduct = {
  _id: "inactive-id",
  name: "Wilted Lettuce",
  category: "Vegetables",
  price: 10,
  stock: 2,
  status: "Inactive",
  isDeleted: false,
};

describe("Farmer My Products deleted filter", () => {
  let wasRestored;

  beforeEach(() => {
    vi.clearAllMocks();
    wasRestored = false;
    productApi.mine.mockImplementation((params) => {
      const deletedOnly = params.showDeleted === "true";
      const items = [
        activeProduct,
        inactiveProduct,
        wasRestored ? { ...deletedProduct, isDeleted: false } : deletedProduct,
        deletedActiveProduct,
        unrelatedStatusProduct,
      ].filter((product) => (deletedOnly ? product.isDeleted === true : product.isDeleted !== true));
      return {
        data: { items, total: items.length, pages: 1 },
      };
    });
    productApi.restore.mockImplementation(() => {
      wasRestored = true;
      return Promise.resolve({ data: { message: "Restored" } });
    });
  });

  it("shows only explicitly deleted products and restores them out of the deleted list", async () => {
    renderWithStore(<MyProducts />);

    expect(await screen.findByText("Organic Mango")).toBeInTheDocument();
    expect(screen.getByText("Natural Honey")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /Show deleted products/i }));

    const deletedRow = await screen.findByRole("row", { name: /Fresh Coconut/ });
    expect(deletedRow).toBeInTheDocument();
    expect(screen.queryByText("Organic Mango")).not.toBeInTheDocument();
    expect(screen.queryByText("Natural Honey")).not.toBeInTheDocument();
    expect(productApi.mine).toHaveBeenLastCalledWith(expect.objectContaining({ showDeleted: "true" }));

    fireEvent.click(within(deletedRow).getByRole("button", { name: "Actions for Fresh Coconut" }));
    fireEvent.click(screen.getByRole("button", { name: /Restore product/i }));

    await waitFor(() => expect(screen.queryByText("Fresh Coconut")).not.toBeInTheDocument());
    expect(productApi.restore).toHaveBeenCalledWith("deleted-id");

    fireEvent.click(screen.getByRole("checkbox", { name: /Show deleted products/i }));
    expect(await screen.findByText("Organic Mango")).toBeInTheDocument();
    expect(screen.getByText("Fresh Coconut")).toBeInTheDocument();
    expect(screen.getByText("Natural Honey")).toBeInTheDocument();
    expect(productApi.mine).toHaveBeenLastCalledWith(expect.objectContaining({ showDeleted: undefined }));
  });

  it("keeps the previous view from being replaced by an older pending response", async () => {
    let resolveOriginal;
    productApi.mine.mockImplementation((params) => {
      if (params.showDeleted) {
        return Promise.resolve({
          data: { items: [deletedProduct], total: 1, pages: 1 },
        });
      }
      return new Promise((resolve) => { resolveOriginal = resolve; });
    });

    renderWithStore(<MyProducts />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Show deleted products/i }));
    expect(await screen.findByText("Fresh Coconut")).toBeInTheDocument();
    resolveOriginal({ data: { items: [activeProduct], total: 1, pages: 1 } });

    await waitFor(() => expect(screen.getByText("Fresh Coconut")).toBeInTheDocument());
    expect(screen.queryByText("Organic Mango")).not.toBeInTheDocument();
  });

  it("uses a product search passed from a notification link", async () => {
    render(
      <Provider store={createStore()}>
        <MemoryRouter initialEntries={["/farmer/products?search=active-id"]}>
          <MyProducts />
        </MemoryRouter>
      </Provider>
    );

    expect(await screen.findByText("Organic Mango")).toBeInTheDocument();
    await waitFor(() => expect(productApi.mine).toHaveBeenCalledWith(expect.objectContaining({ search: "active-id" })));
  });

  it("searches within the deleted-only dataset", async () => {
    productApi.mine.mockImplementation((params) => {
      const all = [activeProduct, deletedProduct, unrelatedStatusProduct];
      let items = all.filter((p) => (params.showDeleted === "true" ? p.isDeleted === true : p.isDeleted !== true));
      const search = String(params.search || "").toLowerCase();
      if (search) items = items.filter((p) => p.name.toLowerCase().includes(search));
      return { data: { items, total: items.length, pages: 1 } };
    });

    renderWithStore(<MyProducts />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Show deleted products/i }));
    await screen.findByText("Fresh Coconut");

    const searchInput = screen.getByPlaceholderText(/Search products by name, ID, category, or description/i);
    fireEvent.change(searchInput, { target: { value: "coconut" } });
    await waitFor(() => expect(productApi.mine).toHaveBeenLastCalledWith(expect.objectContaining({ showDeleted: "true", search: "coconut" })));
    expect(await screen.findByText("Fresh Coconut")).toBeInTheDocument();
    expect(screen.queryByText("Organic Mango")).not.toBeInTheDocument();
  });

  it("keeps category and status filters inside the deleted-only dataset", async () => {
    productApi.mine.mockImplementation((params) => {
      let items = [activeProduct, deletedProduct, unrelatedStatusProduct].filter(
        (p) => (params.showDeleted === "true" ? p.isDeleted === true : p.isDeleted !== true)
      );
      if (params.category && params.category !== "All Categories") items = items.filter((p) => p.category === params.category);
      if (params.status && params.status !== "All Status") items = items.filter((p) => p.status === params.status);
      return { data: { items, total: items.length, pages: 1 } };
    });

    renderWithStore(<MyProducts />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Show deleted products/i }));
    await screen.findByText("Fresh Coconut");

    const statusSelect = screen.getByLabelText(/Filter by status/i);
    fireEvent.change(statusSelect, { target: { value: "Inactive" } });
    await waitFor(() => expect(productApi.mine).toHaveBeenLastCalledWith(expect.objectContaining({ showDeleted: "true", status: "Inactive" })));
    expect(await screen.findByText("Fresh Coconut")).toBeInTheDocument();

    const categorySelect = screen.getByLabelText(/Filter by category/i);
    fireEvent.change(categorySelect, { target: { value: "Fruits" } });
    await waitFor(() => expect(productApi.mine).toHaveBeenLastCalledWith(expect.objectContaining({ showDeleted: "true", category: "Fruits", status: "Inactive" })));
    expect(screen.getByText("Fresh Coconut")).toBeInTheDocument();
  });

  it("resets pagination to page 1 when the deleted filter is toggled", async () => {
    const active = Array.from({ length: 15 }, (_, i) => ({
      _id: `active-${i}`, name: `Active Product ${i}`, category: "Fruits", status: "Active", isDeleted: false,
    }));
    const deleted = Array.from({ length: 3 }, (_, i) => ({
      _id: `deleted-${i}`, name: `Deleted Product ${i}`, category: "Fruits", status: "Inactive", isDeleted: true,
    }));
    productApi.mine.mockImplementation((params) => {
      const deletedOnly = params.showDeleted === "true";
      const items = [...active, ...deleted].filter((p) => (deletedOnly ? p.isDeleted === true : p.isDeleted !== true));
      const page = Math.max(1, Number(params.page || 1));
      const limit = Math.max(1, Number(params.limit || 10));
      const paged = items.slice((page - 1) * limit, page * limit);
      return { data: { items: paged, total: items.length, pages: Math.ceil(items.length / limit) } };
    });

    renderWithStore(<MyProducts />);
    await screen.findByText("Active Product 0");

    fireEvent.click(screen.getByText("2"));
    await waitFor(() => expect(productApi.mine).toHaveBeenLastCalledWith(expect.objectContaining({ showDeleted: undefined, page: 2 })));

    fireEvent.click(screen.getByRole("checkbox", { name: /Show deleted products/i }));
    await waitFor(() => expect(productApi.mine).toHaveBeenLastCalledWith(expect.objectContaining({ showDeleted: "true", page: 1 })));
    expect(await screen.findByText("Deleted Product 0")).toBeInTheDocument();
    expect(screen.queryByText("Active Product 0")).not.toBeInTheDocument();
  });

  it("displays only Deleted badge for a deleted Active product", async () => {
    renderWithStore(<MyProducts />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Show deleted products/i }));

    const deletedRow = await screen.findByRole("row", { name: /Rotten Cabbage/ });
    expect(deletedRow).toBeInTheDocument();
    expect(deletedRow).toHaveTextContent("Deleted");
  });

  it("displays only Deleted badge for a deleted Inactive product", async () => {
    renderWithStore(<MyProducts />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Show deleted products/i }));

    const deletedRow = await screen.findByRole("row", { name: /Fresh Coconut/ });
    expect(deletedRow).toBeInTheDocument();
    expect(deletedRow).toHaveTextContent("Deleted");
  });

  it("does not display Deleted badge for a non-deleted Active product", async () => {
    renderWithStore(<MyProducts />);

    const activeRow = await screen.findByRole("row", { name: /Organic Mango/ });
    expect(activeRow).toBeInTheDocument();
    expect(activeRow).not.toHaveTextContent(/Deleted/i);
  });

  it("does not display Deleted badge for a non-deleted Inactive product", async () => {
    renderWithStore(<MyProducts />);

    const inactiveRow = await screen.findByRole("row", { name: /Wilted Lettuce/ });
    expect(inactiveRow).toBeInTheDocument();
    expect(inactiveRow).not.toHaveTextContent(/Deleted/i);
  });

  it("restores a deleted product back to its normal status badge", async () => {
    renderWithStore(<MyProducts />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Show deleted products/i }));

    const deletedRow = await screen.findByRole("row", { name: /Fresh Coconut/ });
    expect(deletedRow).toHaveTextContent("Deleted");

    fireEvent.click(within(deletedRow).getByRole("button", { name: "Actions for Fresh Coconut" }));
    fireEvent.click(screen.getByRole("button", { name: /Restore product/i }));

    await waitFor(() => expect(screen.queryByText("Fresh Coconut")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("checkbox", { name: /Show deleted products/i }));
    const restoredRow = await screen.findByRole("row", { name: /Fresh Coconut/ });
    expect(restoredRow).toBeInTheDocument();
    expect(restoredRow).toHaveTextContent("Inactive");
    expect(within(restoredRow).queryByRole("button", { name: /Restore product/i })).not.toBeInTheDocument();
    expect(within(restoredRow).queryAllByText("Deleted")).toHaveLength(0);
  });
});
