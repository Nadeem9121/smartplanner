const Chat = require("../models/chatModel"); // Import the Chat model

let onlineUsers = {}; // This will store the userId -> socketId mapping

// Initialize socket functionality
const initSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("A user connected");

    // Register user and socket ID mapping
    socket.on("register_user", (userId) => {
      onlineUsers[userId] = socket.id;
      console.log(`User ${userId} connected with socket ID: ${socket.id}`);
    });

    // Handle user disconnection
    socket.on("disconnect", () => {
      for (let userId in onlineUsers) {
        if (onlineUsers[userId] === socket.id) {
          delete onlineUsers[userId];
          console.log(`${userId} disconnected`);
          break;
        }
      }
    });

    // Handle chat message (example)
    socket.on("chat_message", (data) => {
      console.log("Received chat message:", data);
      const { receiver, message } = data;

      // Emit the message to the receiver
      const receiverSocketId = onlineUsers[receiver];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("chat_message", message);
      }
    });
  });
};

// Send a message from one user to another
const sendMessage = async (req, res) => {
  try {
    const { sender, receiver, message } = req.body;

    // Validate input
    if (!sender || !receiver || !message) {
      return res.status(400).json({
        status: "error",
        message: "Sender, receiver, and message are required",
      });
    }

    // Create a new chat message in the database
    const chatMessage = await Chat.create({
      sender,
      receiver,
      message,
    });

    // Emit the message to the receiver using socket.io
    const receiverSocketId = getSocketIdByUserId(receiver); // Get socket ID by user ID

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("chat_message", chatMessage); // Emit to receiver
    }

    return res.status(200).json({
      status: "success",
      message: "Message sent successfully",
      chatMessage,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to send message",
    });
  }
};

// Get all messages between two users
const getMessages = async (req, res) => {
  try {
    const { userId, receiverId } = req.params;

    // Validate input
    if (!userId || !receiverId) {
      return res.status(400).json({
        status: "error",
        message: "UserId and ReceiverId are required",
      });
    }

    // Retrieve messages between the sender and receiver
    const messages = await Chat.find({
      $or: [
        { sender: userId, receiver: receiverId },
        { sender: receiverId, receiver: userId },
      ],
    }).sort({ createdAt: 1 }); // Sort messages by creation date

    return res.status(200).json({
      status: "success",
      messages,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch messages",
    });
  }
};

// Function to get the socket ID by userId
const getSocketIdByUserId = (userId) => {
  return onlineUsers[userId]; // Access the onlineUsers map for socketId
};

module.exports = { sendMessage, getMessages, initSocket };
