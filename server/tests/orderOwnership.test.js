jest.mock("../src/models/Order", () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
}));
jest.mock("../src/models/User", () => ({
  findById: jest.fn(),
}));
jest.mock("../src/models/FarmerProfile", () => ({
  findOne: jest.fn().mockResolvedValue(null),
}));

const Order = require("../src/models/Order");
const { get } = require("../src/controllers/orderController");

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const ORDER_A = "507f1f77bcf86cd799439013";
const ORDER_B = "507f1f77bcf86cd799439014";
const USER_A = "507f1f77bcf86cd799439011";
const USER_B = "507f1f77bcf86cd799439012";

describe("order ownership controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows owner", async () => {
    Order.findById.mockResolvedValue({ _id: ORDER_A, user: USER_A, items: [], status: "Order Placed" });
    const req = { params: { id: ORDER_A }, user: { _id: USER_A, role: "customer" } };
    const res = makeRes();
    await get(req, res, jest.fn());
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.status).not.toHaveBeenCalledWith(404);
  });

  it("denies non-owner", async () => {
    Order.findById.mockResolvedValue({ _id: ORDER_B, user: USER_B, items: [], status: "Order Placed" });
    const req = { params: { id: ORDER_B }, user: { _id: USER_A, role: "customer" } };
    const res = makeRes();
    await get(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns 404 for missing order", async () => {
    Order.findById.mockResolvedValue(null);
    const req = { params: { id: ORDER_A }, user: { _id: USER_A, role: "customer" } };
    const res = makeRes();
    await get(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
