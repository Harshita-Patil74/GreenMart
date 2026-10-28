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
