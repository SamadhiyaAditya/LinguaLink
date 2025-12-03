const express = require("express");
const { createGroup, getGroups, getGroupMessages } = require("../controllers/group.controller");
const protectRoute = require("../middleware/protectRoute");

const router = express.Router();

router.post("/create", protectRoute, createGroup);
router.get("/", protectRoute, getGroups);
router.get("/:groupId/messages", protectRoute, getGroupMessages);
router.post("/:groupId/add", protectRoute, require("../controllers/group.controller").addMember);
router.post("/:groupId/remove", protectRoute, require("../controllers/group.controller").removeMember);

module.exports = router;
