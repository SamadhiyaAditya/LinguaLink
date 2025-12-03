const express = require("express");
const protectRoute = require("../middleware/protectRoute.js");
const { sendMessage, getMessages, deleteMessage, editMessage } = require("../controllers/message.controller.js");

const router = express.Router();

router.get("/:id", protectRoute, getMessages);
router.post("/send", protectRoute, sendMessage);
router.delete("/:id", protectRoute, deleteMessage);
router.put("/:id", protectRoute, editMessage);

module.exports = router;
