import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SearchBar from "./SearchBar.jsx";

describe("SearchBar", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps typed text visible immediately and debounces the search callback", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { container } = render(<SearchBar value="" onChange={onChange} ariaLabel="Search orders" />);

    const input = screen.getByRole("searchbox", { name: "Search orders" });
    fireEvent.change(input, { target: { value: "  Pure Honey " } });

    expect(input).toHaveValue("  Pure Honey ");
    expect(input).toHaveClass("pl-9", "pr-9", "appearance-none");
    expect(container.querySelector("svg")).toHaveClass("absolute", "left-3", "top-1/2", "-translate-y-1/2");
    expect(onChange).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(299));
    expect(onChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onChange).toHaveBeenCalledWith("  Pure Honey ");
  });

  it("clears the draft immediately and cancels a pending search", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} ariaLabel="Search products" />);

    const input = screen.getByRole("searchbox", { name: "Search products" });
    fireEvent.change(input, { target: { value: "Honey" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(input).toHaveValue("");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("");
    act(() => vi.advanceTimersByTime(300));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
