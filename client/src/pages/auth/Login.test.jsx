import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, useLocation } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../../features/auth/authSlice.js";
import authApi from "../../api/authApi.js";
import Login from "./Login.jsx";

function CurrentPath() {
  const location = useLocation();
  return <div data-testid="current-path">{location.pathname}</div>;
}

function renderWithStore(ui = <Login />, initialEntries = ["/login"]) {
  const store = configureStore({ reducer: { auth: authReducer } });
  const utils = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>
        {ui}
        <CurrentPath />
      </MemoryRouter>
    </Provider>
  );
  return { ...utils, store };
}

describe("Login page", () => {
  it("renders the login form with heading and inputs", () => {
    renderWithStore(<Login />);
    expect(screen.getByRole("heading", { name: /Welcome Back/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login", exact: true })).toBeInTheDocument();
    expect(screen.queryByText(/Continue with Google/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Continue with Facebook/i)).not.toBeInTheDocument();
  });

  it("updates the email input when typed", () => {
    renderWithStore(<Login />);
    const input = screen.getByPlaceholderText(/Enter your email/i);
    fireEvent.change(input, { target: { value: "a@b.c" } });
    expect(input).toHaveValue("a@b.c");
  });

  it.each([
    ["customer", "/"],
    ["farmer", "/farmer/dashboard"],
    ["admin", "/admin/dashboard"],
  ])("redirects a server-authenticated %s to %s", async (role, path) => {
    vi.spyOn(authApi, "login").mockResolvedValueOnce({
      data: { token: "server-issued-token", user: { id: "user-1", role } },
    });
    const { store } = renderWithStore();
    fireEvent.click(within(screen.getByRole("group", { name: "Choose account type" })).getByRole("button", { name: `${role[0].toUpperCase()}${role.slice(1)} Login` }));

    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), { target: { value: "member@gmail.com" } });
    fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), { target: { value: "ValidPass1!" } });
    fireEvent.submit(screen.getByPlaceholderText(/Enter your email/i).closest("form"));

    await waitFor(() => expect(screen.getByTestId("current-path")).toHaveTextContent(path));
    expect(authApi.login).toHaveBeenCalledOnce();
    expect(store.getState().auth.user.role).toBe(role);
    expect(store.getState().auth.token).toBe("server-issued-token");
  });

  it("shows Admin Login as an explicit login option", () => {
    renderWithStore();
    expect(within(screen.getByRole("group", { name: "Choose account type" })).getByRole("button", { name: "Admin Login" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin Login" })).toHaveAttribute("href", "/admin/login");
  });

  it("defaults the dedicated admin login route to admin authentication", () => {
    renderWithStore(<Login initialRole="admin" />);
    const adminOption = within(screen.getByRole("group", { name: "Choose account type" })).getByRole("button", { name: "Admin Login" });
    expect(adminOption).toHaveAttribute("aria-pressed", "true");
  });

  it("preselects farmer login when opened from the footer", () => {
    renderWithStore(<Login />, ["/login?role=farmer"]);
    const farmerOption = within(screen.getByRole("group", { name: "Choose account type" })).getByRole("button", { name: "Farmer Login" });
    expect(farmerOption).toHaveAttribute("aria-pressed", "true");
  });

  it.each(["customer", "farmer"])("rejects %s credentials selected for Admin Login and clears the session", async (role) => {
    vi.spyOn(authApi, "login").mockResolvedValueOnce({
      data: { token: "server-issued-token", user: { id: "user-1", role } },
    });
    const { store } = renderWithStore();
    fireEvent.click(within(screen.getByRole("group", { name: "Choose account type" })).getByRole("button", { name: "Admin Login" }));
    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), { target: { value: "member@gmail.com" } });
    fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), { target: { value: "ValidPass1!" } });
    fireEvent.submit(screen.getByPlaceholderText(/Enter your email/i).closest("form"));

    expect(await screen.findByRole("alert")).toHaveTextContent(/not authorized for admin login/i);
    expect(store.getState().auth.user).toBeNull();
    expect(store.getState().auth.token).toBeNull();
  });

  it("shows a clear error when the backend rejects credentials", async () => {
    vi.spyOn(authApi, "login").mockRejectedValueOnce({
      response: { data: { message: "Invalid credentials" } },
      message: "Request failed",
    });
    renderWithStore();
    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), { target: { value: "member@gmail.com" } });
    fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), { target: { value: "ValidPass1!" } });
    fireEvent.submit(screen.getByPlaceholderText(/Enter your email/i).closest("form"));

    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid credentials/i);
  });

  it("submits a valid lowercase non-Gmail administrator email", async () => {
    vi.spyOn(authApi, "login").mockResolvedValueOnce({
      data: { token: "server-issued-token", user: { id: "admin-1", role: "admin" } },
    });
    renderWithStore();
    fireEvent.click(within(screen.getByRole("group", { name: "Choose account type" })).getByRole("button", { name: "Admin Login" }));
    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), { target: { value: "admin@greenmart.com" } });
    fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), { target: { value: "ValidPass1!" } });
    fireEvent.submit(screen.getByPlaceholderText(/Enter your email/i).closest("form"));

    await waitFor(() => expect(authApi.login).toHaveBeenCalledWith({
      email: "admin@greenmart.com",
      password: "ValidPass1!",
      remember: true,
    }));
    expect(await screen.findByTestId("current-path")).toHaveTextContent("/admin/dashboard");
  });

  it("has a Register link pointing to /register", () => {
    renderWithStore(<Login />);
    const link = screen.getByRole("link", { name: /Register/i });
    expect(link).toHaveAttribute("href", "/register");
  });
});
