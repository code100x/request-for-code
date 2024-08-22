const mongoose = require('mongoose');

const mempoolSchema = new mongoose.Schema({
    signature: { type: String, required: true, unique: true },
    sender_pub_id: { type: String, required: true },
    receiver_pub_id: { type: String, required: true },
    amount: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now, required: true },
});

const Mempool = mongoose.model('Mempool', mempoolSchema);

module.exports = Mempool;
