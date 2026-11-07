import { render, screen, fireEvent } from "@testing-library/react";
import Pagination from "./Pagination.jsx";

describe("Pagination", () => {
  const defaultProps = {
    page: 1,
    pageSize: 10,
    totalRecords: 25,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders First, Previous, numbered buttons, Next, Last", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByRole("button", { name: "First" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Last" })).toBeInTheDocument();
  });

  it("shows record range and total", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByText("Showing 1–10 of 25 items")).toBeInTheDocument();
  });

  it("disables First and Previous on page 1", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByRole("button", { name: "First" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  it("disables Next and Last on last page", () => {
    render(<Pagination {...defaultProps} page={3} />);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Last" })).toBeDisabled();
  });

  it("calls onChange with page number when clicking a page button", () => {
    render(<Pagination {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(defaultProps.onChange).toHaveBeenCalledWith(2, undefined);
  });

  it("calls onChange with page 1 and new page size when page size changes", () => {
    render(<Pagination {...defaultProps} />);
    const select = screen.getByLabelText("Page size");
    fireEvent.change(select, { target: { value: "20" } });
    expect(defaultProps.onChange).toHaveBeenCalledWith(1, 20);
  });

  it("clamps current page within valid range", () => {
    render(<Pagination page={10} pageSize={10} totalRecords={25} onChange={defaultProps.onChange} />);
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
  });

  it("handles zero total records", () => {
    render(<Pagination {...defaultProps} totalRecords={0} />);
    expect(screen.getByText("Showing 0–0 of 0 items")).toBeInTheDocument();
  });
});
