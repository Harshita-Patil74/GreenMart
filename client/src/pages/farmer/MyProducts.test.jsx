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

describe("Farmer My Products deleted filter", () => {
  let wasRestored;

  beforeEach(() => {
    vi.clearAllMocks();
    wasRestored = false;
    productApi.mine.mockImplementation(() => ({
      data: {
        items: [
          activeProduct,
          wasRestored ? { ...deletedProduct, isDeleted: false } : deletedProduct,
          unrelatedStatusProduct,
        ],
        total: 3,
        pages: 1,
      },
    }));
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
});
