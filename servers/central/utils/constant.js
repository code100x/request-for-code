const INITIAL_BALANCE = 100 * 100000000; // 100 BTC in satoshis
const BLOCK_REWARD = 50 * 100000000; // 50 BTC in satoshis
const DIFFICULTY = 4; // Number of leading zeros required in hash
const MAX_MESSAGE_SIZE = 1024 * 1024; // 1MB max message size
const MAX_MEMPOOL_SIZE = 1000; // Maximum number of transactions in mempool

const CENTRAL_CONFIG = {
  INITIAL_BALANCE,
  BLOCK_REWARD,
  DIFFICULTY,
  MAX_MESSAGE_SIZE,
  MAX_MEMPOOL_SIZE,
};

module.exports = {
  CENTRAL_CONFIG,
};
