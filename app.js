// Load environment variables at the very top
require("dotenv").config({ path: "./config.env" });
const path = require("path");
const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const cors = require("cors");

// Importing socket.io server (Note: We're handling socket.io in server.js, so no need to initialize it here)
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const servicesRouter = require("./routes/servicesRoutes");
const userRouter = require("./routes/userRoutes");
const galleryRouter = require("./routes/galleryRoutes");
const bitRouter = require("./routes/bidRouters");
const chatRouter = require("./routes/chatRouter");
const reviewRouter = require("./routes/reviewRouter");

// Start express app
const app = express();

// 1) GLOBAL MIDDLEWARES

// Implement CORS
app.use(cors());
app.options("*", cors());

// Serving static files
app.use(express.static(path.join(__dirname, "public")));

// Serve uploaded gallery images publicly
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Set security HTTP headers
app.use(helmet());
console.log("Environment:", process.env.NODE_ENV);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});
app.use("/api", limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Compress responses
app.use(compression());

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 2) ROUTES
app.get("/", (req, res) => {
  res.send("Hello, World!");
});
app.use("/api/v1/bid", bitRouter);
app.use("/api/v1/services", servicesRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/gallery", galleryRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/reviews", reviewRouter);

// Handle unhandled routes
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handling middleware
app.use(globalErrorHandler);

module.exports = app;
