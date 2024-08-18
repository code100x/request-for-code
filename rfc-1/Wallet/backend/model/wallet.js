const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({
    id: { type: String, required: true },
    pub_id: { type: String, required: true },
    private_id: { type: String, required: true },
});

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;
