/**
 * One-time migration: migrate Offer documents from the legacy single-value
 * `isSubscriberExclusive` boolean to the new `audience` array field.
 *
 * Migration mapping:
 *   isSubscriberExclusive: true        -> audience: ["premium"]
 *   isSubscriberExclusive: false       -> audience: ["public"]
 *   missing isSubscriberExclusive      -> audience: ["public"] (or ["premium"] if exclusiveDiscountValue > 0)
 *   already has audience array         -> skipped (idempotent)
 *
 * Usage:
 *   cd server
 *   node src/scripts/migrateOfferAudience.js
 *   node src/scripts/migrateOfferAudience.js --dry-run
 *
 * Requires MONGO_URI in server/.env.
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const { connectDB } = require("../config/db");
const Offer = require("../models/Offer");

const DRY_RUN = process.argv.includes("--dry-run");

function audienceFor(offer) {
  // Already migrated
  if (Array.isArray(offer.audience) && offer.audience.length > 0) return null;

  const isExclusive = offer.isSubscriberExclusive === true;
  const hasExclusiveDiscount = Number(offer.exclusiveDiscountValue || 0) > 0;

  if (isExclusive || hasExclusiveDiscount) return ["premium"];
  return ["public"];
}

async function main() {
  await connectDB();

  const total = await Offer.countDocuments({});
  console.log(`Total offers: ${total}`);

  const offers = await Offer.find({});

  let migrated = 0;
  let skipped = 0;
  let manualReview = 0;

  const operations = [];

  for (const offer of offers) {
    const target = audienceFor(offer);
    if (!target) {
      skipped += 1;
      continue;
    }

    // Check if already has this exact audience (idempotent)
    const current = offer.audience;
    if (Array.isArray(current) && current.length === target.length && current.every((v, i) => v === target[i])) {
      skipped += 1;
      continue;
    }

    // Unknown legacy value requiring manual review
    if (!offer.isSubscriberExclusive && !offer.audience && Number(offer.exclusiveDiscountValue || 0) === 0) {
      manualReview += 1;
      console.log(`MANUAL_REVIEW offer=${offer._id} title="${offer.title}" no audience signals found, defaulting to ["public"]`);
    }

    if (DRY_RUN) {
      console.log(`DRY-RUN offer=${offer._id} title="${offer.title}" audience: ${JSON.stringify(current || null)} -> ${JSON.stringify(target)}`);
      migrated += 1;
      continue;
    }

    operations.push({
      updateOne: {
        filter: { _id: offer._id },
        update: { $set: { audience: target } },
      },
    });
    migrated += 1;
  }

  if (operations.length > 0) {
    const result = await Offer.bulkWrite(operations);
    console.log(`Bulk write: matched=${result.matchedCount} modified=${result.modifiedCount}`);
  }

  if (!DRY_RUN) {
    const remainingLegacy = await Offer.countDocuments({
      audience: { $exists: false },
      isSubscriberExclusive: { $exists: true },
    });
    console.log(`Offers still missing audience migration: ${remainingLegacy}`);
  }

  console.log(`\nMigration summary:`);
  console.log(`  Total offers: ${total}`);
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Skipped (already migrated): ${skipped}`);
  console.log(`  Manual review: ${manualReview}`);
  console.log(`  Dry run: ${DRY_RUN}`);

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
});
