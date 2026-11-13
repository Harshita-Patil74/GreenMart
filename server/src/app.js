const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const env = require("./config/env");
const isClientOriginAllowed = require("./config/isClientOriginAllowed");
const routes = require("./routes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const cookieParser = require("cookie-parser");
const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin: (origin, callback) => callback(null, isClientOriginAllowed(origin, env.clientUrl, env.nodeEnv)),
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(rateLimit({ windowMs: 15*60*1000, max: env.nodeEnv === "development" ? 3000 : 1000 }));
app.get("/", (req, res) => res.json({ status: "ok", service: "GreenMart API" }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use("/api", (req, res, next) => { res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate"); res.set("Pragma", "no-cache"); res.set("Expires", "0"); next(); });
app.get("/api", (req, res) => res.json({ success: true, message: "Welcome to GreenMart API", status: "running" }));
app.get("/api/health", (req, res) => res.json({ success: true, message: "GreenMart API is healthy" }));
app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);
module.exports = app;
