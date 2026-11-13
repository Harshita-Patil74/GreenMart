const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

let mongod;

async function connectDB() {
  // Use project-relative dbPath on the project drive (avoids C: drive which has no free space)
  const dbPath = path.resolve(__dirname, "..", "mongodb-test-data");
  // Clean dbPath before each test run to avoid duplicate key errors from leftover data
  fs.rmSync(dbPath, { recursive: true, force: true });
  fs.mkdirSync(dbPath, { recursive: true });
  mongod = await MongoMemoryServer.create({
    instance: {
      dbPath,
      storageEngine: "wiredTiger",
    },
  });
  await mongoose.connect(mongod.getUri());
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

module.exports = { connectDB, disconnectDB };