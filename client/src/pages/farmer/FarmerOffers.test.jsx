import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import FarmerOffers from "./FarmerOffers.jsx";
import farmerOffersApi from "../../api/farmerOffersApi.js";

vi.mock("../../api/farmerOffersApi.js", () => ({
  default: {
    list: vi.fn(),
    stats: vi.fn(),
    eligibleProducts: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deactivate: vi.fn(),
  },
}));

const offer = {
  _id: "offer-a",
  title: "Mango Harvest Special",
  description: "Seasonal mango offer.",
  type: "Seasonal Offer",
  discountType: "Percentage",
  discountValue: 15,
  startDate: "2026-06-01T00:00:00.000Z",
  endDate: "2026-06-30T00:00:00.000Z",
  minimumQuantity: 1,
  minimumAmount: 0,
  effectiveStatus: "Active",
  unitsSold: 12,
  isActive: true,
  product: { _id: "product-a", name: "Alphonso Mango", price: 200, unit: "kg", stock: 20, images: [] },
};

describe("Farmer My Offers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    farmerOffersApi.eligibleProducts.mockResolvedValue({
      data: [{ _id: "product-a", name: "Alphonso Mango", price: 200, unit: "kg", stock: 20, images: [] }],
    });
    farmerOffersApi.list.mockResolvedValue({
      data: {
        items: [offer],
        total: 1,
        page: 1,
        pages: 1,
        stats: { totalOffers: 3, activeOffers: 2, pendingApproval: 1, totalSales: 4850, salesTrackingAvailable: true },
      },
    });
    farmerOffersApi.create.mockResolvedValue({ data: { _id: "offer-new" } });
  });

  it("renders API metrics, offer rows, and actual product names", async () => {
    render(<FarmerOffers />);

    expect(await screen.findByText("Mango Harvest Special")).toBeInTheDocument();
    expect(screen.getByText("Alphonso Mango")).toBeInTheDocument();
    expect(screen.getByText("12 units")).toBeInTheDocument();
    expect(screen.getByText(/4,850/)).toBeInTheDocument();
    expect(screen.getByText("Pending Approval")).toBeInTheDocument();
  });

  it("filters offers by search and displays a clean empty state", async () => {
    farmerOffersApi.list.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, pages: 1, stats: { totalOffers: 0, activeOffers: 0, pendingApproval: 0, totalSales: 0, salesTrackingAvailable: true } } });
    render(<FarmerOffers />);
    const search = screen.getByRole("textbox", { name: "Search offers" });
    fireEvent.change(search, { target: { value: "nonexistent" } });

    await waitFor(() => expect(farmerOffersApi.list).toHaveBeenCalledWith(expect.objectContaining({ search: "nonexistent" })));
    expect(await screen.findByText("No offers match these filters.")).toBeInTheDocument();
  });

  it("uses the default ten-offer page size and clears search without losing filters", async () => {
    render(<FarmerOffers />);
    await screen.findByText("Mango Harvest Special");
    await waitFor(() => expect(farmerOffersApi.list).toHaveBeenCalledWith({
      page: 1, limit: 10, search: "", type: "", status: "",
    }));

    const search = screen.getByRole("textbox", { name: "Search offers" });
    expect(search).toHaveAttribute("placeholder", "Search by Product ID, product name, offer title, description, or category...");
    fireEvent.change(search, { target: { value: "  Organic Fig  " } });
    await waitFor(() => expect(farmerOffersApi.list).toHaveBeenLastCalledWith({
      page: 1, limit: 10, search: "Organic Fig", type: "", status: "",
    }));
    fireEvent.click(screen.getByRole("button", { name: "Clear offer search" }));
    await waitFor(() => expect(farmerOffersApi.list).toHaveBeenLastCalledWith({
      page: 1, limit: 10, search: "", type: "", status: "",
    }));
  });

  it("opens the create form and submits a valid offer for approval", async () => {
    render(<FarmerOffers />);
    await screen.findByText("Mango Harvest Special");
    fireEvent.click(screen.getByRole("button", { name: "Create Offer" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Offer title" }), { target: { value: "Mango Weekend" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Offer description" }), { target: { value: "Fresh mangoes this weekend." } });
    fireEvent.change(screen.getByRole("combobox", { name: "Offer product" }), { target: { value: "product-a" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Discount value" }), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Offer start date"), { target: { value: "2026-06-01" } });
    fireEvent.change(screen.getByLabelText("Offer end date"), { target: { value: "2026-06-30" } });
    fireEvent.change(screen.getByLabelText("Offer start time"), { target: { value: "09:00" } });
    fireEvent.change(screen.getByLabelText("Offer end time"), { target: { value: "17:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit for Approval" }));

    await waitFor(() => expect(farmerOffersApi.create).toHaveBeenCalledWith(expect.objectContaining({
      title: "Mango Weekend",
      product: "product-a",
      discountValue: 10,
    })));
  });

  it("shows product option details, keeps the selected label and updates its preview", async () => {
    farmerOffersApi.eligibleProducts.mockResolvedValueOnce({
      data: [
        { _id: "curd-id", name: "Curd Updated", price: 50, unit: "g", stock: 59, images: ["/uploads/curd.jpg"] },
        { _id: "fig-id", name: "Fig (Anjoora)", price: 60, unit: "kg", stock: 103, images: [] },
      ],
    });
    render(<FarmerOffers />);
    await screen.findByText("Mango Harvest Special");
    fireEvent.click(screen.getByRole("button", { name: "Create Offer" }));

    const productSelect = screen.getByRole("combobox", { name: "Offer product" });
    expect(await screen.findByRole("option", { name: "Curd Updated · ₹50.00 · 59 in stock" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Fig (Anjoora) · ₹60.00 · 103 in stock" })).toBeInTheDocument();
    expect(productSelect).toHaveValue("curd-id");
    expect(productSelect.selectedOptions[0]).toHaveTextContent("Curd Updated");
    expect(screen.getByLabelText("Selected product preview")).toHaveTextContent("Curd Updated");
    expect(screen.getByText("₹50.00 / g · 59 in stock")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Curd Updated" })).toHaveAttribute("src", expect.stringContaining("/uploads/curd.jpg"));

    fireEvent.change(productSelect, { target: { value: "fig-id" } });
    expect(productSelect).toHaveValue("fig-id");
    expect(productSelect.selectedOptions[0]).toHaveTextContent("Fig (Anjoora)");
    expect(screen.getByLabelText("Selected product preview")).toHaveTextContent("Fig (Anjoora)");
    expect(screen.queryByText("Curd Updated")).not.toBeInTheDocument();
    expect(screen.getByText("₹60.00 / kg · 103 in stock")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Fig (Anjoora)" })).toHaveAttribute("src", "/images/placeholder.svg");

    fireEvent.click(screen.getByRole("button", { name: "Change Product" }));
    expect(document.activeElement).toBe(productSelect);
  });

  it("shows product loading, empty and recoverable error states", async () => {
    let resolveProducts;
    farmerOffersApi.eligibleProducts.mockReturnValueOnce(new Promise((resolve) => { resolveProducts = resolve; }));
    const { unmount } = render(<FarmerOffers />);
    fireEvent.click(screen.getByRole("button", { name: "Create Offer" }));

    const productSelect = screen.getByRole("combobox", { name: "Offer product" });
    expect(productSelect).toBeDisabled();
    expect(screen.getByRole("option", { name: "Loading eligible products…" })).toBeInTheDocument();
    await waitFor(() => resolveProducts({ data: [] }));
    expect(await screen.findByRole("option", { name: "No eligible products available" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Add an approved product with a valid price and available stock");
    expect(screen.getByRole("button", { name: "Submit for Approval" })).toBeDisabled();

    unmount();
    farmerOffersApi.eligibleProducts.mockRejectedValueOnce(new Error("Products unavailable"));
    render(<FarmerOffers />);
    await screen.findByText("Mango Harvest Special");
    fireEvent.click(screen.getByRole("button", { name: "Create Offer" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Products unavailable"));
    expect(screen.getByRole("combobox", { name: "Offer product" })).toBeDisabled();
    farmerOffersApi.eligibleProducts.mockResolvedValueOnce({ data: [{
      _id: "product-a", name: "Alphonso Mango", price: 200, unit: "kg", stock: 20, images: [],
    }] });
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("option", { name: "Alphonso Mango · ₹200.00 · 20 in stock" })).toBeInTheDocument();
  });
});
