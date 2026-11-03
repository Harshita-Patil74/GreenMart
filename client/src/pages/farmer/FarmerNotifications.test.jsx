import React from "react";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import FarmerNotifications from "./FarmerNotifications.jsx";
import notificationApi from "../../api/notificationApi.js";
import { renderWithStore } from "../../tests/testUtils.jsx";

vi.mock("../../api/notificationApi", () => ({
  default: {
    list: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    remove: vi.fn(),
  },
}));

const today = new Date().toISOString();

function notificationsFor(over = {}) {
  const base = [
    { _id: "n1", type: "newOrderFarmer", category: "orders", title: "New order received", message: "You have a new order.", orderNumber: "GM1001", createdAt: today, isRead: false },
    { _id: "n2", type: "offerApproved", category: "offers", title: "Offer approved", message: "Your offer is approved.", createdAt: today, isRead: false },
    { _id: "n3", type: "stockAlert", category: "inventory", title: "Product low stock", message: "Low stock warning.", createdAt: today, isRead: true },
    { _id: "n4", type: "farmerCertificationVerified", category: "certifications", title: "Certification verified", message: "Your certification was verified.", createdAt: today, isRead: false },
    { _id: "n5", type: "newMessage", category: "messages", title: "New message received", message: "A customer messaged you.", createdAt: today, isRead: false },
    { _id: "n6", type: "passwordChanged", category: "account", title: "Password changed", message: "Your password was changed.", createdAt: today, isRead: true },
  ];
  return over.items ?? base;
}

function makeData(over = {}) {
  const items = notificationsFor(over);
  return { data: { items, total: items.length, page: over.page ?? 1, pages: over.pages ?? 1, limit: over.limit ?? 20 } };
}

function renderPage(over = {}) {
  notificationApi.list.mockResolvedValue(makeData(over));
  return renderWithStore(<FarmerNotifications />);
}

