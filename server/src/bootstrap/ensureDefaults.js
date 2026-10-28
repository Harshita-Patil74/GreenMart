const Category = require("../models/Category");
const Setting = require("../models/Setting");
const categories = require("../constants/categories");

async function ensureDefaults() {
  for (const name of categories) {
    await Category.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true });
  }
  const s = await Setting.findOne();
  if (!s) await Setting.create({ deliveryCharge: Number(process.env.DELIVERY_CHARGE || 30) });
}

module.exports = { ensureDefaults };
