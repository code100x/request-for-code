const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const mongoose = require('mongoose');
const Transactions = require('./models/transactions');
const UTXO = require('./models/utxo');
const cors = require('cors');

const app = express();
app.use(cors());
const httpServer = http.createServer(app);
const wss = new WebSocket.Server({ server: httpServer });

mongoose.connect('mongodb://localhost:27017/fundserver');

app.use(express.json()); 

function generateUtxoIndex() {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const timestamp = Date.now();
    const uniqueIndex = `${randomNum}${timestamp}`;
    return uniqueIndex;
}

app.post("/maketxn", async (req, res) => {
    const { amount, sender_pub_id, receiver_pub_id, signature, timestamp } = req.body;
    
    try {
        // const txn = await Transactions.create({
        //     signature,
        //     sender_pub_id,
        //     receiver_pub_id,
        //     amount
        // });
        const txn = await Transactions.create({
            signature,
            sender_pub_id,
            receiver_pub_id,
            amount,
            timestamp
        });

        const utxoIndex = generateUtxoIndex();
        await UTXO.create({
            utxoId:utxoIndex,
            pub_id:receiver_pub_id,
            amount
        });

        // Broadcast the transaction to all WebSocket clients --> will use this 
        const message = JSON.stringify({
            type: 'NEW_TRANSACTION',
            transaction: txn
        });
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });

        res.json({ msg: "Transaction successful" });
    } catch (err) {
        console.log("Error creating transaction: " + err);
        res.status(500).json({ msg: "Internal server error" });
    }
});


// next i am implementing this one
app.post("/getutxos", async (req, res) => {
    const { sender_pub_id } = req.body;
    try {
        const utxos = await UTXO.find({ pub_id: sender_pub_id });
        if (!utxos) return res.json({ UTXO:[] });
        else return res.json({ UTXOs: utxos });
    } catch (err) {
        console.log("Error retrieving UTXO: " + err);
        res.status(500).json({ msg: "Internal server error" });
    }
});

app.post("/total-balance", async(req,res)=>{
    const {sender_pub_id} = req.body;
    try{
        const utxos = await UTXO.find({pub_id: sender_pub_id});
        // console.log(utxos);
        if(!utxos) return res.json({"totalBalance":0});
        else{
            let balance=0;
            for(let i=0;i<utxos.length;i++) balance+=utxos[i].amount;
            return res.json({pub_id:sender_pub_id,totalBalance:balance});
        }
    }catch(err){
        console.log(err);
        return res.status(500).json({"msg":"Internal server error"});
    }
})

app.delete("/deleteutxo",async(req,res)=>{
    const { id } = req.body;
    try{
        await UTXO.deleteOne({utxoId:id});
        // console.log("delete kre utxo:" + id);
        return res.json({"msg":"deleted needed UTXO to complete the transaction"})
    } catch(err){
        console.log("Error delete UTXO: " + err)
    }
})

httpServer.listen(3002, () => {
    console.log('HTTP server is running on http://localhost:3002');
    console.log('WebSocket server is running on ws://localhost:3002');
});

wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');
    
    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });
});



// custom utxo : 3> let user choose the UTXO themselves -> in this case store the ids of UTXOs that user have choose. if the total amount from UTXOs choose by the user is less then amount user want to send then them "can't proceed, please retry and choose more UTXO(s).".