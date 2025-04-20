// models/Service.js
const mongoose = require("mongoose");

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
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    // Disable versionKey if not needed
    versionKey: false,
  }
);

// Add validation for title uniqueness (optional)
serviceSchema.path("title").validate(async (value) => {
  const titleCount = await mongoose.models.Service.countDocuments({
    title: value,
  });
  return !titleCount;
}, "Service title already exists");

const Service = mongoose.model("Service", serviceSchema);

module.exports = Service;
