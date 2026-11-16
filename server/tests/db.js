const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const Setting = require("../src/models/Setting");
const { DEFAULT_SETTINGS } = require("../src/controllers/settingsController");

// Dedicated parent directory for test databases.
// Each test run gets its own unique child directory.
const TEST_DB_ROOT = path.resolve(__dirname, "..", ".mongodb-test-data");

let mongod;
let dbPath;

async function connectDB() {
  fs.mkdirSync(TEST_DB_ROOT, { recursive: true });
  dbPath = fs.mkdtempSync(path.join(TEST_DB_ROOT, "mongod-"));

  mongod = await MongoMemoryServer.create({
    instance: {
      dbPath,
      storageEngine: "wiredTiger",
    },
  });

  await mongoose.connect(mongod.getUri());

  // Seed default delivery settings for fresh test databases.
  await Setting.updateOne(
    {},
    { $setOnInsert: DEFAULT_SETTINGS },
    { upsert: true, setDefaultsOnInsert: true }
  );
}

async function disconnectDB() {
  let firstError;
  try {
    if (mongod) await mongod.stop();
    await mongoose.disconnect();
  } catch (error) {
    firstError = error;
  } finally {
    // Clean up only the directory created by this MongoMemoryServer instance.
    if (dbPath && fs.existsSync(dbPath)) {
      try {
        fs.rmSync(dbPath, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup; never mask stop/disconnect errors.
      }
    }
    mongod = undefined;
    dbPath = undefined;
  }
  if (firstError) throw firstError;
}

module.exports = { connectDB, disconnectDB };