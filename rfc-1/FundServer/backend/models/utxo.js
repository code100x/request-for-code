const mongoose = require('mongoose');

const utxoSchema = new mongoose.Schema({
    utxoId:String,
    pub_id:String,
    amount:Number
})

module.exports = mongoose.model('UTXO',utxoSchema);