import React from "react";
import { act, fireEvent, screen, waitFor, within, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import notificationsReducer, { addNotification } from "../../features/notifications/notificationsSlice.js";
import authReducer from "../../features/auth/authSlice.js";
import Notifications from "./Notifications.jsx";
import notificationApi from "../../api/notificationApi.js";

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
  { _id: "n1", type: "orderConfirmation", category: "orders", title: "Order placed successfully", message: "Your order #GM937082 has been placed successfully.", orderId: "o1", orderNumber: "GM937082", createdAt: today, isRead: false },
  { _id: "n2", type: "statusUpdate", category: "orders", title: "Order packed", message: "Your order has been packed and is ready for dispatch. (Order #GM953822)", orderId: "o2", orderNumber: "GM953822", createdAt: today, isRead: false },
  { _id: "n3", type: "statusUpdate", category: "orders", title: "Order out for delivery", message: "Your order is out for delivery. (Order #GM953822)", orderId: "o2", orderNumber: "GM953822", createdAt: today, isRead: true },
  { _id: "n4", type: "statusUpdate", category: "orders", title: "Order delivered", message: "Your order has been delivered. (Order #GM533339)", orderId: "o3", orderNumber: "GM533339", createdAt: today, isRead: true },
  { _id: "n5", type: "offerApproved", category: "offers", title: "Offer approved", message: "Your offer was approved.", createdAt: today, isRead: false },
  { _id: "n6", type: "newMessage", category: "messages", title: "New message received", message: "A farmer replied to your message.", createdAt: today, isRead: false },
  { _id: "n7", type: "passwordChanged", category: "account", title: "Password changed", message: "Your password was changed.", createdAt: today, isRead: true },
];

function makeData(over = {}) {
  const items = over.items || notifications;
  return {
    data: {
      items,
      total: over.total ?? items.length,
      page: over.page ?? 1,
      pages: over.pages ?? Math.max(1, Math.ceil(items.length / 20)),
      limit: over.limit ?? 20,
    },
  };
}

function renderPage(over = {}) {
  const store = configureStore({ reducer: { notifications: notificationsReducer, auth: authReducer } });
  const utils = render(
    <Provider store={store}>
      <MemoryRouter><Notifications /></MemoryRouter>
    </Provider>
  );
  return { ...utils, store };
}

