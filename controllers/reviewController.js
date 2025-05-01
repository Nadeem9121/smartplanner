const Review = require("../models/reviewModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");

// Create a review
exports.createReview = catchAsync(async (req, res, next) => {
  const { review, rating, vendor } = req.body;

  if (!mongoose.Types.ObjectId.isValid(vendor)) {
    return next(new AppError("Invalid vendor ID", 400));
  }

  const newReview = await Review.create({
    review,
    rating,
    vendor,
    user: req.user._id, // assumes auth middleware attaches user
  });

  res.status(201).json({
    status: "success",
    data: {
      review: newReview,
    },
  });
});

// Get all reviews for a vendor
exports.getVendorReviews = catchAsync(async (req, res, next) => {
  const vendorId = req.params.vendorId;

  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    return next(new AppError("Invalid vendor ID", 400));
  }

  const reviews = await Review.find({ vendor: vendorId });

  res.status(200).json({
    status: "success",
    results: reviews.length,
    data: {
      reviews,
    },
  });
});

// Update a review (only by the same user)
exports.updateReview = catchAsync(async (req, res, next) => {
  const review = await Review.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );

  if (!review) {
    return next(new AppError("No review found or permission denied", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      review,
    },
  });
});

// Delete a review (only by the same user or admin)
exports.deleteReview = catchAsync(async (req, res, next) => {
  const review = await Review.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id, // or add admin check here
  });

  if (!review) {
    return next(new AppError("No review found or permission denied", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// Function to calculate the average rating for a vendor's reviews
exports.calculateAverageRating = async (req, res) => {
  try {
    const vendorId = req.params.vendorId;

    // Fetch all reviews for the specified vendor
    const reviews = await Review.find({ vendor: vendorId });

    if (!reviews.length) {
      return res
        .status(404)
        .json({ error: "No reviews found for this vendor" });
    }

    // Calculate the total rating and average rating
    const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
    const averageRating = (totalRating / reviews.length).toFixed(2); // rounding to 2 decimal places

    res.status(200).json({
      status: "success",
      averageRating: parseFloat(averageRating),
      totalReviews: reviews.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
// Function to calculate review response percentage for a vendor
exports.calculateReviewResponsePercentage = async (req, res) => {
  try {
    const vendorId = req.params.vendorId;

    // Fetch all reviews for the specified vendor
    const reviews = await Review.find({ vendor: vendorId });

    if (!reviews.length) {
      return res
        .status(404)
        .json({ error: "No reviews found for this vendor" });
    }

    // Calculate the number of reviews with responses
    const reviewsWithResponses = reviews.filter(
      (review) => review.response && review.response.trim() !== ""
    ).length;

    // Calculate the response percentage
    const responsePercentage = (
      (reviewsWithResponses / reviews.length) *
      100
    ).toFixed(2); // rounding to 2 decimal places

    res.status(200).json({
      status: "success",
      responsePercentage: parseFloat(responsePercentage),
      totalReviews: reviews.length,
      reviewsWithResponses,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
