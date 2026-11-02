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

    expect(screen.getByText(/lowercase letters, numbers, and single dots/i)).toBeInTheDocument();
    expect(screen.getByText(/One uppercase letter/)).toBeInTheDocument();
    expect(screen.getByText(/No spaces/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Register" })).toBeDisabled();
    expect(registerRequest).not.toHaveBeenCalled();
  });

  it("submits a valid email address and strong password", async () => {
    vi.spyOn(authApi, "register").mockResolvedValueOnce({
      data: {
        token: "server-issued-token",
        user: { id: "user-1", role: "customer" },
      },
    });
    renderRegister();

    fireEvent.change(screen.getByPlaceholderText("Enter your name"), { target: { value: "Test User" } });
    fireEvent.change(screen.getByPlaceholderText("name@gmail.com"), { target: { value: "user@gmail.com" } });
    const password = "GreenMart@2026#";
    fireEvent.change(screen.getByPlaceholderText("Create a strong password"), { target: { value: password } });
    fireEvent.change(screen.getByPlaceholderText("Confirm your password"), { target: { value: password } });
    expect(screen.getByText("At least 8 characters").closest("li")).toHaveClass("text-[#16804A]");
    expect(screen.getByText("No spaces").closest("li")).toHaveClass("text-[#16804A]");
    fireEvent.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() => expect(authApi.register).toHaveBeenCalledWith({
      name: "Test User",
      email: "user@gmail.com",
      password,
      role: "customer",
    }));
    expect(await screen.findByTestId("current-path")).toHaveTextContent("/");
  });

  it("registers a farmer through the existing farmer registration flow", async () => {
    vi.spyOn(authApi, "register").mockResolvedValueOnce({
      data: {
        token: "farmer-token",
        user: { id: "farmer-1", role: "farmer", farmerApproved: false },
      },
    });
    renderRegister(["/register?role=farmer"]);
    fireEvent.change(screen.getByPlaceholderText("Enter your name"), { target: { value: "Test Farmer" } });
    fireEvent.change(screen.getByPlaceholderText("name@gmail.com"), { target: { value: "farmer@gmail.com" } });
    fireEvent.change(screen.getByPlaceholderText("Create a strong password"), { target: { value: "GreenMart@2026#" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm your password"), { target: { value: "GreenMart@2026#" } });
    fireEvent.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() => expect(authApi.register).toHaveBeenCalledWith({
      name: "Test Farmer",
      email: "farmer@gmail.com",
      password: "GreenMart@2026#",
      role: "farmer",
    }));
    expect(await screen.findByTestId("current-path")).toHaveTextContent("/farmer/dashboard");
  });

  it.each([
    ".roy@gmail.com",
    "roy.@gmail.com",
    "roy..sharma@gmail.com",
    "roy@gmail",
    "roy sharma@gmail.com",
    "Roy@gmail.com",
  ])("keeps Register disabled for invalid email %s", (email) => {
    renderRegister();
    fireEvent.change(screen.getByPlaceholderText("Enter your name"), { target: { value: "Test User" } });
    fireEvent.change(screen.getByPlaceholderText("name@gmail.com"), { target: { value: email } });
    fireEvent.change(screen.getByPlaceholderText("Create a strong password"), { target: { value: "GreenMart@2026#" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm your password"), { target: { value: "GreenMart@2026#" } });

    expect(screen.getByRole("button", { name: "Register" })).toBeDisabled();
    expect(screen.getByText(/lowercase letters, numbers, and single dots/i)).toBeInTheDocument();
  });

  it.each([
    "shortA1",
    "greenmart@2026#",
    "GREENMART@2026#",
    "GreenMart@abcdef#",
    "GreenMart?2026",
    "Green Mart@2026#",
  ])("keeps Register disabled for invalid password %s", (password) => {
    renderRegister();
    fireEvent.change(screen.getByPlaceholderText("Enter your name"), { target: { value: "Test User" } });
    fireEvent.change(screen.getByPlaceholderText("name@gmail.com"), { target: { value: "user@gmail.com" } });
    fireEvent.change(screen.getByPlaceholderText("Create a strong password"), { target: { value: password } });
    fireEvent.change(screen.getByPlaceholderText("Confirm your password"), { target: { value: password } });

    expect(screen.getByRole("button", { name: "Register" })).toBeDisabled();
  });

  it("provides admin login without offering admin registration", () => {
    renderRegister();

    expect(screen.getByRole("link", { name: "Admin Login" })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button", { name: /admin/i })).not.toBeInTheDocument();
  });

  it("preselects farmer registration when requested by the farmer onboarding link", () => {
    renderRegister(["/register?role=farmer"]);

    expect(screen.getByRole("button", { name: "Farmer" })).toHaveClass("bg-primary");
    expect(screen.getByRole("button", { name: "Customer" })).not.toHaveClass("bg-primary");
  });
});