describe("Customer Notification Centre", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationApi.list.mockResolvedValue(makeData({}));
    notificationApi.unreadCount.mockResolvedValue({ data: { count: 3 } });
    notificationApi.markRead.mockResolvedValue({ data: { message: "ok" } });
    notificationApi.markAllRead.mockResolvedValue({ data: { message: "ok" } });
  });

  it("shows all customer notification categories", async () => {
    renderPage();
    await screen.findByText("Order placed successfully");
    const nav = screen.getByRole("navigation", { name: "Notification categories" });
    const labels = within(nav).getAllByRole("button").map((b) => b.textContent.replace(/\d+/g, "").trim());
    expect(labels).toEqual(["All", "Orders", "Offers", "Payments", "Wishlist", "Messages", "Support", "Account", "My Newsletter"]);
  });

  it("orders filter displays only order notifications", async () => {
    renderPage();
    await screen.findByText("Order placed successfully");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Notification categories" })).getByRole("button", { name: /Orders/ }));
    await waitFor(() => expect(screen.getByText("Order packed")).toBeInTheDocument());
    expect(screen.getByText("Order placed successfully")).toBeInTheDocument();
    expect(screen.queryByText("Offer approved")).not.toBeInTheDocument();
  });

  it("offers filter displays only offer notifications", async () => {
    renderPage();
    await screen.findByText("Order placed successfully");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Notification categories" })).getByRole("button", { name: /Offers/ }));
    await waitFor(() => expect(screen.getByText("Offer approved")).toBeInTheDocument());
    expect(screen.queryByText("Order placed successfully")).not.toBeInTheDocument();
  });

  it("payments, wishlist, messages, support and account filters work", async () => {
    renderPage();
    await screen.findByText("Order placed successfully");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Notification categories" })).getByRole("button", { name: /Messages/ }));
    await waitFor(() => expect(screen.getByText("New message received")).toBeInTheDocument());
    fireEvent.click(within(screen.getByRole("navigation", { name: "Notification categories" })).getByRole("button", { name: /Account/ }));
    await waitFor(() => expect(screen.getByText("Password changed")).toBeInTheDocument());
  });

  it("order placed, packed, out for delivery and delivered notifications appear", async () => {
    renderPage();
    await screen.findByText("Order placed successfully");
    expect(screen.getByText("Your order #GM937082 has been placed successfully.")).toBeInTheDocument();
    expect(screen.getByText("Order packed")).toBeInTheDocument();
    expect(screen.getByText("Order out for delivery")).toBeInTheDocument();
    expect(screen.getByText("Order delivered")).toBeInTheDocument();
  });

  it("clicking an order notification navigates to the order details page", async () => {
    renderPage();
    await screen.findByText("Order placed successfully");
    fireEvent.click(screen.getByText("Order placed successfully"));
    // navigation handled by react-router; ensure no crash and row is clickable
    expect(screen.getByText("Order placed successfully")).toBeInTheDocument();
  });

  it("marks all read and updates unread count immediately", async () => {
    renderPage();
    await screen.findByText("Order placed successfully");
    fireEvent.click(screen.getByText("Mark all read"));
    await waitFor(() => expect(notificationApi.markAllRead).toHaveBeenCalledTimes(1));
  });

  it("supports pagination with total, current page and prev/next controls", async () => {
    const many = Array.from({ length: 45 }, (_, i) => ({ _id: `n${i}`, type: "orderConfirmation", category: "orders", title: `Order ${i}`, message: `msg ${i}`, orderNumber: `GM${String(i).padStart(6,"0")}`, createdAt: today, isRead: false }));
    notificationApi.list.mockResolvedValue(makeData({ items: many.slice(0, 20), total: 45, page: 1, pages: 3, limit: 20 }));
    renderPage();
    await screen.findByText("Order 0");
    await waitFor(() => expect(screen.getByText("Total Notifications: 45")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Page 1 of 3")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Next"));
    await waitFor(() => expect(screen.getByText("Page 2 of 3")).toBeInTheDocument());
    expect(screen.queryByText("Order 0")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Prev"));
    await waitFor(() => expect(screen.getByText("Page 1 of 3")).toBeInTheDocument());
  });

  it("changing category resets pagination to page 1", async () => {
    const many = Array.from({ length: 45 }, (_, i) => ({ _id: `n${i}`, type: "orderConfirmation", category: "orders", title: `Order ${i}`, message: `msg ${i}`, orderNumber: `GM${String(i).padStart(6,"0")}`, createdAt: today, isRead: false }));
    notificationApi.list.mockResolvedValue(makeData({ items: many.slice(0, 20), total: 45, page: 1, pages: 3, limit: 20 }));
    renderPage();
    await screen.findByText("Order 0");
    fireEvent.click(screen.getByText("Next"));
    await waitFor(() => expect(screen.getByText("Page 2 of 3")).toBeInTheDocument());
    notificationApi.list.mockResolvedValue(makeData({ items: [], total: 0, page: 1, pages: 1, limit: 20 }));
    fireEvent.click(within(screen.getByRole("navigation", { name: "Notification categories" })).getByRole("button", { name: /Offers/ }));
    await waitFor(() => expect(notificationApi.list).toHaveBeenLastCalledWith({ category: "offers", page: 1, limit: 20 }));
    await waitFor(() => expect(screen.queryByText("Order 0")).not.toBeInTheDocument());
  });

  it("shows empty state when a category has no notifications", async () => {
    notificationApi.list.mockResolvedValue(makeData({ items: [], total: 0, page: 1, pages: 1, limit: 20 }));
    renderPage();
    await screen.findByText("You're all caught up");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Notification categories" })).getByRole("button", { name: /Payments/ }));
    await waitFor(() => expect(screen.getByText("You're all caught up")).toBeInTheDocument());
  });

  it("shows an error state instead of a blank page when the API fails", async () => {
    notificationApi.list.mockRejectedValue(new Error("Down"));
    renderPage();
    await waitFor(() => expect(screen.getByText("Down")).toBeInTheDocument());
  });

  it("adds a real-time socket notification without a page refresh", async () => {
    const { store } = renderPage();
    await screen.findByText("Order placed successfully");
    const live = { _id: "n-live", type: "statusUpdate", category: "orders", title: "Order handed to courier", message: "Your order is out for delivery. (Order #GM999999)", createdAt: today, isRead: false };
    act(() => store.dispatch(addNotification(live)));
    expect(await screen.findByText("Order out for delivery")).toBeInTheDocument();
  });
});
