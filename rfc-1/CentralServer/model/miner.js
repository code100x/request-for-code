const mongoose = require('mongoose');

const minerSchema = new mongoose.Schema({
    minerId: String,
    connected: Boolean,
    lastSeen: Date
});

module.exports = mongoose.model('Miner', minerSchema);
