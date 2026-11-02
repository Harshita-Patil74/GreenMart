const getClientOrigins = require("./clientOrigins");

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isClientOriginAllowed(origin, clientUrl, nodeEnv) {
  if (!origin) return true;

  const allowedOrigins = getClientOrigins(clientUrl, nodeEnv);
  if (allowedOrigins.includes(origin)) return true;
  if (nodeEnv === "production") return false;

  try {
    const parsedOrigin = new URL(origin);
    return parsedOrigin.protocol === "http:" && LOCAL_HOSTS.has(parsedOrigin.hostname);
  } catch {
    return false;
  }
}

module.exports = isClientOriginAllowed;
