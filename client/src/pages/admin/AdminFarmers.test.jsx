import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithStore } from "../../tests/testUtils.jsx";
import AdminFarmers from "./AdminFarmers.jsx";
import adminApi from "../../api/adminApi.js";
import toast from "react-hot-toast";

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("../../api/adminApi.js", () => ({
  default: {
    farmers: vi.fn(),
    createFarmer: vi.fn(),
    verifyFarmer: vi.fn(),
    rejectFarmer: vi.fn(),
    requestFarmerChanges: vi.fn(),
    resendFarmerActivation: vi.fn(),
  },
}));

const makeFarmer = (overrides = {}) => ({
  _id: overrides._id || `profile-${Math.random().toString(36).slice(2)}`,
  user: {
    _id: overrides.user?._id || `farmer-${Math.random().toString(36).slice(2)}`,
    name: overrides.user?.name || "Green Fields Farmer",
    email: overrides.user?.email || "farmer@example.test",
    accountActivated: overrides.user?.accountActivated ?? false,
  },
  farmName: overrides.farmName || "Green Fields Farm",
  certification: overrides.certification || { verifiedByAdmin: false, rejectedByAdmin: false },
  certificationName: overrides.certificationName || undefined,
  certificateNumber: overrides.certificateNumber || undefined,
  createdAt: overrides.createdAt || "2026-02-11T00:00:00.000Z",
  ...overrides,
});

const makePaginatedResponse = (farmers = [], total = farmers.length) => ({
  data: { items: farmers, total },
});

