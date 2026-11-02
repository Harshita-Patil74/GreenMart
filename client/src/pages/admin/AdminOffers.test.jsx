import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminOffers from "./AdminOffers.jsx";
import adminOffersApi from "../../api/adminOffersApi.js";

vi.mock("../../api/adminOffersApi.js", () => ({
  default: {
    options: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
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
    adminOffersApi.list.mockResolvedValue({ data: { items: [offer], total: 1, page: 1, pages: 1 } });
    adminOffersApi.get.mockResolvedValue({ data: offer });
    adminOffersApi.approve.mockResolvedValue({ data: offer });
    adminOffersApi.reject.mockResolvedValue({ data: offer });
    adminOffersApi.deactivate.mockResolvedValue({ data: offer });
  });

  it("renders real offer rows, image, price and status with actions for pending offers", async () => {
    renderPage();

    expect(await screen.findByText("Offers Management")).toBeInTheDocument();
    expect(await screen.findByText("Fig harvest offer")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Organic Fig" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Green Valley Farm" })).toBeInTheDocument();
    expect(screen.getByText(/90/)).toBeInTheDocument();
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
    expect(screen.getAllByText(/10%/).length).toBeGreaterThan(1);
    expect(screen.getAllByText("Discount").length).toBeGreaterThan(1);
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
