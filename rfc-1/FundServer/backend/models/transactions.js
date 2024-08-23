const mongoose = require('mongoose');

const transactionsSchema = new mongoose.Schema({
    signature:String,
    sender_pub_id: String,
    receiver_pub_id: String,
    amount: Number,
    timestamp: Date
});

module.exports = mongoose.model('Transactions',transactionsSchema);