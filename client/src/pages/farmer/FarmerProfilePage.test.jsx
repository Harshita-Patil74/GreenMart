import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithStore } from "../../tests/testUtils.jsx";
import authApi from "../../api/authApi.js";
import farmerApi from "../../api/farmerApi.js";
import userApi from "../../api/userApi.js";
import FarmerProfilePage from "./FarmerProfilePage.jsx";
import Topbar from "../../components/layout/Topbar.jsx";

vi.mock("../../api/authApi.js", () => ({ default: { me: vi.fn() } }));
vi.mock("../../api/farmerApi.js", () => ({
  default: { get: vi.fn(), updateMe: vi.fn() },
}));
vi.mock("../../api/userApi.js", () => ({ default: { updateMe: vi.fn() } }));

describe("Farmer profile photo", () => {
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
    farmerApi.get.mockResolvedValue({
      data: { farmName: "Green Farm", address: "Gadag" },
    });
  });

  it("saves a selected profile photo to the signed-in account and updates the dashboard header", async () => {
    userApi.updateMe.mockImplementation(async (formData) => ({
      data: {
        _id: "farmer-1",
        name: "Green Farm",
        role: "farmer",
        avatar: `/uploads/avatars/${formData.get("avatar").name}`,
      },
    }));

    renderWithStore(
      <>
        <FarmerProfilePage />
        <Topbar />
      </>,
      {
        auth: {
          user: { _id: "farmer-1", name: "Green Farm", role: "farmer", avatar: "" },
          token: null,
        },
        cart: { items: [] },
      }
    );

    await screen.findByRole("heading", { name: "My Profile" });
    fireEvent.click(screen.getByRole("button", { name: "Change Photo" }));
    const file = new File(["profile image"], "farmer-photo.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Profile photo"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Save profile photo" }));

    await waitFor(() => expect(userApi.updateMe).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      const avatar = document.querySelector("header img");
      expect(avatar).not.toBeNull();
      expect(avatar.getAttribute("src")).toContain("/uploads/avatars/farmer-photo.png");
    });
    const submittedForm = userApi.updateMe.mock.calls[0][0];
    expect(submittedForm.get("avatar")).toBe(file);
  });
});
