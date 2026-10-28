const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const User = require("../src/models/User");
const Product = require("../src/models/Product");
const { connectDB } = require("../src/config/db");

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
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
    expect(productIndexes.some((index) => index.name === "name_text_description_text")).toBe(true);
  });
});
