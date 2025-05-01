const mongoose = require("mongoose");

const vendorReviewSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // assuming vendors are users
      required: [true, "Review must belong to a vendor"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Review must be written by a user"],
    },
    rating: {
      type: Number,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating must be at most 5"],
      required: [true, "Rating is required"],
    },
    response: {
      type: String, // Can store the vendor's response to the review
      default: "",
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
    },
  },
  { timestamps: true }
);

// Prevent duplicate reviews from the same user for the same vendor
vendorReviewSchema.index({ vendor: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("VendorReview", vendorReviewSchema);
