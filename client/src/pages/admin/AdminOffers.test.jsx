import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminOffers from "./AdminOffers.jsx";
import adminOffersApi from "../../api/adminOffersApi.js";

vi.mock("../../api/adminOffersApi.js", () => ({
  default: {
    options: vi.fn(),
    farmers: vi.fn(),
    eligibleProducts: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    deactivate: vi.fn(),
  },
}));

const offer = {
  _id: "offer-1",
  title: "Fig harvest offer",
  description: "Save on fresh figs from our farm.",
  type: "Seasonal Offer",
  status: "Pending",
  approvalStatus: "Pending",
  effectiveStatus: "Pending",
  discountType: "Percentage",
  discountValue: 10,
  discountAmount: 10,
  minimumQuantity: 1,
  minimumAmount: 100,
  maximumDiscount: 20,
  originalPrice: 100,
  offerPrice: 90,
  startDate: "2026-10-01T00:00:00.000Z",
  endDate: "2026-11-30T00:00:00.000Z",
  createdAt: "2026-09-20T00:00:00.000Z",
  bundleConditions: "",
  product: {
    _id: "product-1",
    name: "Organic Fig",
    images: ["/uploads/products/fig.jpg"],
    price: 100,
    unit: "kg",
  },
  farmer: { _id: "farmer-1", name: "Green Valley Farm", email: "farmer@example.test" },
};

function renderPage() {
  return render(<MemoryRouter><AdminOffers /></MemoryRouter>);
}

