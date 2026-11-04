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
    requestFarmerChanges: vi.fn(),
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
    adminApi.requestFarmerChanges.mockResolvedValue({});
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

  it("displays Resubmitted badge for a farmer who resubmitted after changes", async () => {
    adminApi.farmers.mockResolvedValueOnce({
      data: [{
        _id: "profile-resubmit",
        user: { _id: "farmer-resubmit", name: "Resubmitted Farmer", email: "resubmit@example.test", accountActivated: false },
        farmName: "Resubmitted Farm",
        certification: { verifiedByAdmin: false, rejectedByAdmin: false },
        verificationStatus: "Pending",
        changeRequestInstructions: "",
        submittedAt: "2026-03-01T00:00:00.000Z",
        verificationHistory: [
          { action: "Changes Requested", admin: "admin-1", timestamp: "2026-02-01T00:00:00.000Z", reason: "Fix certificate" },
          { action: "Resubmitted", timestamp: "2026-03-01T00:00:00.000Z" },
        ],
        createdAt: "2026-02-11T00:00:00.000Z",
      }],
    });
    renderWithStore(<AdminFarmers />);
    expect(await screen.findByText("Resubmitted Farmer")).toBeInTheDocument();
    expect(await screen.findByText("Resubmitted")).toBeInTheDocument();
  });

  it("shows resubmitted farmer in Pending tab only", async () => {
    adminApi.farmers.mockResolvedValueOnce({
      data: [{
        _id: "profile-resubmit",
        user: { _id: "farmer-resubmit", name: "Resubmitted Farmer", email: "resubmit@example.test", accountActivated: false },
        farmName: "Resubmitted Farm",
        certification: { verifiedByAdmin: false, rejectedByAdmin: false },
        verificationStatus: "Pending",
        verificationHistory: [{ action: "Resubmitted", timestamp: "2026-03-01T00:00:00.000Z" }],
        createdAt: "2026-02-11T00:00:00.000Z",
      }],
    });
    renderWithStore(<AdminFarmers />);
    expect(await screen.findByText("Pending (1)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pending (1)" }));
    expect(await screen.findByText("Resubmitted Farmer")).toBeInTheDocument();
  });

  it("does not show resubmitted farmer in Verified or Rejected tabs", async () => {
    adminApi.farmers.mockResolvedValueOnce({
      data: [{
        _id: "profile-resubmit",
        user: { _id: "farmer-resubmit", name: "Resubmitted Farmer", email: "resubmit@example.test", accountActivated: false },
        farmName: "Resubmitted Farm",
        certification: { verifiedByAdmin: false, rejectedByAdmin: false },
        verificationStatus: "Pending",
        verificationHistory: [{ action: "Resubmitted", timestamp: "2026-03-01T00:00:00.000Z" }],
        createdAt: "2026-02-11T00:00:00.000Z",
      }],
    });
    renderWithStore(<AdminFarmers />);
    expect(await screen.findByText("Verified (0)")).toBeInTheDocument();
    expect(await screen.findByText("Rejected (0)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Verified (0)" }));
    expect(screen.queryByText("Resubmitted Farmer")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pending (1)" }));
    expect(await screen.findByText("Resubmitted Farmer")).toBeInTheDocument();
  });

  it("displays latest farm and certificate details in View Details for resubmitted farmer", async () => {
    adminApi.farmers.mockResolvedValueOnce({
      data: [{
        _id: "profile-resubmit",
        user: { _id: "farmer-resubmit", name: "Resubmitted Farmer", email: "resubmit@example.test", accountActivated: false },
        farmName: "Resubmitted Farm",
        farmAddress: "123 Farm Road",
        category: "Vegetables",
        description: "Fresh organic vegetables",
        certification: { body: "Organic Cert", number: "ORG-2026", verifiedByAdmin: false, rejectedByAdmin: false },
        certificateDocument: { url: "https://example.com/cert.pdf", publicId: "cert" },
        photo: "/uploads/farms/photo.jpg",
        verificationStatus: "Pending",
        changeRequestInstructions: "",
        submittedAt: "2026-03-01T00:00:00.000Z",
        verificationHistory: [{ action: "Resubmitted", timestamp: "2026-03-01T00:00:00.000Z" }],
        createdAt: "2026-02-11T00:00:00.000Z",
      }],
    });
    renderWithStore(<AdminFarmers />);
    await screen.findByText("Resubmitted Farmer");
    fireEvent.click(screen.getByRole("button", { name: "View Details" }));
    expect(screen.getByText("Farmer Details")).toBeInTheDocument();
    expect(screen.getByText("123 Farm Road")).toBeInTheDocument();
    expect(screen.getByText("Fresh organic vegetables")).toBeInTheDocument();
  });

  it("offers Verify, Reject, and Request Changes actions for resubmitted farmers", async () => {
    adminApi.farmers.mockResolvedValueOnce({
      data: [{
        _id: "profile-resubmit",
        user: { _id: "farmer-resubmit", name: "Resubmitted Farmer", email: "resubmit@example.test", accountActivated: false },
        farmName: "Resubmitted Farm",
        certification: { verifiedByAdmin: false, rejectedByAdmin: false },
        verificationStatus: "Pending",
        verificationHistory: [{ action: "Resubmitted", timestamp: "2026-03-01T00:00:00.000Z" }],
        createdAt: "2026-02-11T00:00:00.000Z",
      }],
    });
    adminApi.verifyFarmer.mockResolvedValueOnce({ data: { certification: { verifiedByAdmin: true } } });
    adminApi.rejectFarmer.mockResolvedValueOnce({ data: { certification: { rejectedByAdmin: true } } });
    adminApi.requestFarmerChanges.mockResolvedValueOnce({ data: { changeRequestInstructions: "Fix docs" } });
    renderWithStore(<AdminFarmers />);
    await screen.findByText("Resubmitted Farmer");
    expect(screen.getByRole("button", { name: "Verify" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request Changes" })).toBeInTheDocument();
  });

  it("displays certificate name and number saved via certificateName/certificateNumber fields", async () => {
    adminApi.farmers.mockResolvedValueOnce({
      data: [{
        _id: "profile-cert-name",
        user: { _id: "farmer-cert-name", name: "Certificate Farmer", email: "certname@example.test", accountActivated: false },
        farmName: "Certificate Farm",
        certificateName: "Organic Farming Certificate",
        certificateNumber: "OFC2026KA5724",
        certification: { verifiedByAdmin: false, rejectedByAdmin: false },
        verificationStatus: "Pending",
        createdAt: "2026-02-11T00:00:00.000Z",
      }],
    });
    renderWithStore(<AdminFarmers />);
    expect(await screen.findByText("Certificate Farmer")).toBeInTheDocument();
    expect(screen.getByText("Organic Farming Certificate")).toBeInTheDocument();
    expect(screen.getByText("OFC2026KA5724")).toBeInTheDocument();
  });

  it("shows View Certificate link when certificateDocument URL exists", async () => {
    adminApi.farmers.mockResolvedValueOnce({
      data: [{
        _id: "profile-cert-doc",
        user: { _id: "farmer-cert-doc", name: "Doc Farmer", email: "certdoc@example.test", accountActivated: false },
        farmName: "Doc Farm",
        certificateName: "Organic Farming Certificate",
        certificateNumber: "OFC2026KA5724",
        certificateDocument: { url: "https://res.cloudinary.com/test/cert.pdf", publicId: "cert/123" },
        certification: { verifiedByAdmin: false, rejectedByAdmin: false },
        verificationStatus: "Pending",
        createdAt: "2026-02-11T00:00:00.000Z",
      }],
    });
    renderWithStore(<AdminFarmers />);
    await screen.findByText("Doc Farmer");
    const viewCertButton = screen.getByRole("button", { name: "View Certificate" });
    expect(viewCertButton).toBeInTheDocument();
  });

  it("shows Not provided when no certificate information exists", async () => {
    adminApi.farmers.mockResolvedValueOnce({
      data: [{
        _id: "profile-nocert",
        user: { _id: "farmer-nocert", name: "No Cert Farmer", email: "nocert@example.test", accountActivated: false },
        farmName: "Plain Farm",
        certification: { verifiedByAdmin: false, rejectedByAdmin: false },
        verificationStatus: "Pending",
        createdAt: "2026-02-11T00:00:00.000Z",
      }],
    });
    renderWithStore(<AdminFarmers />);
    expect(await screen.findByText("No Cert Farmer")).toBeInTheDocument();
    expect(screen.getByText("Not provided")).toBeInTheDocument();
  });
