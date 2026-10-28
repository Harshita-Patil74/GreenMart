const jwt = require("jsonwebtoken");
const { auth } = require("../src/middleware/auth");
const { role } = require("../src/middleware/role");

describe("RBAC middleware", () => {
  const res = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
  it("rejects missing token", async () => {
    const req = { headers: {} };
    const r = res();
    const next = jest.fn();
    await auth(req, r, next);
    expect(r.status).toHaveBeenCalledWith(401);
  });
  it("rejects invalid token", async () => {
    const req = { headers: { authorization: "Bearer bad" } };
    const r = res();
    const next = jest.fn();
    await auth(req, r, next);
    expect(r.status).toHaveBeenCalledWith(401);
  });
  it("role middleware rejects wrong role", () => {
    const req = { user: { role: "customer" } };
    const r = res();
    const next = jest.fn();
    role("admin")(req, r, next);
    expect(r.status).toHaveBeenCalledWith(403);
  });
  it("role middleware allows matching role", () => {
    const req = { user: { role: "admin" } };
    const r = res();
    const next = jest.fn();
    role("admin")(req, r, next);
    expect(next).toHaveBeenCalled();
  });
});
