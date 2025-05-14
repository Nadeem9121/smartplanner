const mongoose = require("mongoose");

const VALID_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const serviceSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      auto: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Service title is required"],
      trim: true,
      index: true,
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
    location: {
      type: String,
      required: [true, "Service location is required"],
      trim: true,
    },
    availability: [
      {
        day: {
          type: String,
          enum: [...VALID_DAYS, "Monday-Friday"],
          required: true,
        },
        startTime: {
          type: String, // Format: "HH:mm"
          required: true,
        },
        endTime: {
          type: String, // Format: "HH:mm"
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
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
