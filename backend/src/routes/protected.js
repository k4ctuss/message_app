const express = require("express");
const router = express.Router();
const jws = require("jws");
const { TOKENSECRET } = process.env;

// This middleware adds the json header to every response for the api
router.use("/", (req, res, next) => {
    res.setHeader("Content-Type", "application/json");
    // cf. https://swagger-autogen.github.io/docs/swagger-2/authentication/api-keys-token/
    // #swagger.security = [{"apiKeyAuth": []}]
    if (
        !req.headers ||
        !Object.hasOwnProperty.call(req.headers, "x-access-token")
    ) {
        throw { code: 403, message: "Token missing" };
    }
    // Code vérifiant la validité du token
    if (!jws.verify(req.headers["x-access-token"], "HS256", TOKENSECRET)) {
        throw { code: 403, message: "Token invalid" };
    }
    // Le payload du token contient le login de l'utilisateur
    // On modifie l'objet requête pour mettre le login à disposition pour les middleware suivants
    req.login = jws.decode(req.headers["x-access-token"]).payload;
    // On appelle la fonction middleware suivante :
    next();
});

router.use("/", require("./user.js"));
router.use("/", require("./group.js"));
router.use("/", require("./message.js"));

module.exports = router;
