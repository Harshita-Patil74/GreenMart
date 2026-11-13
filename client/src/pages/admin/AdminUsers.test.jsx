import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminUsers from "./AdminUsers.jsx";
import adminApi from "../../api/adminApi.js";

vi.mock("../../api/adminApi.js", () => ({
  default: {
    users: vi.fn(),
    updateUser: vi.fn(),
  },
}));

function makeUser(index, overrides = {}) {
  return {
    _id: `user-${index}`,
    name: `User ${index}`,
    email: `user${index}@example.test`,
    phone: `555-${index}`,
    role: "customer",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderPage() {
  return render(<MemoryRouter><AdminUsers /></MemoryRouter>);
}

describe("Admin user management pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.users.mockImplementation(({ page = 1, limit = 10 } = {}) => Promise.resolve({
      data: {
        items: page === 1
          ? Array.from({ length: Math.min(limit, 10) }, (_, index) => makeUser(index + 1))
          : [makeUser(11)],
        total: 11,
        page,
        pages: Math.ceil(11 / limit),
        limit,
      },
    }));
    adminApi.updateUser.mockResolvedValue({ data: makeUser(1) });
  });

  it("renders the server's next page without filtering or slicing it a second time", async () => {
    renderPage();
    expect(await screen.findByText("User 1")).toBeInTheDocument();
    expect(screen.getByText("Showing 1–10 of 11 users")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "2" }));

    expect(await screen.findByText("User 11")).toBeInTheDocument();
    expect(screen.queryByText("User 1")).not.toBeInTheDocument();
    expect(screen.getByText("Showing 11–11 of 11 users")).toBeInTheDocument();
    expect(adminApi.users).toHaveBeenLastCalledWith({
      page: 2,
      limit: 10,
      role: undefined,
      status: undefined,
      search: undefined,
    });
  });

  it("sends search, role, and status filters to the server together", async () => {
    renderPage();
    await screen.findByText("User 1");

    fireEvent.change(screen.getByRole("textbox", { name: "Search users" }), { target: { value: "555-11" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Filter by role" }), { target: { value: "customer" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Filter by status" }), { target: { value: "blocked" } });

    await waitFor(() => expect(adminApi.users).toHaveBeenLastCalledWith({
      page: 1,
      limit: 10,
      role: "customer",
      status: "blocked",
      search: "555-11",
    }));
  });

  it("resets to page one when the page size changes", async () => {
    renderPage();
    await screen.findByText("User 1");
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    await screen.findByText("User 11");

    fireEvent.change(screen.getByLabelText("Page size"), { target: { value: "20" } });

    await waitFor(() => expect(adminApi.users).toHaveBeenLastCalledWith({
      page: 1,
      limit: 20,
      role: undefined,
      status: undefined,
      search: undefined,
    }));
  });
});
