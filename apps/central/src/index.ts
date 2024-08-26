import { WebSocketServer, WebSocket } from "ws";
import url from "url";

const wss = new WebSocketServer({ port: 8080 });
let miners: {
  ws: WebSocket;
  minerAddress: number;
}[] = [];

wss.on("connection", (ws: WebSocket, req) => {
  //@ts-ignore
  const minerAddress = url.parse(req.url, true).query["publicKey"] as string;

  console.log("Here", minerAddress);

  if (!minerAddress) {
    console.error("Miner Address Missing");
    ws.close();
    return;
  }

  let miner = {
    ws,
    minerAddress: Date.now(),
  };
  miners.push(miner);
  console.log("New miner connected.");

  // Handle incoming messages from miners
  ws.on("message", (message: string) => {
    handleIncomingMessage(message, miner);
  });

  // Handle miner disconnect
  ws.on("close", () => {
    miners = miners.filter((miner) => miner.ws !== ws);
    console.log("Miner disconnected.");
  });
});

function handleIncomingMessage(
  message: string,
  miner: {
    ws: WebSocket;
    minerAddress: number;
  },
) {
  const data = JSON.parse(message);

  switch (data.type) {
    case "new_block":
      // Broadcast the new block to all miners
      console.log("Received new block. Broadcasting to all miners.");
      broadcast(message, miner);
      break;

    case "transaction":
      // Broadcast the transaction to all miners
      console.log("Received new transaction. Broadcasting to all miners.");
      broadcast(message, miner);
      break;

    case "sync_chain":
      console.log("Received sync chain request");
      const minersToRequest = miners.filter(m => m.minerAddress !== miner.minerAddress);
      const requestSyncFromMiner = (index: number) => {
        if (index >= minersToRequest.length) {
          console.log("No miners available to fulfill sync request");
          return;
        }

        const targetMiner = minersToRequest[index];
        if (!targetMiner) {
          console.log("Miner not found. Trying next miner.");
          requestSyncFromMiner(index + 1);
          return;
        }
        targetMiner.ws.send(JSON.stringify({
          type: 'sync_chain',
          blockIndex: data.blockIndex
        }));

        const responseHandler = (response: string) => {
          const parsedResponse = JSON.parse(response);
          if (parsedResponse.type === 'sync_chain_response') {
            if (parsedResponse.error) {
              console.log(`Sync request failed for miner ${targetMiner.minerAddress}. Trying next miner.`);
              requestSyncFromMiner(index + 1);
            } else {
              console.log(`Received sync response from miner ${targetMiner.minerAddress}. Forwarding to requester.`);
              miner.ws.send(response);
              targetMiner.ws.removeListener('message', responseHandler);
            }
          }
        };

        targetMiner.ws.on('message', responseHandler);

        // Set a timeout in case the miner doesn't respond
        setTimeout(() => {
          if (targetMiner.ws.listenerCount('message') > 0) {
            console.log(`Sync request timed out for miner ${targetMiner.minerAddress}. Trying next miner.`);
            targetMiner.ws.removeListener('message', responseHandler);
            requestSyncFromMiner(index + 1);
          }
        }, 5000); // 5 second timeout
      };

      requestSyncFromMiner(0);
      break;

    case "request_missing_blocks":
      // Handle the request for missing blocks
      handleMissingBlocksRequest(data.latestKnownHash, miner);
      break;

    default:
      console.log("Unknown message type:", data.type);
  }
}

console.log("Central WebSocket server running on port 8080.");

function broadcast(
  message: string,
  fromMiner: {
    ws: WebSocket;
    minerAddress: number;
  },
) {
  miners.map((miner) => {
    if (miner.minerAddress != fromMiner.minerAddress) {
      miner.ws.send(message);
    }
  });
}

function handleMissingBlocksRequest(
  latestKnownHash: string,
  miner: {
    ws: WebSocket;
    minerAddress: number;
  },
) {}
