const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const mongoose = require('mongoose');
const Transactions = require('./models/transactions');
const Balance = require('./models/balance');

const app = express();
const httpServer = http.createServer(app);
const wss = new WebSocket.Server({ server: httpServer });

mongoose.connect('mongodb://localhost:27017/fundserver');

app.use(express.json()); 

app.post("/maketxn", async (req, res) => {
    const { amount, sender_pub_id, receiver_pub_id, transaction_id, timestamp } = req.body;
    
    try {
        const txn = await Transactions.create({
            transaction_id,
            sender_pub_id,
            receiver_pub_id,
            amount,
            timestamp
        });

        const sender = await Balance.findOne({ pub_id: sender_pub_id });
        if (!sender) {
            return res.status(400).json({ msg: "Sender does not have sufficient balance" });
        }
        const sender_balance = sender.balance;
        if (sender_balance < amount) {
            return res.status(400).json({ msg: "Insufficient balance" });
        }
        await Balance.findOneAndUpdate({ pub_id: sender_pub_id }, { balance: sender_balance - amount });

        const receiver = await Balance.findOne({ pub_id: receiver_pub_id });
        if (receiver) {
            const receiver_balance = receiver.balance;
            await Balance.findOneAndUpdate({ pub_id: receiver_pub_id }, { balance: receiver_balance + amount });
        } else {
            await Balance.create({
                pub_id: receiver_pub_id,
                balance: amount
            });
        }

        // Broadcast the transaction to all WebSocket clients
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

app.get("/getbalance", async (req, res) => {
    const { id } = req.body;
    try {
        const user = await Balance.findOne({ pub_id: id });
        if (!user) return res.json({ balance: "0" });
        else return res.json({ balance: user.balance });
    } catch (err) {
        console.log("Error retrieving balance: " + err);
        res.status(500).json({ msg: "Internal server error" });
    }
});

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
