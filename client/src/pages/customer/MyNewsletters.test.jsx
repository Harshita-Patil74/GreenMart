import React from "react";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithStore } from "../../tests/testUtils.jsx";
import newsletterApi from "../../api/newsletterApi.js";
import MyNewsletters from "./MyNewsletters.jsx";

vi.mock("../../api/newsletterApi.js", () => ({
  default: {
    customerNewsletters: vi.fn(),
    markNewsletterRead: vi.fn(),
  },
}));

const makeNewsletter = (campaignName, id = campaignName) => ({
  _id: id,
  campaignId: `${id}-campaign`,
  campaignName,
  campaignType: "offers",
  subject: campaignName,
  heading: "Campaign details",
  createdAt: null,
  isRead: false,
});

const responseFor = (campaignName, pages = 1, total = 1) => ({
  data: { items: campaignName ? [makeNewsletter(campaignName)] : [], pages, total },
});

describe("My Newsletters campaign title search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    newsletterApi.customerNewsletters.mockImplementation(({ search }) =>
      Promise.resolve(responseFor(search ? `${search} Campaign` : "All Campaigns"))
    );
    newsletterApi.markNewsletterRead.mockResolvedValue({ data: {} });
  });

  it("debounces title search and keeps type and read filters when clearing it", async () => {
    renderWithStore(<MyNewsletters />);
    expect(await screen.findByText("All Campaigns")).toBeInTheDocument();

    const input = screen.getByRole("searchbox", { name: "Search by campaign title" });
    fireEvent.change(input, { target: { value: "  dIwAlI  " } });
    expect(screen.getByRole("searchbox", { name: "Search by campaign title" })).toHaveValue("  dIwAlI  ");
    expect(newsletterApi.customerNewsletters).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("dIwAlI Campaign")).toBeInTheDocument();
    expect(newsletterApi.customerNewsletters).toHaveBeenLastCalledWith({
      page: 1,
      limit: 10,
      search: "dIwAlI",
      type: "all",
      read: "all",
    });

    fireEvent.click(screen.getByRole("button", { name: "Offers & Discounts" }));
    await waitFor(() => expect(newsletterApi.customerNewsletters).toHaveBeenLastCalledWith({
      page: 1,
      limit: 10,
      search: "dIwAlI",
      type: "offers",
      read: "all",
    }));

    fireEvent.click(screen.getByRole("button", { name: "Unread" }));
    await waitFor(() => expect(newsletterApi.customerNewsletters).toHaveBeenLastCalledWith({
      page: 1,
      limit: 10,
      search: "dIwAlI",
      type: "offers",
      read: "unread",
    }));

    fireEvent.change(screen.getByRole("searchbox", { name: "Search by campaign title" }), {
      target: { value: "" },
    });
    expect(await screen.findByText("All Campaigns")).toBeInTheDocument();
    expect(newsletterApi.customerNewsletters).toHaveBeenLastCalledWith({
      page: 1,
      limit: 10,
      search: "",
      type: "offers",
      read: "unread",
    });
  });

  it("retains the current search and filters while changing pages", async () => {
    newsletterApi.customerNewsletters.mockImplementation(({ search }) =>
      Promise.resolve(responseFor(search ? `${search} Campaign` : "All Campaigns", 2, 12))
    );
    renderWithStore(<MyNewsletters />);
    await screen.findByText("All Campaigns");
    fireEvent.change(screen.getByRole("searchbox", { name: "Search by campaign title" }), {
      target: { value: "Premium" },
    });
    await screen.findByText("Premium Campaign");
    fireEvent.click(screen.getByRole("button", { name: "Offers & Discounts" }));
    await waitFor(() => expect(newsletterApi.customerNewsletters).toHaveBeenLastCalledWith({
      page: 1,
      limit: 10,
      search: "Premium",
      type: "offers",
      read: "all",
    }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(newsletterApi.customerNewsletters).toHaveBeenLastCalledWith({
      page: 2,
      limit: 10,
      search: "Premium",
      type: "offers",
      read: "all",
    }));
  });

  it("ignores stale search responses and keeps the search input mounted during loading", async () => {
    let resolveOldSearch;
    newsletterApi.customerNewsletters.mockImplementation(({ search }) => {
      if (search === "Old") {
        return new Promise((resolve) => { resolveOldSearch = resolve; });
      }
      return Promise.resolve(responseFor(search ? `${search} Campaign` : "All Campaigns"));
    });
    renderWithStore(<MyNewsletters />);
    await screen.findByText("All Campaigns");
    const input = screen.getByRole("searchbox", { name: "Search by campaign title" });

    fireEvent.change(input, { target: { value: "Old" } });
    await waitFor(() => expect(newsletterApi.customerNewsletters).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "Old" })
    ));
    expect(screen.getByRole("searchbox", { name: "Search by campaign title" })).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "New" } });
    expect(await screen.findByText("New Campaign")).toBeInTheDocument();
    await act(async () => {
      resolveOldSearch(responseFor("Old Campaign"));
    });
    expect(screen.getByText("New Campaign")).toBeInTheDocument();
    expect(screen.queryByText("Old Campaign")).not.toBeInTheDocument();
  });
});
