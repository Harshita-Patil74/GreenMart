import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, useLocation } from "react-router-dom";
import authApi from "../../api/authApi.js";
import authReducer from "../../features/auth/authSlice.js";
import Register from "./Register.jsx";

function CurrentPath() {
  return <div data-testid="current-path">{useLocation().pathname}</div>;
}

function renderRegister(initialEntries = ["/register"]) {
  const store = configureStore({ reducer: { auth: authReducer } });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>
        <Register />
        <CurrentPath />
      </MemoryRouter>
    </Provider>
  );
}

describe("Register page", () => {
  it("shows password criteria and rejects invalid email or weak password", async () => {
    const registerRequest = vi.spyOn(authApi, "register");
    renderRegister();

    fireEvent.change(screen.getByPlaceholderText("Enter your name"), { target: { value: "Test User" } });
    fireEvent.change(screen.getByPlaceholderText("name@gmail.com"), { target: { value: "Test@gmail.com" } });
    fireEvent.change(screen.getByPlaceholderText("Create a strong password"), { target: { value: "weakpass" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm your password"), { target: { value: "weakpass" } });
    fireEvent.click(screen.getByRole("button", { name: "Register" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/lowercase gmail/i);
    expect(screen.getByText(/One uppercase letter/)).toBeInTheDocument();
    expect(registerRequest).not.toHaveBeenCalled();
  });

  it("submits a trimmed Gmail address and strong password", async () => {
    vi.spyOn(authApi, "register").mockResolvedValueOnce({
      data: {
        token: "server-issued-token",
        user: { id: "user-1", role: "customer" },
      },
    });
    renderRegister();

    fireEvent.change(screen.getByPlaceholderText("Enter your name"), { target: { value: "Test User" } });
    fireEvent.change(screen.getByPlaceholderText("name@gmail.com"), { target: { value: "  user@gmail.com  " } });
    fireEvent.change(screen.getByPlaceholderText("Create a strong password"), { target: { value: "ValidPass1!" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm your password"), { target: { value: "ValidPass1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() => expect(authApi.register).toHaveBeenCalledWith({
      name: "Test User",
      email: "user@gmail.com",
      password: "ValidPass1!",
      role: "customer",
    }));
    expect(await screen.findByTestId("current-path")).toHaveTextContent("/customer/dashboard");
  });

  it("provides admin login without offering admin registration", () => {
    renderRegister();

    expect(screen.getByRole("link", { name: "Admin Login" })).toHaveAttribute("href", "/admin/login");
    expect(screen.queryByRole("button", { name: /admin/i })).not.toBeInTheDocument();
  });

  it("preselects farmer registration when requested by the farmer onboarding link", () => {
    renderRegister(["/register?role=farmer"]);

    expect(screen.getByRole("button", { name: "Farmer" })).toHaveClass("bg-primary");
    expect(screen.getByRole("button", { name: "Customer" })).not.toHaveClass("bg-primary");
  });
});
