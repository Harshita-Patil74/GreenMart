const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const path = require("path");
const fs = require("fs");
const User = require("../src/models/User");
const Product = require("../src/models/Product");
const { connectDB } = require("../src/config/db");

const TEST_DB_ROOT = path.resolve(__dirname, "..", ".mongodb-test-data");

let mongod;
let dbPath;

beforeAll(async () => {
  fs.mkdirSync(TEST_DB_ROOT, { recursive: true });
  dbPath = fs.mkdtempSync(path.join(TEST_DB_ROOT, "dbconfig-"));
  mongod = await MongoMemoryServer.create({
    instance: {
      dbPath,
      storageEngine: "wiredTiger",
    },
  });
});

afterAll(async () => {
  let firstError;
  try {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
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
});

describe("MongoDB startup configuration", () => {
  it("fails clearly when MONGO_URI is missing or not a MongoDB URI", async () => {
    await expect(connectDB("")).rejects.toThrow("Set MONGO_URI");
    await expect(connectDB("https://invalid.example.test")).rejects.toThrow("must be a MongoDB connection URI");
  });

  it("sanitizes connection errors so credentials are not echoed", async () => {
    const connect = jest.spyOn(mongoose, "connect").mockRejectedValue(new Error("mongodb://user:private-password@host/db"));

    await expect(connectDB("mongodb://user:private-password@host/db"))
      .rejects.toThrow("MongoDB connection or index initialization failed");
    expect(connect.mock.calls[0][1]).toEqual({ serverSelectionTimeoutMS: 10000 });
    connect.mockRestore();
  });

  it("connects to a disposable test database, initializes indexes, and supports CRUD", async () => {
    await connectDB(mongod.getUri());
    const user = await User.create({
      name: "Database Test",
      email: "db-config@example.test",
      passwordHash: "test-hash",
    });
    expect((await User.findById(user._id)).email).toBe("db-config@example.test");

    const userIndexes = await User.collection.indexes();
    const productIndexes = await Product.collection.indexes();
    expect(userIndexes.find((index) => index.name === "email_1").unique).toBe(true);
    expect(productIndexes.some((index) => index.name === "name_text_description_text_category_text")).toBe(true);
  });
});
