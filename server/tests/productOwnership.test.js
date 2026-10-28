jest.mock("../src/models/Product", () => ({
  findById: jest.fn(),
}));
jest.mock("../src/models/User", () => ({
  findById: jest.fn(),
}));
jest.mock("../src/models/FarmerProfile", () => ({
  findOne: jest.fn().mockResolvedValue(null),
}));

const Product = require("../src/models/Product");
const { update, remove } = require("../src/controllers/productController");

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const P_OWNER = "507f1f77bcf86cd799439021";
const P_OTHER = "507f1f77bcf86cd799439022";
const FARMER_A = "507f1f77bcf86cd799439011";
const FARMER_B = "507f1f77bcf86cd799439012";

describe("farmer product ownership", () => {
  beforeEach(() => jest.clearAllMocks());

  it("allows owner to update", async () => {
    const save = jest.fn().mockResolvedValue(true);
    Product.findById.mockResolvedValue({ _id: P_OWNER, farmer: FARMER_A, save, images: [] });
    const req = { params: { id: P_OWNER }, user: { _id: FARMER_A, role: "farmer" }, body: { name: "X" }, files: [] };
    const res = makeRes();
    await update(req, res, jest.fn());
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.status).not.toHaveBeenCalledWith(404);
  });

  it("denies non-owner update", async () => {
    Product.findById.mockResolvedValue({ _id: P_OTHER, farmer: FARMER_B, save: jest.fn(), images: [] });
    const req = { params: { id: P_OTHER }, user: { _id: FARMER_A, role: "farmer" }, body: { name: "X" }, files: [] };
    const res = makeRes();
    await update(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns 404 for missing product on update", async () => {
    Product.findById.mockResolvedValue(null);
    const req = { params: { id: P_OWNER }, user: { _id: FARMER_A, role: "farmer" }, body: {}, files: [] };
    const res = makeRes();
    await update(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("denies non-owner delete", async () => {
    Product.findById.mockResolvedValue({ _id: P_OTHER, farmer: FARMER_B, deleteOne: jest.fn() });
    const req = { params: { id: P_OTHER }, user: { _id: FARMER_A, role: "farmer" } };
    const res = makeRes();
    await remove(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
