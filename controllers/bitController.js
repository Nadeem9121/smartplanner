// controllers/bidController.js
const Bid = require("../models/bidModel");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");

// Create a new bid/request
exports.createBid = catchAsync(async (req, res, next) => {
  const bidData = {
    requester: req.user._id,
    requestDetails: req.body.requestDetails,
    timeline: req.body.timeline,
    preferredStartDate: req.body.preferredStartDate,
    budgetRange: req.body.budgetRange,
    filters: req.body.filters,
  };
  const newBid = await Bid.create(bidData);
  res.status(201).json({ status: "success", data: newBid });
});

// Get all bids with advanced filtering, sorting, field limiting, pagination
exports.getAllBids = catchAsync(async (req, res, next) => {
  // Build base filter
  const queryObj = { ...req.query };
  const excludedFields = [
    "page",
    "sort",
    "limit",
    "fields",
    "search",
    "minStart",
    "maxStart",
  ];
  excludedFields.forEach((el) => delete queryObj[el]);

  // Text search on requestDetails
  if (req.query.search) {
    const regex = new RegExp(req.query.search, "i");
    queryObj.requestDetails = { $regex: regex };
  }

  // Date range filtering for preferredStartDate
  if (req.query.minStart || req.query.maxStart) {
    queryObj.preferredStartDate = {};
    if (req.query.minStart)
      queryObj.preferredStartDate.$gte = new Date(req.query.minStart);
    if (req.query.maxStart)
      queryObj.preferredStartDate.$lte = new Date(req.query.maxStart);
  }

  // Numeric filters for budgetRange (use gte, lte in query string)
  let filterStr = JSON.stringify(queryObj).replace(
    /\b(gte|gt|lte|lt)\b/g,
    (match) => `$${match}`
  );
  let query = Bid.find(JSON.parse(filterStr));

  // Sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    query = query.sort(sortBy);
  } else {
    query = query.sort("-preferredStartDate");
  }

  // Field limiting
  if (req.query.fields) {
    const fields = req.query.fields.split(",").join(" ");
    query = query.select(fields);
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;
  query = query.skip(skip).limit(limit);

  const bids = await query;
  const total = await Bid.countDocuments(JSON.parse(filterStr));

  res.status(200).json({
    status: "success",
    results: bids.length,
    total,
    page,
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
      req.body.budgetRange.min = bid.budgetRange.min; // Retain the current min if not provided
    }
    if (req.body.budgetRange.max === undefined) {
      req.body.budgetRange.max = bid.budgetRange.max; // Retain the current max if not provided
    }
  }

  // Apply updates
  bid.set(req.body);
  await bid.save(); // Trigger full validation

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
  // Only providers can accept
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
