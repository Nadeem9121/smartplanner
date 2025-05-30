const Service = require("../models/serviceModel");
const catchAsync = require("../utils/catchAsync");
const User = require("../models/userModel");
const GalleryImage = require("../models/galleryModel");
const mongoose = require("mongoose");

// Define valid days for availability
const VALID_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Monday-Friday", // Add "Monday-Friday" as a valid option
];

// Helper function to validate time format
const isValidTime = (time) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);

// Helper function to validate service fields including availability
const validateServiceInput = (data, isUpdate = false) => {
  const errors = [];

  // Validate title
  if (!isUpdate || (isUpdate && data.hasOwnProperty("title"))) {
    if (
      !data.title ||
      typeof data.title !== "string" ||
      data.title.trim() === ""
    ) {
      errors.push({ field: "title", message: "Service title is required." });
    }
  }

  // Validate rate
  if (!isUpdate || (isUpdate && data.hasOwnProperty("rate"))) {
    if (data.rate === undefined || isNaN(data.rate) || Number(data.rate) <= 0) {
      errors.push({
        field: "rate",
        message: "Rate must be a positive number.",
      });
    }
  }

  // Validate description
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

  // Validate availability (array of { day, startTime, endTime })
  if (!isUpdate || (isUpdate && data.hasOwnProperty("availability"))) {
    const avail = data.availability;
    if (!Array.isArray(avail)) {
      errors.push({
        field: "availability",
        message: "Availability must be an array of { day, startTime, endTime }",
      });
    } else {
      avail.forEach((slot, i) => {
        if (slot.day === "Monday-Friday") {
          // Handle "Monday-Friday" as individual days
          const weekdays = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
          ];
          weekdays.forEach((day) => {
            avail.push({
              day,
              startTime: slot.startTime,
              endTime: slot.endTime,
            });
          });
          return; // Skip the current loop since we've already added individual days
        }

        if (!slot.day || !VALID_DAYS.includes(slot.day)) {
          errors.push({
            field: `availability[${i}].day`,
            message: `Day must be one of: ${VALID_DAYS.join(", ")}`,
          });
        }
        if (!slot.startTime || !isValidTime(slot.startTime)) {
          errors.push({
            field: `availability[${i}].startTime`,
            message: "startTime must be in HH:mm format",
          });
        }
        if (!slot.endTime || !isValidTime(slot.endTime)) {
          errors.push({
            field: `availability[${i}].endTime`,
            message: "endTime must be in HH:mm format",
          });
        }
      });
    }
  }

  return errors;
};

// Create a new service
exports.createService = async (req, res) => {
  const errors = validateServiceInput(req.body);
  if (errors.length) {
    return res.status(400).json({ errors });
  }

  try {
    const newService = new Service({
      ...req.body,
      vendor: req.user.id, // ← bind to the logged-in vendor
    });
    await newService.save();
    res.status(201).json(newService);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// Get all services
exports.getServices = async (req, res) => {
  const vendorId = req.user.id;
  try {
    const services = await Service.find()
      .find({ vendor: vendorId }) // ← only this vendor’s services
      .sort("-createdAt")
      .select("-__v");
    res.json({ length: services.length, services });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
// Public: get every service (for customers/users)
exports.getAllServicesPublic = async (req, res) => {
  try {
    // 1. Build query object for filtering
    const queryObj = { ...req.query };
    const excludedFields = ["page", "sort", "limit", "fields"];
    excludedFields.forEach((el) => delete queryObj[el]);

    // 2. Advanced filtering (e.g., price[gte]=500)
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    let query = Service.find(JSON.parse(queryStr));

    // 3. Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt"); // Default sort
    }

    // 4. Field limiting
    if (req.query.fields) {
      const fields = req.query.fields.split(",").join(" ");
      query = query.select(fields);
    } else {
      query = query.select("-__v");
    }

    // 5. Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(limit);

    // Execute query
    const services = await query;

    // Fetch gallery for each vendor
    const servicesWithGallery = await Promise.all(
      services.map(async (service) => {
        const gallery = await GalleryImage.find({
          vendor: service.vendor,
        }).sort("-createdAt");
        return {
          ...service.toObject(),
          gallery,
        };
      })
    );

    res.status(200).json({
      length: servicesWithGallery.length,
      services: servicesWithGallery,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// Get a single service by ID
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

// Update service
exports.updateService = async (req, res) => {
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

// Delete service
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

// Search services with advanced filtering, sorting, and pagination
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
    data: { services },
  });
});

// Update specific service availability time
exports.updateServiceAvailabilityTime = async (req, res) => {
  const { day, startTime, endTime } = req.body;

  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  // Validate time format
  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    return res
      .status(400)
      .json({ error: "startTime and endTime must be in HH:mm format" });
  }

  // Validate day
  if (!VALID_DAYS.includes(day)) {
    return res.status(400).json({ error: "Invalid day" });
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid Service ID" });
    }

    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    const daysToUpdate = day === "Monday-Friday" ? weekdays : [day];

    daysToUpdate.forEach((d) => {
      const index = service.availability.findIndex((slot) => slot.day === d);
      if (index !== -1) {
        service.availability[index].startTime = startTime;
        service.availability[index].endTime = endTime;
      } else {
        service.availability.push({ day: d, startTime, endTime });
      }
    });

    await service.save();

    res.status(200).json({
      message: `Availability for ${day} updated successfully`,
      availability: service.availability,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
exports.getVendorProfile = async (req, res) => {
  const { vendorId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    return res.status(400).json({ error: "Invalid vendor ID" });
  }

  try {
    // Get vendor info (without password or sensitive data)
    const vendor = await User.findById(vendorId).select("-password -__v");
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    // Get vendor's services
    const services = await Service.find({ vendor: vendorId }).select("-__v");

    // Get vendor's gallery images
    const gallery = await GalleryImage.find({ vendor: vendorId }).select(
      "-__v"
    );

    // Combine all into one response
    res.status(200).json({
      vendor,
      services,
      gallery,
    });
  } catch (err) {
    console.error("Error fetching vendor profile:", err);
    res.status(500).json({ error: "Server error" });
  }
};
exports.getAllBidsOfVendor = async (req, res) => {};
