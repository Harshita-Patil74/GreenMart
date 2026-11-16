import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import orderApi from "../../api/orderApi";
import OrderDetails from "./OrderDetails.jsx";

vi.mock("../../api/orderApi.js", () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    adminAll: vi.fn(),
    farmer: vi.fn(),
    mine: vi.fn(),
    downloadInvoice: vi.fn(),
    invoiceDownload: vi.fn(),
  },
}));

const orderWithFullDelivery = {
  _id: "order-1",
  orderNumber: "GM957409",
  createdAt: "2026-10-01T00:00:00.000Z",
  status: "Delivered",
  total: 210,
  user: { name: "Customer", email: "customer@example.test" },
  address: { name: "Customer", line1: "Gokul Road", city: "Hubli", phone: "555-0100" },
  deliveryCharge: 30,
  deliverySnapshot: {
    option: "Standard Delivery",
    distanceKm: 4.2,
    charge: 30,
    dispatchLocations: [
      {
        farmerId: "farmer-1",
        farmerName: "Green Valley Farms",
        farmName: "Green Valley Farms",
        farmAddress: "Hosur Road, Bangalore",
        location: { lat: 12.97, lng: 77.59 },
        distanceKm: 4.2,
      },
    ],
    settingsSnapshot: {
      maxRemoteDistanceKm: 50,
      expressMaxKm: 10,
    },
  },
  items: [
    {
      _id: "item-1",
      productId: "prod-mango-pickle",
      product: { _id: "prod-mango-pickle", name: "Homemade Mango Pickle", category: "Pickles", images: ["pickle.jpg"], unit: "jar" },
      farmer: "farmer-1",
      name: "Homemade Mango Pickle",
      price: 180,
      quantity: 1,
      fulfillmentStatus: "Delivered",
    },
  ],
};

async function renderOrderDetails(order, initialEntries = ["/orders/GM957409"]) {
  const store = configureStore({
    reducer: { auth: () => ({ user: { id: "admin-1", role: "admin" } }) },
  });
  const utils = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>
        <OrderDetails />
      </MemoryRouter>
    </Provider>
  );
  // Wait for the asynchronous order load so assertions are deterministic.
  await utils.findByText(/Order GM\d+/i);
  return utils;
}

