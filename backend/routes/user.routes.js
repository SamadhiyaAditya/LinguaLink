const express = require("express");
const protectRoute = require("../middleware/protectRoute.js");
const { getUsersForSidebar, searchUsers, updateUserProfile } = require("../controllers/user.controller.js");

const router = express.Router();

router.get("/", protectRoute, getUsersForSidebar);
router.get("/search", protectRoute, searchUsers);
router.put("/update", protectRoute, updateUserProfile);

module.exports = router;
