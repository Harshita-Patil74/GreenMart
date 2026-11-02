import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import AdminNotifications from "./AdminNotifications.jsx";
import notificationApi from "../../api/notificationApi.js";
import notificationsReducer, { addNotification } from "../../features/notifications/notificationsSlice.js";

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
  { _id: "offer-1", type: "newOfferAdmin", category: "offers", title: "Offer submitted for review", message: "Fig offer needs approval.", createdAt: today, isRead: false },
  { _id: "offer-2", type: "offerRejected", category: "offers", title: "Offer was not approved", message: "Please update the dates.", createdAt: today, isRead: true },
  { _id: "order-1", type: "newOrderAdmin", category: "orders", title: "New order received", message: "A new order was placed.", createdAt: today, isRead: false },
  { _id: "farmer-1", type: "newFarmerAdmin", category: "farmers", title: "New farmer registration", message: "A farmer registered.", createdAt: today, isRead: true },
];

function renderPage() {
  const store = configureStore({
    reducer: { notifications: notificationsReducer },
  });
  const view = render(
    <Provider store={store}>
      <MemoryRouter><AdminNotifications /></MemoryRouter>
    </Provider>
  );
  return { ...view, store };
}

describe("Admin Notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationApi.list.mockResolvedValue({ data: notifications });
    notificationApi.unreadCount.mockResolvedValue({ data: { count: 2 } });
    notificationApi.markRead.mockResolvedValue({ data: { message: "ok" } });
    notificationApi.markAllRead.mockResolvedValue({ data: { message: "ok" } });
    notificationApi.remove.mockResolvedValue({ data: { message: "ok" } });
  });

  it("shows all categories in one scrollable filter row and counts from notification records", async () => {
    renderPage();
    await screen.findByText("Offer submitted for review");

    const categoryNav = screen.getByRole("navigation", { name: "Notification categories" });
    expect(categoryNav).toHaveClass("overflow-x-auto");
    const categoryButtons = within(categoryNav).getAllByRole("button");
    expect(categoryButtons.map((button) => button.textContent.replace(/\d+/g, "").trim())).toEqual([
      "All", "Orders", "Farmers", "Products", "Inventory", "Offers", "Support", "Reviews", "Security",
    ]);
    expect(categoryButtons[5]).toHaveTextContent("Offers");
    expect(categoryButtons[5]).toHaveTextContent("1");
    expect(screen.getByText("Total Notifications").nextElementSibling).toHaveTextContent("4");
    expect(screen.getByText("Unread Notifications").nextElementSibling).toHaveTextContent("2");
    expect(screen.getByText("Today").nextElementSibling).toHaveTextContent("4");
  });

  it("filters only Offers and All restores notifications from every category", async () => {
    renderPage();
    await screen.findByText("Offer submitted for review");

    const categoryNav = screen.getByRole("navigation", { name: "Notification categories" });
    fireEvent.click(within(categoryNav).getByRole("button", { name: /Offers/ }));
    expect(screen.getByText("Offer submitted for review")).toBeInTheDocument();
    expect(screen.getByText("Offer was not approved")).toBeInTheDocument();
    expect(screen.queryByText("New order received")).not.toBeInTheDocument();

    fireEvent.click(within(categoryNav).getByRole("button", { name: /All/ }));
    expect(screen.getByText("New order received")).toBeInTheDocument();
    expect(screen.getByText("New farmer registration")).toBeInTheDocument();
  });

  it("marks one notification read and updates unread summary", async () => {
    renderPage();
    await screen.findByText("Offer submitted for review");
    fireEvent.click(screen.getByRole("button", { name: "Mark Offer submitted for review as read" }));

    await waitFor(() => expect(notificationApi.markRead).toHaveBeenCalledWith("offer-1"));
    expect(screen.getByText("Unread Notifications").nextElementSibling).toHaveTextContent("1");
    expect(screen.queryByRole("button", { name: "Mark Offer submitted for review as read" })).not.toBeInTheDocument();
  });

  it("marks all read and deletes notifications through existing APIs", async () => {
    renderPage();
    await screen.findByText("Offer submitted for review");
    fireEvent.click(screen.getByRole("button", { name: "Mark All Read" }));

    await waitFor(() => expect(notificationApi.markAllRead).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Unread Notifications").nextElementSibling).toHaveTextContent("0");
    expect(screen.queryByRole("button", { name: "Mark All Read" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete Offer submitted for review" }));
    await waitFor(() => expect(notificationApi.remove).toHaveBeenCalledWith("offer-1"));
    expect(screen.getByText("Total Notifications").nextElementSibling).toHaveTextContent("3");
  });

  it("adds a socket notification once through the existing notification slice", async () => {
    const { store } = renderPage();
    await screen.findByText("Offer submitted for review");
    const socketNotification = {
      _id: "offer-live",
      category: "offers",
      title: "Offer approved",
      message: "Offer is now approved.",
      createdAt: today,
      isRead: false,
    };

    act(() => {
      store.dispatch(addNotification(socketNotification));
      store.dispatch(addNotification(socketNotification));
    });
    expect(await screen.findByText("Offer approved")).toBeInTheDocument();
    expect(screen.getByText("Total Notifications").nextElementSibling).toHaveTextContent("5");
    expect(screen.getByText("Unread Notifications").nextElementSibling).toHaveTextContent("3");
  });
});
