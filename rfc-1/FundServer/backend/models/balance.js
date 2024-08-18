const mongoose = require('mongoose');

const balanceSchema = new mongoose.Schema({
    pub_id:String,
    balance:Number
})

module.exports = mongoose.model('Balance',balanceSchema);