describe("Admin offers management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminOffersApi.options.mockResolvedValue({
      data: {
        farmers: [{ _id: "farmer-1", name: "Green Valley Farm" }],
        products: [{ _id: "product-1", name: "Organic Fig" }],
      },
    });
    adminOffersApi.farmers.mockResolvedValue({
      data: [
        { _id: "farmer-1", name: "Green Valley Farm" },
        { _id: "farmer-2", name: "Hillside Farm" },
      ],
    });
    adminOffersApi.eligibleProducts.mockResolvedValue({
      data: [{ _id: "product-1", name: "Organic Fig", price: 100, unit: "kg", stock: 20, images: [] }],
    });
    adminOffersApi.list.mockResolvedValue({ data: { items: [offer], total: 1, page: 1, pages: 1 } });
    adminOffersApi.get.mockResolvedValue({ data: offer });
    adminOffersApi.create.mockResolvedValue({ data: { _id: "offer-new", ...offer, status: "Active" } });
    adminOffersApi.update.mockResolvedValue({ data: { _id: "offer-1", ...offer, status: "Active" } });
    adminOffersApi.approve.mockResolvedValue({ data: offer });
    adminOffersApi.reject.mockResolvedValue({ data: offer });
    adminOffersApi.deactivate.mockResolvedValue({ data: offer });
  });

  it("renders real offer rows, image, price and status with actions for pending offers", async () => {
    renderPage();

    expect(await screen.findByText("Offers Management")).toBeInTheDocument();
    expect(await screen.findByText("Fig harvest offer")).toBeInTheDocument();
    expect(screen.getAllByRole("cell", { name: /Organic Fig/ })[0]).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Green Valley Farm" })).toBeInTheDocument();
    expect(screen.getAllByText(/₹90\.00/).length).toBeGreaterThan(0);
    expect(screen.getByRole("cell", { name: "Pending" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Organic Fig product" })).toHaveAttribute("src", expect.stringContaining("/uploads/products/fig.jpg"));
    const approveButton = screen.getByRole("button", { name: "Approve" });
    const rejectButton = screen.getByRole("button", { name: "Reject" });
    expect(approveButton).toBeVisible();
    expect(rejectButton).toBeVisible();
    expect(approveButton.closest("td")).toHaveClass("min-w-[255px]", "whitespace-nowrap");
    expect(approveButton.parentElement).toHaveClass("flex");
    expect(adminOffersApi.list).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });

  it("shows a Create Offer button", async () => {
    renderPage();
    await screen.findByText("Offers Management");
    expect(screen.getByRole("button", { name: "Create Offer" })).toBeInTheDocument();
  });

  it("opens the create form, loads the selected farmer's products and submits a new offer", async () => {
    renderPage();
    await screen.findByText("Offers Management");

    fireEvent.click(screen.getByRole("button", { name: "Create Offer" }));
    await screen.findByRole("textbox", { name: "Offer title" });

    const farmerSelect = screen.getByRole("combobox", { name: "Offer farmer" });
    expect(farmerSelect).toHaveValue("farmer-1");
    expect(adminOffersApi.eligibleProducts).toHaveBeenCalledWith("farmer-1");
    expect(await screen.findByRole("option", { name: "Organic Fig · ₹100.00 · 20 in stock" })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Offer title" }), { target: { value: "Admin Fig Offer" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Offer description" }), { target: { value: "Admin created fig offer." } });
    fireEvent.change(screen.getByRole("combobox", { name: "Offer product" }), { target: { value: "product-1" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Discount value" }), { target: { value: "15" } });
    fireEvent.change(screen.getByLabelText("Offer start date"), { target: { value: "2026-12-01" } });
    fireEvent.change(screen.getByLabelText("Offer end date"), { target: { value: "2026-12-31" } });
    fireEvent.change(screen.getByLabelText("Offer start time"), { target: { value: "09:00" } });
    fireEvent.change(screen.getByLabelText("Offer end time"), { target: { value: "17:00" } });

    expect(screen.getByLabelText("Selected product preview")).toHaveTextContent("Organic Fig");
    expect(screen.getByText("₹100.00 / kg · 20 in stock")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create & Approve" }));

    await waitFor(() => expect(adminOffersApi.create).toHaveBeenCalledWith(expect.objectContaining({
      title: "Admin Fig Offer",
      farmer: "farmer-1",
      product: "product-1",
      discountValue: 15,
    })));
    await waitFor(() => expect(adminOffersApi.list).toHaveBeenCalledTimes(2));
  });

  it("reloads the selected farmer's products when the farmer changes", async () => {
    renderPage();
    await screen.findByText("Offers Management");

    fireEvent.click(screen.getByRole("button", { name: "Create Offer" }));
    await waitFor(() => expect(adminOffersApi.eligibleProducts).toHaveBeenCalledWith("farmer-1"));

    adminOffersApi.eligibleProducts.mockResolvedValueOnce({
      data: [{ _id: "product-2", name: "Hillside Tomato", price: 60, unit: "kg", stock: 12, images: [] }],
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Offer farmer" }), { target: { value: "farmer-2" } });

    await waitFor(() => expect(adminOffersApi.eligibleProducts).toHaveBeenLastCalledWith("farmer-2"));
    expect(await screen.findByRole("option", { name: "Hillside Tomato · ₹60.00 · 12 in stock" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Organic Fig · ₹100.00 · 20 in stock" })).not.toBeInTheDocument();
  });

  it("opens the edit form from the offer list with the current farmer and product prefilled", async () => {
    renderPage();
    await screen.findByText("Fig harvest offer");

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await screen.findByRole("textbox", { name: "Offer title" });
    await waitFor(() => expect(adminOffersApi.eligibleProducts).toHaveBeenCalledWith("farmer-1"));

    expect(screen.getByRole("combobox", { name: "Offer farmer" })).toHaveValue("farmer-1");
    expect(screen.getByRole("combobox", { name: "Offer product" })).toHaveValue("product-1");
    expect(screen.getByRole("textbox", { name: "Offer title" })).toHaveValue("Fig harvest offer");
    expect(screen.getByLabelText("Selected product preview")).toHaveTextContent("Organic Fig");
  });

  it("submits an edited offer for approval from the edit form", async () => {
    renderPage();
    await screen.findByText("Fig harvest offer");

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Offer product" })).toHaveValue("product-1"));

    fireEvent.change(screen.getByRole("textbox", { name: "Offer title" }), { target: { value: "Updated Fig Offer" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Discount value" }), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText("Offer start time"), { target: { value: "09:00" } });
    fireEvent.change(screen.getByLabelText("Offer end time"), { target: { value: "17:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Save & Approve" }));

    await waitFor(() => expect(adminOffersApi.update).toHaveBeenCalledWith("offer-1", expect.objectContaining({
      title: "Updated Fig Offer",
      discountValue: 20,
    })));
    await waitFor(() => expect(adminOffersApi.list).toHaveBeenCalledTimes(2));
  });

  it("opens the edit form from the offer details modal", async () => {
    renderPage();
    await screen.findByText("Fig harvest offer");

    fireEvent.click(screen.getByRole("button", { name: "View Fig harvest offer" }));
    expect(await screen.findByText("Save on fresh figs from our farm.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit Offer" }));
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Offer title" })).toHaveValue("Fig harvest offer"));
    expect(screen.getByRole("combobox", { name: "Offer farmer" })).toHaveValue("farmer-1");
  });

  it("applies all selected filters and search on the server when Search is submitted", async () => {
    renderPage();
    await screen.findByText("Fig harvest offer");

    fireEvent.change(screen.getByRole("combobox", { name: "Filter by farmer" }), { target: { value: "farmer-1" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Filter by product" }), { target: { value: "product-1" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Filter by offer type" }), { target: { value: "Seasonal Offer" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Filter by status" }), { target: { value: "Pending" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Search offers" }), { target: { value: "Fig harvest" } });
    fireEvent.click(screen.getByRole("button", { name: /Search/ }));

    await waitFor(() => {
      expect(adminOffersApi.list).toHaveBeenLastCalledWith({
        page: 1,
        limit: 10,
        farmerId: "farmer-1",
        productId: "product-1",
        type: "Seasonal Offer",
        status: "Pending",
        search: "Fig harvest",
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear Filters" }));
    await waitFor(() => expect(adminOffersApi.list).toHaveBeenLastCalledWith({ page: 1, limit: 10 }));
  });

  it("supports server pagination and clearing only the search term", async () => {
    renderPage();
    await screen.findByText("Fig harvest offer");
    fireEvent.change(screen.getByLabelText("Page size"), { target: { value: "20" } });

    await waitFor(() => expect(adminOffersApi.list).toHaveBeenLastCalledWith({ page: 1, limit: 20 }));
    fireEvent.change(screen.getByRole("combobox", { name: "Filter by status" }), { target: { value: "Active" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Search offers" }), { target: { value: "Fig" } });
    fireEvent.click(screen.getByRole("button", { name: /Search/ }));
    await waitFor(() => expect(adminOffersApi.list).toHaveBeenLastCalledWith({
      page: 1, limit: 20, status: "Active", search: "Fig",
    }));

    fireEvent.click(screen.getByRole("button", { name: "Clear offer search" }));
    await waitFor(() => expect(adminOffersApi.list).toHaveBeenLastCalledWith({
      page: 1, limit: 20, status: "Active",
    }));
  });

  it("immediately applies effective Scheduled status and shows only View and Deactivate", async () => {
    const scheduledOffer = {
      ...offer,
      _id: "offer-scheduled",
      title: "Future Fig Offer",
      approvalStatus: "Active",
      status: "Active",
      effectiveStatus: "Scheduled",
    };
    adminOffersApi.list.mockImplementation(({ status } = {}) => Promise.resolve({
      data: { items: status === "Scheduled" ? [scheduledOffer] : [offer], total: 1, page: 1, pages: 1 },
    }));
    renderPage();
    expect(await screen.findByText("Fig harvest offer")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Filter by status" }), { target: { value: "Scheduled" } });

    expect(await screen.findByText("Future Fig Offer")).toBeInTheDocument();
    expect(screen.queryByText("Fig harvest offer")).not.toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Scheduled" })).toBeInTheDocument();
    expect(adminOffersApi.list).toHaveBeenLastCalledWith({ page: 1, limit: 10, status: "Scheduled" });
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deactivate" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View Future Fig Offer" })).toBeInTheDocument();
  });

  it("shows approval actions when saved approval is Pending even if effective status is Scheduled", async () => {
    const pendingScheduledOffer = {
      ...offer,
      _id: "offer-pending-scheduled",
      title: "Future pending fig offer",
      status: "Pending",
      approvalStatus: "Pending",
      effectiveStatus: "Scheduled",
    };
    adminOffersApi.list.mockResolvedValueOnce({
      data: { items: [pendingScheduledOffer], total: 1, page: 1, pages: 1 },
    });
    renderPage();

    expect(await screen.findByText("Future pending fig offer")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Scheduled" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Reject" })).toBeVisible();
    expect(screen.getByRole("button", { name: "View Future pending fig offer" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Deactivate" })).not.toBeInTheDocument();
  });

  it("loads the full offer details in a modal", async () => {
    renderPage();
    await screen.findByText("Fig harvest offer");
    fireEvent.click(screen.getByRole("button", { name: "View Fig harvest offer" }));

    expect(await screen.findByText("Save on fresh figs from our farm.")).toBeInTheDocument();
    expect(screen.getByText("farmer@example.test")).toBeInTheDocument();
    expect(screen.getByText("Minimum order amount")).toBeInTheDocument();
    expect(adminOffersApi.get).toHaveBeenCalledWith("offer-1");
  });

  it("requires a non-empty rejection reason and submits the confirmation", async () => {
    renderPage();
    await screen.findByText("Fig harvest offer");
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    const confirmButton = screen.getByRole("button", { name: "Confirm Rejection" });
    expect(confirmButton).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "Rejection reason" }), { target: { value: "Please clarify the offer terms." } });
    fireEvent.click(confirmButton);

    await waitFor(() => expect(adminOffersApi.reject).toHaveBeenCalledWith("offer-1", "Please clarify the offer terms."));
    await waitFor(() => expect(adminOffersApi.list).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Fig harvest offer")).toBeInTheDocument();
  });

  it("requires explicit confirmation before approving a pending offer", async () => {
    renderPage();
    await screen.findByText("Fig harvest offer");
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    expect(screen.getByText(/server will re-check farmer, product, stock, dates and discount eligibility/i)).toBeInTheDocument();
    expect(screen.getAllByText("Green Valley Farm").length).toBeGreaterThan(1);
    expect(screen.getAllByText(/Public Price/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Subscriber Price/).length).toBeGreaterThan(0);
    expect(adminOffersApi.approve).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm Approval" }));

    await waitFor(() => expect(adminOffersApi.approve).toHaveBeenCalledWith("offer-1"));
    await waitFor(() => expect(adminOffersApi.list).toHaveBeenCalledTimes(2));
  });

  it("requires confirmation before deactivating an active offer", async () => {
    adminOffersApi.list.mockResolvedValueOnce({
      data: { items: [{ ...offer, status: "Active", approvalStatus: "Active", effectiveStatus: "Active" }], total: 1, page: 1, pages: 1 },
    });
    renderPage();
    await screen.findByText("Fig harvest offer");
    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));

    expect(screen.getByText(/no longer be available to customers/i)).toBeInTheDocument();
    expect(adminOffersApi.deactivate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm Deactivation" }));

    await waitFor(() => expect(adminOffersApi.deactivate).toHaveBeenCalledWith("offer-1"));
  });

  it("does not show approval actions for active or rejected offers", async () => {
    adminOffersApi.list.mockResolvedValueOnce({
      data: {
        items: [
          { ...offer, _id: "active-offer", title: "Active offer", status: "Active", approvalStatus: "Active", effectiveStatus: "Active" },
          { ...offer, _id: "rejected-offer", title: "Rejected offer", status: "Rejected", approvalStatus: "Rejected", effectiveStatus: "Rejected" },
        ],
        total: 2,
        page: 1,
        pages: 1,
      },
    });
    renderPage();
    expect(await screen.findByText("Active offer")).toBeInTheDocument();
    expect(screen.getByText("Rejected offer")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View Active offer" })).toBeVisible();
    expect(screen.getByRole("button", { name: "View Rejected offer" })).toBeVisible();
  });
});
