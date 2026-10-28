import { downloadPdf } from "./downloadPdf.js";

describe("downloadPdf", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:greenmart-report"),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
      expect(this.getAttribute("href")).toBe("blob:greenmart-report");
      expect(this.download).toBe("greenmart-sales-report.pdf");
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("downloads valid PDF bytes through a temporary object URL", async () => {
    const blob = new Blob(["%PDF-1.7\nvalid"], { type: "application/pdf" });
    await downloadPdf({ data: blob }, "greenmart-sales-report.pdf");

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[download="greenmart-sales-report.pdf"]')).toBeNull();
    vi.runOnlyPendingTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:greenmart-report");
  });

  it("rejects API error bodies instead of downloading them as a PDF", async () => {
    const errorBody = new Blob(['{"message":"Not authorized"}'], { type: "application/json" });

    await expect(downloadPdf({ data: errorBody }, "greenmart-sales-report.pdf"))
      .rejects.toThrow(/not a valid pdf/i);
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("rejects non-PDF content with a misleading PDF mime type", async () => {
    const invalidPdf = new Blob(["This is an error"], { type: "application/pdf" });

    await expect(downloadPdf({ data: invalidPdf }, "greenmart-sales-report.pdf"))
      .rejects.toThrow(/not a valid pdf/i);
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });
});
