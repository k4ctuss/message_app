const express = require("express");
const router = express.Router();
const jws = require("jws");
const status = require("http-status");
const { AppError } = require("../util/AppError.js");
const { TOKENSECRET } = require("../../config/env");

// This middleware adds the json header to every response for the api
router.use("/", (req, res, next) => {
    res.setHeader("Content-Type", "application/json");
    // #swagger.security = [{"cookieAuth": []}]

    const token = req.cookies.ACCESS_TOKEN_AUTH;

    if (!token) {
        throw new AppError("Token missing", status.FORBIDDEN);
    }

    if (!jws.verify(token, "HS256", TOKENSECRET)) {
        throw new AppError("Token invalid", status.FORBIDDEN);
    }

    req.login = jws.decode(token).payload;
    next();
});

router.use("/", require("./user.js"));
router.use("/", require("./group.js"));
router.use("/", require("./message.js"));

module.exports = router;
