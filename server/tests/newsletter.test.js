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
const { subscribe, unsubscribe, list } = require("../src/controllers/newsletterController");

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

  describe("subscribe", () => {
    it("subscribes a new email", async () => {
      const req = { body: { email: "user@example.com" } };
      const res = makeRes();
      await subscribe(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Successfully subscribed to GreenMart updates!" })
      );
    });

    it("rejects empty email", async () => {
      const req = { body: { email: "" } };
      const res = makeRes();
      await subscribe(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("rejects invalid email", async () => {
      const req = { body: { email: "not-an-email" } };
      const res = makeRes();
      await subscribe(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("trims and lowercases email", async () => {
      const req = { body: { email: "  USER@Example.COM  " } };
      const res = makeRes();
      await subscribe(req, res);
      expect(Newsletter.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: "user@example.com" })
      );
    });

    it("rejects duplicate email", async () => {
      await Newsletter.create({ email: "user@example.com", isActive: true });
      const req = { body: { email: "user@example.com" } };
      const res = makeRes();
      await subscribe(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "This email is already subscribed to GreenMart updates." })
      );
    });

    it("reactivates a previously unsubscribed email", async () => {
      await Newsletter.create({ email: "user@example.com", isActive: false });
      const req = { body: { email: "user@example.com" } };
      const res = makeRes();
      await subscribe(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Successfully subscribed to GreenMart updates!" })
      );
    });
  });

  describe("unsubscribe", () => {
    it("unsubscribes an existing email", async () => {
      await Newsletter.create({ email: "user@example.com", isActive: true });
      const req = { body: { email: "user@example.com" } };
      const res = makeRes();
      await unsubscribe(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "You have been unsubscribed from GreenMart updates" })
      );
    });

    it("rejects empty email", async () => {
      const req = { body: { email: "" } };
      const res = makeRes();
      await unsubscribe(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 for unknown email", async () => {
      const req = { body: { email: "unknown@example.com" } };
      const res = makeRes();
      await unsubscribe(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("list", () => {
    it("returns only active subscribers for admin", async () => {
      await Newsletter.create({ email: "a@example.com", isActive: true });
      await Newsletter.create({ email: "b@example.com", isActive: false });
      const req = { user: { role: "admin" }, query: { isActive: "true" } };
      const res = makeRes();
      await list(req, res);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.find((s) => s.email === "a@example.com")).toBeDefined();
      expect(jsonArg.find((s) => s.email === "b@example.com")).toBeUndefined();
    });

    it("rejects non-admin access", async () => {
      const req = { user: { role: "customer" } };
      const res = makeRes();
      await list(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
