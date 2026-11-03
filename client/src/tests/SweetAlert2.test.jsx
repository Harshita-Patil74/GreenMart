import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Swal from "sweetalert2";
import { showConfirm, showSuccess, showError, showDeleteConfirm, closeAlert } from "../utils/alertUtils.js";

describe("SweetAlert2 helpers", () => {
  beforeEach(() => {
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    vi.spyOn(Swal, "fire").mockResolvedValue({ isConfirmed: true, isDismissed: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("showConfirm resolves with isConfirmed when user confirms", async () => {
    const result = await showConfirm("Delete item?", "Are you sure?");
    expect(result.isConfirmed).toBe(true);
  });

  it("showConfirm resolves without isConfirmed when user cancels", async () => {
    vi.spyOn(Swal, "fire").mockResolvedValueOnce({ isConfirmed: false, isDismissed: true });
    const result = await showConfirm("Delete item?", "Are you sure?");
    expect(result.isConfirmed).toBe(false);
  });

  it("showSuccess fires success alert", async () => {
    await showSuccess("Saved", "Product saved successfully.");
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Saved", text: "Product saved successfully.", icon: "success" })
    );
  });

  it("showError fires error alert", async () => {
    await showError("Failed", "Could not save.");
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Failed", text: "Could not save.", icon: "error" })
    );
  });

  it("showDeleteConfirm includes delete text", async () => {
    await showDeleteConfirm("Product");
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Delete Product?", text: "This action cannot be undone." })
    );
  });

  it("closeAlert closes all alerts", () => {
    const closeSpy = vi.spyOn(Swal, "close");
    closeAlert();
    expect(closeSpy).toHaveBeenCalled();
  });
});
