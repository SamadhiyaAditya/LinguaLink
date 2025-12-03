const express = require("express");
const protectRoute = require("../middleware/protectRoute.js");
const { sendFriendRequest, getFriendRequests, respondToFriendRequest, deleteContact, updateContact } = require("../controllers/contact.controller.js");

const router = express.Router();

router.post("/request", protectRoute, sendFriendRequest);
router.get("/requests", protectRoute, getFriendRequests);
router.put("/respond", protectRoute, respondToFriendRequest);
router.delete("/:id", protectRoute, deleteContact);
router.put("/:id", protectRoute, updateContact);

module.exports = router;
