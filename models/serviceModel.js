// models/Service.js
const mongoose = require("mongoose");

const VALID_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const serviceSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId, // Explicitly enforce ObjectId type
      auto: true, // Let MongoDB generate the ID automatically
    },
    title: {
      type: String,
      required: [true, "Service title is required"],
      trim: true,
      index: true, // Add index for faster queries
    },
    rate: {
      type: Number,
      required: [true, "Service rate is required"],
      min: [0, "Rate must be a positive number"],
      index: true,
    },
    description: {
      type: String,
      required: [true, "Service description is required"],
      trim: true,
    },
    availability: {
      // Availability window expressed as start and end days of the week
      startDay: {
        type: String,
        enum: VALID_DAYS,
        required: [true, "Availability start day is required"],
      },
      endDay: {
        type: String,
        enum: VALID_DAYS,
        required: [true, "Availability end day is required"],
      },
    },
  },
  {
    timestamps: true,
    // Disable versionKey if not needed
    versionKey: false,
  }
);

// Ensure title uniqueness
serviceSchema.path("title").validate(async function (value) {
  const count = await mongoose.models.Service.countDocuments({
    title: value,
    _id: { $ne: this._id },
  });
  return count === 0;
}, "Service title already exists");

const Service = mongoose.model("Service", serviceSchema);

module.exports = Service;
