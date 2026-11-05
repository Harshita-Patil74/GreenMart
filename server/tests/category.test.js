jest.mock("../src/models/Category", () => {
  const categories = [];
  let counter = 0;
  return {
    find: jest.fn().mockImplementation((query) => {
      let result = categories;
      if (query && query.isActive === true) {
        result = categories.filter((c) => c.isActive !== false);
      }
      result = result.slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      // Return a thenable object with .sort() to mimic Mongoose Query
      const thenable = {
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(result),
        then: jest.fn().mockImplementation((resolve) => resolve(result)),
      };
      return thenable;
    }),
    findById: jest.fn().mockImplementation(async (id) => {
      return categories.find((c) => c._id === id);
    }),
    findOne: jest.fn().mockImplementation(async (query) => {
      // Handle duplicate name check: { _id: { $ne: id }, name: { $regex: /pattern/i } }
      if (query.name && query.name.$regex) {
        const regexSource = query.name.$regex.source || String(query.name.$regex);
        const regexFlags = query.name.$regex.flags || query.name.$options || "";
        const regex = new RegExp(regexSource, regexFlags);
        return categories.find((c) => regex.test(c.name) && (!query._id || !query._id.$ne || c._id !== query._id.$ne));
      }
      // Handle exact name match: { name: "X" }
      if (query.name) {
        return categories.find((c) => c.name === query.name);
      }
      return undefined;
    }),
    create: jest.fn().mockImplementation(async (data) => {
      counter += 1;
      const cat = { _id: "cat_" + counter, ...data };
      categories.push(cat);
      return cat;
    }),
    findByIdAndUpdate: jest.fn().mockImplementation(async (id, data, opts) => {
      const idx = categories.findIndex((c) => c._id === id);
      if (idx === -1) return null;
      categories[idx] = { ...categories[idx], ...data };
      return categories[idx];
    }),
    findByIdAndDelete: jest.fn().mockImplementation(async (id) => {
      const idx = categories.findIndex((c) => c._id === id);
      if (idx === -1) return null;
      return categories.splice(idx, 1)[0];
    }),
    countDocuments: jest.fn().mockImplementation(async (query) => {
      return categories.filter((c) => c.name === query.category).length;
    }),
    __reset: () => { categories.length = 0; counter = 0; },
  };
});

jest.mock("../src/models/Product", () => ({
  countDocuments: jest.fn().mockResolvedValue(0),
  updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
}));

jest.resetModules();
const Category = require("../src/models/Category");
const { list, create, update, remove, toggleActive } = require("../src/controllers/categoryController");
const Product = require("../src/models/Product");

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("Category Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Category.__reset();
  });

  describe("list", () => {
    it("returns only active categories for non-admin", async () => {
      await Category.create({ name: "Vegetables", isActive: true });
      await Category.create({ name: "Fruits", isActive: false });
      const req = { user: { role: "customer" } };
      const res = makeRes();
      await list(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ name: "Vegetables" })])
      );
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.find((c) => c.name === "Fruits")).toBeUndefined();
    });

    it("returns all categories for admin", async () => {
      await Category.create({ name: "Vegetables", isActive: true });
      await Category.create({ name: "Fruits", isActive: false });
      const req = { user: { role: "admin" } };
      const res = makeRes();
      await list(req, res);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.find((c) => c.name === "Fruits")).toBeDefined();
    });
  });

  describe("create", () => {
    it("creates a new category", async () => {
      const req = { body: { name: "Dry Fruits & Nuts" } };
      const res = makeRes();
      await create(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: "Dry Fruits & Nuts" }));
    });

    it("rejects empty category name", async () => {
      const req = { body: { name: "" } };
      const res = makeRes();
      await create(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("rejects duplicate category (case-insensitive)", async () => {
      await Category.create({ name: "Vegetables" });
      const req = { body: { name: "vegetables" } };
      const res = makeRes();
      await create(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("trims category name", async () => {
      const req = { body: { name: "  Dry Fruits  " } };
      const res = makeRes();
      await create(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: "Dry Fruits" }));
    });
  });

  describe("update", () => {
    it("updates a category name", async () => {
      const cat = await Category.create({ name: "Old Name" });
      const req = { params: { id: cat._id }, body: { name: "New Name" } };
      const res = makeRes();
      await update(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: "New Name" }));
    });

    it("updates all products when category is renamed", async () => {
      const cat = await Category.create({ name: "Dry Fruits" });
      Product.updateMany.mockResolvedValue({ modifiedCount: 3 });
      const req = { params: { id: cat._id }, body: { name: "Dry Fruits & Nuts" } };
      const res = makeRes();
      await update(req, res);
      expect(Product.updateMany).toHaveBeenCalledWith({ category: "Dry Fruits" }, { $set: { category: "Dry Fruits & Nuts" } });
    });

    it("rejects update to existing category name", async () => {
      await Category.create({ name: "Category A" });
      await Category.create({ name: "Category B" });
      const catB = (await Category.findOne({ name: "Category B" }));
      const req = { params: { id: catB._id }, body: { name: "Category A" } };
      const res = makeRes();
      await update(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("returns 404 for missing category", async () => {
      const req = { params: { id: "nonexistent" }, body: { name: "X" } };
      const res = makeRes();
      await update(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("toggleActive", () => {
    it("activates an inactive category", async () => {
      const cat = await Category.create({ name: "Inactive Cat", isActive: false });
      const req = { params: { id: cat._id } };
      const res = makeRes();
      await toggleActive(req, res);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.isActive).toBe(true);
    });

    it("deactivates an active category", async () => {
      const cat = await Category.create({ name: "Active Cat", isActive: true });
      const req = { params: { id: cat._id } };
      const res = makeRes();
      await toggleActive(req, res);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.isActive).toBe(false);
    });

    it("returns 404 for missing category", async () => {
      const req = { params: { id: "nonexistent" } };
      const res = makeRes();
      await toggleActive(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("remove", () => {
    it("deletes a category with no products", async () => {
      const cat = await Category.create({ name: "Empty Category" });
      Product.countDocuments.mockResolvedValue(0);
      const req = { params: { id: cat._id } };
      const res = makeRes();
      await remove(req, res);
      expect(res.json).toHaveBeenCalledWith({ message: "ok" });
    });

    it("rejects deletion when products use the category", async () => {
      const cat = await Category.create({ name: "Used Category" });
      Product.countDocuments.mockResolvedValue(3);
      const req = { params: { id: cat._id } };
      const res = makeRes();
      await remove(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("Used Category") }));
    });

    it("returns 404 for missing category", async () => {
      const req = { params: { id: "nonexistent" } };
      const res = makeRes();
      await remove(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
