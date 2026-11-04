import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithStore } from "../../tests/testUtils.jsx";
import authApi from "../../api/authApi.js";
import farmerApi from "../../api/farmerApi.js";
import userApi from "../../api/userApi.js";
import FarmerProfilePage from "./FarmerProfilePage.jsx";
import Topbar from "../../components/layout/Topbar.jsx";

vi.mock("../../api/authApi.js", () => ({ default: { me: vi.fn() } }));
vi.mock("../../api/farmerApi.js", () => ({
  default: {
    get: vi.fn(),
    updateMe: vi.fn(),
    profile: vi.fn(),
    updateProfile: vi.fn(),
    resubmitApplication: vi.fn(),
    uploadCertificate: vi.fn(),
  },
}));
vi.mock("../../api/userApi.js", () => ({ default: { updateMe: vi.fn() } }));

const baseProfile = {
  _id: "profile-1",
  user: "farmer-1",
  farmName: "Green Farm",
  farmAddress: "Gadag",
  category: "Vegetables",
  description: "Fresh organic vegetables",
  photo: "/uploads/farms/farm.png",
  certificateName: "Organic Farming Certificate",
  certificateNumber: "OFC2026KA5724",
  certificateDocument: { url: "https://res.cloudinary.com/test/cert.pdf", publicId: "cert/123" },
  verificationStatus: "Pending",
  changeRequestInstructions: "",
};

const renderProfilePage = () =>
  renderWithStore(
    <><FarmerProfilePage /><Topbar /></>,
    { auth: { user: { _id: "farmer-1", name: "Green Farm", role: "farmer" }, token: null }, cart: { items: [] } }
  );

const switchToFarmDetails = () => {
  fireEvent.click(screen.getByRole("button", { name: "Farm Details" }));
};

