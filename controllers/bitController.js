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
// GET /api/v1/bids/vendor/:vendorId — Get all bids assigned to a vendor
exports.getBidsByVendorId = catchAsync(async (req, res, next) => {
  const { vendorId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    return next(new AppError("Invalid Vendor ID", 400));
  }

  const bids = await Bid.find({ assignedTo: vendorId }).populate(
    "requester",
    "name email"
  );

  res.status(200).json({
    status: "success",
    results: bids.length,
    data: { bids },
  });
});
// controllers/bidController.js
exports.placeBidAmount = catchAsync(async (req, res, next) => {
  const { amount } = req.body; // Only amount
  const { id: bidId } = req.params;

  if (req.user.role !== "vendor") {
    return next(new AppError("Only vendors can place quotes", 403));
  }

  if (!mongoose.Types.ObjectId.isValid(bidId)) {
    return next(new AppError("Invalid Bid ID", 400));
  }

  const bid = await Bid.findById(bidId);
  if (!bid) return next(new AppError("Bid not found", 404));

  // Check if vendor already quoted
  const alreadyQuoted = bid.quotes.some((q) => q.vendor.equals(req.user._id));
  if (alreadyQuoted) {
    return next(
      new AppError("You have already submitted a quote for this bid", 400)
    );
  }

  // Add the quote with only the amount
  bid.quotes.push({
    vendor: req.user._id,
    amount,
  });

  await bid.save();

  res.status(200).json({
    status: "success",
    message: "Quote submitted successfully",
    data: bid,
  });
});
// controllers/bidController.js
exports.editQuote = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return next(
      new AppError("Invalid amount. Please provide a valid amount.", 400)
    );
  }

  // Find the bid
  const bid = await Bid.findById(id);
  if (!bid) {
    return next(new AppError("Bid not found", 404));
  }

  // Check if vendor is already in quotes
  const vendorQuoteIndex = bid.quotes.findIndex(
    (quote) => quote.vendor.toString() === req.user._id.toString()
  );

  if (vendorQuoteIndex !== -1) {
    // If vendor already exists, update the quote
    bid.quotes[vendorQuoteIndex].amount = amount;
  } else {
    // If vendor does not exist, add a new quote
    bid.quotes.push({ vendor: req.user._id, amount });
  }

  await bid.save();

  res.status(200).json({
    status: "success",
    message: "Quote updated successfully",
    data: bid,
  });
});
