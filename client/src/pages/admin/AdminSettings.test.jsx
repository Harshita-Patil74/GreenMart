import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminSettings from "./AdminSettings.jsx";
import categoryApi from "../../api/categoryApi.js";
import settingsApi from "../../api/settingsApi.js";

vi.mock("../../api/categoryApi.js", () => ({
  default: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    toggleActive: vi.fn(),
  },
}));

vi.mock("../../api/settingsApi.js", () => ({
  default: { get: vi.fn() },
}));

vi.mock("../../hooks/useAuth.js", () => ({
  default: () => ({ user: { name: "Admin", email: "admin@example.test" } }),
}));

const categories = [
  { _id: "category-dairy", name: "Dairy & Eggs", icon: "Milk", isActive: true },
  { _id: "category-grains", name: "Grains", icon: "Wheat", isActive: false },
];

describe("Platform Settings category editing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsApi.get.mockResolvedValue({ data: { deliveryCharge: 30, expressDeliveryCharge: 4, remoteAreaDeliveryCharge: 7 } });
    categoryApi.list.mockResolvedValue({ data: categories });
    categoryApi.update.mockImplementation((id, changes) => Promise.resolve({
      data: { ...categories.find((category) => category._id === id), ...changes },
    }));
    categoryApi.toggleActive.mockResolvedValue({
      data: { ...categories[1], isActive: true },
    });
  });

  it("saves one category without discarding another row's draft or changing its status", async () => {
    render(<MemoryRouter><AdminSettings /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Product Categories" }));

    fireEvent.change(screen.getByRole("textbox", { name: "Category name Dairy & Eggs" }), { target: { value: "Dairy" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Category name Grains" }), { target: { value: "Whole Grains" } });
    fireEvent.click(screen.getByRole("button", { name: "Save category Dairy & Eggs" }));

    await waitFor(() => expect(categoryApi.update).toHaveBeenCalledWith("category-dairy", { name: "Dairy", icon: "Milk" }));
    expect(categoryApi.update).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("textbox", { name: "Category name Grains" })).toHaveValue("Whole Grains");
    expect(screen.getByRole("button", { name: "Activate category Grains" })).toBeInTheDocument();
  });

  it("toggles only the selected category", async () => {
    render(<MemoryRouter><AdminSettings /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Product Categories" }));

    fireEvent.click(screen.getByRole("button", { name: "Activate category Grains" }));

    await waitFor(() => expect(categoryApi.toggleActive).toHaveBeenCalledWith("category-grains"));
    expect(screen.getByRole("button", { name: "Deactivate category Dairy & Eggs" })).toBeInTheDocument();
  });
});
