import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
    expect(screen.getByLabelText(/Remember me/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Forgot password/i })).toHaveAttribute("href", "/forgot-password");
    expect(screen.getByRole("link", { name: /Register/i })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("button", { name: "Show password" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /account type/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /customer login|farmer login|admin login/i })).not.toBeInTheDocument();
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
  ])("automatically redirects a server-authenticated %s to %s", async (role, path) => {
    vi.spyOn(authApi, "login").mockResolvedValueOnce({
      data: { token: "server-issued-token", user: { id: "user-1", role } },
    });
    const { store } = renderWithStore();
    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), { target: { value: "member@gmail.com" } });
    fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), { target: { value: "ValidPass1!" } });
    fireEvent.submit(screen.getByPlaceholderText(/Enter your email/i).closest("form"));

    await waitFor(() => expect(screen.getByTestId("current-path")).toHaveTextContent(path));
    expect(authApi.login).toHaveBeenCalledWith({
      email: "member@gmail.com",
      password: "ValidPass1!",
    });
    expect(store.getState().auth.user.role).toBe(role);
    expect(store.getState().auth.token).toBe("server-issued-token");
    expect(localStorage.getItem("token")).toBe("server-issued-token");
  });

  it("ignores legacy role hints in login URLs", () => {
    renderWithStore(<Login />, ["/login?role=farmer"]);
    expect(screen.queryByRole("group", { name: /account type/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login", exact: true })).toBeInTheDocument();
  });

  it.each([".roy@gmail.com", "roy.@gmail.com", "roy..sharma@gmail.com", "roy@gmail", "roy sharma@gmail.com", "Roy@gmail.com"])(
    "does not submit an invalid email: %s",
    async (email) => {
      const loginRequest = vi.spyOn(authApi, "login");
      renderWithStore();
      fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), { target: { value: email } });
      fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), { target: { value: "ValidPass1!" } });
      fireEvent.submit(screen.getByPlaceholderText(/Enter your email/i).closest("form"));

      expect(await screen.findByRole("alert")).toHaveTextContent(/valid lowercase email/i);
      expect(loginRequest).not.toHaveBeenCalled();
    }
  );

  it("clears credentials when the server returns an unsupported account role", async () => {
    vi.spyOn(authApi, "login").mockResolvedValueOnce({
      data: { token: "server-issued-token", user: { id: "user-1", role: "unknown" } },
    });
    const { store } = renderWithStore();
    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), { target: { value: "member@gmail.com" } });
    fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), { target: { value: "ValidPass1!" } });
    fireEvent.submit(screen.getByPlaceholderText(/Enter your email/i).closest("form"));

    expect(await screen.findByRole("alert")).toHaveTextContent(/account type cannot sign in/i);
    expect(store.getState().auth.user).toBeNull();
    expect(store.getState().auth.token).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
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
    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), { target: { value: "admin@greenmart.com" } });
    fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), { target: { value: "ValidPass1!" } });
    fireEvent.submit(screen.getByPlaceholderText(/Enter your email/i).closest("form"));

    await waitFor(() => expect(authApi.login).toHaveBeenCalledWith({
      email: "admin@greenmart.com",
      password: "ValidPass1!",
    }));
    expect(await screen.findByTestId("current-path")).toHaveTextContent("/admin/dashboard");
  });

  it("toggles password visibility and honors an unchecked Remember Me option", async () => {
    vi.spyOn(authApi, "login").mockResolvedValueOnce({
      data: { token: "session-token", user: { id: "user-1", role: "customer" } },
    });
    renderWithStore();

    const password = screen.getByPlaceholderText(/Enter your password/i);
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByLabelText(/Remember me/i));
    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), { target: { value: "member@gmail.com" } });
    fireEvent.change(password, { target: { value: "ValidPass1!" } });
    fireEvent.submit(password.closest("form"));

    await waitFor(() => expect(authApi.login).toHaveBeenCalledWith({
      email: "member@gmail.com",
      password: "ValidPass1!",
    }));
    expect(sessionStorage.getItem("token")).toBe("session-token");
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("has a Register link pointing to /register", () => {
    renderWithStore(<Login />);
    const link = screen.getByRole("link", { name: /Register/i });
    expect(link).toHaveAttribute("href", "/register");
  });
});
