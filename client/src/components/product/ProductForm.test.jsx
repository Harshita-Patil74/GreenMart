import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { Provider } from "react-redux";
import { createStore } from "../../tests/testUtils.jsx";
import ProductForm from "./ProductForm.jsx";
import categoryApi from "../../api/categoryApi";

vi.mock("../../api/categoryApi", () => ({
  default: { list: vi.fn().mockResolvedValue({ data: [{ _id: "c-1", name: "Fruits", isActive: true }] }) },
}));

const onSubmit = vi.fn();

function renderForm(initial) {
  return render(
    <Provider store={createStore({ auth: { user: null, token: null }, cart: { items: [] } })}>
      <ProductForm initial={initial} onSubmit={onSubmit} />
    </Provider>
  );
}

async function renderFormReady(initial) {
  renderForm(initial);
  await waitFor(() => {
    expect(comboboxes()[0]).not.toBeDisabled();
  });
  act(() => {
    fireEvent.change(comboboxes()[0], { target: { value: "Fruits" } });
  });
}

function spinbuttons() {
  return screen.getAllByRole("spinbutton");
}

function textboxes() {
  return screen.getAllByRole("textbox");
}

function comboboxes() {
  return screen.getAllByRole("combobox");
}

const baseProduct = (overrides = {}) => ({
  _id: "p-1",
  name: "Organic Mango",
  category: "Fruits",
  description: "Fresh organic mangoes.",
  price: "120",
  stock: "10",
  unit: "kg",
  images: ["https://example.com/mango.jpg"],
  ...overrides,
});

beforeEach(() => {
  onSubmit.mockClear();
});

describe("ProductForm low stock threshold", () => {
  it("defaults Minimum Stock to 5 for a new product", () => {
    renderForm(null);

    expect(spinbuttons()[2]).toHaveValue(5);
  });

  it("retains the saved threshold when editing an existing product", () => {
    renderForm(baseProduct({ lowStockThreshold: 10 }));

    expect(spinbuttons()[2]).toHaveValue(10);
  });

  it("handles a missing legacy threshold by defaulting to 5", () => {
    const { lowStockThreshold, ...legacy } = baseProduct({ _id: "p-legacy" });
    renderForm(legacy);

    expect(spinbuttons()[2]).toHaveValue(5);
  });

  it("rejects a negative threshold and does not submit", async () => {
    await renderFormReady(baseProduct());

    act(() => {
      fireEvent.change(spinbuttons()[2], { target: { value: "-1" } });
      fireEvent.submit(document.querySelector("form"));
    });

    expect(screen.getByText(/Minimum stock must be a non-negative number/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a non-finite legacy threshold and does not submit", async () => {
    await renderFormReady(baseProduct({ lowStockThreshold: "abc" }));

    act(() => {
      fireEvent.submit(document.querySelector("form"));
    });

    expect(screen.getByText(/Minimum stock must be a non-negative number/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the threshold as a numeric value", async () => {
    await renderFormReady(baseProduct({ lowStockThreshold: 4 }));

    act(() => {
      fireEvent.change(spinbuttons()[2], { target: { value: "3" } });
      fireEvent.submit(document.querySelector("form"));
    });

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const formData = onSubmit.mock.calls[0][0];
    expect(formData.get("lowStockThreshold")).toBe("3");
  });

  it("omits the threshold from the payload when left blank (existing value retained)", async () => {
    await renderFormReady(baseProduct({ lowStockThreshold: undefined }));

    act(() => {
      fireEvent.change(spinbuttons()[2], { target: { value: "" } });
      fireEvent.submit(document.querySelector("form"));
    });

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].get("lowStockThreshold")).toBeNull();
  });
});
