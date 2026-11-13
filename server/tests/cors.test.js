process.env.CLIENT_URL = "https://green-mart-three.vercel.app,http://localhost:5173";
jest.resetModules();
const request = require("supertest");
const app = require("../src/app");

describe("API CORS", () => {
  it("allows preflight requests from a Vite fallback port in development", async () => {
    const response = await request(app)
      .options("/api/categories")
      .set("Origin", "http://localhost:5174")
      .set("Access-Control-Request-Method", "GET")
      .set("Access-Control-Request-Headers", "authorization,content-type");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5174");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("allows preflight requests from the Vercel production frontend", async () => {
    const response = await request(app)
      .options("/api/categories")
      .set("Origin", "https://green-mart-three.vercel.app")
      .set("Access-Control-Request-Method", "GET")
      .set("Access-Control-Request-Headers", "authorization,content-type");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("https://green-mart-three.vercel.app");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("does not grant CORS access to unrelated origins", async () => {
    const response = await request(app)
      .options("/api/categories")
      .set("Origin", "https://untrusted.example")
      .set("Access-Control-Request-Method", "GET");

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
