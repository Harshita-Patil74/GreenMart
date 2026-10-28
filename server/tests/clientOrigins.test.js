const getClientOrigins = require("../src/config/clientOrigins");

describe("getClientOrigins", () => {
  it("allows localhost aliases for the configured local frontend in development", () => {
    expect(getClientOrigins("http://localhost:5173", "development")).toEqual([
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://[::1]:5173",
    ]);
  });

  it("keeps production origins restricted to the configured frontend", () => {
    expect(getClientOrigins("https://greenmart.example", "production")).toEqual([
      "https://greenmart.example",
    ]);
  });
});
