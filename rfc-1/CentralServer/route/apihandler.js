const express = require('express');
const mongoose = require('mongoose');
const Miner = require('../model/miner')
const Block = require('../model/block');

const router = express.Router();

router.get('/miners', async (req, res) => {
    try {
        const miners = await Miner.find();
        res.json(miners);
    } catch (err) {
        res.status(500).send(err);
    }
});

router.post('/newminer', async (req, res) => {
    try {
        const newMiner = new Miner(req.body); 
        await newMiner.save(); 
        res.status(201).json(newMiner); 
    } catch (err) {
        res.status(500).send(err);
    }
});

router.get('/blockchain', async (req, res) => {
    try {
        const blockchain = await Block.find().sort({ _id: 1 });
        res.json(blockchain);
    } catch (err) {
        res.status(500).send(err);
    }
});

router.post('/addblock', async (req, res) => {
    try {
        const newBlock = new Block(req.body); 
        await newBlock.save(); 
        res.status(201).json(newBlock); 
    } catch (err) {
        res.status(500).send(err);
    }
});

module.exports = router;
