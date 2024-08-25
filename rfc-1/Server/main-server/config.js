require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 3000,
  MINING_REWARD: process.env.MINING_REWARD || 100,
};
