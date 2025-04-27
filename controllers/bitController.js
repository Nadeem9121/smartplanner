// controllers/bidController.js
const Bid = require("../models/bidModel");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");

// Import classifier service for NLP-based category assignment
const { classify } = require("../utils/classifierService");

// Create bid with automatic NLP classification
exports.createBid = catchAsync(async (req, res, next) => {
  const category = await classify(req.body.requestDetails);

  const bidData = {
    requester: req.user._id,
    requestDetails: req.body.requestDetails,
    timeline: req.body.timeline,
    preferredStartDate: req.body.preferredStartDate,
    budgetRange: req.body.budgetRange,
    filters: req.body.filters,
    category,
  };

  const newBid = await Bid.create(bidData);
  res.status(201).json({ status: "success", data: newBid });
});

// Get bids — vendors see only matching categories
exports.getAllBids = catchAsync(async (req, res, next) => {
  const queryObj = { ...req.query };
  ["page", "sort", "limit", "fields", "search", "minStart", "maxStart"].forEach(
    (el) => delete queryObj[el]
  );

  // ← Only include bids in vendor’s categories
  if (req.user.role === "vendor" && req.user.categories.length) {
    queryObj.category = { $in: req.user.categories };
  }

  // (apply your existing text/date/number filters…)

  const filterStr = JSON.stringify(queryObj).replace(
    /\b(gte|gt|lte|lt)\b/g,
    (m) => `$${m}`
  );
  let query = Bid.find(JSON.parse(filterStr));

  // (sorting, field limiting, pagination — as before)

  const bids = await query;
  const total = await Bid.countDocuments(JSON.parse(filterStr));

  res.status(200).json({
    status: "success",
    results: bids.length,
    total,
    page: req.query.page * 1 || 1,
    data: { bids },
  });
});

// Get a single bid by ID
exports.getBid = catchAsync(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new AppError("Invalid Bid ID", 400));
  }
  const bid = await Bid.findById(req.params.id);
  if (!bid) return next(new AppError("Bid not found", 404));
  res.status(200).json({ status: "success", data: bid });
});

// Update a bid
exports.updateBid = catchAsync(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new AppError("Invalid Bid ID", 400));
  }

  const bid = await Bid.findById(req.params.id);
  if (!bid) return next(new AppError("Bid not found", 404));

  // Update budget range only if present in the request body
  if (req.body.budgetRange) {
    if (req.body.budgetRange.min === undefined) {
      req.body.budgetRange.min = bid.budgetRange.min;
    }
    if (req.body.budgetRange.max === undefined) {
      req.body.budgetRange.max = bid.budgetRange.max;
    }
  }

  // Apply updates
  bid.set(req.body);
  await bid.save();

  res.status(200).json({ status: "success", data: bid });
});

// Delete a bid
exports.deleteBid = catchAsync(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new AppError("Invalid Bid ID", 400));
  }
  const bid = await Bid.findByIdAndDelete(req.params.id);
  if (!bid) return next(new AppError("Bid not found", 404));
  res.status(204).json({ status: "success", data: null });
});

// Assign a bid to a provider (accept the request)
exports.assignBid = catchAsync(async (req, res, next) => {
  if (req.user.role !== "vendor") {
    return next(new AppError("Only vendor can accept bids", 403));
  }

  const bid = await Bid.findById(req.params.id);
  if (!bid) return next(new AppError("Bid not found", 404));
  if (bid.status !== "pending")
    return next(new AppError("Bid not available for assignment", 400));

  const provider = await User.findById(req.user._id);
  // Check filters
  if (bid.filters.localVendorsOnly && provider.location !== req.user.location) {
    return next(new AppError("Provider not local to requester", 403));
  }
  if (bid.filters.verifiedProvidersOnly && !provider.isVerified) {
    return next(new AppError("Provider not verified", 403));
  }
  if (provider.experienceYears < bid.filters.minExperienceYears) {
    return next(new AppError("Insufficient experience", 403));
  }

  bid.assignedTo = provider._id;
  bid.status = "accept";
  await bid.save();

  res.status(200).json({ status: "success", data: bid });
});