describe("OrderDetails - Delivery Information", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("displays order number and header", async () => {
    orderApi.get.mockResolvedValue({ data: orderWithFullDelivery });
    await renderOrderDetails(orderWithFullDelivery, ["/orders/GM957409"]);
    await screen.findByText(/Order GM957409/i);
  });

  it("displays delivery option from snapshot", async () => {
    orderApi.get.mockResolvedValue({ data: orderWithFullDelivery });
    await renderOrderDetails(orderWithFullDelivery, ["/orders/GM957409"]);
    expect(await screen.findByText(/Delivery Option/)).toBeInTheDocument();
    expect(screen.getByText(/Standard Delivery/)).toBeInTheDocument();
  });

  it("displays actual order distance", async () => {
    orderApi.get.mockResolvedValue({ data: orderWithFullDelivery });
    await renderOrderDetails(orderWithFullDelivery, ["/orders/GM957409"]);
    expect(screen.getAllByText(/4\.20 km/).length).toBeGreaterThan(0);
  });

  it("displays actual delivery charge from snapshot", async () => {
    orderApi.get.mockResolvedValue({ data: orderWithFullDelivery });
    await renderOrderDetails(orderWithFullDelivery, ["/orders/GM957409"]);
    expect(screen.getAllByText(/₹ 30\.00/).length).toBeGreaterThan(0);
  });

  it("displays delivery charge from order-level field when snapshot charge is missing", async () => {
    const orderWithChargeButNoSnapshot = {
      _id: "order-3",
      orderNumber: "GM957411",
      createdAt: "2026-10-03T00:00:00.000Z",
      status: "Delivered",
      total: 130,
      user: { name: "Customer 3", email: "customer3@example.test" },
      address: { name: "Customer 3", line1: "Another Road", city: "Another City", phone: "555-0300" },
      deliveryCharge: 30,
      deliverySnapshot: null,
      items: [
        {
          _id: "item-4",
          productId: "prod-potatoes",
          product: { _id: "prod-potatoes", name: "Potatoes", category: "Vegetables", images: ["potatoes.jpg"], unit: "kg" },
          farmer: "farmer-2",
          name: "Potatoes",
          price: 100,
          quantity: 1,
          fulfillmentStatus: "Delivered",
        },
      ],
    };
    orderApi.get.mockResolvedValue({ data: orderWithChargeButNoSnapshot });
    await renderOrderDetails(orderWithChargeButNoSnapshot, ["/orders/GM957411"]);
    await waitFor(() => screen.getByText(/Delivery Charge/));
    expect(screen.getByText(/₹ 30\.00/)).toBeInTheDocument();
  });

  it("shows delivery unavailable message for orders without snapshots", async () => {
    const orderWithMissingSnapshot = {
      _id: "order-2",
      orderNumber: "GM957410",
      createdAt: "2026-10-02T00:00:00.000Z",
      status: "Order Placed",
      total: 100,
      user: { name: "Customer 2", email: "customer2@example.test" },
      address: { name: "Customer 2", line1: "Some Street", city: "Some City", phone: "555-0200" },
      deliveryCharge: null,
      deliverySnapshot: null,
      items: [
        {
          _id: "item-3",
          productId: "prod-onions",
          product: { _id: "prod-onions", name: "Onions", category: "Vegetables", images: ["onions.jpg"], unit: "kg" },
          farmer: "farmer-1",
          name: "Onions",
          price: 100,
          quantity: 1,
          fulfillmentStatus: "Order Placed",
        },
      ],
    };
    orderApi.get.mockResolvedValue({ data: orderWithMissingSnapshot });
    await renderOrderDetails(orderWithMissingSnapshot, ["/orders/GM957410"]);
    expect(await screen.findByText(/Delivery information unavailable for this order/i)).toBeInTheDocument();
    expect(screen.queryByText(/Delivery Option/)).not.toBeInTheDocument();
    expect(screen.queryByText(/km/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Delivery Charge/)).not.toBeInTheDocument();
  });

  it("displays all farmer dispatch locations for multi-farmer orders", async () => {
    orderApi.get.mockResolvedValue({ data: orderWithFullDelivery });
    await renderOrderDetails(orderWithFullDelivery, ["/orders/GM957409"]);
    expect(await screen.findByText(/Dispatch Locations/)).toBeInTheDocument();
    expect(screen.getAllByText(/Green Valley Farms/)).toHaveLength(2);
    expect(screen.getAllByText(/4\.20 km/).length).toBeGreaterThan(0);
  });

  it("displays farmer dispatch address and coordinates", async () => {
    orderApi.get.mockResolvedValue({ data: orderWithFullDelivery });
    await renderOrderDetails(orderWithFullDelivery, ["/orders/GM957409"]);
    expect(screen.getByText(/Hosur Road, Bangalore/)).toBeInTheDocument();
    expect(screen.getByText(/12\.97, 77\.59/)).toBeInTheDocument();
  });

  it("displays settings snapshot when available", async () => {
    orderApi.get.mockResolvedValue({ data: orderWithFullDelivery });
    await renderOrderDetails(orderWithFullDelivery, ["/orders/GM957409"]);
    expect(screen.getByText(/Settings at time of order/)).toBeInTheDocument();
    expect(screen.getByText(/Max Remote Distance/)).toBeInTheDocument();
    expect(screen.getByText(/50 km/)).toBeInTheDocument();
    expect(screen.getByText(/Express Max Distance/)).toBeInTheDocument();
    expect(screen.getByText(/10 km/)).toBeInTheDocument();
  });

  it("displays product name, ID, quantity and price", async () => {
    orderApi.get.mockResolvedValue({ data: orderWithFullDelivery });
    await renderOrderDetails(orderWithFullDelivery, ["/orders/GM957409"]);
    await screen.findByText(/Homemade Mango Pickle/);
    expect(screen.getByText(/x1/)).toBeInTheDocument();
    expect(screen.getAllByText(/₹ 180\.00/)).toHaveLength(2);
  });

  it("displays original product subtotal", async () => {
    orderApi.get.mockResolvedValue({ data: orderWithFullDelivery });
    await renderOrderDetails(orderWithFullDelivery, ["/orders/GM957409"]);
    expect(screen.getByText(/Original Product Subtotal/)).toBeInTheDocument();
    expect(screen.getAllByText(/₹ 180\.00/)).toHaveLength(2);
  });

  it("displays total discount and final payable amount", async () => {
    orderApi.get.mockResolvedValue({ data: orderWithFullDelivery });
    await renderOrderDetails(orderWithFullDelivery, ["/orders/GM957409"]);
    expect(screen.getByText(/Total Discount/)).toBeInTheDocument();
    expect(screen.getByText(/Final Payable Amount/)).toBeInTheDocument();
    expect(screen.getByText(/₹ 210\.00/)).toBeInTheDocument();
  });

  it("displays customer delivery address", async () => {
    orderApi.get.mockResolvedValue({ data: orderWithFullDelivery });
    await renderOrderDetails(orderWithFullDelivery, ["/orders/GM957409"]);
    await waitFor(() => screen.getByText(/Gokul Road/));
    await waitFor(() => screen.getByText(/Hubli/));
  });

  it("displays Track Order button", async () => {
    orderApi.get.mockResolvedValue({ data: orderWithFullDelivery });
    await renderOrderDetails(orderWithFullDelivery, ["/orders/GM957409"]);
    expect(screen.getByRole("button", { name: /Track Order/i })).toBeInTheDocument();
  });

  it("shows product details AND delivery information together", async () => {
    orderApi.get.mockResolvedValue({ data: orderWithFullDelivery });
    await renderOrderDetails(orderWithFullDelivery, ["/orders/GM957409"]);

    expect(await screen.findByText(/Homemade Mango Pickle/)).toBeInTheDocument();
    expect(screen.getAllByText(/₹ 180\.00/).length).toBeGreaterThan(0);

    expect(screen.getByText(/Delivery Information/)).toBeInTheDocument();
    expect(screen.getByText(/Standard Delivery/)).toBeInTheDocument();
    expect(screen.getAllByText(/4\.20 km/).length).toBeGreaterThan(0);

    expect(screen.getByText(/Final Payable Amount/)).toBeInTheDocument();
    expect(screen.getByText(/Dispatch Locations/)).toBeInTheDocument();
  });

  it("shows product details when delivery snapshot is missing", async () => {
    const orderWithMissingSnapshot = {
      _id: "order-2",
      orderNumber: "GM957410",
      createdAt: "2026-10-02T00:00:00.000Z",
      status: "Order Placed",
      total: 100,
      user: { name: "Customer 2", email: "customer2@example.test" },
      address: { name: "Customer 2", line1: "Some Street", city: "Some City", phone: "555-0200" },
      deliveryCharge: null,
      deliverySnapshot: null,
      items: [
        {
          _id: "item-3",
          productId: "prod-onions",
          product: { _id: "prod-onions", name: "Onions", category: "Vegetables", images: ["onions.jpg"], unit: "kg" },
          farmer: "farmer-1",
          name: "Onions",
          price: 100,
          quantity: 1,
          fulfillmentStatus: "Order Placed",
        },
      ],
    };
    orderApi.get.mockResolvedValue({ data: orderWithMissingSnapshot });
    await renderOrderDetails(orderWithMissingSnapshot, ["/orders/GM957410"]);
    await screen.findByText(/Onions/);
    expect(screen.getByText(/x1/)).toBeInTheDocument();
    expect(screen.getAllByText(/₹ 100\.00/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Delivery information unavailable for this order/i)).toBeInTheDocument();
  });

  it("does not expose unrelated farmer information", async () => {
    orderApi.get.mockResolvedValue({ data: orderWithFullDelivery });
    await renderOrderDetails(orderWithFullDelivery, ["/orders/GM957409"]);
    expect(screen.queryByText(/Farmer Unknown/)).not.toBeInTheDocument();
  });
});
