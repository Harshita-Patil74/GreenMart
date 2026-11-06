jest.mock("../src/models/Newsletter", () => {
  const subscribers = [];
  return {
    findOne: jest.fn().mockImplementation(async (query) => {
      return subscribers.find((s) => s.email === query.email);
    }),
    create: jest.fn().mockImplementation(async (data) => {
      const sub = { _id: "sub_" + Date.now(), ...data };
      subscribers.push(sub);
      return sub;
    }),
    findByIdAndUpdate: jest.fn().mockImplementation(async (id, data) => {
      const idx = subscribers.findIndex((s) => s._id === id);
      if (idx === -1) return null;
      subscribers[idx] = { ...subscribers[idx], ...data };
      return subscribers[idx];
    }),
    find: jest.fn().mockImplementation((query) => {
      let result = subscribers;
      if (query && query.isActive !== undefined) {
        result = subscribers.filter((s) => s.isActive === query.isActive);
      }
      result = result.slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      const thenable = {
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(result),
        then: jest.fn().mockImplementation((resolve) => resolve(result)),
      };
      return thenable;
    }),
    __reset: () => { subscribers.length = 0; },
  };
});

jest.resetModules();
const Newsletter = require("../src/models/Newsletter");
const { list } = require("../src/controllers/newsletterController");

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("Newsletter Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Newsletter.__reset();
  });

  describe("list", () => {
    it("returns only active subscribers for admin", async () => {
      await Newsletter.create({ email: "a@example.com", isActive: true });
      await Newsletter.create({ email: "b@example.com", isActive: false });
      const req = { user: { role: "admin" }, query: { isActive: "true" } };
      const res = makeRes();
      await list(req, res);
      const jsonArg = res.json.mock.calls[0][0];
      const items = jsonArg.items || jsonArg;
      expect(items.find((s) => s.email === "a@example.com")).toBeDefined();
      expect(items.find((s) => s.email === "b@example.com")).toBeUndefined();
    });

    it("rejects non-admin access", async () => {
      const req = { user: { role: "customer" } };
      const res = makeRes();
      await list(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