describe("Farmer profile certificate persistence", () => {
  afterEach(() => {
    delete URL.createObjectURL;
    delete URL.revokeObjectURL;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:farmer-preview") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    authApi.me.mockResolvedValue({
      data: { _id: "farmer-1", name: "Green Farm", email: "farmer@example.test", role: "farmer", avatar: "" },
    });
    farmerApi.get.mockResolvedValue({ data: baseProfile });
    farmerApi.profile.mockResolvedValue({ data: baseProfile });
    farmerApi.updateMe.mockResolvedValue({ data: baseProfile });
    farmerApi.updateProfile.mockResolvedValue({ data: baseProfile });
    farmerApi.resubmitApplication.mockResolvedValue({ data: baseProfile });
    farmerApi.uploadCertificate.mockResolvedValue({ data: { certificateDocument: { url: "https://res.cloudinary.com/test/new-cert.pdf", publicId: "cert/new" } } });
  });

  it("loads and displays saved certificate name, number, and document", async () => {
    renderProfilePage();
    await screen.findByRole("heading", { name: "My Profile" });
    switchToFarmDetails();

    expect(screen.getByDisplayValue("Organic Farming Certificate")).toBeInTheDocument();
    expect(screen.getByDisplayValue("OFC2026KA5724")).toBeInTheDocument();
    expect(screen.getByText("View current certificate")).toBeInTheDocument();
  });

  it("saves certificate name and number via Save Farm Details", async () => {
    farmerApi.updateMe.mockImplementation(async (formData) => ({
      data: { ...baseProfile, certificateName: formData.get("certificateName"), certificateNumber: formData.get("certificateNumber") },
    }));

    renderProfilePage();
    await screen.findByRole("heading", { name: "My Profile" });
    switchToFarmDetails();

    const certNameInput = screen.getByLabelText("Certificate Name");
    const certNumberInput = screen.getByLabelText("Certificate Number");
    fireEvent.change(certNameInput, { target: { value: "New Organic Certificate" } });
    fireEvent.change(certNumberInput, { target: { value: "NEW-2026-001" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Farm Details/ }));

    await waitFor(() => expect(farmerApi.updateMe).toHaveBeenCalled());
    const formData = farmerApi.updateMe.mock.calls[0][0];
    expect(formData.get("certificateName")).toBe("New Organic Certificate");
    expect(formData.get("certificateNumber")).toBe("NEW-2026-001");
  });

  it("uploads a certificate document and saves its Cloudinary URL", async () => {
    renderProfilePage();
    await screen.findByRole("heading", { name: "My Profile" });
    switchToFarmDetails();

    const fileInput = document.querySelector('input[type="file"][accept*="pdf"]');
    const certFile = new File(["certificate content"], "certificate.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [certFile] } });

    fireEvent.click(screen.getByRole("button", { name: "Upload Certificate" }));

    await waitFor(() => expect(farmerApi.uploadCertificate).toHaveBeenCalled());
    const fd = farmerApi.uploadCertificate.mock.calls[0][0];
    expect(fd.get("certificate")).toBe(certFile);
  });

  it("preserves certificate information when updating farm name/address", async () => {
    farmerApi.updateMe.mockImplementation(async (formData) => ({
      data: {
        ...baseProfile,
        farmName: formData.get("farmName"),
        address: formData.get("address"),
        certificateName: baseProfile.certificateName,
        certificateNumber: baseProfile.certificateNumber,
      },
    }));

    renderProfilePage();
    await screen.findByRole("heading", { name: "My Profile" });
    switchToFarmDetails();

    const farmNameInput = screen.getByLabelText("Farm Name");
    fireEvent.change(farmNameInput, { target: { value: "Updated Farm Name" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Farm Details/ }));

    await waitFor(() => expect(farmerApi.updateMe).toHaveBeenCalled());
    const formData = farmerApi.updateMe.mock.calls[0][0];
    expect(formData.get("farmName")).toBe("Updated Farm Name");
    expect(formData.get("certificateName")).toBe("Organic Farming Certificate");
    expect(formData.get("certificateNumber")).toBe("OFC2026KA5724");
  });

  it("preserves existing certificate document when updating certificate name/number without replacement", async () => {
    farmerApi.updateMe.mockResolvedValue({ data: baseProfile });

    renderProfilePage();
    await screen.findByRole("heading", { name: "My Profile" });
    switchToFarmDetails();

    const certNameInput = screen.getByLabelText("Certificate Name");
    fireEvent.change(certNameInput, { target: { value: "Updated Certificate Name" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Farm Details/ }));

    await waitFor(() => expect(farmerApi.updateMe).toHaveBeenCalled());
    const formData = farmerApi.updateMe.mock.calls[0][0];
    expect(formData.get("certificateName")).toBe("Updated Certificate Name");
    expect(formData.get("certificateNumber")).toBe("OFC2026KA5724");
    expect(formData.get("certificate")).toBeNull();
  });

  it("replacing the document updates its URL", async () => {
    const newFile = new File(["new cert"], "new-certificate.pdf", { type: "application/pdf" });

    renderProfilePage();
    await screen.findByRole("heading", { name: "My Profile" });
    switchToFarmDetails();

    const fileInput = document.querySelector('input[type="file"][accept*="pdf"]');
    fireEvent.change(fileInput, { target: { files: [newFile] } });

    fireEvent.click(screen.getByRole("button", { name: "Upload Certificate" }));

    await waitFor(() => expect(farmerApi.uploadCertificate).toHaveBeenCalled());
    const fd = farmerApi.uploadCertificate.mock.calls[0][0];
    expect(fd.get("certificate")).toBe(newFile);
  });

  it("resubmit application preserves certificate fields", async () => {
    renderProfilePage();
    await screen.findByRole("heading", { name: "My Profile" });
    switchToFarmDetails();

    fireEvent.click(screen.getByRole("button", { name: "Resubmit Application" }));

    await waitFor(() => expect(farmerApi.resubmitApplication).toHaveBeenCalledTimes(1));
  });

  it("loads profile after refresh showing saved certificate data", async () => {
    farmerApi.get.mockResolvedValue({ data: { ...baseProfile, certificateName: "Refreshed Certificate", certificateNumber: "REF-2026-999" } });

    renderProfilePage();
    await screen.findByRole("heading", { name: "My Profile" });
    switchToFarmDetails();

    expect(screen.getByDisplayValue("Refreshed Certificate")).toBeInTheDocument();
    expect(screen.getByDisplayValue("REF-2026-999")).toBeInTheDocument();
  });
});
