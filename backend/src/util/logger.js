const morgan = require("morgan");
const { createStream } = require("rotating-file-stream");
const path = require("path");
const fs = require("fs");

// log directory path
const logDirectory = path.resolve(__dirname, "../../log");

// ensure log directory exists
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

// create a rotating write stream
const accessLogStream = createStream("access.log", {
    interval: "1d",
    size: "10M",
    maxFiles: 14,
    path: logDirectory,
});

module.exports = {
    dev: morgan("dev"),
    combined: morgan("combined", { stream: accessLogStream }),
};
