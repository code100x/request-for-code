const WebSocket = require("ws");

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });

let blockchain = [];
const mempool = [];

wss.on("connection", (ws) => {
  console.log("New client connected");

  // Send the current blockchain to the new client
  ws.send(JSON.stringify({ type: "BLOCKCHAIN", data: blockchain }));

  ws.on("message", (message) => {
    const msg = JSON.parse(message);

    switch (msg.type) {
      case "NEW_BLOCK":
        // Verify and add new block
        if (verifyBlock(msg.data)) {
          blockchain.push(msg.data);
          broadcastMessage({ type: "NEW_BLOCK", data: msg.data });
        }
        break;
      case "NEW_TRANSACTION":
        // Add new transaction to mempool
        mempool.push(msg.data);
        broadcastMessage({ type: "NEW_TRANSACTION", data: msg.data });
        break;
    }
  });
});

function broadcastMessage(message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

console.log(`WebSocket server is running on port ${PORT}`);
