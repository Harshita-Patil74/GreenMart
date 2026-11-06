const crypto = require("crypto");
const env = require("../config/env");

function secret() {
  return env.newsletterUnsubscribeSecret || env.jwtSecret || "greenmart-newsletter";
}

function generateToken(email) {
  const payload = Buffer.from(JSON.stringify({ email: String(email).toLowerCase().trim(), exp: Date.now() + 1000 * 60 * 60 * 24 * 365 })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return payload + "." + sig;
}

function verifyToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  let data;
  try { data = JSON.parse(Buffer.from(payload, "base64url").toString()); } catch { return null; }
  if (!data?.email || !data?.exp || Date.now() > data.exp) return null;
  return data.email;
}

module.exports = { generateToken, verifyToken };
