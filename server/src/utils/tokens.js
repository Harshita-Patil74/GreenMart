const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const env = require("../config/env");
function signToken(user){ return jwt.sign({ id: user._id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn }); }
async function hashToken(t){ return bcrypt.hash(t,10); }
function randomToken(){ return crypto.randomBytes(32).toString("hex"); }
module.exports = { signToken, hashToken, randomToken };
