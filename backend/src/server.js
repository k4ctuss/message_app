const { initWebSocket } = require("./websocket/websocket");
const env = require("../config/env");

// Instantiate an Express Application
const app = require("./app");
const server = require("http").Server(app);

const io = require("socket.io")(server, {
    cors: {
        origin: "*",
    },
});

initWebSocket(io);

// Open Server on selected Port
server.listen(env.PORT, () =>
    console.info("Server listening on port ", env.PORT),
);
