const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const logger = require("./util/logger");

// Instantiate an Express Application
const app = express();

// Configure Express App Instance
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Configure custom logger middleware
app.use(logger.dev, logger.combined);
app.use(cookieParser());
app.use(cors());
app.use(helmet());

// Swagger Documentation
const swaggerUi = require("swagger-ui-express");
const swaggerFile = require("../swagger_output.json");
app.use("/doc", swaggerUi.serve, swaggerUi.setup(swaggerFile));

// Serve frontend
app.use("/", express.static("../frontend/dist"));
app.use("/", express.static("../frontend/public"));
app.use("/", express.static("./src/frontend"));

// Assign Routes
app.use("/api", require("./routes/protected.js"));
app.use("/", require("./routes/connection.js"));

// health endpoint
app.get("/health", (req, res) => {
    res.status(200).json({ status: "success", message: "Server is healthy" });
});

// Handle not valid route
app.use((req, res) => {
    res.status(404).json({ status: "fail", message: "Endpoint Not Found" });
});

// error handler
app.use((err, req, res, next) => {
    if (res.headersSent) return next(err); // default express error handler

    const statusCode = err.statusCode || 500;
    const isDev = process.env.NODE_ENV !== "production";

    if (!err.isOperational) console.error(err); // debug if it's a bug and not an AppError (expected error)

    res.status(statusCode).json({
        status: statusCode >= 500 ? "error" : "fail",
        message: err.isOperational ? err.message : "Internal server error",
        ...(isDev && { stack: err.stack }), // stack uniquement en dev
    });
});

module.exports = app;
