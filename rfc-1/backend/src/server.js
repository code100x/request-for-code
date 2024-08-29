const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

const clients = new Set();

wss.on("connection", (ws) => {
  clients.add(ws);

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    // Broadcast all messages to all clients
    for (let client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: data.type,
            data: data.data,
            timestamp: new Date().toISOString(),
          })
        );
      }
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
  });
});

console.log("Central server running on ws://localhost:8080");
