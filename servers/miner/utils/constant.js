const MINER_CONFIG = {
  BLOCK_REWARD: 50 * 100000000, // 50 BTC in satoshis
  DIFFICULTY: 4, // Number of leading zeros required in hash
  BLOCK_TIME: 60000, // 1 minute in milliseconds
  ADJUSTMENT_FACTOR: 0.25, // 25% adjustment
  MAX_BLOCK_SIZE: 1024 * 1024, // 1MB max block size
};

module.exports = { MINER_CONFIG };
