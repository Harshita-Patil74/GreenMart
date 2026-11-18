import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { Provider } from "react-redux";
import { MemoryRouter, useLocation } from "react-router-dom";
import { createStore, renderWithStore } from "../../tests/testUtils.jsx";
import MobileNavigationDrawer from "./MobileNavigationDrawer.jsx";

function CurrentPath() {
  return <div data-testid="current-path">{useLocation().pathname}</div>;
}

function renderDrawerWithRoutes(ui, preloadedState = {}, initialEntries = ["/"]) {
  const store = createStore(preloadedState);
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>
        <CurrentPath />
        {ui}
      </MemoryRouter>
    </Provider>
  );
}

const guestState = { auth: { user: null, token: null }, cart: { items: [] } };

describe("MobileNavigationDrawer", () => {
  it("renders guest navigation when not authenticated", () => {
    renderWithStore(
      <MobileNavigationDrawer open onClose={() => {}} id="test-drawer" label="Test drawer" drawerRef={null} />,
      guestState,
    );

    expect(screen.getByRole("dialog", { name: "Test drawer" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Shop" })).toHaveAttribute("href", "/shop");
    expect(screen.getByRole("link", { name: "Offers" })).toHaveAttribute("href", "/shop?offers=true");
    expect(screen.getByRole("link", { name: "Farmers" })).toHaveAttribute("href", "/farmers");
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Register" })).toHaveAttribute("href", "/register");
  });

  it("navigates to Offers when clicked", () => {
    renderDrawerWithRoutes(
      <MobileNavigationDrawer open onClose={() => {}} id="test-drawer" label="Test drawer" drawerRef={null} />,
      guestState,
      ["/"],
    );

    fireEvent.click(screen.getByRole("link", { name: "Offers" }));
    expect(screen.getByTestId("current-path")).toHaveTextContent("/shop");
  });

  it("navigates to Farmers when clicked", () => {
    renderDrawerWithRoutes(
      <MobileNavigationDrawer open onClose={() => {}} id="test-drawer" label="Test drawer" drawerRef={null} />,
      guestState,
      ["/"],
    );

    fireEvent.click(screen.getByRole("link", { name: "Farmers" }));
    expect(screen.getByTestId("current-path")).toHaveTextContent("/farmers");
  });

  it("highlights Offers active state on /shop?offers=true for guest users", () => {
    renderDrawerWithRoutes(
      <MobileNavigationDrawer open onClose={() => {}} id="test-drawer" label="Test drawer" drawerRef={null} />,
      guestState,
      ["/shop?offers=true"],
    );

    expect(screen.getByRole("link", { name: "Offers" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Shop" })).not.toHaveAttribute("aria-current", "page");
    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });

  it("highlights Farmers active state on /farmers for guest users", () => {
    renderDrawerWithRoutes(
      <MobileNavigationDrawer open onClose={() => {}} id="test-drawer" label="Test drawer" drawerRef={null} />,
      guestState,
      ["/farmers"],
    );

    expect(screen.getByRole("link", { name: "Farmers" })).toHaveAttribute("aria-current", "page");
    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });

  it("closes the mobile drawer when a navigation item is selected", () => {
    const onCloseMock = vi.fn();
    renderWithStore(
      <MobileNavigationDrawer open onClose={onCloseMock} id="test-drawer" label="Test drawer" drawerRef={null} />,
      guestState,
    );

    fireEvent.click(screen.getByRole("link", { name: "Offers" }));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("closes the drawer when the close button is clicked", () => {
    const onCloseMock = vi.fn();
    renderWithStore(
      <MobileNavigationDrawer open onClose={onCloseMock} id="test-drawer" label="Test drawer" drawerRef={null} />,
      guestState,
    );

    const closeButton = screen.getByRole("button", { name: "Close navigation" });
    fireEvent.click(closeButton);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("renders customer navigation with exact role-based links", () => {
    renderWithStore(
      <MobileNavigationDrawer open onClose={() => {}} id="test-drawer" label="Customer drawer" drawerRef={null} />,
      {
        auth: { user: { _id: "cust-1", name: "Test Customer", role: "customer" }, token: "abc123" },
        cart: { items: [] },
      },
    );

    expect(screen.getByRole("dialog", { name: "Customer drawer" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Customer Dashboard" })).toHaveAttribute("href", "/customer/dashboard");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Shop" })).toHaveAttribute("href", "/shop");
    expect(screen.getByRole("link", { name: "Categories" })).toHaveAttribute("href", "/shop");
    expect(screen.getByRole("link", { name: "Offers" })).toHaveAttribute("href", "/customer/offers");
    expect(screen.getByRole("link", { name: "Cart" })).toHaveAttribute("href", "/cart");
    expect(screen.getByRole("link", { name: "Wishlist" })).toHaveAttribute("href", "/customer/wishlist");
    expect(screen.getByRole("link", { name: "My Orders" })).toHaveAttribute("href", "/customer/orders");
    expect(screen.getByRole("link", { name: "Notifications" })).toHaveAttribute("href", "/notifications");
    expect(screen.getByRole("link", { name: "My Profile" })).toHaveAttribute("href", "/customer/profile");
    expect(screen.getByRole("link", { name: "My Newsletters" })).toHaveAttribute("href", "/customer/newsletters");
    expect(screen.getByRole("button", { name: /Logout/ })).toBeInTheDocument();
  });

  it("does not show Login or Register for authenticated customer", () => {
    renderWithStore(
      <MobileNavigationDrawer open onClose={() => {}} id="test-drawer" label="Customer drawer" drawerRef={null} />,
      {
        auth: { user: { _id: "cust-1", name: "Test Customer", role: "customer" }, token: "abc123" },
        cart: { items: [] },
      },
    );

    expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Register" })).not.toBeInTheDocument();
  });

  it("renders farmer navigation with exact role-based links", () => {
    renderWithStore(
      <MobileNavigationDrawer open onClose={() => {}} id="test-drawer" label="Farmer drawer" drawerRef={null} />,
      {
        auth: { user: { _id: "farm-1", name: "Test Farmer", role: "farmer" }, token: "abc123" },
        cart: { items: [] },
      },
    );

    expect(screen.getByRole("dialog", { name: "Farmer drawer" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Farmer Dashboard" })).toHaveAttribute("href", "/farmer/dashboard");
    expect(screen.getByRole("link", { name: "My Products" })).toHaveAttribute("href", "/farmer/products");
    expect(screen.getByRole("link", { name: "Add Product" })).toHaveAttribute("href", "/farmer/products/new");
    expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute("href", "/farmer/orders");
    expect(screen.getByRole("link", { name: "Inventory" })).toHaveAttribute("href", "/farmer/inventory-management");
    expect(screen.getByRole("link", { name: "Offers" })).toHaveAttribute("href", "/farmer/offers");
    expect(screen.getByRole("link", { name: "Notifications" })).toHaveAttribute("href", "/farmer/notifications");
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/farmer/profile");
    expect(screen.getByRole("button", { name: /Logout/ })).toBeInTheDocument();
  });

  it("does not show customer or admin links for farmer", () => {
    renderWithStore(
      <MobileNavigationDrawer open onClose={() => {}} id="test-drawer" label="Farmer drawer" drawerRef={null} />,
      {
        auth: { user: { _id: "farm-1", name: "Test Farmer", role: "farmer" }, token: "abc123" },
        cart: { items: [] },
      },
    );

    expect(screen.queryByRole("link", { name: "Customer Dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Admin Dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Cart" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Wishlist" })).not.toBeInTheDocument();
  });

  it("renders admin navigation with exact role-based links", () => {
    renderWithStore(
      <MobileNavigationDrawer open onClose={() => {}} id="test-drawer" label="Admin drawer" drawerRef={null} />,
      {
        auth: { user: { _id: "adm-1", name: "Test Admin", role: "admin" }, token: "abc123" },
        cart: { items: [] },
      },
    );

    expect(screen.getByRole("dialog", { name: "Admin drawer" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin Dashboard" })).toHaveAttribute("href", "/admin/dashboard");
    expect(screen.getByRole("link", { name: "Products" })).toHaveAttribute("href", "/admin/products");
    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute("href", "/admin/users");
    expect(screen.getByRole("link", { name: "Farmers" })).toHaveAttribute("href", "/admin/farmers");
    expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute("href", "/admin/orders");
    expect(screen.getByRole("link", { name: "Inventory" })).toHaveAttribute("href", "/admin/inventory");
    expect(screen.getByRole("link", { name: "Reports" })).toHaveAttribute("href", "/admin/reports");
    expect(screen.getByRole("link", { name: "Offers" })).toHaveAttribute("href", "/admin/offers");
    expect(screen.getByRole("link", { name: "Newsletter / Premium Subscriptions" })).toHaveAttribute("href", "/admin/newsletter");
    expect(screen.getByRole("link", { name: "Notifications" })).toHaveAttribute("href", "/admin/notifications");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/admin/settings");
    expect(screen.getByRole("button", { name: /Logout/ })).toBeInTheDocument();
  });

  it("does not show customer or farmer dashboard links for admin", () => {
    renderWithStore(
      <MobileNavigationDrawer open onClose={() => {}} id="test-drawer" label="Admin drawer" drawerRef={null} />,
      {
        auth: { user: { _id: "adm-1", name: "Test Admin", role: "admin" }, token: "abc123" },
        cart: { items: [] },
      },
    );

    expect(screen.queryByRole("link", { name: "Customer Dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Farmer Dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "My Products" })).not.toBeInTheDocument();
  });

  it("displays user name, avatar placeholder, and role when authenticated", () => {
    renderWithStore(
      <MobileNavigationDrawer open onClose={() => {}} id="test-drawer" label="Farmer drawer" drawerRef={null} />,
      {
        auth: { user: { _id: "farm-1", name: "Green Farm", role: "farmer" }, token: "abc123" },
        cart: { items: [] },
      },
    );

    expect(screen.getByText("Green Farm")).toBeInTheDocument();
    expect(screen.getByText("Farmer")).toBeInTheDocument();
  });

  function renderDrawerAt(path, preloadedState = {}) {
    const store = createStore(preloadedState);
    return render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[path]}>
          <MobileNavigationDrawer open onClose={() => {}} id="test-drawer" label="Test drawer" drawerRef={null} />
        </MemoryRouter>
      </Provider>
    );
  }

  describe("active navigation highlighting", () => {
    const authState = { auth: { user: { _id: "c-1", name: "Customer", role: "customer" }, token: "abc123" }, cart: { items: [] } };

    it("highlights Offers but not Shop on /customer/offers", () => {
      renderDrawerAt("/customer/offers", authState);

      const shop = screen.getByRole("link", { name: "Shop" });
      const offers = screen.getByRole("link", { name: "Offers" });
      expect(offers).toHaveAttribute("aria-current", "page");
      expect(shop).not.toHaveAttribute("aria-current", "page");
      expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    });

    it("highlights Shop but not Offers on /shop", () => {
      renderDrawerAt("/shop", authState);

      const shop = screen.getByRole("link", { name: "Shop" });
      const offers = screen.getByRole("link", { name: "Offers" });
      expect(shop).toHaveAttribute("aria-current", "page");
      expect(offers).not.toHaveAttribute("aria-current", "page");
      expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    });

    it("highlights only Add Product on /farmer/products/new", () => {
      renderDrawerAt("/farmer/products/new", {
        auth: { user: { _id: "f-1", name: "Farmer", role: "farmer" }, token: "abc123" },
        cart: { items: [] },
      });

      const addProduct = screen.getByRole("link", { name: "Add Product" });
      const myProducts = screen.getByRole("link", { name: "My Products" });
      expect(addProduct).toHaveAttribute("aria-current", "page");
      expect(myProducts).not.toHaveAttribute("aria-current", "page");
      expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    });

    it("highlights only My Products on /farmer/products", () => {
      renderDrawerAt("/farmer/products", {
        auth: { user: { _id: "f-1", name: "Farmer", role: "farmer" }, token: "abc123" },
        cart: { items: [] },
      });

      const addProduct = screen.getByRole("link", { name: "Add Product" });
      const myProducts = screen.getByRole("link", { name: "My Products" });
      expect(myProducts).toHaveAttribute("aria-current", "page");
      expect(addProduct).not.toHaveAttribute("aria-current", "page");
      expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    });
  });
});
