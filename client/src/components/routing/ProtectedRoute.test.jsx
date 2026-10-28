import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../../features/auth/authSlice.js";
import ProtectedRoute, { RoleRoute } from "./ProtectedRoute.jsx";

const dashboardByRole = {
  customer: "/customer/dashboard",
  farmer: "/farmer/dashboard",
  admin: "/admin/dashboard",
};

function renderAccess(role, path, allowedRoles, { token = "valid-token", loading = false, farmerApproved = true, requireFarmerApproval = false } = {}) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: role ? { id: "user-1", role, farmerApproved } : null,
        token,
        status: "idle",
        error: null,
        loading,
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route element={<RoleRoute roles={allowedRoles} requireFarmerApproval={requireFarmerApproval} />}>
              <Route path={path} element={<p>Protected page</p>} />
            </Route>
          </Route>
          <Route path="/customer/dashboard" element={<p>Customer dashboard</p>} />
          <Route path="/farmer/dashboard" element={<p>Farmer dashboard</p>} />
          <Route path="/admin/dashboard" element={<p>Admin dashboard</p>} />
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

describe("RoleRoute", () => {
  it("waits for a persisted session to restore before redirecting", () => {
    renderAccess(null, "/restricted", ["farmer"], { token: "persisted-session", loading: true });

    expect(screen.getByRole("status")).toHaveTextContent("Loading your account");
    expect(screen.queryByText("Protected page")).not.toBeInTheDocument();
  });

  it.each([
    ["customer", "/customer/dashboard", ["customer", "farmer", "admin"], true],
    ["farmer", "/customer/dashboard", ["customer", "farmer", "admin"], true],
    ["admin", "/customer/dashboard", ["customer", "farmer", "admin"], true],
    ["customer", "/farmer/dashboard", ["farmer", "admin"], false],
    ["farmer", "/farmer/dashboard", ["farmer", "admin"], true],
    ["admin", "/farmer/dashboard", ["farmer", "admin"], true],
    ["customer", "/admin/settings", ["admin"], false],
    ["farmer", "/admin/settings", ["admin"], false],
    ["admin", "/admin/settings", ["admin"], true],
    ["customer", "/customer/orders", ["customer"], true],
    ["farmer", "/customer/orders", ["customer"], false],
    ["admin", "/customer/orders", ["customer"], false],
    ["customer", "/farmer/products", ["farmer"], false],
    ["farmer", "/farmer/products", ["farmer"], true],
    ["admin", "/farmer/products", ["farmer"], false],
  ])("%s accessing %s is allowed: %s", (role, path, allowedRoles, isAllowed) => {
    renderAccess(role, path, allowedRoles);

    if (isAllowed) {
      expect(screen.getByText("Protected page")).toBeInTheDocument();
      return;
    }
    expect(screen.queryByText("Protected page")).not.toBeInTheDocument();
    expect(screen.getByText(`${role[0].toUpperCase()}${role.slice(1)} dashboard`)).toBeInTheDocument();
  });

  it("redirects an unauthenticated direct URL to login", () => {
    renderAccess(null, "/admin/settings", ["admin"], { token: null });
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("redirects an invalid authenticated role to login", () => {
    renderAccess("unknown", "/admin/settings", ["admin"]);
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("blocks unapproved farmers from farmer management routes", () => {
    renderAccess("farmer", "/farmer/products", ["farmer"], { farmerApproved: false, requireFarmerApproval: true });

    expect(screen.queryByText("Protected page")).not.toBeInTheDocument();
    expect(screen.getByText("Farmer account awaiting approval")).toBeInTheDocument();
  });
});
