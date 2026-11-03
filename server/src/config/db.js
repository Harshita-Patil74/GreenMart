const mongoose = require("mongoose");
const env = require("./env");

function extractIndexInfo(error) {
  const info = {};
  if (error.keyPattern) info.keyPattern = error.keyPattern;
  if (error.keyValue) info.keyValue = error.keyValue;
  if (error.index) info.index = error.index;
  if (error.collection) info.collection = error.collection;
  if (error.errmsg) info.errmsg = error.errmsg;
  return info;
}

function sanitizeUri(uri) {
  if (!uri || typeof uri !== "string") return uri;
  return uri.replace(/:([^:@]+)@/, ":****@");
}

async function connectDB(uri = env.mongoUri) {
  if (typeof uri !== "string" || !uri.trim()) {
    throw new Error("MongoDB is not configured. Set MONGO_URI before starting the server.");
  }
  if (!/^mongodb(\+srv)?:\/\//i.test(uri.trim())) {
    throw new Error("MONGO_URI must be a MongoDB connection URI.");
  }

  try {
    await mongoose.connect(uri.trim(), { serverSelectionTimeoutMS: 10000 });
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  } catch (error) {
    const indexInfo = extractIndexInfo(error);
    console.error("MongoDB startup error details:");
    console.error("  name:", error.name);
    console.error("  message:", error.message);
    if (error.code !== undefined) console.error("  code:", error.code);
    if (error.codeName) console.error("  codeName:", error.codeName);
    if (error.stack) console.error("  stack:", error.stack);
    if (Object.keys(indexInfo).length > 0) console.error("  indexInfo:", JSON.stringify(indexInfo, null, 2));
    console.error("  MONGO_URI (sanitized):", sanitizeUri(uri));
    throw new Error(
      `MongoDB connection or index initialization failed (${error.name}: ${error.message}). ` +
      `Check MONGO_URI, database access, and schema index conflicts.`
    );
  }
  console.log("MongoDB connected");
}

module.exports = { connectDB };
