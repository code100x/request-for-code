require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 3001,
  RECONNECT_INTERVAL: process.env.RECONNECT_INTERVAL || 5000, // 5 seconds
  MINING_INTERVAL: process.env.MINING_INTERVAL || 10000, // 10 seconds
  CENTRAL_SERVER_URL: process.env.CENTRAL_SERVER_URL || "ws://localhost:3000",
};
