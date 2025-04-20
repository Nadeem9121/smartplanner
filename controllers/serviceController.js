const Service = require("../models/serviceModel");
const catchAsync = require("../utils/catchAsync");
const mongoose = require("mongoose");

// Helper to validate service fields
const validateServiceInput = (data, isUpdate = false) => {
  const errors = [];

  // Only validate if field exists or if it's a creation request (non-update)
  if (!isUpdate || (isUpdate && data.hasOwnProperty("title"))) {
    if (
      !data.title ||
      typeof data.title !== "string" ||
      data.title.trim() === ""
    ) {
      errors.push({ field: "title", message: "Service title is required." });
    }
  }

  if (!isUpdate || (isUpdate && data.hasOwnProperty("rate"))) {
    if (data.rate === undefined || isNaN(data.rate) || Number(data.rate) <= 0) {
      errors.push({
        field: "rate",
        message: "Rate must be a positive number.",
      });
    }
  }

  if (!isUpdate || (isUpdate && data.hasOwnProperty("description"))) {
    if (
      !data.description ||
      typeof data.description !== "string" ||
      data.description.trim() === ""
    ) {
      errors.push({
        field: "description",
        message: "Service description is required.",
      });
    }
  }

  // Note: 'availability' is optional and defaults to true if not provided.
  return errors;
};

exports.createService = async (req, res) => {
  // Validate request body fields for creation
  const errors = validateServiceInput(req.body);
  if (errors.length) {
    return res.status(400).json({ errors });
  }

  try {
    const newService = new Service(req.body);
    await newService.save();
    res.status(201).json(newService);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getServices = async (req, res) => {
  try {
    const services = await Service.find();
    res.json({ length: services.length, services });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getServiceById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid Service ID" });
    }
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }
    res.json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateService = async (req, res) => {
  // Validate request body fields (if provided) for update; fields are optional in updates.
  const errors = validateServiceInput(req.body, true);
  if (errors.length) {
    return res.status(400).json({ errors });
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid Service ID" });
    }
    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedService) {
      return res.status(404).json({ error: "Service not found" });
    }
    res.json(updatedService);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.deleteService = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid Service ID" });
    }
    const deletedService = await Service.findByIdAndDelete(req.params.id);
    if (!deletedService) {
      return res.status(404).json({ error: "Service not found" });
    }
    res.json({ message: "Service deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
exports.searchServices = catchAsync(async (req, res, next) => {
  // 1. Filtering
  const queryObj = { ...req.query };
  const excludedFields = ["page", "sort", "limit", "fields", "search"];
  excludedFields.forEach((el) => delete queryObj[el]);

  // 2. Advanced Search
  let searchQuery = {};
  if (req.query.search) {
    const sanitizedSearch = req.query.search.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
    const searchRegex = new RegExp(sanitizedSearch, "i");
    searchQuery = {
      $or: [
        { title: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
      ],
    };
  }

  // 3. Combined Filter
  const filter = { ...queryObj, ...searchQuery };

  // 4. Numeric Filters (Price Range)
  let queryStr = JSON.stringify(filter);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

  let query = Service.find(JSON.parse(queryStr));

  // 5. Sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    query = query.sort(sortBy);
  } else {
    query = query.sort("-createdAt");
  }

  // 6. Field Limiting
  if (req.query.fields) {
    const fields = req.query.fields.split(",").join(" ");
    query = query.select(fields);
  } else {
    query = query.select("-__v");
  }

  // 7. Pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 100;
  const skip = (page - 1) * limit;

  query = query.skip(skip).limit(limit);

  // 8. Date Filtering
  if (req.query.createdAfter) {
    query.where("createdAt").gte(new Date(req.query.createdAfter));
  }
  if (req.query.createdBefore) {
    query.where("createdAt").lte(new Date(req.query.createdBefore));
  }

  // 9. Execute Query
  const services = await query;
  const totalResults = await Service.countDocuments(JSON.parse(queryStr));

  if (services.length === 0) {
    return next(new AppError("No services found matching your criteria", 404));
  }

  res.status(200).json({
    status: "success",
    results: services.length,
    totalResults,
    page,
    pages: Math.ceil(totalResults / limit),
    data: {
      services,
    },
  });
});
