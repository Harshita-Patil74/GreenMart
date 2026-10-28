const env = require("../src/config/env");
const { getGeminiStatus } = require("../src/config/gemini");

const originalApiKey = env.geminiApiKey;
const originalModel = env.geminiModel;

afterEach(() => {
  env.geminiApiKey = originalApiKey;
  env.geminiModel = originalModel;
});

describe("Gemini backend configuration", () => {
  it("requires a non-placeholder server-side API key", () => {
    env.geminiApiKey = "";
    expect(getGeminiStatus()).toEqual({ configured: false, reason: "missing" });

    env.geminiApiKey = "your-gemini-key";
    expect(getGeminiStatus()).toEqual({ configured: false, reason: "placeholder" });
  });

  it("reports valid key/model configuration without exposing the key", () => {
    env.geminiApiKey = "private-test-api-key";
    env.geminiModel = "gemini-test-model";

    expect(getGeminiStatus()).toEqual({ configured: true });
    expect(JSON.stringify(getGeminiStatus())).not.toContain(env.geminiApiKey);
  });
});
