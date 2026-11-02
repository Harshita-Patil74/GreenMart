import React from "react";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import FarmerNotifications from "./FarmerNotifications.jsx";
import notificationApi from "../../api/notificationApi.js";
import { renderWithStore } from "../../tests/testUtils.jsx";

vi.mock("../../api/notificationApi", () => ({
  default: {
    list: vi.fn(),
    unreadCount: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    remove: vi.fn(),
  },
}));

const today = new Date().toISOString();
const notifications = [
  { _id: "n1", type: "newOrderFarmer", category: "orders", title: "New order received", message: "You have a new order.", createdAt: today, isRead: false },
  { _id: "n2", type: "offerApproved", category: "offers", title: "Offer approved", message: "Your offer is approved.", createdAt: today, isRead: false },
  { _id: "n3", type: "stockAlert", category: "inventory", title: "Product low stock", message: "Low stock warning.", createdAt: today, isRead: true },
];

function renderPage() {
  return renderWithStore(<FarmerNotifications />);
}

describe("Farmer Notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationApi.list.mockResolvedValue({ data: { items: notifications, total: notifications.length, page: 1, pages: 1 } });
    notificationApi.markRead.mockResolvedValue({ data: { message: "ok" } });
    notificationApi.markAllRead.mockResolvedValue({ data: { message: "ok" } });
    notificationApi.remove.mockResolvedValue({ data: { message: "ok" } });
  });

  it("renders farmer notifications with category filters", async () => {
    renderPage();
    await screen.findByText("New order received");

    const categoryNav = screen.getByRole("navigation", { name: "Notification categories" });
    const buttons = within(categoryNav).getAllByRole("button");
    expect(buttons.map((b) => b.textContent.replace(/\d+/g, "").trim())).toEqual([
      "All", "Orders", "Offers", "Products", "Inventory", "Certifications", "Messages", "Support", "Account",
    ]);
  });

  it("filters by category", async () => {
    renderPage();
    await screen.findByText("New order received");

    const categoryNav = screen.getByRole("navigation", { name: "Notification categories" });
    fireEvent.click(within(categoryNav).getByRole("button", { name: /Offers/ }));
    expect(screen.getByText("Offer approved")).toBeInTheDocument();
    expect(screen.queryByText("New order received")).not.toBeInTheDocument();

    fireEvent.click(within(categoryNav).getByRole("button", { name: /All/ }));
    expect(screen.getByText("New order received")).toBeInTheDocument();
  });

  it("marks one notification as read", async () => {
    renderPage();
    await screen.findByText("New order received");
    fireEvent.click(screen.getByRole("button", { name: "Mark New order received as read" }));

    await waitFor(() => expect(notificationApi.markRead).toHaveBeenCalledWith("n1"));
  });

  it("marks all notifications as read", async () => {
    renderPage();
    await screen.findByText("New order received");
    fireEvent.click(screen.getByRole("button", { name: /Mark all read/ }));

    await waitFor(() => expect(notificationApi.markAllRead).toHaveBeenCalledTimes(1));
  });

  it("deletes an individual notification", async () => {
    renderPage();
    await screen.findByText("New order received");
    fireEvent.click(screen.getByRole("button", { name: /Delete New order received/ }));

    await waitFor(() => expect(notificationApi.remove).toHaveBeenCalledWith("n1"));
  });
});
