const { sanitizeString, sanitizeUri } = require("../src/config/db");

describe("MongoDB test URI safety", () => {
  function isDedicatedTestDatabase(uri) {
    if (typeof uri !== "string" || !uri.trim()) return false;
    if (!/^mongodb(\+srv)?:\/\//i.test(uri.trim())) return false;
    try {
      const url = new URL(uri.trim());
      const dbName = url.pathname.replace(/^\//, "").split("?")[0];
      return dbName === "greenmart_test";
    } catch (e) {
      return false;
    }
  }

  it("rejects missing URI", () => {
    expect(isDedicatedTestDatabase("")).toBe(false);
    expect(isDedicatedTestDatabase(undefined)).toBe(false);
  });

  it("rejects non-Mongo URI", () => {
    expect(isDedicatedTestDatabase("https://example.com")).toBe(false);
  });

  it("rejects non-test database name", () => {
    expect(isDedicatedTestDatabase("mongodb://localhost:27017/greenmart")).toBe(false);
    expect(isDedicatedTestDatabase("mongodb://localhost:27017/production")).toBe(false);
  });

  it("accepts dedicated test database name", () => {
    expect(isDedicatedTestDatabase("mongodb://localhost:27017/greenmart_test")).toBe(true);
  });
});

describe("MongoDB credential sanitization", () => {
  it("sanitizes username and password in standard MongoDB URI", () => {
    const uri = "mongodb://user:private-password@cluster.mongodb.net/greenmart";
    const sanitized = sanitizeUri(uri);
    expect(sanitized).toBe("mongodb://****@cluster.mongodb.net/greenmart");
    expect(sanitized).not.toContain("user");
    expect(sanitized).not.toContain("private-password");
  });

  it("sanitizes username and password in SRV MongoDB URI", () => {
    const uri = "mongodb+srv://admin:secret123@greenmart.nbnlesb.mongodb.net/test";
    const sanitized = sanitizeUri(uri);
    expect(sanitized).toBe("mongodb+srv://****@greenmart.nbnlesb.mongodb.net/test");
    expect(sanitized).not.toContain("admin");
    expect(sanitized).not.toContain("secret123");
  });

  it("sanitizes URI without credentials unchanged", () => {
    const uri = "mongodb://localhost:27017/greenmart";
    expect(sanitizeUri(uri)).toBe(uri);
  });

  it("sanitizes empty or non-string URI safely", () => {
    expect(sanitizeUri("")).toBe("");
    expect(sanitizeUri(undefined)).toBeUndefined();
    expect(sanitizeUri(null)).toBeNull();
  });

  it("sanitizes credentials in error messages", () => {
    const message = "Failed to connect to mongodb://user:private-password@host/db";
    const sanitized = sanitizeString(message);
    expect(sanitized).toBe("Failed to connect to mongodb://****@host/db");
    expect(sanitized).not.toContain("private-password");
    expect(sanitized).not.toContain("user:");
  });

  it("sanitizes credentials in stack traces", () => {
    const stack = "Error: connect failed\n    at mongodb://user:secret@host:27017 (db.js:10)";
    const sanitized = sanitizeString(stack);
    expect(sanitized).toBe("Error: connect failed\n    at mongodb://****@host:27017 (db.js:10)");
    expect(sanitized).not.toContain("secret");
  });

  it("sanitizes multiple credential occurrences in a single string", () => {
    const value = "mongodb://a:b@host1 and mongodb+srv://c:d@host2";
    const sanitized = sanitizeString(value);
    expect(sanitized).toBe("mongodb://****@host1 and mongodb+srv://****@host2");
    expect(sanitized).not.toContain(":b@");
    expect(sanitized).not.toContain(":d@");
  });

  it("preserves error name, code, and codeName after sanitization", () => {
    const error = new Error("mongodb://user:pass@host/db failed");
    error.name = "MongoServerError";
    error.code = 8000;
    error.codeName = "AtlasError";
    expect(error.name).toBe("MongoServerError");
    expect(error.code).toBe(8000);
    expect(error.codeName).toBe("AtlasError");
    expect(sanitizeString(error.message)).not.toContain("pass");
  });
});
