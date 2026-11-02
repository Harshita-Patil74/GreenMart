const { GoogleGenAI } = require("@google/genai");
const env = require("../config/env");
const Product = require("../models/Product");

async function answerQuestion(message) {
  if (!env.geminiApiKey) throw new Error("The AI assistant is not configured. Check GEMINI_API_KEY in the server environment.");
  const products = await Product.find({}).limit(50).lean();
  const highest = products.reduce((a,b)=> (b.price > (a?.price||0) ? b : a), null);
  const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });
  const prompt = "User: " + message + "\nProducts JSON: " + JSON.stringify(products.map(p=>({name:p.name,price:p.price,category:p.category}))) + "\nHighest price product: " + (highest? highest.name + " " + highest.price : "none");
  const res = await ai.models.generateContent({ model: env.geminiModel || "gemini-2.0-flash", contents: prompt });
  return res.text || "No response";
}

module.exports = { answerQuestion };
