require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const FarmerProfile = require("../models/FarmerProfile");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Setting = require("../models/Setting");
const Order = require("../models/Order");
const Review = require("../models/Review");
const Notification = require("../models/Notification");
const Wishlist = require("../models/Wishlist");
const Message = require("../models/Message");
const Address = require("../models/Address");
const fs = require("fs");
const path = require("path");

const reset = process.argv.includes("--reset");
const force = process.argv.includes("--force");

if (process.env.NODE_ENV === "production" && !force) {
  console.error("Refusing to seed in production. Use --force to override.");
  process.exit(1);
}
if (!process.env.SEED_PASSWORD) {
  console.error("SEED_PASSWORD is required in .env");
  process.exit(1);
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  // ensure defaults
  const cats = ["Vegetables","Fruits","Grains & Pulses","Dairy & Eggs","Spices & Herbs","Eco Friendly","Others"];
  for (const c of cats) await Category.updateOne({ name: c }, { $setOnInsert: { name: c } }, { upsert: true });
  await Setting.updateOne({}, { $setOnInsert: { deliveryCharge: 30 } }, { upsert: true });

  if (reset) {
    await Promise.all([
      User.deleteMany({ isDemo: true }),
      FarmerProfile.deleteMany({ isDemo: true }),
      Product.deleteMany({ isDemo: true }),
      Order.deleteMany({ isDemo: true }),
      Review.deleteMany({ isDemo: true }),
      Notification.deleteMany({ isDemo: true }),
      Wishlist.deleteMany({ isDemo: true }),
      Message.deleteMany({ isDemo: true }),
      Address.deleteMany({ isDemo: true }),
    ]);
  }

  const hash = await bcrypt.hash(process.env.SEED_PASSWORD, 10);
  const demo = (email) => email.endsWith("@demo.greenmart.test");

  // Users
  const admin = await User.findOneAndUpdate({ email: "admin@demo.greenmart.test" }, { $setOnInsert: { name: "Admin", email: "admin@demo.greenmart.test", passwordHash: hash, role: "admin", isDemo: true } }, { upsert: true, new: true });
  const cust = await User.findOneAndUpdate({ email: "harshita@demo.greenmart.test" }, { $setOnInsert: { name: "Harshita Patil", email: "harshita@demo.greenmart.test", passwordHash: hash, role: "customer", phone: "+91 98765 43210", isDemo: true } }, { upsert: true, new: true });
  const riya = await User.findOneAndUpdate({ email: "riya@demo.greenmart.test" }, { $setOnInsert: { name: "Riya S.", email: "riya@demo.greenmart.test", passwordHash: hash, role: "customer", isDemo: true } }, { upsert: true, new: true });
  const sunil = await User.findOneAndUpdate({ email: "sunil@demo.greenmart.test" }, { $setOnInsert: { name: "Sunil K.", email: "sunil@demo.greenmart.test", passwordHash: hash, role: "customer", isDemo: true } }, { upsert: true, new: true });
  const ravi = await User.findOneAndUpdate({ email: "ravi@demo.greenmart.test" }, { $setOnInsert: { name: "Ravi R.", email: "ravi@demo.greenmart.test", passwordHash: hash, role: "customer", isDemo: true } }, { upsert: true, new: true });

  // Farmers
  const farmerData = [
    { name: "Ramesh Gouda", email: "ramesh@demo.greenmart.test", farm: "Green Fields Farm", cat: "Vegetables", verified: true, coords: [15.42, 75.62] },
    { name: "Healthy Harvest", email: "healthy@demo.greenmart.test", farm: "Healthy Harvest Farm", cat: "Fruits", verified: false, coords: [15.43, 75.63] },
    { name: "Sunrise Dairy", email: "sunrise@demo.greenmart.test", farm: "Sunrise Organic Farm", cat: "Dairy & Eggs", verified: false, coords: [15.41, 75.61] },
  ];
  const farmers = [];
  for (const f of farmerData) {
    const u = await User.findOneAndUpdate({ email: f.email }, { $setOnInsert: { name: f.name, email: f.email, passwordHash: hash, role: "farmer", isDemo: true } }, { upsert: true, new: true });
    await FarmerProfile.findOneAndUpdate({ user: u._id }, { $setOnInsert: { user: u._id, farmName: f.farm, category: f.cat, address: "Gadag, Karnataka", location: { lat: f.coords[0], lng: f.coords[1] }, certification: { verifiedByAdmin: f.verified }, isDemo: true } }, { upsert: true });
    farmers.push(u);
  }

  // Addresses for Harshita
  const addr1 = await Address.findOneAndUpdate({ user: cust._id, line1: "Plot 42, Green Avenue" }, { $setOnInsert: { user: cust._id, name: "Harshita Patil", line1: "Plot 42, Green Avenue", city: "Gadag, Karnataka - 582101", phone: "+91 98765 43210", coordinates: { lat: 15.42, lng: 75.62 }, isDemo: true } }, { upsert: true, new: true });
  const addr2 = await Address.findOneAndUpdate({ user: cust._id, line1: "Station Road, Near Jubilee Circle" }, { $setOnInsert: { user: cust._id, name: "Harshita Patil", line1: "Station Road, Near Jubilee Circle", city: "Gadag, Karnataka - 582101", phone: "+91 98765 43210", isDemo: true } }, { upsert: true, new: true });

  // Products
  const prods = [
    { name: "Organic Tomatoes", category: "Vegetables", price: 40, unit: "kg", stock: 50, farmer: farmers[0]._id, featured: true },
    { name: "Fresh Spinach", category: "Vegetables", price: 25, unit: "bunch", stock: 12, farmer: farmers[0]._id, lowStockThreshold: 15 },
    { name: "Organic Carrots", category: "Vegetables", price: 35, unit: "kg", stock: 5, farmer: farmers[0]._id, lowStockThreshold: 10 },
    { name: "Organic Bananas", category: "Fruits", price: 50, unit: "kg", stock: 60, farmer: farmers[1]._id, featured: true },
    { name: "Organic Apples", category: "Fruits", price: 120, unit: "kg", stock: 40, farmer: farmers[1]._id },
    { name: "A2 Cow Milk", category: "Dairy & Eggs", price: 60, unit: "litre", stock: 8, farmer: farmers[2]._id, lowStockThreshold: 10 },
    { name: "Brown Rice", category: "Grains & Pulses", price: 60, unit: "kg", stock: 100, farmer: farmers[0]._id },
    { name: "Black Pepper", category: "Spices & Herbs", price: 200, unit: "100g", stock: 30, farmer: farmers[1]._id },
    { name: "Eco Bag", category: "Eco Friendly", price: 150, unit: "piece", stock: 25, farmer: farmers[2]._id },
    { name: "Herbal Tea", category: "Others", price: 180, unit: "pack", stock: 0, farmer: farmers[2]._id },
  ];
  const uploadsDir = path.join(__dirname, "..", "..", "uploads", "products");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const slugMap = { "Organic Tomatoes": "tomatoes.jpg", "Fresh Spinach": "spinach.jpg", "Organic Bananas": "bananas.jpg", "A2 Cow Milk": "milk.jpg", "Organic Carrots": "carrots.jpg", "Organic Apples": "apples.jpg", "Brown Rice": "brown-rice.jpg" };
  const products = [];
  for (const p of prods) {
    const fname = slugMap[p.name] || (p.name.toLowerCase().replace(/\s+/g, "-") + ".jpg");
    const srcPath = path.join(__dirname, "images", fname);
    let images = ["/images/placeholder.svg"];
    if (fs.existsSync(srcPath)) {
      const dest = path.join(uploadsDir, fname);
      fs.copyFileSync(srcPath, dest);
      images = ["/uploads/products/" + fname];
    } else {
      console.log("No photo for:", p.name);
    }
    const prod = await Product.findOneAndUpdate({ name: p.name, farmer: p.farmer }, { $setOnInsert: { ...p, images, isOrganic: true, harvestDate: new Date(), seasonalAvailability: "Year-round", isDemo: true } }, { upsert: true, new: true });
    products.push(prod);
  }

  // Reviews
  const tomato = products[0];
  for (let i = 0; i < 3; i++) {
    await Review.findOneAndUpdate({ product: tomato._id, user: [cust, riya, sunil][i]._id }, { $setOnInsert: { product: tomato._id, user: [cust, riya, sunil][i]._id, rating: 4 + (i % 2), comment: "Great quality", isDemo: true } }, { upsert: true });
  }
  const reviews = await Review.find({ product: tomato._id });
  const avg = reviews.reduce((a, r) => a + r.rating, 0) / reviews.length;
  await Product.updateOne({ _id: tomato._id }, { ratingAverage: Math.round(avg * 10) / 10, ratingCount: reviews.length });

  // Orders
  const setting = await Setting.findOne();
  const deliveryCharge = setting?.deliveryCharge || 30;
  const statuses = ["Order Placed", "Packed", "Out for Delivery", "Delivered"];
  let orderCount = 0;
  for (let i = 0; i < 10; i++) {
    const customer = [cust, riya, sunil, ravi][i % 4];
    const status = statuses[i % statuses.length];
    const subtotal = products[0].price * 2;
    const total = subtotal + deliveryCharge;
    const orderNumber = "GM" + (123456 + i);
    const existing = await Order.findOne({ orderNumber });
    if (existing) continue;
    await Order.create({
      orderNumber,
      user: customer._id,
      items: [{ product: products[0]._id, name: products[0].name, price: products[0].price, quantity: 2, farmer: products[0].farmer }],
      address: { name: customer.name, line1: "Gadag, Karnataka", city: "Gadag, Karnataka - 582101", phone: "+91 98765 43210" },
      coordinates: { lat: 15.42, lng: 75.62 },
      paymentMethod: "UPI",
      status,
      statusHistory: [{ status, at: new Date() }],
      subtotal,
      deliveryCharge,
      total,
      estimatedDelivery: new Date(Date.now() + 86400000),
      currentLocation: status === "Out for Delivery" ? { lat: 15.42, lng: 75.62, updatedAt: new Date() } : undefined,
      isDemo: true,
    });
    orderCount++;
  }

  // Notifications
  await Notification.create({ user: cust._id, type: "order", title: "Order placed", message: "Your order has been placed", isRead: false, isDemo: true });
  await Notification.create({ user: farmers[0]._id, type: "order", title: "New order", message: "You have a new order", isRead: false, isDemo: true });

  // Wishlist
  await Wishlist.findOneAndUpdate({ user: cust._id }, { $set: { products: [products[0]._id, products[1]._id, products[2]._id], isDemo: true } }, { upsert: true });

  // Messages
  await Message.create({ from: cust._id, to: farmers[0]._id, text: "Is this organic?", isDemo: true });
  await Message.create({ from: farmers[0]._id, to: cust._id, text: "Yes, 100% organic.", isDemo: true });

  console.log("Seed complete. Demo users:");
  console.log("admin@demo.greenmart.test, harshita@demo.greenmart.test, ramesh@demo.greenmart.test, etc. Password: SEED_PASSWORD");
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
