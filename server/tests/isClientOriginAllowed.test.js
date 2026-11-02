const isClientOriginAllowed = require("../src/config/isClientOriginAllowed");

describe("isClientOriginAllowed", () => {
  it("allows Vite's fallback port on local development hosts", () => {
    expect(isClientOriginAllowed("http://localhost:5174", "http://localhost:5173", "development")).toBe(true);
    expect(isClientOriginAllowed("http://127.0.0.1:5180", "http://localhost:5173", "development")).toBe(true);
  });

  it("allows the configured frontend origin", () => {
    expect(isClientOriginAllowed("https://greenmart.example", "https://greenmart.example", "production")).toBe(true);
  });

  it("does not allow unrelated hosts or arbitrary production origins", () => {
    expect(isClientOriginAllowed("https://attacker.example", "https://greenmart.example", "production")).toBe(false);
    expect(isClientOriginAllowed("http://192.168.1.10:5174", "http://localhost:5173", "development")).toBe(false);
  });

  it("allows requests without an Origin header", () => {
    expect(isClientOriginAllowed(undefined, "http://localhost:5173", "development")).toBe(true);
  });
});
