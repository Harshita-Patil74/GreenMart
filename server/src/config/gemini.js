const { GoogleGenAI } = require("@google/genai");
const env = require("./env");

let client = null;

function getGeminiStatus() {
  const apiKey = String(env.geminiApiKey || "").trim();
  if (!apiKey) return { configured: false, reason: "missing" };
  if (/^(your[-_ ]|change[-_ ]me|placeholder)/i.test(apiKey)) {
    return { configured: false, reason: "placeholder" };
  }
  if (!String(env.geminiModel || "").trim()) return { configured: false, reason: "model" };
  return { configured: true };
}

function getGemini() {
  if (client) return client;
  if (!getGeminiStatus().configured) return null;
  client = new GoogleGenAI({
    apiKey: env.geminiApiKey.trim(),
    httpOptions: { timeout: 30000 },
  });
  return client;
}

module.exports = { getGemini, getGeminiStatus };
