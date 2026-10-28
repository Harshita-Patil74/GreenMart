const geminiConfig = require("../config/gemini");
const Product = require("../models/Product");
const env = require("../config/env");
const FALLBACK_MODEL = "gemini-3.5-flash-lite";

class AssistantServiceError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "AssistantServiceError";
    this.status = status;
  }
}

async function chat(message, history = []) {
  const safeMessage = typeof message === "string" ? message.trim() : "";
  if (!safeMessage) {
    throw new AssistantServiceError("Please enter a shopping question before sending.", 400);
  }

  const geminiStatus = geminiConfig.getGeminiStatus();
  if (!geminiStatus.configured) {
    const message = geminiStatus.reason === "missing" || geminiStatus.reason === "placeholder"
      ? "The AI assistant is not configured. Check GEMINI_API_KEY in the server environment."
      : "The AI assistant is not configured. Check GEMINI_MODEL in the server environment.";
    throw new AssistantServiceError(message, 503);
  }

  const conversation = Array.isArray(history) ? history
    .filter((entry) => entry && typeof entry?.text === "string")
    .slice(-10)
    .map((entry) => ({ role: entry.role === "user" ? "user" : "assistant", text: String(entry.text).trim() }))
    .filter((entry) => entry.text) : [];

  // find relevant products
  const words = safeMessage.toLowerCase().match(/[a-z0-9]+/g) || [];
  const query = { status: "Active", stock: { $gt: 0 } };
  // simple keyword search
  const products = await Product.find(query).limit(20).populate("farmer","name");
  const relevant = products.filter((p) => {
    const haystacks = [p.name, p.category, p.farmer?.farmName || p.farmer?.name];
    return words.some((word) => haystacks.some((field) => String(field || "").toLowerCase().includes(word)));
  });
  const pool = relevant.length ? relevant : products.slice(0, 8);
  const productData = pool.map((p) => ({ id: p._id, name: p.name, price: p.price, unit: p.unit, category: p.category, stock: p.stock, farm: p.farmer?.farmName || p.farmer?.name }));
  try {
    const gemini = geminiConfig.getGemini();
    if (!gemini) {
      throw new AssistantServiceError("The AI assistant is not configured. Check GEMINI_API_KEY in the server environment.", 503);
    }
    const contextText = conversation.length ? `Conversation context: ${conversation.map((entry) => `${entry.role}: ${entry.text}`).join(" | ")}.` : "";
    const prompt = `You are GreenMart shopping assistant. Only use these real products (JSON): ${JSON.stringify(productData)}. ${contextText} User message: ${safeMessage}. Recommend/compare/answer budget using only these. If none match, say so. Do not invent products. Reply concise.`;
    let res;
    const models = [...new Set([env.geminiModel, FALLBACK_MODEL])];
    for (let index = 0; index < models.length; index += 1) {
      try {
        res = await gemini.models.generateContent({
          model: models[index],
          contents: prompt,
          config: { maxOutputTokens: 512 },
        });
        break;
      } catch (error) {
        const providerStatus = Number(
          error?.status || error?.statusCode || error?.response?.status ||
          String(error?.message || "").match(/got status:\s*(\d{3})/i)?.[1]
        );
        if (index === 0 && [503, 504].includes(providerStatus) && models.length > 1) {
          console.warn("Gemini primary model unavailable; retrying with fallback:", providerStatus);
          continue;
        }
        throw error;
      }
    }
    const text = typeof res?.text === "string" ? res.text.trim() : "";
    if (!text) throw new AssistantServiceError("The AI assistant returned an invalid response. Please try again.", 502);
    return { reply: text, products: productData };
  } catch (e) {
    if (e instanceof AssistantServiceError) throw e;
    const message = String(e?.message || "");
    const status = Number(e?.status || e?.statusCode || e?.response?.status || message.match(/got status:\s*(\d{3})/i)?.[1]);
    const code = String(e?.code || "");
    const description = message.toLowerCase();
    let userMessage = "The AI assistant is temporarily unavailable. Please try again shortly.";
    let httpStatus = 502;
    if (status === 429 || /quota|resource_exhausted/.test(description)) {
      userMessage = "The AI assistant has reached its request limit. Please try again later.";
      httpStatus = 429;
    } else if (/timeout|timed out|etimedout|abort/.test(`${code} ${description}`)) {
      userMessage = "The AI assistant took too long to respond. Please try again.";
      httpStatus = 504;
    } else if (status === 401 || status === 403) {
      userMessage = "The AI assistant credentials were rejected. Check GEMINI_API_KEY in the server environment.";
      httpStatus = 503;
    } else if (status === 404) {
      userMessage = "The configured Gemini model is unavailable. Check GEMINI_MODEL in the server environment.";
      httpStatus = 503;
    }
    console.error("Gemini request failed:", status || code || "invalid_response");
    throw new AssistantServiceError(userMessage, httpStatus);
  }
}
module.exports = { chat, AssistantServiceError };
