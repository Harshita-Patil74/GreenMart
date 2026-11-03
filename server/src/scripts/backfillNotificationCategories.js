/**
 * One-time migration: backfill the `category` field on Notification records
 * that were saved without one (category is null, "", or missing), inferring
 * the standard category from the notification `type`.
 *
 * This does NOT create duplicate records and does not invent notification
 * history — it only populates missing metadata on existing records.
 *
 * Usage:
 *   cd server
 *   node src/scripts/backfillNotificationCategories.js
 *
 * Requires MONGO_URI in server/.env.
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const { connectDB } = require("../config/db");
const Notification = require("../models/Notification");
const { TYPE_CATEGORY_MAP } = require("../controllers/notificationController");

async function main() {
  await connectDB();

  const missing = await Notification.countDocuments({
    $or: [{ category: { $in: [null, ""] } }, { category: { $exists: false } }],
  });
  console.log(`Notifications missing category: ${missing}`);
  if (missing === 0) {
    await mongoose.disconnect();
    return;
  }

  const operations = Object.entries(TYPE_CATEGORY_MAP).map(([type, category]) => ({
    updateMany: {
      filter: {
        type,
        $or: [{ category: { $in: [null, ""] } }, { category: { $exists: false } }],
      },
      update: { $set: { category } },
    },
  }));

  const result = await Notification.bulkWrite(operations);
  console.log(`Backfilled categories: matched=${result.matchedCount} modified=${result.modifiedCount}`);

  const remaining = await Notification.countDocuments({
    $or: [{ category: { $in: [null, ""] } }, { category: { $exists: false } }],
  });
  console.log(`Notifications still missing category: ${remaining}`);

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
});
