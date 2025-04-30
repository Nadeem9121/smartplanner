const mongoose = require("mongoose");
const dotenv = require("dotenv");
const app = require("./app");
const http = require("http"); // Import http module for socket.io integration
const socketIo = require("socket.io"); // Import socket.io
const { initSocket } = require("./controllers/socketController"); // Import socketController

// Load environment variables
dotenv.config({ path: "./config.env" });

// Connect to DB
const DB = process.env.DATABASE.replace(
  "<db_password>",
  process.env.DATABASE_PASSWORD
);
mongoose.set("strictQuery", true);
mongoose
  .connect(DB)
  .then(() => console.log("DB connection successful!"))
  .catch((err) => {
    console.error("DB connection error", err);
    process.exit(1);
  });

// Create an HTTP server from the app
const server = http.createServer(app);

// Integrate Socket.IO with the server
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow all origins (you can specify an array of allowed origins)
    methods: ["GET", "POST"],
  },
});

// Initialize socket functionality with the io instance
initSocket(io);

// Start server
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! 💥 Shutting down...");
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("👋 SIGTERM RECEIVED. Shutting down gracefully");
  server.close(() => {
    console.log("💥 Process terminated!");
  });
});
