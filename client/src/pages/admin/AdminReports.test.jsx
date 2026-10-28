import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminReports from "./AdminReports.jsx";
import adminApi from "../../api/adminApi";
import orderApi from "../../api/orderApi";
import productApi from "../../api/productApi";
import { downloadPdf } from "../../utils/downloadPdf.js";

vi.mock("../../api/adminApi", () => ({
  default: {
    users: vi.fn(),
    reportPdf: vi.fn(),
  },
}));
vi.mock("../../api/orderApi", () => ({ default: { adminAll: vi.fn() } }));
vi.mock("../../api/productApi", () => ({ default: { list: vi.fn() } }));
vi.mock("../../utils/downloadPdf.js", () => ({ downloadPdf: vi.fn() }));

describe("Admin PDF report download", () => {
  beforeEach(() => {
    adminApi.users.mockResolvedValue({ data: [] });
    orderApi.adminAll.mockResolvedValue({ data: [] });
    productApi.list.mockResolvedValue({ data: { items: [{ _id: "product-1", name: "Tomatoes", category: "Vegetables", price: 25, stock: 4 }] } });
    adminApi.reportPdf.mockResolvedValue({ data: new Blob(["%PDF-valid"], { type: "application/pdf" }) });
    downloadPdf.mockResolvedValue(undefined);
  });

  afterEach(() => vi.clearAllMocks());

  it("requests the selected filtered report as PDF and downloads it", async () => {
    render(<MemoryRouter><AdminReports /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Generate Report" }));
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-10-01" } });
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-10-31" } });
    fireEvent.change(screen.getByLabelText("Report category"), { target: { value: "Vegetables" } });
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));

    await waitFor(() => expect(adminApi.reportPdf).toHaveBeenCalledWith({
      type: "Sales Report",
      from: "2026-10-01",
      to: "2026-10-31",
      category: "Vegetables",
    }));
    expect(downloadPdf).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.any(Blob) }),
      "greenmart-sales-report.pdf"
    );
  });

  it("shows an error instead of downloading a failed response", async () => {
    adminApi.reportPdf.mockRejectedValueOnce({ message: "Report endpoint unavailable" });
    render(<MemoryRouter><AdminReports /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Generate Report" }));
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Report endpoint unavailable");
    expect(downloadPdf).not.toHaveBeenCalled();
  });

  it("does not issue repeated PDF requests while one is in progress", async () => {
    let finishRequest;
    adminApi.reportPdf.mockReturnValueOnce(new Promise((resolve) => { finishRequest = resolve; }));
    render(<MemoryRouter><AdminReports /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Generate Report" }));
    const downloadButton = screen.getByRole("button", { name: "Download PDF" });
    fireEvent.click(downloadButton);
    fireEvent.click(downloadButton);

    await waitFor(() => expect(adminApi.reportPdf).toHaveBeenCalledTimes(1));
    finishRequest({ data: new Blob(["%PDF-valid"], { type: "application/pdf" }) });
    await waitFor(() => expect(downloadPdf).toHaveBeenCalledTimes(1));
  });
});