describe("Admin farmer management", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    adminApi.farmers.mockResolvedValue(makePaginatedResponse([
      makeFarmer({
        _id: "profile-1",
        user: { _id: "farmer-1", name: "Green Fields Farmer", email: "farmer@example.test", accountActivated: false },
        farmName: "Green Fields Farm",
        certification: { verifiedByAdmin: false, rejectedByAdmin: false },
        createdAt: "2026-02-11T00:00:00.000Z",
      }),
    ], 1));
    adminApi.verifyFarmer.mockResolvedValue({
      data: {
        certification: { body: "Organic", number: "CERT-123", verifiedByAdmin: true, rejectedByAdmin: false },
      },
    });
    adminApi.requestFarmerChanges.mockResolvedValue({});
  });

  describe("Initial rendering", () => {
    it("renders the farmer management page with heading and table", async () => {
      renderWithStore(<AdminFarmers />);

      await screen.findByText("Farmer Verification");
      expect(screen.getByText("Review farmer profiles and verify submitted certifications.")).toBeInTheDocument();
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    it("calls the farmers API with page 1 and limit 10 on mount", async () => {
      renderWithStore(<AdminFarmers />);
      await waitFor(() => expect(adminApi.farmers).toHaveBeenCalledWith({ page: 1, limit: 10, search: "" }));
    });

    it("displays farmer records returned by the API", async () => {
      renderWithStore(<AdminFarmers />);

      await screen.findByText("Green Fields Farmer");
      expect(screen.getByText("farmer@example.test")).toBeInTheDocument();
      expect(screen.getByText("Green Fields Farm")).toBeInTheDocument();
    });

    it("shows pagination controls when total records exceed page size", async () => {
      adminApi.farmers.mockResolvedValueOnce(makePaginatedResponse([
        makeFarmer({ _id: "p1", user: { _id: "f1", name: "Page 1 Farmer", email: "p1@example.test" } }),
        makeFarmer({ _id: "p2", user: { _id: "f2", name: "Page 2 Farmer", email: "p2@example.test" } }),
        makeFarmer({ _id: "p3", user: { _id: "f3", name: "Page 3 Farmer", email: "p3@example.test" } }),
        makeFarmer({ _id: "p4", user: { _id: "f4", name: "Page 4 Farmer", email: "p4@example.test" } }),
        makeFarmer({ _id: "p5", user: { _id: "f5", name: "Page 5 Farmer", email: "p5@example.test" } }),
        makeFarmer({ _id: "p6", user: { _id: "f6", name: "Page 6 Farmer", email: "p6@example.test" } }),
        makeFarmer({ _id: "p7", user: { _id: "f7", name: "Page 7 Farmer", email: "p7@example.test" } }),
        makeFarmer({ _id: "p8", user: { _id: "f8", name: "Page 8 Farmer", email: "p8@example.test" } }),
        makeFarmer({ _id: "p9", user: { _id: "f9", name: "Page 9 Farmer", email: "p9@example.test" } }),
        makeFarmer({ _id: "p10", user: { _id: "f10", name: "Page 10 Farmer", email: "p10@example.test" } }),
        makeFarmer({ _id: "p11", user: { _id: "f11", name: "Page 11 Farmer", email: "p11@example.test" } }),
        makeFarmer({ _id: "p12", user: { _id: "f12", name: "Page 12 Farmer", email: "p12@example.test" } }),
        makeFarmer({ _id: "p13", user: { _id: "f13", name: "Page 13 Farmer", email: "p13@example.test" } }),
        makeFarmer({ _id: "p14", user: { _id: "f14", name: "Page 14 Farmer", email: "p14@example.test" } }),
        makeFarmer({ _id: "p15", user: { _id: "f15", name: "Page 15 Farmer", email: "p15@example.test" } }),
        makeFarmer({ _id: "p16", user: { _id: "f16", name: "Page 16 Farmer", email: "p16@example.test" } }),
        makeFarmer({ _id: "p17", user: { _id: "f17", name: "Page 17 Farmer", email: "p17@example.test" } }),
        makeFarmer({ _id: "p18", user: { _id: "f18", name: "Page 18 Farmer", email: "p18@example.test" } }),
        makeFarmer({ _id: "p19", user: { _id: "f19", name: "Page 19 Farmer", email: "p19@example.test" } }),
        makeFarmer({ _id: "p20", user: { _id: "f20", name: "Page 20 Farmer", email: "p20@example.test" } }),
      ], 20));
      renderWithStore(<AdminFarmers />);

      await screen.findByText("Page 1 Farmer");
      expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Last" })).toBeInTheDocument();
    });

    it("hides pagination when there is only one page or no records", async () => {
      renderWithStore(<AdminFarmers />);
      await screen.findByText("Green Fields Farmer");
      expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    });
  });

  describe("Server-side pagination", () => {
    it("fetches page 2 when clicking Next", async () => {
      adminApi.farmers
        .mockResolvedValueOnce(makePaginatedResponse([
          makeFarmer({ _id: "p1", user: { _id: "f1", name: "Page 1 Farmer", email: "p1@example.test" } }),
        ], 20))
        .mockResolvedValueOnce(makePaginatedResponse([
          makeFarmer({ _id: "p2", user: { _id: "f2", name: "Page 2 Farmer", email: "p2@example.test" } }),
        ], 20));

      renderWithStore(<AdminFarmers />);
      await screen.findByText("Page 1 Farmer");
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      await waitFor(() => expect(adminApi.farmers).toHaveBeenLastCalledWith({ page: 2, limit: 10, search: "" }));
      await screen.findByText("Page 2 Farmer");
    });

    it("fetches page 1 when clicking Previous from page 2", async () => {
      adminApi.farmers
        .mockResolvedValueOnce(makePaginatedResponse([
          makeFarmer({ _id: "p1", user: { _id: "f1", name: "Page 1 Farmer", email: "p1@example.test" } }),
        ], 20))
        .mockResolvedValueOnce(makePaginatedResponse([
          makeFarmer({ _id: "p2", user: { _id: "f2", name: "Page 2 Farmer", email: "p2@example.test" } }),
        ], 20))
        .mockResolvedValueOnce(makePaginatedResponse([
          makeFarmer({ _id: "p1", user: { _id: "f1", name: "Page 1 Farmer", email: "p1@example.test" } }),
        ], 20));

      renderWithStore(<AdminFarmers />);
      await screen.findByText("Page 1 Farmer");
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      await waitFor(() => screen.findByText("Page 2 Farmer"));
      fireEvent.click(screen.getByRole("button", { name: "Previous" }));
      await waitFor(() => screen.findByText("Page 1 Farmer"));
      await waitFor(() => expect(adminApi.farmers).toHaveBeenLastCalledWith({ page: 1, limit: 10, search: "" }));
    });

    it("resets to page 1 when changing page size to 20", async () => {
      adminApi.farmers
        .mockResolvedValueOnce(makePaginatedResponse([
          makeFarmer({ _id: "p1", user: { _id: "f1", name: "Page 1 Farmer", email: "p1@example.test" } }),
        ], 20))
        .mockResolvedValueOnce(makePaginatedResponse([
          makeFarmer({ _id: "p2", user: { _id: "f2", name: "Page 2 Farmer", email: "p2@example.test" } }),
        ], 20))
        .mockResolvedValueOnce(makePaginatedResponse([
          makeFarmer({ _id: "p1", user: { _id: "f1", name: "Page 1 Farmer", email: "p1@example.test" } }),
        ], 20));

      renderWithStore(<AdminFarmers />);
      await screen.findByText("Page 1 Farmer");
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      await waitFor(() => screen.findByText("Page 2 Farmer"));
      const select = screen.getByRole("combobox");
      select.value = "20";
      select.dispatchEvent(new Event("change", { bubbles: true }));
      await waitFor(() => expect(adminApi.farmers).toHaveBeenLastCalledWith({ page: 1, limit: 20, search: "" }));
    });

    it("resets to page 1 when changing page size to 50", async () => {
      adminApi.farmers
        .mockResolvedValueOnce(makePaginatedResponse([
          makeFarmer({ _id: "p1", user: { _id: "f1", name: "Page 1 Farmer", email: "p1@example.test" } }),
        ], 20))
        .mockResolvedValueOnce(makePaginatedResponse([
          makeFarmer({ _id: "p2", user: { _id: "f2", name: "Page 2 Farmer", email: "p2@example.test" } }),
        ], 20))
        .mockResolvedValueOnce(makePaginatedResponse([
          makeFarmer({ _id: "p1", user: { _id: "f1", name: "Page 1 Farmer", email: "p1@example.test" } }),
        ], 20));

      renderWithStore(<AdminFarmers />);
      await screen.findByText("Page 1 Farmer");
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      await waitFor(() => screen.findByText("Page 2 Farmer"));
      const select = screen.getByRole("combobox");
      select.value = "50";
      select.dispatchEvent(new Event("change", { bubbles: true }));
      await waitFor(() => expect(adminApi.farmers).toHaveBeenLastCalledWith({ page: 1, limit: 50, search: "" }));
    });
  });

  describe("Search functionality", () => {
    it("sends search parameter to the backend and resets page to 1", async () => {
      adminApi.farmers
        .mockResolvedValueOnce(makePaginatedResponse([
          makeFarmer({ _id: "p1", user: { _id: "f1", name: "Green Fields Farmer", email: "farmer@example.test" } }),
        ], 1))
        .mockResolvedValueOnce(makePaginatedResponse([
          makeFarmer({ _id: "p2", user: { _id: "f2", name: "Search Result", email: "search@example.test" } }),
        ], 1));
      renderWithStore(<AdminFarmers />);
      await screen.findByText("Green Fields Farmer");
      fireEvent.change(screen.getByPlaceholderText("Search farmers"), { target: { value: "Search Result" } });
      await waitFor(() => expect(adminApi.farmers).toHaveBeenLastCalledWith({ page: 1, limit: 10, search: "Search Result" }));
    });

    it("clearing search restores the complete farmer list", async () => {
      adminApi.farmers
        .mockResolvedValueOnce(makePaginatedResponse([
          makeFarmer({ _id: "p1", user: { _id: "f1", name: "Green Fields Farmer", email: "farmer@example.test" } }),
        ], 1))
        .mockResolvedValueOnce(makePaginatedResponse([
          makeFarmer({ _id: "p2", user: { _id: "f2", name: "Search Result", email: "search@example.test" } }),
        ], 1))
        .mockResolvedValueOnce(makePaginatedResponse([
          makeFarmer({ _id: "p3", user: { _id: "f3", name: "All Farmers", email: "all@example.test" } }),
        ], 1));
      renderWithStore(<AdminFarmers />);
      await screen.findByText("Green Fields Farmer");
      fireEvent.change(screen.getByPlaceholderText("Search farmers"), { target: { value: "Search Result" } });
      await waitFor(() => screen.findByText("Search Result"));
      fireEvent.change(screen.getByPlaceholderText("Search farmers"), { target: { value: "" } });
      await waitFor(() => screen.findByText("All Farmers"));
    });
  });

  describe("UI states", () => {
    it("shows loading state while fetching farmers", async () => {
      adminApi.farmers.mockImplementation(() => new Promise(() => {}));
      renderWithStore(<AdminFarmers />);
      expect(screen.getByText("Loading farmer profiles...")).toBeInTheDocument();
    });

    it("shows empty state when no farmers are returned", async () => {
      adminApi.farmers.mockResolvedValue(makePaginatedResponse([], 0));
      renderWithStore(<AdminFarmers />);
      await waitFor(() => expect(screen.getByText("No farmer profiles in this view.")).toBeInTheDocument());
    });

    it("shows error message when API fails", async () => {
      adminApi.farmers.mockRejectedValueOnce(new Error("Connection failed"));
      renderWithStore(<AdminFarmers />);
      await waitFor(() => expect(screen.getByText("Connection failed")).toBeInTheDocument());
    });

    it("retries loading when clicking Retry on error state", async () => {
      adminApi.farmers
        .mockRejectedValueOnce(new Error("Connection failed"))
        .mockResolvedValueOnce(makePaginatedResponse([
          makeFarmer({ _id: "p1", user: { _id: "f1", name: "Retry Farmer", email: "retry@example.test" } }),
        ], 1))
        .mockResolvedValueOnce(makePaginatedResponse([
          makeFarmer({ _id: "p1", user: { _id: "f1", name: "Retry Farmer", email: "retry@example.test" } }),
        ], 1));
      renderWithStore(<AdminFarmers />);
      await waitFor(() => expect(screen.getByText("Connection failed")).toBeInTheDocument());
      fireEvent.click(screen.getByText("Retry"));
      await waitFor(() => screen.findByText("Retry Farmer"));
    });
  });

  describe("Farmer actions", () => {
    it("verifies a farmer and updates the list", async () => {
      renderWithStore(<AdminFarmers />);
      await screen.findByText("Green Fields Farmer");
      fireEvent.click(screen.getByRole("button", { name: "Verify" }));
      await waitFor(() => expect(adminApi.verifyFarmer).toHaveBeenCalledWith("farmer-1"));
      fireEvent.click(screen.getByRole("button", { name: "Verified (1)" }));
      await waitFor(() => screen.getByText("Organic"));
      expect(screen.getByText("CERT-123")).toBeInTheDocument();
    });

    it("rejects a farmer with confirmation", async () => {
      window.confirm = vi.fn(() => true);
      window.prompt = vi.fn(() => "Reason");
      adminApi.rejectFarmer.mockResolvedValue({ data: { certification: { rejectedByAdmin: true } } });
      renderWithStore(<AdminFarmers />);
      await screen.findByText("Green Fields Farmer");
      fireEvent.click(screen.getByRole("button", { name: "Reject" }));
      await waitFor(() => expect(adminApi.rejectFarmer).toHaveBeenCalledWith("farmer-1", "Reason"));
    });

    it("requests changes for a farmer", async () => {
      window.prompt = vi.fn(() => "Fix certificate");
      adminApi.requestFarmerChanges.mockResolvedValue({ data: { changeRequestInstructions: "Fix docs" } });
      renderWithStore(<AdminFarmers />);
      await screen.findByText("Green Fields Farmer");
      fireEvent.click(screen.getByRole("button", { name: "Request Changes" }));
      await waitFor(() => expect(adminApi.requestFarmerChanges).toHaveBeenCalledWith("farmer-1", "Fix certificate"));
      expect(toast.success).toHaveBeenCalledWith("Changes requested.");
    });
  });

  describe("Tab filtering", () => {
    it("shows only pending farmers when Pending tab is active", async () => {
      adminApi.farmers.mockResolvedValueOnce(makePaginatedResponse([
        makeFarmer({ _id: "p1", user: { _id: "f1", name: "Pending Farmer", email: "p1@example.test" }, certification: { verifiedByAdmin: false, rejectedByAdmin: false } }),
        makeFarmer({ _id: "p2", user: { _id: "f2", name: "Verified Farmer", email: "p2@example.test" }, certification: { verifiedByAdmin: true, rejectedByAdmin: false } }),
      ], 2));
      renderWithStore(<AdminFarmers />);
      await screen.findByText("Pending Farmer");
      fireEvent.click(screen.getByRole("button", { name: "Pending (1)" }));
      await waitFor(() => screen.findByText("Pending Farmer"));
      expect(screen.queryByText("Verified Farmer")).not.toBeInTheDocument();
    });

    it("shows only verified farmers when Verified tab is active", async () => {
      adminApi.farmers.mockResolvedValueOnce(makePaginatedResponse([
        makeFarmer({ _id: "p1", user: { _id: "f1", name: "Pending Farmer", email: "p1@example.test" }, certification: { verifiedByAdmin: false, rejectedByAdmin: false } }),
        makeFarmer({ _id: "p2", user: { _id: "f2", name: "Verified Farmer", email: "p2@example.test" }, certification: { verifiedByAdmin: true, rejectedByAdmin: false } }),
      ], 2));
      renderWithStore(<AdminFarmers />);
      await screen.findByText("Pending Farmer");
      fireEvent.click(screen.getByRole("button", { name: "Verified (1)" }));
      await waitFor(() => screen.findByText("Verified Farmer"));
      expect(screen.queryByText("Pending Farmer")).not.toBeInTheDocument();
    });
  });
});
