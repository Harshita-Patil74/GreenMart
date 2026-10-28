import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import BackButton from "./BackButton.jsx";

describe("BackButton", () => {
  it("renders back label", () => {
    render(
      <MemoryRouter initialEntries={["/current"]}>
        <Routes>
          <Route path="/current" element={<BackButton fallback="/fallback" />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("Back")).toBeInTheDocument();
  });
});
