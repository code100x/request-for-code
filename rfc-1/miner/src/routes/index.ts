import { Router } from "express";
import { blockchain } from "../index.js";

const routes = Router();

routes.route("/balance").get((req, res) => {
  const publicKey = req.query.key;
  if (!publicKey || typeof publicKey !== "string") {
    return res.status(404).json({
      message: "public key is required",
    });
  }
  const balance = blockchain.getBalance(publicKey);
  res.status(200).json({
    balance,
  });
});

routes.route("/transaction").get((req, res) => {
  const signature = req.query.signature;
  if (!signature || typeof signature !== "string") {
    return res.status(404).json({
      message: "public key is required",
    });
  }
  const transaction = blockchain.getTransactionBySignature(signature);
  res.status(200).json({
    transaction,
  });
});

routes.route("/transactions").get((req, res) => {
  const publicKey = req.query.publicKey;
  if (!publicKey || typeof publicKey !== "string") {
    return res.status(404).json({
      message: "public key is required",
    });
  }
  const transactions = blockchain.getUserTransaction(publicKey);
  res.status(200).json({
    transactions,
  });
});

export default routes;