describe("Farmer Notification Centre", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationApi.markRead.mockResolvedValue({ data: { message: "ok" } });
    notificationApi.markAllRead.mockResolvedValue({ data: { message: "ok" } });
    notificationApi.remove.mockResolvedValue({ data: { message: "ok" } });
  });

  it("shows all farmer notification categories", async () => {
    renderPage();
    await screen.findByText("New order received");
    const nav = screen.getByRole("navigation", { name: "Notification categories" });
    const labels = within(nav).getAllByRole("button").map((b) => b.textContent.replace(/\d+/g, "").trim());
    expect(labels).toEqual([
      "All", "Orders", "Offers", "Products", "Inventory", "Certifications", "Messages", "Support", "Account",
    ]);
  });

  it("All displays all farmer notifications", async () => {
    renderPage();
    await screen.findByText("New order received");
    expect(screen.getByText("Offer approved")).toBeInTheDocument();
    expect(screen.getByText("Product low stock")).toBeInTheDocument();
    expect(screen.getByText("Certification verified")).toBeInTheDocument();
    expect(screen.getByText("New message received")).toBeInTheDocument();
    expect(screen.getByText("Password changed")).toBeInTheDocument();
  });

  it("Orders displays order notifications", async () => {
    renderPage();
    await screen.findByText("New order received");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Notification categories" })).getByRole("button", { name: /Orders/ }));
    await waitFor(() => expect(screen.getByText("New order received")).toBeInTheDocument());
    expect(screen.queryByText("Offer approved")).not.toBeInTheDocument();
  });

  it("Offers displays offer notifications", async () => {
    renderPage();
    await screen.findByText("New order received");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Notification categories" })).getByRole("button", { name: /Offers/ }));
    await waitFor(() => expect(screen.getByText("Offer approved")).toBeInTheDocument());
    expect(screen.queryByText("New order received")).not.toBeInTheDocument();
  });

  it("Inventory displays inventory notifications", async () => {
    renderPage();
    await screen.findByText("New order received");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Notification categories" })).getByRole("button", { name: /Inventory/ }));
    await waitFor(() => expect(screen.getByText("Product low stock")).toBeInTheDocument());
    expect(screen.queryByText("New order received")).not.toBeInTheDocument();
  });

  it("Certifications displays certification notifications", async () => {
    renderPage();
    await screen.findByText("New order received");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Notification categories" })).getByRole("button", { name: /Certifications/ }));
    await waitFor(() => expect(screen.getByText("Certification verified")).toBeInTheDocument());
    expect(screen.queryByText("New order received")).not.toBeInTheDocument();
  });

  it("Messages displays message notifications", async () => {
    renderPage();
    await screen.findByText("New order received");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Notification categories" })).getByRole("button", { name: /Messages/ }));
    await waitFor(() => expect(screen.getByText("New message received")).toBeInTheDocument());
    expect(screen.queryByText("New order received")).not.toBeInTheDocument();
  });

  it("Account displays account notifications", async () => {
    renderPage();
    await screen.findByText("New order received");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Notification categories" })).getByRole("button", { name: /Account/ }));
    await waitFor(() => expect(screen.getByText("Password changed")).toBeInTheDocument());
    expect(screen.queryByText("New order received")).not.toBeInTheDocument();
  });

  it("Supports products category (empty when no product records)", async () => {
    renderPage({ items: [] });
    await screen.findByText("You're all caught up");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Notification categories" })).getByRole("button", { name: /Products/ }));
    await waitFor(() => expect(screen.getByText("You're all caught up")).toBeInTheDocument());
  });

  it("Supports support category (empty when no support records)", async () => {
    renderPage();
    await screen.findByText("New order received");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Notification categories" })).getByRole("button", { name: /Support/ }));
    await waitFor(() => expect(screen.getByText("You're all caught up")).toBeInTheDocument());
  });

  it("normalizes legacy records saved without a category by type", async () => {
    const legacy = [
      { _id: "legacy-1", type: "newOrderFarmer", title: "Legacy order", message: "Legacy order msg", createdAt: today, isRead: false },
      { _id: "legacy-2", type: "newMessage", title: "Legacy message", message: "Legacy message msg", createdAt: today, isRead: false },
    ];
    notificationApi.list.mockResolvedValue({ data: { items: legacy, total: legacy.length, page: 1, pages: 1 } });
    renderWithStore(<FarmerNotifications />);
    await screen.findByText("Legacy order");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Notification categories" })).getByRole("button", { name: /Orders/ }));
    await waitFor(() => expect(screen.getByText("Legacy order")).toBeInTheDocument());
    fireEvent.click(within(screen.getByRole("navigation", { name: "Notification categories" })).getByRole("button", { name: /Messages/ }));
    await waitFor(() => expect(screen.getByText("Legacy message")).toBeInTheDocument());
  });

  it("does not confuse notification type with category", async () => {
    // n2 is type offerApproved, category offers; it must not appear under Orders.
    renderPage();
    await screen.findByText("New order received");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Notification categories" })).getByRole("button", { name: /Orders/ }));
    await waitFor(() => expect(screen.getByText("New order received")).toBeInTheDocument());
    expect(screen.queryByText("Offer approved")).not.toBeInTheDocument();
  });

  it("shows accurate category counts", async () => {
    renderPage();
    await screen.findByText("New order received");
    const nav = screen.getByRole("navigation", { name: "Notification categories" });
    const allButton = within(nav).getAllByRole("button").find((b) => b.textContent.startsWith("All"));
    expect(allButton).toHaveTextContent("All6");
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

  it("shows an error state instead of an empty state when the API fails", async () => {
    notificationApi.list.mockRejectedValue({ response: { data: { message: "Down" } } });
    renderWithStore(<FarmerNotifications />);
    await waitFor(() => expect(screen.getByText("Down")).toBeInTheDocument());
    expect(screen.queryByText("You're all caught up")).not.toBeInTheDocument();
  });

  it("shows loading state while fetching", async () => {
    notificationApi.list.mockReturnValue(new Promise(() => {}));
    renderWithStore(<FarmerNotifications />);
    expect(screen.getByText("Loading notifications…")).toBeInTheDocument();
  });

  it("resets to page 1 when changing category", async () => {
    const many = Array.from({ length: 25 }, (_, i) => ({ _id: `n${i}`, type: "newOrderFarmer", category: "orders", title: `Order ${i}`, message: `msg ${i}`, orderNumber: `GM${String(i).padStart(6,"0")}`, createdAt: today, isRead: false }));
    notificationApi.list.mockResolvedValue({ data: { items: many, total: 25, page: 1, pages: 2 } });
    renderWithStore(<FarmerNotifications />);
    await screen.findByText("Order 0");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Notification categories" })).getByRole("button", { name: /Offers/ }));
    notificationApi.list.mockResolvedValue({ data: { items: [], total: 0, page: 1, pages: 1 } });
    await waitFor(() => expect(screen.getByText("You're all caught up")).toBeInTheDocument());
  });
});
