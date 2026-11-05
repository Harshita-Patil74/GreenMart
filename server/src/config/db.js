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

/**
 * Safely migrates the products text index from the legacy 2-field version
 * (name, description) to the updated 3-field version (name, description, category).
 * MongoDB does not allow two text indexes where one is a subset of the other
 * with different options (error 85: IndexOptionsConflict), so we must drop the
 * legacy index before creating the new one.
 *
 * This function is idempotent: if the new index already exists, nothing changes.
 * If neither exists, the new one is created by Mongoose's model.init() later.
 */
async function migrateProductTextIndex() {
  const Product = mongoose.models.Product;
  if (!Product) return; // Product model not loaded yet; Mongoose will handle it on init

  const db = mongoose.connection.db;
  const collectionName = Product.collection.name || "products";

  try {
    // Check if the products collection exists before attempting index migration
    const collections = await db.listCollections({ name: collectionName }).toArray();
    if (collections.length === 0) {
      console.log(`Collection "${collectionName}" does not exist yet; Mongoose will create indexes on init.`);
      return;
    }

    const indexes = await db.collection(collectionName).indexes();
    const indexNames = indexes.map((idx) => idx.name);

    const legacyIndexName = "name_text_description_text";
    const newIndexName = "name_text_description_text_category_text";

    const hasLegacy = indexNames.includes(legacyIndexName);
    const hasNew = indexNames.includes(newIndexName);

    if (hasLegacy && !hasNew) {
      console.log(`Dropping legacy text index "${legacyIndexName}" on "${collectionName}"`);
      await db.collection(collectionName).dropIndex(legacyIndexName);
      console.log(`Legacy text index "${legacyIndexName}" dropped`);
    }

    if (hasLegacy && hasNew) {
      console.log(`Both legacy "${legacyIndexName}" and new "${newIndexName}" text indexes exist. Keeping new, dropping legacy.`);
      await db.collection(collectionName).dropIndex(legacyIndexName);
      console.log(`Legacy text index "${legacyIndexName}" dropped`);
    }

    if (!hasLegacy && !hasNew) {
      console.log(`No existing text index found on "${collectionName}"; Mongoose will create "${newIndexName}" on init.`);
    }

    if (hasNew) {
      console.log(`Updated text index "${newIndexName}" already exists on "${collectionName}"; skipping migration.`);
    }
  } catch (error) {
    console.error("Failed to migrate product text index:");
    console.error("  name:", error.name);
    console.error("  message:", error.message);
    if (error.code !== undefined) console.error("  code:", error.code);
    if (error.codeName) console.error("  codeName:", error.codeName);
    throw new Error(
      `Product text index migration failed: ${error.message}`
    );
  }
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

    // Migrate text index before initializing models to avoid IndexOptionsConflict (error 85)
    await migrateProductTextIndex();

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

module.exports = { connectDB, migrateProductTextIndex };
