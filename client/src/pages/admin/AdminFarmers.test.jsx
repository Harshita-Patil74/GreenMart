import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithStore } from "../../tests/testUtils.jsx";
import AdminFarmers from "./AdminFarmers.jsx";
import adminApi from "../../api/adminApi.js";
import toast from "react-hot-toast";

vi.mock("../../api/adminApi.js", () => ({
  default: {
    farmers: vi.fn(),
    createFarmer: vi.fn(),
    verifyFarmer: vi.fn(),
    rejectFarmer: vi.fn(),
  },
}));
describe("Admin farmer management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.farmers.mockResolvedValue({
      data: [{
        _id: "profile-1",
        user: { _id: "farmer-1", name: "Green Fields Farmer", email: "farmer@example.test", accountActivated: false },
        farmName: "Green Fields Farm",
        certification: { verifiedByAdmin: false, rejectedByAdmin: false },
        createdAt: "2026-02-11T00:00:00.000Z",
      }],
    });
    adminApi.verifyFarmer.mockResolvedValue({
      data: {
        certification: { body: "Organic", number: "CERT-123", verifiedByAdmin: true, rejectedByAdmin: false },
      },
    });
  });

  it("verifies the selected farmer through the admin API and updates the list", async () => {
    renderWithStore(<AdminFarmers />);

    expect(await screen.findByText("Green Fields Farmer")).toBeInTheDocument();
    expect(screen.getByText("farmer@example.test")).toBeInTheDocument();
    expect(screen.getByText("2/11/2026")).toBeInTheDocument();
    expect(screen.getByText("Not provided")).toBeInTheDocument();
    expect(screen.queryByText("CERT-123")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() => expect(adminApi.verifyFarmer).toHaveBeenCalledWith("farmer-1"));
    const verifiedTab = await screen.findByRole("button", { name: "Verified (1)" });
    fireEvent.click(verifiedTab);
    expect(await screen.findByText("Organic")).toBeInTheDocument();
    expect(screen.getByText("CERT-123")).toBeInTheDocument();
    expect(await screen.findByText("Green Fields Farmer")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Verify" })).not.toBeInTheDocument();
  });

  it("creates a farmer account and displays a development activation link", async () => {
    const toastSuccess = vi.spyOn(toast, "success").mockImplementation(() => {});
    adminApi.createFarmer.mockResolvedValueOnce({ data: { message: "Farmer created", activationLink: "http://localhost:5173/activate-account?token=development-token" } });
    renderWithStore(<AdminFarmers />);

    fireEvent.click(screen.getByRole("button", { name: "Add Farmer" }));
    fireEvent.change(screen.getByPlaceholderText("Full Name"), { target: { value: "New Farmer" } });
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "new.farmer@example.com" } });
    const createButton = screen.getByRole("button", { name: "Create" });
    expect(createButton).toBeEnabled();
    fireEvent.click(createButton);

    await waitFor(() => expect(adminApi.createFarmer).toHaveBeenCalledWith(expect.any(FormData)));
    expect(await screen.findByRole("button", { name: "Add Farmer" })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Full Name")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Password")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Confirm Password")).not.toBeInTheDocument();
    expect(screen.getByText("Development-only activation link")).toBeInTheDocument();
    expect(toastSuccess).toHaveBeenCalledWith("Farmer created");
  });

  it("shows the backend reason when creating a farmer returns a bad request", async () => {
    const toastError = vi.spyOn(toast, "error").mockImplementation(() => {});
    adminApi.createFarmer.mockRejectedValueOnce({ message: "Email is already registered.", status: 400 });
    renderWithStore(<AdminFarmers />);

    fireEvent.click(screen.getByRole("button", { name: "Add Farmer" }));
    fireEvent.change(screen.getByPlaceholderText("Full Name"), { target: { value: "Existing Farmer" } });
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "existing.farmer@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Email is already registered."));
  });

  it("keeps Create disabled until the farmer name and email are valid", async () => {
    renderWithStore(<AdminFarmers />);
    fireEvent.click(screen.getByRole("button", { name: "Add Farmer" }));

    fireEvent.change(screen.getByPlaceholderText("Full Name"), { target: { value: "New Farmer" } });
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: ".farmer@example.com" } });

    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });

  it("enters certification fields when creating a farmer and does not auto-verify", async () => {
    adminApi.createFarmer.mockResolvedValueOnce({ data: { message: "Farmer created" } });
    renderWithStore(<AdminFarmers />);

    fireEvent.click(screen.getByRole("button", { name: "Add Farmer" }));
    fireEvent.change(screen.getByPlaceholderText("Full Name"), { target: { value: "Certified Farmer" } });
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "certified@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Certification Name (e.g. Organic Farming Certificate)"), { target: { value: "Organic Farming Certificate" } });
    fireEvent.change(screen.getByPlaceholderText("Certificate Number (e.g. OFC2026KA5724)"), { target: { value: "OFC2026KA5724" } });

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(adminApi.createFarmer).toHaveBeenCalledWith(expect.any(FormData)));
  });
  });

  it("displays saved certification name and certificate number, or Not provided when missing", async () => {
    adminApi.farmers.mockResolvedValueOnce({
      data: [
        {
          _id: "profile-cert",
          user: { _id: "farmer-cert", name: "Certified Farmer", email: "cert@example.test", accountActivated: false },
          farmName: "Certified Farm",
          certification: { body: "Organic Farming Certificate", number: "OFC2026KA5724", verifiedByAdmin: false, rejectedByAdmin: false },
          createdAt: "2026-02-11T00:00:00.000Z",
        },
        {
          _id: "profile-none",
          user: { _id: "farmer-none", name: "No Cert Farmer", email: "none@example.test", accountActivated: false },
          farmName: "Plain Farm",
          certification: { verifiedByAdmin: false, rejectedByAdmin: false },
          createdAt: "2026-02-11T00:00:00.000Z",
        },
      ],
    });
    renderWithStore(<AdminFarmers />);

    expect(await screen.findByText("Organic Farming Certificate")).toBeInTheDocument();
    expect(screen.getByText("OFC2026KA5724")).toBeInTheDocument();
    expect(screen.getByText("Not provided")).toBeInTheDocument();
    expect(screen.getAllByText("Pending")).toHaveLength(2);
  });
