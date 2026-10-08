const express = require("express");
const router = express.Router();
const user = require("../controllers/user.js");

router.get("/users", user.isUserExist, user.getUsers);
router.put("/password", user.isUserExist, user.updatePassword);
router.put("/users/:id", user.verifyAdmin, user.updateUser);
router.delete("/users/:id", user.isUserExist, user.deleteUser);

module.exports = router;
