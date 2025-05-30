const express = require("express");
const router = express.Router();
const {
  getMessagedUsers,
  sendMessage,
  getMessages,
} = require("../controllers/socketController");
const { protect } = require("../controllers/authController");

router.use(protect);
// Send a message from one user to another
router.post("/send", sendMessage);

// Get all messages between two users
router.get("/messages/:userId/:receiverId", getMessages);

router.get("/messaged-users", protect, getMessagedUsers);

module.exports = router;
