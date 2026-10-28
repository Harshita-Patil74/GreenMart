const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const app = require("./app");
const env = require("./config/env");
const getClientOrigins = require("./config/clientOrigins");
const { connectDB } = require("./config/db");
const setupSockets = require("./sockets");
const { setIO } = require("./sockets/emitters");
const { ensureDefaults } = require("./bootstrap/ensureDefaults");

async function main() {
  await connectDB();
  await ensureDefaults();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: getClientOrigins(env.clientUrl, env.nodeEnv), credentials: true } });
  setupSockets(io);
  setIO(io);
  server.listen(env.port, "0.0.0.0", () => console.log(`Server on ${env.port}`));
}
main().catch(async (error) => {
  console.error("Server startup failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch (cleanupError) {
    console.error("MongoDB cleanup failed during startup:", cleanupError.name || "Error");
  }
  process.exitCode = 1;
});
