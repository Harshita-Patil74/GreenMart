const { connectDB, disconnectDB } = require("./db");
const Product = require("../src/models/Product");
const User = require("../src/models/User");
const geminiConfig = require("../src/config/gemini");
const { chat } = require("../src/services/assistantService");

beforeAll(async () => {
  await connectDB();
  const farmer = await User.create({
    name: "Assistant Farm",
    email: "assistant-farm@example.test",
    passwordHash: "test-hash",
    role: "farmer",
  });
  await Product.create({
    name: "Organic Apples",
    price: 100,
    unit: "kg",
    category: "Fruits",
    stock: 5,
    farmer: farmer._id,
  });
});

afterAll(async () => {
  await disconnectDB();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Gemini shopping assistant", () => {
  it("rejects empty or whitespace-only prompts before contacting Gemini", async () => {
    const getGeminiStatus = jest.spyOn(geminiConfig, "getGeminiStatus").mockReturnValue({ configured: true });
    const getGemini = jest.spyOn(geminiConfig, "getGemini").mockReturnValue({ models: { generateContent: jest.fn() } });

    await expect(chat("   ")).rejects.toMatchObject({
      name: "AssistantServiceError",
      status: 400,
      message: expect.stringContaining("shopping question"),
    });

    expect(getGemini).not.toHaveBeenCalled();
    getGeminiStatus.mockRestore();
  });

  it("returns a clear setup error without calling Gemini when credentials are missing", async () => {
    const getGeminiStatus = jest.spyOn(geminiConfig, "getGeminiStatus").mockReturnValue({ configured: false, reason: "missing" });
    const getGemini = jest.spyOn(geminiConfig, "getGemini").mockReturnValue(null);

    await expect(chat("apples")).rejects.toMatchObject({
      name: "AssistantServiceError",
      status: 503,
      message: expect.stringContaining("GEMINI_API_KEY"),
    });

    expect(getGemini).not.toHaveBeenCalled();
    getGeminiStatus.mockRestore();
  });

  it("uses the configured model and relevant catalogue items on success", async () => {
    const generateContent = jest.fn().mockResolvedValue({ text: "Organic apples cost ₹100 per kg." });
    jest.spyOn(geminiConfig, "getGeminiStatus").mockReturnValue({ configured: true });
    jest.spyOn(geminiConfig, "getGemini").mockReturnValue({ models: { generateContent } });

    const response = await chat("apples");

    expect(response.reply).toBe("Organic apples cost ₹100 per kg.");
    expect(response.products).toHaveLength(1);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it.each([503, 504])("uses the verified fallback model when Gemini returns HTTP %i", async (status) => {
    const generateContent = jest.fn()
      .mockRejectedValueOnce(Object.assign(new Error("Temporary provider failure"), { status }))
      .mockResolvedValueOnce({ text: "Organic apples are available." });
    jest.spyOn(geminiConfig, "getGeminiStatus").mockReturnValue({ configured: true });
    jest.spyOn(geminiConfig, "getGemini").mockReturnValue({ models: { generateContent } });
    const consoleWarn = jest.spyOn(console, "warn").mockImplementation(() => {});

    const response = await chat("apples");

    expect(response.reply).toBe("Organic apples are available.");
    expect(generateContent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ model: "gemini-3.5-flash-lite" })
    );
    consoleWarn.mockRestore();
  });

  it("handles quota, timeout, and malformed provider responses without false success", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    const getGeminiStatus = jest.spyOn(geminiConfig, "getGeminiStatus");
    const getGemini = jest.spyOn(geminiConfig, "getGemini");
    const failures = [
      { error: Object.assign(new Error("Quota exceeded"), { status: 429 }), expected: "request limit", status: 429 },
      { error: Object.assign(new Error("Request timed out"), { code: "ETIMEDOUT" }), expected: "too long", status: 504 },
      { error: Object.assign(new Error("Unauthorized"), { status: 403 }), expected: "credentials were rejected", status: 503 },
      { error: Object.assign(new Error("got status: 404 Not Found"), { status: 404 }), expected: "model is unavailable", status: 503 },
      { result: { text: "" }, expected: "invalid response", status: 502 },
    ];

    for (const failure of failures) {
      const generateContent = failure.error
        ? jest.fn().mockRejectedValue(failure.error)
        : jest.fn().mockResolvedValue(failure.result);
      getGeminiStatus.mockReturnValue({ configured: true });
      getGemini.mockReturnValue({ models: { generateContent } });

      await expect(chat("apples")).rejects.toMatchObject({
        name: "AssistantServiceError",
        status: failure.status,
        message: expect.stringContaining(failure.expected),
      });
    }
    consoleError.mockRestore();
  });
});
