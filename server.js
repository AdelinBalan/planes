const express = require("express");
const path = require("path");
const http = require("http");
const PORT = process.env.PORT || 3001;
const socketio = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, "public")));

// Start server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

//Handle a socket connection request from web client
const connections = [null, null];

io.on("connection", (socket) => {
  console.log("New WS Connection");

  // Find an available player number
  let playerIndex = -1;
  for (const i in connections) {
    if (connections[i] === null) {
      playerIndex = i;
      break;
    }
  }

  // Tell the connectin client what player number they are
  socket.emit("player-number", playerIndex);

  console.log(`Player ${playerIndex} has connected`);

  // Ignore 3rd player
  if (playerIndex === -1) return;

  connections[playerIndex] = false;

  // Tell everyone what player number just connected
  socket.broadcast.emit("player-connection", playerIndex);

  // Handle Disconnect
  socket.on("disconnect", () => {
    console.log(`Player ${playerIndex} disconnected`);
    connections[playerIndex] = null;
    // Tell everyone what player number just disconnected
    socket.broadcast.emit("player-connection", playerIndex);
  });

  // On Ready
  socket.on("player-ready", () => {
    socket.broadcast.emit("enermy-ready", playerIndex);
    connections[playerIndex] = true;
  });

  // Check player connections
  socket.on("check-players", () => {
    const players = [];
    for (const i in connections) {
      connections[i] === null
        ? players.push({ connected: false, ready: false })
        : players.push({ connected: true, ready: connections[i] });
    }
    socket.emit("check-players", players);
  });

  // On Fire Received
  socket.on(
    ("fire",
    (id) => {
      console.log(`Shot fired from ${playerIndex}`, id);

      // Emit the move to the other player
      socket.broadcast.emit("fire", id);
    })
  );

  // On Fire Reply
  socket.on("fire-reply", (square) => {
    console.log(square);

    // Forward the reply to the other player
    socket.broadcast.emit("fire-reply", square);
  });

  // Timeout connection
  setTimeout(() => {
    connections[playerIndex] = null;
    socket.emit("timeout");
    socket.disconnect();
  }, 600000); // 10 minute limit per player
});
