import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { createStore } from "../../tests/testUtils.jsx";
import authApi from "../../api/authApi.js";
import ActivateAccount from "./ActivateAccount.jsx";

vi.mock("../../api/authApi.js", () => ({
  default: { activateAccount: vi.fn() },
}));

describe("Farmer account activation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("validates and submits a farmer-chosen password with the activation token", async () => {
    authApi.activateAccount.mockResolvedValueOnce({ data: { message: "Account activated. You can now sign in." } });
    render(
      <Provider store={createStore()}>
        <MemoryRouter initialEntries={["/activate-account?email=farmer%40example.com#token=one-time-token"]}>
          <Routes>
            <Route path="/activate-account" element={<ActivateAccount />} />
            <Route path="/login" element={<div>Login page</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    fireEvent.change(screen.getByLabelText("Create Password"), { target: { value: "FarmerSecure@2026" } });
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "FarmerSecure@2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Activate Account" }));

    await waitFor(() => expect(authApi.activateAccount).toHaveBeenCalledWith({
      email: "farmer@example.com",
      token: "one-time-token",
      password: "FarmerSecure@2026",
    }));
    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });
});
