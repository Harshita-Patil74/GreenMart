const mongoose = require("mongoose");
const env = require("./env");

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
    throw new Error(`MongoDB connection or index initialization failed${error?.name ? ` (${error.name})` : ""}. Check MONGO_URI, database access, and schema index conflicts.`);
  }
  console.log("MongoDB connected");
}

module.exports = { connectDB };
