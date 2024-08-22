import { Keypair } from "@solana/web3.js";
import { Router } from "express";
import bs58 from "bs58";
import nacl from "tweetnacl";
import pkg from "tweetnacl-util";
import { io, onGoingBlockChains } from "../index.js";
import axios, { all } from "axios";
const { decodeUTF8 } = pkg;

const routes = Router();
routes.route("/send").post(async (req, res) => {
  try {
    io.to("miners").emit("transaction", req.body.transaction);
    const checkTransaction = async (signature: string) => {
      let response;
      do {
        let minerUrl =
          onGoingBlockChains[
            Math.floor(Math.random() * (onGoingBlockChains.length - 1))
          ].url;

        response = await axios.get(
          `${minerUrl}/transaction?signature=${signature}`
        );
        if (response.data) {
          return response;
        }
        await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for 500 ms before retrying
      } while (!response.data);

      return response;
    };

    const response = await checkTransaction(req.body.transaction.signature);
    if (response) {
      return res.status(200).json({
        status: "done",
      });
    } else {
      return res.status(500);
    }
  } catch (e) {
    console.log(`error in send`);
  }
});
routes.route("/airdrop").get(async (req, res) => {
  try {
    const publicKey = req.query.key;
    if (!publicKey) {
      return res.status(404).json({
        message: "public key is required",
      });
    }
    const baseTransaction = {
      amount: 101,
      from: Keypair.fromSecretKey(
        bs58.decode(process.env.SECRET_KEY || "")
      ).publicKey.toBase58(),
      to: publicKey,
      timestamp: Date.now(),
    };

    const transaction = {
      ...baseTransaction,
      signature: bs58.encode(
        nacl.sign.detached(
          decodeUTF8(JSON.stringify(baseTransaction)),
          bs58.decode(process.env.SECRET_KEY || "")
        )
      ),
    };
    io.to("miners").emit("transaction", transaction);
    const checkTransaction = async (signature: string) => {
      let response;
      do {
        let minerUrl =
          onGoingBlockChains[
            Math.floor(Math.random() * (onGoingBlockChains.length - 1))
          ].url;

        response = await axios.get(
          `${minerUrl}/transaction?signature=${signature}`
        );
        console.log(response.status, response.data);
        if (response.data) {
          return response;
        }
        await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for 500 ms before retrying
      } while (!response.data);

      return response;
    };

    const response = await checkTransaction(transaction.signature);
    if (response) {
      return res.status(200).json({
        status: "done",
        transaction: response.data.transaction,
      });
    } else {
      return res.status(500);
    }
  } catch (e) {
    console.log(`error in airdopr`);
  }
});
routes.route("/balance").get(async (req, res) => {
  try {
    const publicKey = req.query.key;
    if (!publicKey) {
      return res.status(404).json({
        message: "public key is required",
      });
    }
    const number_of_workers =
      onGoingBlockChains.length > 3 ? 3 : onGoingBlockChains.length;
    let theirUrls = [];
    // ! Not good for the small lenght miners as the link could be the same
    for (let index = 0; index < number_of_workers; index++) {
      theirUrls.push(
        onGoingBlockChains[
          Math.floor(Math.random() * (onGoingBlockChains.length - 1))
        ].url
      );
    }
    const getBalance = async (url: string) => {
      const minerResponse = await axios(`${url}/balance?key=${publicKey}`);
      return minerResponse.data.balance;
    };

    const balances = await Promise.all(theirUrls.map((url) => getBalance(url)));
    if (balances.length < 1) return;
    const allEqual = balances.every((element) => element === balances[0]);
    if (!allEqual) return;

    return res.status(200).json({
      balance: balances[0],
    });
  } catch (e) {
    console.log(`error in balcne`, e);
  }
});
routes.route("/transactions").get(async (req, res) => {
  try {
    const publicKey = req.query.key;
    if (!publicKey) {
      return res.status(404).json({
        message: "public key is required",
      });
    }

    let minerUrl =
      onGoingBlockChains[
        Math.floor(Math.random() * (onGoingBlockChains.length - 1))
      ].url;

    const minerResponse = await axios(
      `${minerUrl}/transactions?publicKey=${publicKey}`
    );

    return res.status(200).json({
      transactions: minerResponse.data.transactions,
    });
  } catch (e) {
    console.log(`e from the transaction `, e);
  }
});

export default routes;
